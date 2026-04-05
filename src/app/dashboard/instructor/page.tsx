"use client"

import React, { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  fetchInstructorDashboardSummary,
  selectDashboardSummary,
  selectIsLoadingSummary,
  selectSummaryError,
} from "@/lib/features/instructor/instructorSlice"
import { useRealtimeEvents } from "@/hooks/use-realtime"
import { toast } from "sonner"
import {
  BookOpen,
  Users,
  Star,
  ClipboardList,
  RefreshCw,
  Clock,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  FileEdit,
  MessageCircle,
  CheckCircle,
  GraduationCap,
  BarChart3,
  ChevronRight,
  Image,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"

// ────────────────────────────── Helpers ──���──────────────────────────

function relativeTime(dateStr: string): string {
  if (!dateStr) return ""
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function renderStars(rating: number) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const stars = []
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} className="h-3 w-3 fill-warning text-warning" />)
    } else if (i === full && half) {
      stars.push(<Star key={i} className="h-3 w-3 fill-warning/50 text-warning" />)
    } else {
      stars.push(<Star key={i} className="h-3 w-3 text-muted-foreground/30" />)
    }
  }
  return stars
}

const STATUS_CHIP: Record<string, string> = {
  PUBLISHED: "bg-success/15 text-success border-success/30",
  DRAFT: "bg-warning/15 text-warning border-warning/30",
  ARCHIVED: "bg-muted text-muted-foreground border-muted-foreground/30",
}

// ──────��─────────────────────── Component ───────────────────────────

