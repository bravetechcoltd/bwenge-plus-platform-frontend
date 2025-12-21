"use client"

import { Clock, Users, BookOpen, Star, Award, User, Globe, Shield, Target, Trophy, Crown, Eye, Play, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      case CourseLevel.BEGINNER: return <Target className="w-3.5 h-3.5" />
      case CourseLevel.INTERMEDIATE: return <Trophy className="w-3.5 h-3.5" />
      case CourseLevel.ADVANCED: return <Crown className="w-3.5 h-3.5" />
      case CourseLevel.EXPERT: return <Award className="w-3.5 h-3.5" />
      default: return <Target className="w-3.5 h-3.5" />
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

  const getLevelText = (level: CourseLevel) => {
    switch (level) {
      case CourseLevel.BEGINNER: return "Beginner"
      case CourseLevel.INTERMEDIATE: return "Intermediate"
      case CourseLevel.ADVANCED: return "Advanced"
      case CourseLevel.EXPERT: return "Expert"
      default: return "Course"
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
        <BookOpen className="w-16 h-16 text-white/20" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full hover:border-primary/20"
      onClick={handleClick}
    >
      {/* Course Image - Enhanced with Play Overlay */}
      <div className="relative h-48 overflow-hidden bg-gray-100 flex-shrink-0">
        {thumbnail_url ? (
          <>
            <img
              src={thumbnail_url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            {/* Play Button Overlay - Always visible */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                <Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" />
              </div>
            </div>
          </>
        ) : defaultThumbnail()}

        {/* Course Type Badge - Enhanced */}
        <div className="absolute top-3 left-3">
          <div className={`${courseTypeBadge.color} backdrop-blur-sm px-2.5 py-1 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-md`}>
            <TypeIcon className="w-3 h-3" />
            <span>{courseTypeBadge.text}</span>
          </div>
        </div>

        {/* Level Badge - Enhanced */}
        <div className="absolute top-3 right-3">
          <div className={`${getLevelColor(level)} backdrop-blur-sm px-2.5 py-1 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-md`}>
            {getLevelIcon(level)}
            <span>{getLevelText(level)}</span>
          </div>
        </div>

        {/* Institution Logo - Enhanced */}
        {institution?.logo_url && (
          <div className="absolute bottom-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-full p-1 shadow-lg ring-2 ring-white/50">
              <img src={institution.logo_url} alt={institution.name} className="w-8 h-8 rounded-full object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* Course Content - Clean and Compact */}
      <div className="p-5 flex flex-col flex-1">
        {/* Category and Rating Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {category && (
              <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                {category.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-semibold text-gray-700">{formattedRating}</span>
            <span className="text-xs text-gray-400">({total_reviews.toLocaleString()})</span>
          </div>
        </div>

        {/* Title - Enhanced */}
        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Instructor - Clean */}
        {instructor && (
          <div className="flex items-center gap-2 mb-3">
            {instructor.profile_picture_url ? (
              <img 
                src={instructor.profile_picture_url} 
                alt={`${instructor.first_name} ${instructor.last_name}`} 
                className="w-6 h-6 rounded-full object-cover ring-2 ring-gray-100" 
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
            )}
            <span className="text-xs text-gray-600 font-medium">
              {instructor.first_name} {instructor.last_name}
            </span>
          </div>
        )}

        {/* Description - Compact */}
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1 leading-relaxed">
          {description}
        </p>

        {/* Course Stats - Clean Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center gap-1.5">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {enrollment_count.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {formatDuration(duration_minutes)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {total_lessons} {total_lessons === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>
        </div>

        {/* Tags - Clean */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-gray-400 font-medium">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Certificate & Language Badges - Clean */}
        <div className="flex items-center gap-2 mb-4">
          {is_certificate_available && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Certificate</span>
            </div>
          )}
          {language && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg">
              <span className="text-xs font-medium text-gray-600">{language}</span>
            </div>
          )}
        </div>

        {/* View Course Button - Enhanced */}
        <Button
          className="w-full bg-primary text-white hover:bg-primary/90 transition-all duration-300 group/btn"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleClick() }}
        >
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>View Course Details</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </span>
        </Button>
      </div>
    </motion.div>
  )
}