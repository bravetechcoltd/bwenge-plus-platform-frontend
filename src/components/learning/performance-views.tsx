"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronRight } from "lucide-react"
import {
  performanceApi,
  BAND_LABEL,
  type AssessmentAggregate,
  type AttemptRow,
  type CourseAggregate,
  type LearnerCourseRow,
  type PerformanceBand,
  type PerformancePatterns,
} from "@/lib/learning/performance-api"
import {
  BandChip,
  Chip,
  EmptyNote,
  ErrorNote,
  FilterPills,
  MiniBar,
  MobileList,
  MobileRow,
  Pager,
  Panel,
  SearchBox,
  DetailBlock,
  DetailRow,
  DetailSheet,
  SortTh,
  StatStrip,
  Table,
  TableSkeleton,
  Td,
  Th,
  Tr,
  pct,
} from "./performance-ui"

/**
 * ============================================================================
 * Performance views — learner×course, assessments, attempts, patterns
 * ============================================================================
 *
 * The groupings the earlier work was missing (LM-001 §7–§9, §12).
 *
 * Every table here shares the primitives in `performance-ui`: the same toolbar,
 * the same sortable header, the same mobile card fallback, and honest
 * empty/loading/error states. §18 asks for those on every table, and building
 * them once is what stops the fourth table quietly not having them.
 */

// Re-exported so callers that already import from this module keep working and
// there is still only one definition of each.
export { BandChip as BandBadge, MiniBar as Bar, pct, ErrorNote as ErrorState, EmptyNote as EmptyState }

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <TableSkeleton rows={rows} />
}

/** A select sized for the compact toolbars, rather than the page-body default. */
function TinySelect({
  value,
  onValueChange,
  placeholder,
  width = "w-[150px]",
  children,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  width?: string
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`h-8 ${width} text-[12px]`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}

/**
 * The courses the caller may report on, loaded once per view.
 *
 * Every filter built from this can only offer what the server already returned,
 * so a filter cannot be used to probe for a course outside scope.
 */
export function useScopedCourses() {
  const [courses, setCourses] = React.useState<CourseAggregate[]>([])
  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await performanceApi.courses()
        if (!cancelled) setCourses(res.courses)
      } catch {
        // No courses in scope is a valid state; the filters stay empty.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return courses
}

export function CourseFilter({
  courses,
  value,
  onChange,
}: {
  courses: CourseAggregate[]
  value: string
  onChange: (v: string) => void
}) {
  if (courses.length === 0) return null
  return (
    <TinySelect
      value={value || "ALL"}
      onValueChange={(v) => onChange(v === "ALL" ? "" : v)}
      width="w-[170px]"
    >
      <SelectItem value="ALL">All courses</SelectItem>
      {courses.map((c) => (
        <SelectItem key={c.course_id} value={c.course_id}>
          {c.course_title}
        </SelectItem>
      ))}
    </TinySelect>
  )
}

/**
 * §8's instructor filter.
 *
 * The backend has taken `instructor_id` since the first cut; nothing in the
 * interface set it, which made it a parameter only someone reading the source
 * could use. Options come from the distinct instructors on the caller's own
 * scoped courses — so an institution admin sees their institution's teaching
 * staff and an instructor, whose scope is their own courses, sees only
 * themselves and therefore gets no filter at all.
 */
export function InstructorFilter({
  courses,
  value,
  onChange,
}: {
  courses: CourseAggregate[]
  value: string
  onChange: (v: string) => void
}) {
  const instructors = React.useMemo(() => {
    const seen = new Map<string, string>()
    for (const c of courses) {
      if (c.instructor_id && !seen.has(c.instructor_id)) {
        seen.set(c.instructor_id, c.instructor_name || "Unnamed instructor")
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [courses])

  // One instructor is not a choice, it is a label. Rendering a filter that can
  // only ever say the same thing is noise in the toolbar.
  if (instructors.length < 2) return null

  return (
    <TinySelect
      value={value || "ALL"}
      onValueChange={(v) => onChange(v === "ALL" ? "" : v)}
      width="w-[170px]"
    >
      <SelectItem value="ALL">All instructors</SelectItem>
      {instructors.map(([id, name]) => (
        <SelectItem key={id} value={id}>
          {name}
        </SelectItem>
      ))}
    </TinySelect>
  )
}

/**
 * §8's completion filter.
 *
 * COMPLETED and IN_PROGRESS come from the platform's own enrolment status, so
 * this asks the server the same question the enrolment record already answers
 * rather than deciding in the browser what finishing a course means.
 */
export function CompletionFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <TinySelect
      value={value || "ALL"}
      onValueChange={(v) => onChange(v === "ALL" ? "" : v)}
      width="w-[150px]"
    >
      <SelectItem value="ALL">All completion</SelectItem>
      <SelectItem value="COMPLETED">Completed</SelectItem>
      <SelectItem value="IN_PROGRESS">In progress</SelectItem>
    </TinySelect>
  )
}

export function BandFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <TinySelect
      value={value || "ALL"}
      onValueChange={(v) => onChange(v === "ALL" ? "" : v)}
      width="w-[160px]"
    >
      <SelectItem value="ALL">All performance</SelectItem>
      {(Object.keys(BAND_LABEL) as PerformanceBand[]).map((b) => (
        <SelectItem key={b} value={b}>
          {BAND_LABEL[b]}
        </SelectItem>
      ))}
    </TinySelect>
  )
}

