"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Award, GraduationCap, Printer, TrendingUp, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GradingQueue, AttemptGraderSheet } from "./mark-grading"
import {
  LearnerCourseTable,
  AssessmentPerformanceTable,
  AttemptsReview,
  PatternsPanel,
  StandardStatCards,
  CourseFilter,
  InstructorFilter,
  BandFilter,
  CompletionFilter,
  useScopedCourses,
} from "./performance-views"
import {
  BandChip,
  Chip,
  EmptyNote,
  ErrorNote,
  MiniBar,
  MobileList,
  MobileRow,
  Pager,
  Panel,
  DetailBlock,
  DetailRow,
  DetailSheet,
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
import type {
  AssessmentAggregate,
  AttemptRow,
  LearnerCourseRow,
} from "@/lib/learning/performance-api"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  performanceApi,
  type CohortResponse,
  type CourseAggregate,
  type CoursePerformance,
  type InstitutionAggregate,
  type LearnerRecord,
} from "@/lib/learning/performance-api"

/**
 * ============================================================================
 * Academic performance (LM-001)
 * ============================================================================
 *
 * Two components, four dashboards. `MyPerformance` is the learner's own
 * record; `CohortPerformance` is the same data seen by whoever is allowed to
 * see it — instructor, institution admin or system admin — because the server
 * decides the scope and the shape does not change with it.
 *
 * Everything shown is computed by the backend from real attempts. Nothing here
 * calculates a mark, and nothing displays a placeholder when data is missing:
 * an assessment nobody has graded reads "awaiting grading", not 0%.
 *
 * Presentation comes from `performance-ui`, which is the dashboard's existing
 * language rather than a second one invented for this module.
 */

/** The tab strip, sized to match the dashboard's filter pills. */
function TabBar({ children }: { children: React.ReactNode }) {
  return (
    <TabsList className="h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-lg bg-muted/60 p-0.5">
      {children}
    </TabsList>
  )
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-md px-2.5 py-1 text-[12px] font-medium data-[state=active]:bg-background"
    >
      {children}
    </TabsTrigger>
  )
}

// ============================================================================
// Learner's own record
// ============================================================================

