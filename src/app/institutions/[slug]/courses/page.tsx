"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { CatalogueNav } from "@/components/courses/catalogue-nav"
import {
  discoverCourses as discoverCoursesApi,
  EMPTY_DISCOVERY,
  type DiscoveryResult,
} from "@/lib/courses/discovery"
import { CollapsibleFilterSidebar } from "@/components/courses/collapsible-filter-sidebar"
import { InstitutionSwitcher } from "@/components/courses/institution-switcher"
import { learningHomeForRole } from "@/app/utils/roleNavigation"
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
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google"
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
  instructor: Instructor | null
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
        <aside className="hidden lg:block w-72 xl:w-80 bg-card border-r border-border flex-shrink-0" />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-10 bg-secondary rounded-lg animate-pulse mb-6 max-w-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="h-44 bg-secondary animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-secondary rounded animate-pulse" />
                  <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
                  <div className="h-8 bg-secondary rounded animate-pulse" />
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
        <div className="absolute top-0 left-0 w-40 h-40 bg-card rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-card rounded-full translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="bg-card/20 backdrop-blur-sm rounded-2xl p-5 border-2 border-white/30 shadow-2xl">
          <IconComponent className="w-12 h-12 text-white" />
        </div>
        <div className="bg-card/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-lg">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">{level}</p>
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
      case "BEGINNER": return "bg-success/100"
      case "INTERMEDIATE": return "bg-primary"
      case "ADVANCED": return "bg-primary/100"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-muted"
    }
  }

  const getTypeBadge = (type: string) => {
    return type === "MOOC"
      ? { color: "bg-primary", icon: <Globe className="w-3 h-3" /> }
      : { color: "bg-primary/100", icon: <Shield className="w-3 h-3" /> }
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
      className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={() => onLearnMoreClick(course.id)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-muted flex-shrink-0">
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
          className="absolute bottom-3 right-3 p-2 bg-card/90 backdrop-blur-sm rounded-full hover:bg-card transition-all shadow-lg z-10"
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-blue-600 text-primary" : "text-muted-foreground"}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Rating row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-warning fill-current" />
            <span className="text-xs font-medium">{formattedRating}</span>
          </div>
          {course.is_certificate_available && (
            <Badge variant="outline" className="text-xs border-warning/30 bg-warning/10 text-warning">
              <Award className="w-3 h-3 mr-1" />
              Certificate
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-foreground mb-1.5 line-clamp-2 leading-snug">
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
            <span className="text-xs text-muted-foreground">{course.instructor.first_name} {course.instructor.last_name}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
          {course.short_description || course.description || "Explore this comprehensive course"}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{course.enrollment_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(course.duration_minutes)}</span>
          </div>
          {course.language && (
            <Badge variant="outline" className="text-xs border-border bg-muted/50 text-muted-foreground">
              {course.language}
            </Badge>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mb-3">
          {course.price !== undefined && (
            course.price === 0 ? (
              <Badge className="bg-success text-white">Free</Badge>
            ) : (
              <span className="text-sm font-bold text-warning">{course.price.toLocaleString()} RWF</span>
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
      case "BEGINNER": return "bg-success/100"
      case "INTERMEDIATE": return "bg-primary"
      case "ADVANCED": return "bg-primary/100"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-muted"
    }
  }

  const numericRating = typeof course.average_rating === "string" ? parseFloat(course.average_rating) : course.average_rating

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex hover:shadow-md transition-shadow cursor-pointer"
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
          <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-1">{course.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{course.short_description || course.description}</p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning fill-current" />{numericRating > 0 ? numericRating.toFixed(1) : "New"}</span>
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
      case "BEGINNER": return "bg-success/100"
      case "INTERMEDIATE": return "bg-primary"
      case "ADVANCED": return "bg-primary/100"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-muted"
    }
  }

  const activeFilterCount =
    filters.levels.length + filters.types.length + filters.languages.length + (filters.certificate ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0

  const clearAll = () => onFilterChange({ levels: [], types: [], certificate: false, languages: [] })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-foreground">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge className="bg-primary text-white text-xs ml-1">{activeFilterCount}</Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-muted-foreground"
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
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">Category</label>
            <div className="space-y-1.5">
              <div
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", activeCategory === "all" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                onClick={() => onCategoryChange("all")}
              >
                <span className="font-medium text-foreground">All Courses ({institution?.total_courses || 0})</span>
              </div>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", activeCategory === cat.name ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                  onClick={() => onCategoryChange(cat.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{cat.name}</span>
                    <Badge variant="outline" className="text-xs">{cat.course_count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">Difficulty Level</label>
          <div className="space-y-1.5">
            <div
              className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.levels.length === 0 ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
              onClick={() => onFilterChange({ ...filters, levels: [] })}
            >
              <span className="font-medium text-foreground">All Levels</span>
            </div>
            {levels.map((level) => (
              <div
                key={level}
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.levels.includes(level) ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                onClick={() => {
                  const has = filters.levels.includes(level)
                  onFilterChange({ ...filters, levels: has ? filters.levels.filter((l) => l !== level) : [...filters.levels, level] })
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`${getLevelColor(level)} w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                    {getLevelIcon(level)}
                  </div>
                  <span className="font-medium text-foreground">{level.charAt(0) + level.slice(1).toLowerCase()}</span>
                  {filters.levels.includes(level) && <Check className="w-3 h-3 text-primary ml-auto" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Type */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">Course Type</label>
          <div className="space-y-1.5">
            {courseTypes.map((type) => (
              <div
                key={type}
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.types.includes(type) ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                onClick={() => {
                  const has = filters.types.includes(type)
                  onFilterChange({ ...filters, types: has ? filters.types.filter((t) => t !== type) : [...filters.types, type] })
                }}
              >
                <div className="flex items-center gap-2">
                  {type === "MOOC" ? <Globe className="w-4 h-4 text-primary" /> : <Shield className="w-4 h-4 text-primary" />}
                  <span className="font-medium text-foreground">{type}</span>
                  {filters.types.includes(type) && <Check className="w-3 h-3 text-primary ml-auto" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">Certificate</label>
          <div
            className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.certificate ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
            onClick={() => onFilterChange({ ...filters, certificate: !filters.certificate })}
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-warning" />
              <span className="font-medium text-foreground">Certificate Available</span>
              {filters.certificate && <Check className="w-3 h-3 text-primary ml-auto" />}
            </div>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">Language</label>
          <div className="space-y-1.5">
            {languages.map((lang) => (
              <div
                key={lang}
                className={cn("p-3 rounded-lg border-2 cursor-pointer transition-all text-sm", filters.languages.includes(lang) ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                onClick={() => {
                  const has = filters.languages.includes(lang)
                  onFilterChange({ ...filters, languages: has ? filters.languages.filter((l) => l !== lang) : [...filters.languages, lang] })
                }}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{lang}</span>
                  {filters.languages.includes(lang) && <Check className="w-3 h-3 text-primary ml-auto" />}
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
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-primary/20">
          <h4 className="font-semibold mb-3 text-primary text-sm">Course Statistics</h4>
          <div className="space-y-2 text-sm">
            {[
              { label: "Total Courses", count: institution?.total_courses || 0, color: "bg-primary" },
              { label: "Categories", count: categories.length, color: "bg-primary" },
              { label: "MOOC Courses", count: allCourses.filter((c) => c.course_type === "MOOC").length, color: "bg-primary" },
              { label: "SPOC Courses", count: allCourses.filter((c) => c.course_type === "SPOC").length, color: "bg-primary" },
              { label: "With Certificate", count: allCourses.filter((c) => c.is_certificate_available).length, color: "bg-warning" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}:</span>
                <Badge className={`${color} text-white text-xs`}>{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

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

  /**
   * The same ranking the catalogue and the navigation bar use (CE-001 §6),
   * scoped to this institution.
   *
   * It supplies the order only. Which courses appear is still this page's
   * own business — category tabs, level, type, certificate and language all
   * stay exactly as they were.
   */
  const [discovery, setDiscovery] = useState<DiscoveryResult>(EMPTY_DISCOVERY)

  useEffect(() => {
    if (!institution?.id) return

    const controller = new AbortController()
    let cancelled = false

    discoverCoursesApi({
      search: searchQuery,
      institutionId: institution.id,
      limit: 200,
      signal: controller.signal,
    })
      .then((r) => {
        if (!cancelled) setDiscovery(r)
      })
      .catch(() => {
        // No ranking simply means the original order, not an error state.
        if (!cancelled && !controller.signal.aborted) setDiscovery(EMPTY_DISCOVERY)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [institution?.id, searchQuery])

  const ranking = useMemo(() => {
    const map = new Map<string, number>()
    discovery.courses.forEach((c, i) => map.set(String(c.id), i))
    return map
  }, [discovery])

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

    // Ranked courses first, in the server's order; everything else keeps its
    // original position behind them. Nothing is removed.
    if (ranking.size === 0) return filteredCourses

    const unranked = ranking.size + 1
    return filteredCourses
      .map((course, i) => ({ course, i }))
      .sort((a, b) => {
        const ra = ranking.get(String(a.course.id)) ?? unranked
        const rb = ranking.get(String(b.course.id)) ?? unranked
        return ra === rb ? a.i - b.i : ra - rb
      })
      .map(({ course }) => course)
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
            <GraduationCap className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Institution Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested institution could not be found.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary font-semibold shadow-lg">
            <Home className="w-5 h-5" />Go Home
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Google One Tap - Always visible when not authenticated */}
        {!isAuthenticated && (
          <GoogleOneTapLogin
            autoSelect={false}
            cancelOnTapOutside={false}
            context="signin"
            forceDisplay={true}
          />
        )}

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={handleLoginModalClose}
          redirectTo={selectedCourseId ? `/courses/${selectedCourseId}` : "/courses"}
          message="Sign in to view course details and enroll."
        />

        {/*
          The same catalogue bar as `/courses` and a course page (CS-001).
          The institution switcher rides in its left group, because it is a
          way of moving between catalogues and belongs beside Explore.
        */}
        <CatalogueNav institutionId={institution?.id}>
          <InstitutionSwitcher
            institutions={institutions}
            selectedSlug={selectedInstitutionSlug}
            onChange={handleInstitutionChange}
          />
        </CatalogueNav>

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex min-h-[calc(100vh-4rem)] pt-16">
          {/* Desktop Sidebar */}
          <CollapsibleFilterSidebar activeCount={activeFilterCount} storageKey="institution_filters_collapsed">
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
          </CollapsibleFilterSidebar>

          {/* Mobile Sidebar Drawer */}
          <div className={cn(
            "fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 bg-card border-r border-border z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
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
              <Button onClick={() => setSidebarOpen(true)} variant="outline" className="bg-card hover:bg-accent text-muted-foreground border-2 border-border shadow-sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && <Badge className="ml-2 bg-primary text-white text-xs">{activeFilterCount}</Badge>}
              </Button>
            </div>

            {/*
              Header, in the same shape the course page and the catalogue use:
              a trail, the institution's identity on the left, its figures on
              the right, then a strip of divided facts.

              Counted by course type, which this payload always carries. The public/restricted split is not shown here because is_public is not on the institution course payload, and labelling a MOOC public without it would be a claim this page cannot check.
            */}
            <div className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <nav aria-label="Breadcrumb" className="mb-4">
                <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                  <li><Link href="/" className="hover:text-foreground hover:underline">Home</Link></li>
                  <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
                  <li><Link href="/courses" className="hover:text-foreground hover:underline">Courses</Link></li>
                  <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
                  <li className="font-semibold text-foreground">{institution.name}</li>
                </ol>
              </nav>

              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                  {institution.logo_url ? (
                    <img
                      src={institution.logo_url}
                      alt={institution.name}
                      className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                      <Building2 className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-[28px] font-bold leading-tight text-foreground sm:text-[34px]">
                      {institution.name}
                    </h1>
                    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                      Browse {institution.total_courses} courses across{" "}
                      {institution.categories.length} categories.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-[15px] font-bold leading-tight text-foreground">
                      {institution.total_courses}
                    </p>
                    <p className="text-[11px] leading-tight text-muted-foreground">courses</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4 shadow-sm sm:px-6">
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
                <div className="lg:pr-6">
                  <p className="text-[15px] font-bold text-foreground">
                    {filteredCourses.length} Showing
                  </p>
                  <p className="mt-1.5 text-[14px] text-muted-foreground">
                    of {allCourses.length} loaded
                  </p>
                </div>
                <div className="lg:px-6">
                  <p className="text-[15px] font-bold text-foreground">
                    {allCourses.filter((c) => c.course_type === "MOOC").length}
                  </p>
                  <p className="mt-1.5 text-[14px] text-muted-foreground">MOOC courses</p>
                </div>
                <div className="lg:px-6">
                  <p className="text-[15px] font-bold text-foreground">
                    {allCourses.filter((c) => c.course_type === "SPOC").length}
                  </p>
                  <p className="mt-1.5 text-[14px] text-muted-foreground">SPOC courses</p>
                </div>
                <div className="lg:pl-6">
                  <p className="text-[15px] font-bold text-foreground">
                    {allCourses.filter((c) => c.is_certificate_available).length}
                  </p>
                  <p className="mt-1.5 text-[14px] text-muted-foreground">with a certificate</p>
                </div>
              </div>
            </div>
            {/* Search + View toggle */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses, instructors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-2 focus:border-primary transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 p-1 bg-muted rounded-xl self-start sm:self-auto">
                <button onClick={() => setViewMode("grid")} className={cn("p-2.5 rounded-lg transition-colors", viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("list")} className={cn("p-2.5 rounded-lg transition-colors", viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Active:</span>
                {filters.levels.map((level) => (
                  <span key={level} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/15 text-primary rounded-full text-xs font-medium">
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                    <button onClick={() => setFilters({ ...filters, levels: filters.levels.filter((l) => l !== level) })}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {filters.types.map((type) => (
                  <span key={type} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/15 text-primary rounded-full text-xs font-medium">
                    {type}<button onClick={() => setFilters({ ...filters, types: filters.types.filter((t) => t !== type) })}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {filters.certificate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning/15 text-warning rounded-full text-xs font-medium">
                    Certificate<button onClick={() => setFilters({ ...filters, certificate: false })}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.languages.map((lang) => (
                  <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 bg-success/15 text-success rounded-full text-xs font-medium">
                    {lang}<button onClick={() => setFilters({ ...filters, languages: filters.languages.filter((l) => l !== lang) })}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <button onClick={() => setFilters({ levels: [], types: [], certificate: false, languages: [] })} className="text-sm text-muted-foreground hover:text-foreground underline">Clear all</button>
              </motion.div>
            )}

            {/* Results count */}
            <div className="mb-5 flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="px-3 py-1.5 text-sm border-primary/30 bg-primary/10 text-primary">
                <Trophy className="w-3 h-3 mr-1.5" />
                {filteredCourses.length} Courses Found
              </Badge>
              {searchQuery && <span className="text-muted-foreground text-sm">for "{searchQuery}"</span>}
              {activeCategory !== "all" && <Badge variant="outline" className="text-sm border-primary/30 bg-primary/10 text-primary">{activeCategory}</Badge>}
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
                  <Search className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">No Courses Found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
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