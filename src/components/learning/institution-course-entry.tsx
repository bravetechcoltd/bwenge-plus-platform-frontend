"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, ChevronRight, Globe, Lock } from "lucide-react"
import { LearningApiError } from "@/lib/learning/api"
import { performanceApi, type InstitutionCourseRow } from "@/lib/learning/performance-api"

/**
 * Course → learners, on the institution dashboard itself (IC-001 §7, §9).
 *
 * The headline §9 asks for — how many courses, how many are public MOOCs, how
 * many learners are on them — and the way through to managing them.
 *
 * States are told apart the same way the performance entry card does it: a
 * refusal renders nothing, any other failure says so in one line, and an
 * institution with no courses says that rather than showing four zeros.
 */
export function InstitutionCourseEntry({
  href = "/dashboard/institution-admin/course-learners",
}: {
  href?: string
}) {
  const [courses, setCourses] = React.useState<InstitutionCourseRow[] | null>(null)
  const [refused, setRefused] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await performanceApi.institutionCourses()
        if (!cancelled) setCourses(res.courses)
      } catch (e: any) {
        if (cancelled) return
        if (e instanceof LearningApiError && e.isAccessDenied) setRefused(true)
        else setError(e?.message ?? "Could not load your courses right now.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (refused) return null
  if (!courses && !error) return <Skeleton className="h-[86px] w-full rounded-xl" />

  const publicMoocs = (courses ?? []).filter((c) => c.visibility === "PUBLIC_MOOC").length
  const restricted = (courses ?? []).length - publicMoocs
  const enrolled = (courses ?? []).reduce((a, c) => a + c.learners_enrolled, 0)
  const atRisk = (courses ?? []).reduce((a, c) => a + c.learners_at_risk, 0)

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold leading-tight text-card-foreground">
              Course learners
            </h3>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              Who is enrolled in your institution&apos;s courses, and how they are doing.
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
        <p className="px-3.5 py-2.5 text-[11px] text-muted-foreground">{error}</p>
      ) : (courses ?? []).length === 0 ? (
        <p className="px-3.5 py-2.5 text-[11px] text-muted-foreground">
          No courses yet. Once your institution publishes one, its enrolled learners
          appear here.
        </p>
      ) : (
        <div className="flex flex-wrap items-center py-1.5 sm:divide-x sm:divide-border">
          <Tile label="courses" value={String((courses ?? []).length)} />
          <Tile
            label="public MOOCs"
            value={String(publicMoocs)}
            icon={<Globe className="h-3 w-3" />}
          />
          <Tile
            label="restricted"
            value={String(restricted)}
            icon={<Lock className="h-3 w-3" />}
          />
          <Tile label="enrolled learners" value={String(enrolled)} />
          <Tile label="at risk" value={String(atRisk)} tone={atRisk > 0 ? "warn" : undefined} />
        </div>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone?: "warn"
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-1">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div className="flex flex-col">
        <span
          className={`text-[15px] font-bold leading-tight tabular-nums ${
            tone === "warn" ? "text-orange-600 dark:text-orange-400" : "text-card-foreground"
          }`}
        >
          {value}
        </span>
        <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
