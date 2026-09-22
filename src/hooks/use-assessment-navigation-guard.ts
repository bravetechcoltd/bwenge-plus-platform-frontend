"use client"

/**
 * ============================================================================
 * useAssessmentNavigationGuard — the exits nobody was watching
 * ============================================================================
 *
 * LC-CONS-001 §14, findings P-13, P-14, P-15, P-16.
 *
 * `useAssessmentIntegrity` guards navigation with `beforeunload`, which covers
 * closing the tab, reloading, and typing a new URL. It covers none of the ways
 * a learner actually leaves an assessment in this application:
 *
 *   • the **browser back button** — a Next.js App Router transition fires
 *     `popstate`, never `beforeunload`;
 *   • an **in-app link** — `router.push` is a client transition, same story;
 *   • **selecting another step in the Learning Sidebar** — not even a route
 *     change. It is a `setState` call, and it is by far the most common way
 *     out.
 *
 * So the front door was the one exit with no lock on it. This hook is that
 * lock.
 *
 * ── It asks. It never traps. ────────────────────────────────────────────────
 *
 * Every path resolves. "Leave anyway" is always present and always works. A
 * guard that a learner cannot get out of would turn a stray click into a
 * support ticket, and §12.4's point — that a control which fails honest users
 * is worse than no control — applies to UX as much as to detection.
 *
 * ── It observes; the server decides. ────────────────────────────────────────
 *
 * Confirming reports one event. **Cancelling reports nothing**: backing out is
 * compliance, not a violation (§14.6 rule 5). Whether that event counts, what
 * the running total is, and whether the attempt ends are all server-side.
 *
 * With `mode: "OFF"` — every assessment on the platform today — the guard still
 * asks, because losing a half-finished attempt to a mis-click is bad regardless
 * of policy. It simply records nothing.
 */

import { useCallback, useEffect, useRef, useState } from "react"

export type LeaveReason =
  | "STEP_CHANGE"
  | "BACK_NAVIGATION"
  | "IN_APP_LINK"
  | "PAGE_UNLOAD"

export interface PendingLeave {
  reason: LeaveReason
  resolve: (confirmed: boolean) => void
}

export interface UseAssessmentNavigationGuardOptions {
  /** True only while an attempt is genuinely open and unsubmitted. */
  active: boolean
  /**
   * Called once, with the reason, when the learner **confirms** leaving.
   * Never called on cancel.
   */
  onConfirmedLeave?: (reason: LeaveReason) => void
}

export interface AssessmentNavigationGuard {
  /**
   * Ask permission to leave. Resolves `true` when the learner confirmed.
   * Resolves `true` immediately when the guard is inactive, so callers can
   * await it unconditionally.
   */
  requestLeave: (reason: LeaveReason) => Promise<boolean>
  /** The reason currently awaiting an answer, or null. */
  pendingReason: LeaveReason | null
  confirmLeave: () => void
  cancelLeave: () => void
}

/** Marks a history entry this hook pushed, so it can recognise its own. */
const SENTINEL = "__assessment_guard__"

export function useAssessmentNavigationGuard({
  active,
  onConfirmedLeave,
}: UseAssessmentNavigationGuardOptions): AssessmentNavigationGuard {
  const [pendingReason, setPendingReason] = useState<LeaveReason | null>(null)

  const pendingRef = useRef<PendingLeave | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  const onConfirmedLeaveRef = useRef(onConfirmedLeave)
  onConfirmedLeaveRef.current = onConfirmedLeave

  /** Set while we are undoing our own sentinel, so we ignore that `popstate`. */
  const unwindingRef = useRef(false)
  /** Whether our sentinel entry is currently on the stack. */
  const sentinelPushedRef = useRef(false)

  const settle = useCallback((confirmed: boolean) => {
    const pending = pendingRef.current
    pendingRef.current = null
    setPendingReason(null)

    if (!pending) return

    if (confirmed) {
      onConfirmedLeaveRef.current?.(pending.reason)
    }
    pending.resolve(confirmed)
  }, [])

  const requestLeave = useCallback(
    (reason: LeaveReason): Promise<boolean> => {
      // Nothing to protect — let the caller through without a dialog.
      if (!activeRef.current) return Promise.resolve(true)

      // A second request while one is open reuses the open one rather than
      // stacking dialogs. Two overlapping prompts is how a guard becomes a
      // trap.
      if (pendingRef.current) return Promise.resolve(false)

      return new Promise<boolean>((resolve) => {
        pendingRef.current = { reason, resolve }
        setPendingReason(reason)
      })
    },
    []
  )

  const confirmLeave = useCallback(() => settle(true), [settle])
  const cancelLeave = useCallback(() => settle(false), [settle])

  // ── Back / forward (P-13, P-16) ──────────────────────────────────────────
  //
  // The technique: while an attempt is open, keep one extra history entry on
  // the stack. A back press consumes it and fires `popstate`, which we answer
  // by asking; on cancel we push it again so the next press behaves the same,
  // and on confirm we step back past it.
  //
  // Registered only while `active` and removed on unmount, so ordinary
  // Learning Space back-navigation is completely untouched.
  useEffect(() => {
    if (!active || typeof window === "undefined") return

    if (!sentinelPushedRef.current) {
      window.history.pushState({ [SENTINEL]: true }, "")
      sentinelPushedRef.current = true
    }

    const onPopState = () => {
      if (unwindingRef.current) {
        unwindingRef.current = false
        return
      }

      // Our sentinel has just been consumed.
      sentinelPushedRef.current = false

      void requestLeave("BACK_NAVIGATION").then((confirmed) => {
        if (confirmed) {
          // Genuinely go back, past where the sentinel was.
          unwindingRef.current = true
          window.history.back()
          return
        }

        // Stay: restore the sentinel so the next back press asks again.
        window.history.pushState({ [SENTINEL]: true }, "")
        sentinelPushedRef.current = true
      })
    }

    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("popstate", onPopState)
    }
  }, [active, requestLeave])

  // Clean up the sentinel when the attempt ends normally (submitted, graded),
  // so the learner's back button is not left with a dead entry to eat.
  useEffect(() => {
    if (active || typeof window === "undefined") return
    if (!sentinelPushedRef.current) return

    sentinelPushedRef.current = false
    unwindingRef.current = true
    window.history.back()
  }, [active])

  // ── In-app links (P-14) ──────────────────────────────────────────────────
  //
  // Capture-phase click interception on same-origin anchors. Deliberately
  // narrow: modified clicks (new tab), `target=_blank`, downloads, and hash
  // links are all left alone, because none of them takes the learner away from
  // the attempt in this tab.
  useEffect(() => {
    if (!active || typeof document === "undefined") return

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as HTMLElement | null)?.closest?.("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      if (anchor.hasAttribute("download")) return
      if (anchor.target && anchor.target !== "_self") return

      let destination: URL
      try {
        destination = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      if (destination.origin !== window.location.origin) return
      // Same page, different fragment: not leaving.
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      void requestLeave("IN_APP_LINK").then((confirmed) => {
        if (confirmed) window.location.assign(destination.href)
      })
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [active, requestLeave])

  // Never leave a promise hanging if the component unmounts mid-question.
  useEffect(() => {
    return () => {
      const pending = pendingRef.current
      pendingRef.current = null
      pending?.resolve(true)
    }
  }, [])

  return { requestLeave, pendingReason, confirmLeave, cancelLeave }
}
