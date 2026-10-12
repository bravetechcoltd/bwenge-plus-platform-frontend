// @ts-nocheck

"use client"

import { CourseSearch } from "@/components/courses/course-search"
import HomeNavigation, {
  determineActualRole,
  getRoleDashboardPath,
  GoogleLoginButton,
} from "@/components/layout/home-navigation"
import Image from "next/image"
import api from "@/lib/api"
import AboutSections, {
  ABOUT_NAV_ITEMS,
  ABOUT_NAV_HEADING,
} from "@/components/home/about-sections"
import type React from "react"
import { hardSignOut } from "@/lib/auth/hard-sign-out"
import { motion, AnimatePresence } from "framer-motion"
import {
  Menu,
  X,
  BookOpen,
  Users,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronRight,
  Star,
  CheckCircle,
  Globe,
  ArrowRight,
  Clock,
  Mail,
  Loader2,
  Shield,
  GraduationCap,
  Play,
  Zap,
  Target,
  Brain,
  Code,
  Palette,
  BarChart3,
  Rocket,
  Download,
  Headphones,
  Smartphone,
  Laptop,
  ChevronUp,
  LogOut,
  Search,
  Bookmark,
  ChevronLeft,
  User,
  Settings,
  Building2,
  LayoutDashboard,
  FileText,
  HelpCircle,
  Crown,
  Trophy,
  Sun,
  Moon,
} from "lucide-react"
import { Instagram, Twitter, Facebook, Linkedin } from "lucide-react"

