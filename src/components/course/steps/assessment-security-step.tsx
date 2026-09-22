"use client"

/**
 * ============================================================================
 * AssessmentSecurityStep — the control that did not exist
 * ============================================================================
 *
 * LC-CONS-001 §19.3, closing finding **P-32**.
 *
 * The behaviour-monitoring stack has been built and wired end to end for some
 * time: the browser observer, the batching, the server-side verdict, the
 * auto-submit sweep, the audit trail, the instructor review screens. It has
 * also been completely inert, on every assessment on the platform.
 *
 * The reason was not a bug. `PUT /learning-security/assessments/:id/proctoring`
 * existed and worked; **nothing in the product ever called it**. There was no
 * screen, anywhere, where an instructor could turn assessment security on. So
 * `proctoring_policy` was NULL on 25 of 25 assessments, every one resolved to
 * `mode: OFF`, and not a single behaviour event had ever been recorded.
 *
 * This component is that screen.
 *
 * ── Three deliberate design decisions ───────────────────────────────────────
 *
 * **Presets first, fields behind a disclosure.** Finding P-35: thirteen raw
 * policy fields is not an interface an instructor will use, and an unused
 * control is indistinguishable from a missing one.
 *
 * **A live preview of what the learner will be told.** `LS-SEC-002 §21.3`
 * requires monitoring to be disclosed before a learner starts. Showing the
 * author the exact sentence makes that requirement survive contact with
 * reality, instead of being a line in a plan.
 *
 * **Resolved is shown next to stored.** The platform clamps values to keep its
 * fairness guarantees true — ask for auto-submit at 2 and you get 3, because
 * a learner must have two warnings first. A form that silently disagreed with
 * the system is how an author stops trusting it.
 */

import * as React from "react"
import { Loader2, Info, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  learningSecurityApi,
  PROCTORING_PRESET_INFO,
  type AssessmentProctoringView,
  type ProctoringPreset,
  type ResolvedProctoringPolicy,
} from "@/lib/learning/security-api"

const PRESET_ORDER: ProctoringPreset[] = [
  "NORMAL",
  "MONITOR",
  "WARNING",
  "STRICT",
  "CERTIFICATION",
]

export type SecurityScope = "assessment" | "course" | "module"

export interface AssessmentSecurityStepProps {
  /**
   * The thing being configured. `assessment` reads its current policy and
   * shows the resolved result; `course` and `module` set a default that every
   * assessment below them inherits.
   */
  scope: SecurityScope
  targetId: string
  /** Shown in the heading, e.g. the assessment or course title. */
  targetName?: string
  onSaved?: (preset: ProctoringPreset) => void
}

