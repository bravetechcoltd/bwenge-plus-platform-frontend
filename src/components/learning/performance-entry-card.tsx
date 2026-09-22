"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, ChevronRight, GraduationCap } from "lucide-react"
import { LearningApiError } from "@/lib/learning/api"
import { performanceApi, type CohortResponse } from "@/lib/learning/performance-api"

/**
 * Learner performance management, on the dashboard itself (LM-001 §8, §16).
 *
 * The performance pages were reachable only from a submenu, which meant an
 * admin opening their dashboard had no sign the module existed. This is the
 * entry point: the four numbers that decide whether it needs opening today,
 * and the way in.
 *
 * Everything shown is the caller's own scope, resolved by the server — an
 * instructor sees their courses, an institution admin their institution, a
 * system admin everyone. Nothing here asks for a scope; there is no id to
 * pass, so there is none to get wrong.
 *
 * The three failure modes are told apart rather than collapsed:
 *
 *   · refused (401/403) — the role has no business here, so the card is not
 *     rendered at all. An error about a page they may not open is noise.
 *   · failed for any other reason — one compact line inside the card, because
 *     silently vanishing would read as "no learners" rather than "not loaded".
 *   · loaded but empty — a sentence saying so, not four zeros pretending to
 *     be a measurement.
 */
export function PerformanceEntryCard({
  href,
  title = "Learner performance",
  description = "Marks, progress and grading across your learners.",
}: {
  href: string
  title?: string
  description?: string
}) {
  const [data, setData] = React.useState<CohortResponse | null>(null)
  const [queue, setQueue] = React.useState<number | null>(null)
  const [refused, setRefused] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // A single page of learners is enough for the headline: `total` is the
        // real count, and the band tallies come from the same rows the page
        // itself would show first.
        const res = await performanceApi.cohort({ limit: 100 })
        if (!cancelled) setData(res)
      } catch (e: any) {
        if (cancelled) return
        if (e instanceof LearningApiError && e.isAccessDenied) {
          // Refused the cohort, so refused the queue too. Asking anyway would
          // be a second request whose answer is already known.
          setRefused(true)
          setLoading(false)
          return
        }
        setError(e?.message ?? "Could not load performance right now.")
      }
      try {
        const q = await performanceApi.gradingQueue()
        if (!cancelled) setQueue(q.queue.length)
      } catch {
        // Grading is a separate permission; its absence is not an error here,
        // and the tile reads "—" rather than claiming nothing is waiting.
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (refused) return null
  if (loading) return <Skeleton className="h-[86px] w-full rounded-xl" />

  const marked = data ? data.learners.filter((l) => l.overall_percentage !== null) : []
  const average =
    marked.length === 0
      ? "—"
      : `${Math.round(marked.reduce((a, l) => a + (l.overall_percentage ?? 0), 0) / marked.length)}%`
  const attention = data
    ? data.learners.filter((l) => l.band === "AT_RISK" || l.band === "FAILED").length
    : 0

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold leading-tight text-card-foreground">
              {title}
            </h3>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[11px]">
          <Link href={href}>
            Open
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5 text-[11px] text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <span>{error}</span>
        </div>
      ) : !data || data.total === 0 ? (
        <p className="px-3.5 py-2.5 text-[11px] text-muted-foreground">
          No learners in scope yet. Marks appear here once someone enrols and
          submits an assessment.
        </p>
      ) : (
        <div className="flex flex-wrap items-center py-1.5 sm:divide-x sm:divide-border">
          <Tile label="learners" value={String(data.total)} />
          <Tile label="average mark" value={average} />
          <Tile
            label="need attention"
            value={String(attention)}
            tone={attention > 0 ? "warn" : undefined}
          />
          <Tile
            label="awaiting grading"
            value={queue === null ? "—" : String(queue)}
            tone={queue ? "warn" : undefined}
          />
        </div>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "warn"
}) {
  return (
    <div className="flex flex-col px-3.5 py-1">
      <span
        className={`text-[15px] font-bold leading-tight tabular-nums ${
          tone === "warn" ? "text-orange-600 dark:text-orange-400" : "text-card-foreground"
        }`}
      >
        {value}
      </span>
      <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
    </div>
  )
}
