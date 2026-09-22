"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LearningStepNode } from "@/lib/learning/api"

/**
 * Sticky footer action bar (plan §9.3).
 *
 * The primary action lives here and only here, so it is always in the same
 * place regardless of step type. Previously "Mark Complete" sat inside a card
 * header on video lessons and at the bottom of a long scroll on text lessons,
 * which meant the learner had to hunt for the one thing they came to do.
 */

export type PrimaryActionKind =
  | "complete"
  | "continue"
  | "start-assessment"
  | "resume-assessment"
  | "retake"
  | "review"
  | "none"

export interface PrimaryAction {
  kind: PrimaryActionKind
  label: string
  disabled: boolean
  /** Why the action is unavailable — shown in a tooltip and to screen readers. */
  disabledReason?: string | null
  loading?: boolean
  onClick: () => void
}

export function LearningActionBar({
  previousStep,
  nextStep,
  onNavigate,
  primary,
  /** 0–100 readiness signal for the current lesson's completion gate. */
  gateProgress,
  isCurrentStepComplete,
}: {
  previousStep: LearningStepNode | undefined
  nextStep: LearningStepNode | undefined
  onNavigate: (step: LearningStepNode) => void
  primary: PrimaryAction
  gateProgress?: number | null
  isCurrentStepComplete?: boolean
}) {
  const nextLocked = nextStep?.state === "locked"

  const PrimaryIcon =
    primary.kind === "complete"
      ? Check
      : primary.kind === "retake"
        ? RotateCcw
        : primary.kind === "continue"
          ? ArrowRight
          : undefined

  return (
    <div
      className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Gate progress: a thin, honest signal of how close the learner is */}
      {typeof gateProgress === "number" &&
        gateProgress < 100 &&
        !isCurrentStepComplete && (
          <Progress
            value={gateProgress}
            className="h-0.5 rounded-none"
            aria-label={`Lesson readiness: ${Math.round(gateProgress)} percent`}
          />
        )}

      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-3 sm:px-4">
        {/* Previous */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5"
          disabled={!previousStep}
          onClick={() => previousStep && onNavigate(previousStep)}
          aria-label={
            previousStep ? `Previous: ${previousStep.title}` : "No previous step"
          }
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Completion marker on the current step */}
        {isCurrentStepComplete && (
          <span className="hidden items-center gap-1.5 text-xs font-medium text-success md:flex">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        )}

        <div className="flex-1" />

        {/* Primary action — one per view */}
        {primary.kind !== "none" && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(primary.disabled && "cursor-not-allowed")}>
                  <Button
                    size="lg"
                    className="h-11 min-w-[9rem] gap-2"
                    disabled={primary.disabled || primary.loading}
                    onClick={primary.onClick}
                    aria-describedby={
                      primary.disabled && primary.disabledReason
                        ? "primary-action-reason"
                        : undefined
                    }
                  >
                    {primary.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      PrimaryIcon && <PrimaryIcon className="h-4 w-4" />
                    )}
                    {primary.label}
                  </Button>
                </span>
              </TooltipTrigger>
              {primary.disabled && primary.disabledReason && (
                <TooltipContent side="top" className="max-w-64">
                  {primary.disabledReason}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Next */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(nextLocked && "cursor-not-allowed")}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5"
                  disabled={!nextStep || nextLocked}
                  onClick={() => nextStep && onNavigate(nextStep)}
                  aria-label={nextStep ? `Next: ${nextStep.title}` : "No next step"}
                >
                  <span className="hidden sm:inline">Next</span>
                  {nextLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {nextLocked && nextStep?.state_reason && (
              <TooltipContent side="top" className="max-w-64">
                {nextStep.state_reason}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Screen-reader explanation for a disabled primary action */}
      {primary.disabled && primary.disabledReason && (
        <p id="primary-action-reason" className="sr-only" aria-live="polite">
          {primary.disabledReason}
        </p>
      )}
    </div>
  )
}