export default function InstructorDashboard() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const data = useAppSelector(selectDashboardSummary)
  const loading = useAppSelector(selectIsLoadingSummary)
  const error = useAppSelector(selectSummaryError)

  const refresh = useCallback(() => {
    dispatch(fetchInstructorDashboardSummary())
  }, [dispatch])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ── Real-time: Auto-refresh dashboard on relevant events ──────────────────
  useRealtimeEvents({
    "enrollment-approved": () => refresh(),
    "enrollment-rejected": () => refresh(),
    "enrollment-count-updated": () => refresh(),
    "new-notification": () => refresh(),
    "assessment-submitted": (data: any) => {
      toast.info(`New submission from ${data.studentName || "a student"}`)
      refresh()
    },
    "new-review": (data: any) => {
      toast.info("New course review received")
      refresh()
    },
    "progress-updated": () => refresh(),
    "grade-released": () => refresh(),
  })

  if (loading && !data) return <DashboardSkeleton />

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { overview, students, engagement, recent_activity, attention_required, top_courses } = data

  // Sort top courses by enrollment descending
  const coursesByEnrollment = [...(top_courses?.by_enrollment || [])].sort(
    (a, b) => b.enrollment_count - a.enrollment_count
  )

  const kpiTiles = [
    {
      label: "Courses Published",
      value: overview.active_courses,
      icon: BookOpen,
      color: "text-primary",
      sub: `${overview.total_courses} total`,
    },
    {
      label: "Enrolled Learners",
      value: students.total_students,
      icon: Users,
      color: "text-success",
      sub: `${students.active_students} active`,
    },
    {
      label: "Average Rating",
      value: engagement.average_course_rating?.toFixed(1) || "0.0",
      icon: Star,
      color: "text-warning",
      sub: `${engagement.total_reviews} reviews`,
    },
    {
      label: "Pending Reviews",
      value: attention_required.pending_assignments + attention_required.pending_approvals,
      icon: ClipboardList,
      color:
        attention_required.pending_assignments + attention_required.pending_approvals > 0
          ? "text-warning"
          : "text-muted-foreground",
      sub: attention_required.total_items > 0 ? `${attention_required.total_items} items need attention` : "All clear",
    },
  ]

  return (
    <div className="space-y-6 p-1">
      {/* Header + Freshness */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instructor Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your courses and learner activity</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {loading ? "Refreshing..." : "Just updated"}
          </span>
          <Button onClick={refresh} variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* TIER 1 - Personal KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiTiles.map((tile) => (
          <div
            key={tile.label}
            className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tile.label}</span>
              <tile.icon className={`h-4 w-4 ${tile.color}`} />
            </div>
            <span className="text-2xl font-bold leading-none">{typeof tile.value === "number" ? tile.value.toLocaleString() : tile.value}</span>
            <span className="text-[11px] text-muted-foreground">{tile.sub}</span>
          </div>
        ))}
      </div>

      {/* TIER 2 - Two Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: My Courses Panel (60%) */}
        <Card className="lg:col-span-3 border border-border shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                My Courses
                <Badge variant="secondary" className="ml-1 text-xs font-bold">{overview.total_courses}</Badge>
              </CardTitle>
              <Button
                onClick={() => router.push("/dashboard/instructor/courses/create")}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                <PlusCircle className="h-3 w-3 mr-1" /> Create New Course
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-2">
              {coursesByEnrollment.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">You haven&apos;t created any courses yet</p>
                  <Button
                    onClick={() => router.push("/dashboard/instructor/courses/create")}
                    variant="outline"
                    size="sm"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Create Your First Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-0">
                  {coursesByEnrollment.map((course, i) => {
                    // Find rating data from by_rating array
                    const ratingInfo = top_courses?.by_rating?.find((c) => c.id === course.id)
                    const completionInfo = top_courses?.by_completion?.find((c) => c.id === course.id)
                    const avgRating = ratingInfo?.average_rating || 0
                    const completionRate = completionInfo?.completion_rate || 0

                    return (
                      <div
                        key={course.id}
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                        onClick={() => router.push(`/dashboard/instructor/courses/${course.id}`)}
                      >
                        {/* Thumbnail */}
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Image className="h-4 w-4 text-muted-foreground/50" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> {course.enrollment_count}
                            </span>
                            <span className="flex items-center gap-0.5">
                              {renderStars(avgRating)}
                            </span>
                          </div>
                        </div>

                        {/* Completion bar + status */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-16 hidden md:block">
                            <Progress value={completionRate} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground text-right mt-0.5">{completionRate}%</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 ${STATUS_CHIP["PUBLISHED"] || ""}`}
                          >
                            Published
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </div>
                      </div>
                    )
                  })}

                  {/* Show draft courses too */}
                  {overview.draft_courses > 0 && (
                    <div className="pt-3 mt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground px-3 mb-2">
                        + {overview.draft_courses} draft course{overview.draft_courses > 1 ? "s" : ""} not shown above
                      </p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Learner Activity Panel (40%) */}
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-success" />
              Learner Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Activity feed */}
            <ScrollArea className="h-[300px] pr-2">
              {(recent_activity?.latest_activities || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Users className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No learner activity yet</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {recent_activity.latest_activities.slice(0, 8).map((activity, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 py-2 px-2 rounded-md ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                    >
                      {/* Avatar */}
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {activity.student?.profile_picture_url ? (
                          <img
                            src={activity.student.profile_picture_url}
                            alt=""
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <Users className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">
                          <span className="font-medium">{activity.student?.name || "Learner"}</span>{" "}
                          <span className="text-muted-foreground">
                            {activity.type === "lesson_completion"
                              ? `completed ${activity.lesson_title || "a lesson"}`
                              : activity.type === "enrollment"
                              ? `enrolled in ${activity.course_title || "a course"}`
                              : activity.type === "assessment_submission"
                              ? `submitted assessment in ${activity.course_title || "a course"}`
                              : `active in ${activity.course_title || "a course"}`}
                          </span>
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {relativeTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator />

            {/* Weekly pulse numbers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{recent_activity?.new_enrollments || 0}</p>
                <p className="text-xs text-muted-foreground">New enrollments</p>
                <p className="text-[10px] text-muted-foreground">last 7 days</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{recent_activity?.recent_lesson_completions || 0}</p>
                <p className="text-xs text-muted-foreground">Lessons completed</p>
                <p className="text-[10px] text-muted-foreground">last 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TIER 3 - Pending Actions Strip */}
      {attention_required.total_items > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            Needs Your Attention
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {attention_required.pending_assignments > 0 && (
              <ActionCard
                count={attention_required.pending_assignments}
                label="Submissions awaiting grading"
                icon={<ClipboardList className="h-5 w-5" />}
                color="bg-warning/10 border-warning/30 text-warning"
                onClick={() => router.push("/dashboard/instructor/assignments/pending")}
              />
            )}
            {attention_required.pending_approvals > 0 && (
              <ActionCard
                count={attention_required.pending_approvals}
                label="Enrollment requests pending"
                icon={<Users className="h-5 w-5" />}
                color="bg-primary/10 border-primary/30 text-primary"
                onClick={() => router.push("/dashboard/instructor/enrollments/pending")}
              />
            )}
            {attention_required.draft_courses > 0 && (
              <ActionCard
                count={attention_required.draft_courses}
                label="Courses still in draft"
                icon={<FileEdit className="h-5 w-5" />}
                color="bg-warning/10 border-warning/30 text-warning"
                onClick={() => router.push("/dashboard/instructor/courses")}
              />
            )}
            {attention_required.low_rated_courses > 0 && (
              <ActionCard
                count={attention_required.low_rated_courses}
                label="Low-rated courses"
                icon={<Star className="h-5 w-5" />}
                color="bg-destructive/10 border-destructive/30 text-destructive"
                onClick={() => router.push("/dashboard/instructor/courses")}
              />
            )}
            {attention_required.inactive_courses > 0 && (
              <ActionCard
                count={attention_required.inactive_courses}
                label="Inactive courses"
                icon={<BarChart3 className="h-5 w-5" />}
                color="bg-muted border-muted-foreground/30 text-muted-foreground"
                onClick={() => router.push("/dashboard/instructor/courses")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────── Sub-components ─────────────────────

function ActionCard({
  count,
  label,
  icon,
  color,
  onClick,
}: {
  count: number
  label: string
  icon: React.ReactNode
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 min-w-[220px] hover:shadow-sm transition-shadow cursor-pointer ${color}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="text-left">
        <p className="text-lg font-bold leading-none">{count}</p>
        <p className="text-xs mt-0.5 opacity-80">{label}</p>
      </div>
      <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
    </button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-64 mt-1.5" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[90px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="lg:col-span-3 h-[470px] rounded-xl" />
        <Skeleton className="lg:col-span-2 h-[470px] rounded-xl" />
      </div>
      <Skeleton className="h-[80px] rounded-xl" />
    </div>
  )
}
