"use client"

/**
 * ============================================================================
 * Secure assessment session — the chrome around a monitored attempt
 * ============================================================================
 *
 * Three pieces, and none of them enforces anything:
 *
 *   SecureAssessmentBriefing  the warning shown before starting, and the
 *                             acknowledgement that must precede it
 *   SecureSessionShell        the full-screen cover the attempt runs inside
 *   LeaveAssessmentDialog     the confirmation shown on the way out
 *
 * ── What this layer is, and what it is not ─────────────────────────────────
 *
 * Enforcement is entirely server-side and predates this file.
 * `useAssessmentIntegrity` records events; the server classifies them against
 * the resolved proctoring policy, keeps the violation count, and decides on
 * its own authority when an attempt is auto-submitted
 * (`AssessmentAttemptService.sweep` → `AUTO_SUBMIT_TRIGGERED`). The client is
 * told; it does not decide, and a client that lies or goes quiet changes
 * nothing about the outcome.
 *
 * So everything here is presentation. A cover that hides the rest of the page
 * is not a cage — the learner can still open a new tab, and the *point* is
 * that doing so is recorded rather than prevented. Treating this chrome as
 * the security boundary would be the mistake; it is the part that makes the
 * boundary legible.
 *
 * ── Not accusing honest learners ───────────────────────────────────────────
 *
 * The failure mode that matters is a false accusation. A notification banner,
 * an autofill dropdown, a fullscreen transition, an incoming call, a
 * backgrounded mobile browser and a dropped connection all look like evasion
 * from inside the browser. The guarantees that keep them from being counted
 * live in the policy clamps (`grace_period_ms` floor) and the server's
 * classifier, not here — but this file must not undo them by *describing*
 * every hiccup as a violation. Wording is deliberately factual: what was
 * recorded, not what it implies about the person.
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  AlertTriangle,
  Check,
  Clock,
  Cloud,
  CloudOff,
  Loader2,
  Maximize2,
  ShieldCheck,
  WifiOff,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProctoringPolicy } from "@/lib/learning/api"

/* ══════════════════════════════════════════════════════════════════════════
   Briefing — shown before the attempt exists
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * What the learner is told, derived from the policy actually in force.
 *
 * Every line is conditional on a real setting. Listing a rule that is not
 * enabled would be a lie the learner cannot check, and listing rules that are
 * enabled is the whole point: nobody should discover the terms by violating
 * them.
 */
export function proctoringRules(policy: ProctoringPolicy | null): string[] {
  if (!policy || policy.mode === "OFF") return []
  const rules: string[] = []

  if (policy.monitor_visibility || policy.monitor_focus) {
    rules.push(
      "Switching to another tab or window is recorded, with how long you were away."
    )
  }
  if (policy.detect_second_tab) {
    rules.push("Opening this assessment in a second tab is recorded.")
  }
  if (policy.require_fullscreen) {
    // Framed as a boundary with an end, not a cage. "You cannot leave" is a
    // claim the browser contradicts the first time anyone taps Escape — and a
    // learner who catches the system in one untrue statement has no reason to
    // believe the rest of them.
    rules.push(
      "This assessment runs in full screen until you submit. Leaving it early is recorded."
    )
  }
  if (policy.block_copy_paste) {
    rules.push("Copying and pasting are disabled on the question area.")
  }
  if (policy.block_print) {
    rules.push("Printing is disabled.")
  }
  if (policy.auto_submit_at != null) {
    rules.push(
      `After ${policy.auto_submit_at} recorded events, your attempt is submitted automatically with the answers you have given.`
    )
  } else {
    rules.push(
      "Recorded events are shared with your instructor. They never end your attempt on their own."
    )
  }

  return rules
}

