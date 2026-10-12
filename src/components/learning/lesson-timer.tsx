"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, BookOpen, Clock, Hourglass, Sprout } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * ============================================================================
 * Lesson learning timer (LTM-001)
 * ============================================================================
 *
 * The required learning time for the current lesson, counting down.
 *
 * ── Where its numbers come from ───────────────────────────────────────────
 *
 * Entirely from the server. `requiredMs` is the lesson's resolved dwell
 * requirement and `observedMs()` is the dwell the server has acknowledged
 * plus the slice not yet reported. Nothing here derives a requirement, and
 * nothing here decides whether the lesson may be completed — it renders the
 * same evaluation the completion endpoint enforces, which is why the moment
 * the countdown reaches zero is the moment the server starts accepting.
 *
 * ── Why it counts local time between heartbeats ───────────────────────────
 *
 * Heartbeats land every fifteen seconds. A timer that only moved when one
 * arrived would sit still and then jump, so this ticks once a second against
 * the hook's own accumulator — the same one the heartbeat drains, and the same
 * one that stops accruing when the tab is hidden. So the countdown slows when
 * the learner looks away, exactly as the server's record does.
 *
 * ── Why it cannot be bypassed ─────────────────────────────────────────────
 *
 * It holds no state of its own. A refresh re-reads the accumulated dwell from
 * the lesson payload, so the countdown resumes where it was rather than
 * restarting; and whatever this component displays, the gate is
 * `evaluateLessonEvidence` on the server, which answers a premature
 * completion with 422 INSUFFICIENT_EVIDENCE.
 */

/**
 * ── Why "ready" is not the same as "the time has elapsed" (LTM-002) ───────
 *
 * This component first derived its state from the countdown alone, so a
 * lesson whose time had run out showed "Ready to complete / Done" while the
 * button beside it stayed disabled — because the time gate is only one of the
 * completion criteria. A text lesson still has to be scrolled to the end, a
 * video still has its watch percentage, and either may still be waiting on
 * the heartbeat that confirms the crossing.
 *
 * So `ready` means what the button means: `canComplete`. The countdown
 * reaching zero only moves the timer out of `counting`, and `blocked` is the
 * state in between — time served, something else outstanding — which says
 * what that something is rather than claiming the lesson is ready.
 */
export type LessonTimerState = "counting" | "blocked" | "ready" | "completed"

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  const pad = (value: number) => String(value).padStart(2, "0")

  // Hours only when there are any: "04:12" reads faster than "00:04:12", and
  // a lesson gate is capped at two hours.
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

