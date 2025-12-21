"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Star,
  Clock,
  Users,
  BookOpen,
  Award,
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  Building2,
  GraduationCap,
  Globe,
  Shield,
  Target,
  Trophy,
  Crown,
  User,
  PlayCircle,
  Bookmark,
  X,
  Check,
  Loader2,
  Code,
  Palette,
  Briefcase,
  BarChart,
  Home,
  RefreshCw,
  Menu,
  Settings,
  LogOut,
  Zap,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { GoogleOneTapLogin } from "@/components/auth/GoogleOneTap"
import { RootState } from "@/lib/store"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch } from "@/lib/store"
import { logoutBwenge } from "@/lib/features/auth/auth-slice"
import { toast } from "sonner"
import { LoginModal } from "@/components/auth/LoginModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Cookies from "js-cookie"

// ==================== TYPES (unchanged) ====================

interface Instructor {
  id: string
  first_name: string
  last_name: string
  profile_picture_url?: string
}

interface Course {
  id: string
  title: string
  thumbnail_url?: string
  instructor: Instructor
  enrollment_count: number
  average_rating: number
  course_type: "MOOC" | "SPOC"
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
  duration_minutes: number
  description?: string
  short_description?: string
  price?: number
  is_certificate_available?: boolean
  language?: string
}

interface Category {
  id: string
  name: string
  description?: string
  course_count: number
  courses: Course[]
}

interface Institution {
  id: string
  name: string
  logo_url?: string
  type: "UNIVERSITY" | "GOVERNMENT" | "BUSINESS"
  slug: string
  categories: Category[]
  total_courses: number
}

interface Filters {
  levels: string[]
  types: string[]
  certificate: boolean
  languages: string[]
}

// ==================== LOADING SKELETON ====================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-72 xl:w-80 bg-white border-r border-gray-200 flex-shrink-0" />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse mb-6 max-w-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="h-44 bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

// ==================== DEFAULT THUMBNAIL (unchanged logic) ====================

function DefaultCourseThumbnail({ title, level }: { title: string; level: string }) {
  const getIconByTitle = () => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes("code") || lowerTitle.includes("programming") || lowerTitle.includes("develop")) return Code
    if (lowerTitle.includes("design") || lowerTitle.includes("art") || lowerTitle.includes("creative")) return Palette
    if (lowerTitle.includes("business") || lowerTitle.includes("management") || lowerTitle.includes("marketing")) return Briefcase
    if (lowerTitle.includes("data") || lowerTitle.includes("analytics") || lowerTitle.includes("statistics")) return BarChart
    return GraduationCap
  }

  const getGradientByLevel = () => {
    switch (level) {
      case "BEGINNER": return "from-emerald-400 via-teal-500 to-cyan-600"
      case "INTERMEDIATE": return "from-blue-400 via-indigo-500 to-violet-600"
      case "ADVANCED":
      case "EXPERT": return "from-purple-500 via-fuchsia-600 to-pink-700"
      default: return "from-gray-400 via-gray-500 to-gray-600"
    }
  }

  const IconComponent = getIconByTitle()
  return (
    <div className={`w-full h-full bg-gradient-to-br ${getGradientByLevel()} relative overflow-hidden flex items-center justify-center`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border-2 border-white/30 shadow-2xl">
          <IconComponent className="w-12 h-12 text-white" />
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-lg">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">{level}</p>
        </div>
      </div>
    </div>
  )
}

// ==================== COURSE CARD — same visual style as BrowseCourseCard ====================

