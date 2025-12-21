"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Star,
  Clock,
  BookOpen,
  Trophy,
  Target,
  Crown,
  Award,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Calendar,
  BookmarkCheck,
  GraduationCap,
  User,
  AlertCircle,
  Loader2,
  Sparkles,
  Code,
  Palette,
  BarChart,
  Briefcase,
  Globe,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import type { RootState, AppDispatch } from "@/lib/store"
import Cookies from "js-cookie"
import { toast } from "sonner"

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

const formatRating = (rating: number | string | undefined | null): string => {
  if (rating === undefined || rating === null || rating === "") {
    return "No ratings"
  }
  
  try {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    if (isNaN(numRating)) {
      return "No ratings";
    }
    return numRating.toFixed(1);
  } catch (error) {
    return "No ratings";
  }
}

const getNumericRating = (rating: number | string | undefined | null): number => {
  if (rating === undefined || rating === null || rating === "") {
    return 0;
  }
  
  try {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(numRating) ? 0 : numRating;
  } catch (error) {
    return 0;
  }
}

const stripHtml = (input: string | undefined | null): string => {
  if (!input) return ""

  if (typeof window !== "undefined" && window.DOMParser) {
    try {
      const doc = new DOMParser().parseFromString(input, "text/html")
      return doc.body.textContent || ""
    } catch (error) {
      return input.replace(/<[^>]*>/g, "")
    }
  }

  return input.replace(/<[^>]*>/g, "")
}

const truncate = (text: string, maxLength = 140) => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

// Default Thumbnail Component
const DefaultCourseThumbnail = ({ title, level, courseType }: { title: string; level: string; courseType: string }) => {
  const getIconByTitle = () => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('code') || lowerTitle.includes('programming') || lowerTitle.includes('develop')) {
      return Code;
    } else if (lowerTitle.includes('design') || lowerTitle.includes('art') || lowerTitle.includes('creative')) {
      return Palette;
    } else if (lowerTitle.includes('business') || lowerTitle.includes('management') || lowerTitle.includes('marketing')) {
      return Briefcase;
    } else if (lowerTitle.includes('data') || lowerTitle.includes('analytics') || lowerTitle.includes('statistics')) {
      return BarChart;
    } else if (lowerTitle.includes('language') || lowerTitle.includes('communication')) {
      return Globe;
    }
    return GraduationCap;
  };

  const getGradientByLevel = () => {
    switch (level) {
      case "BEGINNER":
        return "from-green-400 via-emerald-500 to-teal-600";
      case "INTERMEDIATE":
        return "from-blue-400 via-cyan-500 to-sky-600";
      case "ADVANCED":
      case "EXPERT":
        return "from-[#5b4e96] via-[#6d5ba8] to-[#7e6bb9]";
      default:
        return "from-gray-400 via-gray-500 to-gray-600";
    }
  };

  const IconComponent = getIconByTitle();
  const gradientColors = getGradientByLevel();

  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradientColors} relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Sparkles className="w-24 h-24 text-white animate-pulse" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 border-2 border-white/30 shadow-lg">
          <IconComponent className="w-10 h-10 text-white" />
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">{courseType}</p>
        </div>
      </div>
    </div>
  );
};