function formatTotal(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return "under a minute"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/**
 * The same state, as a line above the action bar.
 *
 * The panel below is in the navigation bar, which on a phone is a scroll away
 * from "Mark complete". This keeps the reason beside the button it governs,
 * rather than leaving a disabled control with its explanation off-screen. It
 * reads the same props — no second source for elapsed time.
 */
export function LessonTimerNotice({
  requiredMs,
  observedMs,
  isCompleted,
}: {
  requiredMs: number | null
  observedMs: () => number
  isCompleted: boolean
}) {
  const [elapsed, setElapsed] = useState(0)
  const observedRef = useRef(observedMs)
  observedRef.current = observedMs

  useEffect(() => {
    if (requiredMs === null || isCompleted) return
    setElapsed(observedRef.current())
    const id = window.setInterval(() => setElapsed(observedRef.current()), 1000)
    return () => window.clearInterval(id)
  }, [requiredMs, isCompleted])

  if (requiredMs === null || isCompleted) return null

  const remaining = Math.max(0, requiredMs - elapsed)
  if (remaining <= 0) return null

  const pct = Math.min(100, Math.max(0, (elapsed / requiredMs) * 100))

  return (
    <div className="flex items-center gap-2.5 border-t border-border bg-violet-50/70 px-3 py-1.5 sm:px-4 dark:bg-violet-500/10">
      <Clock className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
      <p className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">
          {formatRemaining(remaining)}
        </span>{" "}
        of learning time left before you can mark this lesson complete
      </p>
      <div
        className="hidden h-1 w-24 shrink-0 overflow-hidden rounded-full bg-violet-200 sm:block dark:bg-violet-500/25"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-violet-600 transition-[width] duration-1000 ease-linear dark:bg-violet-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * The learning timer, in the navigation row (LTM-008).
 *
 * ── Where it lives ────────────────────────────────────────────────────────
 *
 * In the free space between "My Learning" and the course progress — inside
 * the 56px row, not above or below it. It is 36px tall, leaving 10px clear
 * top and bottom.
 *
 * It has been in three places, and each move was a correction:
 *
 *   LTM-001  a chip at the far right of the row, among three icon buttons
 *            and the progress bar — reported as not visible at all
 *   LTM-004  a full-width panel above the lesson content — visible, but it
 *            scrolled away with the content
 *   LTM-007  a full-width strip under the row — always visible, but it read
 *            as a separate band rather than as part of the navigation
 *
 * The constraints are therefore: in the navigation, always on screen, and
 * noticeable without being a banner. That is a compact chip in the row's
 * empty middle. The reference design's elements all survive the change of
 * scale — accent edge, icon tile, label, countdown, rail, percentage — laid
 * out along one line instead of two.
 *
 * ── What changed, and what did not ────────────────────────────────────────
 *
 * Only the presentation. The props, the one-second tick against the hook's
 * accumulator, the state machine, the `requiredMs === null` guard and the
 * stand-down at `ready` are all unchanged, so the countdown, the percentage
 * and the completion gate behave exactly as before. Every figure on screen
 * is derived from `requiredMs` and `observedMs()`; nothing here is a literal.
 */
export function LessonTimerChip({
  requiredMs,
  observedMs,
  isCompleted,
  canComplete,
  blockedReason,
}: {
  requiredMs: number | null
  observedMs: () => number
  isCompleted: boolean
  canComplete: boolean
  blockedReason?: string | null
}) {
  const [elapsed, setElapsed] = useState(0)
  const observedRef = useRef(observedMs)
  observedRef.current = observedMs

  useEffect(() => {
    if (requiredMs === null || isCompleted) return
    setElapsed(observedRef.current())
    const id = window.setInterval(() => setElapsed(observedRef.current()), 1000)
    return () => window.clearInterval(id)
  }, [requiredMs, isCompleted])

  if (requiredMs === null) return null

  const remaining = Math.max(0, requiredMs - elapsed)
  const timeElapsed = remaining <= 0
  const state: LessonTimerState = isCompleted
    ? "completed"
    : canComplete
      ? "ready"
      : timeElapsed
        ? "blocked"
        : "counting"

  /*
   * LTM-005. It stands down only once the button it governs is live.
   *
   * The panel exists to explain why "Mark complete" is disabled, so it stays
   * for the whole of that: while the clock runs, and while the time is served
   * but something else is outstanding. Once `canComplete` is true the button
   * speaks for itself and a panel saying "Done" is just another thing to read.
   *
   * Which is also what makes its lifetime predictable: it appears when the
   * lesson has a time requirement and disappears exactly when the action
   * becomes available. Nothing else can hide it.
   */
  if (state === "ready" || state === "completed") return null

  const pct = Math.min(100, Math.max(0, (elapsed / requiredMs) * 100))


  const blocked = state === "blocked"
  const Icon = blocked ? AlertCircle : Hourglass

  return (
    <div
      role="timer"
      aria-live={blocked ? "polite" : "off"}
      aria-label={
        blocked
          ? "Learning time complete"
          : `Learning time remaining: ${formatRemaining(remaining)}`
      }
      className={cn(
        // Sized to sit inside the 56px navigation row: 36px tall, so it has
        // 10px of breathing room above and below.
        "relative flex h-9 shrink-0 items-center gap-2.5 overflow-hidden rounded-lg pl-1 pr-2.5 shadow-sm ring-1",
        blocked
          ? "bg-amber-50/90 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/25"
          : "bg-violet-50/90 ring-violet-200/80 dark:bg-violet-500/10 dark:ring-violet-500/25"
      )}
    >
      {/* The accent edge from the reference, at this scale. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          blocked
            ? "bg-gradient-to-b from-amber-400 to-amber-500"
            : "bg-gradient-to-b from-violet-500 to-indigo-600"
        )}
      />

      {/* Icon tile. */}
      <span
        className={cn(
          "ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white shadow-sm ring-1 dark:bg-slate-900",
          blocked
            ? "text-amber-600 ring-amber-200/80 dark:text-amber-400 dark:ring-amber-500/25"
            : "text-violet-600 ring-violet-200/80 dark:text-violet-400 dark:ring-violet-500/25"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      {/* Label and countdown. */}
      <span className="flex flex-col leading-none">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          {blocked ? "Time complete" : "Learning time"}
        </span>
        <span
          className={cn(
            "mt-[3px] text-[15px] font-extrabold tabular-nums leading-none tracking-tight",
            blocked
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-900 dark:text-slate-50"
          )}
        >
          {blocked ? "00:00" : formatRemaining(remaining)}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="hidden h-6 w-px bg-violet-200/70 md:block dark:bg-violet-500/20"
      />

      {/* Rail and percentage — the reference's bottom row, inline at this
          size. Hidden on the narrowest viewports, where the row is already
          full and `LessonTimerNotice` carries the same state by the button. */}
      <span className="hidden items-center gap-2 md:flex">
        <span
          className="h-1.5 w-14 overflow-hidden rounded-full bg-violet-200/70 dark:bg-violet-500/20"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Learning time progress"
        >
          <span
            className={cn(
              "block h-full rounded-full transition-[width] duration-1000 ease-linear",
              blocked
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-gradient-to-r from-indigo-600 to-violet-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="text-[10px] font-bold tabular-nums text-violet-700 dark:text-violet-300">
          {Math.round(pct)}%
        </span>
      </span>

      {/* The requirement, where the row is wide enough to say it. */}
      <span className="hidden text-[10px] text-slate-500 lg:inline dark:text-slate-400">
        of {formatTotal(requiredMs)}
      </span>
    </div>
  )
}
