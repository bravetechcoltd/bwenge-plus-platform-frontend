"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Check } from "lucide-react"
import { learningRequest } from "@/lib/learning/api"
import { RichText, isRichTextEmpty } from "@/components/ui/rich-text"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  performanceApi,
  type GradingQueueRow,
  type GradableAnswer,
} from "@/lib/learning/performance-api"
import {
  Chip,
  EmptyNote,
  ErrorNote,
  MobileList,
  MobileRow,
  Panel,
  Table,
  TableSkeleton,
  Td,
  Th,
  Tr,
} from "./performance-ui"

/**
 * ============================================================================
 * Mark management (LM-001 §7, §15)
 * ============================================================================
 *
 * Instructors entering marks and feedback for work a machine cannot grade.
 *
 * ── This is not a grading engine ───────────────────────────────────────────
 *
 * The save posts to `POST /api/answers/grade-manually`, which already existed
 * and already recalculates the attempt score, sets pass/fail, records who
 * graded it, and notifies the learner. §15 is explicit that there must not be
 * a second one, so this component computes nothing: it collects points and
 * feedback and hands them over.
 *
 * The totals shown while typing are a preview of what the server will decide,
 * not a decision. The value the learner sees comes back from the reload.
 */

interface GradedAnswer {
  answer_id: string
  points_earned: number
  feedback?: string
}

