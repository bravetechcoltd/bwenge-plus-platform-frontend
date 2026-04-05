"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardCheck,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  UserPlus,
  FileText,
  ShieldCheck,
  AlertCircle,
  Clock,
  Circle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import api from "@/lib/api"
import { useRealtimeEvents } from "@/hooks/use-realtime"
import { toast } from "sonner"

// ────────────────────────────── Types ──────────────────────────────

interface KPI {
  total_institutions: number
  total_active_courses: number
  total_learners: number
  total_instructors: number
  pending_approvals: number
}

interface InstitutionOverview {
  total: number
  active: number
  inactive: number
  zero_courses: number
  with_active_learners: number
}

interface InstitutionRow {
  id: string
  name: string
  logo_url: string | null
  type: string
  is_active: boolean
  member_count: number
  learner_count: number
  instructor_count: number
  published_courses: number
  recently_active: boolean
}

interface CourseSummary {
  total: number
  type_distribution: { mooc: number; spoc: number; mooc_percentage: number; spoc_percentage: number }
  origin_distribution: { institution_linked: number; non_institution: number }
  status_breakdown: { published: number; draft: number; archived: number }
  non_institution_courses: { total: number; mooc: number; spoc: number }
}

interface ActivityItem {
  id: string
  action: string
  description: string
  user_name: string
  target_type: string | null
  target_id: string | null
  timestamp: string
}

interface DashboardData {
  kpi: KPI
  institution_overview: InstitutionOverview
  institution_list: InstitutionRow[]
  course_summary: CourseSummary
  activity_feed: ActivityItem[]
  last_updated: string
}

// ────────────────────────────── Helpers ─────────────────────────────

