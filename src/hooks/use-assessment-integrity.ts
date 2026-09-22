"use client"

/**
 * ============================================================================
 * useAssessmentIntegrity — behaviour observation during an assessment
 * ============================================================================
 *
 * LS-SEC-002 §11, §12. Findings LS-01, LS-02, LS-03, LS-04, LS-05.
 *
 * Every listener lives here, in one hook, so the fairness rules of §11.2 exist
 * in exactly one place and cannot drift between call sites.
 *
 * ── This hook observes. It never decides. ───────────────────────────────────
 *
 * It reports what the browser did; the server decides whether that was a
 * violation, what the running total is, and what happens next. The count it
 * renders is the count the *server* returned. A learner who edits this code to
 * report zero violations changes nothing about their attempt — the server-side
 * sweep still applies (§12.4).
 *
 * ── Why so much of this is about *not* firing ───────────────────────────────
 *
 * A `visibilitychange` fires when a notification banner appears, when the OS
 * steals focus, when an autofill dropdown opens, and during the fullscreen
 * transition itself. A `blur` fires when the learner clicks the address bar or
 * a window on a second monitor. If those counted, an incoming phone call would
 * end an exam.
 *
 * So: a hide is timed and only reported once it *ends*, with its duration, and
 * the server drops anything under the grace period. A blur is reported but
 * never counted. A reload is never a violation. Being offline is never a
 * violation — events queue and flush on reconnect, de-duplicated server-side.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Cookies from "js-cookie"

const API_BASE = process.env.NEXT_PUBLIC_API_URL

export type ProctoringMode = "OFF" | "MONITOR" | "STRICT"

export interface ProctoringPolicy {
  mode: ProctoringMode
  require_fullscreen: boolean
  monitor_visibility: boolean
  monitor_focus: boolean
  detect_second_tab: boolean
  block_copy_paste: boolean
  block_context_menu: boolean
  block_print: boolean
  grace_period_ms: number
  max_away_ms: number
  warn_at: number
  final_warn_at: number
  auto_submit_at: number | null
  late_grace_seconds: number
}

/**
 * Mirrors the server ladder. `PERSISTENT` sits above `FINAL_WARN`: it blocks
 * the same way but re-fires on every further counted event, and never implies
 * submission — modes that reach it do not end attempts.
 */
export type WarningLevel =
  | "NONE"
  | "WARN"
  | "FINAL_WARN"
  | "PERSISTENT"
  | "AUTO_SUBMIT"

export interface IntegrityVerdict {
  violation_count: number
  level: WarningLevel
  message: string | null
  remaining_before_submit: number | null
  auto_submit: boolean
}

type ReportedEventType =
  | "TAB_HIDDEN"
  /** AS-SEC-001 G-1 — open and untouched. Recorded, never counted. */
  | "ABANDONED_SUSPECTED"
  // ── Camera (AS-CAM-001 §4.1) ──────────────────────────────────────────
  //
  // Same union, same queue, same endpoint. Camera is another kind of
  // observation, not another system.
  | "CAMERA_DENIED"
  | "CAMERA_UNAVAILABLE"
  | "CAMERA_REVOKED"
  | "CAMERA_STREAM_ENDED"
  | "CAMERA_RESTORED"
  | "RECORDING_STARTED"
  | "RECORDING_UNSUPPORTED"
  | "RECORDING_UPLOAD_FAILED"
  | "RECORDING_BUFFER_OVERFLOW"
  | "WINDOW_BLURRED"
  | "FULLSCREEN_EXITED"
  | "NAVIGATION_ATTEMPTED"
  | "SECOND_TAB_DETECTED"
  | "COPY_ATTEMPTED"
  | "PASTE_ATTEMPTED"
  | "PRINT_ATTEMPTED"
  | "PAGE_RELOADED"
  /**
   * LC-CONS-001 §14.3 — the learner **confirmed** leaving an active assessment
   * through a route that never unloads the page: the back button, an in-app
   * link, or another step in the Learning Sidebar.
   *
   * `NAVIGATION_ATTEMPTED` rides on `beforeunload` and fires for none of them.
   * Reported only on confirmation — cancelling is compliance (§14.6 rule 5).
   */
  | "IN_APP_NAVIGATION"

interface QueuedEvent {
  type: ReportedEventType
  at: number
  duration_ms?: number
  meta?: Record<string, unknown>
}

/** Batched rather than sent per event, so a burst is one request. */
const FLUSH_INTERVAL_MS = 4000
const MAX_BATCH = 20
/** Beyond this the oldest are dropped: a long offline period must not grow without bound. */
const MAX_QUEUE = 200

