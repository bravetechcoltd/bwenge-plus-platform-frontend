"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { learningApi, type EvidenceReport } from "@/lib/learning/api"

/**
 * ============================================================================
 * useLessonEngagement — reports evidence, does not decide completion
 * ============================================================================
 *
 * The engagement gate used to live entirely in `content-screen.tsx`: it
 * measured scroll depth, dwell time, interactions and video watch percentage,
 * then enabled a button that told the server "this lesson is done".
 *
 * The measurement stays here — it is genuinely a client-side concern, and it
 * still drives the local progress indicator so the learner gets immediate
 * feedback. What changed is authority: this hook now *reports* what it
 * observed, and the server decides whether that is enough.
 *
 * The thresholds below mirror the server's so the UI never enables a button
 * the backend would refuse.
 */

const HEARTBEAT_INTERVAL_MS = 15_000
/**
 * The first beat is early so the server's verdict — which is the one that
 * counts — arrives while the learner is still reading, instead of up to a
 * full interval after they have finished and are waiting on the button.
 */
const FIRST_HEARTBEAT_MS = 3_000
const SCROLL_GATE_PCT = 90
/**
 * Mirrors `PLATFORM_LEARNING_POLICY`. Reaching the end of the lesson is the
 * evidence; the dwell floor only prevents a lesson shorter than the viewport
 * from completing in the frame it renders, because content that fits on
 * screen counts as fully scrolled straight away.
 *
 * These replaced a word-count reading estimate that demanded a median of 2.2
 * minutes of wall-clock time on this platform's own lessons, and three
 * discrete interaction events on top of the scroll.
 */
const MIN_INTERACTIONS = 0
const MIN_DWELL_MS = 5_000
const WATCH_THRESHOLD_PCT = 90

/**
 * Turns the server's evidence verdict into a sentence with numbers in it.
 *
 * Returns null when there is nothing specific to say, so the caller falls back
 * to the server's own prose rather than inventing a message.
 */
function describeShortfall(
  report: { required: Record<string, number>; observed: Record<string, number> } | null
): string | null {
  if (!report?.required) return null

  const { required, observed } = report

  if (typeof required.watched_pct === "number") {
    const watched = Math.round(Number(observed?.watched_pct ?? 0))
    return `You've watched ${watched}% — watch to ${required.watched_pct}% to mark this complete.`
  }

  if (typeof required.scroll_depth_pct === "number") {
    const scrolled = Math.round(Number(observed?.scroll_depth_pct ?? 0))
    if (scrolled < required.scroll_depth_pct) {
      return `You've read ${scrolled}% — scroll to the end of the lesson to mark it complete.`
    }
  }

  if (typeof required.dwell_ms === "number") {
    const remainingMs = Number(required.dwell_ms) - Number(observed?.dwell_ms ?? 0)
    if (remainingMs > 0) {
      const minutes = Math.ceil(remainingMs / 60000)
      return minutes > 1
        ? `Spend about ${minutes} more minutes on this lesson to mark it complete.`
        : "Just a moment more on this lesson."
    }
  }

  return null
}

export interface EngagementSnapshot {
  dwellMs: number
  scrollPct: number
  interactions: number
  watchedPct: number
  positionSeconds: number
  durationSeconds: number
}

export interface UseLessonEngagementOptions {
  lessonId: string | undefined
  /** Lesson HTML, used to estimate the expected reading time. */
  content?: string | null
  /** True when the lesson has a measurable (non-embed) video. */
  hasMeasurableVideo?: boolean
  /** Server-reported completion — suppresses gating for a finished lesson. */
  alreadyCompleted?: boolean
  /** Server-known starting point, so resume does not reset evidence. */
  initialPositionSeconds?: number
  initialWatchedPct?: number
  enabled?: boolean
}

export interface UseLessonEngagementResult {
  /** Server's verdict when available; optimistic local estimate before that. */
  canComplete: boolean
  /** 0–100 for the progress affordance. */
  progressPct: number
  /** Why the learner cannot complete yet, in plain language. */
  reason: string | null
  snapshot: EngagementSnapshot
  serverReport: EvidenceReport | null

  /** Report a watched interval from the player. */
  reportWatched: (from: number, to: number, duration: number) => void
  /** Report the current playback position (for resume). */
  reportPosition: (seconds: number, duration: number) => void
  /** Force an immediate heartbeat. */
  flush: () => Promise<EvidenceReport | null>
  /**
   * Snapshot the evidence accumulated since the last accepted report,
   * *without* sending it.
   *
   * Completion carries this on its own request instead of posting a
   * heartbeat first and waiting for it — one round trip for one click. The
   * accumulators are only consumed when the caller confirms the server took
   * the report, so a failed request leaves the evidence intact.
   */
  collect: () => EvidenceDraft | null
}

