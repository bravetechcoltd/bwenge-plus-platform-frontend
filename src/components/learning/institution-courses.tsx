"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { BookOpen, GraduationCap, Globe, Lock, Users } from "lucide-react"
import {
  performanceApi,
  type InstitutionCourseRow,
  type LearnerCourseRow,
} from "@/lib/learning/performance-api"
import {
  BandChip,
  Chip,
  DetailBlock,
  DetailRow,
  DetailSheet,
  EmptyNote,
  ErrorNote,
  FilterPills,
  MiniBar,
  MobileList,
  MobileRow,
  Panel,
  SearchBox,
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
 * Institution courses and their learners (IC-001 §7–§10)
 * ============================================================================
 *
 * The question an institution admin opens the dashboard to ask:
 *
 *   > Which learners are enrolled in which of our courses, and how are they
 *   > doing?
 *
 * Course → Learners → Progress → Marks → Completion, in the order §18 asks
 * for, using the performance module's own primitives rather than a second
 * table system.
 *
 * ── Public does not mean unmanaged ─────────────────────────────────────────
 *
 * §10's distinction is the reason this exists separately from public course
 * discovery. A course being publicly enrollable changes who may *join* it; it
 * changes nothing about who may manage it. Every learner on an institution's
 * course appears here whether they are an institution member or a member of
 * the public who found the MOOC on the home page — the server scopes by course
 * ownership, not by the learner's membership.
 */

const VISIBILITY: Record<
  InstitutionCourseRow["visibility"],
  { label: string; tone: "good" | "muted" | "warn"; icon: React.ReactNode }
> = {
  PUBLIC_MOOC: {
    label: "Public MOOC",
    tone: "good",
    icon: <Globe className="h-3 w-3" />,
  },
  RESTRICTED_SPOC: {
    label: "Restricted SPOC",
    tone: "muted",
    icon: <Lock className="h-3 w-3" />,
  },
  RESTRICTED_MOOC: {
    label: "Members-only MOOC",
    tone: "warn",
    icon: <Lock className="h-3 w-3" />,
  },
}

function VisibilityChip({ visibility }: { visibility: InstitutionCourseRow["visibility"] }) {
  const v = VISIBILITY[visibility]
  return (
    <Chip tone={v.tone}>
      <span className="inline-flex items-center gap-1">
        {v.icon}
        {v.label}
      </span>
    </Chip>
  )
}

function shortDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—"
}

