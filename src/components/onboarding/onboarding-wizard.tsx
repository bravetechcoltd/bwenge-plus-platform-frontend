"use client"

import * as React from "react"
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuestionOptionCard } from "./question-option-card"
import {
  validateAnswer,
  type OnboardingAnswer,
  type OnboardingQuestion,
} from "@/lib/onboarding/api"

/**
 * ============================================================================
 * Onboarding wizard (ONB-001)
 * ============================================================================
 *
 * One question at a time, with a progress bar that counts what the server
 * actually sent.
 *
 * ── Nothing here is hard-coded ─────────────────────────────────────────────
 *
 * Not the questions, not the options, not the number of steps, not the
 * selection limits. §13 is explicit that eight questions must render eight
 * segments without a frontend change, so the bar maps over `questions` and the
 * label reads "Question n of questions.length".
 *
 * ── Answers survive navigation ─────────────────────────────────────────────
 *
 * §16: going Back and returning finds the previous selections intact. The
 * answers live in one map keyed by question id, above the step index, so
 * moving between steps cannot disturb them.
 */

export interface OnboardingWizardProps {
  questions: OnboardingQuestion[]
  /** Seeds the wizard — used when resuming, or editing an existing profile. */
  initialAnswers?: OnboardingAnswer[]
  /** Called with every answer when the last question is completed. */
  onComplete: (answers: OnboardingAnswer[]) => void | Promise<void>
  /** Called with whatever has been answered so far, when someone steps away. */
  onExit?: (answers: OnboardingAnswer[]) => void
  /** Text for the final button — "Complete Profile", "Save changes". */
  finishLabel?: string
  submitting?: boolean
  /** A server-side failure, shown above the navigation rather than as a toast. */
  error?: string | null
}

export function OnboardingWizard({
  questions,
  initialAnswers,
  onComplete,
  onExit,
  finishLabel = "Complete Profile",
  submitting = false,
  error = null,
}: OnboardingWizardProps) {
  const [index, setIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string[]>>(() => {
    const seed: Record<string, string[]> = {}
    for (const a of initialAnswers ?? []) seed[a.question_id] = [...a.option_ids]
    return seed
  })
  // Only shown once someone has tried to move on. Telling people they are
  // wrong before they have done anything is not validation, it is nagging.
  const [showError, setShowError] = React.useState(false)

  const question = questions[index]
  const selected = question ? answers[question.id] ?? [] : []
  const check = question ? validateAnswer(question, selected) : { valid: true, message: null }
  const isLast = index === questions.length - 1

  const asAnswers = React.useCallback(
    (): OnboardingAnswer[] =>
      Object.entries(answers)
        .filter(([, ids]) => ids.length > 0)
        .map(([question_id, option_ids]) => ({ question_id, option_ids })),
    [answers]
  )

  if (!question) return null

  const toggle = (optionId: string) => {
    setShowError(false)
    setAnswers((prev) => {
      const current = prev[question.id] ?? []

      if (question.type === "SINGLE") {
        // Choosing replaces; choosing the same one again clears it, so a
        // non-required single question can be un-answered.
        return { ...prev, [question.id]: current[0] === optionId ? [] : [optionId] }
      }

      if (current.includes(optionId)) {
        return { ...prev, [question.id]: current.filter((id) => id !== optionId) }
      }

      // At the ceiling, an unselected card is inert rather than silently
      // evicting an earlier choice — §12 forbids removing selections quietly.
      if (question.max_selections && current.length >= question.max_selections) {
        return prev
      }

      return { ...prev, [question.id]: [...current, optionId] }
    })
  }

  const goNext = async () => {
    if (!check.valid) {
      setShowError(true)
      return
    }
    if (isLast) {
      await onComplete(asAnswers())
      return
    }
    setShowError(false)
    setIndex((i) => i + 1)
  }

  const goBack = () => {
    setShowError(false)
    setIndex((i) => Math.max(0, i - 1))
  }

  const atLimit =
    question.type === "MULTIPLE" &&
    !!question.max_selections &&
    selected.length >= question.max_selections

  return (
    <div className="flex h-full flex-col">
      {/* ── Progress: one segment per question, however many there are ── */}
      <div className="flex gap-1.5 px-1" aria-hidden>
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= index ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* ── Fixed header (§22) ── */}
      <div className="relative shrink-0 px-2 pt-5 text-center">
        {onExit && (
          <button
            type="button"
            onClick={() => onExit(asAnswers())}
            aria-label="Close the questionnaire"
            className="absolute right-0 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <p
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          aria-live="polite"
        >
          Question {index + 1} / {questions.length}
        </p>
        <h2 className="mt-2 text-[22px] font-bold leading-tight text-foreground sm:text-[26px]">
          {question.title}
        </h2>
        {question.description && (
          <p className="mx-auto mt-2 max-w-xl text-[14px] text-muted-foreground">
            {question.description}
          </p>
        )}
      </div>

      {/* ── Scrollable options (§22) ── */}
      <div
        role={question.type === "MULTIPLE" ? "group" : "radiogroup"}
        aria-label={question.title}
        className="min-h-0 flex-1 overflow-y-auto px-1 py-5"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {question.options.map((option) => (
            <QuestionOptionCard
              key={option.id}
              option={option}
              multiple={question.type === "MULTIPLE"}
              selected={selected.includes(option.id)}
              disabled={atLimit}
              onToggle={() => toggle(option.id)}
            />
          ))}
        </div>

        {atLimit && (
          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            You can select up to {question.max_selections}. Deselect one to choose another.
          </p>
        )}
      </div>

      {/* ── Fixed footer (§14, §22) ── */}
      <div className="shrink-0 border-t border-border pt-4">
        {(showError && check.message) || error ? (
          <p
            role="alert"
            className="mb-3 flex items-center justify-center gap-1.5 text-[12px] text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error ?? check.message}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={index === 0 || submitting}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            type="button"
            onClick={() => void goNext()}
            // Disabled communicates "not yet", but the reason is also written
            // out above once they try — disabled alone explains nothing.
            disabled={!check.valid || submitting}
            className="gap-1.5 min-w-[160px]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : isLast ? (
              <>
                <Check className="h-4 w-4" />
                {finishLabel}
              </>
            ) : (
              <>
                Next Question
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