/** The canonical manual-grading endpoint. Not reimplemented — called. */
async function submitGrades(payload: {
  assessment_id: string
  user_id: string
  graded_answers: GradedAnswer[]
}) {
  return learningRequest("/answers/grade-manually", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function GradingQueue() {
  const [queue, setQueue] = React.useState<GradingQueueRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState<GradingQueueRow | null>(null)

  const load = React.useCallback(async () => {
    try {
      const res = await performanceApi.gradingQueue()
      setQueue(res.queue)
      setError(null)
    } catch (e: any) {
      setError(e?.message ?? "Could not load the grading queue.")
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <Panel
        title="Awaiting grading"
        description={
          queue === null
            ? "Loading…"
            : queue.length === 0
              ? "Nothing is waiting on you."
              : `${queue.length} attempt${queue.length === 1 ? "" : "s"}, oldest first.`
        }
      >
        {error ? (
          <ErrorNote message={error} />
        ) : !queue ? (
          <TableSkeleton rows={4} />
        ) : queue.length === 0 ? (
          <EmptyNote
            message="Every submitted attempt has been marked."
            hint="Work needing a human mark appears here as soon as it is submitted."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Submitted</Th>
                  <Th>Learner</Th>
                  <Th>Course</Th>
                  <Th>Assessment</Th>
                  <Th align="right">Attempt</Th>
                  <Th align="right">To mark</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => (
                  <Tr key={q.attempt_id} onClick={() => setOpen(q)}>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {q.submitted_at ? new Date(q.submitted_at).toLocaleDateString() : "—"}
                    </Td>
                    <Td className="max-w-[11rem] truncate font-medium">{q.learner_name}</Td>
                    <Td className="max-w-[11rem] truncate">{q.course_title}</Td>
                    <Td className="max-w-[11rem] truncate">{q.assessment_title}</Td>
                    <Td align="right" className="tabular-nums">
                      {q.attempt_number}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {q.answers_ungraded}/{q.answers_total}
                    </Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpen(q)
                        }}
                      >
                        Grade
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <MobileList>
              {queue.map((q) => (
                <MobileRow
                  key={q.attempt_id}
                  onClick={() => setOpen(q)}
                  title={q.learner_name}
                  subtitle={`${q.assessment_title} · attempt ${q.attempt_number}`}
                  right={<Chip tone="warn">{q.answers_ungraded} to mark</Chip>}
                  meta={
                    <>
                      <span>{q.course_title}</span>
                      <span>
                        {q.submitted_at ? new Date(q.submitted_at).toLocaleDateString() : "—"}
                      </span>
                    </>
                  }
                />
              ))}
            </MobileList>
          </>
        )}
      </Panel>

      {/*
        §18: marking happens over the queue, not instead of it. The instructor
        keeps their place in the list, and closing the drawer returns them to
        exactly the row they came from.
      */}
      <AttemptGraderSheet
        attempt={open}
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        onGraded={() => {
          setOpen(null)
          void load()
        }}
      />
    </>
  )
}

/**
 * One attempt, answer by answer.
 *
 * The question shown is the one frozen into that attempt, not the assessment as
 * it stands now — an assessment edited after submission would otherwise have an
 * instructor marking an answer against a question the learner never saw.
 */
function AttemptGrader({
  row,
  onClose,
  onGraded,
  hideHeader,
}: {
  row: GradingQueueRow
  onClose: () => void
  onGraded: () => void
  hideHeader?: boolean
}) {
  const [answers, setAnswers] = React.useState<GradableAnswer[] | null>(null)
  const [draft, setDraft] = React.useState<Record<string, { points: string; feedback: string }>>({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await performanceApi.attemptAnswers(row.attempt_id)
        if (cancelled) return
        setAnswers(res.answers)
        const seed: Record<string, { points: string; feedback: string }> = {}
        for (const a of res.answers) {
          seed[a.answer_id] = {
            points: a.points_earned === null ? "" : String(a.points_earned),
            feedback: a.feedback ?? "",
          }
        }
        setDraft(seed)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load the answers.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [row.attempt_id])

  const save = async () => {
    if (!answers) return
    setSaving(true)
    setError(null)
    try {
      await submitGrades({
        assessment_id: row.assessment_id,
        user_id: row.user_id,
        graded_answers: answers
          // Only answers the instructor actually marked. Sending a blank as 0
          // would score work they skipped over.
          .filter((a) => String(draft[a.answer_id]?.points ?? "").trim() !== "")
          .map((a) => ({
            answer_id: a.answer_id,
            points_earned: Math.max(
              0,
              Math.min(a.points_possible, Number(draft[a.answer_id]?.points) || 0)
            ),
            feedback: draft[a.answer_id]?.feedback?.trim() || undefined,
          })),
      })
      onGraded()
    } catch (e: any) {
      setError(e?.message ?? "Could not save the marks.")
      setSaving(false)
    }
  }

  // A preview of the total, so the instructor can see where they are. The
  // authoritative score is the server's, recalculated on save.
  const marked = answers?.filter((a) => String(draft[a.answer_id]?.points ?? "").trim() !== "") ?? []
  const previewEarned = marked.reduce(
    (sum, a) => sum + Math.min(a.points_possible, Number(draft[a.answer_id]?.points) || 0),
    0
  )
  const previewTotal = answers?.reduce((sum, a) => sum + a.points_possible, 0) ?? 0

  return (
    <div className="space-y-2.5">
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold leading-tight">{row.learner_name}</h3>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {row.assessment_title} · attempt {row.attempt_number} · {row.course_title}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={onClose}>
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Back to queue
          </Button>
        </div>
      )}

      {error && <ErrorNote message={error} />}

      {!answers ? (
        <TableSkeleton rows={5} />
      ) : answers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyNote message="This attempt has no recorded answers." />
        </div>
      ) : (
        <>
          {answers.map((a, i) => (
            <div key={a.answer_id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Question {i + 1} · {a.question_type.replace(/_/g, " ").toLowerCase()}
                  </p>
                  <RichText
                    html={a.question}
                    size="compact"
                    className="mt-0.5 text-[13px] font-medium leading-snug"
                  />
                </div>
                {a.is_graded ? (
                  <Chip tone="good">
                    <Check className="mr-0.5 inline h-3 w-3" />
                    Graded
                  </Chip>
                ) : (
                  <Chip tone="warn">Not graded</Chip>
                )}
              </div>

              {/*
                The answer as the learner formatted it.
                
                An essay is written in the rich text editor, so what is stored
                is markup. Printed into a paragraph it reads as
                "<p>Because the inverter…</p>" — the marker is grading the
                source of the answer rather than the answer, and the headings
                and lists the learner used to structure a long response are
                gone. RichText keeps the line breaks of an answer submitted
                before the field became an editor.
              */}
              <div className="mt-2 rounded-md border border-border bg-muted/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Learner&apos;s answer
                </p>
                {isRichTextEmpty(a.learner_answer) ? (
                  <p className="mt-1 text-[12px] text-muted-foreground">No answer given</p>
                ) : (
                  <RichText
                    html={a.learner_answer}
                    size="compact"
                    className="mt-1 text-[12px]"
                  />
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium" htmlFor={`pts-${a.answer_id}`}>
                    Marks (max {a.points_possible})
                  </label>
                  <Input
                    id={`pts-${a.answer_id}`}
                    type="number"
                    min={0}
                    max={a.points_possible}
                    value={draft[a.answer_id]?.points ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [a.answer_id]: {
                          points: e.target.value,
                          feedback: draft[a.answer_id]?.feedback ?? "",
                        },
                      })
                    }
                    className="h-8 w-24 text-[12px]"
                  />
                </div>
                <div className="min-w-[14rem] flex-1 space-y-1">
                  <label className="text-[11px] font-medium" htmlFor={`fb-${a.answer_id}`}>
                    Feedback (optional)
                  </label>
                  <Input
                    id={`fb-${a.answer_id}`}
                    value={draft[a.answer_id]?.feedback ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [a.answer_id]: {
                          points: draft[a.answer_id]?.points ?? "",
                          feedback: e.target.value,
                        },
                      })
                    }
                    placeholder="What would make this a full-mark answer?"
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>
            </div>
          ))}

          {/*
            The save bar stays reachable without scrolling back through a long
            attempt, which is the whole reason it is sticky rather than a card
            at the bottom of the list.
          */}
          <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-2.5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[12px]">
                <span className="text-muted-foreground">Marked so far: </span>
                <span className="font-semibold tabular-nums">
                  {previewEarned}/{previewTotal}
                </span>
                <span className="ml-1.5 text-[11px] text-muted-foreground">
                  {marked.length} of {answers.length} answers · the final score is recalculated
                  by the server on save
                </span>
              </div>
              <Button
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => void save()}
                disabled={saving || marked.length === 0}
              >
                {saving ? "Saving…" : `Save ${marked.length} mark${marked.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * The same grader, in a drawer.
 *
 * §18 asks for detail views to open over the page rather than replace it: an
 * instructor working through a list should not lose their filters and scroll
 * position to look at one attempt.
 */
export function AttemptGraderSheet({
  attempt,
  open,
  onOpenChange,
  onGraded,
}: {
  attempt: {
    attempt_id: string
    user_id: string
    assessment_id: string
    assessment_title: string
    course_title: string
    attempt_number: number
    learner_name: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGraded: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-2xl">
        {attempt && (
          <>
            <SheetHeader className="space-y-1">
              <SheetTitle className="pr-6 text-left text-[15px] leading-tight">
                {attempt.learner_name}
              </SheetTitle>
              <SheetDescription className="text-left text-[11px]">
                {attempt.assessment_title} · attempt {attempt.attempt_number} ·{" "}
                {attempt.course_title}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-3">
              <AttemptGrader
                row={attempt as GradingQueueRow}
                onClose={() => onOpenChange(false)}
                onGraded={onGraded}
                hideHeader
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
