"use client"

/**
 * ============================================================================
 * ProctoringPanel — AS-SEC-001 G-2
 * ============================================================================
 *
 * Where course staff set the security posture of each assessment, and see how
 * well its question bank actually protects it.
 *
 * ── Why this screen mattered more than it looks ────────────────────────────
 *
 * Every policy endpoint behind this panel already existed. What did not exist
 * was any way to reach them, so in practice every assessment on the platform
 * carried whatever the platform default happened to be — and for a long time
 * that default was `OFF`, which is how 23 of 33 courses came to be monitored by
 * nothing at all while the system reported itself as secure.
 *
 * A default nobody can change is not a default. It is the only setting.
 *
 * ── What this panel does not do ────────────────────────────────────────────
 *
 * It does not compute a policy. The server owns the cascade
 * (platform → institution → course → module → assessment), the mode defaults
 * and the fairness clamps; this posts a preset name and renders what comes
 * back. A client that disagreed with the server about what STRICT means would
 * be a security defect rather than a display bug, so the disagreement is made
 * impossible by never asking the client to have an opinion.
 */

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Eye,
  ListChecks,
  Loader2,
  Maximize2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  learningApi,
  type PoolReport,
  type ProctoringPresetName,
} from "@/lib/learning/api"

/* ══════════════════════════════════════════════════════════════════════════
   Presets, described in the terms an author thinks in
   ══════════════════════════════════════════════════════════════════════════ */

