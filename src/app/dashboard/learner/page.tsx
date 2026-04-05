"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAppSelector } from "@/lib/hooks"
import Cookies from "js-cookie"
import { toast } from "sonner"
import { useRealtimeEvents } from "@/hooks/use-realtime"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d"
import {
  BookOpen,
  CheckCircle,
  Clock,
  BarChart3,
  AlertCircle,
  Search,
} from "lucide-react"

// ==================== TYPES ====================
interface Lesson {
  id: string
  title: string
  duration_minutes: number
}

interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

interface Instructor {
  id: string
  first_name: string
  last_name: string
  profile_picture_url: string | null
  email: string
}

interface Course {
  id: string
  title: string
  description: string
  thumbnail_url: string
  instructor: Instructor
  level: "BEGINNER" | "INTERMEDIATE" | "EXPERT"
  price: string
  status: string
  is_certificate_available: boolean
  course_type: "MOOC" | "SPOC"
  duration_minutes: number
  language: string
  average_rating: string
  total_reviews: number
  enrollment_count: number
  modules: Module[]
}

interface Enrollment {
  id: string
  user_id: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    profile_picture_url: string | null
  }
  course_id: string
  course: Course
  progress_percentage: number
  status: string
  approval_status: string
  request_type: string | null
  access_code_used: string | null
  access_code_sent: boolean
  total_time_spent_minutes: number
  completed_lessons: number
  enrolled_at: string
  certificate_issued: boolean
  final_score: string | null
}

