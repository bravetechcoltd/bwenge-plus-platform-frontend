"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Users, Play, BookOpen, Award, Lock, Globe } from "lucide-react"
import Link from "next/link"
import { CourseType, CourseLevel } from "@/types"

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    short_description?: string
    thumbnail_url?: string
    instructor?: {
      first_name: string
      last_name: string
      profile_picture_url?: string
    }
    level: CourseLevel
    course_type: CourseType
    price: number
    original_price?: number
    average_rating: number
    total_reviews: number
    enrollment_count: number
    duration_minutes: number
    total_lessons: number
    tags: string[]
    is_popular?: boolean
    is_certificate_available?: boolean
    institution?: {
      name: string
      logo_url?: string
    }
    status?: string
  }
  showActions?: boolean
  showInstitution?: boolean
}

export function CourseCard({ course, showActions = true, showInstitution = true }: CourseCardProps) {
  const getLevelColor = (level: CourseLevel) => {
    switch (level) {
      case CourseLevel.BEGINNER:
        return "bg-success/100 hover:bg-success"
      case CourseLevel.INTERMEDIATE:
        return "bg-primary hover:bg-primary"
      case CourseLevel.ADVANCED:
        return "bg-primary/100 hover:bg-primary"
      case CourseLevel.EXPERT:
        return "bg-destructive/100 hover:bg-destructive"
      default:
        return "bg-muted/500 hover:bg-secondary"
    }
  }

  const getCourseTypeIcon = (type: CourseType) => {
    switch (type) {
      case CourseType.MOOC:
        return <Globe className="w-4 h-4" />
      case CourseType.SPOC:
        return <Lock className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
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
    if (price === 0) return "Free"
    return `${price.toLocaleString()} RWF`
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col">
      <div className="relative">
        <img
          src={course.thumbnail_url || "/placeholder.svg"}
          alt={course.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge className={`${getLevelColor(course.level)} text-white`}>
            {course.level}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            {getCourseTypeIcon(course.course_type)}
            {course.course_type}
          </Badge>
        </div>
        {course.is_popular && (
          <Badge className="absolute top-2 right-2 bg-warning/100 hover:bg-warning">
            Popular
          </Badge>
        )}
        {showActions && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
              <Link href={`/courses/${course.id}`}>
                <Play className="w-4 h-4 mr-2" />
                Preview
              </Link>
            </Button>
          </div>
        )}
      </div>

      <CardHeader className="pb-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-warning" />
            <span className="text-sm font-medium">{course.average_rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({course.total_reviews})</span>
          </div>
          {course.is_certificate_available && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Award className="w-3 h-3" />
              Certificate
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-sm">
          {course.short_description || course.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 mt-auto">
        {/* Instructor and Institution */}
        <div className="flex items-center justify-between mb-3">
          {course.instructor && (
            <div className="flex items-center gap-2">
              <img
                src={course.instructor.profile_picture_url || "/placeholder.svg"}
                alt={`${course.instructor.first_name} ${course.instructor.last_name}`}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-muted-foreground">
                {course.instructor.first_name} {course.instructor.last_name}
              </span>
            </div>
          )}
          {showInstitution && course.institution && (
            <div className="flex items-center gap-1">
              {course.institution.logo_url && (
                <img
                  src={course.institution.logo_url}
                  alt={course.institution.name}
                  className="w-4 h-4 rounded"
                />
              )}
              <span className="text-xs text-muted-foreground">{course.institution.name}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {course.enrollment_count.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {course.total_lessons} lessons
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDuration(course.duration_minutes)}
          </div>
        </div>

        {/* Tags */}
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {course.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {course.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{course.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Price and Action */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">{formatPrice(course.price)}</span>
            {course.original_price && course.original_price > course.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(course.original_price)}
              </span>
            )}
          </div>
          {showActions && (
            <Button size="sm" asChild>
              <Link href={`/courses/${course.id}`}>
                {course.status === "DRAFT" ? "Edit Course" : "View Course"}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}