export function InstitutionCourseManagement() {
  const [courses, setCourses] = React.useState<InstitutionCourseRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [visibility, setVisibility] = React.useState("ALL")
  const [sort, setSort] = React.useState("")
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc")
  const [open, setOpen] = React.useState<InstitutionCourseRow | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setCourses(null)
    const timer = setTimeout(async () => {
      try {
        const res = await performanceApi.institutionCourses({ search })
        if (!cancelled) {
          setCourses(res.courses)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load the course catalogue.")
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search])

  const filtered = React.useMemo(
    () =>
      (courses ?? []).filter((c) => visibility === "ALL" || c.visibility === visibility),
    [courses, visibility]
  )

  const sorted = React.useMemo(() => {
    if (!sort) return filtered
    const m = direction === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      const get = (c: InstitutionCourseRow) =>
        sort === "course"
          ? c.course_title
          : sort === "enrolled"
            ? c.learners_enrolled
            : sort === "active"
              ? c.learners_active
              : sort === "average"
                ? c.average_percentage
                : sort === "risk"
                  ? c.learners_at_risk
                  : c.completion_rate
      const av = get(a)
      const bv = get(b)
      // Nulls last: a course with no marks is unmeasured, not worst.
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === "string") return av.localeCompare(String(bv)) * m
      return (Number(av) - Number(bv)) * m
    })
  }, [filtered, sort, direction])

  const onSort = (f: string, d: "asc" | "desc") => {
    setSort(f)
    setDirection(d)
  }

  // §9's overview, from the rows themselves rather than a second query — the
  // numbers on the strip and the numbers in the table cannot disagree.
  const totals = React.useMemo(() => {
    const rows = courses ?? []
    const marked = rows.filter((c) => c.average_percentage !== null)
    return {
      courses: rows.length,
      publicMoocs: rows.filter((c) => c.visibility === "PUBLIC_MOOC").length,
      restricted: rows.filter((c) => c.visibility !== "PUBLIC_MOOC").length,
      enrolled: rows.reduce((a, c) => a + c.learners_enrolled, 0),
      active: rows.reduce((a, c) => a + c.learners_active, 0),
      completed: rows.reduce((a, c) => a + c.learners_completed, 0),
      atRisk: rows.reduce((a, c) => a + c.learners_at_risk, 0),
      average:
        marked.length === 0
          ? null
          : Math.round(
              marked.reduce((a, c) => a + (c.average_percentage ?? 0), 0) / marked.length
            ),
    }
  }, [courses])

  return (
    <div className="space-y-3">
      {courses && courses.length > 0 && (
        <>
          <StatStrip
            tiles={[
              {
                label: "institution courses",
                value: totals.courses,
                icon: <BookOpen className="h-3.5 w-3.5" />,
              },
              { label: "public MOOCs", value: totals.publicMoocs, tone: "good" },
              { label: "restricted", value: totals.restricted },
              {
                label: "enrolled learners",
                value: totals.enrolled,
                icon: <Users className="h-3.5 w-3.5" />,
              },
            ]}
          />
          <StatStrip
            tiles={[
              { label: "active (30 days)", value: totals.active },
              { label: "completed", value: totals.completed, tone: "good" },
              {
                label: "at risk",
                value: totals.atRisk,
                tone: totals.atRisk > 0 ? "warn" : "default",
              },
              {
                label: "average mark",
                value: totals.average === null ? "—" : `${totals.average}%`,
              },
            ]}
          />
        </>
      )}

      <Panel
        title="Institution courses"
        description={
          courses
            ? `${sorted.length} of ${courses.length} course${courses.length === 1 ? "" : "s"} · open one to see its enrolled learners.`
            : "Loading…"
        }
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Course title…" />
            <FilterPills
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: "ALL", label: "All" },
                { value: "PUBLIC_MOOC", label: "Public MOOC" },
                { value: "RESTRICTED_SPOC", label: "SPOC" },
                { value: "RESTRICTED_MOOC", label: "Members-only" },
              ]}
            />
          </>
        }
      >
        {error ? (
          <ErrorNote message={error} />
        ) : !courses ? (
          <TableSkeleton rows={5} />
        ) : sorted.length === 0 ? (
          <EmptyNote
            message={
              courses.length === 0
                ? "This institution has no courses yet."
                : "No courses match these filters."
            }
            hint={courses.length === 0 ? "Courses appear here once they are created." : undefined}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <SortTh label="Course" field="course" sort={sort} direction={direction} onSort={onSort} />
                  <Th>Visibility</Th>
                  <Th>Instructor</Th>
                  <SortTh label="Enrolled" field="enrolled" sort={sort} direction={direction} onSort={onSort} align="right" />
                  <SortTh label="Active" field="active" sort={sort} direction={direction} onSort={onSort} align="right" />
                  <SortTh label="Average" field="average" sort={sort} direction={direction} onSort={onSort} align="right" />
                  <SortTh label="At risk" field="risk" sort={sort} direction={direction} onSort={onSort} align="right" />
                  <SortTh label="Completion" field="completion" sort={sort} direction={direction} onSort={onSort} align="right" />
                  <Th>Performance</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <Tr key={c.course_id} onClick={() => setOpen(c)}>
                    <Td className="max-w-[16rem]">
                      <p className="truncate font-medium">{c.course_title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        pass mark {c.passing_score}%
                        {c.awaiting_grading > 0 && ` · ${c.awaiting_grading} awaiting grading`}
                      </p>
                    </Td>
                    <Td>
                      <VisibilityChip visibility={c.visibility} />
                    </Td>
                    <Td className="max-w-[9rem] truncate text-muted-foreground">
                      {c.instructor_name ?? "Unassigned"}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c.learners_enrolled}
                    </Td>
                    <Td align="right" className="tabular-nums text-muted-foreground">
                      {c.learners_active}
                    </Td>
                    <Td align="right" className="font-semibold tabular-nums">
                      {pct(c.average_percentage)}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c.learners_at_risk > 0 ? (
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {c.learners_at_risk}
                        </span>
                      ) : (
                        "0"
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums text-muted-foreground">
                      {c.completion_rate}%
                    </Td>
                    <Td>
                      <BandChip band={c.band} />
                    </Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpen(c)
                        }}
                      >
                        Learners
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <MobileList>
              {sorted.map((c) => (
                <MobileRow
                  key={c.course_id}
                  onClick={() => setOpen(c)}
                  title={c.course_title}
                  subtitle={c.instructor_name ?? "Unassigned"}
                  right={<BandChip band={c.band} />}
                  meta={
                    <>
                      <VisibilityChip visibility={c.visibility} />
                      <span>{c.learners_enrolled} enrolled</span>
                      <span className="font-semibold text-foreground">
                        {pct(c.average_percentage)}
                      </span>
                    </>
                  }
                />
              ))}
            </MobileList>
          </>
        )}
      </Panel>

      <CourseLearners course={open} onClose={() => setOpen(null)} />
    </div>
  )
}