/** Client-side sort shared by the tables the API returns whole. */
function sortRows<T>(rows: T[], key: string, dir: "asc" | "desc", get: (r: T, k: string) => any): T[] {
  if (!key) return rows
  const m = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = get(a, key)
    const bv = get(b, key)
    // Nulls last in both directions: an absent mark is not a low one.
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === "string") return av.localeCompare(String(bv)) * m
    return (Number(av) - Number(bv)) * m
  })
}

// ============================================================================
// §7 — Learner × Course
// ============================================================================

export function LearnerCourseTable({
  onOpenLearner,
}: {
  onOpenLearner?: (userId: string) => void
}) {
  const [rows, setRows] = React.useState<LearnerCourseRow[] | null>(null)
  const [total, setTotal] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [band, setBand] = React.useState("")
  const [courseId, setCourseId] = React.useState("")
  const [instructorId, setInstructorId] = React.useState("")
  const [completion, setCompletion] = React.useState("")
  const courses = useScopedCourses()
  const [sort, setSort] = React.useState("")
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc")
  const [page, setPage] = React.useState(0)
  const PAGE = 25

  React.useEffect(() => {
    let cancelled = false
    setRows(null)
    const timer = setTimeout(async () => {
      try {
        const res = await performanceApi.learnerCourses({
          search,
          band: band || undefined,
          course_id: courseId || undefined,
          instructor_id: instructorId || undefined,
          completion: completion || undefined,
          sort: sort || undefined,
          direction,
          limit: PAGE,
          offset: page * PAGE,
        })
        if (!cancelled) {
          setRows(res.rows)
          setTotal(res.total)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load learner performance.")
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, band, courseId, instructorId, completion, sort, direction, page])

  const onSort = (f: string, d: "asc" | "desc") => {
    setSort(f)
    setDirection(d)
    setPage(0)
  }
  const reset = () => setPage(0)
  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <Panel
      title="Learners by course"
      description={`${total} row${total === 1 ? "" : "s"} · one per learner per course`}
      actions={
        <>
          <SearchBox
            value={search}
            onChange={(v) => {
              reset()
              setSearch(v)
            }}
            placeholder="Learner or course…"
          />
          <CourseFilter
            courses={courses}
            value={courseId}
            onChange={(v) => {
              reset()
              setCourseId(v)
            }}
          />
          <InstructorFilter
            courses={courses}
            value={instructorId}
            onChange={(v) => {
              reset()
              setInstructorId(v)
            }}
          />
          <CompletionFilter
            value={completion}
            onChange={(v) => {
              reset()
              setCompletion(v)
            }}
          />
          <BandFilter
            value={band}
            onChange={(v) => {
              reset()
              setBand(v)
            }}
          />
        </>
      }
    >
      {error ? (
        <ErrorNote message={error} />
      ) : !rows ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyNote
          message="No learners match these filters."
          hint="Clear a filter, or check that the course has enrolments."
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <SortTh label="Learner" field="name" sort={sort} direction={direction} onSort={onSort} />
                <SortTh label="Course" field="course" sort={sort} direction={direction} onSort={onSort} />
                <Th align="right">Assessments</Th>
                <SortTh label="Average" field="percentage" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Progress" field="progress" sort={sort} direction={direction} onSort={onSort} />
                <Th>Status</Th>
                <Th>Performance</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr
                  key={`${r.user_id}-${r.course_id}`}
                  onClick={onOpenLearner ? () => onOpenLearner(r.user_id) : undefined}
                >
                  <Td className="max-w-[12rem]">
                    <p className="truncate font-medium">{r.learner_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.institution_name ?? "Independent"}
                    </p>
                  </Td>
                  <Td className="max-w-[11rem] truncate">{r.course_title}</Td>
                  <Td align="right" className="tabular-nums">
                    {r.assessments_passed}/{r.assessments_attempted} of {r.assessments_total}
                  </Td>
                  <Td align="right" className="font-semibold tabular-nums">
                    {pct(r.average_percentage)}
                  </Td>
                  <Td>
                    <MiniBar value={r.progress_percentage} />
                  </Td>
                  <Td>
                    {r.completed ? (
                      <Chip tone="good">Completed</Chip>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">In progress</span>
                    )}
                  </Td>
                  <Td>
                    <BandChip band={r.band} />
                  </Td>
                  <Td align="right">
                    {onOpenLearner && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          {/* Below md a card per row: eight columns do not fit a phone, and
              horizontal scrolling hides the ones that matter. */}
          <MobileList>
            {rows.map((r) => (
              <MobileRow
                key={`${r.user_id}-${r.course_id}`}
                onClick={onOpenLearner ? () => onOpenLearner(r.user_id) : undefined}
                title={r.learner_name}
                subtitle={r.course_title}
                right={<BandChip band={r.band} />}
                meta={
                  <>
                    <span className="font-semibold text-foreground">
                      {pct(r.average_percentage)}
                    </span>
                    <span>{r.assessments_passed} passed</span>
                    <span>{r.progress_percentage}% progress</span>
                    {r.completed && <Chip tone="good">Completed</Chip>}
                  </>
                }
              />
            ))}
          </MobileList>

          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}
    </Panel>
  )
}

// ============================================================================
// §8, §9 — Assessment performance
// ============================================================================

export function AssessmentPerformanceTable() {
  const [rows, setRows] = React.useState<AssessmentAggregate[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [courseId, setCourseId] = React.useState("")
  const [instructorId, setInstructorId] = React.useState("")
  const [open, setOpen] = React.useState<AssessmentAggregate | null>(null)
  const courses = useScopedCourses()
  const [sort, setSort] = React.useState("")
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc")
  const [page, setPage] = React.useState(0)
  const PAGE = 25

  React.useEffect(() => {
    let cancelled = false
    setRows(null)
    const timer = setTimeout(async () => {
      try {
        const res = await performanceApi.assessments({
          search,
          course_id: courseId || undefined,
          instructor_id: instructorId || undefined,
        })
        if (!cancelled) {
          setRows(res.assessments)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load assessment performance.")
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, courseId, instructorId])

  const sorted = React.useMemo(
    () =>
      sortRows(rows ?? [], sort, direction, (r, k) =>
        k === "assessment"
          ? r.assessment_title
          : k === "course"
            ? r.course_title
            : k === "average"
              ? r.average_percentage
              : k === "pass"
                ? r.pass_rate
                : r.learners_attempted
      ),
    [rows, sort, direction]
  )

  const paged = sorted.slice(page * PAGE, page * PAGE + PAGE)
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const onSort = (f: string, d: "asc" | "desc") => {
    setSort(f)
    setDirection(d)
    setPage(0)
  }

  return (
    <Panel
      title="Assessment performance"
      description="Hardest first — a course averaging well can still contain an assessment nobody passes."
      actions={
        <>
          <SearchBox
            value={search}
            onChange={(v) => {
              setPage(0)
              setSearch(v)
            }}
            placeholder="Assessment or course…"
          />
          <CourseFilter
            courses={courses}
            value={courseId}
            onChange={(v) => {
              setPage(0)
              setCourseId(v)
            }}
          />
          <InstructorFilter
            courses={courses}
            value={instructorId}
            onChange={(v) => {
              setPage(0)
              setInstructorId(v)
            }}
          />
        </>
      }
    >
      {error ? (
        <ErrorNote message={error} />
      ) : !rows ? (
        <TableSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyNote message="No assessments in scope." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <SortTh label="Assessment" field="assessment" sort={sort} direction={direction} onSort={onSort} />
                <SortTh label="Course" field="course" sort={sort} direction={direction} onSort={onSort} />
                <SortTh label="Learners" field="learners" sort={sort} direction={direction} onSort={onSort} align="right" />
                <Th align="right">Attempts</Th>
                <SortTh label="Average" field="average" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Pass rate" field="pass" sort={sort} direction={direction} onSort={onSort} align="right" />
                <Th align="right">Pass mark</Th>
                <Th>Performance</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <Tr key={r.assessment_id} onClick={() => setOpen(r)}>
                  <Td className="max-w-[15rem]">
                    <p className="truncate font-medium">{r.assessment_title}</p>
                    {r.awaiting_grading > 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-500">
                        {r.awaiting_grading} awaiting grading
                      </p>
                    )}
                  </Td>
                  <Td className="max-w-[11rem] truncate">{r.course_title}</Td>
                  <Td align="right" className="tabular-nums">
                    {r.learners_attempted}
                  </Td>
                  <Td align="right" className="tabular-nums text-muted-foreground">
                    {r.attempts_total}
                  </Td>
                  <Td align="right" className="font-semibold tabular-nums">
                    {pct(r.average_percentage)}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {r.pass_rate === null ? "—" : `${r.pass_rate}%`}
                  </Td>
                  <Td align="right" className="tabular-nums text-muted-foreground">
                    {r.passing_score}%
                  </Td>
                  <Td>
                    <BandChip band={r.band} />
                  </Td>
                  <Td align="right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpen(r)
                      }}
                    >
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <MobileList>
            {paged.map((r) => (
              <MobileRow
                key={r.assessment_id}
                onClick={() => setOpen(r)}
                title={r.assessment_title}
                subtitle={r.course_title}
                right={<BandChip band={r.band} />}
                meta={
                  <>
                    <span className="font-semibold text-foreground">
                      {pct(r.average_percentage)}
                    </span>
                    <span>
                      {r.pass_rate === null ? "no pass rate" : `${r.pass_rate}% pass`}
                    </span>
                    <span>{r.learners_attempted} learners</span>
                  </>
                }
              />
            ))}
          </MobileList>

          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}

      <AssessmentDetail assessment={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}

/**
 * One assessment, and the attempts behind its average.
 *
 * The assessment table answers "which assessment is failing everyone"; this
 * answers the question that immediately follows — *who*, and by how much. The
 * attempts come from the same scoped endpoint the attempts tab uses, narrowed
 * by `assessment_id`, so an assessment outside the caller's courses returns
 * nothing rather than a drawer full of someone else's learners.
 */
function AssessmentDetail({
  assessment,
  onClose,
}: {
  assessment: AssessmentAggregate | null
  onClose: () => void
}) {
  const [attempts, setAttempts] = React.useState<AttemptRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!assessment) return
    let cancelled = false
    setAttempts(null)
    setError(null)
    void (async () => {
      try {
        const res = await performanceApi.attempts({
          assessment_id: assessment.assessment_id,
          limit: 200,
        })
        if (!cancelled) setAttempts(res.attempts)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load the attempts.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assessment])

  return (
    <DetailSheet
      open={assessment !== null}
      onOpenChange={(o) => !o && onClose()}
      title={assessment?.assessment_title ?? ""}
      subtitle={
        assessment
          ? `${assessment.course_title} · pass mark ${assessment.passing_score}%`
          : undefined
      }
    >
      {assessment && (
        <>
          <StatStrip
            tiles={[
              { label: "average", value: pct(assessment.average_percentage) },
              {
                label: "pass rate",
                value: assessment.pass_rate === null ? "—" : `${assessment.pass_rate}%`,
                tone:
                  assessment.pass_rate !== null && assessment.pass_rate < 50
                    ? "warn"
                    : "default",
              },
              { label: "learners", value: assessment.learners_attempted },
              { label: "attempts", value: assessment.attempts_total },
            ]}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <BandChip band={assessment.band} />
            {assessment.awaiting_grading > 0 && (
              <Chip tone="warn">{assessment.awaiting_grading} awaiting grading</Chip>
            )}
            <Chip>hardest rank #{assessment.hardest_rank}</Chip>
          </div>

          <DetailBlock title={`Attempts${attempts ? ` (${attempts.length})` : ""}`}>
            {error ? (
              <ErrorNote message={error} />
            ) : !attempts ? (
              <TableSkeleton rows={4} />
            ) : attempts.length === 0 ? (
              <EmptyNote message="Nobody has attempted this assessment yet." />
            ) : (
              <div className="max-h-[22rem] overflow-y-auto">
                {attempts.map((a) => (
                  <DetailRow
                    key={a.attempt_id}
                    label={
                      <>
                        {a.learner_name}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          attempt {a.attempt_number}
                          {a.submitted_at &&
                            ` · ${new Date(a.submitted_at).toLocaleDateString()}`}
                        </span>
                      </>
                    }
                    value={
                      a.awaiting_grading ? (
                        <Chip tone="warn">awaiting</Chip>
                      ) : (
                        <span className={a.passed ? "" : "text-destructive"}>
                          {pct(a.percentage)}
                        </span>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </DetailBlock>
        </>
      )}
    </DetailSheet>
  )
}
// ============================================================================
// §7 — Attempt review, graded and ungraded
// ============================================================================

export function AttemptsReview({ onOpen }: { onOpen: (a: AttemptRow) => void }) {
  const [rows, setRows] = React.useState<AttemptRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState("ALL")
  const [courseId, setCourseId] = React.useState("")
  const courses = useScopedCourses()
  const [page, setPage] = React.useState(0)
  const PAGE = 25

  React.useEffect(() => {
    let cancelled = false
    setRows(null)
    const timer = setTimeout(async () => {
      try {
        const res = await performanceApi.attempts({
          search,
          course_id: courseId || undefined,
          ungraded: filter === "UNGRADED" ? "true" : undefined,
        })
        if (!cancelled) {
          setRows(res.attempts)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load attempts.")
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, filter, courseId])

  const paged = (rows ?? []).slice(page * PAGE, page * PAGE + PAGE)
  const pages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE))

  return (
    <Panel
      title="Assessment attempts"
      description="Every submitted attempt in your scope. Marked work can be reopened, not only work still waiting."
      actions={
        <>
          <SearchBox
            value={search}
            onChange={(v) => {
              setPage(0)
              setSearch(v)
            }}
            placeholder="Learner or assessment…"
          />
          <CourseFilter
            courses={courses}
            value={courseId}
            onChange={(v) => {
              setPage(0)
              setCourseId(v)
            }}
          />
          <FilterPills
            value={filter}
            onChange={(v) => {
              setPage(0)
              setFilter(v)
            }}
            options={[
              { value: "ALL", label: "All" },
              { value: "UNGRADED", label: "Awaiting grading" },
            ]}
          />
        </>
      }
    >
      {error ? (
        <ErrorNote message={error} />
      ) : !rows ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyNote
          message={filter === "UNGRADED" ? "Nothing is waiting on you." : "No attempts in scope."}
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Submitted</Th>
                <Th>Learner</Th>
                <Th>Assessment</Th>
                <Th align="right">Attempt</Th>
                <Th align="right">Result</Th>
                <Th>Review</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => (
                <Tr key={a.attempt_id} onClick={() => onOpen(a)}>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}
                  </Td>
                  <Td className="max-w-[11rem] truncate font-medium">{a.learner_name}</Td>
                  <Td className="max-w-[13rem]">
                    <p className="truncate">{a.assessment_title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{a.course_title}</p>
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {a.attempt_number}
                  </Td>
                  <Td align="right" className="font-semibold tabular-nums">
                    {a.awaiting_grading ? "—" : pct(a.percentage)}
                  </Td>
                  <Td>
                    {a.review_status === "REVIEWED" ? (
                      <Chip tone="good">Reviewed</Chip>
                    ) : a.review_status === "PENDING" ? (
                      <Chip tone="warn">Pending</Chip>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Auto</span>
                    )}
                  </Td>
                  <Td align="right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(a)
                      }}
                    >
                      {a.awaiting_grading || a.review_status === "PENDING" ? "Grade" : "Review"}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <MobileList>
            {paged.map((a) => (
              <MobileRow
                key={a.attempt_id}
                onClick={() => onOpen(a)}
                title={a.learner_name}
                subtitle={`${a.assessment_title} · attempt ${a.attempt_number}`}
                right={
                  <span className="text-[13px] font-semibold tabular-nums">
                    {a.awaiting_grading ? "—" : pct(a.percentage)}
                  </span>
                }
                meta={
                  <>
                    <span>
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}
                    </span>
                    {a.awaiting_grading && <Chip tone="warn">Awaiting grading</Chip>}
                  </>
                }
              />
            ))}
          </MobileList>

          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}
    </Panel>
  )
}

// ============================================================================
// §9 — Patterns
// ============================================================================

export function PatternsPanel() {
  const [data, setData] = React.useState<PerformancePatterns | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await performanceApi.patterns()
        if (!cancelled) setData(res)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load patterns.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <ErrorNote message={error} />
  if (!data) return <TableSkeleton rows={4} />

  const maxTrend = Math.max(1, ...data.trend.map((t) => t.average ?? 0))
  const maxDist = Math.max(1, ...data.distribution.map((d) => d.learners))

  return (
    <div className="space-y-3">
      <Panel
        title="Marks over time"
        description="Mean attempt percentage by month — the question a table of learners cannot answer."
      >
        {data.trend.length === 0 ? (
          <EmptyNote message="Not enough history yet." />
        ) : (
          <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
            {data.trend.map((t) => (
              <div key={t.month} className="flex min-w-[2.5rem] flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {t.average === null ? "—" : Math.round(t.average)}
                </span>
                <div
                  className="w-6 rounded-t bg-primary"
                  style={{ height: `${Math.max(4, ((t.average ?? 0) / maxTrend) * 96)}px` }}
                  title={`${t.attempts} attempt(s)`}
                />
                <span className="text-[10px] text-muted-foreground">{t.month.slice(2)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Where marks cluster" description="Learners by course result.">
          {data.distribution.length === 0 ? (
            <EmptyNote message="No marks yet." />
          ) : (
            <div className="space-y-1.5">
              {data.distribution.map((d) => (
                <div key={d.bucket} className="flex items-center gap-2">
                  <span className="w-14 text-[11px] tabular-nums text-muted-foreground">
                    {d.bucket}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary"
                      style={{ width: `${(d.learners / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[11px] tabular-nums">{d.learners}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Performance bands"
          description="How the cohort falls across the classification."
        >
          {Object.keys(data.bands).length === 0 ? (
            <EmptyNote message="No learners in scope." />
          ) : (
            <div className="space-y-1.5">
              {(Object.keys(BAND_LABEL) as PerformanceBand[])
                .filter((b) => (data.bands[b] ?? 0) > 0)
                .map((b) => (
                  <div key={b} className="flex items-center justify-between gap-2">
                    <BandChip band={b} />
                    <span className="text-[12px] tabular-nums">{data.bands[b]}</span>
                  </div>
                ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

/**
 * The six figures §12 names, computed from the same rules as everything else.
 *
 * A strip rather than a grid of cards: six numbers on one line is the shape the
 * rest of the dashboard uses, and it leaves the table above the fold.
 */
export function StandardStatCards({
  overallAverage,
  completed,
  inProgress,
  passed,
  atRisk,
  failed,
}: {
  overallAverage: number | null
  completed: number
  inProgress: number
  passed: number
  atRisk: number
  failed: number
}) {
  return (
    <StatStrip
      tiles={[
        { label: "Overall average", value: pct(overallAverage) },
        { label: "Completed", value: completed },
        { label: "In progress", value: inProgress },
        { label: "Passed", value: passed, tone: passed > 0 ? "good" : "default" },
        { label: "At risk", value: atRisk, tone: atRisk > 0 ? "warn" : "default" },
        { label: "Failed", value: failed, tone: failed > 0 ? "danger" : "default" },
      ]}
    />
  )
}
