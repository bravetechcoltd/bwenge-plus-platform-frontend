"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  BookOpen,
  CheckCircle,
  PlayCircle,
  Target,
  Award,
  AlertCircle,
  Loader2,
  GraduationCap,
  User,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import Cookies from "js-cookie"
import { toast } from "sonner"
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d"

interface EnrolledCourse {
  id: string
  course: {
    id: string
    title: string
    description: string
    thumbnail_url: string
    level: string
    price: number
    status: string
    is_certificate_available: boolean
    course_type: "MOOC" | "SPOC"
    institution_id?: string
    duration_minutes: number
    language: string
    average_rating: number | string
    total_reviews: number
    enrollment_count: number
    modules?: Array<{
      id: string
      title: string
      lessons: Array<{
        id: string
        title: string
        duration_minutes: number
        is_preview: boolean
        order_index: number
      }>
    }>
    instructor?: {
      id: string
      first_name: string
      last_name: string
      profile_picture_url?: string
    }
  }
  progress_percentage: number
  status: "ACTIVE" | "COMPLETED" | "DROPPED" | "EXPIRED" | "PENDING"
  total_time_spent_minutes: number
  completed_lessons: number
  enrolled_at: string
  last_accessed?: string
  certificate_issued: boolean
  final_score?: number
}

function getTotalLessons(modules?: EnrolledCourse["course"]["modules"]): number {
  if (!modules) return 0
  return modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)
}

