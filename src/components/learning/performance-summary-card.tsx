"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight, GraduationCap } from "lucide-react"
import { performanceApi, BAND_LABEL, bandClass } from "@/lib/learning/performance-api"
import type { LearnerSummary } from "@/lib/learning/performance-api"

/**
 * Academic standing, on the learner's existing dashboard (LM-001 §5).
 *
 * §5 asks for performance to live *inside* the dashboard the learner already
 * opens, not only on a page they have to find. This is the compact version of
 * the full record: the headline plus a way through to it, in the same one-line
 * shape as the dashboard's other stat strips.
 *
 * It fails quietly. A learner with no enrolments, or a request that does not
 * come back, should not put an error banner across a dashboard that is
 * otherwise working — the card simply does not render.
 */
export function PerformanceSummaryCard({ href = "/dashboard/learner/performance" }: { href?: string }) {
  const [summary, setSummary] = React.useState<LearnerSummary | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await performanceApi.me()
        if (!cancelled) setSummary(data.summary)
      } catch {
        /* see above: silent on this surface */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <Skeleton className="h-[62px] w-full rounded-xl" />
  if (!summary || summary.courses_enrolled === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Academic standing
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold leading-tight tabular-nums text-card-foreground">
                {summary.overall_percentage === null ? "—" : `${summary.overall_percentage}%`}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${bandClass(summary.band)}`}
              >
                {BAND_LABEL[summary.band]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-0 divide-x divide-border">
          <Metric
            label="completed"
            value={`${summary.courses_completed}/${summary.courses_enrolled}`}
          />
          <Metric
            label="assessments"
            value={`${summary.assessments_passed}/${summary.assessments_attempted}`}
          />
          <Metric label="progress" value={`${summary.average_progress}%`} />
          {summary.courses_at_risk > 0 && (
            <Metric label="need attention" value={String(summary.courses_at_risk)} tone="warn" />
          )}
        </div>

        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
          <Link href={href}>
            Full record
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "warn"
}) {
  return (
    <div className="flex flex-col px-3">
      <span
        className={`text-[13px] font-semibold leading-tight tabular-nums ${
          tone === "warn" ? "text-orange-600 dark:text-orange-400" : "text-card-foreground"
        }`}
      >
        {value}
      </span>
      <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
    </div>
  )
}