function CourseCard({
  course,
  index,
  onLearnMoreClick,
}: {
  course: Course
  index: number
  onLearnMoreClick: (courseId: string) => void
}) {
  const [isBookmarked, setIsBookmarked] = useState(false)

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "BEGINNER": return <Target className="w-3 h-3" />
      case "INTERMEDIATE": return <Trophy className="w-3 h-3" />
      case "ADVANCED": return <Crown className="w-3 h-3" />
      case "EXPERT": return <Award className="w-3 h-3" />
      default: return <Target className="w-3 h-3" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER": return "bg-emerald-500"
      case "INTERMEDIATE": return "bg-blue-500"
      case "ADVANCED": return "bg-purple-500"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-gray-500"
    }
  }

  const getTypeBadge = (type: string) => {
    return type === "MOOC"
      ? { color: "bg-blue-500", icon: <Globe className="w-3 h-3" /> }
      : { color: "bg-purple-500", icon: <Shield className="w-3 h-3" /> }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins > 0 ? `${mins}m` : ""}`
    return `${mins}m`
  }

  const typeBadge = getTypeBadge(course.course_type)
  const numericRating = typeof course.average_rating === "string" ? parseFloat(course.average_rating) : course.average_rating
  const formattedRating = numericRating > 0 ? numericRating.toFixed(1) : "New"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={() => onLearnMoreClick(course.id)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        ) : (
          <DefaultCourseThumbnail title={course.title} level={course.level} />
        )}

        {/* Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={`${typeBadge.color} text-white shadow-lg flex items-center gap-1`}>
            {typeBadge.icon}
            {course.course_type}
          </Badge>
        </div>

        {/* Level Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={`${getLevelColor(course.level)} text-white shadow-lg flex items-center gap-1`}>
            {getLevelIcon(course.level)}
            {course.level.charAt(0) + course.level.slice(1).toLowerCase()}
          </Badge>
        </div>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsBookmarked(!isBookmarked) }}
          className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg z-10"
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-blue-600 text-blue-600" : "text-gray-700"}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Rating row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs font-medium">{formattedRating}</span>
          </div>
          {course.is_certificate_available && (
            <Badge variant="outline" className="text-xs border-yellow-200 bg-yellow-50 text-yellow-700">
              <Award className="w-3 h-3 mr-1" />
              Certificate
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2 leading-snug">
          {course.title}
        </h3>

        {/* Instructor */}
        {course.instructor && (
          <div className="flex items-center gap-2 mb-2">
            {course.instructor.profile_picture_url ? (
              <img src={course.instructor.profile_picture_url} alt={`${course.instructor.first_name} ${course.instructor.last_name}`} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
            )}
            <span className="text-xs text-gray-600">{course.instructor.first_name} {course.instructor.last_name}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">
          {course.short_description || course.description || "Explore this comprehensive course"}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span>{course.enrollment_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(course.duration_minutes)}</span>
          </div>
          {course.language && (
            <Badge variant="outline" className="text-xs border-gray-200 bg-gray-50 text-gray-600">
              {course.language}
            </Badge>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mb-3">
          {course.price !== undefined && (
            course.price === 0 ? (
              <Badge className="bg-green-600 text-white">Free</Badge>
            ) : (
              <span className="text-sm font-bold text-yellow-600">{course.price.toLocaleString()} RWF</span>
            )
          )}
        </div>

        {/* Always-visible button */}
        <Button
          className="w-full bg-primary text-white hover:bg-primary/90 transition-colors"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onLearnMoreClick(course.id) }}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          View Course Details
        </Button>
      </div>
    </motion.div>
  )
}

// ==================== LIST VIEW CARD ====================

function CourseListCard({
  course,
  index,
  onLearnMoreClick,
}: {
  course: Course
  index: number
  onLearnMoreClick: (courseId: string) => void
}) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER": return "bg-emerald-500"
      case "INTERMEDIATE": return "bg-blue-500"
      case "ADVANCED": return "bg-purple-500"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-gray-500"
    }
  }

  const numericRating = typeof course.average_rating === "string" ? parseFloat(course.average_rating) : course.average_rating

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onLearnMoreClick(course.id)}
    >
      <div className="relative w-48 flex-shrink-0 h-32">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <DefaultCourseThumbnail title={course.title} level={course.level} />
        )}
        <Badge className={`absolute top-2 left-2 ${getLevelColor(course.level)} text-white text-xs`}>
          {course.level.charAt(0) + course.level.slice(1).toLowerCase()}
        </Badge>
      </div>
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{course.title}</h3>
          <p className="text-xs text-gray-500 line-clamp-2">{course.short_description || course.description}</p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-current" />{numericRating > 0 ? numericRating.toFixed(1) : "New"}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollment_count.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.ceil(course.duration_minutes / 60)}h</span>
          </div>
          <Button size="sm" className="bg-primary text-white text-xs h-7" onClick={(e) => { e.stopPropagation(); onLearnMoreClick(course.id) }}>
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ==================== SIDEBAR FILTER (matches CoursesPage sidebar exactly) ====================

function SidebarContent({
  filters,
  onFilterChange,
  onClose,
  categories,
  activeCategory,
  onCategoryChange,
  institution,
  allCourses,
}: {
  filters: Filters
  onFilterChange: (f: Filters) => void
  onClose: () => void
  categories: Category[]
  activeCategory: string
  onCategoryChange: (cat: string) => void
  institution: Institution | null
  allCourses: Course[]
}) {
  const levels = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]
  const courseTypes = ["MOOC", "SPOC"]
  const languages = ["English", "French", "Kinyarwanda"]

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "BEGINNER": return <Target className="w-3 h-3" />
      case "INTERMEDIATE": return <Trophy className="w-3 h-3" />
      case "ADVANCED": return <Crown className="w-3 h-3" />
      case "EXPERT": return <Award className="w-3 h-3" />
      default: return <Target className="w-3 h-3" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER": return "bg-emerald-500"
      case "INTERMEDIATE": return "bg-blue-500"
      case "ADVANCED": return "bg-purple-500"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-gray-500"
    }
  }

  const activeFilterCount =
    filters.levels.length + filters.types.length + filters.languages.length + (filters.certificate ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0

  const clearAll = () => onFilterChange({ levels: [], types: [], certificate: false, languages: [] })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge className="bg-primary text-white text-xs ml-1">{activeFilterCount}</Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          aria-label="Close filters"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Category filter */}
        {categories.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
            <div className="space-y-1.5">
              <div
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", activeCategory === "all" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
                onClick={() => onCategoryChange("all")}
              >
                <span className="font-medium text-gray-800">All Courses ({institution?.total_courses || 0})</span>
              </div>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", activeCategory === cat.name ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
                  onClick={() => onCategoryChange(cat.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{cat.name}</span>
                    <Badge variant="outline" className="text-xs">{cat.course_count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Difficulty Level</label>
          <div className="space-y-1.5">
            <div
              className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.levels.length === 0 ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
              onClick={() => onFilterChange({ ...filters, levels: [] })}
            >
              <span className="font-medium text-gray-800">All Levels</span>
            </div>
            {levels.map((level) => (
              <div
                key={level}
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.levels.includes(level) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
                onClick={() => {
                  const has = filters.levels.includes(level)
                  onFilterChange({ ...filters, levels: has ? filters.levels.filter((l) => l !== level) : [...filters.levels, level] })
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`${getLevelColor(level)} w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                    {getLevelIcon(level)}
                  </div>
                  <span className="font-medium text-gray-800">{level.charAt(0) + level.slice(1).toLowerCase()}</span>
                  {filters.levels.includes(level) && <Check className="w-3 h-3 text-blue-600 ml-auto" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Type */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Course Type</label>
          <div className="space-y-1.5">
            {courseTypes.map((type) => (
              <div
                key={type}
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.types.includes(type) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
                onClick={() => {
                  const has = filters.types.includes(type)
                  onFilterChange({ ...filters, types: has ? filters.types.filter((t) => t !== type) : [...filters.types, type] })
                }}
              >
                <div className="flex items-center gap-2">
                  {type === "MOOC" ? <Globe className="w-4 h-4 text-blue-500" /> : <Shield className="w-4 h-4 text-purple-500" />}
                  <span className="font-medium text-gray-800">{type}</span>
                  {filters.types.includes(type) && <Check className="w-3 h-3 text-blue-600 ml-auto" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Certificate</label>
          <div
            className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.certificate ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
            onClick={() => onFilterChange({ ...filters, certificate: !filters.certificate })}
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-gray-800">Certificate Available</span>
              {filters.certificate && <Check className="w-3 h-3 text-blue-600 ml-auto" />}
            </div>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Language</label>
          <div className="space-y-1.5">
            {languages.map((lang) => (
              <div
                key={lang}
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.languages.includes(lang) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
                onClick={() => {
                  const has = filters.languages.includes(lang)
                  onFilterChange({ ...filters, languages: has ? filters.languages.filter((l) => l !== lang) : [...filters.languages, lang] })
                }}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-800">{lang}</span>
                  {filters.languages.includes(lang) && <Check className="w-3 h-3 text-blue-600 ml-auto" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <Button onClick={clearAll} variant="outline" className="w-full border-2 text-sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        )}

        {/* Stats */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <h4 className="font-semibold mb-3 text-blue-900 text-sm">Course Statistics</h4>
          <div className="space-y-2 text-sm">
            {[
              { label: "Total Courses", count: institution?.total_courses || 0, color: "bg-blue-600" },
              { label: "Categories", count: categories.length, color: "bg-indigo-600" },
              { label: "MOOC Courses", count: allCourses.filter((c) => c.course_type === "MOOC").length, color: "bg-purple-600" },
              { label: "SPOC Courses", count: allCourses.filter((c) => c.course_type === "SPOC").length, color: "bg-violet-600" },
              { label: "With Certificate", count: allCourses.filter((c) => c.is_certificate_available).length, color: "bg-yellow-600" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-600">{label}:</span>
                <Badge className={`${color} text-white text-xs`}>{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== NAVIGATION (unchanged logic from original) ====================

function Navigation({
  institution,
  institutions,
  selectedInstitutionSlug,
  onInstitutionChange,
}: {
  institution?: Institution | null
  institutions: Institution[]
  selectedInstitutionSlug: string
  onInstitutionChange: (slug: string) => void
}) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showInstitutionDropdown, setShowInstitutionDropdown] = useState(false)
  const { user: reduxUser, isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()

  const [actualUser, setActualUser] = useState<any>(null)
  const [actualRole, setActualRole] = useState<string>("LEARNER")

  useEffect(() => {
    const getActualUser = () => {
      let cookieUser = null
      const userCookie = Cookies.get("bwenge_user")
      if (userCookie) { try { cookieUser = JSON.parse(userCookie) } catch (e) {} }
      let localStorageUser = null
      try { const s = localStorage.getItem("bwengeplus_user"); if (s) localStorageUser = JSON.parse(s) } catch (e) {}
      let crossSystemContext = null
      try { const s = localStorage.getItem("cross_system_context"); if (s) crossSystemContext = JSON.parse(s) } catch (e) {}
      return { cookieUser, localStorageUser, crossSystemContext }
    }

    const { cookieUser, localStorageUser, crossSystemContext } = getActualUser()

    const role =
      reduxUser?.bwenge_role || cookieUser?.bwenge_role || localStorageUser?.bwenge_role || crossSystemContext?.bwenge_role || "LEARNER"

    let user = reduxUser || cookieUser || localStorageUser
    if (!user && crossSystemContext) {
      user = { bwenge_role: crossSystemContext.bwenge_role, email: "user@example.com", first_name: "User", last_name: "", id: "recovered", primary_institution_id: crossSystemContext.primary_institution_id }
    }

    setActualUser(user)
    setActualRole(role)
  }, [reduxUser])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = () => { setShowUserMenu(false); setShowInstitutionDropdown(false) }
    if (showUserMenu || showInstitutionDropdown) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [showUserMenu, showInstitutionDropdown])

  const handleLogout = async () => {
    try { await dispatch(logoutBwenge(false)).unwrap(); toast.success("Logged out successfully"); router.push("/") }
    catch { toast.error("Logout failed") }
  }

  const getRoleDashboardPath = (role: string) => ({ SYSTEM_ADMIN: "/dashboard/system-admin", INSTITUTION_ADMIN: "/dashboard/institution-admin", CONTENT_CREATOR: "/dashboard/content-creator", INSTRUCTOR: "/dashboard/instructor", LEARNER: "/dashboard/learner/learning/courses" }[role] || "/dashboard/learner/learning/courses")
  const getRoleDisplayName = (role: string) => ({ SYSTEM_ADMIN: "System Admin", INSTITUTION_ADMIN: "Institution Admin", CONTENT_CREATOR: "Content Creator", INSTRUCTOR: "Instructor", LEARNER: "Learner" }[role] || "Learner")
  const getAvatarGradient = () => ({ SYSTEM_ADMIN: "from-red-500 to-orange-500", INSTITUTION_ADMIN: "from-blue-500 to-cyan-500", CONTENT_CREATOR: "from-purple-500 to-pink-500", INSTRUCTOR: "from-green-500 to-emerald-500", LEARNER: "from-indigo-500 to-violet-500" }[actualRole] || "from-gray-500 to-gray-700")
  const getUserInitials = () => actualUser?.first_name?.charAt(0).toUpperCase() || actualUser?.email?.charAt(0).toUpperCase() || "U"

  const dashboardPath = getRoleDashboardPath(actualRole)
  const roleDisplayName = getRoleDisplayName(actualRole)

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 bg-white ${isScrolled ? "shadow-lg border-b border-gray-200" : "shadow-sm border-b border-gray-100"}`}>
      <div className="max-w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <motion.div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md" whileHover={{ scale: 1.05, rotate: 5 }} whileTap={{ scale: 0.95 }}>
                <GraduationCap className="w-5 h-5 text-white" />
              </motion.div>
              <span className="font-bold text-lg text-gray-900 hidden sm:block">BwengePlus</span>
            </Link>

            {/* Institution Selector */}
            {institution && (
              <div className="relative hidden md:block">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInstitutionDropdown(!showInstitutionDropdown) }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  {institution.logo_url ? (
                    <img src={institution.logo_url} alt={institution.name} className="w-6 h-6 rounded-md object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">{institution.name}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showInstitutionDropdown ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showInstitutionDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-900">Switch Institution</h3></div>
                      <div className="max-h-80 overflow-y-auto">
                        {institutions.map((inst) => (
                          <button key={inst.id} onClick={() => { onInstitutionChange(inst.slug); setShowInstitutionDropdown(false) }}
                            className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${inst.slug === selectedInstitutionSlug ? "bg-blue-50" : ""}`}
                          >
                            {inst.logo_url ? <img src={inst.logo_url} alt={inst.name} className="w-8 h-8 rounded-md object-cover" /> : <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div>}
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium text-gray-900">{inst.name}</div>
                              <div className="text-xs text-gray-500">{inst.total_courses} courses</div>
                            </div>
                            {inst.slug === selectedInstitutionSlug && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {[{ label: "Home", href: "/", icon: Home }, { label: "Courses", href: "/courses", icon: BookOpen }].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <link.icon className="w-4 h-4" />{link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/login" className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Sign In</Link>
                <Link href="/register" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm">Join Free</Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="relative">
                    {actualUser?.profile_picture_url ? (
                      <img src={actualUser.profile_picture_url} alt={actualUser.first_name} className="w-8 h-8 rounded-full object-cover border-2 border-blue-600" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-semibold text-sm shadow-md border-2 border-white ring-2 ring-blue-600/30`}>
                        {getUserInitials()}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-semibold text-gray-900">{actualUser?.first_name} {actualUser?.last_name}</div>
                    <div className="text-xs text-gray-500">{roleDisplayName}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 hidden lg:block transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          {actualUser?.profile_picture_url ? (
                            <img src={actualUser.profile_picture_url} alt={actualUser.first_name} className="w-10 h-10 rounded-full object-cover border-2 border-blue-600" />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-semibold text-lg shadow-lg border-2 border-white`}>
                              {getUserInitials()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{actualUser?.first_name} {actualUser?.last_name}</div>
                            <div className="text-xs text-gray-500 truncate">{actualUser?.email}</div>
                          </div>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-full">
                          <span className="text-xs font-medium text-blue-700">{roleDisplayName}</span>
                        </div>
                      </div>
                      <div className="py-1">
                        {[
                          { href: dashboardPath, label: actualRole === "LEARNER" ? "My Learning" : "Dashboard", icon: BookOpen },
                          { href: `/dashboard/${actualRole.toLowerCase()}/profile`, label: "Profile", icon: User },
                          { href: `/dashboard/${actualRole.toLowerCase()}/settings`, label: "Settings", icon: Settings },
                        ].map((item) => (
                          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setShowUserMenu(false)}>
                            <item.icon className="w-4 h-4" />{item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button onClick={() => { setShowUserMenu(false); handleLogout() }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="w-4 h-4" />Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
              className="lg:hidden border-t border-gray-200 py-3 overflow-hidden"
            >
              {institution && (
                <div className="mb-3 px-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Institution</label>
                  <select value={selectedInstitutionSlug} onChange={(e) => { onInstitutionChange(e.target.value); setIsMobileMenuOpen(false) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {institutions.map((inst) => <option key={inst.id} value={inst.slug}>{inst.name} ({inst.total_courses})</option>)}
                  </select>
                </div>
              )}
              <nav className="space-y-1">
                {[{ label: "Home", href: "/", icon: Home }, { label: "Courses", href: "/courses", icon: BookOpen }].map((link) => (
                  <Link key={link.href} href={link.href} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    <link.icon className="w-5 h-5" />{link.label}
                  </Link>
                ))}
                <div className="pt-3 mt-3 border-t border-gray-200 space-y-2">
                  {!isAuthenticated ? (
                    <>
                      <Link href="/login" className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                      <Link href="/register" className="block px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg text-center" onClick={() => setIsMobileMenuOpen(false)}>Join Free</Link>
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-semibold shadow-lg`}>{getUserInitials()}</div>
                          <div><div className="text-sm font-semibold text-gray-900">{actualUser?.first_name} {actualUser?.last_name}</div><div className="text-xs text-gray-500">{roleDisplayName}</div></div>
                        </div>
                      </div>
                      <Link href={dashboardPath} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
                        <BookOpen className="w-5 h-5" />{actualRole === "LEARNER" ? "My Learning" : "Dashboard"}
                      </Link>
                      <button onClick={() => { setIsMobileMenuOpen(false); handleLogout() }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                        <LogOut className="w-5 h-5" />Sign Out
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

// ==================== MAIN COMPONENT (all original logic preserved) ====================

function InstitutionCoursesContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")

  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const [institution, setInstitution] = useState<Institution | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInstitutionSlug, setSelectedInstitutionSlug] = useState<string>("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ levels: [], types: [], certificate: false, languages: [] })

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false)
    }
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/institutions/public/homepage`)
        const data = await response.json()
        if (data.success) {
          setInstitutions(data.data)
          const pathSegments = pathname.split("/")
          const institutionSlug = pathSegments[2]
          setSelectedInstitutionSlug(institutionSlug)
          const currentInstitution = data.data.find((inst: Institution) => inst.slug === institutionSlug)
          setInstitution(currentInstitution || data.data[0])
          if (categoryParam) setActiveCategory(decodeURIComponent(categoryParam))
        }
      } catch (error) {
        console.error("Failed to fetch institutions:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInstitutions()
  }, [categoryParam, pathname])

  const handleInstitutionChange = (slug: string) => {
    setSelectedInstitutionSlug(slug)
    router.push(`/institutions/${slug}/courses?category=all`)
  }

  const handleLearnMoreClick = (courseId: string) => {
    if (!isAuthenticated) {
      setSelectedCourseId(courseId)
      setIsLoginModalOpen(true)
    } else {
      router.push(`/courses/${courseId}`)
    }
  }

  const handleLoginModalClose = () => {
    setIsLoginModalOpen(false)
    setSelectedCourseId(null)
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    const params = new URLSearchParams(searchParams.toString())
    params.set("category", encodeURIComponent(category))
    router.push(`${pathname}?${params.toString()}`)
  }

  const getFilteredCourses = () => {
    if (!institution) return []
    let filteredCourses: Course[] = activeCategory === "all"
      ? institution.categories.flatMap((cat) => cat.courses)
      : institution.categories.find((cat) => cat.name === activeCategory)?.courses || []

    if (searchQuery) {
      filteredCourses = filteredCourses.filter((course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${course.instructor?.first_name} ${course.instructor?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (filters.levels.length > 0) filteredCourses = filteredCourses.filter((c) => filters.levels.includes(c.level))
    if (filters.types.length > 0) filteredCourses = filteredCourses.filter((c) => filters.types.includes(c.course_type))
    if (filters.certificate) filteredCourses = filteredCourses.filter((c) => c.is_certificate_available)
    if (filters.languages.length > 0) filteredCourses = filteredCourses.filter((c) => c.language && filters.languages.includes(c.language))

    return filteredCourses
  }

  const allCourses = institution?.categories.flatMap((cat) => cat.courses) || []
  const filteredCourses = getFilteredCourses()
  const activeFilterCount = filters.levels.length + filters.types.length + filters.languages.length + (filters.certificate ? 1 : 0)

  if (isLoading) return <LoadingSkeleton />

  if (!institution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <GraduationCap className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Institution Not Found</h2>
          <p className="text-gray-600 mb-6">The requested institution could not be found.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg">
            <Home className="w-5 h-5" />Go Home
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {!isAuthenticated && <GoogleOneTapLogin autoSelect={false} cancelOnTapOutside={true} context="signin" />}

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={handleLoginModalClose}
          redirectTo={selectedCourseId ? `/courses/${selectedCourseId}` : "/courses"}
          message="Sign in to view course details and enroll."
        />

        <Navigation
          institution={institution}
          institutions={institutions}
          selectedInstitutionSlug={selectedInstitutionSlug}
          onInstitutionChange={handleInstitutionChange}
        />

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex min-h-[calc(100vh-4rem)] pt-16">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col sticky top-16 h-[calc(100vh-4rem)] w-72 xl:w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
            <SidebarContent
              filters={filters}
              onFilterChange={setFilters}
              onClose={() => setSidebarOpen(false)}
              categories={institution.categories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              institution={institution}
              allCourses={allCourses}
            />
          </aside>

          {/* Mobile Sidebar Drawer */}
          <div className={cn(
            "fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 bg-white border-r border-gray-200 z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <SidebarContent
              filters={filters}
              onFilterChange={setFilters}
              onClose={() => setSidebarOpen(false)}
              categories={institution.categories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              institution={institution}
              allCourses={allCourses}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
            {/* Mobile filter toggle */}
            <div className="lg:hidden mb-5">
              <Button onClick={() => setSidebarOpen(true)} variant="outline" className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && <Badge className="ml-2 bg-primary text-white text-xs">{activeFilterCount}</Badge>}
              </Button>
            </div>

            {/* Hero Header */}
            <div className="text-center mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl -z-10" />
              <div className="py-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                  {institution.logo_url ? (
                    <img src={institution.logo_url} alt={institution.name} className="w-12 h-12 rounded-xl object-cover shadow-md" />
                  ) : (
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Building2 className="w-7 h-7 text-blue-600" />
                    </div>
                  )}
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {institution.name}
                  </h1>
                </div>
                <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto">
                  Browse {institution.total_courses} courses across {institution.categories.length} categories
                </p>
              </div>
            </div>

            {/* Search + View toggle */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search courses, instructors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-2 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl self-start sm:self-auto">
                <button onClick={() => setViewMode("grid")} className={cn("p-2.5 rounded-lg transition-colors", viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600")}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("list")} className={cn("p-2.5 rounded-lg transition-colors", viewMode === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600")}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Active:</span>
                {filters.levels.map((level) => (
                  <span key={level} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                    <button onClick={() => setFilters({ ...filters, levels: filters.levels.filter((l) => l !== level) })}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {filters.types.map((type) => (
                  <span key={type} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {type}<button onClick={() => setFilters({ ...filters, types: filters.types.filter((t) => t !== type) })}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {filters.certificate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    Certificate<button onClick={() => setFilters({ ...filters, certificate: false })}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.languages.map((lang) => (
                  <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {lang}<button onClick={() => setFilters({ ...filters, languages: filters.languages.filter((l) => l !== lang) })}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <button onClick={() => setFilters({ levels: [], types: [], certificate: false, languages: [] })} className="text-sm text-gray-500 hover:text-gray-900 underline">Clear all</button>
              </motion.div>
            )}

            {/* Results count */}
            <div className="mb-5 flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="px-3 py-1.5 text-sm border-blue-200 bg-blue-50 text-blue-700">
                <Trophy className="w-3 h-3 mr-1.5" />
                {filteredCourses.length} Courses Found
              </Badge>
              {searchQuery && <span className="text-gray-500 text-sm">for "{searchQuery}"</span>}
              {activeCategory !== "all" && <Badge variant="outline" className="text-sm border-indigo-200 bg-indigo-50 text-indigo-700">{activeCategory}</Badge>}
            </div>

            {/* Courses */}
            {filteredCourses.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredCourses.map((course, index) => (
                    <CourseCard key={course.id} course={course} index={index} onLearnMoreClick={handleLearnMoreClick} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCourses.map((course, index) => (
                    <CourseListCard key={course.id} course={course} index={index} onLearnMoreClick={handleLearnMoreClick} />
                  ))}
                </div>
              )
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Search className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">No Courses Found</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
                  {searchQuery ? `No courses match "${searchQuery}".` : `No courses available in ${activeCategory}.`}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {(searchQuery || activeFilterCount > 0) && (
                    <Button variant="outline" size="lg" className="border-2" onClick={() => { setSearchQuery(""); setFilters({ levels: [], types: [], certificate: false, languages: [] }) }}>
                      <RefreshCw className="w-4 h-4 mr-2" />Clear Filters
                    </Button>
                  )}
                  <Button size="lg" className="bg-primary text-white hover:bg-primary/80 shadow-lg" onClick={() => handleCategoryChange("all")}>
                    View All Courses
                  </Button>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}

export default function InstitutionCoursesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <InstitutionCoursesContent />
    </Suspense>
  )
}