export function AssessmentSecurityStep({
  scope,
  targetId,
  targetName,
  onSaved,
}: AssessmentSecurityStepProps) {
  const { toast } = useToast()

  const [view, setView] = React.useState<AssessmentProctoringView | null>(null)
  const [preset, setPreset] = React.useState<ProctoringPreset>("NORMAL")
  const [loading, setLoading] = React.useState(scope === "assessment")
  const [saving, setSaving] = React.useState(false)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  // Only the assessment scope has a resolved view to read; course and module
  // scopes set an inherited default and have nothing of their own to show yet.
  React.useEffect(() => {
    if (scope !== "assessment" || !targetId) return

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    learningSecurityApi
      .getAssessmentProctoring(targetId)
      .then((data) => {
        if (cancelled) return
        setView(data)
        setPreset(data.preset)
      })
      .catch((error: any) => {
        if (cancelled) return
        setLoadError(
          error?.message || "Could not load the current security settings."
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scope, targetId])

  const save = async () => {
    setSaving(true)
    try {
      if (scope === "assessment") {
        const result = await learningSecurityApi.setAssessmentProctoring(
          targetId,
          preset
        )
        setView((current) =>
          current ? { ...current, resolved: result.resolved, preset } : current
        )
      } else if (scope === "course") {
        await learningSecurityApi.setCourseProctoring(targetId, preset)
      } else {
        await learningSecurityApi.setModuleProctoring(targetId, preset)
      }

      toast({
        title: "Security settings saved",
        description:
          preset === "NORMAL"
            ? "This assessment is not monitored."
            : `${PROCTORING_PRESET_INFO[preset].label} applies from the next attempt.`,
      })
      onSaved?.(preset)
    } catch (error: any) {
      toast({
        title: "Could not save",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const info = PROCTORING_PRESET_INFO[preset]
  const dirty = scope !== "assessment" || (view ? view.preset !== preset : false)

  if (loading) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading security settings…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Assessment security
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {scope === "assessment"
            ? `How ${targetName || "this assessment"} is monitored while a learner is taking it.`
            : `The default for every assessment in this ${scope}. Individual assessments can override it.`}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {loadError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </p>
        )}

        {/* ── Presets ───────────────────────────────────────────────────── */}
        <fieldset>
          <legend className="sr-only">Security preset</legend>
          <div className="space-y-2">
            {PRESET_ORDER.map((option) => {
              const optionInfo = PROCTORING_PRESET_INFO[option]
              const selected = preset === option

              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name={`proctoring-preset-${targetId}`}
                    value={option}
                    checked={selected}
                    onChange={() => setPreset(option)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {optionInfo.label}
                      </span>
                      {option === "NORMAL" && (
                        <Badge variant="secondary" className="font-normal">
                          Default
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                      {optionInfo.description}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground/80">
                      Best for: {optionInfo.suitedTo}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* ── What the learner will be told (§21.3) ─────────────────────── */}
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            What the learner is told before starting
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {info.learnerNotice ?? (
              <span className="text-muted-foreground">
                Nothing — this assessment is not monitored, so there is nothing
                to disclose.
              </span>
            )}
          </p>
        </div>

        {/* ── Resolved (§13.4 clamps) ───────────────────────────────────── */}
        {scope === "assessment" && view && (
          <div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((open) => !open)}
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              aria-expanded={advancedOpen}
            >
              {advancedOpen ? "Hide" : "Show"} what this resolves to
            </button>

            {advancedOpen && (
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Settings inherit from the institution, then the course, then
                  the module, then this assessment. The platform then clamps a
                  few values so a learner always gets at least two warnings
                  before anything is submitted automatically — so what applies
                  can differ from what was asked for.
                </p>
                <ResolvedTable resolved={view.resolved} />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" onClick={() => void save()} disabled={saving || !dirty}>
            {saving && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Save security settings
          </Button>
          {!dirty && scope === "assessment" && (
            <span className="text-xs text-muted-foreground">
              No unsaved changes.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ResolvedTable({ resolved }: { resolved: ResolvedProctoringPolicy }) {
  const rows: Array<[string, string]> = [
    ["Mode", resolved.mode],
    ["Full screen required", resolved.require_fullscreen ? "Yes" : "No"],
    ["Watch page visibility", resolved.monitor_visibility ? "Yes" : "No"],
    ["Watch window focus", resolved.monitor_focus ? "Yes" : "No"],
    ["Detect a second tab", resolved.detect_second_tab ? "Yes" : "No"],
    ["Block copy and paste", resolved.block_copy_paste ? "Yes" : "No"],
    ["Block printing", resolved.block_print ? "Yes" : "No"],
    ["Ignore absences under", `${resolved.grace_period_ms} ms`],
    ["First warning at", `${resolved.warn_at} event(s)`],
    ["Final warning at", `${resolved.final_warn_at} event(s)`],
    [
      "Submit automatically at",
      resolved.auto_submit_at === null
        ? "Never"
        : `${resolved.auto_submit_at} event(s)`,
    ],
    ["Late submission grace", `${resolved.late_grace_seconds}s`],
  ]

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value], index) => (
            <tr
              key={label}
              className={cn(index % 2 === 1 && "bg-muted/40")}
            >
              <th
                scope="row"
                className="px-3 py-2 text-left font-normal text-muted-foreground"
              >
                {label}
              </th>
              <td className="px-3 py-2 text-right font-medium text-foreground">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
