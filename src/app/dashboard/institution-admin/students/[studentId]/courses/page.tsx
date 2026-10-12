"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Search,
  Target,
  User as UserIcon,
} from "lucide-react"
import {
  enrollmentState,
  fetchStudentCourses,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPercent,
  type StudentEnrollment,
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
 * "View Courses" (ISTU-001).
 *
 * The menu item that used to carry a live enrolment count and do nothing when
 * clicked. Every row here is one `enrollments` record joined to its course:
 * where the student is, how far in, when they last touched it, and whether a
 * certificate came out of it.
 *
 * `completed_lessons / total_lessons` is shown rather than the percentage
 * alone because the percentage is stored on the enrolment and the lesson
 * counts are counted live — seeing both is how an administrator notices when
 * the stored figure has gone stale.
 */

type Filter = "all" | "in-progress" | "completed" | "not-started"

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in-progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "not-started", label: "Not started" },
]

export default function StudentCoursesPage() {
  const { data, isLoading, error, reload } = useStudentResource<
    StudentEnrollment[]
  >((institutionId, studentId, token) =>
    fetchStudentCourses(institutionId, studentId, token)
  )

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const enrollments = data ?? []

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return enrollments.filter((enrollment) => {
      const state = enrollmentState(enrollment)

      const matchesFilter =
        filter === "all" ||
        (filter === "completed" && state.label === "Completed") ||
        (filter === "in-progress" && state.label === "In progress") ||
        (filter === "not-started" && state.label === "Not started")

      if (!matchesFilter) return false
      if (!term) return true

      return [
        enrollment.course?.title,
        enrollment.course?.category,
        enrollment.course?.instructor_name,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    })
  }, [enrollments, filter, search])

  if (isLoading) return <StudentListSkeleton rows={3} />
  if (error) return <LoadFailed message={error} onRetry={reload} />

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Not enrolled in any of your courses yet"
        description="When this student is enrolled in a course belonging to your institution — individually or through a bulk enrolment — it will appear here with their progress."
        action={
          <Button size="sm" asChild>
            <Link href="/dashboard/institution-admin/enrollment/bulk">
              Enroll students
            </Link>
          </Button>
        }
      />
    )
  }

  const counts = {
    completed: enrollments.filter(
      (e) => enrollmentState(e).label === "Completed"
    ).length,
    totalMinutes: enrollments.reduce((sum, e) => sum + e.time_spent_minutes, 0),
  }

  return (
    <div className="space-y-4">
      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search course, category or instructor"
            className="h-9 pl-9 text-[13px]"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-all",
                filter === option.key
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {visible.length} of {enrollments.length} course
        {enrollments.length === 1 ? "" : "s"} · {counts.completed} completed ·{" "}
        {formatDuration(counts.totalMinutes, "no time tracked")} on task
      </p>

      {/* ── Rows ──────────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matches that"
          description="No course on this student's record matches your search or filter."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((enrollment) => (
            <CourseRow key={enrollment.enrollment_id} enrollment={enrollment} />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseRow({ enrollment }: { enrollment: StudentEnrollment }) {
  const course = enrollment.course
  const state = enrollmentState(enrollment)
  const complete = state.label === "Completed"

  return (
    <Card className="group overflow-hidden border-border/60 transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Thumbnail, or the course's initial where it has none. */}
          <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-16 sm:w-28">
            {course?.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt={course.title}
                fill
                sizes="112px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/5">
                <BookOpen className="h-5 w-5 text-primary/40" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-foreground">
                  {course?.title ?? "Course no longer available"}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                  {course?.instructor_name ? (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {course.instructor_name}
                    </span>
                  ) : null}
                  {course?.course_type ? (
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {course.course_type}
                    </span>
                  ) : null}
                  {course?.level ? (
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {course.level}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Enrolled {formatDate(enrollment.enrolled_at)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ToneBadge tone={state.tone}>{state.label}</ToneBadge>
                {/* A course the student took under this institution but which
                    belongs to another owner is worth saying out loud. */}
                {course && !course.belongs_to_institution ? (
                  <ToneBadge tone="muted">External course</ToneBadge>
                ) : null}
              </div>
            </div>

            {/* ── Progress ──────────────────────────────────────────────── */}
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="font-medium text-muted-foreground">
                  {enrollment.total_lessons > 0
                    ? `${enrollment.completed_lessons} of ${enrollment.total_lessons} lessons`
                    : "No lessons in this course yet"}
                </span>
                <span
                  className={cn(
                    "font-bold",
                    complete ? "text-success" : "text-foreground"
                  )}
                >
                  {formatPercent(enrollment.progress_percentage)}
                </span>
              </div>
              <ProgressRail
                value={enrollment.progress_percentage}
                tone={complete ? "success" : "primary"}
              />
            </div>

            {/* ── Facts ─────────────────────────────────────────────────── */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(enrollment.time_spent_minutes, "No time tracked")}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Target className="h-3 w-3" />
                {/* null means ungraded, which is not a score of zero. */}
                {enrollment.final_score === null
                  ? "Not graded"
                  : `Final score ${formatPercent(enrollment.final_score)}`}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                Last opened {formatDateTime(enrollment.last_accessed, "never")}
              </span>
              {enrollment.completion_date ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-success">
                  Completed {formatDate(enrollment.completion_date)}
                </span>
              ) : null}
              {enrollment.certificate_issued ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-warning-foreground">
                  <Award className="h-3 w-3" />
                  Certificate issued
                </span>
              ) : null}
            </div>
          </div>

          {course ? (
            <div className="flex shrink-0 items-start">
              <Button variant="outline" size="sm" asChild className="h-8">
                <Link
                  href={`/dashboard/institution-admin/courses/${course.id}`}
                >
                  Open course
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
