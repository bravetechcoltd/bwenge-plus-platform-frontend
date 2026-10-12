"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  ClipboardCheck,
  Clock,
  FileQuestion,
  PlayCircle,
  TrendingUp,
  UserCheck,
} from "lucide-react"
import {
  fetchStudentProgress,
  formatDateTime,
  formatPercent,
  formatSeconds,
  type StudentCourseProgress,
  type StudentAssessmentAttempt,
  type StudentLessonProgress,
  type StudentModuleProgress,
  type StudentProgressPayload,
} from "@/lib/students/institution-student-api"
import {
  EmptyState,
  LoadFailed,
  ProgressRail,
  StudentListSkeleton,
  ToneBadge,
  useStudentResource,
} from "@/components/institution-admin/student-detail/shared"

/**
 * "Learning Progress" (ISTU-001).
 *
 * The third dead menu item, and the one with the most behind it. Each course
 * is shown as its real module/lesson tree with the student's
 * `lesson_progress` rows matched onto it.
 *
 * Lessons with no progress row are listed as not started rather than left
 * out. That is deliberate: an administrator opens this page to find where a
 * student stopped, and a list of only the lessons they touched cannot answer
 * that question.
 */

export default function StudentProgressPage() {
  const { data, isLoading, error, reload } =
    useStudentResource<StudentProgressPayload>(
      (institutionId, studentId, token) =>
        fetchStudentProgress(institutionId, studentId, token)
    )

  if (isLoading) return <StudentListSkeleton rows={2} />
  if (error) return <LoadFailed message={error} onRetry={reload} />

  const courses = data?.courses ?? []
  const attempts = data?.assessment_attempts ?? []

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No progress to show yet"
        description="This student is not enrolled in any of your institution's courses, so there is no lesson activity to report."
      />
    )
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <CourseProgressCard
          key={course.enrollment_id}
          course={course}
          attempts={attempts.filter(
            (attempt) => attempt.course_id === course.course?.id
          )}
        />
      ))}
    </div>
  )
}

function CourseProgressCard({
  course,
  attempts,
}: {
  course: StudentCourseProgress
  attempts: StudentAssessmentAttempt[]
}) {
  // The course an administrator is most likely to be asking about is the one
  // in flight, so anything unfinished opens expanded.
  const [open, setOpen] = useState(!course.completion_date)

  const totals = course.lesson_totals
  const complete = !!course.completion_date

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-foreground">
                {course.course?.title ?? "Course no longer available"}
              </h3>
              {complete ? (
                <ToneBadge tone="success">Completed</ToneBadge>
              ) : (
                <ToneBadge tone="primary">
                  {formatPercent(course.progress_percentage)}
                </ToneBadge>
              )}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {totals.completed} of {totals.total} lessons done ·{" "}
              {totals.started} started · {totals.not_started} not opened ·{" "}
              {formatSeconds(course.time_spent_seconds, "no time tracked")}
            </p>
          </div>

          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>

        <div className="mt-3">
          <ProgressRail
            value={course.progress_percentage}
            tone={complete ? "success" : "primary"}
          />
        </div>
      </button>

      {open ? (
        <CardContent className="space-y-4 border-t border-border/60 bg-muted/20 p-4">
          {course.modules.length === 0 ? (
            <p className="py-2 text-center text-[13px] text-muted-foreground">
              This course has no published modules yet, so there is nothing for
              this student to have progressed through.
            </p>
          ) : (
            course.modules.map((module) => (
              <ModuleBlock
                key={module.id}
                module={module}
                /* A "Draft" tag on every single lesson is noise, so it is
                   shown only where the course publishes some and not others.
                   Nothing in this database sets the flag at all today. */
                markDrafts={courseHasMixedPublishing(course)}
              />
            ))
          )}

          {attempts.length > 0 ? <AttemptsTable attempts={attempts} /> : null}

          <p className="text-[11px] text-muted-foreground">
            Last opened {formatDateTime(course.last_accessed, "never")}
          </p>
        </CardContent>
      ) : null}
    </Card>
  )
}

/**
 * Does this course distinguish published lessons from drafts?
 *
 * Only then is a "Draft" marker informative. Every lesson in the platform
 * currently has `is_published` false, so without this test the label would
 * appear on every row of every course and mean nothing.
 */
function courseHasMixedPublishing(course: StudentCourseProgress): boolean {
  const lessons = course.modules.flatMap((module) => module.lessons)
  if (lessons.length === 0) return false
  const published = lessons.filter((lesson) => lesson.is_published).length
  return published > 0 && published < lessons.length
}

