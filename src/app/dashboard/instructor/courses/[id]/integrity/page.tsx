"use client"

/**
 * Review queue (AS-CAM-001 §7).
 *
 * Attempts worth a look, worst-ordered. The ordering is a work list and
 * nothing more — position in it says nothing about the learner, and the page
 * says so where a reader will see it rather than in a footnote.
 */

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, ArrowLeft, ChevronRight, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import { learningApi } from "@/lib/learning/api"

export default function ReviewQueueRoute() {
  const params = useParams()
  const courseId = params.id as string

  const [rows, setRows] = React.useState<Array<Record<string, any>> | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    learningApi
      .getReviewQueue(courseId)
      .then((d) => {
        if (!cancelled) setRows(d.attempts)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the review queue for this course.")
      })
    return () => {
      cancelled = true
    }
  }, [courseId])

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={`/dashboard/instructor/courses/${courseId}/security`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Assessment security
      </Link>

      <header className="mb-5 mt-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          <ListChecks className="h-5 w-5 text-primary" />
          Attempts to review
        </h1>
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
          Attempts where something was recorded, or where a recording is
          incomplete. This is a work list — the order helps you get through it and
          implies nothing about any learner.
        </p>
      </header>

      {error ? (
        <Card>
          <CardContent className="flex items-start gap-2.5 py-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : rows === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">Nothing to review</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              No attempt in this course has recorded events or an incomplete
              recording.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">
              {rows.length} attempt{rows.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {rows.map((row) => (
              <Link
                key={row.attempt_id}
                href={`/dashboard/instructor/courses/${courseId}/integrity/${row.attempt_id}`}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {row.learner ?? "Unknown learner"}
                    </span>
                    {row.auto_submitted && (
                      <Badge
                        variant="outline"
                        className="h-5 border-warning/40 text-[10px] text-warning"
                      >
                        auto-submitted
                      </Badge>
                    )}
                    {row.latest_decision && (
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {String(row.latest_decision).toLowerCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    {row.assessment_title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    <span className="tabular-nums">{row.violation_count ?? 0}</span> counted
                    event{row.violation_count === 1 ? "" : "s"}
                    {row.recording_status
                      ? ` · recording ${String(row.recording_status).toLowerCase()}`
                      : " · no recording"}
                    {row.review_count > 0 ? ` · reviewed ${row.review_count}×` : ""}
                  </p>
                </div>

                {row.percentage !== null && row.percentage !== undefined && (
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      row.passed ? "text-success" : "text-destructive"
                    )}
                  >
                    {Math.round(Number(row.percentage))}%
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
