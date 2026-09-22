"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, Play, Plus, RefreshCw, Trash2 } from "lucide-react"
import {
  questionBankApi,
  type Blueprint,
  type PoolHealth,
  type PreviewResult,
} from "@/lib/learning/question-bank-api"

/**
 * ============================================================================
 * Pool & Blueprint (QP-001 §12, §13, §18)
 * ============================================================================
 *
 * Three things an author needs before publishing, in the order they need them:
 * what the pool can actually deliver, what the paper should contain, and what
 * the engine will really generate.
 *
 * ── Numbers, not adjectives ────────────────────────────────────────────────
 *
 * Pool health reports possible papers, expected overlap and the number of
 * questions that would change it. It never says "Excellent". A five-question
 * bank labelled Excellent tells an instructor the problem is solved, which is
 * worse than telling them nothing — and the arithmetic behind it is the whole
 * finding of QP-001 §0.
 *
 * ── The preview is the real engine ─────────────────────────────────────────
 *
 * It calls the server, which runs exactly the selection an attempt would run,
 * and persists nothing. So what the author sees is what a learner would get,
 * including the relaxations — which is the point: a blueprint that cannot be
 * satisfied should be discovered here, not by the first learner.
 */

interface Props {
  assessmentId: string
  /** Topics present in the assessment, for the blueprint rows. */
  availableTopics?: string[]
}

const EMPTY: Blueprint = {
  total: 10,
  strata: [],
  difficulty: {},
  types: {},
  relaxation_order: ["types", "difficulty", "topic"],
}