export default function MyCoursesPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { user: reduxUser, isAuthenticated, token: reduxToken } = useSelector((state: RootState) => state.bwengeAuth)
  
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<"all" | "active" | "completed" | "pending">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)

  // Get user and token from multiple sources
  const getUser = () => {
    // First try Redux
    if (reduxUser && reduxUser.id) {
      return reduxUser
    }
    
    // Then try cookies
    const userCookie = Cookies.get("bwenge_user")
    if (userCookie) {
      try {
        return JSON.parse(userCookie)
      } catch (e) {
        return null
      }
    }
    
    // Then try localStorage
    try {
      const localUser = localStorage.getItem("bwengeplus_user")
      if (localUser) {
        return JSON.parse(localUser)
      }
    } catch (e) {
      return null
    }
    
    return null
  }

  const getToken = () => {
    // First try Redux
    if (reduxToken) {
      return reduxToken
    }
    
    // Then try cookies
    const tokenCookie = Cookies.get("bwenge_token")
    if (tokenCookie) {
      return tokenCookie
    }
    
    // Then try localStorage
    try {
      return localStorage.getItem("bwengeplus_token")
    } catch (e) {
      return null
    }
  }

  const user = getUser()
  const token = getToken()

  useEffect(() => {
    // Check authentication status
    if (user && token) {
      setAuthChecked(true)
      fetchEnrolledCourses()
    } else if (!isAuthenticated && !user && !token) {
      // Wait a bit to see if auth state updates
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
      console.log("⚠️ No user or token available")
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const authToken = currentToken

      console.log("🔄 Fetching enrollments for user:", currentUser.id)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          include_course_details: true,
          page: 1,
          limit: 100
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 401) {
          toast.error("Your session has expired. Please login again.")
          // Clear expired tokens
          Cookies.remove("bwenge_token")
          Cookies.remove("bwenge_user")
          localStorage.removeItem("bwengeplus_token")
          localStorage.removeItem("bwengeplus_user")
          router.push("/login")
        } else if (response.status === 403) {
          toast.error("You don't have permission to view these enrollments")
        } else {
          throw new Error(
            errorData.message || 
            `Failed to fetch enrollments: ${response.status} ${response.statusText}`
          )
        }
        setEnrollments([])
        setLoading(false)
        return
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        console.log(`📚 Found ${data.data.length} enrollments`)
        setEnrollments(data.data || [])
      } else {
        console.warn("⚠️ No enrollments found or invalid response format")
        if (data.message) {
          toast.error(data.message)
        }
        setEnrollments([])
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch enrolled courses:", error)
      toast.error(`Failed to load courses: ${error.message}`)
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    console.log("🔄 Retrying fetch...")
    setRetryCount(prev => prev + 1)
  }

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case "ACTIVE":
        return <PlayCircle className="w-3 h-3 text-blue-500" />
      case "PENDING":
        return <PauseCircle className="w-3 h-3 text-yellow-500" />
      case "EXPIRED":
      case "DROPPED":
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return <BookOpen className="w-3 h-3 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500 hover:bg-green-600"
      case "ACTIVE":
        return "bg-blue-500 hover:bg-blue-600"
      case "PENDING":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "EXPIRED":
      case "DROPPED":
        return "bg-red-500 hover:bg-red-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
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
        return "bg-[#5b4e96] hover:bg-[#6d5ba8]"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex justify-center items-center h-screen">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-base">Loading your courses...</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Fetching your learning progress
            </p>
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
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-2xl -z-10"></div>
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
              {searchTerm 
                ? "No courses match your search. Try different keywords."
                : "You haven't enrolled in any courses yet. Start your learning journey by exploring available courses."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="sm">
                <Link href="/courses">
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
        <div className="text-center relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-2xl -z-10"></div>
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              <div className="bg-card border-2 border-primary/10 rounded-lg p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="text-xl font-bold text-primary">{enrollments.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>

              <div className="bg-card border-2 border-green-500/10 rounded-lg p-3 hover:border-green-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xl font-bold text-green-600">
                    {enrollments.filter((c) => c.status === "COMPLETED").length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>

              <div className="bg-card border-2 border-blue-500/10 rounded-lg p-3 hover:border-blue-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <PlayCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-xl font-bold text-blue-600">
                    {enrollments.filter((c) => c.status === "ACTIVE").length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>

              <div className="bg-card border-2 border-yellow-500/10 rounded-lg p-3 hover:border-yellow-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-xl font-bold text-yellow-600">
                    {enrollments.filter((c) => c.certificate_issued).length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Certificates</p>
              </div>
            </div>
          </div>
        </div>

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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <Loader2 className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "all" | "active" | "completed" | "pending")} className="w-full">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredEnrollments.map((enrollment) => {
                  const numericRating = getNumericRating(enrollment.course.average_rating);
                  const formattedRating = formatRating(enrollment.course.average_rating);
                  const cleanDescriptionText = truncate(stripHtml(enrollment.course.description));
                  
                  return (
                    <Card
                      key={enrollment.id}
                      className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden py-0 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20"
                    >
                    <div className="relative">
                      {enrollment.course.thumbnail_url ? (
                        <img
                          src={enrollment.course.thumbnail_url}
                          alt={enrollment.course.title}
                          className="w-full h-44 object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-44 overflow-hidden">
                          <DefaultCourseThumbnail 
                            title={enrollment.course.title}
                            level={enrollment.course.level}
                            courseType={enrollment.course.course_type}
                          />
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <Badge className={`${getStatusColor(enrollment.status)} shadow-md flex items-center gap-1 text-xs py-0.5 px-2`}>
                            {getStatusIcon(enrollment.status)}
                            {enrollment.status.replace("_", " ").toUpperCase()}
                          </Badge>
                          {enrollment.certificate_issued && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 shadow-md text-xs py-0.5 px-2">
                              <Award className="w-3 h-3 mr-1" />
                              Certified
                            </Badge>
                          )}
                        </div>
                        <Progress value={enrollment.progress_percentage} className="h-1.5 bg-white/20" />
                        <p className="text-white text-xs mt-1.5 font-medium">{enrollment.progress_percentage}% Complete</p>
                      </div>

                      <div className="absolute top-2 left-2">
                        <Badge
                          className={`${getLevelColor(enrollment.course.level)} shadow-md flex items-center gap-1 text-xs py-0.5 px-2`}
                        >
                          {getLevelIcon(enrollment.course.level)}
                          {enrollment.course.level.charAt(0).toUpperCase() + enrollment.course.level.slice(1).toLowerCase()}
                        </Badge>
                      </div>

                      <div className="absolute top-2 right-2">
                        <Badge className="bg-[#5b4e96] hover:bg-[#6d5ba8] shadow-md text-xs py-0.5 px-2">
                          {enrollment.course.course_type}
                        </Badge>
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                        <Button
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100 bg-primary/90 hover:bg-primary shadow-lg h-8 text-xs"
                          asChild
                          disabled={enrollment.status === "EXPIRED" || enrollment.status === "DROPPED"}
                        >
                          <Link href={`/courses/${enrollment.course.id}/learn`}>
                            {enrollment.status === "EXPIRED" || enrollment.status === "DROPPED" ? (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                                Access {enrollment.status === "EXPIRED" ? "Expired" : "Revoked"}
                              </>
                            ) : enrollment.status === "PENDING" ? (
                              <>
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                Awaiting Approval
                              </>
                            ) : enrollment.status === "COMPLETED" ? (
                              <>
                                <BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />
                                Review Course
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                                Continue Learning
                              </>
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.round(numericRating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-300 text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {formattedRating} 
                            ({enrollment.course.total_reviews || 0})
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </div>
                      </div>
                      <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                        {enrollment.course.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-600 line-clamp-2">
                        {cleanDescriptionText || "No course description available"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        {enrollment.course.instructor?.profile_picture_url ? (
                          <img
                            src={enrollment.course.instructor.profile_picture_url}
                            alt={`${enrollment.course.instructor.first_name} ${enrollment.course.instructor.last_name}`}
                            className="w-5 h-5 rounded-full border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-primary/20 flex items-center justify-center">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                        )}

                        <div className="flex items-center gap-0.5">
                          <span className="text-xs font-medium text-primary">
                            {enrollment.course.instructor?.first_name} {enrollment.course.instructor?.last_name}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 mb-2.5 text-[11px]">
                        <div className="flex items-center gap-1 p-1.5 bg-muted/50 rounded-md">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span className="font-medium">
                            {enrollment.total_time_spent_minutes || 0} min
                          </span>
                        </div>
                        <div className="flex items-center gap-1 p-1.5 bg-muted/50 rounded-md">
                          <Target className="w-3 h-3 text-orange-500" />
                          <span className="font-medium">{enrollment.course.language || "English"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-muted-foreground">
                          {enrollment.last_accessed 
                            ? `Last: ${new Date(enrollment.last_accessed).toLocaleDateString()}`
                            : "Never accessed"
                          }
                        </div>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-md rounded h-7 text-xs px-3" asChild>
                          <Link href={`/courses/${enrollment.course.id}/learn`}>
                            {enrollment.status === "COMPLETED" ? "Review" : "Continue"}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )})}
              </div>

              {filteredEnrollments.length === 0 && (
                <div className="text-center py-8">
                  <div className="bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                    {selectedTab === "all" ? "No enrollments found" : `No ${selectedTab} enrollments`}
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
                      <Link href="/courses">
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