/**
 * Keyboard Lock (AS-SEC-001 §7.4).
 *
 * Not in `lib.dom` because it is not a cross-browser standard: Chromium ships
 * it, Firefox and WebKit do not, and there is no polyfill because there is
 * nothing to polyfill — the capability either exists in the browser or it does
 * not.
 */
interface KeyboardLockAPI {
  lock: (keyCodes?: string[]) => Promise<void>
  unlock: () => void
}

function keyboardLockApi(): KeyboardLockAPI | null {
  if (typeof navigator === "undefined") return null
  const kb = (navigator as any).keyboard
  if (!kb || typeof kb.lock !== "function" || typeof kb.unlock !== "function") {
    return null
  }
  return kb as KeyboardLockAPI
}

/**
 * How long an attempt may sit untouched before it is reported as idle.
 *
 * Fifteen minutes, not five. This is an observation an instructor reads
 * later, never a violation, so the cost of raising it late is nothing and the
 * cost of raising it early is a record full of learners who paused to think.
 */
const IDLE_THRESHOLD_MS = 15 * 60_000

function authToken(): string | undefined {
  const cookie = Cookies.get("bwenge_token")
  if (cookie) return cookie
  try {
    return localStorage.getItem("bwengeplus_token") || undefined
  } catch {
    return undefined
  }
}

export interface UseAssessmentIntegrityOptions {
  attemptId: string | null
  policy: ProctoringPolicy | null
  /** False once the attempt is submitted — every listener detaches. */
  active: boolean
  /** Called when the server says the attempt must be submitted now. */
  onAutoSubmit: () => void
}

export interface UseAssessmentIntegrityResult {
  verdict: IntegrityVerdict | null
  /** True while the document is hidden — used to blur the question surface. */
  isAway: boolean
  fullscreenActive: boolean
  fullscreenSupported: boolean
  enterFullscreen: () => Promise<void>
  /**
   * Leaves full screen without recording a violation.
   *
   * For the end of an attempt. Full screen means "attempt in progress", so
   * it has to end when the attempt does — otherwise the learner is stranded
   * on the result screen with no browser chrome, and the only way out is the
   * same Escape press the assessment spent the last hour treating as an
   * offence.
   */
  exitFullscreen: () => Promise<void>
  /** Acknowledges the blocking final warning. */
  acknowledge: () => void
  acknowledged: boolean
  /**
   * LC-CONS-001 §14.3. Reports a confirmed in-app departure — the sidebar,
   * the back button, an in-app link — and flushes immediately, because the
   * page may be about to change underneath us.
   *
   * Called only after the learner confirms. There is deliberately no
   * "cancelled" counterpart: backing out records nothing.
   */
  reportInAppNavigation: (reason: string) => void
  /**
   * Whether the browser currently believes it has a connection.
   *
   * Surfaced so the assessment can *say* it is offline. Being offline is
   * never a violation (§12.3, AC A-16) — events queue and flush on reconnect
   * — but a learner watching an answer fail to save deserves to know why,
   * rather than assuming their work is lost.
   */
  online: boolean
  /** Integrity events recorded locally but not yet acknowledged by the server. */
  pendingEvents: number
  /**
   * Call on any sign of life — an answer changed, a question navigated.
   *
   * Resets the idle clock. Exposed rather than inferred inside the hook
   * because only the runner knows what counts as work: a mouse move over a
   * paused video is not progress, and answering a question is.
   */
  noteActivity: () => void
  /**
   * Reports a camera observation through this queue.
   *
   * Exposed so the camera hook never needs its own transport. One queue means
   * one rate limit, one de-duplication rule, one ordering — and no way for two
   * pipelines to disagree about what happened and when.
   */
  reportCameraEvent: (type: string, meta?: Record<string, unknown>) => void
}