/**
 * One course's enrolled learners (IC-001 §8).
 *
 * The rows come from the existing learner×course endpoint narrowed to this
 * course — the same records the academic performance module reads, so marks,
 * progress and completion here are the marks, progress and completion there.
 * There is no separate student-management store, which §8 asks for explicitly.
 */
function CourseLearners({
  course,
  onClose,
}: {
  course: InstitutionCourseRow | null
  onClose: () => void
}) {
  const [rows, setRows] = React.useState<LearnerCourseRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [openLearner, setOpenLearner] = React.useState<LearnerCourseRow | null>(null)

  React.useEffect(() => {
    if (!course) return
    let cancelled = false
    setRows(null)
    setError(null)
    void (async () => {
      try {
        const res = await performanceApi.learnerCourses({
          course_id: course.course_id,
          limit: 500,
        })
        if (!cancelled) setRows(res.rows)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load the enrolled learners.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [course])

  return (
    <>
      <DetailSheet
        open={course !== null}
        onOpenChange={(o) => !o && onClose()}
        title={course?.course_title ?? ""}
        subtitle={
          course
            ? `${course.instructor_name ?? "Unassigned"} · pass mark ${course.passing_score}%`
            : undefined
        }
        width="sm:max-w-3xl"
      >
        {course && (
          <>
            <StatStrip
              tiles={[
                { label: "enrolled", value: course.learners_enrolled },
                { label: "active", value: course.learners_active },
                { label: "completed", value: course.learners_completed, tone: "good" },
                {
                  label: "at risk",
                  value: course.learners_at_risk,
                  tone: course.learners_at_risk > 0 ? "warn" : "default",
                },
                { label: "average", value: pct(course.average_percentage) },
              ]}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <VisibilityChip visibility={course.visibility} />
              <BandChip band={course.band} />
              <Chip>{course.status}</Chip>
              {course.certificates_issued > 0 && (
                <Chip tone="good">{course.certificates_issued} certificates</Chip>
              )}
              {course.awaiting_grading > 0 && (
                <Chip tone="warn">{course.awaiting_grading} awaiting grading</Chip>
              )}
            </div>

            {course.visibility === "PUBLIC_MOOC" && (
              <p className="text-[11px] text-muted-foreground">
                This course is open to the public. Learners who are not members of
                your institution can enrol, and they are managed here like any
                other learner on the course.
              </p>
            )}

            <DetailBlock title={`Enrolled learners${rows ? ` (${rows.length})` : ""}`}>
              {error ? (
                <ErrorNote message={error} />
              ) : !rows ? (
                <TableSkeleton rows={5} />
              ) : rows.length === 0 ? (
                <EmptyNote
                  message="Nobody is enrolled on this course yet."
                  hint="Enrolments appear here as soon as a learner joins."
                />
              ) : (
                <>
                  <div className="-mx-2 hidden max-h-[24rem] overflow-auto md:block">
                    <table className="w-full text-[12px]">
                      <thead className="sticky top-0 z-10 bg-card">
                        <tr>
                          <Th>Learner</Th>
                          <Th>Enrolled</Th>
                          <Th align="right">Assessments</Th>
                          <Th align="right">Average</Th>
                          <Th>Progress</Th>
                          <Th>Last active</Th>
                          <Th>Status</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <Tr
                            key={`${r.user_id}-${r.course_id}`}
                            onClick={() => setOpenLearner(r)}
                          >
                            <Td className="max-w-[11rem]">
                              <p className="truncate font-medium">{r.learner_name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {r.institution_name ?? "Independent"}
                              </p>
                            </Td>
                            <Td className="whitespace-nowrap text-muted-foreground">
                              {shortDate(r.enrolled_at)}
                            </Td>
                            <Td align="right" className="tabular-nums">
                              {r.assessments_passed}/{r.assessments_attempted} of{" "}
                              {r.assessments_total}
                            </Td>
                            <Td align="right" className="font-semibold tabular-nums">
                              {pct(r.average_percentage)}
                            </Td>
                            <Td>
                              <MiniBar value={r.progress_percentage} />
                            </Td>
                            <Td className="whitespace-nowrap text-muted-foreground">
                              {shortDate(r.last_activity)}
                            </Td>
                            <Td>
                              {r.completed ? (
                                <Chip tone="good">Completed</Chip>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  In progress
                                </span>
                              )}
                            </Td>
                            <Td>
                              <BandChip band={r.band} />
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <MobileList>
                    {rows.map((r) => (
                      <MobileRow
                        key={`${r.user_id}-${r.course_id}`}
                        onClick={() => setOpenLearner(r)}
                        title={r.learner_name}
                        subtitle={r.institution_name ?? "Independent"}
                        right={<BandChip band={r.band} />}
                        meta={
                          <>
                            <span className="font-semibold text-foreground">
                              {pct(r.average_percentage)}
                            </span>
                            <span>{r.progress_percentage}% progress</span>
                            {r.completed && <Chip tone="good">Completed</Chip>}
                          </>
                        }
                      />
                    ))}
                  </MobileList>
                </>
              )}
            </DetailBlock>
          </>
        )}
      </DetailSheet>

      {/*
        One learner on one course. Everything shown is already loaded, so
        opening it costs no request — and it is the same record the academic
        performance module reads, not a second copy of it.
      */}
      <DetailSheet
        open={openLearner !== null}
        onOpenChange={(o) => !o && setOpenLearner(null)}
        title={openLearner?.learner_name ?? ""}
        subtitle={
          openLearner
            ? `${openLearner.learner_email} · ${openLearner.course_title}`
            : undefined
        }
        width="sm:max-w-md"
      >
        {openLearner && (
          <>
            <StatStrip
              tiles={[
                { label: "average", value: pct(openLearner.average_percentage) },
                { label: "progress", value: `${openLearner.progress_percentage}%` },
                {
                  label: "passed",
                  value: `${openLearner.assessments_passed}/${openLearner.assessments_attempted}`,
                },
              ]}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <BandChip band={openLearner.band} />
              {openLearner.completed ? (
                <Chip tone="good">Completed</Chip>
              ) : (
                <Chip>In progress</Chip>
              )}
              {openLearner.certificate_issued && (
                <Chip tone="good">
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    Certificate issued
                  </span>
                </Chip>
              )}
              {openLearner.awaiting_grading > 0 && (
                <Chip tone="warn">{openLearner.awaiting_grading} awaiting grading</Chip>
              )}
            </div>

            <DetailBlock title="Enrolment">
              <DetailRow label="Enrolled" value={shortDate(openLearner.enrolled_at)} />
              <DetailRow label="Last active" value={shortDate(openLearner.last_activity)} />
              <DetailRow
                label="Status"
                value={openLearner.enrollment_status ?? "—"}
              />
              <DetailRow
                label="Institution"
                value={openLearner.institution_name ?? "Independent"}
              />
            </DetailBlock>

            <DetailBlock title="Assessment">
              <DetailRow
                label="Assessments attempted"
                value={`${openLearner.assessments_attempted} of ${openLearner.assessments_total}`}
              />
              <DetailRow label="Passed" value={openLearner.assessments_passed} />
              <DetailRow label="Pass mark" value={`${openLearner.passing_score}%`} />
              <DetailRow
                label="Average"
                value={pct(openLearner.average_percentage)}
              />
            </DetailBlock>
          </>
        )}
      </DetailSheet>
    </>
  )
}
