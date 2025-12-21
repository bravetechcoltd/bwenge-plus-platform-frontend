"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Star, ChevronLeft, ChevronRight, MoreHorizontal, Target, Trophy, Crown } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"

interface EnrolledCourse {
  id: string
  course: {
    id: string
    title: string
    description: string
    thumbnail_url: string | null
    instructor?: {
      first_name: string
      last_name: string
      profile_picture_url?: string | null
    }
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
    category?: {
      name: string
    }
    duration_minutes: number
    average_rating: string | number  // Backend returns string
    total_reviews: number
    language: string
    is_certificate_available: boolean
    course_type: "MOOC" | "SPOC"
    modules?: Array<{
      id: string
      title: string
      lessons: Array<{
        id: string
        title: string
        duration_minutes: number
        is_preview?: boolean
        order_index?: number
      }>
    }>
  }
  progress_percentage: number
  status: "ACTIVE" | "COMPLETED" | "DROPPED" | "EXPIRED" | "PENDING"
  enrolled_at: string
  last_accessed?: string
  completed_lessons: number
  total_time_spent_minutes: number
  certificate_issued?: boolean
  final_score?: number | null
}

export default function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    activeCourses: 0,
    totalHoursSpent: 0,
    averageProgress: 0,
    certificatesEarned: 0,
  })
  const [currentDate, setCurrentDate] = useState(new Date())
  const { token, user } = useAuth()
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
  const router = useRouter()

  useEffect(() => {
    const fetchMyCourses = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        const authToken = token || Cookies.get("bwenge_token")
        if (!authToken) throw new Error("No authentication token")

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            user_id: user.id,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const enrollmentsData = data.data || []

          const activeEnrollments = enrollmentsData.filter((e: any) => 
            e.status === "ACTIVE" || e.status === "COMPLETED"
          ).slice(0, 4)

          setEnrollments(activeEnrollments)

          // Calculate stats
          const totalCourses = enrollmentsData.length
          const completedCourses = enrollmentsData.filter((c: any) => c.status === "COMPLETED").length
          const activeCourses = enrollmentsData.filter((c: any) => c.status === "ACTIVE").length
          const certificatesEarned = enrollmentsData.filter((c: any) => c.certificate_issued === true).length
          const averageProgress = totalCourses > 0
            ? enrollmentsData.reduce((sum: number, c: any) => sum + (c.progress_percentage || 0), 0) / totalCourses
            : 0
          const totalHoursSpent = Math.floor(enrollmentsData.reduce((sum: number, c: any) => 
            sum + (c.total_time_spent_minutes || 0), 0) / 60)

          setStats({
            totalCourses,
            completedCourses,
            activeCourses,
            totalHoursSpent,
            averageProgress: Math.round(averageProgress),
            certificatesEarned,
          })
        }
      } catch (error) {
        console.error("Failed to fetch enrolled courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMyCourses()
  }, [user?.id, token])

  // Helper function to convert average_rating to number
  const getRating = (rating: string | number | undefined): number => {
    if (!rating) return 0
    if (typeof rating === 'number') return rating
    const parsed = parseFloat(rating)
    return isNaN(parsed) ? 0 : parsed
  }

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date: Date) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ]
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return {
      month: months[date.getMonth()],
      day: days[date.getDay()],
      date: date.getDate(),
      year: date.getFullYear(),
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const today = new Date()
    const isCurrentMonth =
      currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()

    const days = []
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    dayLabels.forEach((day) => {
      days.push(
        <div key={`label-${day}`} className="text-center text-xs font-medium text-muted-foreground p-2">
          {day}
        </div>,
      )
    })

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate()

      days.push(
        <div
          key={day}
          className={`p-2 text-center text-sm cursor-pointer hover:bg-accent rounded-md relative ${
            isToday ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"
          }`}
        >
          {day}
        </div>,
      )
    }

    return days
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return <Target className="w-3 h-3" />
      case "INTERMEDIATE":
        return <Trophy className="w-3 h-3" />
      case "ADVANCED":
      case "EXPERT":
        return <Crown className="w-3 h-3" />
      default:
        return <Target className="w-3 h-3" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return "bg-green-500 hover:bg-green-600"
      case "INTERMEDIATE":
        return "bg-blue-500 hover:bg-blue-600"
      case "ADVANCED":
      case "EXPERT":
        return "bg-purple-500 hover:bg-purple-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const handleImageError = (enrollmentId: string) => {
    setImgErrors(prev => ({ ...prev, [enrollmentId]: true }))
  }

  const currentDateFormatted = formatDate(new Date())

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-30/50 to-blue-50 dark:from-gray-900/20 dark:to-gray-800/20 rounded-lg p-1">
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Welcome and Courses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-br from-[#5b4e96] to-[#6d5ba8] rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-3xl font-bold mb-2">Hi {user?.first_name || "Student"}!</h1>
                <p className="text-lg opacity-90">
                  You have completed {stats.completedCourses} course{stats.completedCourses !== 1 ? "s" : ""}. 
                  {stats.activeCourses > 0 ? ` Continue your ${stats.activeCourses} active course${stats.activeCourses !== 1 ? 's' : ''}.` : ' Start learning today.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{stats.totalHoursSpent}h</div>
                    <div className="text-sm opacity-90">Total Study Time</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{stats.averageProgress}%</div>
                    <div className="text-sm opacity-90">Average Progress</div>
                  </div>
                </div>
              </div>
              <div className="absolute right-4 top-4 opacity-20">
                <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center">
                  <BookOpen className="w-16 h-16" />
                </div>
              </div>
            </div>

            {/* My Courses */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">My Active Courses</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/learner/learning/courses">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-4" />
                          <Skeleton className="w-16 h-2 rounded-full" />
                          <Skeleton className="w-8 h-4" />
                          <Skeleton className="w-24 h-8 rounded" />
                        </div>
                      </div>
                    ))
                  ) : enrollments.length > 0 ? (
                    enrollments.map((enrollment) => {
                      const rating = getRating(enrollment.course.average_rating)
                      return (
                        <div
                          key={enrollment.id}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center flex-shrink-0">
                            {enrollment.course.thumbnail_url && !imgErrors[enrollment.id] ? (
                              <img
                                src={enrollment.course.thumbnail_url}
                                alt={enrollment.course.title}
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(enrollment.id)}
                              />
                            ) : (
                              <BookOpen className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{enrollment.course.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.course.instructor ? 
                                `By ${enrollment.course.instructor.first_name} ${enrollment.course.instructor.last_name}` : 
                                'No instructor'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`px-2 py-0.5 rounded-full text-xs ${getLevelColor(enrollment.course.level)} text-white flex items-center gap-1`}>
                                {getLevelIcon(enrollment.course.level)}
                                {enrollment.course.level.charAt(0) + enrollment.course.level.slice(1).toLowerCase()}
                              </div>
                              <span className="text-xs px-2 py-0.5 bg-purple-500 text-white rounded-full">
                                {enrollment.course.course_type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium">
                                {rating > 0 ? rating.toFixed(1) : '0.0'}
                              </span>
                            </div>
                            <div className="w-16">
                              <Progress value={enrollment.progress_percentage} className="h-2" />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{enrollment.progress_percentage}%</span>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/courses/${enrollment.course.id}/learn`}>
                                {enrollment.status === "COMPLETED" ? "Review" : "Continue"}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-medium mb-2">No active courses</h4>
                      <p className="text-sm text-muted-foreground mb-4">Start learning by enrolling in a course</p>
                      <Button asChild>
                        <Link href="/courses">Browse Courses</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Section - Calendar and Stats */}
          <div className="space-y-6">
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {currentDateFormatted.month} {currentDate.getFullYear()}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentDateFormatted.day}, {currentDateFormatted.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Learning Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-sm font-medium">Courses Enrolled</span>
                  <span className="font-bold text-lg">{stats.totalCourses}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="font-bold text-lg text-green-600">{stats.completedCourses}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <span className="text-sm font-medium">In Progress</span>
                  <span className="font-bold text-lg text-blue-600">{stats.activeCourses}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <span className="text-sm font-medium">Certificates</span>
                  <span className="font-bold text-lg text-yellow-600">{stats.certificatesEarned}</span>
                </div>
                <Button className="w-full mt-2" asChild>
                  <Link href="/dashboard/learner/learning/courses">
                    <BookOpen className="w-4 h-4 mr-2" />
                    View All Courses
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}