export function useAssessmentIntegrity({
  attemptId,
  policy,
  active,
  onAutoSubmit,
}: UseAssessmentIntegrityOptions): UseAssessmentIntegrityResult {
  const [verdict, setVerdict] = useState<IntegrityVerdict | null>(null)
  const [isAway, setIsAway] = useState(false)
  const [fullscreenActive, setFullscreenActive] = useState(false)
  const [acknowledged, setAcknowledged] = useState(true)
  const [online, setOnline] = useState(true)
  const [pendingEvents, setPendingEvents] = useState(0)

  const queueRef = useRef<QueuedEvent[]>([])
  const hiddenSinceRef = useRef<number | null>(null)
  /** Set once an in-progress absence has already been reported. */
  const awayReportedRef = useRef(false)
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurSinceRef = useRef<number | null>(null)
  const blurReportedRef = useRef(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * Set while *we* are the ones leaving full screen.
   *
   * `exitFullscreen()` fires the same `fullscreenchange` event a learner
   * pressing Escape does, and the handler cannot tell them apart. Without
   * this, ending an attempt would record a FULLSCREEN_EXITED against the
   * learner — an accusation generated by the act of submitting, arriving at
   * the one moment they had done everything right.
   */
  const programmaticExitRef = useRef(false)
  const flushingRef = useRef(false)
  const autoSubmitFiredRef = useRef(false)
  const onAutoSubmitRef = useRef(onAutoSubmit)
  onAutoSubmitRef.current = onAutoSubmit

  const monitoring = !!policy && policy.mode !== "OFF" && active && !!attemptId

  const fullscreenSupported =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled ?? false) &&
    typeof document.documentElement?.requestFullscreen === "function"

  // ── Queue ───────────────────────────────────────────────────────────────

  const enqueue = useCallback(
    (event: QueuedEvent) => {
      if (!monitoring) return
      const queue = queueRef.current
      queue.push(event)
      if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
      setPendingEvents(queue.length)
    },
    [monitoring]
  )

  const flush = useCallback(async () => {
    if (!attemptId || flushingRef.current) return
    const batch = queueRef.current.splice(0, MAX_BATCH)
    if (batch.length === 0) return

    flushingRef.current = true
    try {
      const token = authToken()
      const response = await fetch(
        `${API_BASE}/assessments/attempts/${attemptId}/events`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ events: batch }),
        }
      )

      if (!response.ok) {
        // Put them back: a 5xx or a dropped connection must not silently lose
        // the record. The server de-duplicates by (type, second), so a replay
        // cannot double-count.
        queueRef.current.unshift(...batch)
        setPendingEvents(queueRef.current.length)
        return
      }

      const payload = await response.json().catch(() => null)
      const next: IntegrityVerdict | undefined = payload?.data
      if (!next) return

      setVerdict(next)

      // A blocking warning needs an acknowledgement before the learner
      // continues; a soft one does not.
      //
      // PERSISTENT re-arms for the same reason it exists: it is shown again on
      // every further counted event, so that repetition stops being something
      // the learner can dismiss once and then ignore. This runs only when a
      // batch actually reported something — an idle flush posts nothing and
      // returns no verdict — so the dialog follows events, not the clock.
      if (next.level === "FINAL_WARN" || next.level === "PERSISTENT") {
        setAcknowledged(false)
      }

      if (next.auto_submit && !autoSubmitFiredRef.current) {
        autoSubmitFiredRef.current = true
        onAutoSubmitRef.current()
      }
    } catch {
      // Offline. Keep the events; they flush on reconnect. Being offline is
      // never a violation (§12.3, AC A-16).
      queueRef.current.unshift(...batch)
      setPendingEvents(queueRef.current.length)
    } finally {
      flushingRef.current = false
      setPendingEvents(queueRef.current.length)
    }
  }, [attemptId])

  useEffect(() => {
    if (!monitoring) return
    const timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [monitoring, flush])

  // ── Connectivity (§12.3) ────────────────────────────────────────────────
  //
  // Tracked whenever the component is live, not only while monitoring: a
  // learner in an unproctored assessment still needs to know their answers
  // are not reaching the server.
  //
  // Losing the connection records nothing. It cannot: the events are already
  // queued locally and the server never hears about the gap. Reconnecting
  // flushes immediately rather than waiting out the interval, so the record
  // closes as soon as it can.
  // ── Idle detection (AS-SEC-001 G-1) ─────────────────────────────────────
  //
  // Raised by the browser, never by the server, and gated on being online.
  //
  // From the server, "abandoned" and "offline" are the same observation:
  // silence. An idle sweep running server-side would therefore fire on every
  // learner whose connection dropped — the precise false positive §9.4 exists
  // to prevent, aimed at the people least able to argue with it.
  //
  // So the timer runs here, where `navigator.onLine` is knowable, and a
  // disconnection *resets* it rather than counting toward it. A learner who
  // spent twenty minutes offline has not been idle; they have been unable to
  // reach us, and the two must never share a record.
  const lastActivityRef = useRef(Date.now())
  const idleReportedRef = useRef(false)

  const noteActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    idleReportedRef.current = false
  }, [])

  const reportCameraEvent = useCallback(
    (type: string, meta?: Record<string, unknown>) => {
      enqueue({ type: type as ReportedEventType, at: Date.now(), meta })
      // Flushed immediately: a camera going dark is exactly the kind of thing
      // a reviewer needs in the timeline at the moment it happened, not four
      // seconds later behind whatever else arrived.
      void flush()
    },
    [enqueue, flush]
  )

  useEffect(() => {
    if (!monitoring) return

    // Offline is not idleness. Restarting the clock on reconnect means the
    // outage never contributes to the threshold.
    if (!online) {
      lastActivityRef.current = Date.now()
      return
    }

    const timer = setInterval(() => {
      if (document.hidden) return
      if (idleReportedRef.current) return
      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor < IDLE_THRESHOLD_MS) return

      idleReportedRef.current = true
      enqueue({
        type: "ABANDONED_SUSPECTED",
        at: Date.now(),
        duration_ms: idleFor,
      })
      void flush()
    }, 60_000)

    return () => clearInterval(timer)
  }, [monitoring, online, enqueue, flush])

  useEffect(() => {
    if (typeof navigator === "undefined") return
    setOnline(navigator.onLine)

    const goOnline = () => {
      setOnline(true)
      void flush()
    }
    const goOffline = () => setOnline(false)

    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [flush])

  // ── Visibility (§11.2) ──────────────────────────────────────────────────

  useEffect(() => {
    if (!monitoring || !policy?.monitor_visibility) return

    const grace = Math.max(500, Number(policy.grace_period_ms) || 1500)

    const onVisibility = () => {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now()
        awayReportedRef.current = false
        setIsAway(true)

        // ── Report the absence *during* it, not only on return ──────────
        //
        // This used to wait for the learner to come back. A learner who left
        // and stayed away for two minutes was not counted for those two
        // minutes — the count moved when they returned, which is the moment
        // they are least likely to be doing anything wrong, and it made the
        // whole control feel like it was not working.
        //
        // Once the absence passes the grace period we already know everything
        // the server needs: it is a real absence, not a notification banner.
        // So it is reported then. Background timers are throttled to about a
        // second, which is fine — this needs to be prompt, not instant.
        if (awayTimerRef.current) clearTimeout(awayTimerRef.current)
        awayTimerRef.current = setTimeout(() => {
          const since = hiddenSinceRef.current
          if (since === null || !document.hidden) return
          awayReportedRef.current = true
          enqueue({
            type: "TAB_HIDDEN",
            at: since,
            duration_ms: Date.now() - since,
          })
          void flush()
        }, grace + 150)
        return
      }

      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current)
        awayTimerRef.current = null
      }

      const since = hiddenSinceRef.current
      hiddenSinceRef.current = null
      setIsAway(false)
      if (since === null) return

      // Already counted mid-absence. Sending it again would be the same
      // absence twice — the server de-duplicates by (type, second), but only
      // within a minute, and a long absence outlives that window.
      if (awayReportedRef.current) {
        awayReportedRef.current = false
        return
      }

      // A short absence still reports on return, with its measured duration,
      // so the server can apply the grace period and ignore it. Reporting
      // *only* on hide would make a sub-second notification banner
      // indistinguishable from a two-minute absence.
      enqueue({
        type: "TAB_HIDDEN",
        at: since,
        duration_ms: Date.now() - since,
      })
      void flush()
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current)
    }
  }, [monitoring, policy?.monitor_visibility, policy?.grace_period_ms, enqueue, flush])

  // ── Focus ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!monitoring || !policy?.monitor_focus) return

    const grace = Math.max(500, Number(policy.grace_period_ms) || 1500)

    const onBlur = () => {
      // Suppressed while the document is hidden: that is a tab switch, and
      // the visibility handler already owns it. One physical action must
      // never be counted twice.
      if (document.hidden) return

      blurSinceRef.current = Date.now()
      blurReportedRef.current = false

      // Measured, then reported once it has lasted long enough to mean
      // something — the same treatment a hide gets, and for the same reason.
      // Clicking the address bar and working in another window for two
      // minutes both arrive here as `blur`, and only the duration separates
      // them. Reporting on blur alone could not tell them apart, which is why
      // this event was previously never counted at all.
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      blurTimerRef.current = setTimeout(() => {
        const since = blurSinceRef.current
        if (since === null || document.hasFocus()) return
        blurReportedRef.current = true
        enqueue({
          type: "WINDOW_BLURRED",
          at: since,
          duration_ms: Date.now() - since,
        })
        void flush()
      }, grace + 150)
    }

    const onFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current)
        blurTimerRef.current = null
      }
      const since = blurSinceRef.current
      blurSinceRef.current = null
      if (since === null) return

      // Already reported while it was happening; sending it again would be
      // the same absence twice.
      if (blurReportedRef.current) {
        blurReportedRef.current = false
        return
      }

      // Short ones still report, with their duration, so the server can see
      // them in the timeline and decline to count them.
      enqueue({
        type: "WINDOW_BLURRED",
        at: since,
        duration_ms: Date.now() - since,
      })
      void flush()
    }

    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [monitoring, policy?.monitor_focus, policy?.grace_period_ms, enqueue, flush])

  // ── Full screen (§10 C14 — deterrence, and labelled as such) ────────────

  useEffect(() => {
    if (!monitoring) return

    const onChange = () => {
      const isFullscreen = !!document.fullscreenElement
      setFullscreenActive(isFullscreen)

      // Our own exit is not the learner's doing, and is not recorded.
      if (programmaticExitRef.current) {
        programmaticExitRef.current = false
        return
      }

      if (!isFullscreen && policy?.require_fullscreen) {
        enqueue({ type: "FULLSCREEN_EXITED", at: Date.now() })
        void flush()
      }
    }

    document.addEventListener("fullscreenchange", onChange)
    setFullscreenActive(!!document.fullscreenElement)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [monitoring, policy?.require_fullscreen, enqueue, flush])

  const enterFullscreen = useCallback(async () => {
    if (!fullscreenSupported) return
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Denied or unsupported. §21.5: the requirement degrades to MONITOR
      // rather than blocking the learner — iOS Safari cannot do this at all.
      return
    }

    // ── Keyboard Lock ─────────────────────────────────────────────────────
    //
    // Be clear about what this buys, because it is easy to overstate.
    //
    // It does **not** prevent leaving full screen. Chromium converts a tap on
    // Escape into a press-and-hold of roughly two seconds and shows its own
    // "press and hold Esc to exit" notice. The hold always works; it cannot be
    // disabled, and the browser would not ship it if it could. Firefox and
    // Safari do not implement the API at all, so on those a single tap still
    // exits and nothing here changes.
    //
    // So the gain is: an accidental Escape no longer drops a learner out of a
    // running assessment, on the browsers most of them use. A deliberate exit
    // is unaffected and is recorded exactly as before. It is a guard against
    // a slip, not against a person — and it changes nothing at all about the
    // second device on the desk, which remains the real ceiling (§12).
    //
    // Requires a secure context; on http:// beyond localhost `lock()` rejects,
    // which is why this is wrapped and its failure is silent.
    try {
      await keyboardLockApi()?.lock(["Escape"])
    } catch {
      // Unavailable, insecure context, or refused. Nothing to tell the learner
      // — they simply keep the browser's ordinary behaviour.
    }
  }, [fullscreenSupported])

  const exitFullscreen = useCallback(async () => {
    // `exitFullscreen` rejects when nothing is fullscreen, and the document
    // may already have left it — the learner pressed Escape a moment before
    // submitting, or another element released it. Checking first keeps the
    // common path quiet; the catch covers the rest.
    // The keyboard is released whether or not we were the ones in full screen.
    // Leaving a lock in place after an attempt ends would take Escape away
    // from a learner who is no longer in an assessment — a control they need
    // for every other dialog on the page.
    try {
      keyboardLockApi()?.unlock()
    } catch {
      // Nothing to release.
    }

    if (typeof document === "undefined" || !document.fullscreenElement) return
    programmaticExitRef.current = true
    try {
      await document.exitFullscreen()
    } catch {
      // Nothing to do and nothing to report. The flag is cleared here rather
      // than left set, or the learner's *next* real exit would be swallowed
      // by a guard meant for this one.
      programmaticExitRef.current = false
    }
  }, [])

  // A lock outlives the component that took it, so it is released on unmount
  // too — a learner who navigates away mid-attempt must not be left with a
  // browser that swallows Escape on whatever page they land on next.
  useEffect(() => {
    return () => {
      try {
        keyboardLockApi()?.unlock()
      } catch {
        // Nothing to release.
      }
    }
  }, [])

  // ── Second tab (§10 C15) ────────────────────────────────────────────────

  useEffect(() => {
    if (!monitoring || !policy?.detect_second_tab || !attemptId) return
    if (typeof BroadcastChannel === "undefined") return

    const channel = new BroadcastChannel(`bwenge-attempt-${attemptId}`)
    const id = Math.random().toString(36).slice(2)

    const onMessage = (event: MessageEvent) => {
      if (event.data?.id && event.data.id !== id) {
        enqueue({ type: "SECOND_TAB_DETECTED", at: Date.now() })
        void flush()
      }
    }

    channel.addEventListener("message", onMessage)
    // Announce on mount; an existing tab hears it and reports.
    channel.postMessage({ id, at: Date.now() })

    return () => {
      channel.removeEventListener("message", onMessage)
      channel.close()
    }
  }, [monitoring, policy?.detect_second_tab, attemptId, enqueue, flush])

  // ── Clipboard and print (§5.1 D3, D5 — deterrence) ──────────────────────

  useEffect(() => {
    if (!monitoring) return

    const onCopy = (event: Event) => {
      if (!policy?.block_copy_paste) return
      event.preventDefault()
      enqueue({ type: "COPY_ATTEMPTED", at: Date.now() })
    }

    const onPaste = (event: Event) => {
      if (!policy?.block_copy_paste) return
      event.preventDefault()
      enqueue({ type: "PASTE_ATTEMPTED", at: Date.now() })
    }

    const onBeforePrint = () => {
      if (!policy?.block_print) return
      enqueue({ type: "PRINT_ATTEMPTED", at: Date.now() })
      void flush()
    }

    const surface = document.querySelector("[data-assessment-surface]")
    surface?.addEventListener("copy", onCopy)
    surface?.addEventListener("cut", onCopy)
    surface?.addEventListener("paste", onPaste)
    window.addEventListener("beforeprint", onBeforePrint)

    return () => {
      surface?.removeEventListener("copy", onCopy)
      surface?.removeEventListener("cut", onCopy)
      surface?.removeEventListener("paste", onPaste)
      window.removeEventListener("beforeprint", onBeforePrint)
    }
  }, [monitoring, policy?.block_copy_paste, policy?.block_print, enqueue, flush])

  // ── Navigation guard (§10 C19) ──────────────────────────────────────────

  useEffect(() => {
    if (!monitoring) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      enqueue({ type: "NAVIGATION_ATTEMPTED", at: Date.now() })

      // `sendBeacon` because a normal fetch is cancelled when the page goes
      // away. This is best-effort: if it does not land, the server-side sweep
      // and the deadline still apply.
      try {
        const batch = queueRef.current.splice(0, MAX_BATCH)
        if (batch.length > 0 && attemptId && navigator.sendBeacon) {
          navigator.sendBeacon(
            `${API_BASE}/assessments/attempts/${attemptId}/events`,
            new Blob([JSON.stringify({ events: batch })], {
              type: "application/json",
            })
          )
        }
      } catch {
        // Nothing useful to do while the page is unloading.
      }

      event.preventDefault()
      event.returnValue = ""
      return ""
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [monitoring, attemptId, enqueue])

  // ── Reload notice — recorded, never counted (§11.2, AC A-15) ────────────

  useEffect(() => {
    if (!monitoring) return
    try {
      const [entry] = performance.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[]
      if (entry?.type === "reload") {
        enqueue({ type: "PAGE_RELOADED", at: Date.now() })
      }
    } catch {
      // Timing API unavailable; nothing is lost but a context line.
    }
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitoring])

  // ── Flush what is left when monitoring ends ─────────────────────────────

  useEffect(() => {
    if (monitoring) return
    void flush()
  }, [monitoring, flush])

  const acknowledge = useCallback(() => setAcknowledged(true), [])

  // ── Confirmed in-app departure (§14.3, findings P-13/P-14/P-15) ──────────

  const reportInAppNavigation = useCallback(
    (reason: string) => {
      if (!monitoring) return
      enqueue({ type: "IN_APP_NAVIGATION", at: Date.now(), meta: { reason } })
      // Flushed rather than left for the 4s timer: a step change unmounts this
      // hook, and a sidebar navigation does not fire `beforeunload`, so the
      // `sendBeacon` fallback never runs. Without this the event would be lost
      // in the one case it was written for.
      void flush()
    },
    [monitoring, enqueue, flush]
  )

  return {
    verdict,
    isAway,
    fullscreenActive,
    fullscreenSupported,
    enterFullscreen,
    exitFullscreen,
    acknowledge,
    acknowledged,
    reportInAppNavigation,
    online,
    pendingEvents,
    noteActivity,
    reportCameraEvent,
  }
}