interface ApiResponse {
  success: boolean
  message: string
  data: Enrollment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type FilterTab = "all" | "in-progress" | "completed" | "pending"

// ==================== HELPERS ====================
function formatTimeFullLabel(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins} min`
  if (mins === 0) return `${hrs} hrs`
  return `${hrs} hrs ${mins} min`
}

function getTotalLessons(modules: Module[]): number {
  return modules.reduce((sum, m) => sum + m.lessons.length, 0)
}

function classifyEnrollment(e: Enrollment): FilterTab {
  if (e.approval_status === "PENDING") return "pending"
  if (e.status === "COMPLETED" && e.progress_percentage === 100) return "completed"
  return "in-progress"
}

// ==================== SKELETON LOADER ====================
function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-3.5 space-y-2.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3.5 w-3/5" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-3 gap-1 py-1.5 border-t border-b border-border">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-7 w-full rounded-lg" />
      </div>
    </div>
  )
}

// ==================== MAIN PAGE ====================
export default function LearnerDashboardPage() {
  const router = useRouter()
  const { user: reduxUser, isAuthenticated, token: reduxToken } = useAppSelector((state) => state.bwengeAuth)

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [mounted, setMounted] = useState(false)

  // Resolve auth
  const getUser = useCallback(() => {
    if (reduxUser?.id) return reduxUser
    const cookie = Cookies.get("bwenge_user")
    if (cookie) {
      try { return JSON.parse(cookie) } catch { return null }
    }
    try {
      const local = localStorage.getItem("bwengeplus_user")
      if (local) return JSON.parse(local)
    } catch { /* noop */ }
    return null
  }, [reduxUser])

  const getToken = useCallback(() => {
    if (reduxToken) return reduxToken
    const cookie = Cookies.get("bwenge_token")
    if (cookie) return cookie
    try { return localStorage.getItem("bwengeplus_token") } catch { return null }
  }, [reduxToken])

  const user = getUser()
  const token = getToken()

  // Fetch enrollments
  useEffect(() => {
    if (!user || !token) {
      setLoading(false)
      return
    }

    const fetchEnrollments = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            include_course_details: true,
            page: 1,
            limit: 100,
          }),
        })

        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Session expired. Please login again.")
            Cookies.remove("bwenge_token")
            Cookies.remove("bwenge_user")
            router.push("/login")
            return
          }
          throw new Error("Failed to fetch enrollments")
        }

        const json: ApiResponse = await res.json()
        if (json.success) {
          setEnrollments(json.data)
        } else {
          throw new Error(json.message || "Failed to load enrollments")
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong")
        toast.error("Failed to load your courses")
      } finally {
        setLoading(false)
      }
    }

    fetchEnrollments()
  }, [user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger progress bar animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // ── Real-time: Socket-based dashboard updates ─────────────────────────────
  const refetchEnrollments = useCallback(() => {
    if (!user || !token) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: user.id, include_course_details: true, page: 1, limit: 100 }),
    })
      .then((res) => res.json())
      .then((json) => { if (json.success) setEnrollments(json.data) })
      .catch(() => {})
  }, [user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeEvents({
    "enrollment-approved": (data: any) => {
      toast.success(`Enrollment approved for ${data.courseName || "a course"}`)
      refetchEnrollments()
    },
    "enrollment-rejected": (data: any) => {
      toast.error(`Enrollment not approved for ${data.courseName || "a course"}`)
      refetchEnrollments()
    },
    "grade-released": (data: any) => {
      toast.info(`Grade released: ${data.assessmentTitle || "Assessment"} - ${data.percentage}%`)
    },
    "progress-updated": () => refetchEnrollments(),
    "certificate-issued": (data: any) => {
      toast.success(`Certificate ready for ${data.courseName || "a course"}!`)
      refetchEnrollments()
    },
    "course-published": () => refetchEnrollments(),
    "new-lesson-added": () => refetchEnrollments(),
    "schedule-event-created": (data: any) => {
      toast.info(`New event: ${data.title || "Scheduled event"}`)
    },
  })

  // ==================== DERIVED DATA ====================
  const stats = useMemo(() => {
    const total = enrollments.length
    const completed = enrollments.filter((e) => e.status === "COMPLETED").length
    const totalMinutes = enrollments.reduce((sum, e) => sum + e.total_time_spent_minutes, 0)
    const scores = enrollments
      .map((e) => (e.final_score ? parseFloat(e.final_score) : null))
      .filter((s): s is number => s !== null)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

    return { total, completed, totalMinutes, avgScore }
  }, [enrollments])

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) => {
      // Float in-progress above completed
      const aInProgress = a.progress_percentage > 0 && a.progress_percentage < 100 && a.approval_status !== "PENDING" ? 1 : 0
      const bInProgress = b.progress_percentage > 0 && b.progress_percentage < 100 && b.approval_status !== "PENDING" ? 1 : 0
      if (aInProgress !== bInProgress) return bInProgress - aInProgress
      // Then by enrolled_at descending
      return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()
    })
  }, [enrollments])

  const filteredEnrollments = useMemo(() => {
    if (activeTab === "all") return sortedEnrollments
    return sortedEnrollments.filter((e) => classifyEnrollment(e) === activeTab)
  }, [sortedEnrollments, activeTab])

  const tabCounts = useMemo(() => ({
    all: enrollments.length,
    "in-progress": enrollments.filter((e) => classifyEnrollment(e) === "in-progress").length,
    completed: enrollments.filter((e) => classifyEnrollment(e) === "completed").length,
    pending: enrollments.filter((e) => classifyEnrollment(e) === "pending").length,
  }), [enrollments])

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Summary Bar ── */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Greeting */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-10 w-10 border border-border shrink-0">
                {user?.profile_picture_url && (
                  <AvatarImage src={user.profile_picture_url} alt={user.first_name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold text-card-foreground truncate">
                  Welcome back, {user?.first_name || "Learner"}
                </h1>
                <p className="text-[11px] text-muted-foreground">Your learning dashboard</p>
              </div>
            </div>

            {/* Stat tiles */}
            <div className="flex items-center gap-0 divide-x divide-border">
              <StatTile
                value={loading ? "\u2014" : String(stats.total)}
                label="Enrolled"
                icon={<BookOpen className="w-3.5 h-3.5" />}
              />
              <StatTile
                value={loading ? "\u2014" : String(stats.completed)}
                label="Completed"
                icon={<CheckCircle className="w-3.5 h-3.5" />}
              />
              <StatTile
                value={loading ? "\u2014" : formatTimeFullLabel(stats.totalMinutes)}
                label="Learning Time"
                icon={<Clock className="w-3.5 h-3.5" />}
              />
              {stats.avgScore !== null && (
                <StatTile
                  value={`${stats.avgScore}%`}
                  label="Avg Score"
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Error alert */}
        {error && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[12px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-[11px] font-medium underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 min-w-max">
            {([
              { key: "all" as FilterTab, label: "All" },
              { key: "in-progress" as FilterTab, label: "In Progress" },
              { key: "completed" as FilterTab, label: "Completed" },
              { key: "pending" as FilterTab, label: "Pending" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {tabCounts[tab.key]}
                  </span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredEnrollments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            {enrollments.length === 0 ? (
              <>
                <h3 className="text-[14px] font-semibold text-card-foreground mb-1">No courses yet</h3>
                <p className="text-[12px] text-muted-foreground mb-4 max-w-xs">
                  Start your learning journey by browsing our course catalog.
                </p>
                <Button asChild size="sm" className="h-8 text-[12px]">
                  <Link href="/dashboard/learner/browse/all">Browse Courses</Link>
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-[14px] font-semibold text-card-foreground mb-1">
                  No {activeTab.replace("-", " ")} courses
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  Try selecting a different filter above.
                </p>
              </>
            )}
          </div>
        )}

        {/* Course grid — uses BwengeCourseCard3D with enrollment data */}
        {!loading && filteredEnrollments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEnrollments.map((enrollment, idx) => {
              const { course } = enrollment
              const totalLessons = getTotalLessons(course.modules)

              return (
                <BwengeCourseCard3D
                  key={enrollment.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  thumbnail_url={course.thumbnail_url}
                  instructor={{
                    id: course.instructor.id,
                    first_name: course.instructor.first_name,
                    last_name: course.instructor.last_name,
                    profile_picture_url: course.instructor.profile_picture_url || undefined,
                  }}
                  level={course.level}
                  course_type={course.course_type}
                  average_rating={parseFloat(course.average_rating) || 0}
                  total_reviews={course.total_reviews}
                  duration_minutes={course.duration_minutes}
                  total_lessons={totalLessons}
                  is_certificate_available={course.is_certificate_available}
                  variant="student"
                  showActions={false}
                  showInstitution={false}
                  index={idx}
                  onLearnMoreClick={(id) => {
                    if (enrollment.approval_status !== "PENDING") {
                      router.push(`/courses/${id}/learn`)
                    }
                  }}
                  enrollmentData={{
                    progress_percentage: enrollment.progress_percentage,
                    enrollment_status: enrollment.status,
                    approval_status: enrollment.approval_status,
                    time_spent_minutes: enrollment.total_time_spent_minutes,
                    completed_lessons: enrollment.completed_lessons,
                    total_lessons_count: totalLessons,
                    certificate_issued: enrollment.certificate_issued,
                    final_score: enrollment.final_score,
                    action_href: `/courses/${course.id}/learn`,
                    animate: mounted,
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== STAT TILE ====================
function StatTile({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[15px] font-bold text-card-foreground leading-tight">{value}</span>
        <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
      </div>
    </div>
  )
}
