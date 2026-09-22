"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  BookOpen,
  Users,
  Star,
  Clock,
  Play,
  Eye,
  TrendingUp,
  Search,
  Grid3X3,
  List,
  Trophy,
  Zap,
  Award,
  Globe,
  Lock,
  Target,
  BarChart,
  Edit,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import type { Course, CourseType, CourseLevel, CourseStatus } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useCourses as useCoursesContext } from "@/hooks/use-courses"
import { DashboardCourseCard } from "@/components/course/dashboard-course-card"
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d"

export default function CourseOverviewPage() {
  const router = useRouter()
  // Use the context hook correctly
  const { useInstructorCourses } = useCoursesContext()
  const { courses: contextCourses, loading: contextLoading } = useInstructorCourses()

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<CourseStatus | "all">("all")
  const [filterType, setFilterType] = useState<CourseType | "all">("all")
  const [filterLevel, setFilterLevel] = useState<CourseLevel | "all">("all")
  const [sortBy, setSortBy] = useState<"title" | "enrollment" | "rating" | "created" | "duration">("created")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)
  const { user } = useAuth()
  const institutionId = user?.primary_institution_id
  // Use context courses
  const courses = contextCourses || []
  const loading = contextLoading

  const filteredCourses = courses
    .filter((course: any) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.short_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.tags?.some((tag: any) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = filterStatus === "all" || course.status === filterStatus
      const matchesType = filterType === "all" || course.course_type === filterType
      const matchesLevel = filterLevel === "all" || course.level === filterLevel

      return matchesSearch && matchesStatus && matchesType && matchesLevel
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "enrollment":
          return (b.enrollment_count || 0) - (a.enrollment_count || 0)
        case "rating":
          return (b.average_rating || 0) - (a.average_rating || 0)
        case "duration":
          return (b.duration_minutes || 0) - (a.duration_minutes || 0)
        case "created":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterType, filterLevel, sortBy])

  const getLevelColor = (level: CourseLevel) => {
    switch (level) {
      case "BEGINNER":
        return "bg-success/15 text-success dark:bg-success/20/20 dark:text-success"
      case "INTERMEDIATE":
        return "bg-primary/15 text-primary dark:bg-primary/20/20 dark:text-primary"
      case "ADVANCED":
        return "bg-primary/15 text-primary dark:bg-primary/20/20 dark:text-primary"
      case "EXPERT":
        return "bg-destructive/15 text-destructive dark:bg-destructive/20/20 dark:text-destructive"
      default:
        return "bg-muted text-foreground dark:bg-card/20 dark:text-muted-foreground"
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatPrice = (price: number) => {
    if (price === 0 || price === null) return "Free"
    return `${price.toLocaleString()} RWF`
  }

  const renderCourseCard = (course: any, index: number) => {
    const avgRating = typeof course.average_rating === 'string'
      ? parseFloat(course.average_rating) || 0
      : course.average_rating || 0

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
        price={course.price || 0}
        average_rating={avgRating}
        total_reviews={course.total_reviews || 0}
        enrollment_count={course.enrollment_count || 0}
        duration_minutes={course.duration_minutes || 0}
        total_lessons={course.modules?.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0) || 0}
        tags={course.tags}
        is_certificate_available={course.is_certificate_available}
        is_popular={(course.enrollment_count || 0) > 200}
        institution={course.institution ? {
          id: course.institution.id,
          name: course.institution.name,
          logo_url: course.institution.logo_url || undefined,
        } : undefined}
        category={course.course_category ? {
          id: course.course_category.id,
          name: course.course_category.name,
        } : undefined}
        status={course.status}
        variant="admin"
        showActions={true}
        showInstitution={!!course.institution}
        index={index}
        onLearnMoreClick={(id) => router.push(`/dashboard/institution-admin/courses/${id}`)}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">Manage and track your course portfolio</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-secondary dark:bg-secondary" />
              <CardHeader>
                <div className="h-4 bg-secondary dark:bg-secondary rounded w-3/4" />
                <div className="h-3 bg-secondary dark:bg-secondary rounded w-full" />
                <div className="h-3 bg-secondary dark:bg-secondary rounded w-2/3" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">Manage and track your course portfolio</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/institution-admin/courses/create">
            <BookOpen className="w-4 h-4 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{courses.length}</div>
                <div className="text-sm text-muted-foreground">Total Courses</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-success" />
              <div>
                <div className="text-2xl font-bold">
                  {courses.reduce((acc, c) => acc + (c.enrollment_count || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
            </div>
          </CardContent>
        </Card>


<Card>
  <CardContent className="p-4">
    <div className="flex items-center gap-2">
      <Star className="w-8 h-8 text-warning" />
      <div>
        <div className="text-2xl font-bold">
          {courses.filter((c) => c.status === "PUBLISHED" && c.average_rating).length > 0
            ? (
                courses
                  .filter((c) => c.status === "PUBLISHED" && c.average_rating)
                  .reduce((acc, c) => {
                    const rating = typeof c.average_rating === 'string' 
                      ? parseFloat(c.average_rating) 
                      : c.average_rating || 0;
                    return acc + rating;
                  }, 0) /
                courses.filter((c) => c.status === "PUBLISHED" && c.average_rating).length
              ).toFixed(1)
            : "0.0"}
        </div>
        <div className="text-sm text-muted-foreground">Avg Rating</div>
      </div>
    </div>
  </CardContent>
</Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">
                  {courses.filter((c) => c.status === "PUBLISHED").length}
                </div>
                <div className="text-sm text-muted-foreground">Published</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 w-full lg:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search courses by title, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="MOOC">MOOC</SelectItem>
              <SelectItem value="SPOC">SPOC</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterLevel} onValueChange={(value: any) => setFilterLevel(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="BEGINNER">Beginner</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
              <SelectItem value="ADVANCED">Advanced</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Newest First</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
              <SelectItem value="enrollment">Most Students</SelectItem>
              <SelectItem value="rating">Highest Rating</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnimatePresence>
        {paginatedCourses.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedCourses.map((course, index) => (
                  renderCourseCard(course, index)
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedCourses.map((course, index) => (
                  <DashboardCourseCard
                    key={course.id}
                    course={course}
                    index={index}
                    variant="instructor"
                    showActions={true}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <PaginationEllipsis key={pageNum} />
                      }
                      return null
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterStatus !== "all" || filterType !== "all" || filterLevel !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first course to get started"}
            </p>
            {!searchTerm && filterStatus === "all" && filterType === "all" && filterLevel === "all" && (
              <Button asChild>
                <Link href="/dashboard/institution-admin/courses/create">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Your First Course
                </Link>
              </Button>
            )}
          </Card>
        )}
      </AnimatePresence>
    </div>
  )
}