export interface EvidenceDraft {
  payload: Record<string, number>
  /** The server accepted this evidence — stop carrying it. */
  commit: () => void
}


/** Merges an interval into a sorted, non-overlapping range set. */
function mergeRanges(
  ranges: Array<[number, number]>,
  from: number,
  to: number
): Array<[number, number]> {
  if (to <= from) return ranges
  const next = [...ranges, [Math.floor(from), Math.ceil(to)] as [number, number]].sort(
    (a, b) => a[0] - b[0]
  )
  const merged: Array<[number, number]> = []
  for (const range of next) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], range[1])
    } else {
      merged.push([range[0], range[1]])
    }
  }
  return merged
}

export function useLessonEngagement(
  options: UseLessonEngagementOptions
): UseLessonEngagementResult {
  const {
    lessonId,
    content,
    hasMeasurableVideo = false,
    alreadyCompleted = false,
    initialPositionSeconds = 0,
    enabled = true,
  } = options

  const [serverReport, setServerReport] = useState<EvidenceReport | null>(null)
  const [snapshot, setSnapshot] = useState<EngagementSnapshot>({
    dwellMs: 0,
    scrollPct: 0,
    interactions: 0,
    watchedPct: 0,
    positionSeconds: initialPositionSeconds,
    durationSeconds: 0,
  })

  // Mutable accumulators — refs so listeners never trigger re-renders.
  const dwellRef = useRef(0)
  const scrollRef = useRef(0)
  const interactionsRef = useRef(0)
  const watchedRangesRef = useRef<Array<[number, number]>>([])
  const positionRef = useRef(initialPositionSeconds)
  const durationRef = useRef(0)
  const lastTickRef = useRef(Date.now())
  const pendingWatchRef = useRef<{ from: number; to: number } | null>(null)
  const hiddenRef = useRef(false)
  const seedPositionRef = useRef(initialPositionSeconds)
  const playerReportedPositionRef = useRef(false)

  seedPositionRef.current = initialPositionSeconds

  // ── Reset when the lesson changes ──────────────────────────────────────
  //
  // Keyed on `lessonId` alone, deliberately. `initialPositionSeconds` comes
  // from the lesson payload, and every heartbeat moves the stored playback
  // position — so with it in the dependency list, any refetch of the lesson
  // (after a bookmark toggle, after a completion) wiped the dwell, scroll and
  // interaction counters the learner had built up, and re-locked the gate on
  // a lesson they had just finished reading. Resume is seeded by the effect
  // below instead, which touches the position and nothing else.
  useEffect(() => {
    dwellRef.current = 0
    scrollRef.current = 0
    interactionsRef.current = 0
    watchedRangesRef.current = []
    positionRef.current = seedPositionRef.current
    durationRef.current = 0
    lastTickRef.current = Date.now()
    pendingWatchRef.current = null
    playerReportedPositionRef.current = false
    setServerReport(null)
    setSnapshot({
      dwellMs: 0,
      scrollPct: 0,
      interactions: 0,
      watchedPct: 0,
      positionSeconds: seedPositionRef.current,
      durationSeconds: 0,
    })
  }, [lessonId])

  // Seed the resume position once the lesson payload lands — but never over a
  // position the player itself has since reported.
  useEffect(() => {
    if (!lessonId || playerReportedPositionRef.current) return
    if (!(initialPositionSeconds > 0)) return
    positionRef.current = initialPositionSeconds
    setSnapshot((current) =>
      current.positionSeconds === initialPositionSeconds
        ? current
        : { ...current, positionSeconds: initialPositionSeconds }
    )
  }, [lessonId, initialPositionSeconds])

  // ── Scroll depth ───────────────────────────────────────────────────────
  /*
   * Measured whenever the page could have changed shape, not only when the
   * learner scrolls.
   *
   * A lesson that fits on screen produces no scroll events at all, so an
   * event-driven gauge keeps whatever it read at mount and never moves again.
   * On this platform that reading is not zero, it is *stale*: moving between
   * lessons calls window.scrollTo({ behavior: "smooth" }), so when the effect
   * re-runs for the new lesson the document is still the old, taller one and
   * the window is still part-way down it. Every event the smooth scroll then
   * fires is on the way *up*, and this keeps a maximum, so the figure sticks
   * at wherever the learner happened to be.
   *
   * A real lesson on this course sat at 50% after five and a half minutes and
   * twenty-two heartbeats, with nothing on screen left to scroll — the button
   * said "scroll to the end of the lesson" on a page with no end to scroll to.
   *
   * The missing signal is the document's own height, which is what changes
   * when the short lesson finally paints. ResizeObserver delivers it; scroll
   * and resize events do not.
   */
  useEffect(() => {
    if (!enabled || alreadyCompleted) return

    const measure = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight
      // Content that fits on screen counts as fully read.
      const pct = scrollable <= 10 ? 100 : (window.scrollY / scrollable) * 100
      scrollRef.current = Math.max(scrollRef.current, Math.min(100, pct))
    }

    measure()
    window.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure, { passive: true })

    // Guarded: jsdom and older Safari have no ResizeObserver, and the gate
    // must not throw where it cannot observe.
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    observer?.observe(document.documentElement)
    if (document.body) observer?.observe(document.body)

    return () => {
      window.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      observer?.disconnect()
    }
  }, [enabled, alreadyCompleted, lessonId])

  // ── Interactions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || alreadyCompleted) return

    const onInteract = () => {
      interactionsRef.current += 1
    }

    const events: Array<keyof DocumentEventMap> = [
      "click",
      "keydown",
      "touchstart",
      "wheel",
    ]
    events.forEach((e) =>
      document.addEventListener(e, onInteract, { passive: true } as any)
    )
    return () => events.forEach((e) => document.removeEventListener(e, onInteract as any))
  }, [enabled, alreadyCompleted, lessonId])

  // ── Dwell, paused while the tab is hidden ──────────────────────────────
  useEffect(() => {
    if (!enabled || alreadyCompleted) return

    const onVisibility = () => {
      const now = Date.now()
      if (document.hidden) {
        dwellRef.current += now - lastTickRef.current
        hiddenRef.current = true
      } else {
        lastTickRef.current = now
        hiddenRef.current = false
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [enabled, alreadyCompleted, lessonId])

  const collectDwell = useCallback(() => {
    const now = Date.now()
    if (!hiddenRef.current) {
      dwellRef.current += now - lastTickRef.current
    }
    lastTickRef.current = now
  }, [])

  // ── Media reporting ────────────────────────────────────────────────────
  const reportWatched = useCallback((from: number, to: number, duration: number) => {
    durationRef.current = duration || durationRef.current
    watchedRangesRef.current = mergeRanges(watchedRangesRef.current, from, to)

    // Accumulate into one interval per heartbeat rather than one request each.
    const pending = pendingWatchRef.current
    pendingWatchRef.current = pending
      ? { from: Math.min(pending.from, from), to: Math.max(pending.to, to) }
      : { from, to }
  }, [])

  const reportPosition = useCallback((seconds: number, duration: number) => {
    positionRef.current = seconds
    durationRef.current = duration || durationRef.current
    playerReportedPositionRef.current = true
  }, [])

  // ── Evidence draft ─────────────────────────────────────────────────────
  //
  // Drafting consumes nothing. The accumulators are cleared only by
  // `commit()`, which the caller runs once the server has actually taken the
  // report. Previously the dwell delta was zeroed *before* the request, and
  // the heartbeat is deliberately silent — so a dropped beat (offline, a rate
  // limit, a 500) threw the reading time away for good and could leave a
  // lesson permanently short of its own gate.
  const draftEvidence = useCallback((): EvidenceDraft | null => {
    if (!lessonId || !enabled) return null

    collectDwell()

    const dwellDelta = dwellRef.current
    const watched = pendingWatchRef.current

    const payload: Record<string, number> = {
      dwell_ms: dwellDelta,
      scroll_depth_pct: Math.round(scrollRef.current),
      interaction_count: interactionsRef.current,
      position_seconds: Math.round(positionRef.current),
      duration_seconds: Math.round(durationRef.current),
    }

    if (watched) {
      payload.watched_from = Math.floor(watched.from)
      payload.watched_to = Math.ceil(watched.to)
    }

    const watchedSeconds = watchedRangesRef.current.reduce(
      (sum, [a, b]) => sum + (b - a),
      0
    )

    setSnapshot({
      dwellMs: payload.dwell_ms,
      scrollPct: payload.scroll_depth_pct,
      interactions: payload.interaction_count,
      watchedPct: durationRef.current
        ? Math.min(100, (watchedSeconds / durationRef.current) * 100)
        : 0,
      positionSeconds: payload.position_seconds,
      durationSeconds: payload.duration_seconds,
    })

    return {
      payload,
      commit: () => {
        // Subtract rather than zero: time kept accruing while the request was
        // in flight, and that part has not been reported yet.
        dwellRef.current = Math.max(0, dwellRef.current - dwellDelta)
        // Only clear the pending interval if the player has not merged a
        // wider one into it since. Re-sending an overlap is harmless — the
        // server merges ranges — but losing one is not.
        if (pendingWatchRef.current === watched) pendingWatchRef.current = null
      },
    }
  }, [lessonId, enabled, collectDwell])

  // ── Heartbeat ──────────────────────────────────────────────────────────
  const sendHeartbeat = useCallback(async (): Promise<EvidenceReport | null> => {
    const draft = draftEvidence()
    if (!draft || !lessonId) return null

    const report = await learningApi.heartbeat(lessonId, draft.payload)
    // `heartbeat` is silent: a failure resolves undefined rather than
    // throwing, so this is the only place the difference is observable.
    if (!report) return null

    draft.commit()
    setServerReport(report)
    return report
  }, [lessonId, draftEvidence])

  useEffect(() => {
    if (!lessonId || !enabled || alreadyCompleted) return

    // An early first beat, then the steady cadence. Without it the button
    // waits on the local estimate for a full interval, which is exactly the
    // window in which a learner finishes a short lesson and finds it still
    // disabled.
    const first = setTimeout(() => {
      void sendHeartbeat()
    }, FIRST_HEARTBEAT_MS)

    const id = setInterval(() => {
      void sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    // One last report on unmount so a short visit still counts.
    return () => {
      clearTimeout(first)
      clearInterval(id)
      void sendHeartbeat()
    }
  }, [lessonId, enabled, alreadyCompleted, sendHeartbeat])

  // ── Local estimate, used before the first server report lands ──────────
  const localEstimate = useCallback(() => {
    if (alreadyCompleted) return { met: true, pct: 100, reason: null as string | null }

    if (hasMeasurableVideo && durationRef.current > 0) {
      const watchedSeconds = watchedRangesRef.current.reduce(
        (sum, [a, b]) => sum + (b - a),
        0
      )
      const pct = Math.min(100, (watchedSeconds / durationRef.current) * 100)
      return {
        met: pct >= WATCH_THRESHOLD_PCT,
        pct: Math.round((pct / WATCH_THRESHOLD_PCT) * 100),
        reason:
          pct >= WATCH_THRESHOLD_PCT
            ? null
            : "Finish viewing this lesson before marking it complete.",
      }
    }

    const scrollMet = scrollRef.current >= SCROLL_GATE_PCT
    const dwellMet = dwellRef.current >= MIN_DWELL_MS
    const interactionsMet = interactionsRef.current >= MIN_INTERACTIONS

    // Only gates that actually constrain count toward the ring; with
    // `MIN_INTERACTIONS` at zero, including it would peg the indicator at 33%
    // before the learner had done anything.
    const gates = [scrollMet, dwellMet]
    if (MIN_INTERACTIONS > 0) gates.push(interactionsMet)
    const done = gates.filter(Boolean).length

    const reason = !scrollMet
      ? "Scroll to the end of the lesson to mark it complete."
      : !dwellMet
        ? "Just a moment more on this lesson."
        : !interactionsMet
          ? "Interact with the lesson before completing it."
          : null

    return {
      met: scrollMet && dwellMet && interactionsMet,
      pct: Math.round((done / gates.length) * 100),
      reason,
    }
  }, [alreadyCompleted, hasMeasurableVideo])

  const estimate = localEstimate()

  // The server's verdict wins whenever we have one.
  const canComplete = alreadyCompleted || (serverReport?.can_complete ?? estimate.met)
  const progressPct = alreadyCompleted
    ? 100
    : serverReport
      ? Math.round(serverReport.completion_percentage)
      : estimate.pct
  // ── R-15 / §21.2: say what is missing, with the numbers ────────────────
  //
  // "Finish viewing this lesson" tells a learner they are not done. It does not
  // tell them they are at 62% of a 90% requirement, which is the difference
  // between a rule and a wall — and between a learner who scrubs back to the
  // bit they missed and one who files a support ticket.
  //
  // Built from the server's own `required`/`observed`, so the numbers shown are
  // the numbers the gate will actually apply.
  const reason = canComplete
    ? null
    : (describeShortfall(serverReport) ?? serverReport?.reason ?? estimate.reason)

  return {
    canComplete,
    progressPct,
    reason,
    snapshot,
    serverReport,
    reportWatched,
    reportPosition,
    flush: sendHeartbeat,
    collect: draftEvidence,
  }
}
