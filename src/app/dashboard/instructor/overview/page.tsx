// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BookOpen,
  Users,
  Star,
  Clock,
  Play,
  Edit,
  Eye,
  TrendingUp,
  Search,
  Filter,
  Grid3X3,
  List,
  Trophy,
  Target,
  Zap,
  Award,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CourseLevel, type Course } from "@/types"
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d"

export default function CourseOverviewPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all")
  const [sortBy, setSortBy] = useState<"title" | "students" | "rating" | "created">("created")
  const [loading, setLoading] = useState(true)

  // Mock data - replace with real API call
  useEffect(() => {
    const mockCourses: Course[] = [
      {
        id: "1",
        title: "Complete React Development Bootcamp",
        description:
          "Master React from basics to advanced concepts with hands-on projects and real-world applications.",
        thumbnail: "/react-development-course.png",
        level: CourseLevel.INTERMEDIATE,
        price: 99.99,
        isPublished: true,
        duration: 2400, // 40 hours
        enrollmentCount: 324,
        rating: 4.9,
        tags: ["React", "JavaScript", "Web Development", "Frontend"],
        instructorId: "instructor-1",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-03-10"),
        modules: [
          {
            id: "m1",
            title: "React Fundamentals",
            description: "",
            order: 1,
            courseId: "1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "m2",
            title: "State Management",
            description: "",
            order: 2,
            courseId: "1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "m3",
            title: "Advanced Patterns",
            description: "",
            order: 3,
            courseId: "1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
      {
        id: "2",
        title: "Advanced JavaScript Mastery",
        description: "Deep dive into JavaScript concepts, ES6+, async programming, and modern development patterns.",
        thumbnail: "https://bairesdev.mo.cloudinary.net/blog/2023/08/What-Is-JavaScript-Used-For.jpg",
        level: CourseLevel.ADVANCED,
        price: 129.99,
        isPublished: true,
        duration: 1800, // 30 hours
        enrollmentCount: 256,
        rating: 4.7,
        tags: ["JavaScript", "ES6", "Async", "Programming"],
        instructorId: "instructor-1",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-03-08"),
        modules: [
          {
            id: "m4",
            title: "Advanced Functions",
            description: "",
            order: 1,
            courseId: "2",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "m5",
            title: "Async Programming",
            description: "",
            order: 2,
            courseId: "2",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
      {
        id: "3",
        title: "Node.js Backend Development",
        description: "Build scalable backend applications with Node.js, Express, and modern database technologies.",
        thumbnail: "/nodejs-backend-development.jpg",
        level: CourseLevel.ADVANCED,
        price: 89.99,
        isPublished: false,
        duration: 0,
        enrollmentCount: 0,
        rating: 0,
        tags: ["Node.js", "Backend", "API", "Database"],
        instructorId: "instructor-1",
        createdAt: new Date("2024-03-15"),
        updatedAt: new Date("2024-03-15"),
        modules: [],
      },
    ]

    setTimeout(() => {
      setCourses(mockCourses)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredCourses = courses
    .filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "published" && course.isPublished) ||
        (filterStatus === "draft" && !course.isPublished)

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "students":
          return b.enrollmentCount - a.enrollmentCount
        case "rating":
          return b.rating - a.rating
        case "created":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-success/15 text-success dark:bg-success/20/20 dark:text-success"
      case "intermediate":
        return "bg-warning/15 text-warning dark:bg-warning/20/20 dark:text-warning"
      case "advanced":
        return "bg-destructive/15 text-destructive dark:bg-destructive/20/20 dark:text-destructive"
      default:
        return "bg-muted text-foreground dark:bg-card/20 dark:text-muted-foreground"
    }
  }

  const renderCourseCard = (course: Course, index: number) => (
    <BwengeCourseCard3D
      key={course.id}
      id={course.id}
      title={course.title}
      description={course.description}
      thumbnail_url={course.thumbnail || undefined}
      level={course.level?.toUpperCase()}
      price={course.price}
      average_rating={course.rating || 0}
      enrollment_count={course.enrollmentCount || 0}
      duration_minutes={course.duration || 0}
      total_lessons={course.modules?.length || 0}
      tags={course.tags}
      status={course.isPublished ? "PUBLISHED" : "DRAFT"}
      is_popular={course.enrollmentCount > 200}
      variant="instructor"
      showActions={true}
      showInstitution={false}
      index={index}
      onLearnMoreClick={(id) => router.push(`/dashboard/instructor/courses/${id}`)}
    />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">Manage and track your course portfolio</p>
        </div>
        <Button asChild>
          <Link href="/instructor/courses/create">
            <BookOpen className="w-4 h-4 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
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
                <div className="text-2xl font-bold">{courses.reduce((acc, c) => acc + c.enrollmentCount, 0)}</div>
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
                  {courses.filter((c) => c.isPublished).length > 0
                    ? (
                        courses.filter((c) => c.isPublished).reduce((acc, c) => acc + c.rating, 0) /
                        courses.filter((c) => c.isPublished).length
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
                <div className="text-2xl font-bold">{courses.filter((c) => c.isPublished).length}</div>
                <div className="text-sm text-muted-foreground">Published</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Latest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="students">Students</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Courses Grid */}
      <AnimatePresence>
        {filteredCourses.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-4"}>
            {filteredCourses.map((course, index) => (
              renderCourseCard(course, index)
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first course to get started"}
            </p>
            {!searchTerm && filterStatus === "all" && (
              <Button asChild>
                <Link href="/instructor/courses/create">
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
