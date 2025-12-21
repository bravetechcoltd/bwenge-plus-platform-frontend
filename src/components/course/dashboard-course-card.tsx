"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, BookOpen, Clock, Play, Share2, Edit, BarChart, Lock, Globe, Star } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Course, CourseType, CourseLevel, CourseStatus } from "@/types"

interface DashboardCourseCardProps {
  course: Course
  index?: number
  variant?: "dashboard" | "admin" | "browse" | "student" | "instructor"
  showActions?: boolean
  onAnalytics?: (courseId: string) => void
  onShare?: (courseId: string) => void
}

export function DashboardCourseCard({
  course,
  index = 0,
  variant = "dashboard",
  showActions = true,
  onAnalytics,
  onShare,
}: DashboardCourseCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatWeeks = (minutes: number) => {
    // Assuming 5 hours per week of study
    const weeks = Math.ceil(minutes / (5 * 60))
    return `${weeks} week${weeks !== 1 ? "s" : ""}`
  }

  const getLevelColor = (level: CourseLevel) => {
    switch (level) {
      case CourseLevel.BEGINNER:
        return "bg-emerald-500 hover:bg-emerald-600 text-white"
      case CourseLevel.INTERMEDIATE:
        return "bg-blue-500 hover:bg-blue-600 text-white"
      case CourseLevel.ADVANCED:
        return "bg-purple-500 hover:bg-purple-600 text-white"
      case CourseLevel.EXPERT:
        return "bg-red-500 hover:bg-red-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.PUBLISHED:
        return "bg-green-500 hover:bg-green-600 text-white"
      case CourseStatus.DRAFT:
        return "bg-yellow-500 hover:bg-yellow-600 text-white"
      case CourseStatus.ARCHIVED:
        return "bg-gray-500 hover:bg-gray-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  const getCourseTypeIcon = (type: CourseType) => {
    switch (type) {
      case CourseType.MOOC:
        return <Globe className="w-3 h-3" />
      case CourseType.SPOC:
        return <Lock className="w-3 h-3" />
      default:
        return <BookOpen className="w-3 h-3" />
    }
  }

  const getBasePath = () => {
    switch (variant) {
      case "admin":
        return "/sysAdmin/courses"
      case "instructor":
        return "/instructor/courses"
      case "dashboard":
      case "student":
      default:
        return "/dashboard/courses"
    }
  }

  const basePath = getBasePath()

  const renderButtons = () => {
    if (variant === "browse" || variant === "student") {
      return (
        <Button className="w-full" asChild>
          <Link href={`/courses/${course.id}`}>
            <Play className="w-4 h-4 mr-2" />
            {variant === "student" ? "Continue Learning" : "View Course"}
          </Link>
        </Button>
      )
    }

    if (variant === "admin") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`${basePath}/${course.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`${basePath}/${course.id}`}>
              <BarChart className="w-4 h-4 mr-2" />
              Analytics
            </Link>
          </Button>
        </div>
      )
    }

    return (
      <Button className="w-full" asChild>
        <Link href={`${basePath}/${course.id}`}>
          <Play className="w-4 h-4 mr-2" />
          {course.status === CourseStatus.DRAFT ? "Edit Course" : "Manage Course"}
        </Link>
      </Button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="overflow-hidden hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full pt-0">
        {/* Image Section with Badges */}
        <div className="relative overflow-hidden">
          <img
            src={course.thumbnail_url || "/placeholder.svg"}
            alt={course.title}
            className="w-full h-56 object-cover"
          />
          
          {/* Status Badge - Top Left */}
          <div className="absolute top-3 left-3">
            <Badge className={`${getStatusColor(course.status)} rounded`}>
              {course.status}
            </Badge>
          </div>
          
          {/* Level Badge - Top Right */}
          <div className="absolute top-3 right-3">
            <Badge className={`${getLevelColor(course.level)} rounded flex items-center gap-1`}>
              {course.level}
            </Badge>
          </div>

          {/* Share Button */}
          {onShare && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white"
              onClick={() => onShare(course.id)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <CardHeader className="pb-3 space-y-2">
          {/* Course Type and Institution */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getCourseTypeIcon(course.course_type)}
              <span className="font-medium">{course.course_type}</span>
              <span>|</span>
              {course.institution && (
                <span className="truncate max-w-[150px]">{course.institution.name}</span>
              )}
            </div>
            {course.is_certificate_available && (
              <Badge variant="outline" className="text-xs">
                Certificate
              </Badge>
            )}
          </div>

          {/* Course Title */}
          <CardTitle className="text-xl line-clamp-2 leading-tight">
            {course.title}
          </CardTitle>

          {/* Course Description */}
          <CardDescription className="line-clamp-2 text-sm leading-relaxed">
            {course.short_description || course.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 mt-auto">
          {/* Duration and Price */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{course.duration_minutes > 0 ? formatWeeks(course.duration_minutes) : "Self-paced"}</span>
            </div>
            
            <div className="flex items-center gap-1 text-sm font-semibold">
              {course.price === 0 || course.price === null ? (
                "Free"
              ) : (
                `${course.price.toLocaleString()} RWF`
              )}
            </div>
          </div>


{/* Additional Info */}
{(variant === "dashboard" || variant === "admin" || variant === "instructor") && (
  <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
    <div className="flex items-center gap-1">
      <Users className="w-4 h-4" />
      <span>{course.enrollment_count} enrolled</span>
    </div>
    <div className="flex items-center gap-1">
      <BookOpen className="w-4 h-4" />
      <span>{course.total_lessons} lessons</span>
    </div>
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4" />
      <span>
        {typeof course.average_rating === 'string' 
          ? parseFloat(course.average_rating).toFixed(1) 
          : course.average_rating?.toFixed(1) || "0.0"}
      </span>
    </div>
  </div>
)}

          {/* Action Button */}
          {showActions && (
            <div className="mt-4">
              {renderButtons()}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}