import { useEffect, useState, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { fetchPublicInstitutionsForHomepage } from "@/lib/features/institutions/institutionSlice"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { logoutBwenge, loginWithGoogle } from "@/lib/features/auth/auth-slice"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/lib/store"
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import { GoogleOneTapLogin, GoogleSignInButton } from '@/components/auth/GoogleOneTap'
import Cookies from "js-cookie"
import { LoginModal } from "@/components/auth/LoginModal"
import { Course } from "@/types"
import { Badge } from "@/components/ui/badge"
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d"

// ==================== ENHANCED ROLE UTILITIES ====================

export enum BwengeRole {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  LEARNER = "LEARNER",
}

export enum SystemType {
  BWENGEPLUS = "BWENGEPLUS",
  ONGERA = "ONGERA",
}


function HeroSection() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  /*
   * HS-001. The slides, from the database when it has them.
   *
   * Named bannerImages so the markup below is unchanged — it already reads
   * this list, and the only thing that moved is where the list comes from.
   */
  const bannerImages = useHeroSlides()

  /*
   * The database list may be shorter than the fallback, which would leave the
   * index pointing past the end and render undefined.
   */
  useEffect(() => {
    if (currentBannerIndex >= bannerImages.length) setCurrentBannerIndex(0)
  }, [bannerImages.length, currentBannerIndex])
  const router = useRouter()
  const { user: reduxUser, isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const { isLoadingPublic, publicInstitutions } = useAppSelector((state) => state.institutions)
  const dispatch = useAppDispatch()

  const [actualRole, setActualRole] = useState<string>("LEARNER")

  useEffect(() => {
    const determinedRole = determineActualRole(reduxUser)
    setActualRole(determinedRole)
  }, [reduxUser])

  useEffect(() => {
    if (publicInstitutions.length === 0) {
      dispatch(fetchPublicInstitutionsForHomepage())
    }
  }, [dispatch, publicInstitutions.length])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleCategoryClick = (institutionSlug: string, category: string) => {
    router.push(`/institutions/${institutionSlug}/courses?category=${encodeURIComponent(category)}`)
  }

  const nextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length)
  }

  const prevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)
  }

  // Skeleton component for sidebar loading
  const SidebarSkeleton = () => (
    <div className="p-4 pt-11 space-y-4">
      {/* Header skeleton */}
      <div className="mb-4">
        <div className="h-3 w-32 bg-muted rounded animate-pulse mb-1"></div>
        <div className="h-2 w-40 bg-muted/60 rounded animate-pulse"></div>
      </div>

      {/* Institution skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-muted rounded-lg animate-pulse"></div>
            <div className="flex-1">
              <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="w-5 h-5 bg-muted rounded-md animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    // The header is fixed, so this padding is what stops it covering the top of
    // the page. It gains the height of the search row at lg, which is exactly
    // where that row appears. The sidebar below is pinned to the same offset.
    <section className="bg-background pt-16 lg:pt-[7.25rem]">
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside
          className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 z-40 overflow-y-auto ${isSidebarOpen ? "w-64" : "w-0 md:w-12"
            }`}
        >
          {/* Toggle button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute right-[10px] top-[18px] w-[26px] h-[26px] bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm hover:bg-primary/80 hover:text-primary-foreground hover:shadow-primary hover:shadow-md transition-all duration-200 z-50"
          >
            {isSidebarOpen
              ? <ChevronLeft className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {/* Open state */}
          {isSidebarOpen && (
            <div className="p-4 pt-11">
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                  Browse Institutions
                </h3>
                <p className="text-[11px] text-muted-foreground/70">Select to view course categories</p>
              </div>

              {/* Smart Compact Skeleton Loading */}
              {isLoadingPublic ? (
                <SidebarSkeleton />
              ) : publicInstitutions.length > 0 ? (
                <div className="space-y-2">
                  {publicInstitutions.map((institution) => (
                    <div
                      key={institution.id}
                      className={`border rounded-xl overflow-hidden transition-all duration-200 ${selectedInstitution === institution.id
                          ? "border-primary/30 shadow-sm"
                          : "border-border hover:border-border/80 hover:shadow-sm"
                        }`}
                    >
                      {/* Institution button */}
                      <button
                        onClick={() =>
                          setSelectedInstitution(
                            selectedInstitution === institution.id ? null : institution.id
                          )
                        }
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-accent transition-colors"
                      >
                        <img
                          src={institution.logo_url || "/placeholder.svg"}
                          alt={institution.name}
                          className="w-8 h-8 rounded-lg object-cover bg-accent flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg"
                          }}
                        />
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-[12px] font-medium text-foreground line-clamp-2 leading-snug">
                            {institution.name}
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${selectedInstitution === institution.id
                              ? "bg-primary/20"
                              : "bg-accent"
                            }`}
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-all duration-250 ${selectedInstitution === institution.id
                                ? "rotate-180 text-primary"
                                : "text-muted-foreground"
                              }`}
                          />
                        </div>
                      </button>

                      {/* Category list */}
                      {selectedInstitution === institution.id &&
                        institution.categories.length > 0 && (
                          <div className="px-2 pb-2 pt-1 space-y-0.5 bg-accent/50 border-t border-border">
                            {institution.categories.map((category) => (
                              <button
                                key={category.id}
                                onClick={() =>
                                  handleCategoryClick(institution.slug, category.name)
                                }
                                className="group w-full text-left px-2.5 py-[7px] rounded-lg flex items-center gap-2 hover:bg-accent transition-colors"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0 group-hover:bg-primary transition-colors" />
                                <span className="flex-1 text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">
                                  {category.name}
                                </span>
                                <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                  {category.course_count}{" "}
                                  {category.course_count === 1 ? "course" : "courses"}
                                </span>
                                <ArrowRight className="w-2.5 h-2.5 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}

                      {selectedInstitution === institution.id &&
                        institution.categories.length === 0 && (
                          <div className="px-3 pb-3 pt-1 bg-accent/50 border-t border-border">
                            <p className="text-[11px] text-muted-foreground text-center py-2">
                              No course categories available
                            </p>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[12px] text-muted-foreground">No institutions available</p>
                </div>
              )}
            </div>
          )}

          {/* Collapsed icon column */}
          {!isSidebarOpen && (
            <div className="hidden md:flex flex-col items-center py-4 gap-4 mt-12">
              <BookOpen className="w-[18px] h-[18px] text-muted-foreground" />
              <GraduationCap className="w-[18px] h-[18px] text-muted-foreground" />
              <Users className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "md:ml-0" : "ml-0"}`}>
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Banner Grid with Equal Height */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Left: Sliding Banner - Full Height */}
              <div className="lg:col-span-2">
                <div className="relative h-full min-h-[400px] lg:min-h-0 rounded-xl overflow-hidden shadow-lg group">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentBannerIndex}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0"
                    >
                      <img
                        src={bannerImages[currentBannerIndex].image || "/placeholder.svg"}
                        alt={bannerImages[currentBannerIndex].title}
                        className="w-full h-full object-cover"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent ${currentBannerIndex === 0 ? 'from-primary/90 via-primary/50 to-transparent' : ''
                        }`} />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        {currentBannerIndex === 0 && (
                          <div className="inline-flex items-center gap-2 bg-primary/90 backdrop-blur-sm rounded-full px-3 py-1 mb-3">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider">TRENDING NOW</span>
                          </div>
                        )}
                        <h2 className="text-2xl md:text-3xl font-bold mb-2">
                          {bannerImages[currentBannerIndex].title}
                        </h2>
                        <p className="text-sm md:text-base text-white/90">
                          {bannerImages[currentBannerIndex].description}
                        </p>
                        {currentBannerIndex === 0 && (
                          <button
                            onClick={() => router.push('/blog/education-trending-news')}
                            className="mt-4 inline-flex items-center gap-2 bg-white text-primary px-5 py-2 rounded-lg font-semibold text-sm hover:bg-white/90 transition-all shadow-lg"
                          >
                            Learn the Strategies
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <button
                    onClick={prevBanner}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <button
                    onClick={nextBanner}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {bannerImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentBannerIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${index === currentBannerIndex ? "bg-card w-6" : "bg-card/50 hover:bg-card/75"
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Platform Info - Full Height */}
              <div className="lg:col-span-1">
                <div className="bg-primary rounded-xl p-6 text-primary-foreground h-full min-h-[400px] lg:min-h-0 shadow-lg flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary-foreground/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">BwengePlus</h3>
                      <p className="text-xs text-primary-foreground/80">Never Stop Learning</p>
                    </div>
                  </div>

                  <p className="text-sm mb-6 text-primary-foreground/90 leading-relaxed flex-1">
                    Rwanda's premier integrated e-learning platform delivering quality education through MOOCs and SPOCs
                    for institutions, professionals, and lifelong learners.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-foreground/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Secure Learning</h4>
                        <p className="text-xs text-primary-foreground/80">Private SPOCs for institutions</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-foreground/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Open Access</h4>
                        <p className="text-xs text-primary-foreground/80">Public MOOCs for everyone</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-foreground/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Certified Learning</h4>
                        <p className="text-xs text-primary-foreground/80">Industry-recognized certificates</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-primary-foreground/20 mt-auto">
                    <div>
                      <div className="text-2xl font-bold">{mockStats.partnerInstitutions}+</div>
                      <div className="text-xs text-primary-foreground/80">Partner Institutions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{mockStats.completionRate}%</div>
                      <div className="text-xs text-primary-foreground/80">Completion Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Search Section */}
            <SearchSection />
          </div>
        </div>
      </div>
    </section>
  )
}
// Mock data (preserved from original)
const mockStats = {
  coursesCount: 1250,
  learnersCount: 52300,
  instructorsCount: 420,
  certificatesIssued: 28500,
  completionRate: 89,
  partnerInstitutions: 35,
}

/**
 * HS-001. The slides the page falls back on.
 *
 * These five were the banner: changing a headline on the front page meant a
 * code change and a deploy. They are seeded into hero_slides, so the page
 * normally shows the database copy and an admin edits it at
 * /dashboard/system-admin/hero-slides.
 *
 * They stay here as the fallback rather than being deleted. The banner is
 * the first thing every visitor sees, and a request that fails should leave
 * it looking the way it does today rather than empty.
 */
const FALLBACK_BANNERS = [
  {
    id: 0,
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=400&fit=crop",
    title: "How to Create Education Trending News",
    description: "Master the art of crafting viral educational content that engages and inspires learners worldwide",
  },
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=400&fit=crop",
    title: "Learn Together",
    description: "Join collaborative learning communities",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&h=400&fit=crop",
    title: "Expert Instructors",
    description: "Learn from industry professionals",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=400&fit=crop",
    title: "Flexible Learning",
    description: "Study at your own pace, anywhere",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200&h=400&fit=crop",
    title: "Career Growth",
    description: "Advance your professional skills",
  },
]

/**
 * The banner slides (HS-001).
 *
 * The database first, the built-in list when it has nothing to say —
 * which covers an empty table, a failed request and a backend that has
 * not been redeployed yet. The shape returned is the one the markup
 * already uses, so the rendering did not have to change.
 */
function useHeroSlides() {
  const [slides, setSlides] = useState(FALLBACK_BANNERS)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await api.get("/hero-slides")
        const rows = Array.isArray(res.data?.data) ? res.data.data : []
        if (cancelled || rows.length === 0) return

        setSlides(
          rows.map((slide: any, index: number) => ({
            id: index,
            image: slide.image_url || undefined,
            title: slide.headline || slide.title,
            description: slide.description,
            eyebrow: slide.eyebrow,
            cta_text: slide.cta_text,
            cta_href: slide.cta_href,
          }))
        )
      } catch {
        // The built-in slides stay. A banner that failed to load is not
        // something a visitor can act on.
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return slides
}
// Updated CategoryFilters component that filters the FeaturedCourses section
function CategoryFilters({ onCategoryChange, activeCategory }: {
  onCategoryChange: (category: string) => void;
  activeCategory: string;
}) {
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/all`)
        const data = await response.json()

        if (data.success) {
          const courses = data.data.courses || []

          // Extract unique categories from courses
          const categoryMap = new Map<string, number>()

          // Add course types as categories
          const moocCount = courses.filter((c: any) => c.course_type === "MOOC").length
          const spocCount = courses.filter((c: any) => c.course_type === "SPOC").length

          if (moocCount > 0) categoryMap.set("MOOC", moocCount)
          if (spocCount > 0) categoryMap.set("SPOC", spocCount)

          // Add free courses category
          const freeCount = courses.filter((c: any) => c.price == 0 || c.price === null).length
          if (freeCount > 0) categoryMap.set("Free", freeCount)

          // Add categories from course_category
          courses.forEach((course: any) => {
            if (course.course_category?.name) {
              const name = course.course_category.name
              categoryMap.set(name, (categoryMap.get(name) || 0) + 1)
            }
          })

          // Convert map to array and sort by count
          const categoryList = Array.from(categoryMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8) // Take top 8 categories

          setCategories([
            { name: "All", count: courses.length },
            ...categoryList
          ])
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (isLoading) {
    return (
      <div className="py-4 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-24 bg-secondary rounded-full animate-pulse flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 bg-card border-b border-border sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => onCategoryChange(category.name)}
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${activeCategory === category.name
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchSection() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, user } = useSelector((state: RootState) => state.bwengeAuth)
  const [actualRole, setActualRole] = useState<string>("LEARNER")
  const [stats, setStats] = useState({
    coursesCount: 0,
    learnersCount: 0,
    instructorsCount: 0,
    certificatesIssued: 0,
    completionRate: 89,
    partnerInstitutions: 0
  })

  useEffect(() => {
    const determinedRole = determineActualRole(user)
    setActualRole(determinedRole)

    // Fetch real stats
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/all`)
        const data = await response.json()

        if (data.success) {
          const courses = data.data.courses || []
          const uniqueInstructors = new Set(courses.map((c: any) => c.instructor_id)).size

          setStats({
            coursesCount: courses.length,
            learnersCount: courses.reduce((acc: number, c: any) => acc + (c.enrollment_count || 0), 0),
            instructorsCount: uniqueInstructors,
            certificatesIssued: courses.filter((c: any) => c.is_certificate_available).length * 100,
            completionRate: 89,
            partnerInstitutions: 35
          })
        }
      } catch (error) {
      }
    }

    fetchStats()
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (query.length < 2) {
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setShowResults(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/search?q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data?.courses || [])
      }
    } catch (error) {
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery)}`)
      setShowResults(false)
    }
  }

  const handleResultClick = (courseId: string) => {
    router.push(`/courses/${courseId}`)
    setShowResults(false)
    setSearchQuery("")
  }

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 mb-8 border border-border" ref={searchRef}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 text-center">
          Find Your Perfect Course
        </h2>

        {/* Search Bar with Autocomplete */}
        <form onSubmit={handleSearchSubmit} className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            placeholder="Search courses, skills, institutions, or instructors..."
            className="w-full pl-12 pr-24 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary transition-colors"
          >
            Search
          </button>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-xl border border-border overflow-hidden z-50"
              >
                {isSearching ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => handleResultClick(course.id)}
                        className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                      >
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-foreground">{course.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {course.instructor?.first_name} {course.instructor?.last_name} • {course.course_type}
                          </p>
                        </div>
                        <Badge className={course.course_type === "MOOC" ? "bg-primary" : "bg-primary/100"}>
                          {course.course_type}
                        </Badge>
                      </div>
                    ))}
                    <div className="p-2 bg-muted/50 text-center">
                      <button
                        onClick={handleSearchSubmit}
                        className="text-sm text-primary hover:text-primary font-medium"
                      >
                        View all results for "{searchQuery}"
                      </button>
                    </div>
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No courses found matching "{searchQuery}"
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Stats Row - Dynamic */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-medium">{stats.coursesCount.toLocaleString()}+</span>
            <span>Courses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-success" />
            <span className="font-medium">{Math.round(stats.learnersCount / 1000)}K+</span>
            <span>Learners</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary" />
            <span className="font-medium">{Math.round(stats.certificatesIssued / 1000)}K+</span>
            <span>Certificates</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-warning" />
            <span className="font-medium">{stats.instructorsCount}+</span>
            <span>Instructors</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={isAuthenticated ? getRoleDashboardPath(actualRole) : "/register"}
              className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
            >
              <Rocket className="w-4 h-4" />
              {isAuthenticated ? "Go to Dashboard" : "Start Learning Free"}
            </Link>
            <Link
              href="/courses"
              className="px-6 py-2.5 border-2 border-border text-muted-foreground text-sm font-medium rounded-lg hover:bg-muted/50 flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Browse All Courses
            </Link>
          </div>

          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="pt-3 border-t border-border"
            >
              <p className="text-xs text-muted-foreground text-center mb-2">Or continue with</p>
              <div className="max-w-xs mx-auto">
                <GoogleLoginButton />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Quick access with your Google account
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// Enhanced FeaturedCourses component with clean smart compact card design
function FeaturedCourses({ activeCategory }: { activeCategory: string }) {
  const router = useRouter()
  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Fetch courses once on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true)
        const token = Cookies.get("bwenge_token")

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/all?limit=50`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        )

        const data = await response.json()
        if (data.success) {
          setCourses(data.data.courses || [])
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Filter courses locally when activeCategory changes - NO API CALL
  useEffect(() => {
    if (!courses.length) return

    if (activeCategory === "All") {
      setFilteredCourses(courses)
    } else if (activeCategory === "MOOC") {
      setFilteredCourses(courses.filter(c => c.course_type === "MOOC"))
    } else if (activeCategory === "SPOC") {
      setFilteredCourses(courses.filter(c => c.course_type === "SPOC"))
    } else if (activeCategory === "Free") {
      setFilteredCourses(courses.filter(c => c.price == 0 || c.price === null))
    } else {
      // Filter by course category name
      setFilteredCourses(courses.filter(c =>
        c.course_category?.name === activeCategory
      ))
    }
  }, [activeCategory, courses])

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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return <Target className="w-3.5 h-3.5" />
      case "INTERMEDIATE":
        return <Trophy className="w-3.5 h-3.5" />
      case "ADVANCED":
      case "EXPERT":
        return <Crown className="w-3.5 h-3.5" />
      default:
        return <Target className="w-3.5 h-3.5" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return "bg-success/100"
      case "INTERMEDIATE":
        return "bg-primary"
      case "ADVANCED":
        return "bg-primary/100"
      case "EXPERT":
        return "bg-pink-500"
      default:
        return "bg-muted/500"
    }
  }

  if (isLoading) {
    return (
      <section id="courses" className="scroll-mt-20 py-12 bg-muted/50 lg:scroll-mt-[8rem]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Courses</h2>
              <p className="text-muted-foreground">Loading courses...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden animate-pulse">
                <div className="h-48 bg-secondary"></div>
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-secondary rounded w-3/4"></div>
                  <div className="h-3 bg-secondary rounded w-1/2"></div>
                  <div className="h-3 bg-secondary rounded w-full"></div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 bg-secondary rounded w-1/3"></div>
                    <div className="h-8 bg-secondary rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="courses" className="scroll-mt-20 py-12 bg-muted/50 lg:scroll-mt-[8rem]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Featured Courses</h2>
            <p className="text-muted-foreground">
              {activeCategory === "All"
                ? `Showing all ${filteredCourses.length} courses`
                : `${activeCategory} courses (${filteredCourses.length} available)`}
            </p>
          </div>
          <Link href="/courses" className="text-primary hover:text-primary font-medium flex items-center gap-1 text-sm">
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={handleLoginModalClose}
          redirectTo={selectedCourseId ? `/courses/${selectedCourseId}` : '/courses'}
          message="Sign in to view course details and enroll."
        />

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredCourses.slice(0, 8).map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <BwengeCourseCard3D
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  thumbnail_url={course.thumbnail_url}
                  instructor={course.instructor ? {
                    id: course.instructor.id,
                    first_name: course.instructor.first_name || "",
                    last_name: course.instructor.last_name || "",
                    profile_picture_url: course.instructor.profile_picture_url,
                  } : undefined}
                  level={course.level}
                  course_type={course.course_type}
                  price={Number(course.price) || 0}
                  average_rating={Number(course.average_rating) || 0}
                  total_reviews={Number(course.total_reviews) || 0}
                  enrollment_count={Number(course.enrollment_count) || 0}
                  duration_minutes={course.duration_minutes || 0}
                  total_lessons={Number(course.total_lessons) || 0}
                  category={course.course_category}
                  institution={course.institution}
                  is_certificate_available={course.is_certificate_available}
                  tags={course.tags}
                  onLearnMoreClick={handleLearnMoreClick}
                  index={index}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No courses found</h3>
            <p className="text-muted-foreground">
              No courses available in the "{activeCategory}" category.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-primary hover:text-primary font-medium"
            >
              Try refreshing
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
/**
 * The homepage instructor section (HP-001).
 *
 * It used to render three people who do not exist — Dr. Sarah Johnson, Prof.
 * Michael Chen and Emma Wilson — with stock photographs, invented student
 * counts and invented ratings, under a heading thanking them for their work.
 * Every figure on the front page was fiction.
 *
 * It now reads /featured-instructors, which a system admin curates at
 * /dashboard/system-admin/instructors. Course and student counts come from
 * the instructor's published courses, so they are the real ones.
 *
 * ── Why the section can disappear ─────────────────────────────────────────
 *
 * With nobody featured there is nothing truthful to show, so the section
 * renders nothing at all. That is the point: the alternative is to fall back
 * to placeholders, which is exactly the state being removed. The same applies
 * when the request fails — a heading with no cards under it would be worse
 * than an absent section.
 */
interface HomepageInstructor {
  id: string
  name: string
  headline: string
  avatar_url: string | null
  expertise: string[]
  is_featured: boolean
  course_count: number
  student_count: number
  rating: number
}

/** 25,000 students is "25K"; 300 students is "300", not "0K". */
function compactCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value < 1000) return String(Math.round(value))
  const thousands = value / 1000
  return (thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10) + "K"
}

function TopInstructors() {
  const [instructors, setInstructors] = useState<HomepageInstructor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await api.get("/featured-instructors?limit=6")
        if (cancelled) return
        setInstructors(Array.isArray(res.data?.data) ? res.data.data : [])
      } catch {
        // An unreachable editorial endpoint hides the section; it never breaks
        // the front page and never falls back to invented people.
        if (!cancelled) setInstructors([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Nothing to show and nothing still coming: no heading either.
  if (!isLoading && instructors.length === 0) return null

  return (
    <section id="instructors" className="scroll-mt-20 py-6 bg-muted/50 lg:scroll-mt-[8rem]">
      <div className="max-w-7xl mx-auto px-3">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold mb-1">It’s truly inspiring to see your effort contributing to my future.</h2>
          <p className="text-sm text-muted-foreground"> Thanks to all instructors</p>
        </div>

        {/*
          FI-001. The card the invented instructors had, now carrying real
          people.

          Swapping the data out had quietly stripped the design with it: the
          headline line, the expertise chips and the action all went when the
          mock objects did, which left a card of three numbers that matched
          nothing else on the page. Every part is back; what changed is that
          each part now renders only when there is something true to put in
          it.

          Flex rather than a three-column grid. With two instructors the grid
          left a third column of empty space and pushed the pair off centre —
          visible in the screenshot. Wrapping fixed-width cards centres
          whatever number there happens to be.
        */}
        {isLoading ? (
          <div className="flex flex-wrap justify-center gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-full animate-pulse rounded-xl border border-border bg-card p-5 text-center shadow-sm sm:w-[320px]"
              >
                <div className="mx-auto mb-3 h-20 w-20 rounded-full bg-muted" />
                <div className="mx-auto mb-2 h-4 w-32 rounded bg-muted" />
                <div className="mx-auto mb-4 h-3 w-24 rounded bg-muted" />
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="h-10 rounded bg-muted" />
                  ))}
                </div>
                <div className="h-9 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {instructors.map((instructor) => (
              <div
                key={instructor.id}
                className="relative w-full rounded-xl border border-border bg-card p-5 text-center shadow-sm transition-shadow hover:shadow-md sm:w-[320px]"
              >
                {instructor.is_featured && (
                  <span className="absolute right-3 top-3 rounded bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900">
                    TOP
                  </span>
                )}

                <div className="relative mx-auto mb-3 w-20">
                  {instructor.avatar_url ? (
                    <img
                      src={instructor.avatar_url}
                      alt={instructor.name}
                      className="h-20 w-20 rounded-full border-2 border-border object-cover"
                    />
                  ) : (
                    /*
                     * A missing photograph is a real state, and a stock face
                     * would be a lie about who this is. Their initials until a
                     * system admin uploads one.
                     */
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-primary/10 text-xl font-bold text-primary">
                      {instructor.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-success">
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground">{instructor.name}</h3>
                {/*
                  Everyone here holds the instructor role, so that is the
                  honest line when no headline has been written. Leaving it
                  empty collapsed the card and left the name sitting on the
                  numbers.
                */}
                <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
                  {instructor.headline || "Instructor"}
                </p>

                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xl font-bold text-primary">{instructor.course_count}</div>
                    <div className="text-[11px] text-muted-foreground">Courses</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-primary">
                      {compactCount(instructor.student_count)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Students</div>
                  </div>
                  <div>
                    {/*
                      A course nobody has rated has no rating. A dash says so;
                      0 would read as the worst possible score.
                    */}
                    <div className="text-xl font-bold text-primary">
                      {instructor.rating > 0 ? instructor.rating.toFixed(1) : "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Rating</div>
                  </div>
                </div>

                {instructor.expertise.length > 0 && (
                  <div className="mb-4 flex flex-wrap justify-center gap-1">
                    {instructor.expertise.map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/*
                  The original button said View Profile and went nowhere —
                  there is no instructor profile page in this application. This
                  one opens the catalogue filtered to their name, which is the
                  thing a visitor reading this section actually wants.
                */}
                <Link
                  href={`/courses?search=${encodeURIComponent(instructor.name)}`}
                  className="block w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  View Courses
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
// Platform Features (Preserved 100%)

function PlatformFeatures() {
  const features = [
    { icon: Laptop, title: "Interactive", description: "Hands-on projects", color: "#8B5CF6" },
    { icon: Smartphone, title: "Mobile", description: "Learn on the go", color: "#3B82F6" },
    { icon: Headphones, title: "24/7 Support", description: "Always here to help", color: "#10B981" },
    { icon: Download, title: "Offline", description: "Download materials", color: "#F59E0B" },
    { icon: Target, title: "Career Help", description: "Job placement", color: "#6366F1" },
    { icon: Award, title: "Certificates", description: "Industry recognized", color: "#FBBF24" },
  ]

  return (
    <section className="py-6 bg-muted/50">
      <div className="max-w-7xl mx-auto px-3">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold mb-1">Why Choose BwengePlus</h2>
          <p className="text-sm text-muted-foreground">Everything you need to succeed</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {features.map((feature, i) => (
            <div key={i} className="bg-card rounded-lg p-3 shadow border border-border text-center">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 mx-auto"
                style={{ backgroundColor: feature.color }}
              >
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xs font-bold mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Newsletter (Preserved 100%)
function NewsletterCTA() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setEmail("")
    setIsSubmitting(false)
  }

  return (
    <section className="py-6 bg-primary">
      <div className="max-w-7xl mx-auto px-3 text-center text-primary-foreground">
        <div className="inline-block mb-2">
          <div className="w-10 h-10 bg-primary-foreground/15 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2">Stay Ahead</h2>
        <p className="text-sm mb-3">Get weekly learning tips</p>

        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
            className="flex-1 px-3 py-2 bg-primary-foreground/10 border border-primary-foreground/30 rounded-lg text-primary-foreground placeholder:text-primary-foreground/60 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-card text-primary px-4 py-2 rounded-lg font-semibold text-sm min-w-[100px]"
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Subscribe"}
          </button>
        </form>

        <p className="text-xs text-primary-foreground/80">Join 50,000+ learners</p>
      </div>
    </section>
  )
}

// Final CTA (Preserved 100%)
/**
 * The closing call to action (FT-001).
 *
 * It carried three figures that nothing in this platform can support: a
 * 30-day money-back guarantee, 24/7 support, and 1000+ reviews. The first is
 * a refund policy — a commitment to a customer, made on a page, by a block of
 * markup nobody checked against what the organisation actually offers. The
 * other two were invented the same way, and the subtitle promised thousands
 * of transformed careers on no evidence at all.
 *
 * They are replaced by three statements this platform can stand behind,
 * because they describe what it does rather than how much of it has happened:
 * courses from institutions, assessments that are proctored, certificates
 * that verify. If real figures exist, they belong here — but they have to
 * come from somewhere.
 */
function FinalCTA() {
  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)

  const assurances = [
    {
      icon: Building2,
      title: "Institution-backed",
      body: "Courses published by Rwandan institutions.",
    },
    {
      icon: Shield,
      title: "Proctored assessments",
      body: "Results that mean what they say.",
    },
    {
      icon: Award,
      title: "Verifiable certificates",
      body: "Every certificate checkable by its code.",
    },
  ]

  return (
    <section className="border-t border-border bg-muted/30 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-6 w-6 text-primary" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Start Learning Today
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Courses, assessments and certificates from institutions across Rwanda.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={isAuthenticated ? "/dashboard" : "/register"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md"
            >
              <Zap className="h-4 w-4" />
              {isAuthenticated ? "Continue learning" : "Create an account"}
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <BookOpen className="h-4 w-4" />
              Browse courses
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {assurances.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-4 text-center"
            >
              <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-[18px] w-[18px] text-primary" />
              </span>
              <p className="text-[13px] font-bold text-foreground">{item.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * The footer (FT-001).
 *
 * Two things were wrong with it. It sat on the page background, so it did not
 * close the page — it read as one more white band after a white band, which is
 * the screenshot. And its social icons were `text-muted-foreground` on a `bg-card`
 * square: grey on white, all but invisible.
 *
 * It is the deep brand purple now, and everything on it is white or a
 * translucent white, icons included. That is also what makes the contrast
 * correct rather than merely darker: one surface, one foreground, no greys
 * inherited from a light theme.
 *
 * The link columns changed too. They pointed at /paths/web, /blog, /careers
 * and six other routes that do not exist in this application — every one a 404
 * dressed as a destination. What remains are the pages that are really there.
 */
function Footer() {
  const footerLinks = {
    Learn: [
      { label: "Browse courses", href: "/courses" },
      { label: "Institutions", href: "/institutions" },
      { label: "Verify a certificate", href: "/verify-certificate" },
    ],
    Discover: [
      { label: "About BWENGE+", href: "/#about" },
      { label: "Who we are", href: "/#who-we-are" },
      { label: "Our products", href: "/our-products" },
    ],
    Account: [
      { label: "Sign in", href: "/login" },
      { label: "Create an account", href: "/register" },
    ],
  }

  const socials = [
    { Icon: Twitter, label: "Twitter" },
    { Icon: Facebook, label: "Facebook" },
    { Icon: Instagram, label: "Instagram" },
    { Icon: Linkedin, label: "LinkedIn" },
  ]

  return (
    <footer className="text-white" style={{ background: "linear-gradient(160deg, #5B4E96, #413675)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            {/*
              LOGO-001. The same mark as the navigation, at the same 40px, and
              alone — the wordmark beside it was doing the logo's job.

              The white variant, because the purple tile would disappear into
              a purple footer. Same geometry, inverted: one mark, two surfaces.
            */}
            <Link href="/" className="inline-flex items-center" aria-label="BWENGE+ home">
              <Image
                src="/bwenge-plus-mark-white.png"
                alt="BWENGE+"
                width={760}
                height={260}
                unoptimized
                className="h-[34px] w-auto object-contain"
              />
            </Link>

            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/75">
              Connecting Knowledge. Empowering Learners. Building Rwanda&rsquo;s Knowledge
              Economy.
            </p>

            {/*
              White, on a translucent white chip. They were grey glyphs on a
              white square before and effectively invisible. aria-label on each,
              because an icon-only link announces nothing without one.
            */}
            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/80 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/15 pt-5">
          <div className="flex flex-col items-center justify-between gap-3 text-[12px] text-white/70 sm:flex-row">
            <div>&copy; {new Date().getFullYear()} BwengePlus</div>
            <div className="flex items-center gap-5">
              <Link href="/#core-values" className="transition-colors hover:text-white">
                Our values
              </Link>
              <Link href="/our-products" className="transition-colors hover:text-white">
                Our products
              </Link>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-1 transition-colors hover:text-white"
              >
                Top
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
export default function BwengePlusPage() {
  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const [activeCategory, setActiveCategory] = useState("All")
  const [showOneTap, setShowOneTap] = useState(true)
  const [showFallbackButton, setShowFallbackButton] = useState(false)

  // Show One Tap after delay, but show fallback if it fails
  useEffect(() => {
    if (!isAuthenticated && googleClientId) {
      const timer = setTimeout(() => {
        setShowOneTap(true)
        
        // If One Tap doesn't appear within 5 seconds, show fallback button
        const fallbackTimer = setTimeout(() => {
          setShowFallbackButton(true)
        }, 5000)
        
        return () => clearTimeout(fallbackTimer)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, googleClientId])

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <div className="min-h-screen bg-card">
        {!isAuthenticated && showOneTap && (
          <GoogleOneTapLogin
            autoSelect={false}
            cancelOnTapOutside={true}
            context="signin"
            forceDisplay={true}
          />
        )}
        
        <HomeNavigation />
        <HeroSection />
        <CategoryFilters
          onCategoryChange={setActiveCategory}
          activeCategory={activeCategory}
        />
        <FeaturedCourses key={activeCategory} activeCategory={activeCategory} />
      
        <AboutSections />
        <TopInstructors />
        <PlatformFeatures />
        <NewsletterCTA />
        <FinalCTA />
        <Footer />
      </div>
    </GoogleOAuthProvider>
  )
}