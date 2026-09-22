"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ClipboardPaste, Check } from "lucide-react"
import {
  parseQuestions,
  summarise,
  type ParsedQuestion,
} from "@/lib/learning/question-parser"
import { QuestionMetadataFields, type QuestionMetadata } from "./question-metadata-fields"

/**
 * ============================================================================
 * Paste many questions at once (QP-001 §17)
 * ============================================================================
 *
 * Authors arrive with a document, not with an intention to fill in forty web
 * forms. QP-001 §0 measured question *supply* as the binding constraint on
 * retake variation — 118 assessments draw 4 of 5 — so the fastest honest route
 * from five questions to forty is the one that matters most.
 *
 * ── Preview before insert, always ──────────────────────────────────────────
 *
 * Parsing someone's paste is guesswork, so nothing is added until the author
 * has seen exactly what was understood. Questions whose correct answer could
 * not be determined are shown with a warning and are never guessed at: a
 * silently wrong key is a question every learner gets wrong for a reason nobody
 * can see, which is far worse than one the author finishes by hand.
 *
 * ── One classification for the batch ───────────────────────────────────────
 *
 * Pasted questions almost always share a topic and difficulty — that is what a
 * chapter's worth of questions is. Setting it once here is the difference
 * between a classified bank and forty questions the blueprint cannot allocate.
 */

interface Props {
  /** Called with ready-to-insert questions when the author accepts. */
  onInsert: (questions: Array<ParsedQuestion & QuestionMetadata>) => void
  knownTopics?: string[]
  onCancel?: () => void
}

const EXAMPLE = `1. What is 2 + 2?
A) 3
B) 4
C) 5
Answer: B

2. The sky is blue.
True / False
Answer: True

3. Which of these are prime?
A) 2 *
B) 4
C) 3 *`

export function QuestionBulkPaste({ onInsert, knownTopics = [], onCancel }: Props) {
  const [text, setText] = React.useState("")
  const [shared, setShared] = React.useState<QuestionMetadata>({ tags: [] })

  // Parsing is cheap and pure, so it runs as the author types and the preview
  // is never out of step with the box above it.
  const result = React.useMemo(() => parseQuestions(text), [text])

  const complete = result.questions.filter((q) => q.warnings.length === 0).length
  const incomplete = result.questions.length - complete

  const insert = () => {
    if (result.questions.length === 0) return
    onInsert(
      result.questions.map((q) => ({
        ...q,
        topic: shared.topic ?? null,
        difficulty: shared.difficulty ?? null,
        objective: shared.objective ?? null,
        competency: shared.competency ?? null,
        tags: shared.tags && shared.tags.length > 0 ? shared.tags : undefined,
        // A pasted question the parser could not complete is added as a draft,
        // so it cannot reach a learner before someone finishes it.
        status: q.warnings.length > 0 ? "DRAFT" : (shared.status ?? "ACTIVE"),
      }))
    )
    setText("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardPaste className="h-4 w-4" />
          Paste questions
        </CardTitle>
        <CardDescription>
          Paste a whole list and it will be split into separate questions. Nothing is
          added until you have checked the preview.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bulk-paste">Your questions</Label>
          <textarea
            id="bulk-paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full rounded-md border bg-background p-3 font-mono text-xs leading-relaxed"
            placeholder={EXAMPLE}
          />
          <p className="text-xs text-muted-foreground">
            Numbered questions, options as <code>A)</code> or <code>a.</code> or bullets,
            and the key as <code>Answer: B</code> or a <code>*</code> after the right
            option. Mark two options to make it multi-select.
          </p>
        </div>

        {text.trim() && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.questions.length > 0 ? "default" : "outline"}>
                {summarise(result)}
              </Badge>
              {complete > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  {complete} ready
                </Badge>
              )}
              {incomplete > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {incomplete} need a correct answer
                </Badge>
              )}
            </div>

            {result.questions.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-2 py-1 font-medium">#</th>
                      <th className="px-2 py-1 font-medium">Question</th>
                      <th className="px-2 py-1 font-medium">Type</th>
                      <th className="px-2 py-1 font-medium">Correct answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.questions.map((q, i) => (
                      <tr key={i} className="border-t align-top">
                        <td className="px-2 py-1 tabular-nums text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1">
                          <p className="line-clamp-2">{q.question}</p>
                          {q.options.length > 0 && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {q.options.length} options
                            </p>
                          )}
                          {q.warnings.map((w) => (
                            <p key={w} className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                              {w}
                            </p>
                          ))}
                        </td>
                        <td className="px-2 py-1 text-xs">
                          {q.type.replace(/_/g, " ").toLowerCase()}
                        </td>
                        <td className="px-2 py-1">
                          {q.correct_answer ? (
                            <span className="line-clamp-2">{q.correct_answer}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.ignored.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {result.ignored.length} line(s) were not recognised as part of any
                  question and will not be added:
                  <span className="mt-1 block font-mono text-xs">
                    {result.ignored.slice(0, 3).join(" · ")}
                    {result.ignored.length > 3 && " …"}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {result.questions.length > 0 && (
              <div className="space-y-3 rounded-md border p-4">
                <p className="text-sm font-medium">
                  Apply to all {result.questions.length} questions
                </p>
                <QuestionMetadataFields
                  idPrefix="bulk"
                  value={shared}
                  knownTopics={knownTopics}
                  compact
                  onChange={(patch) => setShared({ ...shared, ...patch })}
                />
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={insert} disabled={result.questions.length === 0}>
            Add {result.questions.length > 0 ? result.questions.length : ""} question
            {result.questions.length === 1 ? "" : "s"}
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