const PRESETS: Array<{
  value: ProctoringPresetName
  label: string
  detail: string
  ends: boolean
}> = [
  {
    value: "NORMAL",
    label: "Use the default",
    detail: "Inherits the course or platform setting.",
    ends: false,
  },
  {
    value: "MONITOR",
    label: "Observed",
    detail: "Tab switches and focus loss are recorded. No full screen.",
    ends: false,
  },
  {
    value: "PROCTORED",
    label: "Observed + full screen",
    detail: "Runs full screen where the browser allows it. Recommended for module finals.",
    ends: false,
  },
  {
    value: "WARNING",
    label: "Observed, firmer warnings",
    detail: "As observed, with the blocking warning arriving sooner.",
    ends: false,
  },
  {
    value: "STRICT",
    label: "Strict — can auto-submit",
    detail: "Full screen, and the attempt is submitted automatically at 3 recorded events.",
    ends: true,
  },
  {
    value: "CERTIFICATION",
    label: "Certification",
    detail: "Strict at the tightest threshold the fairness rules allow.",
    ends: true,
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   Bank depth
   ══════════════════════════════════════════════════════════════════════════ */

function DepthBadge({ status }: { status: PoolReport["status"] }) {
  const map = {
    TARGET_MET: { label: "Bank at target", cls: "border-success/40 bg-success/10 text-success" },
    PARTIAL: { label: "Bank shallow", cls: "border-warning/40 bg-warning/10 text-warning" },
    TOO_SHALLOW: { label: "Too few to pool", cls: "border-border bg-muted text-muted-foreground" },
    EMPTY: { label: "No questions", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  }[status]

  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", map.cls)}>
      {map.label}
    </span>
  )
}

function AssessmentRow({
  report,
  onChanged,
}: {
  report: PoolReport
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [preset, setPreset] = React.useState<ProctoringPresetName | null>(null)
  const [loadingPreset, setLoadingPreset] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // What the *inherited* posture would be, so the default option can name it
  // rather than saying "platform default" and leaving an author to guess.
  const [inherited, setInherited] = React.useState<ProctoringPresetName | null>(null)

  // ── Camera (AS-CAM-001 §16) ───────────────────────────────────────────
  //
  // Two switches rather than one, because they answer different questions:
  // whether footage is kept at all, and whether a learner without a working
  // camera may still sit the assessment. The second only means anything once
  // the first is on, and the server clamps it away otherwise.
  const [cameraOn, setCameraOn] = React.useState(false)
  const [cameraRequired, setCameraRequired] = React.useState(false)
  const [savingCamera, setSavingCamera] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setLoadingPreset(true)
    learningApi
      .getAssessmentProctoring(report.assessment_id)
      .then((data) => {
        if (cancelled) return
        // `data.preset` describes the *resolved* policy, so an assessment
        // that sets nothing still reports whatever it inherits. Selecting by
        // that would make "Platform default" impossible to choose: an author
        // would pick it, the value would save correctly as "inherit nothing",
        // and the control would come back reading "Observed" — indis-
        // tinguishable from a failed save.
        //
        // What the author set is `stored.assessment`; its absence *is* the
        // default choice.
        const own = data.stored?.assessment ?? null
        setInherited(data.preset)
        setPreset(own ? data.preset : "NORMAL")
        const resolved = data.resolved as any
        setCameraOn(resolved?.camera_mode === "RECORD")
        setCameraRequired(resolved?.camera_required === true)
      })
      .catch(() => {
        if (!cancelled) setPreset(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingPreset(false)
      })
    return () => {
      cancelled = true
    }
  }, [report.assessment_id])

  const save = async (next: ProctoringPresetName) => {
    const previous = preset
    setPreset(next)
    setSaving(true)
    try {
      const saved = await learningApi.setAssessmentProctoring(report.assessment_id, next)
      // The server may clamp what was asked for — auto-submit at 2 resolves to
      // 3, because two warnings must always precede it. Showing what came back
      // rather than what was sent keeps the panel honest.
      //
      // Same rule as on load: an assessment that stores nothing is showing an
      // inherited posture, and the control must say so.
      const own = saved.stored?.assessment ?? null
      setInherited(saved.preset)
      setPreset(own ? saved.preset : "NORMAL")
      toast({
        title: "Security updated",
        description: `${report.title} — ${
          PRESETS.find((p) => p.value === saved.preset)?.label ?? saved.preset
        }.`,
      })
      onChanged()
    } catch {
      setPreset(previous)
      toast({
        title: "Couldn't save",
        description: "The security setting was not changed.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const saveCamera = async (next: { mode?: boolean; required?: boolean }) => {
    const previousOn = cameraOn
    const previousRequired = cameraRequired
    const mode = next.mode ?? cameraOn
    // Turning recording off turns the requirement off with it — the server
    // clamps this too, and letting the switch disagree with the clamp would
    // show an author a setting that is not in force.
    const required = mode ? (next.required ?? cameraRequired) : false

    setCameraOn(mode)
    setCameraRequired(required)
    setSavingCamera(true)
    try {
      const saved = await learningApi.setAssessmentCamera(report.assessment_id, {
        camera_mode: mode ? "RECORD" : "OFF",
        camera_required: required,
      })
      const resolved = saved.resolved as any
      setCameraOn(resolved?.camera_mode === "RECORD")
      setCameraRequired(resolved?.camera_required === true)
      toast({
        title: mode ? "Camera recording on" : "Camera recording off",
        description: report.title,
      })
    } catch {
      setCameraOn(previousOn)
      setCameraRequired(previousRequired)
      toast({
        title: "Couldn't save",
        description: "The camera setting was not changed.",
        variant: "destructive",
      })
    } finally {
      setSavingCamera(false)
    }
  }

  const chosen = PRESETS.find((p) => p.value === preset)

  return (
    <div className="grid gap-3 border-b border-border py-4 last:border-b-0 md:grid-cols-[1fr_260px] md:items-start md:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {report.is_final && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Final
            </Badge>
          )}
          <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground">
          <span className="tabular-nums">
            Bank {report.drawable}
            {report.retired > 0 ? ` (+${report.retired} retired)` : ""} · issues{" "}
            {report.draw_count}
          </span>
          <DepthBadge status={report.status} />
          {report.shortfall > 0 && (
            <span className="tabular-nums">
              {report.shortfall} more question{report.shortfall === 1 ? "" : "s"} for target
            </span>
          )}
        </div>

        {/*
          Stated plainly because it is the number that decides whether pooling
          is doing anything. A bank of 10 issuing 8 produces 45 papers, and a
          leaked full key still covers every one of them — the protection only
          arrives with depth, and an author deserves to know that before
          believing the assessment is protected.
        */}
        {report.status === "PARTIAL" && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            Two learners share about {report.expected_overlap} of {report.draw_count}{" "}
            questions. A leaked answer key still covers this assessment until the
            bank is deeper.
          </p>
        )}
      </div>

      <div className="md:justify-self-end md:text-right">
        {loadingPreset ? (
          <Skeleton className="h-9 w-full md:w-[240px]" />
        ) : (
          <Select
            value={preset ?? "NORMAL"}
            onValueChange={(v) => void save(v as ProctoringPresetName)}
            disabled={saving}
          >
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="flex items-center gap-2">
                    {p.ends ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    ) : p.value === "NORMAL" ? (
                      <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : p.value === "PROCTORED" ? (
                      <Maximize2 className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    )}
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* ── Camera ────────────────────────────────────────────────────── */}
        <div className="mt-2.5 space-y-1.5 md:max-w-[240px]">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[12.5px] text-foreground">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              Record video
            </span>
            <Switch
              checked={cameraOn}
              disabled={savingCamera}
              onCheckedChange={(v) => void saveCamera({ mode: v })}
            />
          </label>

          {cameraOn && (
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-[12.5px] text-muted-foreground">
                Require a working camera
              </span>
              <Switch
                checked={cameraRequired}
                disabled={savingCamera}
                onCheckedChange={(v) => void saveCamera({ required: v })}
              />
            </label>
          )}

          {/*
            Said where the decision is made, not buried in a policy document.
            Requiring a camera excludes a learner by equipment rather than by
            knowledge, and whoever flips this switch should know that is what
            they are choosing.
          */}
          {cameraRequired && (
            <p className="text-[11.5px] leading-relaxed text-warning">
              Learners without a working camera won't be able to start. It never
              ends an attempt already in progress.
            </p>
          )}
          {cameraOn && !cameraRequired && (
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Video only, no sound. A learner without a camera can still sit it.
            </p>
          )}
        </div>

        {chosen && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground md:max-w-[240px]">
            {preset === "NORMAL" && inherited
              ? `Inheriting: ${
                  PRESETS.find((p) => p.value === inherited)?.label ?? inherited
                }.`
              : chosen.detail}
            {saving && <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin" />}
          </p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Panel
   ══════════════════════════════════════════════════════════════════════════ */

export function ProctoringPanel({ courseId }: { courseId: string }) {
  const [data, setData] = React.useState<{
    assessments: PoolReport[]
    totals: { assessments: number; at_target: number; questions_to_write: number }
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(() => {
    setLoading(true)
    learningApi
      .getCoursePools(courseId)
      .then((d) => {
        setData({ assessments: d.assessments, totals: d.totals })
        setError(null)
      })
      .catch(() =>
        setError("Couldn't load this course's assessments. You may not have access to it.")
      )
      .finally(() => setLoading(false))
  }, [courseId])

  React.useEffect(() => load(), [load])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-start gap-2.5 py-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const finals = data.assessments.filter((a) => a.is_final)
  const formative = data.assessments.filter((a) => !a.is_final)

  return (
    <div className="space-y-5">
      {/* ── Where this course stands ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Assessment security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Monitoring records when a learner leaves an assessment. It cannot stop
            them — no website can — so the protection that lasts is a question bank
            deep enough that a leaked answer key stops being worth passing around.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Assessments
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {data.totals.assessments}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Banks at target
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {data.totals.at_target}
                <span className="text-sm font-normal text-muted-foreground">
                  /{data.totals.assessments}
                </span>
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Questions to write
              </p>
              <p
                className={cn(
                  "mt-0.5 text-lg font-semibold tabular-nums",
                  data.totals.questions_to_write > 0 ? "text-warning" : "text-success"
                )}
              >
                {data.totals.questions_to_write}
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/instructor/courses/${courseId}/integrity`}
            className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Review flagged attempts
          </Link>

          {data.totals.questions_to_write === 0 && (
            <p className="flex items-center gap-1.5 text-[13px] text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Every bank is deep enough for its draw.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Finals first: they carry the weight ───────────────────────────── */}
      {finals.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">
              Final assessments
              <span className="ml-2 font-normal text-muted-foreground">
                ({finals.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {finals.map((report) => (
              <AssessmentRow
                key={report.assessment_id}
                report={report}
                onChanged={load}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {formative.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">
              Quizzes and lesson checks
              <span className="ml-2 font-normal text-muted-foreground">
                ({formative.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {formative.map((report) => (
              <AssessmentRow
                key={report.assessment_id}
                report={report}
                onChanged={load}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
