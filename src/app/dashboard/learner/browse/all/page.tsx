"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  getAllCoursesWithFullInfo,
  getCourseCategories,
  Course,
} from "@/lib/features/courses/course-slice"
import {
  checkEnrollmentEligibility,
  requestEnrollmentApproval,
} from "@/lib/features/enrollments/enrollmentSlice"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Users,
  Award,
  Globe,
  Building2,
  BookOpen,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import toast from "react-hot-toast"
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d"

// Helper function to safely parse numbers
const parseNumber = (value: any): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export default function AllCoursesPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user, token } = useAuth()

  const { courses, categories, isLoading } = useAppSelector((state) => state.courses)
  const { isLoading: isEnrollmentLoading } = useAppSelector((state) => state.enrollments)

  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null)
  const [accessCodeModal, setAccessCodeModal] = useState<{ open: boolean; courseId: string }>({
    open: false,
    courseId: "",
  })
  const [accessCode, setAccessCode] = useState("")

  useEffect(() => {
    dispatch(getAllCoursesWithFullInfo({ limit: 50 }))
    dispatch(getCourseCategories({ active_only: true }))
  }, [dispatch])

  const filteredCourses = courses.filter((course) => {
    // Only show published courses
    const isPublished = course.status === "PUBLISHED"
    
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "mooc" && course.course_type === "MOOC") ||
      (activeTab === "spoc" && course.course_type === "SPOC") ||
      (activeTab === "free" && parseNumber(course.price) === 0) ||
      (activeTab === "certificate" && course.is_certificate_available)

    return isPublished && matchesSearch && matchesTab
  })

  const coursesByCategory = categories.reduce((acc, category) => {
    const categoryCourses = filteredCourses.filter(
      (course) => course.category_id === category.id
    )
    if (categoryCourses.length > 0) {
      acc[category.name] = categoryCourses
    }
    return acc
  }, {} as Record<string, Course[]>)

  const handleEnroll = async (course: Course) => {
    if (!user || !token) {
      toast.error("Please login to enroll in courses")
      router.push("/login")
      return
    }

    setEnrollingCourseId(course.id)

    try {
      const eligibilityResult = await dispatch(
        checkEnrollmentEligibility({ course_id: course.id })
      ).unwrap()

      const eligibility = eligibilityResult.eligibility

      if (!eligibility.eligible) {
        if (eligibility.requires_access_code) {
          setAccessCodeModal({ open: true, courseId: course.id })
          return
        }
        toast.error(`Not eligible: ${eligibility.reason}`)
        return
      }

      await dispatch(
        requestEnrollmentApproval({
          course_id: course.id,
          user_id: user.id,
          access_code: eligibility.requires_access_code ? undefined : undefined,
        })
      ).unwrap()

      toast.success(
        eligibility.requires_approval
          ? "Enrollment request submitted! Awaiting instructor approval."
          : "Successfully enrolled in course!"
      )

      if (!eligibility.requires_approval) {
        router.push(`/courses/${course.id}/learn`)
      }
    } catch (error: any) {
      toast.error(error || "Failed to enroll in course")
    } finally {
      setEnrollingCourseId(null)
    }
  }

  const handleAccessCodeSubmit = async () => {
    if (!accessCode.trim()) {
      toast.error("Please enter an access code")
      return
    }

    try {
      await dispatch(
        requestEnrollmentApproval({
          course_id: accessCodeModal.courseId,
          user_id: user?.id,
          access_code: accessCode,
        })
      ).unwrap()

      toast.success("Access code accepted! Enrollment request submitted.")
      setAccessCodeModal({ open: false, courseId: "" })
      setAccessCode("")
    } catch (error: any) {
      toast.error(error || "Invalid access code")
    }
  }

  const renderCourseCard = (course: Course, idx: number) => {
    const totalLessons = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || parseNumber(course.total_lessons) || 0

    return (
      <BwengeCourseCard3D
        key={course.id}
        id={course.id}
        title={course.title}
        description={course.description}
        short_description={course.short_description}
        thumbnail_url={course.thumbnail_url || undefined}
        instructor={course.instructor ? {
          id: course.instructor.id,
          first_name: course.instructor.first_name,
          last_name: course.instructor.last_name,
          profile_picture_url: course.instructor.profile_picture_url || undefined,
        } : undefined}
        level={course.level}
        course_type={course.course_type}
        price={parseNumber(course.price)}
        average_rating={parseNumber(course.average_rating)}
        total_reviews={parseNumber(course.total_reviews)}
        enrollment_count={parseNumber(course.enrollment_count)}
        duration_minutes={parseNumber(course.duration_minutes)}
        total_lessons={totalLessons}
        tags={course.tags}
        is_certificate_available={course.is_certificate_available}
        institution={course.institution ? {
          id: course.institution.id,
          name: course.institution.name,
          logo_url: course.institution.logo_url || undefined,
        } : undefined}
        category={course.course_category ? {
          id: course.course_category.id,
          name: course.course_category.name,
        } : undefined}
        variant="browse"
        showActions={true}
        showInstitution={true}
        index={idx}
        onLearnMoreClick={(id) => handleEnroll(course)}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary">Explore Our Courses</h1>
            </div>
            <p className="text-base text-muted-foreground max-w-3xl mx-auto mb-6">
              Discover interactive courses designed to help you learn, grow, and achieve your goals
            </p>

            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search courses, topics, or instructors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-card border-2 border-primary/20 rounded-full shadow-lg focus:outline-none focus:border-primary/50"
                />
                <Button size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full h-8">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:w-fit">
            <TabsTrigger value="all" className="flex items-center gap-2 text-sm">
              <BookOpen className="w-3.5 h-3.5" />
              All Courses
            </TabsTrigger>
            <TabsTrigger value="mooc" className="flex items-center gap-2 text-sm">
              <Globe className="w-3.5 h-3.5" />
              MOOCs
            </TabsTrigger>
            <TabsTrigger value="spoc" className="flex items-center gap-2 text-sm">
              <Building2 className="w-3.5 h-3.5" />
              SPOCs
            </TabsTrigger>
            <TabsTrigger value="free" className="flex items-center gap-2 text-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Free
            </TabsTrigger>
            <TabsTrigger value="certificate" className="flex items-center gap-2 text-sm">
              <Award className="w-3.5 h-3.5" />
              Certificate
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center justify-between mt-4 mb-6">
            <div className="text-sm text-muted-foreground font-medium">
              Showing <span className="text-primary font-semibold">{filteredCourses.length}</span> of {courses.filter(c => c.status === "PUBLISHED").length} courses
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1 text-xs font-medium">
                <Users className="w-3 h-3" />
                {courses.filter(c => c.status === "PUBLISHED").reduce((sum, c) => sum + parseNumber(c.enrollment_count), 0).toLocaleString()}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 text-xs font-medium">
                <Award className="w-3 h-3" />
                {courses.filter(c => c.status === "PUBLISHED" && c.is_certificate_available).length}
              </Badge>
            </div>
          </div>
        </Tabs>

        {Object.entries(coursesByCategory).map(([categoryName, categoryCourses]) => (
          <div key={categoryName} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{categoryName}</h2>
              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-sm font-medium">
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categoryCourses.map((course, idx) => renderCourseCard(course, idx))}
            </div>
          </div>
        ))}

        {filteredCourses.length > 0 && Object.keys(coursesByCategory).length === 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">All Available Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCourses.map((course, idx) => renderCourseCard(course, idx))}
            </div>
          </div>
        )}

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-muted/50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No courses found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters to find what you're looking for
            </p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setActiveTab("all")
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {accessCodeModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Enter Access Code</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              This course requires an access code to enroll. Please enter the code provided by your institution.
            </p>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code..."
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAccessCodeModal({ open: false, courseId: "" })
                  setAccessCode("")
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleAccessCodeSubmit} className="flex-1">
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}