export default function MyCoursesPage() {
  const router = useRouter()
  const { user: reduxUser, isAuthenticated, token: reduxToken } = useSelector(
    (state: RootState) => state.bwengeAuth
  )

  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<"all" | "active" | "completed" | "pending">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)
  const [mounted, setMounted] = useState(false)

  const getUser = () => {
    if (reduxUser && reduxUser.id) return reduxUser
    const userCookie = Cookies.get("bwenge_user")
    if (userCookie) {
      try { return JSON.parse(userCookie) } catch { return null }
    }
    try {
      const localUser = localStorage.getItem("bwengeplus_user")
      if (localUser) return JSON.parse(localUser)
    } catch { return null }
    return null
  }

  const getToken = () => {
    if (reduxToken) return reduxToken
    const tokenCookie = Cookies.get("bwenge_token")
    if (tokenCookie) return tokenCookie
    try { return localStorage.getItem("bwengeplus_token") } catch { return null }
  }

  const user = getUser()
  const token = getToken()

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (user && token) {
      setAuthChecked(true)
      fetchEnrolledCourses()
    } else if (!isAuthenticated && !user && !token) {
      const timer = setTimeout(() => {
        if (!getUser() && !getToken()) {
          setAuthChecked(true)
          setLoading(false)
        }
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setAuthChecked(true)
      setLoading(false)
    }
  }, [reduxUser, isAuthenticated, reduxToken, retryCount])

  const fetchEnrolledCourses = async () => {
    const currentUser = getUser()
    const currentToken = getToken()
    if (!currentUser || !currentToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            include_course_details: true,
            page: 1,
            limit: 100,
          }),
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Your session has expired. Please login again.")
          Cookies.remove("bwenge_token")
          Cookies.remove("bwenge_user")
          localStorage.removeItem("bwengeplus_token")
          localStorage.removeItem("bwengeplus_user")
          router.push("/login")
        } else if (response.status === 403) {
          toast.error("You don't have permission to view these enrollments")
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to fetch enrollments`)
        }
        setEnrollments([])
        setLoading(false)
        return
      }

      const data = await response.json()
      if (data.success && data.data) {
        setEnrollments(data.data || [])
      } else {
        setEnrollments([])
      }
    } catch (error: any) {
      toast.error(`Failed to load courses: ${error.message}`)
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => setRetryCount((prev) => prev + 1)

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesSearch =
      enrollment.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.course.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTab =
      selectedTab === "all" ||
      (selectedTab === "active" && enrollment.status === "ACTIVE") ||
      (selectedTab === "completed" && enrollment.status === "COMPLETED") ||
      (selectedTab === "pending" && enrollment.status === "PENDING")

    return matchesSearch && matchesTab
  })

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="h-40 w-full rounded-none" />
                <div className="p-3.5 space-y-2.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <div className="grid grid-cols-3 gap-1 py-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-7 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated state
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold mb-2">Authentication Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please login to view your enrolled courses
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild size="sm">
              <Link href="/login">
                <User className="w-4 h-4 mr-2" />
                Login
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <Loader2 className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // No enrollments state
  if (enrollments.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-2xl -z-10" />
            <div className="py-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-primary">My Learning Journey</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Track your progress, continue learning, and unlock achievements
              </p>
            </div>
          </div>

          <div className="text-center py-8">
            <div className="bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No Enrollments Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't enrolled in any courses yet. Start your learning journey by exploring available courses.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="sm">
                <Link href="/dashboard/learner/browse/all">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Courses
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <Loader2 className="w-4 h-4 mr-2" />
                Retry Loading
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
        {/* Header */}
        <div className="text-center relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-2xl -z-10" />
          <div className="py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-primary">My Learning Journey</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-4">
              Track your progress, continue learning, and unlock achievements
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              <div className="bg-card border-2 border-primary/10 rounded-lg p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-xl font-bold text-primary">{enrollments.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>
              <div className="bg-card border-2 border-success/10 rounded-lg p-3 hover:border-success/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-xl font-bold text-success">
                    {enrollments.filter((c) => c.status === "COMPLETED").length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="bg-card border-2 border-primary/10 rounded-lg p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <PlayCircle className="w-4 h-4 text-primary" />
                  <span className="text-xl font-bold text-primary">
                    {enrollments.filter((c) => c.status === "ACTIVE").length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="bg-card border-2 border-warning/10 rounded-lg p-3 hover:border-warning/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-warning" />
                  <span className="text-xl font-bold text-warning">
                    {enrollments.filter((c) => c.certificate_issued).length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Certificates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search + Refresh */}
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search your enrollments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm border-2 focus:border-primary/50 transition-colors"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <Loader2 className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            value={selectedTab}
            onValueChange={(value) =>
              setSelectedTab(value as "all" | "active" | "completed" | "pending")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 lg:w-fit h-9">
              <TabsTrigger value="all" className="flex items-center gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                All ({enrollments.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-1.5 text-xs">
                <PlayCircle className="w-3.5 h-3.5" />
                Active ({enrollments.filter((c) => c.status === "ACTIVE").length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5" />
                Completed ({enrollments.filter((c) => c.status === "COMPLETED").length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-1.5 text-xs">
                <Target className="w-3.5 h-3.5" />
                Pending ({enrollments.filter((c) => c.status === "PENDING").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              {/* Course cards grid — 4 cols on xl */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredEnrollments.map((enrollment, idx) => {
                  const { course } = enrollment
                  const totalLessons = getTotalLessons(course.modules)
                  const numericRating =
                    typeof course.average_rating === "string"
                      ? parseFloat(course.average_rating) || 0
                      : course.average_rating || 0

                  return (
                    <BwengeCourseCard3D
                      key={enrollment.id}
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      thumbnail_url={course.thumbnail_url || undefined}
                      instructor={
                        course.instructor
                          ? {
                              id: course.instructor.id,
                              first_name: course.instructor.first_name,
                              last_name: course.instructor.last_name,
                              profile_picture_url:
                                course.instructor.profile_picture_url || undefined,
                            }
                          : undefined
                      }
                      level={course.level}
                      course_type={course.course_type}
                      average_rating={numericRating}
                      total_reviews={course.total_reviews}
                      duration_minutes={course.duration_minutes}
                      total_lessons={totalLessons}
                      is_certificate_available={course.is_certificate_available}
                      variant="student"
                      showActions={false}
                      showInstitution={false}
                      index={idx}
                      onLearnMoreClick={(id) => {
                        if (enrollment.status !== "PENDING") {
                          router.push(`/courses/${id}/learn`)
                        }
                      }}
                      enrollmentData={{
                        progress_percentage: enrollment.progress_percentage,
                        enrollment_status: enrollment.status,
                        approval_status:
                          enrollment.status === "PENDING" ? "PENDING" : "APPROVED",
                        time_spent_minutes: enrollment.total_time_spent_minutes,
                        completed_lessons: enrollment.completed_lessons,
                        total_lessons_count: totalLessons,
                        certificate_issued: enrollment.certificate_issued,
                        final_score: enrollment.final_score
                          ? String(enrollment.final_score)
                          : null,
                        action_href: `/courses/${course.id}/learn`,
                        animate: mounted,
                      }}
                    />
                  )
                })}
              </div>

              {filteredEnrollments.length === 0 && (
                <div className="text-center py-8">
                  <div className="bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                    {selectedTab === "all"
                      ? "No enrollments found"
                      : `No ${selectedTab} enrollments`}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedTab === "all"
                      ? searchTerm
                        ? "No courses match your search. Try different keywords."
                        : "Start your learning journey by enrolling in some courses"
                      : `You don't have any ${selectedTab} courses yet`}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="sm">
                      <Link href="/dashboard/learner/browse/all">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Browse Courses
                      </Link>
                    </Button>
                    {searchTerm && (
                      <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                        Clear Search
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
