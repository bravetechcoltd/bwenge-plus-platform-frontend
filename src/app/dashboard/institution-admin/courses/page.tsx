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
import { motion, AnimatePresence } from "framer-motion"
import type { Course, CourseType, CourseLevel, CourseStatus } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useCourses as useCoursesContext } from "@/hooks/use-courses"
import { DashboardCourseCard } from "@/components/course/dashboard-course-card"

export default function CourseOverviewPage() {
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
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "INTERMEDIATE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "ADVANCED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "EXPERT":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
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

  const CourseCard = ({ course, index }: { course: Course; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="group h-full"
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-primary/20 relative pt-0 flex flex-col h-full">
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          <Badge className={`${
            course.status === "PUBLISHED" 
              ? "bg-green-500 hover:bg-green-600 animate-pulse" 
              : course.status === "DRAFT" 
                ? "bg-yellow-500 hover:bg-yellow-600" 
                : "bg-gray-500 hover:bg-gray-600"
          }`}>
            {course.status === "PUBLISHED" ? (
              <>
                <Zap className="w-3 h-3 mr-1" />
                Live
              </>
            ) : course.status}
          </Badge>

          <Badge variant="outline" className="flex items-center gap-1">
            {course.course_type === "MOOC" ? (
              <>
                <Globe className="w-3 h-3" />
                MOOC
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                SPOC
              </>
            )}
          </Badge>

          {course.average_rating >= 4.8 && (
            <Badge className="bg-yellow-500 hover:bg-yellow-600">
              <Trophy className="w-3 h-3 mr-1" />
              Top Rated
            </Badge>
          )}

          {(course.enrollment_count || 0) > 200 && (
            <Badge className="bg-purple-500 hover:bg-purple-600">
              <Award className="w-3 h-3 mr-1" />
              Popular
            </Badge>
          )}
        </div>

        <div className="relative overflow-hidden">
          <img
            src={course.thumbnail_url || "/placeholder.svg"}
            alt={course.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button size="sm" className="bg-white/90 text-gray-900 hover:bg-white" asChild>
              <Link href={`/institution-admin/courses/${course.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/90 border-white/90 text-gray-900 hover:bg-white"
              asChild
            >
              <Link href={`/institution-admin/courses/${course.id}/analytics`}>
                <BarChart className="w-4 h-4 mr-2" />
                Analytics
              </Link>
            </Button>
          </div>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge className={getLevelColor(course.level)}>
              {course.level.charAt(0).toUpperCase() + course.level.slice(1).toLowerCase()}
            </Badge>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                {formatPrice(course.price || 0)}
              </div>


              {course.status === "PUBLISHED" && course.average_rating && (
  <div className="flex items-center gap-1 text-sm">
    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
    <span className="font-medium">
      {typeof course.average_rating === 'string' 
        ? parseFloat(course.average_rating).toFixed(1) 
        : course.average_rating.toFixed(1)}
    </span>
    <span className="text-muted-foreground">({course.total_reviews || 0})</span>
  </div>
)}
            </div>
          </div>

          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
            {course.short_description || course.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex flex-col">
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{course.enrollment_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>{course.modules?.length || 0} modules</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{course.duration_minutes ? formatDuration(course.duration_minutes) : "Not Set"}</span>
            </div>
          </div>

          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {course.tags.slice(0, 3).map((tag, tagIndex) => (
                <Badge key={tagIndex} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {course.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{course.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {course.institution && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <div className="w-6 h-6 rounded-full overflow-hidden">
                {course.institution.logo_url ? (
                  <img
                    src={course.institution.logo_url}
                    alt={course.institution.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <Globe className="w-3 h-3 text-gray-500" />
                  </div>
                )}
              </div>
              <span className="text-muted-foreground truncate">{course.institution.name}</span>
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            <Button className="flex-1" asChild>
              <Link href={`/dashboard/institution-admin/courses/${course.id}`}>
                <Play className="w-4 h-4 mr-2" />
                Manage
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/institution-admin/courses/${course.id}/analytics`}>
                <TrendingUp className="w-4 h-4" />
              </Link>
            </Button>
            {course.status === "DRAFT" && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/institution-admin/courses/${course.id}`}>
                  <Edit className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

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
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700" />
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
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
              <Users className="w-8 h-8 text-green-500" />
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
      <Star className="w-8 h-8 text-yellow-500" />
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
              <Target className="w-8 h-8 text-purple-500" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCourses.map((course, index) => (
                  <CourseCard key={course.id} course={course} index={index} />
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