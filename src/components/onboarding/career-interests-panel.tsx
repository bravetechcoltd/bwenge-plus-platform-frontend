"use client"

import * as React from "react"
import * as Icons from "lucide-react"
import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { OnboardingWizard } from "./onboarding-wizard"
import {
  onboardingApi,
  type OnboardingAnswer,
  type OnboardingProfile,
  type OnboardingQuestion,
} from "@/lib/onboarding/api"

/**
 * A learner's onboarding answers, shown and editable (ONB-001 §18, §26).
 *
 * The same wizard as registration, seeded with what they answered before, so
 * editing is the identical interaction rather than a second form that has to
 * agree with the first. Saving replaces the previous set — §26 asks for
 * "update", and merging would make removing an interest impossible.
 */
export function CareerInterestsPanel() {
  const [profile, setProfile] = React.useState<OnboardingProfile | null>(null)
  const [questions, setQuestions] = React.useState<OnboardingQuestion[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    try {
      const [q, p] = await Promise.all([
        onboardingApi.questions(),
        onboardingApi.profile(),
      ])
      setQuestions(q)
      setProfile(p)
      setError(null)
    } catch (e: any) {
      setError(e?.message ?? "Could not load your interests.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  /** Values → the labels an administrator configured, for display. */
  const labelFor = React.useCallback(
    (value: string) => {
      for (const q of questions) {
        const match = q.options.find((o) => o.value === value)
        if (match) return match
      }
      return null
    },
    [questions]
  )

  const save = async (answers: OnboardingAnswer[]) => {
    setSaving(true)
    setError(null)
    try {
      await onboardingApi.update(answers)
      toast.success("Your interests have been updated")
      setEditing(false)
      await load()
    } catch (e: any) {
      setError(e?.message ?? "Could not save your interests.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-[12px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your interests…
      </div>
    )
  }

  if (editing && questions.length > 0) {
    return (
      <div className="flex h-[min(80vh,700px)] flex-col rounded-xl border border-border bg-card p-5">
        <OnboardingWizard
          questions={questions}
          initialAnswers={profile?.responses}
          onComplete={save}
          onExit={() => setEditing(false)}
          finishLabel="Save changes"
          submitting={saving}
          error={error}
        />
      </div>
    )
  }

  const goals = profile?.main_goals ?? []
  const interests = profile?.career_interests ?? []
  const nothingYet = goals.length === 0 && interests.length === 0

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-[13px] font-semibold text-card-foreground">
            Goals &amp; career interests
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            What we use to shape your recommendations.
          </p>
        </div>
        {questions.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-[11px]"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {nothingYet ? "Answer now" : "Edit"}
          </Button>
        )}
      </div>

      <div className="space-y-4 p-4">
        {error && <p className="text-[12px] text-destructive">{error}</p>}

        {nothingYet ? (
          <p className="text-[12px] text-muted-foreground">
            You have not answered the onboarding questions yet. Answering them helps
            us recommend courses that match what you want to do.
          </p>
        ) : (
          <>
            {goals.length > 0 && (
              <Section title="Main goal" values={goals} labelFor={labelFor} />
            )}
            {interests.length > 0 && (
              <Section title="Career interests" values={interests} labelFor={labelFor} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  values,
  labelFor,
}: {
  title: string
  values: string[]
  labelFor: (value: string) => { title: string; icon: string | null } | null
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((value) => {
          const option = labelFor(value)
          const Icon = (option?.icon && (Icons as any)[option.icon]) || Icons.Sparkles
          return (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {/* An option retired since they chose it still shows: their
                  profile should not silently lose an interest because an
                  administrator tidied the list. */}
              {option?.title ?? value.replace(/_/g, " ")}
            </span>
          )
        })}
      </div>
    </div>
  )
}