export function PoolBlueprintPanel({ assessmentId, availableTopics = [] }: Props) {
  const [health, setHealth] = React.useState<PoolHealth | null>(null)
  const [blueprint, setBlueprint] = React.useState<Blueprint | null>(null)
  const [preview, setPreview] = React.useState<PreviewResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await questionBankApi.poolHealth(assessmentId)
      setHealth(data)
      setBlueprint(data.blueprint)
    } catch (e: any) {
      setError(e?.message ?? "Could not load pool health.")
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  React.useEffect(() => {
    void load()
  }, [load])

  const save = async (next: Blueprint | null) => {
    setSaving(true)
    setError(null)
    try {
      await questionBankApi.setBlueprint(assessmentId, next)
      setBlueprint(next)
      await load()
    } catch (e: any) {
      setError(e?.message ?? "Could not save the blueprint.")
    } finally {
      setSaving(false)
    }
  }

  const runPreview = async (asRetake: boolean) => {
    setError(null)
    try {
      // A retake preview excludes what the previous preview issued, which is
      // how an author sees whether attempt 2 would actually differ.
      const seen = asRetake && preview ? preview.questions.map((q) => q.id) : []
      setPreview(await questionBankApi.previewGeneration(assessmentId, seen))
    } catch (e: any) {
      setError(e?.message ?? "Could not generate a preview.")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {health && <PoolHealthCard health={health} />}

      <BlueprintEditor
        blueprint={blueprint}
        health={health}
        availableTopics={availableTopics}
        saving={saving}
        onSave={save}
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Preview a generated paper</CardTitle>
              <CardDescription>
                Runs the real selection engine. Nothing is saved and no attempt is created.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void runPreview(false)}>
                <Play className="mr-2 h-4 w-4" />
                Generate
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!preview}
                onClick={() => void runPreview(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Preview a retake
              </Button>
            </div>
          </div>
        </CardHeader>
        {preview && (
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{preview.count} questions</Badge>
              <Badge variant={preview.blueprint_applied ? "default" : "outline"}>
                {preview.blueprint_applied ? "Blueprint applied" : "No blueprint"}
              </Badge>
              {preview.excluded_prior.length > 0 && (
                <Badge variant="outline">
                  {preview.excluded_prior.length} previously seen excluded
                </Badge>
              )}
            </div>

            {preview.relaxations.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-1">
                  <p className="font-medium">
                    The bank could not satisfy everything, so the engine relaxed:
                  </p>
                  <ul className="list-disc pl-5 text-sm">
                    {preview.relaxations.map((r, i) => (
                      <li key={i}>
                        <span className="font-mono text-xs">{r.cell}</span> —{" "}
                        {r.reason === "restored_previously_seen"
                          ? `reused ${r.restored?.length ?? 0} question(s) the learner has already seen`
                          : `needed ${r.required}, had ${r.available}`}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">#</th>
                    <th className="py-2 pr-2 font-medium">Question</th>
                    <th className="py-2 pr-2 font-medium">Topic</th>
                    <th className="py-2 pr-2 font-medium">Difficulty</th>
                    <th className="py-2 text-right font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.questions.map((q, i) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="py-2 pr-2">{q.question}</td>
                      <td className="py-2 pr-2">{q.topic ?? "—"}</td>
                      <td className="py-2 pr-2">{q.difficulty ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums">{q.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

function PoolHealthCard({ health }: { health: PoolHealth }) {
  const overlap = health.expected_retake_overlap
  const unclassified = health.unclassified

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pool health</CardTitle>
        <CardDescription>
          What this pool can actually deliver, before anyone sits it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Eligible questions" value={health.bank_size} />
          <Stat label="Questions per attempt" value={health.draw_size} />
          <Stat
            label="Possible papers"
            value={health.possible_papers.toLocaleString()}
          />
          <Stat label="Expected retake overlap" value={`${overlap}%`} />
        </div>

        {/*
          The honest sentence. Stated as a consequence rather than a rating,
          and always paired with the number of questions that would change it —
          which is the only part an author can act on.
        */}
        {health.bank_size === 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No eligible questions. This assessment cannot generate a paper.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant={overlap >= 70 ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              A retake will repeat about <strong>{overlap}%</strong> of its questions
              {health.probability_identical_paper >= 1 && (
                <>
                  , with a{" "}
                  <strong>{health.probability_identical_paper}%</strong> chance of being
                  identical
                </>
              )}
              .
              {health.add_questions_for_50pct > 0 && (
                <>
                  {" "}
                  Adding <strong>{health.add_questions_for_50pct}</strong> more questions
                  would bring repetition below 50%.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {(unclassified.topic > 0 || unclassified.difficulty > 0) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {unclassified.topic > 0 && <>{unclassified.topic} question(s) have no topic. </>}
              {unclassified.difficulty > 0 && (
                <>{unclassified.difficulty} have no difficulty. </>
              )}
              A blueprint cannot allocate across dimensions that are not set.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Distribution title="Topics" values={health.topics} />
          <Distribution title="Difficulty" values={health.difficulty} />
          <Distribution title="Types" values={health.types} />
        </div>

        {health.feasibility && !health.feasibility.feasible && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <p className="font-medium">The blueprint cannot be satisfied as written:</p>
              <ul className="list-disc pl-5 text-sm">
                {health.feasibility.shortfalls.map((s, i) => (
                  <li key={i}>
                    {s.dimension} “{s.key}” needs {s.required}, has {s.available}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function Distribution({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">None recorded</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map(([k, n]) => (
            <li key={k} className="flex justify-between gap-2">
              <span className="truncate">{k}</span>
              <span className="tabular-nums text-muted-foreground">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BlueprintEditor({
  blueprint,
  health,
  availableTopics,
  saving,
  onSave,
}: {
  blueprint: Blueprint | null
  health: PoolHealth | null
  availableTopics: string[]
  saving: boolean
  onSave: (next: Blueprint | null) => void
}) {
  const [draft, setDraft] = React.useState<Blueprint>(blueprint ?? EMPTY)

  React.useEffect(() => {
    setDraft(blueprint ?? EMPTY)
  }, [blueprint])

  const topics = Array.from(
    new Set([...availableTopics, ...Object.keys(health?.topics ?? {})])
  ).filter((t) => t && t !== "(unclassified)")

  const strataTotal = draft.strata.reduce((a, s) => a + s.count, 0)
  const diffTotal = Object.values(draft.difficulty).reduce((a, b) => a + b, 0)

  // The same rule the server enforces, shown before saving rather than after:
  // a dimension that is used at all must account for exactly the total.
  const problems: string[] = []
  if (strataTotal > 0 && strataTotal !== draft.total) {
    problems.push(`Topic quotas add up to ${strataTotal}, not ${draft.total}.`)
  }
  if (diffTotal > 0 && diffTotal !== draft.total) {
    problems.push(`Difficulty quotas add up to ${diffTotal}, not ${draft.total}.`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Blueprint</CardTitle>
            <CardDescription>
              How many questions come from each topic and difficulty. This is what makes a
              retake comparable rather than merely different.
            </CardDescription>
          </div>
          {blueprint && (
            <Button variant="ghost" size="sm" onClick={() => onSave(null)} disabled={saving}>
              Remove
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-40 space-y-2">
          <Label htmlFor="bp-total">Questions per attempt</Label>
          <Input
            id="bp-total"
            type="number"
            min={1}
            value={draft.total}
            onChange={(e) =>
              setDraft({ ...draft, total: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Topic quotas</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setDraft({
                  ...draft,
                  strata: [...draft.strata, { topic: topics[0] ?? "", count: 1 }],
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add topic
            </Button>
          </div>

          {draft.strata.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No topic quotas — topic coverage will not be guaranteed across retakes.
            </p>
          ) : (
            <div className="space-y-2">
              {draft.strata.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    list="bp-topics"
                    value={s.topic}
                    onChange={(e) => {
                      const next = [...draft.strata]
                      next[i] = { ...next[i], topic: e.target.value }
                      setDraft({ ...draft, strata: next })
                    }}
                    placeholder="Topic"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={s.count}
                    onChange={(e) => {
                      const next = [...draft.strata]
                      next[i] = { ...next[i], count: Math.max(1, Number(e.target.value) || 1) }
                      setDraft({ ...draft, strata: next })
                    }}
                    className="w-24"
                  />
                  <span className="w-24 text-xs text-muted-foreground tabular-nums">
                    {health?.topics?.[s.topic] ?? 0} available
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove topic quota"
                    onClick={() =>
                      setDraft({ ...draft, strata: draft.strata.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <datalist id="bp-topics">
                {topics.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Difficulty quotas</Label>
          <div className="flex flex-wrap gap-3">
            {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
              <div key={d} className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {d.charAt(0) + d.slice(1).toLowerCase()} ({health?.difficulty?.[d] ?? 0}{" "}
                  available)
                </p>
                <Input
                  type="number"
                  min={0}
                  value={draft.difficulty[d] ?? 0}
                  onChange={(e) => {
                    const n = Math.max(0, Number(e.target.value) || 0)
                    const next = { ...draft.difficulty }
                    if (n === 0) delete next[d]
                    else next[d] = n
                    setDraft({ ...draft, difficulty: next })
                  }}
                  className="w-24"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            When the bank cannot satisfy everything, relax in this order
          </Label>
          <div className="flex items-center gap-2 text-sm">
            {draft.relaxation_order.map((d, i) => (
              <React.Fragment key={d}>
                <Badge variant={i === draft.relaxation_order.length - 1 ? "default" : "outline"}>
                  {d === "types" ? "Question type" : d === "difficulty" ? "Difficulty" : "Topic"}
                </Badge>
                {i < draft.relaxation_order.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Topic is relaxed last: a paper missing a topic is a different assessment, not an
            easier one.
          </p>
        </div>

        {problems.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={() => onSave(draft)} disabled={saving || problems.length > 0}>
          {saving ? "Saving…" : "Save blueprint"}
        </Button>
      </CardContent>
    </Card>
  )
}
