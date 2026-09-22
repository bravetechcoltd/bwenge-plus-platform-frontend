"use client"

/**
 * ============================================================================
 * AssessmentIntegrityWarning — what the learner is told before they leave
 * ============================================================================
 *
 * LC-CONS-001 §14.4, §14.5.
 *
 * ── The copy adapts to the policy; it is never hard-coded ───────────────────
 *
 * §8 of the brief is explicit that the action must be driven by the
 * assessment's configured policy rather than one behaviour for everything. So
 * is the message: telling a learner on a practice quiz that their attempt will
 * be submitted automatically would be a lie, and a security feature that lies
 * about its consequences is one learners learn to ignore.
 *
 *   OFF      "your answers are saved" — no count, no consequence
 *   MONITOR  the event is recorded and counted, but nothing ever ends
 *   STRICT   the count, the remaining allowance, and what happens at zero
 *
 * ── Rules the copy follows (§14.5) ──────────────────────────────────────────
 *
 *   • Say what was observed, never what was inferred. "You are about to leave"
 *     — never "you are cheating".
 *   • State the consequence in numbers the learner can act on.
 *   • Never threaten a consequence the policy does not carry.
 *   • "Stay in the assessment" is the primary action and holds focus, because
 *     the overwhelmingly likely cause of this dialog is a mis-click.
 *   • `role="alertdialog"` and `aria-live="assertive"`, so it is announced.
 *   • No attention-grabbing motion under `prefers-reduced-motion`.
 *
 * It is built on the shared `Dialog` at size `sm` (AXM-CONS-001's width
 * vocabulary) rather than inventing a modal — §20 forbids a parallel system.
 */

import * as React from "react"
import { AlertTriangle, ArrowLeft, LogOut, ShieldAlert } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LeaveReason } from "@/hooks/use-assessment-navigation-guard"
import type {
  IntegrityVerdict,
  ProctoringPolicy,
} from "@/hooks/use-assessment-integrity"

const REASON_TEXT: Record<LeaveReason, string> = {
  STEP_CHANGE: "You are about to open another part of this course.",
  BACK_NAVIGATION: "You are about to go back.",
  IN_APP_LINK: "You are about to open another page.",
  PAGE_UNLOAD: "You are about to leave this page.",
}

export interface AssessmentIntegrityWarningProps {
  reason: LeaveReason | null
  policy: ProctoringPolicy | null
  verdict: IntegrityVerdict | null
  onConfirm: () => void
  onCancel: () => void
}

export function AssessmentIntegrityWarning({
  reason,
  policy,
  verdict,
  onConfirm,
  onCancel,
}: AssessmentIntegrityWarningProps) {
  const open = reason !== null

  const monitored = !!policy && policy.mode !== "OFF"
  const autoSubmitAt = policy?.auto_submit_at ?? null
  const recorded = verdict?.violation_count ?? 0

  // The count the learner is about to reach, not the one they are at — that is
  // the number that tells them what this click costs.
  const nextCount = recorded + 1
  const atThreshold = autoSubmitAt !== null && nextCount >= autoSubmitAt
  const remaining =
    autoSubmitAt !== null ? Math.max(0, autoSubmitAt - nextCount) : null

  const title = !monitored
    ? "Leave this assessment?"
    : atThreshold
      ? "This will submit your attempt"
      : "Assessment Integrity Warning"

  const Icon = !monitored ? ArrowLeft : atThreshold ? ShieldAlert : AlertTriangle

  const tone = !monitored
    ? "text-muted-foreground bg-muted"
    : atThreshold
      ? "text-destructive bg-destructive/10"
      : "text-warning bg-warning/10"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing by overlay or Escape means "I did not mean to leave",
        // which is the same answer as Stay. It must never read as consent.
        if (!next) onCancel()
      }}
    >
      <DialogContent
        size="sm"
        role="alertdialog"
        aria-live="assertive"
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          event.preventDefault()
          onCancel()
        }}
        className="gap-5"
      >
        <DialogHeader>
          <div
            className={cn(
              "mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full sm:mx-0",
              tone
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {reason ? REASON_TEXT[reason] : ""}{" "}
            {monitored
              ? "Your answers are saved, but leaving an active assessment is recorded on this attempt."
              : "Your answers are saved as a draft, and you can pick this attempt up again."}
          </DialogDescription>
        </DialogHeader>

        {monitored && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Recorded events: {nextCount}
              {autoSubmitAt !== null ? ` of ${autoSubmitAt}` : ""}
            </p>

            {autoSubmitAt !== null && (
              <>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
                  role="progressbar"
                  aria-valuenow={Math.min(nextCount, autoSubmitAt)}
                  aria-valuemin={0}
                  aria-valuemax={autoSubmitAt}
                  aria-label="Recorded integrity events"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                      atThreshold ? "bg-destructive" : "bg-warning"
                    )}
                    style={{
                      width: `${Math.min(100, (nextCount / autoSubmitAt) * 100)}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {atThreshold
                    ? "Leaving now submits this attempt and it cannot be reopened."
                    : `${remaining} more will submit this attempt automatically.`}
                </p>
              </>
            )}

            {autoSubmitAt === null && (
              <p className="mt-2 text-xs text-muted-foreground">
                This is recorded for your instructor. Your attempt is not ended
                automatically.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant={atThreshold ? "destructive" : "outline"}
            onClick={onConfirm}
            className="sm:order-1"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Leave anyway
          </Button>
          {/* Primary, and autofocused: a mis-click is by far the likeliest
              reason this dialog is on screen. */}
          <Button type="button" autoFocus onClick={onCancel} className="sm:order-2">
            Stay in the assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