function relativeTime(dateStr: string): string {
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

function activityIcon(action: string) {
  if (action.includes("ENROLLMENT") || action.includes("ENROLL")) return <UserPlus className="h-3.5 w-3.5" />
  if (action.includes("COURSE")) return <BookOpen className="h-3.5 w-3.5" />
  if (action.includes("USER") || action.includes("LOGIN")) return <Users className="h-3.5 w-3.5" />
  if (action.includes("INSTITUTION") || action.includes("MEMBER")) return <Building2 className="h-3.5 w-3.5" />
  return <FileText className="h-3.5 w-3.5" />
}

function activityColor(action: string): string {
  if (action.includes("CREATE") || action.includes("PUBLISH")) return "text-success"
  if (action.includes("DELETE") || action.includes("DEACTIVATE") || action.includes("REMOVE")) return "text-destructive"
  if (action.includes("UPDATE") || action.includes("COMPLETE")) return "text-primary"
  return "text-muted-foreground"
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-success/15 border-l-success text-success",
  draft: "bg-warning/15 border-l-warning text-warning",
  archived: "bg-muted border-l-muted-foreground text-muted-foreground",
}

// ────────────────────────────── Component ───────────────────────────

export default function SystemAdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get("/system-admin/dashboard-summary")
      if (res.data.success) {
        setData(res.data.data)
      } else {
        setError(res.data.message || "Failed to load dashboard")
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ── Real-time: Socket-based dashboard updates ─────────────────────────────
  useRealtimeEvents({
    "dashboard-kpi-updated": () => fetchDashboard(),
    "health-alert": (data: any) => {
      toast.error(`System Alert: ${data.message || "Health issue detected"}`)
      fetchDashboard()
    },
    "health-check-result": () => fetchDashboard(),
    "new-audit-event": () => fetchDashboard(),
    "security-alert": (data: any) => {
      toast.error(`Security Alert: ${data.description || "Suspicious activity detected"}`)
    },
    "enrollment-count-updated": () => fetchDashboard(),
    "course-published": () => fetchDashboard(),
    "new-notification": (data: any) => {
      if (data?.notification_type === "NEW_INSTITUTION_REGISTRATION" ||
          data?.notification_type === "ENROLLMENT_SPIKE" ||
          data?.notification_type === "SYSTEM_HEALTH_ALERT" ||
          data?.notification_type === "NEW_INSTRUCTOR_APPLICATION") {
        fetchDashboard()
      }
    },
  })

  if (loading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error || "Something went wrong"}</p>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const { kpi, institution_overview, institution_list, course_summary, activity_feed } = data

  const kpiTiles = [
    { label: "Institutions", value: kpi.total_institutions, icon: Building2, color: "text-primary" },
    { label: "Active Courses", value: kpi.total_active_courses, icon: BookOpen, color: "text-success" },
    { label: "Learners", value: kpi.total_learners, icon: GraduationCap, color: "text-primary" },
    { label: "Instructors", value: kpi.total_instructors, icon: Users, color: "text-success" },
    { label: "Pending Approvals", value: kpi.pending_approvals, icon: ClipboardCheck, color: kpi.pending_approvals > 0 ? "text-warning" : "text-muted-foreground" },
  ]

  return (
    <div className="space-y-6">
      {/* Header + Freshness */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview and management</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {relativeTime(data.last_updated)}
          </span>
          <Button onClick={fetchDashboard} variant="ghost" size="icon" className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* TIER 1 - KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiTiles.map((tile) => (
          <div
            key={tile.label}
            className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1.5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tile.label}</span>
              <tile.icon className={`h-4 w-4 ${tile.color}`} />
            </div>
            <span className="text-2xl font-bold leading-none">{tile.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* TIER 2 - Split Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Institution Summary (60%) */}
        <Card className="lg:col-span-3 border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Institution Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overview mini-grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Active", value: institution_overview.active, sub: `of ${institution_overview.total}` },
                { label: "Inactive", value: institution_overview.inactive, sub: "" },
                { label: "No Courses", value: institution_overview.zero_courses, sub: "" },
                { label: "Active Learners", value: institution_overview.with_active_learners, sub: "last 30d" },
              ].map((stat) => (
                <div key={stat.label} className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {stat.sub && <p className="text-[10px] text-muted-foreground">{stat.sub}</p>}
                </div>
              ))}
            </div>

            <Separator />

            {/* Per-institution list */}
            <ScrollArea className="h-[340px] pr-2">
              <div className="space-y-0">
                {institution_list.length === 0 ? (
                  <EmptyState
                    message="No institutions yet"
                    cta="Create Institution"
                    onClick={() => router.push("/dashboard/system-admin/institutions/create")}
                  />
                ) : (
                  institution_list.map((inst, i) => (
                    <div
                      key={inst.id}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                      onClick={() => router.push(`/dashboard/system-admin/institutions/${inst.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {inst.logo_url ? (
                            <img src={inst.logo_url} alt="" className="h-full w-full object-cover rounded-full" />
                          ) : (
                            <Building2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{inst.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {inst.member_count} members ({inst.learner_count} learners &middot; {inst.instructor_count} instructors)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground">{inst.published_courses} courses</span>
                        <Circle
                          className={`h-2.5 w-2.5 fill-current ${inst.recently_active ? "text-success" : "text-muted-foreground/40"}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Course Status Summary (40%) */}
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-success" />
              Course Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Type distribution bar */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Type Distribution</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-3 rounded-full overflow-hidden bg-muted flex">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${course_summary.type_distribution.mooc_percentage}%` }}
                  />
                  <div
                    className="bg-success h-full transition-all"
                    style={{ width: `${course_summary.type_distribution.spoc_percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                  MOOC {course_summary.type_distribution.mooc} ({course_summary.type_distribution.mooc_percentage}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success inline-block" />
                  SPOC {course_summary.type_distribution.spoc} ({course_summary.type_distribution.spoc_percentage}%)
                </span>
              </div>
            </div>

            {/* Origin split */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Course Origin</p>
              <div className="flex gap-3">
                <div className="flex-1 bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{course_summary.origin_distribution.institution_linked}</p>
                  <p className="text-xs text-muted-foreground">Institution</p>
                </div>
                <div className="flex-1 bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{course_summary.origin_distribution.non_institution}</p>
                  <p className="text-xs text-muted-foreground">Standalone</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status breakdown */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Status Breakdown</p>
              <div className="space-y-2">
                {(["published", "draft", "archived"] as const).map((status) => (
                  <div
                    key={status}
                    className={`flex items-center justify-between py-1.5 px-3 rounded-md border-l-[3px] ${STATUS_COLORS[status]}`}
                  >
                    <span className="text-sm capitalize">{status}</span>
                    <Badge variant="secondary" className="font-bold text-xs">
                      {course_summary.status_breakdown[status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Non-institution courses highlight */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Non-Institution Courses
              </p>
              <p className="text-xs text-muted-foreground mb-2">Platform-wide open courses not linked to any institution</p>
              <div className="flex gap-3">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">{course_summary.non_institution_courses.mooc}</p>
                  <p className="text-xs text-muted-foreground">MOOC</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">{course_summary.non_institution_courses.spoc}</p>
                  <p className="text-xs text-muted-foreground">SPOC</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">{course_summary.non_institution_courses.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TIER 3 - Activity Feed */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
              View all activity <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activity_feed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-0">
              {activity_feed.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 py-2 px-2 rounded-md ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <div className={`flex items-center justify-center h-7 w-7 rounded-full bg-muted flex-shrink-0 ${activityColor(item.action)}`}>
                    {activityIcon(item.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{item.user_name}</span>{" "}
                      <span className="text-muted-foreground">{item.description}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {relativeTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────── Sub-components ─────────────────────

function EmptyState({ message, cta, onClick }: { message: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <ShieldCheck className="h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button onClick={onClick} variant="outline" size="sm">{cta}</Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-64 mt-1.5" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="lg:col-span-3 h-[480px] rounded-xl" />
        <Skeleton className="lg:col-span-2 h-[480px] rounded-xl" />
      </div>
      <Skeleton className="h-[280px] rounded-xl" />
    </div>
  )
}