export function MyPerformance() {
  const [record, setRecord] = React.useState<LearnerRecord | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await performanceApi.me()
        if (!cancelled) setRecord(data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load your performance.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <TableSkeleton rows={6} />
  if (error) return <ErrorNote message={error} />
  if (!record) return null

  return <LearnerRecordView record={record} />
}

/** The same record view whether a learner opened it or staff did. */
export function LearnerRecordView({
  record,
  compact,
}: {
  record: LearnerRecord
  /** Inside a drawer the identity is already in the header, so it is dropped. */
  compact?: boolean
}) {
  const { summary, courses, transcript } = record
  const [showAll, setShowAll] = React.useState(false)
  // §6: a course opens into its own assessments rather than a separate page.
  const [openCourse, setOpenCourse] = React.useState<CoursePerformance | null>(null)

  // Grouped by course, oldest first inside each, so the sequence reads as a
  // progression rather than a pile of dated rows (§13).
  const rows = React.useMemo(() => {
    const base = showAll ? transcript : transcript.filter((t) => t.is_best)
    return [...base].sort((a, b) => {
      const byCourse = a.course_title.localeCompare(b.course_title)
      if (byCourse !== 0) return byCourse
      const at = a.date ? new Date(a.date).getTime() : 0
      const bt = b.date ? new Date(b.date).getTime() : 0
      if (at !== bt) return at - bt
      return a.attempt_number - b.attempt_number
    })
  }, [transcript, showAll])

  return (
    <div className="space-y-3">
      {/*
        The academic record header (§14): who this is, where they belong, and
        what they have earned. Printed with the tables below it, this is the
        transcript — which is why it names the institution explicitly, and
        says "Independent learner" rather than leaving a blank that reads as
        missing data.
      */}
      {!compact && (
        <div className="rounded-xl border border-border bg-card print:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="rounded-lg bg-primary/10 p-2">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Academic record
                </p>
                <h2 className="truncate text-[15px] font-semibold leading-tight text-card-foreground">
                  {summary.name}
                </h2>
                <p className="truncate text-[11px] leading-tight text-muted-foreground">
                  {summary.email}
                  {" · "}
                  {summary.institution_name ?? "Independent learner"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {summary.certificates > 0 && (
                <Chip tone="good">
                  {summary.certificates} certificate{summary.certificates === 1 ? "" : "s"}
                </Chip>
              )}
              <BandChip band={summary.band} />
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px] print:hidden"
                onClick={() => window.print()}
              >
                <Printer className="mr-1 h-3.5 w-3.5" />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/*
        The six figures §12 names. At risk and failed are counted separately
        rather than lumped: one is recoverable and one is not, and an
        instructor acts differently on each.
      */}
      <StandardStatCards
        overallAverage={summary.overall_percentage}
        completed={summary.courses_completed}
        inProgress={Math.max(0, summary.courses_enrolled - summary.courses_completed)}
        passed={summary.courses_passed}
        atRisk={courses.filter((c) => c.band === "AT_RISK").length}
        failed={courses.filter((c) => c.band === "FAILED").length}
      />

      <StatStrip
        tiles={[
          {
            label: "assessments passed",
            value: `${summary.assessments_passed}/${summary.assessments_attempted}`,
          },
          {
            label: "courses to strengthen",
            value: courses.filter(
              (c) => c.band === "NEEDS_IMPROVEMENT" || c.band === "SATISFACTORY"
            ).length,
          },
          { label: "average progress", value: `${summary.average_progress}%` },
          { label: "certificates", value: summary.certificates },
        ]}
      />

      <Panel
        title="Course performance"
        description="Marks are the mean of the best attempt in each assessment."
        actions={<BandChip band={summary.band} />}
      >
        {courses.length === 0 ? (
          <EmptyNote message="No enrolments yet." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th align="right">Assessments</Th>
                  <Th align="right">Marks</Th>
                  <Th align="right">%</Th>
                  <Th>Progress</Th>
                  <Th>Status</Th>
                  <Th>Performance</Th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <Tr key={c.course_id} onClick={() => setOpenCourse(c)}>
                    <Td className="max-w-[17rem]">
                      <p className="truncate font-medium">{c.course_title}</p>
                      {c.awaiting_grading > 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-500">
                          {c.awaiting_grading} awaiting grading
                        </p>
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c.assessments_attempted}/{c.assessments_total}
                    </Td>
                    <Td align="right" className="tabular-nums text-muted-foreground">
                      {c.marks_available > 0 ? `${c.marks_earned}/${c.marks_available}` : "—"}
                    </Td>
                    <Td align="right" className="font-semibold tabular-nums">
                      {pct(c.percentage)}
                    </Td>
                    <Td>
                      <MiniBar value={c.progress_percentage} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        {c.completed ? (
                          <Chip tone="good">Completed</Chip>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">In progress</span>
                        )}
                        {c.certificate_issued && (
                          <Award
                            className="h-3.5 w-3.5 text-emerald-600"
                            aria-label="Certificate issued"
                          />
                        )}
                      </div>
                    </Td>
                    <Td>
                      <BandChip band={c.band} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <MobileList>
              {courses.map((c) => (
                <MobileRow
                  key={c.course_id}
                  onClick={() => setOpenCourse(c)}
                  title={c.course_title}
                  subtitle={`${c.assessments_attempted} of ${c.assessments_total} assessments`}
                  right={<BandChip band={c.band} />}
                  meta={
                    <>
                      <span className="font-semibold text-foreground">{pct(c.percentage)}</span>
                      <span>{c.progress_percentage}% progress</span>
                      {c.completed && <Chip tone="good">Completed</Chip>}
                    </>
                  }
                />
              ))}
            </MobileList>
          </>
        )}
      </Panel>

      <Panel
        title="Academic record"
        description={
          showAll
            ? "Every attempt, grouped by course."
            : "The attempt that counts for each assessment."
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Counting attempts only" : `All ${transcript.length} attempts`}
          </Button>
        }
      >
        {rows.length === 0 ? (
          <EmptyNote message="No assessment attempts yet." />
        ) : (
          <>
            {/*
              §13 asks for the *movement* of marks, so rows are grouped by
              course and read oldest-first inside each: a flat newest-first
              list shows the same facts without showing a trajectory.
            */}
            <div className="max-h-[26rem] overflow-auto">
              <Table>
                <thead className="sticky top-0 z-10 bg-card">
                  <tr>
                    <Th>Date</Th>
                    <Th>Course</Th>
                    <Th>Assessment</Th>
                    <Th align="right">Attempt</Th>
                    <Th align="right">%</Th>
                    <Th align="right">Pass mark</Th>
                    <Th>Result</Th>
                    <Th>Review</Th>
                    <Th>Feedback</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t, i) => (
                    <Tr key={`${t.assessment_id}-${t.attempt_number}-${i}`}>
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                      </Td>
                      <Td className="max-w-[11rem] truncate">{t.course_title}</Td>
                      <Td className="max-w-[13rem] truncate">{t.assessment_title}</Td>
                      <Td align="right" className="tabular-nums">
                        {t.attempt_number}
                      </Td>
                      <Td align="right" className="font-semibold tabular-nums">
                        {t.awaiting_grading ? "—" : pct(t.percentage)}
                      </Td>
                      <Td align="right" className="tabular-nums text-muted-foreground">
                        {t.passing_score}%
                      </Td>
                      <Td>
                        {t.awaiting_grading ? (
                          <Chip tone="warn">Awaiting grading</Chip>
                        ) : t.passed ? (
                          <Chip tone="good">Passed</Chip>
                        ) : (
                          <Chip tone="bad">Not passed</Chip>
                        )}
                      </Td>
                      <Td>
                        {/* Whether a human looked at it — §6 asks for the
                            instructor/manual review status explicitly. */}
                        {t.review_status === "REVIEWED" ? (
                          <Chip tone="good">Reviewed</Chip>
                        ) : t.review_status === "PENDING" ? (
                          <Chip tone="warn">Pending</Chip>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Auto</span>
                        )}
                      </Td>
                      <Td className="max-w-[14rem]">
                        {t.feedback ? (
                          <span className="line-clamp-2 text-[11px]">{t.feedback}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <MobileList>
              {rows.map((t, i) => (
                <MobileRow
                  key={`${t.assessment_id}-${t.attempt_number}-${i}`}
                  title={t.assessment_title}
                  subtitle={`${t.course_title} · attempt ${t.attempt_number}`}
                  right={
                    <span className="text-[13px] font-semibold tabular-nums">
                      {t.awaiting_grading ? "—" : pct(t.percentage)}
                    </span>
                  }
                  meta={
                    <>
                      <span>{t.date ? new Date(t.date).toLocaleDateString() : "—"}</span>
                      {t.awaiting_grading ? (
                        <Chip tone="warn">Awaiting grading</Chip>
                      ) : t.passed ? (
                        <Chip tone="good">Passed</Chip>
                      ) : (
                        <Chip tone="bad">Not passed</Chip>
                      )}
                    </>
                  }
                />
              ))}
            </MobileList>
          </>
        )}
      </Panel>

      {/*
        §6: Course → Assessments → Individual Results, in a drawer rather than
        another page. The rows come from the transcript already loaded, so
        opening it costs no request — and it shows every attempt for that
        course, including the ones that no longer count, because "how did I
        get here" is the question a learner opens this to ask.
      */}
      <Sheet open={openCourse !== null} onOpenChange={(o) => !o && setOpenCourse(null)}>
        <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-xl">
          {openCourse && (
            <>
              <SheetHeader className="space-y-1">
                <SheetTitle className="pr-6 text-left text-[15px] leading-tight">
                  {openCourse.course_title}
                </SheetTitle>
                <SheetDescription className="text-left text-[11px]">
                  {openCourse.assessments_attempted} of {openCourse.assessments_total}{" "}
                  assessments attempted · pass mark {openCourse.passing_score}%
                </SheetDescription>
              </SheetHeader>

              <div className="mt-3">
                <StatStrip
                  tiles={[
                    { label: "result", value: pct(openCourse.percentage) },
                    { label: "progress", value: `${openCourse.progress_percentage}%` },
                    { label: "passed", value: openCourse.assessments_passed },
                    {
                      label: "certificate",
                      value: openCourse.certificate_issued ? "Issued" : "—",
                    },
                  ]}
                />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <BandChip band={openCourse.band} />
                {openCourse.completed && <Chip tone="good">Completed</Chip>}
                {openCourse.awaiting_grading > 0 && (
                  <Chip tone="warn">{openCourse.awaiting_grading} awaiting grading</Chip>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {transcript.filter((t) => t.course_id === openCourse.course_id).length === 0 ? (
                  <EmptyNote message="No attempts on this course yet." />
                ) : (
                  transcript
                    .filter((t) => t.course_id === openCourse.course_id)
                    .map((t, i) => (
                      <div
                        key={`${t.assessment_id}-${t.attempt_number}-${i}`}
                        className={`rounded-lg border border-border p-2.5 ${
                          t.is_best ? "" : "opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium leading-tight">
                              {t.assessment_title}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                              Attempt {t.attempt_number}
                              {t.date && ` · ${new Date(t.date).toLocaleDateString()}`}
                              {t.is_best && " · counts towards the mark"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold tabular-nums">
                              {t.awaiting_grading ? "—" : pct(t.percentage)}
                            </span>
                            {t.awaiting_grading ? (
                              <Chip tone="warn">Awaiting grading</Chip>
                            ) : t.passed ? (
                              <Chip tone="good">Passed</Chip>
                            ) : (
                              <Chip tone="bad">Not passed</Chip>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>Pass mark {t.passing_score}%</span>
                          <span>
                            {t.review_status === "REVIEWED"
                              ? "Reviewed by an instructor"
                              : t.review_status === "PENDING"
                                ? "Waiting on review"
                                : "Auto-graded"}
                          </span>
                        </div>

                        {t.feedback && (
                          <div className="mt-1.5 rounded-md bg-muted/60 p-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Feedback
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap text-[12px]">{t.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ============================================================================
// Staff view — instructor, institution admin, system admin
// ============================================================================

/**
 * The staff view: learners, courses, and — for a system admin — institutions.
 *
 * Tabs rather than eight pages, because they are eight groupings of the same
 * marks and an instructor moves between them constantly. Which tabs exist is
 * decided by what the server returns, not by a role check in the browser: the
 * institutions tab appears only if the institutions call succeeds.
 */
export function CohortPerformance() {
  const [tab, setTab] = React.useState("learners")
  const [institutionsAvailable, setInstitutionsAvailable] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await performanceApi.institutions()
        if (!cancelled) setInstitutionsAvailable(true)
      } catch {
        // A 403 here is the correct answer for everyone except a system
        // admin, so it hides the tab rather than showing an error.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // A learner or an attempt opens over the page rather than replacing it
  // (§18): filters and scroll position survive looking at one row.
  const [openLearner, setOpenLearner] = React.useState<LearnerRecord | null>(null)
  const [loadingLearner, setLoadingLearner] = React.useState(false)
  const [openAttempt, setOpenAttempt] = React.useState<AttemptRow | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const openLearnerById = React.useCallback(async (userId: string) => {
    setLoadingLearner(true)
    try {
      setOpenLearner(await performanceApi.learner(userId))
    } catch {
      // A refusal here is the server enforcing scope; the drawer simply does
      // not open rather than showing a shell of someone else's record.
    } finally {
      setLoadingLearner(false)
    }
  }, [])

  return (
    <>
      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabBar>
          <Tab value="learners">Learners</Tab>
          <Tab value="by-course">By course</Tab>
          <Tab value="courses">Courses</Tab>
          <Tab value="assessments">Assessments</Tab>
          <Tab value="attempts">Attempts</Tab>
          <Tab value="grading">Grading</Tab>
          <Tab value="patterns">Patterns</Tab>
          {institutionsAvailable && <Tab value="institutions">Institutions</Tab>}
        </TabBar>

        <TabsContent value="learners" className="mt-3">
          <LearnerCohort onOpenLearner={openLearnerById} />
        </TabsContent>
        <TabsContent value="by-course" className="mt-3">
          <LearnerCourseTable onOpenLearner={openLearnerById} />
        </TabsContent>
        <TabsContent value="courses" className="mt-3">
          <CoursePerformanceTable />
        </TabsContent>
        <TabsContent value="assessments" className="mt-3">
          <AssessmentPerformanceTable />
        </TabsContent>
        <TabsContent value="attempts" className="mt-3">
          <AttemptsReview key={refreshKey} onOpen={setOpenAttempt} />
        </TabsContent>
        <TabsContent value="grading" className="mt-3">
          <GradingQueue key={refreshKey} />
        </TabsContent>
        <TabsContent value="patterns" className="mt-3">
          <PatternsPanel />
        </TabsContent>
        {institutionsAvailable && (
          <TabsContent value="institutions" className="mt-3">
            <InstitutionComparison />
          </TabsContent>
        )}
      </Tabs>

      <Sheet open={openLearner !== null} onOpenChange={(o) => !o && setOpenLearner(null)}>
        <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-3xl">
          {openLearner && (
            <>
              <SheetHeader className="space-y-1">
                <SheetTitle className="pr-6 text-left text-[15px] leading-tight">
                  {openLearner.summary.name}
                </SheetTitle>
                <SheetDescription className="text-left text-[11px]">
                  {openLearner.summary.email}
                  {" · "}
                  {openLearner.summary.institution_name ?? "Independent learner"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-3">
                <LearnerRecordView record={openLearner} compact />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AttemptGraderSheet
        attempt={
          openAttempt
            ? {
                attempt_id: openAttempt.attempt_id,
                user_id: openAttempt.user_id,
                assessment_id: openAttempt.assessment_id,
                assessment_title: openAttempt.assessment_title,
                course_title: openAttempt.course_title,
                attempt_number: openAttempt.attempt_number,
                learner_name: openAttempt.learner_name,
              }
            : null
        }
        open={openAttempt !== null}
        onOpenChange={(o) => !o && setOpenAttempt(null)}
        onGraded={() => {
          setOpenAttempt(null)
          // Marks changed, so the lists behind the drawer are stale.
          setRefreshKey((k) => k + 1)
        }}
      />

      {loadingLearner && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] shadow-lg">
          Opening record…
        </div>
      )}
    </>
  )
}

function LearnerCohort({ onOpenLearner }: { onOpenLearner: (id: string) => void }) {
  const [data, setData] = React.useState<CohortResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [band, setBand] = React.useState("")
  const [courseId, setCourseId] = React.useState("")
  const [instructorId, setInstructorId] = React.useState("")
  const [completion, setCompletion] = React.useState("")
  const [sort, setSort] = React.useState("")
  const [page, setPage] = React.useState(0)
  // Populated from the caller's own scoped courses, so the filters can only
  // ever offer what they are already allowed to see.
  const courses = useScopedCourses()

  const PAGE = 25

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    // Debounced so typing does not fire a query per keystroke.
    const timer = setTimeout(async () => {
      try {
        const res = await performanceApi.cohort({
          search,
          band: band || undefined,
          course_id: courseId || undefined,
          instructor_id: instructorId || undefined,
          completion: completion || undefined,
          sort: sort || undefined,
          // Ascending for a performance sort: the person who most needs
          // attention should be the first row, not the last page.
          direction: sort === "percentage" || sort === "progress" ? "asc" : "desc",
          limit: PAGE,
          offset: page * PAGE,
        })
        if (!cancelled) {
          setData(res)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load learners.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, band, courseId, instructorId, completion, sort, page])

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1
  const reset = () => setPage(0)

  const scopeLine = data
    ? data.scope.kind === "GLOBAL"
      ? "everyone, including learners with no institution"
      : data.scope.kind === "INSTITUTION"
        ? "your institution"
        : `your ${data.scope.course_count ?? 0} course(s)`
    : "Loading…"

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={error} />}

      {/*
        §12: the headline before the table. Struggling and high-performing are
        counted here rather than left for the reader to scan for — "who needs
        attention" is the question this page exists to answer.
      */}
      {data && data.learners.length > 0 && (
        <StatStrip
          tiles={[
            { label: "learners", value: data.total, icon: <Users className="h-3.5 w-3.5" /> },
            {
              label: "average of those marked",
              value: (() => {
                const marked = data.learners.filter((l) => l.overall_percentage !== null)
                if (marked.length === 0) return "—"
                const mean =
                  marked.reduce((a, l) => a + (l.overall_percentage ?? 0), 0) / marked.length
                return `${Math.round(mean)}%`
              })(),
              icon: <TrendingUp className="h-3.5 w-3.5" />,
            },
            {
              label: "course completions",
              value: data.learners.reduce((a, l) => a + l.courses_completed, 0),
            },
            {
              label: "high performing",
              value: data.learners.filter((l) => l.band === "EXCELLENT" || l.band === "STRONG")
                .length,
              tone: "good",
            },
            {
              label: "at risk or failed",
              value: data.learners.filter((l) => l.band === "AT_RISK" || l.band === "FAILED")
                .length,
              tone: "warn",
            },
            {
              label: "not started",
              value: data.learners.filter((l) => l.band === "NOT_STARTED").length,
            },
          ]}
        />
      )}

      <Panel
        title="Learner performance"
        description={
          data ? `${data.total} learner${data.total === 1 ? "" : "s"} · ${scopeLine}` : "Loading…"
        }
        actions={
          <>
            <SearchBox
              value={search}
              onChange={(v) => {
                reset()
                setSearch(v)
              }}
              placeholder="Name or email…"
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
            <Select value={sort || "NONE"} onValueChange={(v) => setSort(v === "NONE" ? "" : v)}>
              <SelectTrigger className="h-8 w-[150px] text-[12px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Default order</SelectItem>
                <SelectItem value="percentage">Lowest average first</SelectItem>
                <SelectItem value="progress">Least progress first</SelectItem>
                <SelectItem value="courses">Most courses first</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} />
        ) : !data || data.learners.length === 0 ? (
          <EmptyNote
            message="No learners in scope."
            hint="Filters may be excluding everyone, or nobody is enrolled yet."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Learner</Th>
                  <Th>Institution</Th>
                  <Th align="right">Courses</Th>
                  <Th align="right">Assessments</Th>
                  <Th align="right">Average</Th>
                  <Th>Progress</Th>
                  <Th>Performance</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.learners.map((l) => (
                  <Tr key={l.user_id} onClick={() => onOpenLearner(l.user_id)}>
                    <Td className="max-w-[15rem]">
                      <p className="truncate font-medium">{l.name || l.email}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{l.email}</p>
                    </Td>
                    <Td className="max-w-[11rem]">
                      {l.institution_name ? (
                        <span className="block truncate text-[11px]">{l.institution_name}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Independent</span>
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {l.courses_completed}/{l.courses_enrolled}
                    </Td>
                    <Td align="right" className="tabular-nums text-muted-foreground">
                      {l.assessments_passed}/{l.assessments_attempted}
                    </Td>
                    <Td align="right" className="font-semibold tabular-nums">
                      {pct(l.overall_percentage)}
                    </Td>
                    <Td>
                      <MiniBar value={l.average_progress} />
                    </Td>
                    <Td>
                      <BandChip band={l.band} />
                    </Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenLearner(l.user_id)
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
              {data.learners.map((l) => (
                <MobileRow
                  key={l.user_id}
                  onClick={() => onOpenLearner(l.user_id)}
                  title={l.name || l.email}
                  subtitle={l.institution_name ?? "Independent"}
                  right={<BandChip band={l.band} />}
                  meta={
                    <>
                      <span className="font-semibold text-foreground">
                        {pct(l.overall_percentage)}
                      </span>
                      <span>
                        {l.courses_completed}/{l.courses_enrolled} courses
                      </span>
                      <span>{l.average_progress}% progress</span>
                    </>
                  }
                />
              ))}
            </MobileList>

            <Pager page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </Panel>
    </div>
  )
}

/**
 * Courses, aggregated across the learners the caller may see.
 *
 * The instructor's other question: not who is struggling, but which course
 * is. Pass rate is null rather than 0% where nobody has attempted yet —
 * a course with no marks has no pass rate, and showing 0% would read as
 * everyone failing.
 *
 * Search, band and sort are applied here rather than in SQL: the endpoint
 * returns the caller's whole scope in one response (capped at 300 courses),
 * so filtering in the browser costs nothing and avoids a request per keystroke.
 * The instructor filter is the exception — it goes to the server, because it
 * changes which courses are in scope at all.
 */
function CoursePerformanceTable() {
  const [courses, setCourses] = React.useState<CourseAggregate[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [instructorId, setInstructorId] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [band, setBand] = React.useState("")
  const [sort, setSort] = React.useState("")
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc")
  const [page, setPage] = React.useState(0)
  const [open, setOpen] = React.useState<CourseAggregate | null>(null)
  const PAGE = 25

  // The unfiltered list, so narrowing to one instructor does not also empty
  // the filter that did the narrowing.
  const allCourses = useScopedCourses()

  React.useEffect(() => {
    let cancelled = false
    setCourses(null)
    void (async () => {
      try {
        const res = await performanceApi.courses({
          instructor_id: instructorId || undefined,
        })
        if (!cancelled) {
          setCourses(res.courses)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load course performance.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [instructorId])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (courses ?? []).filter((c) => {
      if (band && c.band !== band) return false
      if (!q) return true
      return (
        c.course_title.toLowerCase().includes(q) ||
        (c.instructor_name ?? "").toLowerCase().includes(q)
      )
    })
  }, [courses, search, band])

  const sorted = React.useMemo(() => {
    if (!sort) return filtered
    const m = direction === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      const get = (c: CourseAggregate) =>
        sort === "course"
          ? c.course_title
          : sort === "instructor"
            ? (c.instructor_name ?? "")
            : sort === "learners"
              ? c.learners_enrolled
              : sort === "average"
                ? c.average_percentage
                : sort === "pass"
                  ? c.pass_rate
                  : sort === "risk"
                    ? c.learners_at_risk
                    : c.completion_rate
      const av = get(a)
      const bv = get(b)
      // Nulls last in both directions: a course with no marks is not the worst
      // course, it is an unmeasured one.
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === "string") return av.localeCompare(String(bv)) * m
      return (Number(av) - Number(bv)) * m
    })
  }, [filtered, sort, direction])

  const paged = sorted.slice(page * PAGE, page * PAGE + PAGE)
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const onSort = (f: string, d: "asc" | "desc") => {
    setSort(f)
    setDirection(d)
    setPage(0)
  }
  const reset = () => setPage(0)

  return (
    <Panel
      title="Course performance"
      description={
        courses
          ? `${sorted.length} of ${courses.length} course${courses.length === 1 ? "" : "s"} in scope, averaged across enrolled learners.`
          : "Loading…"
      }
      actions={
        <>
          <SearchBox
            value={search}
            onChange={(v) => {
              reset()
              setSearch(v)
            }}
            placeholder="Course or instructor…"
          />
          <InstructorFilter
            courses={allCourses}
            value={instructorId}
            onChange={(v) => {
              reset()
              setInstructorId(v)
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
      ) : !courses ? (
        <TableSkeleton rows={5} />
      ) : sorted.length === 0 ? (
        <EmptyNote
          message={courses.length === 0 ? "No courses in scope." : "No courses match these filters."}
          hint={courses.length === 0 ? undefined : "Clear the search or the performance filter."}
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <SortTh label="Course" field="course" sort={sort} direction={direction} onSort={onSort} />
                <SortTh label="Instructor" field="instructor" sort={sort} direction={direction} onSort={onSort} />
                <SortTh label="Learners" field="learners" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Average" field="average" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Pass rate" field="pass" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="At risk" field="risk" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Completion" field="completion" sort={sort} direction={direction} onSort={onSort} align="right" />
                <Th>Performance</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <Tr key={c.course_id} onClick={() => setOpen(c)}>
                  <Td className="max-w-[17rem]">
                    <p className="truncate font-medium">{c.course_title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      pass mark {c.passing_score}%
                      {c.awaiting_grading > 0 && ` · ${c.awaiting_grading} awaiting grading`}
                    </p>
                  </Td>
                  <Td className="max-w-[10rem] truncate text-muted-foreground">
                    {c.instructor_name ?? "Unassigned"}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {c.learners_attempted}/{c.learners_enrolled}
                  </Td>
                  <Td align="right" className="font-semibold tabular-nums">
                    {pct(c.average_percentage)}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {c.pass_rate === null ? "—" : `${c.pass_rate}%`}
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
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <MobileList>
            {paged.map((c) => (
              <MobileRow
                key={c.course_id}
                onClick={() => setOpen(c)}
                title={c.course_title}
                subtitle={c.instructor_name ?? "Unassigned"}
                right={<BandChip band={c.band} />}
                meta={
                  <>
                    <span className="font-semibold text-foreground">
                      {pct(c.average_percentage)}
                    </span>
                    <span>
                      {c.learners_attempted}/{c.learners_enrolled} learners
                    </span>
                    {c.learners_at_risk > 0 && (
                      <Chip tone="warn">{c.learners_at_risk} at risk</Chip>
                    )}
                  </>
                }
              />
            ))}
          </MobileList>

          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}

      <CourseDetail course={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}

/**
 * One course: its assessments, and the learners taking it.
 *
 * Both halves come from endpoints that already exist, narrowed by `course_id`.
 * The assessments answer "which part of this course is hard" and the learners
 * answer "who is behind in it" — the two follow-ups to a low course average,
 * without leaving the table that raised the question.
 */
function CourseDetail({
  course,
  onClose,
}: {
  course: CourseAggregate | null
  onClose: () => void
}) {
  const [assessments, setAssessments] = React.useState<AssessmentAggregate[] | null>(null)
  const [learners, setLearners] = React.useState<LearnerCourseRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!course) return
    let cancelled = false
    setAssessments(null)
    setLearners(null)
    setError(null)
    void (async () => {
      try {
        const [a, l] = await Promise.all([
          performanceApi.assessments({ course_id: course.course_id }),
          performanceApi.learnerCourses({ course_id: course.course_id, limit: 200 }),
        ])
        if (!cancelled) {
          setAssessments(a.assessments)
          setLearners(l.rows)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load the course detail.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [course])

  return (
    <DetailSheet
      open={course !== null}
      onOpenChange={(o) => !o && onClose()}
      title={course?.course_title ?? ""}
      subtitle={
        course
          ? `${course.instructor_name ?? "Unassigned"} · pass mark ${course.passing_score}%`
          : undefined
      }
    >
      {course && (
        <>
          <StatStrip
            tiles={[
              { label: "average", value: pct(course.average_percentage) },
              {
                label: "pass rate",
                value: course.pass_rate === null ? "—" : `${course.pass_rate}%`,
              },
              { label: "enrolled", value: course.learners_enrolled },
              {
                label: "at risk",
                value: course.learners_at_risk,
                tone: course.learners_at_risk > 0 ? "warn" : "default",
              },
              { label: "completion", value: `${course.completion_rate}%` },
            ]}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <BandChip band={course.band} />
            {course.awaiting_grading > 0 && (
              <Chip tone="warn">{course.awaiting_grading} awaiting grading</Chip>
            )}
            {course.institution_name && <Chip>{course.institution_name}</Chip>}
          </div>

          {error && <ErrorNote message={error} />}

          <DetailBlock title={`Assessments${assessments ? ` (${assessments.length})` : ""}`}>
            {!assessments ? (
              <TableSkeleton rows={3} />
            ) : assessments.length === 0 ? (
              <EmptyNote message="This course has no assessments yet." />
            ) : (
              <div className="max-h-[14rem] overflow-y-auto">
                {assessments.map((a) => (
                  <DetailRow
                    key={a.assessment_id}
                    label={
                      <>
                        {a.assessment_title}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          {a.learners_attempted} learner
                          {a.learners_attempted === 1 ? "" : "s"}
                        </span>
                      </>
                    }
                    value={pct(a.average_percentage)}
                  />
                ))}
              </div>
            )}
          </DetailBlock>

          <DetailBlock title={`Learners${learners ? ` (${learners.length})` : ""}`}>
            {!learners ? (
              <TableSkeleton rows={3} />
            ) : learners.length === 0 ? (
              <EmptyNote message="Nobody is enrolled on this course yet." />
            ) : (
              <div className="max-h-[18rem] overflow-y-auto">
                {learners.map((l) => (
                  <DetailRow
                    key={`${l.user_id}-${l.course_id}`}
                    label={
                      <>
                        {l.learner_name}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          {l.progress_percentage}% progress
                          {l.completed && " · completed"}
                        </span>
                      </>
                    }
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        {pct(l.average_percentage)}
                        <BandChip band={l.band} />
                      </span>
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

/**
 * Institutions side by side, system admin only.
 *
 * Learners with no institution are a row of their own, labelled as such.
 * They are the majority on this platform, and folding them into an
 * institution to tidy the table would be inventing a relationship.
 */
function InstitutionComparison() {
  const [rows, setRows] = React.useState<InstitutionAggregate[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [sort, setSort] = React.useState("")
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc")
  const [open, setOpen] = React.useState<InstitutionAggregate | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await performanceApi.institutions()
        if (!cancelled) setRows(res.institutions)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load institutions.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = React.useMemo(() => {
    if (!sort) return rows ?? []
    const m = direction === "asc" ? 1 : -1
    return [...(rows ?? [])].sort((a, b) => {
      const get = (r: InstitutionAggregate) =>
        sort === "institution"
          ? r.institution_name
          : sort === "learners"
            ? r.learners
            : sort === "courses"
              ? r.courses
              : sort === "average"
                ? r.average_percentage
                : sort === "pass"
                  ? r.pass_rate
                  : r.completion_rate
      const av = get(a)
      const bv = get(b)
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === "string") return av.localeCompare(String(bv)) * m
      return (Number(av) - Number(bv)) * m
    })
  }, [rows, sort, direction])

  const onSort = (f: string, d: "asc" | "desc") => {
    setSort(f)
    setDirection(d)
  }

  return (
    <Panel
      title="Institution comparison"
      description="Every institution, and learners who belong to none."
    >
      {error ? (
        <ErrorNote message={error} />
      ) : !rows ? (
        <TableSkeleton rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyNote message="No institutions yet." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <SortTh label="Institution" field="institution" sort={sort} direction={direction} onSort={onSort} />
                <SortTh label="Learners" field="learners" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Courses" field="courses" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Average" field="average" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Pass rate" field="pass" sort={sort} direction={direction} onSort={onSort} align="right" />
                <SortTh label="Completion" field="completion" sort={sort} direction={direction} onSort={onSort} align="right" />
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Tr key={r.institution_id ?? "independent"} onClick={() => setOpen(r)}>
                  <Td>
                    <span className="font-medium">{r.institution_name}</span>
                    {r.institution_id === null && (
                      <span className="ml-1.5">
                        <Chip>no institution</Chip>
                      </span>
                    )}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {r.learners}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {r.courses}
                  </Td>
                  <Td align="right" className="font-semibold tabular-nums">
                    {pct(r.average_percentage)}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {r.pass_rate === null ? "—" : `${r.pass_rate}%`}
                  </Td>
                  <Td align="right" className="tabular-nums text-muted-foreground">
                    {r.completion_rate}%
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
            {sorted.map((r) => (
              <MobileRow
                key={r.institution_id ?? "independent"}
                onClick={() => setOpen(r)}
                title={r.institution_name}
                subtitle={`${r.learners} learners · ${r.courses} courses`}
                right={
                  <span className="text-[13px] font-semibold tabular-nums">
                    {pct(r.average_percentage)}
                  </span>
                }
                meta={
                  <>
                    <span>{r.pass_rate === null ? "no pass rate" : `${r.pass_rate}% pass`}</span>
                    <span>{r.completion_rate}% completion</span>
                  </>
                }
              />
            ))}
          </MobileList>
        </>
      )}

      <InstitutionDetail institution={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}

/**
 * One institution's courses.
 *
 * Independent learners have no institution to scope a course list to, so that
 * row explains itself instead of showing an empty table that would read as a
 * loading failure.
 */
function InstitutionDetail({
  institution,
  onClose,
}: {
  institution: InstitutionAggregate | null
  onClose: () => void
}) {
  const [courses, setCourses] = React.useState<CourseAggregate[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!institution || institution.institution_id === null) return
    let cancelled = false
    setCourses(null)
    setError(null)
    void (async () => {
      try {
        const res = await performanceApi.courses({
          institution_id: institution.institution_id!,
        })
        if (!cancelled) setCourses(res.courses)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load the institution's courses.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [institution])

  return (
    <DetailSheet
      open={institution !== null}
      onOpenChange={(o) => !o && onClose()}
      title={institution?.institution_name ?? ""}
      subtitle={
        institution
          ? institution.institution_id === null
            ? "Learners who belong to no institution"
            : `${institution.learners} learners · ${institution.courses} courses`
          : undefined
      }
    >
      {institution && (
        <>
          <StatStrip
            tiles={[
              { label: "learners", value: institution.learners },
              { label: "courses", value: institution.courses },
              { label: "average", value: pct(institution.average_percentage) },
              {
                label: "pass rate",
                value:
                  institution.pass_rate === null ? "—" : `${institution.pass_rate}%`,
              },
              { label: "completion", value: `${institution.completion_rate}%` },
            ]}
          />

          {institution.institution_id === null ? (
            <p className="text-[12px] text-muted-foreground">
              These learners are not attached to any institution, so there is no
              institution course list to show. Their marks are counted in every
              global figure — they are a real category, not missing data.
            </p>
          ) : (
            <DetailBlock title={`Courses${courses ? ` (${courses.length})` : ""}`}>
              {error ? (
                <ErrorNote message={error} />
              ) : !courses ? (
                <TableSkeleton rows={4} />
              ) : courses.length === 0 ? (
                <EmptyNote message="This institution has no courses yet." />
              ) : (
                <div className="max-h-[22rem] overflow-y-auto">
                  {courses.map((c) => (
                    <DetailRow
                      key={c.course_id}
                      label={
                        <>
                          {c.course_title}
                          <span className="ml-1.5 text-[11px] text-muted-foreground">
                            {c.learners_enrolled} enrolled
                            {c.learners_at_risk > 0 && ` · ${c.learners_at_risk} at risk`}
                          </span>
                        </>
                      }
                      value={
                        <span className="inline-flex items-center gap-1.5">
                          {pct(c.average_percentage)}
                          <BandChip band={c.band} />
                        </span>
                      }
                    />
                  ))}
                </div>
              )}
            </DetailBlock>
          )}
        </>
      )}
    </DetailSheet>
  )
}