function ModuleBlock({
  module,
  markDrafts,
}: {
  module: StudentModuleProgress
  markDrafts: boolean
}) {
  return (
    <div className="rounded-xl bg-background p-3 ring-1 ring-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {module.title}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {module.completed_lessons} of {module.total_lessons} lessons
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-bold text-foreground">
          {/* null for a module with no lessons — not zero percent. */}
          {formatPercent(module.progress_percentage, "n/a")}
        </span>
      </div>

      {module.total_lessons > 0 ? (
        <>
          <div className="mt-2">
            <ProgressRail
              value={module.progress_percentage ?? 0}
              tone={module.progress_percentage === 100 ? "success" : "primary"}
            />
          </div>

          <ul className="mt-3 space-y-1">
            {module.lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                markDrafts={markDrafts}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          No lessons in this module yet.
        </p>
      )}
    </div>
  )
}

function LessonRow({
  lesson,
  markDrafts,
}: {
  lesson: StudentLessonProgress
  markDrafts: boolean
}) {
  const state = lesson.is_completed
    ? "done"
    : lesson.started
      ? "started"
      : "untouched"

  const Icon =
    state === "done" ? CheckCircle2 : state === "started" ? PlayCircle : Circle

  return (
    <li className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-muted/50">
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          state === "done"
            ? "text-success"
            : state === "started"
              ? "text-primary"
              : "text-muted-foreground/40"
        )}
      />

      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          state === "untouched" ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {lesson.title}
        {lesson.is_required ? null : (
          <span className="ml-1.5 text-[10px] text-muted-foreground">
            (optional)
          </span>
        )}
        {markDrafts && !lesson.is_published ? (
          <span className="ml-1.5 text-[10px] font-medium text-warning-foreground">
            draft
          </span>
        ) : null}
      </span>

      <span className="hidden shrink-0 items-center gap-3 text-[11px] text-muted-foreground sm:flex">
        {state === "started" ? (
          <span className="font-medium text-primary">
            {formatPercent(lesson.completion_percentage)}
          </span>
        ) : null}

        {lesson.quiz_score !== null ? (
          <span className="inline-flex items-center gap-1">
            <FileQuestion className="h-3 w-3" />
            {formatPercent(lesson.quiz_score)}
            {lesson.attempt_count > 1 ? ` · ${lesson.attempt_count} tries` : ""}
          </span>
        ) : null}

        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatSeconds(lesson.time_spent_seconds)}
        </span>

        {/* How a completion was earned. An instructor override is a fact an
            administrator reviewing this record needs to see. */}
        {lesson.completion_source === "INSTRUCTOR" ? (
          <span className="inline-flex items-center gap-1 font-medium text-warning-foreground">
            <UserCheck className="h-3 w-3" />
            Marked by instructor
          </span>
        ) : null}

        {state === "untouched" ? (
          <span className="inline-flex items-center gap-1">
            <CircleDashed className="h-3 w-3" />
            Not opened
          </span>
        ) : null}
      </span>
    </li>
  )
}

function AttemptsTable({
  attempts,
}: {
  attempts: StudentAssessmentAttempt[]
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? attempts : attempts.slice(0, 5)

  const passed = useMemo(
    () => attempts.filter((attempt) => attempt.passed === true).length,
    [attempts]
  )

  return (
    <div className="rounded-xl bg-background p-3 ring-1 ring-border/60">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
        <p className="text-[13px] font-semibold text-foreground">
          Assessment attempts
        </p>
        <span className="text-[11px] text-muted-foreground">
          {passed} of {attempts.length} passed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-1.5 pr-3 font-medium">Assessment</th>
              <th className="pb-1.5 pr-3 font-medium">Attempt</th>
              <th className="pb-1.5 pr-3 font-medium">Score</th>
              <th className="pb-1.5 pr-3 font-medium">Result</th>
              <th className="pb-1.5 pr-3 font-medium">Time</th>
              <th className="pb-1.5 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((attempt) => (
              <tr
                key={attempt.id}
                className="border-b border-border/40 last:border-0"
              >
                <td className="py-2 pr-3 text-foreground">
                  {attempt.assessment_title ?? "Untitled assessment"}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  #{attempt.attempt_number}
                </td>
                <td className="py-2 pr-3 font-medium text-foreground">
                  {/* An ungraded attempt has no percentage. Saying "0%" would
                      read as a failed attempt. */}
                  {formatPercent(attempt.percentage, "—")}
                </td>
                <td className="py-2 pr-3">
                  {attempt.requires_manual_grading && attempt.passed === null ? (
                    <ToneBadge tone="warning">Awaiting marking</ToneBadge>
                  ) : attempt.passed === true ? (
                    <ToneBadge tone="success">Passed</ToneBadge>
                  ) : attempt.passed === false ? (
                    <ToneBadge tone="danger">Failed</ToneBadge>
                  ) : (
                    <ToneBadge tone="muted">
                      {attempt.status ?? "In progress"}
                    </ToneBadge>
                  )}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {formatSeconds(attempt.time_taken_seconds)}
                </td>
                <td className="py-2 text-muted-foreground">
                  {formatDateTime(attempt.submitted_at, "not submitted")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {attempts.length > 5 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 h-7 text-[12px]"
        >
          {expanded
            ? "Show fewer"
            : `Show all ${attempts.length} attempts`}
        </Button>
      ) : null}
    </div>
  )
}
