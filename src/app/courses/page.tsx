"use client"

import { useEffect, useState } from "react"
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
  Loader2
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/hooks/use-auth"
import { BrowseCourseCard } from "@/components/course/browse-course-card"
import { Course } from "@/types"
import Cookies from "js-cookie"
import { LoginModal } from "@/components/auth/LoginModal"
import { cn } from "@/lib/utils"

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("")
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

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // On desktop, sidebar is always visible (not tracked by sidebarOpen)
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
        console.error("Error fetching data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

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

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.tags && course.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    const matchesLevel = selectedLevel === "all" || course.level === selectedLevel
    const matchesCategory = selectedCategory === "all" || course.category_id === selectedCategory
    const isFree = course.price == 0 || course.price === null || course.price === undefined
    const matchesPrice =
      selectedPrice === "all" || (selectedPrice === "free" && isFree) || (selectedPrice === "paid" && !isFree)
    return matchesSearch && matchesLevel && matchesCategory && matchesPrice
  })

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedLevel, selectedCategory, selectedPrice])

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
      case "BEGINNER": return "bg-emerald-500"
      case "INTERMEDIATE": return "bg-blue-500"
      case "ADVANCED": return "bg-purple-500"
      case "EXPERT": return "bg-pink-500"
      default: return "bg-gray-500"
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedLevel("all")
    setSelectedCategory("all")
    setSelectedPrice("all")
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
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge className="bg-blue-600 text-white text-xs ml-1">{activeFilterCount}</Badge>
          )}
        </div>
        {/* Close button - always rendered but only visible on mobile */}
        <button
          onClick={closeSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          aria-label="Close filters"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Search */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Search Courses</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Title, description, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2 focus:border-blue-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-sm"
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
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Difficulty Level</label>
          <div className="space-y-1.5">
            <div
              className={cn(
                "p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
                selectedLevel === "all" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              )}
              onClick={() => setSelectedLevel("all")}
            >
              <span className="font-medium text-gray-800">All Levels</span>
            </div>
            {levels.map((level) => (
              <div
                key={level}
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
                  selectedLevel === level ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                )}
                onClick={() => setSelectedLevel(level)}
              >
                <div className="flex items-center gap-2">
                  <div className={`${getLevelColor(level)} w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                    {getLevelIcon(level)}
                  </div>
                  <span className="font-medium text-gray-800">
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Price</label>
          <div className="space-y-1.5">
            {[
              { value: "all", label: "All Prices", icon: null },
              { value: "free", label: "Free Courses", icon: <Zap className="w-3 h-3" />, color: "text-green-500" },
              { value: "paid", label: "Premium Courses", icon: <Crown className="w-3 h-3" />, color: "text-yellow-500" },
            ].map((option) => (
              <div
                key={option.value}
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all text-sm",
                  selectedPrice === option.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                )}
                onClick={() => setSelectedPrice(option.value)}
              >
                <div className="flex items-center gap-2">
                  {option.icon && <span className={option.color}>{option.icon}</span>}
                  <span className="font-medium text-gray-800">{option.label}</span>
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
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <h4 className="font-semibold mb-3 text-blue-900 text-sm">Course Statistics</h4>
          <div className="space-y-2 text-sm">
            {[
              { label: "Total Courses", count: courses.length, color: "bg-blue-600" },
              { label: "Free Courses", count: courses.filter((c) => c.price == 0 || c.price === null || c.price === undefined).length, color: "bg-green-600" },
              { label: "Premium Courses", count: courses.filter((c) => Number(c.price) > 0).length, color: "bg-yellow-600" },
              { label: "MOOC Courses", count: courses.filter((c) => c.course_type === "MOOC").length, color: "bg-purple-600" },
              { label: "SPOC Courses", count: courses.filter((c) => c.course_type === "SPOC").length, color: "bg-indigo-600" },
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header user={user ? {
          id: user.id,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          email: user.email,
          profile_picture_url: user.profile_picture_url,
          bwenge_role: user.bwenge_role,
          total_learning_hours: user.total_learning_hours,
          certificates_earned: user.certificates_earned,
          institution: user.institution
        } : undefined} />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-lg text-gray-600">Loading courses...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header user={user ? {
        id: user.id,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email,
        profile_picture_url: user.profile_picture_url,
        bwenge_role: user.bwenge_role,
        total_learning_hours: user.total_learning_hours,
        certificates_earned: user.certificates_earned,
        institution: user.institution
      } : undefined} />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleLoginModalClose}
        redirectTo={selectedCourseId ? `/courses/${selectedCourseId}` : '/courses'}
        message="Sign in to view course details and enroll."
      />

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      <div className="flex mt-10 min-h-[calc(100vh-64px)]">
        {/* ===== SIDEBAR ===== */}
        {/* Desktop: always visible, sticky */}
        <aside className="hidden lg:flex flex-col sticky top-16 h-[calc(100vh-4rem)] w-72 xl:w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
          <SidebarContent />
        </aside>

        {/* Mobile: slide-in drawer */}
        <div
          className={cn(
            "fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 bg-white border-r border-gray-200 z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent />
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
          {/* Mobile filter toggle */}
          <div className="lg:hidden mb-5">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="outline"
              className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white text-xs">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          {/* Hero Header */}
          <div className="text-center mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl -z-10" />
            <div className="py-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <BookOpen className="w-7 h-7 text-blue-600" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Browse Courses
                </h1>
              </div>
              <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto">
                Discover and enroll in courses from our collection
              </p>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-5 flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="px-3 py-1.5 text-sm border-blue-200 bg-blue-50 text-blue-700">
              <Trophy className="w-3 h-3 mr-1.5" />
              {filteredCourses.length} Courses Found
            </Badge>
            <span className="text-gray-500 text-sm">out of {courses.length} total</span>
          </div>

          {/* Courses Grid */}
          {paginatedCourses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginatedCourses.map((course) => (
                  <BrowseCourseCard
                    key={course.id}
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
                    language={course.language || "English"}
                    duration_minutes={course.duration_minutes || 0}
                    price={Number(course.price) || 0}
                    enrollment_count={Number(course.enrollment_count) || 0}
                    average_rating={Number(course.average_rating) || 0}
                    total_reviews={Number(course.total_reviews) || 0}
                    total_lessons={Number(course.total_lessons) || 0}
                    category={course.course_category}
                    institution={course.institution}
                    is_certificate_available={course.is_certificate_available}
                    tags={course.tags}
                    onLearnMoreClick={handleLearnMoreClick}
                  />
                ))}
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
                            currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-blue-50"
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
                            currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-blue-50"
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
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Search className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">No Courses Match Your Criteria</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
                Try adjusting your filters to discover more learning opportunities
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