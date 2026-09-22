"use client"

/**
 * ============================================================================
 * CourseIntegrityFeed — the instructor's review queue
 * ============================================================================
 *
 * LS-SEC-002 §18.3, finding LS-15.
 *
 * The per-attempt panel answers "what happened in this attempt?". This answers
 * the question that comes first: "is anything happening in my course at all?"
 * Without it a reviewer has to already suspect an attempt before they can look
 * at it, which is not a review process.
 *
 * Two deliberate choices:
 *
 *  · **Severity is the default sort, not recency.** A reviewer with ten minutes
 *    should spend them on the one HIGH event, not the forty INFO ones.
 *  · **Cleared events are hidden but countable.** A queue that re-surfaces
 *    dismissed items stops being used; one that hides them without saying so
 *    looks like the events vanished.
 */

import { useMemo, useState } from "react"
import useSWR from "swr"
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
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { LearningApiError } from "@/lib/learning/api"
import {
  describeIntegrityEvent,
  learningSecurityApi,
  type IntegritySeverity,
} from "@/lib/learning/security-api"

const SEVERITY_TONE: Record<IntegritySeverity, string> = {
  HIGH: "border-destructive/30 bg-destructive/10 text-destructive",
  MEDIUM: "border-warning/30 bg-warning/10 text-warning",
  LOW: "border-border bg-muted text-muted-foreground",
  INFO: "border-border bg-muted/50 text-muted-foreground",
}

const SEVERITY_RANK: Record<IntegritySeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  INFO: 3,
}

export function CourseIntegrityFeed({
  courseId,
  onOpenAttempt,
}: {
  courseId: string
  onOpenAttempt?: (attemptId: string) => void
}) {
  const [severity, setSeverity] = useState<string>("all")

  const { data, error, isLoading } = useSWR(
    courseId ? ["course-integrity", courseId, severity] : null,
    () =>
      learningSecurityApi.getCourseIntegrity(courseId, {
        severity: severity === "all" ? undefined : severity,
        limit: 100,
      }),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const events = useMemo(() => {
    if (!data?.events) return []
    return [...data.events].sort((a, b) => {
      const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      if (bySeverity !== 0) return bySeverity
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [data])

  const counts = useMemo(() => {
    const totals: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 }
    for (const row of data?.summary ?? []) {
      totals[row.severity] = (totals[row.severity] ?? 0) + Number(row.n)
    }
    return totals
  }, [data])

  if (isLoading) {
    return (
      <Card className="shadow-none">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex items-center gap-2.5 p-5 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {(error as LearningApiError)?.message ??
            "Integrity information isn't available for this course."}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Assessment integrity
          </CardTitle>

          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="HIGH">High only</SelectItem>
              <SelectItem value="MEDIUM">Medium and up</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {(["HIGH", "MEDIUM", "LOW", "INFO"] as IntegritySeverity[]).map((level) => (
            <Badge
              key={level}
              variant="outline"
              className={cn("text-[11px] tabular-nums", SEVERITY_TONE[level])}
            >
              {level.toLowerCase()} {counts[level] ?? 0}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {events.length === 0 ? (
          <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Nothing has been recorded on this course.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((event) => (
              <li
                key={event.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm",
                  SEVERITY_TONE[event.severity]
                )}
              >
                <span className="font-medium">
                  {describeIntegrityEvent(event.event_type)}
                </span>

                <span className="text-xs tabular-nums opacity-80">
                  {new Date(event.created_at).toLocaleString()}
                </span>

                {event.counted === false ? (
                  <Badge variant="outline" className="text-[11px]">
                    Not counted
                  </Badge>
                ) : null}

                {event.attempt_id && onOpenAttempt ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 px-2 text-xs"
                    onClick={() => onOpenAttempt(event.attempt_id!)}
                  >
                    Open attempt
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          These are observations, not verdicts. Cleared events are hidden here
          and excluded from every integrity score. Nothing on this page changes
          a grade.
        </p>
      </CardContent>
    </Card>
  )
}
