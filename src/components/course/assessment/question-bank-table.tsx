"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  Copy,
  Archive,
  Pencil,
  Plus,
  Search,
  Upload,
  RotateCcw,
} from "lucide-react"
import {
  questionBankApi,
  type BankQuestion,
  type DuplicateMatch,
} from "@/lib/learning/question-bank-api"
import { QuestionMetadataFields } from "./question-metadata-fields"

/**
 * ============================================================================
 * Question bank (QP-001 §15, §17, §20)
 * ============================================================================
 *
 * The course-level library. Lives inside Manage Courses as a tab on the course,
 * not as a separate application — §13 of the request is explicit, and the audit
 * agrees: questions belong to assessments, and the bank is a place to author
 * and reuse them, not a second system.
 *
 * ── Why throughput is the first-class feature here ─────────────────────────
 *
 * QP-001 §0 measured the binding constraint as question *supply*, not
 * algorithm sophistication: 118 assessments draw 4 of 5, and no selector fixes
 * that. So duplicate, bulk-add and import are primary actions rather than a
 * menu item, and the table exists mostly to make a 200-question bank navigable.
 */

interface Props {
  courseId: string
  /** Offered when the bank is opened from inside an assessment. */
  onCopyToAssessment?: (questionIds: string[]) => void
}

const PAGE = 25

