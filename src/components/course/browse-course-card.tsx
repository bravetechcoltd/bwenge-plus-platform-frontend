"use client"

import { Clock, Eye, Lock, Users, BookOpen, Star, Award, User, Globe, Shield, Target, Trophy, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CourseType, CourseLevel } from "@/types"
import { motion } from "framer-motion"

interface BrowseCourseCardProps {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  instructor?: {
    id: string
    first_name: string
    last_name: string
    profile_picture_url?: string
  }
  course_type: CourseType
  level: CourseLevel
  language: string
  duration_minutes: number
  price: number
  enrollment_count: number
  average_rating: number
  total_reviews: number
  total_lessons: number
  category?: {
    id: string
    name: string
  }
  institution?: {
    id: string
    name: string
    logo_url?: string
  }
  is_certificate_available?: boolean
  tags?: string[]
  onLearnMoreClick?: (courseId: string) => void
}

export function BrowseCourseCard({
  id,
  title,
  description,
  thumbnail_url,
  instructor,
  course_type,
  level,
  language,
  duration_minutes,
  price,
  enrollment_count,
  average_rating,
  total_reviews,
  total_lessons,
  category,
  institution,
  is_certificate_available,
  tags = [],
  onLearnMoreClick,
}: BrowseCourseCardProps) {

  const getLevelIcon = (level: CourseLevel) => {
    switch (level) {
      case CourseLevel.BEGINNER: return <Target className="w-3 h-3" />
      case CourseLevel.INTERMEDIATE: return <Trophy className="w-3 h-3" />
      case CourseLevel.ADVANCED: return <Crown className="w-3 h-3" />
      case CourseLevel.EXPERT: return <Award className="w-3 h-3" />
      default: return <Target className="w-3 h-3" />
    }
  }

  const getLevelColor = (level: CourseLevel) => {
    switch (level) {
      case CourseLevel.BEGINNER: return "bg-emerald-500"
      case CourseLevel.INTERMEDIATE: return "bg-blue-500"
      case CourseLevel.ADVANCED: return "bg-purple-500"
      case CourseLevel.EXPERT: return "bg-pink-500"
      default: return "bg-gray-500"
    }
  }

  const getCourseTypeBadge = (type: CourseType) => {
    switch (type) {
      case CourseType.MOOC: return { text: "MOOC", color: "bg-blue-500", icon: Globe }
      case CourseType.SPOC: return { text: "SPOC", color: "bg-purple-500", icon: Shield }
      default: return { text: "Course", color: "bg-gray-500", icon: BookOpen }
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
    return `${mins}m`
  }

  const formatPrice = (price: number) => {
    if (price === 0) return "Free"
    return `${price.toLocaleString()} RWF`
  }

  const courseTypeBadge = getCourseTypeBadge(course_type)
  const TypeIcon = courseTypeBadge.icon

  const numericRating = typeof average_rating === 'string' ? parseFloat(average_rating) : average_rating
  const formattedRating = numericRating > 0 ? numericRating.toFixed(1) : "New"

  const handleClick = () => {
    if (onLearnMoreClick) onLearnMoreClick(id)
  }

  const defaultThumbnail = () => {
    const gradients = {
      [CourseLevel.BEGINNER]: "from-emerald-400 to-teal-600",
      [CourseLevel.INTERMEDIATE]: "from-blue-400 to-indigo-600",
      [CourseLevel.ADVANCED]: "from-purple-400 to-fuchsia-600",
      [CourseLevel.EXPERT]: "from-pink-400 to-rose-600",
    }
    const gradient = gradients[level] || "from-gray-400 to-gray-600"
    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <BookOpen className="w-16 h-16 text-white/30" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={handleClick}
    >
      {/* Course Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : defaultThumbnail()}

        {/* Course Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={`${courseTypeBadge.color} text-white shadow-lg flex items-center gap-1`}>
            <TypeIcon className="w-3 h-3" />
            {courseTypeBadge.text}
          </Badge>
        </div>

        {/* Level Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={`${getLevelColor(level)} text-white shadow-lg flex items-center gap-1`}>
            {getLevelIcon(level)}
            {level.charAt(0) + level.slice(1).toLowerCase()}
          </Badge>
        </div>

        {/* Institution Logo */}
        {institution?.logo_url && (
          <div className="absolute bottom-3 left-3">
            <div className="bg-white rounded-full p-1 shadow-lg">
              <img src={institution.logo_url} alt={institution.name} className="w-8 h-8 rounded-full object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* Course Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category and Rating */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {category && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {category.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs font-medium">{formattedRating}</span>
            <span className="text-xs text-gray-400">({total_reviews})</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2 leading-snug">
          {title}
        </h3>

        {/* Instructor */}
        {instructor && (
          <div className="flex items-center gap-2 mb-2">
            {instructor.profile_picture_url ? (
              <img src={instructor.profile_picture_url} alt={`${instructor.first_name} ${instructor.last_name}`} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-3 h-3 text-blue-600" />
              </div>
            )}
            <span className="text-xs text-gray-600">{instructor.first_name} {instructor.last_name}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">
          {description}
        </p>

        {/* Course Stats */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span>{enrollment_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(duration_minutes)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <BookOpen className="w-3 h-3" />
            <span>{total_lessons} lessons</span>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {tag}
              </span>
            ))}
            {tags.length > 3 && <span className="text-xs text-gray-400">+{tags.length - 3}</span>}
          </div>
        )}

        {/* Footer: Badges + Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {is_certificate_available && (
              <Badge variant="outline" className="text-xs border-yellow-200 bg-yellow-50 text-yellow-700">
                <Award className="w-3 h-3 mr-1" />
                Certificate
              </Badge>
            )}
            {language && (
              <Badge variant="outline" className="text-xs border-gray-200 bg-gray-50 text-gray-600">
                {language}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {price === 0 ? (
              <Badge className="bg-green-600 text-white">Free</Badge>
            ) : (
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-yellow-600" />
                <span className="text-sm font-bold text-yellow-600">{formatPrice(price)}</span>
              </div>
            )}
          </div>
        </div>

        {/* View Course Button - ALWAYS VISIBLE */}
        <Button
          className="w-full bg-primary text-white hover:bg-primary/90 transition-colors"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleClick() }}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Course Details
        </Button>
      </div>
    </motion.div>
  )
}