export function SecureAssessmentBriefing({
  policy,
  acknowledged,
  onAcknowledgedChange,
  className,
}: {
  policy: ProctoringPolicy | null
  acknowledged: boolean
  onAcknowledgedChange: (next: boolean) => void
  className?: string
}) {
  const rules = proctoringRules(policy)
  if (rules.length === 0) return null

  const willAutoSubmit = policy?.auto_submit_at != null

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-warning/40 bg-warning/[0.07]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className
      )}
    >
      <div className="flex items-start gap-3 border-b border-warning/25 px-4 py-3.5 sm:px-5">
        {/* The pulse is the only animated element: it draws the eye once and
            then stops mattering. Anything more would be theatre on a screen
            the learner needs to actually read. */}
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-warning/30 motion-safe:animate-ping" />
          <AlertTriangle className="relative h-5 w-5 text-warning" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            This is a monitored assessment
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {willAutoSubmit
              ? "Read these terms before you begin. They can end your attempt."
              : "Read these terms before you begin."}
          </p>
        </div>
      </div>

      <ul className="space-y-2 px-4 py-3.5 sm:px-5">
        {rules.map((rule, i) => (
          <li
            key={rule}
            className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground/85 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1"
            style={{ animationDelay: `${120 + i * 70}ms`, animationFillMode: "backwards" }}
          >
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      {/*
        The one thing on this panel the learner has to act on, so the whole
        row is the target and the row says so on hover and on focus. The
        checkbox alone is an 18px hit area at the end of four lines of rules.
      */}
      <label
        htmlFor="proctoring-ack"
        className="flex cursor-pointer select-none items-start gap-3 border-t border-warning/25 bg-warning/[0.06] px-4 py-3.5 transition-colors hover:bg-warning/[0.12] has-[:focus-visible]:bg-warning/[0.12] sm:px-5"
      >
        <Checkbox
          id="proctoring-ack"
          checked={acknowledged}
          onCheckedChange={(v) => onAcknowledgedChange(v === true)}
          className="mt-0.5"
        />
        <span className="text-[13px] font-medium leading-relaxed text-foreground">
          I understand how this assessment is monitored and I&apos;m ready to begin.
        </span>
      </label>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Session shell — the cover the attempt runs inside
   ══════════════════════════════════════════════════════════════════════════ */

export interface SessionShellStatus {
  title: string
  /** Seconds remaining, or null for an untimed assessment. */
  secondsLeft: number | null
  answered: number
  total: number
  saveState: "idle" | "saving" | "saved" | "error"
  online: boolean
  pendingEvents: number
  monitored: boolean
  /** Set while the browser is showing something other than this document. */
  isAway: boolean
  /** Rendered beside the monitored badge when the assessment records video. */
  cameraChip?: React.ReactNode
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`
}

/**
 * What a screen reader is told about the remaining time.
 *
 * The visible countdown updates every second. Putting `aria-live` on *that*
 * — which is the obvious reading of "the countdown is a polite live region"
 * — makes it announce sixty times a minute, which does not inform anyone; it
 * makes the assessment unusable with a screen reader running. The spec's
 * intent is that a learner who cannot see the clock still knows where they
 * are in it.
 *
 * So the visible timer is `aria-hidden` and this announces the same
 * information at the moments it changes meaning: thirty, fifteen, ten and
 * five minutes, then the last minute, then the last ten seconds. Polite
 * throughout, and assertive under a minute, where interrupting is the point.
 */
const MILESTONES_SECONDS = [1800, 900, 600, 300, 120, 60, 30, 10]

function CountdownAnnouncer({ secondsLeft }: { secondsLeft: number | null }) {
  const [message, setMessage] = React.useState("")
  const announcedRef = React.useRef<Set<number>>(new Set())

  React.useEffect(() => {
    if (secondsLeft === null) return
    const hit = MILESTONES_SECONDS.find(
      (m) => secondsLeft <= m && !announcedRef.current.has(m)
    )
    if (hit === undefined) return

    // Every milestone at or above the current time counts as passed, so a tab
    // that was backgrounded through several of them announces the one that is
    // true now rather than replaying the ones it slept through.
    for (const m of MILESTONES_SECONDS) {
      if (secondsLeft <= m) announcedRef.current.add(m)
    }

    setMessage(
      hit >= 60
        ? `${Math.round(hit / 60)} minute${hit === 60 ? "" : "s"} remaining.`
        : `${hit} seconds remaining.`
    )
  }, [secondsLeft])

  return (
    <div
      role="status"
      aria-live={secondsLeft !== null && secondsLeft <= 60 ? "assertive" : "polite"}
      className="sr-only"
    >
      {message}
    </div>
  )
}

function SaveIndicator({ state, online }: { state: SessionShellStatus["saveState"]; online: boolean }) {
  // Offline outranks the save state. "Couldn't save" invites the learner to
  // retry or panic; "Offline — saved on this device" tells them what is
  // actually true and what will happen next.
  if (!online) {
    return (
      <span className="flex items-center gap-1.5 text-warning">
        <CloudOff className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Offline — saved on this device</span>
        <span className="sm:hidden">Offline</span>
      </span>
    )
  }
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Saving…</span>
      </span>
    )
  }
  if (state === "error") {
    return (
      <span className="flex items-center gap-1.5 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Couldn&apos;t save — retrying</span>
        <span className="sm:hidden">Retrying</span>
      </span>
    )
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-success">
        <Cloud className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Saved</span>
      </span>
    )
  }
  return null
}

export function SecureSessionShell({
  status,
  onRequestLeave,
  children,
  footer,
}: {
  status: SessionShellStatus
  onRequestLeave: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const { secondsLeft, answered, total, monitored, online, isAway } = status

  const pct = total > 0 ? Math.round((answered / total) * 100) : 0

  const timeTone =
    secondsLeft === null
      ? "text-muted-foreground"
      : secondsLeft <= 60
        ? "text-destructive"
        : secondsLeft <= 300
          ? "text-warning"
          : "text-foreground"

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {monitored && (
              <span
                className="hidden shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:inline-flex"
                title="This attempt is being recorded for your instructor."
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Monitored
              </span>
            )}
            {status.cameraChip}
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
              {status.title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-[12px] sm:gap-4">
            <SaveIndicator state={status.saveState} online={online} />

            {secondsLeft !== null && (
              <span
                className={cn("flex items-center gap-1.5 font-medium tabular-nums", timeTone)}
                aria-hidden="true"
              >
                <Clock className="h-3.5 w-3.5" />
                {formatClock(secondsLeft)}
              </span>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onRequestLeave}
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>

        {/* Progress reads as progress through the paper, not as a score. */}
        <div className="mx-auto w-full max-w-[1100px] px-3 pb-2.5 sm:px-5">
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {answered}/{total} answered
            </span>
          </div>
        </div>
      </header>

      <CountdownAnnouncer secondsLeft={secondsLeft} />

      {/* ── Connectivity banner ───────────────────────────────────────────── */}
      {!online && (
        <div
          role="status"
          className="shrink-0 border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-[12.5px] text-warning motion-safe:animate-in motion-safe:slide-in-from-top-1"
        >
          <span className="inline-flex items-center gap-2">
            <WifiOff className="h-3.5 w-3.5" />
            You&apos;re offline. Your answers are safe on this device and will sync
            when the connection returns — this is not counted against you.
          </span>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {/*
          While the document is hidden the questions are blurred. The learner
          is looking at something else, so this costs them nothing — and it
          removes the value of a screenshot taken from a second window.
        */}
        <div className={cn("transition-[filter] duration-200", isAway && "blur-md")}>
          {children}
        </div>
      </div>

      {footer ? (
        <footer className="shrink-0 border-t border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="mx-auto w-full max-w-[1100px] px-3 py-2.5 sm:px-5 sm:py-3">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Full-screen prompt
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Shown when the policy wants full screen and the browser is not in it.
 *
 * Deliberately **not** a hard gate. `require_fullscreen` degrades to
 * monitoring where the browser cannot honour it — iOS Safari has no
 * `Element.requestFullscreen`, and a fullscreen request that does not descend
 * from a user gesture is rejected outright. A learner is never barred from an
 * assessment by a capability their device lacks (AC A-20), so this asks, says
 * what happens either way, and lets them proceed.
 */
export function FullscreenPrompt({
  supported,
  onEnter,
  onDismiss,
}: {
  supported: boolean
  onEnter: () => void
  onDismiss: () => void
}) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-4 motion-safe:animate-in motion-safe:fade-in">
      <div className="flex items-start gap-2.5">
        <Maximize2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            This assessment is meant to run in full screen
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {supported
              ? "Leaving full screen is recorded and shared with your instructor."
              : "Your browser doesn't support full screen here. You can continue — this won't be held against you."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {supported && (
              <Button size="sm" onClick={onEnter} className="gap-1.5">
                <Maximize2 className="h-3.5 w-3.5" />
                Enter full screen
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onDismiss}>
              Continue anyway
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Leaving
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The confirmation shown when the learner tries to leave an active attempt.
 *
 * The wording changes with what leaving actually costs, because there are two
 * genuinely different situations and telling the learner the wrong one is
 * either a false threat or a nasty surprise:
 *
 *   `submitsOnLeave`  leaving ends the attempt — say so, in those words
 *   otherwise         the attempt stays open and resumable; leaving is
 *                     recorded but costs them nothing they can't recover
 */
export function LeaveAssessmentDialog({
  open,
  onOpenChange,
  submitsOnLeave,
  submitting,
  onStay,
  onLeave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitsOnLeave: boolean
  submitting: boolean
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-200">
        <AlertDialogHeader>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15">
              <AlertTriangle className="h-[18px] w-[18px] text-warning" />
            </span>
            <AlertDialogTitle className="text-base">
              {submitsOnLeave ? "Leaving will submit your attempt" : "Leave this assessment?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-[13.5px] leading-relaxed">
            {submitsOnLeave ? (
              <>
                Leaving now submits the answers you&apos;ve given and closes this
                attempt. Unanswered questions stay unanswered, and leaving is
                recorded for your instructor. This can&apos;t be undone.
              </>
            ) : (
              <>
                Your answers are saved and you can come back to this attempt.
                Leaving is recorded for your instructor.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onStay} disabled={submitting} className="mt-0">
            Stay in assessment
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // The dialog closes itself on action; the submit is async and
              // must not race that. Owning the close here keeps the button in
              // its pending state until the server has actually answered.
              e.preventDefault()
              onLeave()
            }}
            disabled={submitting}
            className={cn(
              "gap-2",
              submitsOnLeave && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : submitsOnLeave ? (
              <Check className="h-4 w-4" />
            ) : null}
            {submitsOnLeave ? "Submit & leave" : "Leave"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
