"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Mail,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"
import {
  fetchStudentOverview,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPercent,
  type StudentOverview,
} from "@/lib/students/institution-student-api"
import {
  NoInstitutionState,
  StatTile,
  ToneBadge,
  useStudentResource,
} from "@/components/institution-admin/student-detail/shared"

/**
 * The chrome the three student pages share (ISTU-001).
 *
 * This is a layout rather than a component each page imports so that moving
 * between Courses, Progress and Certificates does not re-fetch the header or
 * flash it away: Next keeps the layout mounted across the nested routes, and
 * only the list below it changes.
 *
 * The figures in the strip are the same ones the students table shows, read
 * from the same enrollments — so the count in the three-dot menu and the count
 * on the page it opens cannot disagree.
 */

const tabs = [
  { segment: "courses", label: "Courses", icon: BookOpen },
  { segment: "progress", label: "Learning Progress", icon: TrendingUp },
  { segment: "certificates", label: "Certificates", icon: Award },
]

export default function StudentDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { scope, data, isLoading, error } = useStudentResource<StudentOverview>(
    (institutionId, studentId, token) =>
      fetchStudentOverview(institutionId, studentId, token)
  )

  if (scope.kind === "no-institution") return <NoInstitutionState />

  const basePath =
    scope.kind === "ready"
      ? `/dashboard/institution-admin/students/${scope.studentId}`
      : ""

  const student = data?.student
  const stats = data?.stats
  const initials =
    [student?.first_name?.[0], student?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    student?.email?.[0]?.toUpperCase() ||
    "?"

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/institution-admin/students">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            All students
          </Link>
        </Button>
      </div>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-success" />
        <CardContent className="p-5">
          {isLoading && !student ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3.5 w-72" />
              </div>
            </div>
          ) : student ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-16 w-16 ring-2 ring-border/60">
                {student.profile_picture_url ? (
                  <AvatarImage
                    src={student.profile_picture_url}
                    alt={student.name}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                    {student.name}
                  </h1>
                  <ToneBadge tone={student.is_active ? "success" : "muted"}>
                    {student.is_active ? "Active" : "Inactive"}
                  </ToneBadge>
                  {student.is_verified ? (
                    <ToneBadge tone="primary">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </ToneBadge>
                  ) : (
                    <ToneBadge tone="warning">Email unverified</ToneBadge>
                  )}
                  {student.membership.is_active ? null : (
                    <ToneBadge tone="danger">Membership inactive</ToneBadge>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                  <a
                    href={`mailto:${student.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {student.email}
                  </a>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Member since {formatDate(student.membership.joined_at)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Last seen {formatDateTime(student.last_login)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {error ?? "This student could not be loaded."}
            </p>
          )}

          {/* ── Figures ───────────────────────────────────────────────────── */}
          {stats ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatTile
                  icon={BookOpen}
                  label="Enrolled"
                  value={stats.enrolled_courses}
                  hint={`${stats.not_started_courses} not started`}
                />
                <StatTile
                  icon={CheckCircle2}
                  label="Completed"
                  value={stats.completed_courses}
                  hint={`${stats.in_progress_courses} in progress`}
                  tone="success"
                />
                <StatTile
                  icon={TrendingUp}
                  label="Avg. progress"
                  /* `null` when there is nothing to average — an average of no
                     courses is not zero percent. */
                  value={formatPercent(stats.average_progress)}
                  tone="primary"
                />
                <StatTile
                  icon={Clock}
                  label="Time on task"
                  value={formatDuration(stats.total_learning_minutes)}
                  hint="Tracked by the player"
                  tone="muted"
                />
                <StatTile
                  icon={Award}
                  label="Certificates"
                  /* Every certificate the learner holds, which is what the
                     students table counts too (ISTU-002). The split is in the
                     hint so the institution's own share is still visible. */
                  value={stats.certificates_earned}
                  hint={
                    stats.certificates_earned > 0
                      ? `${stats.certificates_from_institution} from your courses`
                      : undefined
                  }
                  tone="warning"
                />
              </div>

              {stats.enrollments_outside_institution > 0 ? (
                /*
                 * ISTU-002. These pages used to cover the institution only,
                 * while the students table and the menu label that opens them
                 * count everything — so "View Courses (9)" opened a page with
                 * three courses on it. Everything is listed now and the rows
                 * from elsewhere are marked, which this line explains once.
                 */
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Everything this learner has on the platform is listed, so
                  these figures match the students table.{" "}
                  <span className="font-semibold text-foreground">
                    {stats.courses_from_institution}
                  </span>{" "}
                  of {stats.total_enrollments} enrolment
                  {stats.total_enrollments === 1 ? "" : "s"}{" "}
                  {stats.courses_from_institution === 1 ? "is" : "are"} yours;
                  the rest are marked as external.
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1">
        {tabs.map((tab) => {
          const href = `${basePath}/${tab.segment}`
          const active = pathname?.endsWith(`/${tab.segment}`)
          const Icon = tab.icon
          const count =
            tab.segment === "courses"
              ? stats?.enrolled_courses
              : tab.segment === "certificates"
                ? stats?.certificates_earned
                : undefined

          return (
            <Link
              key={tab.segment}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-all",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}