export function QuestionBankTable({ courseId, onCopyToAssessment }: Props) {
  const [items, setItems] = React.useState<BankQuestion[]>([])
  const [total, setTotal] = React.useState(0)
  const [topics, setTopics] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(0)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [editing, setEditing] = React.useState<BankQuestion | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [importing, setImporting] = React.useState(false)

  const [filters, setFilters] = React.useState({
    search: "",
    topic: "",
    difficulty: "",
    question_type: "",
    status: "",
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await questionBankApi.list(courseId, {
        ...filters,
        limit: PAGE,
        offset: page * PAGE,
      })
      setItems(data.items)
      setTotal(data.total)
      setTopics(data.topics)
    } catch (e: any) {
      setError(e?.message ?? "Could not load the question bank.")
    } finally {
      setLoading(false)
    }
  }, [courseId, filters, page])

  React.useEffect(() => {
    void load()
  }, [load])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const duplicate = async (q: BankQuestion) => {
    // The cheapest path from five questions to fifteen: copy, then edit. The
    // copy is a draft so a half-edited duplicate is never issued to a learner.
    await questionBankApi.create(courseId, {
      question: `${q.question} (copy)`,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      points: q.points,
      topic: q.topic,
      difficulty: q.difficulty,
      objective: q.objective,
      competency: q.competency,
      tags: q.tags,
      pool_tag: q.pool_tag,
      status: "DRAFT",
    })
    await load()
  }

  const setRetired = async (q: BankQuestion) => {
    await questionBankApi.retire(courseId, q.id, q.status === "RETIRED")
    await load()
  }

  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Question bank</CardTitle>
              <CardDescription>
                {total} question{total === 1 ? "" : "s"} available to every assessment in this
                course.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add question
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              {onCopyToAssessment && selected.size > 0 && (
                <Button size="sm" variant="secondary" onClick={() => onCopyToAssessment([...selected])}>
                  Add {selected.size} to assessment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(e) => {
                  setPage(0)
                  setFilters({ ...filters, search: e.target.value })
                }}
                placeholder="Search questions…"
                className="pl-8"
              />
            </div>

            <FilterSelect
              value={filters.topic}
              onChange={(v) => {
                setPage(0)
                setFilters({ ...filters, topic: v })
              }}
              placeholder="All topics"
              options={topics}
            />
            <FilterSelect
              value={filters.difficulty}
              onChange={(v) => {
                setPage(0)
                setFilters({ ...filters, difficulty: v })
              }}
              placeholder="All difficulties"
              options={["EASY", "MEDIUM", "HARD"]}
            />
            <FilterSelect
              value={filters.status}
              onChange={(v) => {
                setPage(0)
                setFilters({ ...filters, status: v })
              }}
              placeholder="All statuses"
              options={["DRAFT", "REVIEW", "ACTIVE", "RETIRED"]}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No questions yet. Add one, or import a file.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    {onCopyToAssessment && <th className="w-8 py-2" />}
                    <th className="py-2 pr-2 font-medium">Question</th>
                    <th className="py-2 pr-2 font-medium">Topic</th>
                    <th className="py-2 pr-2 font-medium">Difficulty</th>
                    <th className="py-2 pr-2 font-medium">Type</th>
                    <th className="py-2 pr-2 font-medium">Status</th>
                    <th className="py-2 pr-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => (
                    <tr key={q.id} className="border-b last:border-0 align-top">
                      {onCopyToAssessment && (
                        <td className="py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select question: ${q.question.slice(0, 40)}`}
                            checked={selected.has(q.id)}
                            onChange={() => toggle(q.id)}
                          />
                        </td>
                      )}
                      <td className="max-w-md py-2 pr-2">
                        <p className="line-clamp-2">{q.question}</p>
                        {q.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {q.tags.slice(0, 4).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2">{q.topic ?? "—"}</td>
                      <td className="py-2 pr-2">
                        {q.difficulty ? (
                          <Badge variant="secondary">{q.difficulty.toLowerCase()}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-2 text-xs">{q.question_type.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-2">
                        <Badge variant={q.status === "ACTIVE" ? "default" : "outline"}>
                          {q.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(q)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label="Duplicate" onClick={() => void duplicate(q)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={q.status === "RETIRED" ? "Restore" : "Retire"}
                            onClick={() => void setRetired(q)}
                          >
                            {q.status === "RETIRED" ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(creating || editing) && (
        <BankQuestionForm
          courseId={courseId}
          knownTopics={topics}
          existing={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            void load()
          }}
        />
      )}

      {importing && (
        <ImportPanel
          courseId={courseId}
          onClose={() => setImporting(false)}
          onImported={() => {
            setImporting(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: string[]
}) {
  return (
    <Select value={value || "ALL"} onValueChange={(v) => onChange(v === "ALL" ? "" : v)}>
      <SelectTrigger className="w-[170px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o.charAt(0) + o.slice(1).toLowerCase().replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Authoring one question, or several sharing metadata.
 *
 * Duplicate detection runs against the text as it is written and reports
 * candidates — it never blocks and never merges. "These two questions are the
 * same" is a judgement about meaning that a similarity score only approximates,
 * so a person makes it.
 */
function BankQuestionForm({
  courseId,
  knownTopics,
  existing,
  onClose,
  onSaved,
}: {
  courseId: string
  knownTopics: string[]
  existing: BankQuestion | null
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = React.useState<Partial<BankQuestion>>(
    existing ?? {
      question: "",
      question_type: "MULTIPLE_CHOICE",
      options: ["", ""],
      correct_answer: "",
      points: 1,
      tags: [],
      status: "ACTIVE",
    }
  )
  const [duplicates, setDuplicates] = React.useState<DuplicateMatch[]>([])
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [keepOpen, setKeepOpen] = React.useState(false)

  // Debounced so a check runs on a pause in typing rather than per keystroke.
  React.useEffect(() => {
    const text = String(draft.question ?? "")
    if (text.trim().length < 12) {
      setDuplicates([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await questionBankApi.checkDuplicates(courseId, text, existing?.id)
        setDuplicates(res.matches)
      } catch {
        // A failed duplicate check must not block authoring.
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [draft.question, courseId, existing?.id])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (existing) {
        await questionBankApi.update(courseId, existing.id, draft)
      } else {
        await questionBankApi.create(courseId, draft)
      }

      if (keepOpen && !existing) {
        // "Add another" keeps the classification and clears only the content.
        // Re-picking topic and difficulty twenty times is how banks stay at
        // five questions.
        setDraft({
          ...draft,
          question: "",
          options: draft.question_type === "MULTIPLE_CHOICE" ? ["", ""] : draft.options,
          correct_answer: "",
          explanation: "",
        })
        setDuplicates([])
        setSaving(false)
        return
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message ?? "Could not save the question.")
      setSaving(false)
    }
  }

  const options = draft.options ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {existing ? "Edit question" : "New question"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Question</label>
          <Input
            value={draft.question ?? ""}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            placeholder="Write your question…"
          />
        </div>

        {duplicates.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <p className="font-medium">
                {duplicates.length} similar question{duplicates.length === 1 ? "" : "s"} already
                in this bank:
              </p>
              <ul className="list-disc pl-5 text-sm">
                {duplicates.slice(0, 3).map((d) => (
                  <li key={d.id}>
                    {d.question}{" "}
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {d.kind === "EXACT" ? "identical" : `${Math.round(d.similarity * 100)}% similar`}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Nothing is blocked — keep both if they test different things.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={draft.question_type ?? "MULTIPLE_CHOICE"}
              onValueChange={(v) => setDraft({ ...draft, question_type: v })}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT", "SHORT_ANSWER", "ESSAY"].map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ").toLowerCase()}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Points</label>
            <Input
              type="number"
              min={1}
              value={draft.points ?? 1}
              onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) || 1 })}
              className="w-24"
            />
          </div>
        </div>

        {draft.question_type === "MULTIPLE_CHOICE" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  aria-label={`Option ${i + 1} is correct`}
                  checked={draft.correct_answer === opt && !!opt}
                  onChange={() => setDraft({ ...draft, correct_answer: opt })}
                />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options]
                    const wasCorrect = draft.correct_answer === next[i]
                    next[i] = e.target.value
                    setDraft({
                      ...draft,
                      options: next,
                      // Follow the edit, so renaming the correct option does
                      // not silently orphan the key.
                      correct_answer: wasCorrect ? e.target.value : draft.correct_answer,
                    })
                  }}
                  placeholder={`Option ${i + 1}`}
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDraft({ ...draft, options: [...options, ""] })}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add option
            </Button>
          </div>
        )}

        {draft.question_type === "TRUE_FALSE" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Correct answer</label>
            <Select
              value={String(draft.correct_answer ?? "TRUE")}
              onValueChange={(v) => setDraft({ ...draft, correct_answer: v })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRUE">True</SelectItem>
                <SelectItem value="FALSE">False</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <QuestionMetadataFields
          idPrefix={existing ? `bank-${existing.id}` : "bank-new"}
          value={{
            topic: draft.topic,
            difficulty: draft.difficulty,
            objective: draft.objective,
            competency: draft.competency,
            tags: draft.tags,
            explanation: draft.explanation,
            status: draft.status,
            pool_tag: draft.pool_tag,
          }}
          knownTopics={knownTopics}
          onChange={(patch) => setDraft({ ...draft, ...(patch as Partial<BankQuestion>) })}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={saving || !String(draft.question ?? "").trim()}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add question"}
          </Button>
          {!existing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
              />
              Keep the form open and reuse this topic and difficulty
            </label>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


/**
 * CSV import.
 *
 * Parsed in the browser only far enough to produce rows; every validation
 * decision is the server's, so the rules cannot drift between the two and a
 * file accepted here cannot be rejected there.
 */
function ImportPanel({
  courseId,
  onClose,
  onImported,
}: {
  courseId: string
  onClose: () => void
  onImported: () => void
}) {
  const [text, setText] = React.useState("")
  const [errors, setErrors] = React.useState<Array<{ row: number; field: string; message: string }>>([])
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const parse = (raw: string): Array<Record<string, string>> => {
    const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    return lines.slice(1).map((line) => {
      // Minimal quoted-field handling: enough for text containing commas,
      // which is the case that silently corrupts a naive split.
      const cells: string[] = []
      let current = ""
      let quoted = false
      for (const ch of line) {
        if (ch === '"') quoted = !quoted
        else if (ch === "," && !quoted) {
          cells.push(current)
          current = ""
        } else current += ch
      }
      cells.push(current)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()))
      return row
    })
  }

  const submit = async () => {
    setBusy(true)
    setErrors([])
    setMessage(null)
    try {
      const rows = parse(text)
      if (rows.length === 0) {
        setMessage("No rows found. The first line must be a header.")
        setBusy(false)
        return
      }
      const result = await questionBankApi.import(courseId, rows)
      setMessage(`Imported ${result.imported} question(s).`)
      onImported()
    } catch (e: any) {
      const rowErrors = e?.data?.errors
      if (Array.isArray(rowErrors)) {
        setErrors(rowErrors)
        setMessage("Nothing was imported. Fix these rows and try again.")
      } else {
        setMessage(e?.message ?? "Import failed.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import questions</CardTitle>
        <CardDescription>
          Paste CSV with a header row. Nothing is imported unless every row is valid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
{`question,question_type,options,correct_answer,topic,difficulty,points
"What is 2+2?",MULTIPLE_CHOICE,"3|4|5",4,Arithmetic,EASY,1`}
        </pre>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-md border bg-background p-2 font-mono text-xs"
          placeholder="Paste CSV here…"
        />

        {message && (
          <Alert variant={errors.length > 0 ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-1 font-medium">Row</th>
                  <th className="px-2 py-1 font-medium">Field</th>
                  <th className="px-2 py-1 font-medium">Problem</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-1 tabular-nums">{e.row}</td>
                    <td className="px-2 py-1 font-mono text-xs">{e.field}</td>
                    <td className="px-2 py-1">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={() => void submit()} disabled={busy || !text.trim()}>
            {busy ? "Validating…" : "Validate and import"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
