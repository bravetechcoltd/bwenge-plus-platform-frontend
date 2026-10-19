"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { CatalogueNav } from "@/components/courses/catalogue-nav"
import {
  discoverCourses as discoverCoursesApi,
  interestLabel,
  EMPTY_DISCOVERY,
  type DiscoveryResult,
} from "@/lib/courses/discovery"
import { CollapsibleFilterSidebar } from "@/components/courses/collapsible-filter-sidebar"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Search,
  BookOpen,
  Trophy,
  Target,
  Zap,
  Crown,
  Filter,
  X,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d"
import { Course } from "@/types"
import Cookies from "js-cookie"
import { LoginModal } from "@/components/auth/LoginModal"
import { cn } from "@/lib/utils"

// Debounce helper for consistent search performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function CoursesClient() {
  const searchParams = useSearchParams()
  /*
   * Seeded from the URL (CS-001).
   *
   * The navigation search has always submitted to `/courses?search=…` and
   * this page has always ignored it — so arriving here from that field
   * showed an empty box over an unfiltered list. Reading it at mount also
   * makes a search shareable and survivable across a reload.
   */
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") ?? "")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedPrice, setSelectedPrice] = useState<string>("all")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; count: number }>>([])
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounced search term for consistent filtering (prevents "stop/start" behavior)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  /**
   * The relevance ranking for the current query (CE-001 §5, §6).
   *
   * The list itself, and every filter below, still come from this page's own
   * fetch — level, category and price are local and stay local. What the
   * discovery service supplies is the *order*, and the reason for it.
   *
   * That division is deliberate. Ordering is the part that has to agree
   * across surfaces: typing "accounting" into the bar above and into the
   * field here is the same question, and the two lists disagreeing about
   * which course is the best answer is exactly what §6 is about. Filtering by
   * price is not that kind of question.
   */
  const [discovery, setDiscovery] = useState<DiscoveryResult>(EMPTY_DISCOVERY)

  // Mirror the settled term into the URL. `replace` rather than `push`:
  // typing a query is refining one view, not visiting six pages, and the
  // back button should leave the catalogue rather than walk the keystrokes.
  useEffect(() => {
    const current = searchParams.get("search") ?? ""
    if (current === debouncedSearchTerm) return
    const next = new URLSearchParams(Array.from(searchParams.entries()))
    if (debouncedSearchTerm) next.set("search", debouncedSearchTerm)
    else next.delete("search")
    const qs = next.toString()
    window.history.replaceState(null, "", qs ? `/courses?${qs}` : "/courses")
  }, [debouncedSearchTerm, searchParams])

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("course_recent_searches")
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5))
      } catch (e) {
        console.error("Failed to parse recent searches", e)
      }
    }
  }, [])

  // Save recent search
  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim() || term.length < 2) return
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== term.toLowerCase())
      const updated = [term, ...filtered].slice(0, 5)
      localStorage.setItem("course_recent_searches", JSON.stringify(updated))
      return updated
    })
  }, [])

  // Generate search suggestions based on course data
  useEffect(() => {
    if (!debouncedSearchTerm.trim() || debouncedSearchTerm.length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    const term = debouncedSearchTerm.toLowerCase()
    const suggestionsSet = new Set<string>()

    // Extract unique terms from courses
    courses.forEach(course => {
      // Title matches
      if (course.title.toLowerCase().includes(term)) {
        suggestionsSet.add(course.title)
      }
      // Tags matches
      if (course.tags) {
        course.tags.forEach(tag => {
          if (tag.toLowerCase().includes(term)) {
            suggestionsSet.add(tag)
          }
        })
      }
      // Category matches
      if (course.course_category?.name?.toLowerCase().includes(term)) {
        suggestionsSet.add(course.course_category.name)
      }
      // Instructor name matches
      if (course.instructor?.first_name || course.instructor?.last_name) {
        const instructorName = `${course.instructor.first_name || ""} ${course.instructor.last_name || ""}`.trim()
        if (instructorName.toLowerCase().includes(term)) {
          suggestionsSet.add(instructorName)
        }
      }
    })

    // Convert to array and limit to 8 suggestions
    const suggestions = Array.from(suggestionsSet).slice(0, 8)
    setSearchSuggestions(suggestions)
    setShowSuggestions(suggestions.length > 0)
  }, [debouncedSearchTerm, courses])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
    const fetchData = async () => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken
      setLoading(true)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/all`, {
          headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
        })
        if (response.ok) {
          const data = await response.json()
          const allCourses = data.data?.courses || []
          setCourses(allCourses)

          const categoryMap = new Map<string, { id: string; name: string; count: number }>()
          allCourses.forEach((course: Course) => {
            if (course.course_category?.id && course.course_category?.name) {
              const id = course.course_category.id
              const name = course.course_category.name
              if (categoryMap.has(id)) {
                const existing = categoryMap.get(id)!
                categoryMap.set(id, { ...existing, count: existing.count + 1 })
              } else {
                categoryMap.set(id, { id, name, count: 1 })
              }
            }
          })
          setCategories(Array.from(categoryMap.values()))
        }
      } catch (err) {
        console.error("Failed to fetch courses", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  /*
   * Asked again whenever the query settles, so the ranking matches what is
   * being shown. A failure here is not an error state: the catalogue simply
   * keeps its unranked order, which is what it had before any of this.
   */
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    discoverCoursesApi({
      search: debouncedSearchTerm,
      limit: 200,
      signal: controller.signal,
    })
      .then((r) => {
        if (!cancelled) setDiscovery(r)
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) setDiscovery(EMPTY_DISCOVERY)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [debouncedSearchTerm, token])

  const handleLearnMoreClick = (courseId: string) => {
    if (!user) {
      setSelectedCourseId(courseId)
      setIsLoginModalOpen(true)
    } else {
      window.location.href = `/courses/${courseId}`
    }
  }

  const handleLoginModalClose = () => {
    setIsLoginModalOpen(false)
    setSelectedCourseId(null)
  }

  /**
   * Where each course sits in the server's ranking, and why.
   *
   * Keyed by id, so a course the ranking has not heard of — one the local
   * filters kept but discovery capped out of its page — is simply absent
   * rather than treated as irrelevant.
   */
  const ranking = useMemo(() => {
    const map = new Map<string, { rank: number; interests: string[] }>()
    discovery.courses.forEach((c, i) => {
      map.set(String(c.id), { rank: i, interests: c.matched_interests ?? [] })
    })
    return map
  }, [discovery])

  // Consistent filtering using debounced search term
  const filteredCourses = useMemo(() => {
    const matching = courses.filter((course) => {
      // Use debouncedSearchTerm for consistent filtering
      const matchesSearch =
        !debouncedSearchTerm.trim() ||
        course.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (course.tags && course.tags.some((tag) => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))) ||
        (course.course_category?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (`${course.instructor?.first_name || ""} ${course.instructor?.last_name || ""}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      
      const matchesLevel = selectedLevel === "all" || course.level === selectedLevel
      const matchesCategory = selectedCategory === "all" || course.category_id === selectedCategory
      const isFree = course.price == 0 || course.price === null || course.price === undefined
      const matchesPrice =
        selectedPrice === "all" || (selectedPrice === "free" && isFree) || (selectedPrice === "paid" && !isFree)
      return matchesSearch && matchesLevel && matchesCategory && matchesPrice
    })

    /*
     * Ordered by the server's ranking, which is the one that knows the
     * learner's interests. Anything the ranking does not cover keeps its
     * original position behind everything it does — never dropped, because a
     * course that passed the filters belongs in the list whatever the ranking
     * happens to know about it.
     */
    if (ranking.size === 0) return matching

    const unranked = ranking.size + 1
    return matching
      .map((course, i) => ({ course, i }))
      .sort((a, b) => {
        const ra = ranking.get(String(a.course.id))?.rank ?? unranked
        const rb = ranking.get(String(b.course.id))?.rank ?? unranked
        return ra === rb ? a.i - b.i : ra - rb
      })
      .map(({ course }) => course)
  }, [courses, debouncedSearchTerm, selectedLevel, selectedCategory, selectedPrice, ranking])

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + itemsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedLevel, selectedCategory, selectedPrice])

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (debouncedSearchTerm.trim().length >= 2) {
      saveRecentSearch(debouncedSearchTerm.trim())
    }
    setShowSuggestions(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    saveRecentSearch(suggestion)
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  const levels = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "BEGINNER": return <Target className="w-3 h-3" />
      case "INTERMEDIATE": return <Trophy className="w-3 h-3" />
      case "ADVANCED":
      case "EXPERT": return <Crown className="w-3 h-3" />
      default: return <Target className="w-3 h-3" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER": return "bg-success/100"
      case "INTERMEDIATE": return "bg-primary"
      case "ADVANCED": return "bg-primary/100"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-muted/500"
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedLevel("all")
    setSelectedCategory("all")
    setSelectedPrice("all")
    setShowSuggestions(false)
  }

  const hasActiveFilters = searchTerm || selectedLevel !== "all" || selectedCategory !== "all" || selectedPrice !== "all"
  const activeFilterCount = [
    selectedLevel !== "all" ? 1 : 0,
    selectedCategory !== "all" ? 1 : 0,
    selectedPrice !== "all" ? 1 : 0
  ].reduce((a, b) => a + b, 0)

  const closeSidebar = () => setSidebarOpen(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-foreground">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs ml-1">{activeFilterCount}</Badge>
          )}
        </div>
        <button
          onClick={closeSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close filters"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2.5 border-2 border-border rounded-lg focus:border-primary focus:outline-none bg-background text-foreground text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Level */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Difficulty Level</label>
          <div className="space-y-1.5">
            <div
              className={cn(
                "p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
                selectedLevel === "all" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
              onClick={() => setSelectedLevel("all")}
            >
              <span className="font-medium text-foreground">All Levels</span>
            </div>
            {levels.map((level) => (
              <div
                key={level}
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
                  selectedLevel === level ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedLevel(level)}
              >
                <div className="flex items-center gap-2">
                  <div className={`${getLevelColor(level)} w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                    {getLevelIcon(level)}
                  </div>
                  <span className="font-medium text-foreground">
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Price</label>
          <div className="space-y-1.5">
            {[
              { value: "all", label: "All Prices", icon: null },
              { value: "free", label: "Free Courses", icon: <Zap className="w-3 h-3" />, color: "text-success" },
              { value: "paid", label: "Premium Courses", icon: <Crown className="w-3 h-3" />, color: "text-warning" },
            ].map((option) => (
              <div
                key={option.value}
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
                  selectedPrice === option.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedPrice(option.value)}
              >
                <div className="flex items-center gap-2">
                  {option.icon && <span className={option.color}>{option.icon}</span>}
                  <span className="font-medium text-foreground">{option.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button onClick={clearAllFilters} variant="outline" className="w-full border-2 text-sm">
            <Target className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        )}

        {/* Stats */}
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h4 className="font-semibold mb-3 text-foreground text-sm">Course Statistics</h4>
          <div className="space-y-2 text-sm">
            {[
              { label: "Total Courses", count: courses.length, color: "bg-primary" },
              { label: "Free Courses", count: courses.filter((c) => c.price == 0 || c.price === null || c.price === undefined).length, color: "bg-success" },
              { label: "Premium Courses", count: courses.filter((c) => Number(c.price) > 0).length, color: "bg-warning" },
              { label: "MOOC Courses", count: courses.filter((c) => c.course_type === "MOOC").length, color: "bg-primary" },
              { label: "SPOC Courses", count: courses.filter((c) => c.course_type === "SPOC").length, color: "bg-primary" },
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* The same bar the loaded page renders, so it does not swap. */}
        <CatalogueNav searchValue={searchTerm} />

        <div className="flex mt-10 min-h-[calc(100vh-64px)]">
          {/* The filter rail, held open so the grid does not shift when it
              appears. */}
          <aside className="hidden lg:block w-72 xl:w-80 shrink-0 border-r border-border bg-card" />

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 h-10 max-w-md animate-pulse rounded-lg bg-secondary" />
            <div className="mb-5 h-8 w-48 animate-pulse rounded-lg bg-secondary" />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="h-44 animate-pulse bg-secondary" />
                  <div className="space-y-3 p-4">
                    <div className="h-5 animate-pulse rounded bg-secondary" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
                    <div className="h-8 animate-pulse rounded bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/*
        The catalogue bar, shared with the course page and the institution
        catalogue (CS-001), and the same one the loading state renders — so
        the header does not change under the reader when the courses land.
      */}
      <CatalogueNav searchValue={searchTerm} />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleLoginModalClose}
        redirectTo={selectedCourseId ? `/courses/${selectedCourseId}` : '/courses'}
        message="Sign in to view course details and enroll."
      />

      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      <div className="flex mt-10 min-h-[calc(100vh-64px)]">
        {/* Desktop Sidebar */}
        <CollapsibleFilterSidebar activeCount={activeFilterCount}>
          <SidebarContent />
        </CollapsibleFilterSidebar>

        {/* Mobile Drawer */}
        <div
          className={cn(
            "fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 bg-card border-r border-border z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-5">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="outline"
              className="border-2 shadow-sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 bg-primary text-primary-foreground text-xs">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          {/*
            Header, in the reference's shape: a trail, the identity of the
            page on the left, and the figures that describe the catalogue on
            the right — rather than a centred banner that says what the page
            is without saying what is in it.

            Every number is counted from the courses actually loaded.
          */}
          <div className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                <li><Link href="/" className="hover:text-foreground hover:underline">Home</Link></li>
                <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
                <li className="font-semibold text-foreground">Courses</li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <h1 className="text-[28px] font-bold leading-tight text-foreground sm:text-[34px]">
                  Browse Courses
                </h1>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  Discover and enroll in courses from our collection.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[15px] font-bold leading-tight text-foreground">
                    {courses.length}
                  </p>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    courses available
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/*
            The facts strip. Same four-column divided shape the course page
            uses, so the catalogue and a course read as one product.
          */}
          <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4 shadow-sm sm:px-6">
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
              <div className="lg:pr-6">
                <p className="text-[15px] font-bold text-foreground">
                  {filteredCourses.length} Showing
                </p>
                <p className="mt-1.5 text-[14px] text-muted-foreground">
                  {hasActiveFilters ? "filtered" : "of all courses"}
                </p>
              </div>
              <div className="lg:px-6">
                <p className="text-[15px] font-bold text-foreground">
                  {courses.reduce((a, c) => a + (c.enrollment_count || 0), 0).toLocaleString()}
                </p>
                <p className="mt-1.5 text-[14px] text-muted-foreground">learners enrolled</p>
              </div>
              <div className="lg:px-6">
                <p className="text-[15px] font-bold text-foreground">
                  {new Set(courses.map((c) => c.course_category?.name).filter(Boolean)).size}
                </p>
                <p className="mt-1.5 text-[14px] text-muted-foreground">categories</p>
              </div>
              <div className="lg:pl-6">
                <p className="text-[15px] font-bold text-foreground">
                  {courses.filter((c) => c.is_certificate_available).length}
                </p>
                <p className="mt-1.5 text-[14px] text-muted-foreground">with a certificate</p>
              </div>
            </div>
          </div>
          {/* Smart Search Bar - Prominent on Main Content */}
          <div className="mb-6 max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Smart search: Try 'Python', 'Beginner', 'Data Science', or instructor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (searchSuggestions.length > 0 && searchTerm.length >= 2) {
                      setShowSuggestions(true)
                    }
                  }}
                  className="pl-12 pr-12 py-6 text-base border-2 focus:border-primary shadow-sm rounded-xl"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                ) : (
                  <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/50" />
                )}
              </div>

              {/* Search Suggestions Dropdown for Main Search */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      SUGGESTIONS
                    </span>
                    <span className="text-[10px] text-muted-foreground">{searchSuggestions.length} results</span>
                  </div>
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                    >
                      <Search className="w-4 h-4 text-primary/60" />
                      <span className="text-foreground">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Recent Searches Quick Access */}
            {recentSearches.length > 0 && !searchTerm && (
              <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Recent:
                </span>
                {recentSearches.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchTerm(term)
                      saveRecentSearch(term)
                    }}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted/50 hover:bg-primary/20 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {term}
                  </button>
                ))}
                <button
                  onClick={() => {
                    localStorage.removeItem("course_recent_searches")
                    setRecentSearches([])
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/*
            Says that the order is not arbitrary (CE-001 §5).

            Only when the learner actually gave answers to order by — there is
            nothing more hollow than a personalisation notice on a list that
            has not been personalised. And it names the interests, so a learner
            who disagrees knows what to go and change.
          */}
          {discovery.personalised && discovery.interests.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">Ordered for you.</span>{" "}
                Courses matching the interests you chose when you registered (
                {discovery.interests.slice(0, 4).map(interestLabel).join(", ")}
                {discovery.interests.length > 4 ? ", and more" : ""}) come first. Nothing
                is hidden — every course that matches your filters is still listed.
              </p>
            </div>
          )}

          {/* Results Count with Animation */}
          <div className="mb-5 flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1.5 text-sm border-primary/30 bg-primary/10 text-primary">
                <Trophy className="w-3 h-3 mr-1.5" />
                {filteredCourses.length} Courses Found
              </Badge>
              <span className="text-muted-foreground text-sm">out of {courses.length} total</span>
            </div>
            {debouncedSearchTerm && (
              <Badge variant="secondary" className="text-xs">
                Searching for: "{debouncedSearchTerm}"
              </Badge>
            )}
          </div>

          {/* Courses Grid */}
          {paginatedCourses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginatedCourses.map((course, index) => {
                  // Why this card is where it is, when there is a reason.
                  // The card component is shared with other surfaces, so the
                  // note sits above it rather than inside it.
                  const matched = ranking.get(String(course.id))?.interests ?? []
                  return (
                    <div key={course.id} className="flex flex-col">
                      {matched.length > 0 && (
                        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            Matches your interest in{" "}
                            {matched.slice(0, 2).map(interestLabel).join(" · ")}
                          </span>
                        </p>
                      )}
                  <BwengeCourseCard3D
                    id={course.id}
                    title={course.title}
                    description={course.description}
                    thumbnail_url={course.thumbnail_url}
                    instructor={course.instructor ? {
                      id: course.instructor.id,
                      first_name: course.instructor.first_name || "",
                      last_name: course.instructor.last_name || "",
                      profile_picture_url: course.instructor.profile_picture_url
                    } : undefined}
                    course_type={course.course_type}
                    level={course.level}
                    duration_minutes={course.duration_minutes || 0}
                    price={Number(course.price) || 0}
                    is_free={(course as any).is_free}
                    currency={(course as any).currency}
                    enrollment_count={Number(course.enrollment_count) || 0}
                    average_rating={Number(course.average_rating) || 0}
                    total_reviews={Number(course.total_reviews) || 0}
                    total_lessons={Number(course.total_lessons) || 0}
                    category={course.course_category}
                    institution={course.institution}
                    is_certificate_available={course.is_certificate_available}
                    tags={course.tags}
                    onLearnMoreClick={handleLearnMoreClick}
                    index={index}
                  />
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-10">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          className={cn(
                            currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-accent"
                          )}
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
                          className={cn(
                            currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-accent"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="bg-accent rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">No Courses Match Your Criteria</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
                Try adjusting your filters or search terms to discover more learning opportunities
              </p>
              <Button onClick={clearAllFilters} variant="outline" size="lg" className="border-2">
                <Target className="w-4 h-4 mr-2" />
                Reset All Filters
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}