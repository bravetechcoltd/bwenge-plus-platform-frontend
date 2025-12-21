
// @ts-nocheck
"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useRouter, useParams } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Play, Clock, Users, Star, Share2, Heart, CheckCircle, Lock, ArrowLeft,
  Trophy, Target, Crown, Zap, Award, BookOpen, Shield, Gift, Menu, X,
  ChevronDown, GraduationCap, User, Settings, LogOut, Globe, Loader2,
  Building2, ShieldAlert, Key, Mail, AlertCircle, Info, Bookmark, BookmarkCheck,
} from "lucide-react"
import Link from "next/link"
import type { Course } from "@/types"
import Cookies from "js-cookie"
import { motion, AnimatePresence } from "framer-motion"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/lib/store"
import { logoutBwenge } from "@/lib/features/auth/auth-slice"
import { toast } from 'sonner'
import AccessCodeRequestModal from "@/components/enrollment/AccessCodeRequestModal"
import AccessCodeRedeemInput from "@/components/enrollment/AccessCodeRedeemInput"

// ==================== ENROLLMENT SCENARIO TYPES ====================
type EnrollmentScenarioType = 
  | "DIRECT_ENROLL"           // Scenario 1 & 3: Can enroll directly
  | "REQUEST_ACCESS_CODE"     // Scenario 2 & 4: Need to request access code
  | "PENDING_ACCESS_CODE_REQUEST" // Already requested, waiting for code
  | "REQUIRES_MEMBERSHIP"      // Scenario 3: Not a member, can't enroll
  | "BLOCKED"                  // Scenario 4: Not a member, completely blocked
  | "ALREADY_ENROLLED"         // User already enrolled
  | "LOADING"                  // Loading scenario
  | "ERROR"                    // Error checking scenario

interface EnrollmentScenario {
  scenario_type: EnrollmentScenarioType
  course: {
    id: string
    title: string
    course_type: string
    has_institution: boolean
    institution_id: string | null
    institution_name: string | null
  }
  user: {
    id: string
    is_member: boolean
    has_pending_request: boolean
  }
  enrollment: any | null
  actions: {
    can_enroll_direct: boolean
    can_request_access_code: boolean
    can_redeem_code: boolean
    requires_membership: boolean
    blocked: boolean
  }
  messages: {
    main: string
    detail: string
  }
}

// ==================== HELPER FUNCTIONS ====================
function getRoleDashboardPath(role: string | undefined): string {
  if (!role) return '/dashboard/learner/learning/courses'
  const roleMap: Record<string, string> = {
    'SYSTEM_ADMIN': '/dashboard/system-admin',
    'INSTITUTION_ADMIN': '/dashboard/institution-admin',
    'CONTENT_CREATOR': '/dashboard/content-creator',
    'INSTRUCTOR': '/dashboard/instructor',
    'LEARNER': '/dashboard/learner/learning/courses',
  }
  return roleMap[role] || '/dashboard/learner/learning/courses'
}

const getActualUser = () => {
  let cookieUser = null
  const userCookie = Cookies.get("bwenge_user")
  if (userCookie) {
    try { cookieUser = JSON.parse(userCookie) } catch (e) {}
  }
  let localStorageUser = null
  try {
    const s = localStorage.getItem("bwengeplus_user")
    if (s) localStorageUser = JSON.parse(s)
  } catch (e) {}
  let crossSystemContext = null
  try {
    const s = localStorage.getItem("cross_system_context")
    if (s) crossSystemContext = JSON.parse(s)
  } catch (e) {}
  return { cookieUser, localStorageUser, crossSystemContext }
}

function getRoleIcon(role: string | undefined) {
  const iconMap: Record<string, any> = {
    'SYSTEM_ADMIN': Shield, 'INSTITUTION_ADMIN': Building2,
    'CONTENT_CREATOR': BookOpen, 'INSTRUCTOR': GraduationCap, 'LEARNER': User,
  }
  return iconMap[role || 'LEARNER'] || User
}

function isLearnerRole(role: string | undefined): boolean {
  return role === 'LEARNER' || !role
}

function getRoleDisplayName(role: string | undefined): string {
  if (!role) return 'Learner'
  const displayMap: Record<string, string> = {
    'SYSTEM_ADMIN': 'System Admin', 'INSTITUTION_ADMIN': 'Institution Admin',
    'CONTENT_CREATOR': 'Content Creator', 'INSTRUCTOR': 'Instructor', 'LEARNER': 'Learner',
  }
  return displayMap[role] || 'Learner'
}

const determineActualRole = (reduxUser: any): string => {
  const { cookieUser, localStorageUser, crossSystemContext } = getActualUser()
  if (reduxUser?.bwenge_role) return reduxUser.bwenge_role
  if (cookieUser?.bwenge_role) return cookieUser.bwenge_role
  if (localStorageUser?.bwenge_role) return localStorageUser.bwenge_role
  if (crossSystemContext?.bwenge_role) return crossSystemContext.bwenge_role
  return "LEARNER"
}

// Resolve token from Redux → cookie
function resolveToken(reduxToken: string | null): string | null {
  if (reduxToken) return reduxToken
  return Cookies.get("bwenge_token") || null
}

// Resolve user object from Redux → cookie → localStorage
function resolveUser(reduxUser: any): any | null {
  if (reduxUser) return reduxUser
  try {
    const raw = Cookies.get("bwenge_user")
    if (raw) return JSON.parse(decodeURIComponent(raw))
  } catch (_) {}
  try {
    const raw = localStorage.getItem("bwengeplus_user")
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return null
}

// ==================== NAVIGATION ====================
function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user: reduxUser, isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const [actualUser, setActualUser] = useState<any>(null)
  const [actualRole, setActualRole] = useState<string>("LEARNER")
  const [validationDone, setValidationDone] = useState(false)

  useEffect(() => {
    const { cookieUser, localStorageUser, crossSystemContext } = getActualUser()
    const determinedRole = determineActualRole(reduxUser)
    let determinedUser = reduxUser
    if (!determinedUser && cookieUser) determinedUser = cookieUser
    if (!determinedUser && localStorageUser) determinedUser = localStorageUser
    if (!determinedUser && crossSystemContext) {
      determinedUser = {
        bwenge_role: crossSystemContext.bwenge_role,
        primary_institution_id: crossSystemContext.primary_institution_id,
        institution_ids: crossSystemContext.institution_ids,
        institution_role: crossSystemContext.institution_role,
        IsForWhichSystem: crossSystemContext.system,
        email: crossSystemContext.email || "user@example.com",
        first_name: crossSystemContext.first_name || "User",
        last_name: crossSystemContext.last_name || "",
        id: crossSystemContext.id || "recovered",
        profile_picture_url: crossSystemContext.profile_picture_url || null,
      }
    }
    setActualUser(determinedUser)
    setActualRole(determinedRole)
    setValidationDone(true)
  }, [reduxUser])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false)
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserMenu])

  const navLinks = [{ label: "Home", href: "/" }, { label: "Courses", href: "/courses" }]

  const handleLogout = async () => {
    try {
      await dispatch(logoutBwenge(false)).unwrap()
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const getUserInitials = () => {
    if (actualUser?.first_name) return actualUser.first_name.charAt(0).toUpperCase()
    if (actualUser?.email) return actualUser.email.charAt(0).toUpperCase()
    return 'U'
  }

  const getAvatarGradient = () => {
    switch (actualRole) {
      case 'SYSTEM_ADMIN': return 'from-red-500 to-orange-500'
      case 'INSTITUTION_ADMIN': return 'from-blue-500 to-cyan-500'
      case 'CONTENT_CREATOR': return 'from-purple-500 to-pink-500'
      case 'INSTRUCTOR': return 'from-green-500 to-emerald-500'
      case 'LEARNER': return 'from-indigo-500 to-violet-500'
      default: return 'from-gray-500 to-gray-700'
    }
  }

  const RoleIcon = getRoleIcon(actualRole)
  const roleDisplayName = getRoleDisplayName(actualRole)
  const dashboardPath = getRoleDashboardPath(actualRole)
  const isLearner = isLearnerRole(actualRole)

  if (!validationDone) {
    return (
      <header className="fixed top-0 w-full z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg text-gray-900">BwengePlus</div>
                <div className="text-xs text-gray-500">Never Stop Learning</div>
              </div>
            </Link>
            <div className="w-8 h-8" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 bg-white border-b border-gray-200 ${isScrolled ? "shadow-lg" : "shadow-sm"}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md" whileHover={{ scale: 1.05, rotate: 5 }} whileTap={{ scale: 0.95 }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <div className="font-bold text-lg text-gray-900 transition-colors">BwengePlus</div>
              <div className="text-xs text-gray-500">Never Stop Learning</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors relative group">
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Sign In</Link>
                <Link href="/register" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md">Join Free</Link>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="hidden md:flex items-center gap-3">
                <Link href={dashboardPath} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  <BookOpen className="w-4 h-4" />
                  {isLearner ? "My Learning" : "Dashboard"}
                </Link>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu) }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
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
                    <div className="text-left hidden lg:block">
                      <div className="text-sm font-semibold text-gray-900">{actualUser?.first_name} {actualUser?.last_name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <RoleIcon className="w-3 h-3" />
                        {roleDisplayName}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            {actualUser?.profile_picture_url ? (
                              <img src={actualUser.profile_picture_url} alt={actualUser.first_name} className="w-10 h-10 rounded-full object-cover border-2 border-blue-600" />
                            ) : (
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-semibold text-lg shadow-lg border-2 border-white ring-2 ring-blue-600/30`}>
                                {getUserInitials()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{actualUser?.first_name} {actualUser?.last_name}</div>
                              <div className="text-xs text-gray-500 truncate">{actualUser?.email}</div>
                            </div>
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-full">
                            <RoleIcon className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">{roleDisplayName}</span>
                          </div>
                        </div>
                        <div className="py-1">
                          <Link href={dashboardPath} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setShowUserMenu(false)}>
                            <BookOpen className="w-4 h-4" />{isLearner ? "My Learning" : "Dashboard"}
                          </Link>
                          <Link href={`/dashboard/${actualRole.toLowerCase()}/profile`} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setShowUserMenu(false)}>
                            <User className="w-4 h-4" />Profile
                          </Link>
                          <Link href={`/dashboard/${actualRole.toLowerCase()}/settings`} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setShowUserMenu(false)}>
                            <Settings className="w-4 h-4" />Settings
                          </Link>
                          {actualRole === 'INSTITUTION_ADMIN' && (
                            <Link href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setShowUserMenu(false)}>
                              <Building2 className="w-4 h-4" />Institution
                            </Link>
                          )}
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
              </motion.div>
            )}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="md:hidden border-t border-gray-200 py-3 overflow-hidden">
              <nav className="space-y-2">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  {!isAuthenticated ? (
                    <>
                      <Link href="/login" className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                      <Link href="/register" className="block px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg text-center hover:bg-blue-700 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Join Free</Link>
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {actualUser?.profile_picture_url ? (
                            <img src={actualUser.profile_picture_url} alt={actualUser.first_name} className="w-10 h-10 rounded-full object-cover border-2 border-blue-600" />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-semibold text-lg shadow-lg border-2 border-white`}>
                              {getUserInitials()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{actualUser?.first_name} {actualUser?.last_name}</div>
                            <div className="text-xs text-gray-500">{actualUser?.email}</div>
                          </div>
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 bg-white rounded-full">
                          <RoleIcon className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">{roleDisplayName}</span>
                        </div>
                      </div>
                      <Link href={dashboardPath} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <BookOpen className="w-5 h-5" />{isLearner ? "My Learning" : "Dashboard"}
                      </Link>
                      <Link href={`/dashboard/${actualRole.toLowerCase()}/profile`} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <User className="w-5 h-5" />Profile
                      </Link>
                      <Link href={`/dashboard/${actualRole.toLowerCase()}/settings`} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <Settings className="w-5 h-5" />Settings
                      </Link>
                      {actualRole === 'INSTITUTION_ADMIN' && (
                        <Link href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                          <Building2 className="w-5 h-5" />Institution
                        </Link>
                      )}
                      <button onClick={() => { setIsMobileMenuOpen(false); handleLogout() }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

// ==================== ENROLLMENT SIDEBAR COMPONENT ====================
interface EnrollmentSidebarProps {
  course: Course
  scenario: EnrollmentScenario | null
  isEnrolling: boolean
  onEnrollDirect: () => void
  onRequestAccessCode: () => void
  onRedeemSuccess: () => void
  onCancelRedeem?: () => void
  isSaved: boolean
  savingCourse: boolean
  onToggleSave: () => void
}

function EnrollmentSidebar({
  course,
  scenario,
  isEnrolling,
  onEnrollDirect,
  onRequestAccessCode,
  onRedeemSuccess,
  onCancelRedeem,
  isSaved,
  savingCourse,
  onToggleSave,
}: EnrollmentSidebarProps) {
  const [showRedeemInput, setShowRedeemInput] = useState(false)

  if (!scenario) {
    return (
      <Card className="sticky top-20 border-2 shadow-xl">
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ALREADY ENROLLED
  if (scenario.scenario_type === "ALREADY_ENROLLED") {
    return (
      <Card className="sticky top-20 border-2 shadow-xl">
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
            </span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-medium">Progress</span>
              </div>
              <span className="text-xs font-bold text-blue-600">{scenario.enrollment?.progress_percentage || 0}%</span>
            </div>
            <Progress value={scenario.enrollment?.progress_percentage || 0} className="h-2" />
            <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm" asChild>
              <Link href={`/courses/${course.id}/learn`}>
                <Play className="w-4 h-4 mr-2" />
                {(scenario.enrollment?.progress_percentage || 0) === 100 ? "Review Course" : "Continue Learning"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // DIRECT ENROLL (Scenario 1 & 3)
  if (scenario.scenario_type === "DIRECT_ENROLL") {
    return (
      <Card className="sticky top-20 border-2 shadow-xl">
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              size="sm" 
              onClick={onEnrollDirect}
              disabled={isEnrolling}
            >
              {isEnrolling ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Enroll Now</>
              )}
            </Button>
            <Button 
              variant={isSaved ? "default" : "outline"} 
              className="w-full" 
              size="sm"
              onClick={onToggleSave}
              disabled={savingCourse}
            >
              {savingCourse ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck className="w-4 h-4 mr-2" />
              ) : (
                <Bookmark className="w-4 h-4 mr-2" />
              )}
              {isSaved ? "Saved" : "Save for Later"}
            </Button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
            <p className="text-xs text-green-700 flex items-start">
              <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>{scenario.messages.detail}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // REQUEST ACCESS CODE (Scenario 2 & 4)
  if (scenario.scenario_type === "REQUEST_ACCESS_CODE") {
    return (
      <Card className="sticky top-20 border-2 shadow-xl">
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
            </span>
            <Badge className="bg-purple-500 text-xs">SPOC</Badge>
          </div>
          
          {!showRedeemInput ? (
            <div className="space-y-3 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 flex items-start">
                  <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span>{scenario.messages.detail}</span>
                </p>
              </div>
              
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                size="sm" 
                onClick={onRequestAccessCode}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Requesting...</>
                ) : (
                  <><Key className="w-4 h-4 mr-2" />Request Access Code</>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => setShowRedeemInput(true)}
              >
                <Mail className="w-4 h-4 mr-2" />I Already Have a Code
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              <AccessCodeRedeemInput
                courseId={course.id}
                onSuccess={onRedeemSuccess}
                onCancel={() => setShowRedeemInput(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // PENDING ACCESS CODE REQUEST
  if (scenario.scenario_type === "PENDING_ACCESS_CODE_REQUEST") {
    return (
      <Card className="sticky top-20 border-2 shadow-xl">
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
            </span>
            <Badge className="bg-purple-500 text-xs">SPOC</Badge>
          </div>
          
          {!showRedeemInput ? (
            <div className="space-y-3 mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 flex items-start">
                  <Clock className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span>{scenario.messages.detail}</span>
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => setShowRedeemInput(true)}
              >
                <Key className="w-4 h-4 mr-2" />Enter Access Code
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              <AccessCodeRedeemInput
                courseId={course.id}
                onSuccess={onRedeemSuccess}
                onCancel={() => setShowRedeemInput(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // REQUIRES MEMBERSHIP (Scenario 3 - Not a member)
  if (scenario.scenario_type === "REQUIRES_MEMBERSHIP") {
    return (
      <Card className="sticky top-20 border-2 shadow-xl">
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Lock className="w-12 h-12 text-white/80" />
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
            </span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800 mb-1 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Institution Access Required
              </p>
              <p className="text-xs text-amber-700">
                {scenario.messages.detail}
              </p>
            </div>
            <Button variant="outline" className="w-full" size="sm" disabled>
              <Lock className="w-4 h-4 mr-2" />Enrollment Restricted
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // BLOCKED (Scenario 4 - Not a member)
  if (scenario.scenario_type === "BLOCKED") {
    return (
      <Card className="sticky top-20 border-2 shadow-xl">
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Lock className="w-12 h-12 text-white/80" />
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
            </span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800 mb-1 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Access Restricted
              </p>
              <p className="text-xs text-red-700">
                {scenario.messages.detail}
              </p>
            </div>
            <Button variant="outline" className="w-full" size="sm" disabled>
              <Lock className="w-4 h-4 mr-2" />Not Available
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default fallback
  return (
    <Card className="sticky top-20 border-2 shadow-xl">
      <div className="aspect-video relative overflow-hidden rounded-t-lg">
        <img src={course.thumbnail_url || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-blue-600">
            {course.price == 0 || course.price === null || course.price === undefined ? "FREE" : `${course.price} RWF`}
          </span>
        </div>
        <Button variant="outline" className="w-full" size="sm" disabled>
          Not Available
        </Button>
      </CardContent>
    </Card>
  )
}

// ==================== MAIN PAGE ====================
export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params?.id as string

  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [course, setCourse] = useState<Course>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("You don't have access to this course.")
  const [instructorData, setInstructorData] = useState<any>(null)
  
  // NEW: Enrollment scenario state
  const [enrollmentScenario, setEnrollmentScenario] = useState<EnrollmentScenario | null>(null)
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false)

  // Save course state
  const [isSaved, setIsSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savingCourse, setSavingCourse] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])

  // ── AUTH GATE ──────────────────────────────────────────────────────────────
  const [authStatus, setAuthStatus] = useState<"pending" | "authenticated" | "unauthenticated">("pending")
  const redirectedRef = useRef(false)

  const router = useRouter()
  const { user: reduxUser, isAuthenticated, token: reduxToken } = useSelector((state: RootState) => state.bwengeAuth)

  // Step 1: immediate token check
  useEffect(() => {
    const token = resolveToken(reduxToken)
    if (token) {
      setAuthStatus("authenticated")
      return
    }

    const timer = setTimeout(() => {
      const finalToken = resolveToken(reduxToken)
      if (finalToken) {
        setAuthStatus("authenticated")
      } else {
        setAuthStatus("unauthenticated")
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [reduxToken])

  // Step 2: fast-path when isAuthenticated flips true mid-wait
  useEffect(() => {
    if (isAuthenticated && authStatus === "pending") {
      const token = resolveToken(reduxToken)
      if (token) setAuthStatus("authenticated")
    }
  }, [isAuthenticated, reduxToken, authStatus])

  // Step 3: perform the actual redirect
  useEffect(() => {
    if (authStatus === "unauthenticated" && !redirectedRef.current) {
      redirectedRef.current = true
      router.push("/login")
    }
  }, [authStatus, router])

  // NEW: Fetch enrollment scenario
  const fetchEnrollmentScenario = async (token: string) => {
    setScenarioLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/check-scenario`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ course_id: courseId }),
        }
      )

      const data = await response.json()
      if (data.success) {
        setEnrollmentScenario(data.data)
        
        // Update isEnrolled state based on scenario
        if (data.data.scenario_type === "ALREADY_ENROLLED") {
          setIsEnrolled(true)
          setCurrentProgress(data.data.enrollment?.progress_percentage || 0)
        }
      }
    } catch (error) {
      console.error("Error fetching enrollment scenario:", error)
    } finally {
      setScenarioLoading(false)
    }
  }

  // FETCH COURSE DATA
  useEffect(() => {
    if (authStatus !== "authenticated") return
    if (!courseId) { setLoading(false); return }

    const currentToken = resolveToken(reduxToken)
    const currentUser = resolveUser(reduxUser)

    if (!currentToken || !currentUser) return

    const fetchCourseData = async () => {
      try {
        setLoading(true)
        setError(null)
        setAccessDenied(false)

        const courseResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` } }
        )

        if (courseResponse.status === 403) {
          let msg = "You don't have access to this course."
          try { const d = await courseResponse.json(); if (d?.message) msg = d.message } catch (_) {}
          setAccessDenied(true)
          setAccessDeniedMessage(msg)
          setLoading(false)
          return
        }

        if (!courseResponse.ok) {
          const errorData = await courseResponse.json()
          throw new Error(errorData.message || "Failed to fetch course details")
        }

        const courseData = await courseResponse.json()
        if (!courseData.success || !courseData.data) throw new Error("Invalid course data received")

        setCourse(courseData.data)

        // Fetch enrollment scenario
        await fetchEnrollmentScenario(currentToken)

        // Instructor data
        if (courseData.data.instructor_id) {
          try {
            const instrRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/${courseData.data.instructor_id}`,
              { headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` } }
            )
            if (instrRes.ok) {
              const instrData = await instrRes.json()
              setInstructorData({
                instructor: instrData.data?.instructor || courseData.data.instructor,
                courses: instrData.data?.courses || [],
                statistics: instrData.data?.statistics || {},
              })
            }
          } catch (_) {
            setInstructorData({ instructor: courseData.data.instructor, courses: [], statistics: {} })
          }
        }

        setError(null)
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching course details")
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [authStatus, courseId, reduxUser, reduxToken])

  // NEW: Handle direct enrollment
  const handleEnrollDirect = async () => {
    if (!course) return
    
    const currentToken = resolveToken(reduxToken)
    setIsEnrolling(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/enroll-direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ course_id: course.id }),
      })

      const data = await response.json()

      if (data.success) {
        setIsEnrolled(true)
        setCurrentProgress(0)
        toast.success("Successfully enrolled in the course!")
        
        // Refresh scenario
        if (currentToken) {
          await fetchEnrollmentScenario(currentToken)
        }
      } else {
        toast.error(data.message || "Enrollment failed")
      }
    } catch (error) {
      console.error("Enrollment error:", error)
      toast.error("Enrollment failed. Please try again.")
    } finally {
      setIsEnrolling(false)
    }
  }

  // NEW: Handle request access code
  const handleRequestAccessCode = () => {
    setShowAccessCodeModal(true)
  }

  // NEW: Handle redeem success
  const handleRedeemSuccess = () => {
    setIsEnrolled(true)
    setCurrentProgress(0)
    
    // Refresh scenario
    const currentToken = resolveToken(reduxToken)
    if (currentToken) {
      fetchEnrollmentScenario(currentToken)
    }
  }

  // Check if course is saved
  const checkSavedStatus = async () => {
    const currentUser = resolveUser(reduxUser)
    if (!currentUser?.id || !course?.id) return
    
    try {
      const token = resolveToken(reduxToken)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/saved-courses/check/${course.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setIsSaved(data.data.is_saved)
        setSavedId(data.data.saved_id)
      }
    } catch (error) {
      console.error("Error checking saved status:", error)
    }
  }

  // Handle save/unsave toggle
  const handleToggleSave = async () => {
    const currentUser = resolveUser(reduxUser)
    if (!currentUser?.id || !course?.id) return
    
    if (isSaved && savedId) {
      // Unsave directly
      setSavingCourse(true)
      const token = resolveToken(reduxToken)
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/saved-courses/${savedId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        )
        if (response.ok) {
          setIsSaved(false)
          setSavedId(null)
          toast.success("Course removed from saved")
        }
      } catch (error) {
        console.error("Error unsaving:", error)
        toast.error("Failed to remove course")
      } finally {
        setSavingCourse(false)
      }
    } else {
      // Show dialog for saving
      setShowNotesDialog(true)
    }
  }

  // Handle save with notes
  const handleSaveWithNotes = async () => {
    const currentUser = resolveUser(reduxUser)
    if (!currentUser?.id || !course?.id) return
    
    setSavingCourse(true)
    const token = resolveToken(reduxToken)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/saved-courses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            course_id: course.id,
            notes: notes || undefined,
            tags: tags.length > 0 ? tags : undefined,
          }),
        }
      )
      if (response.ok) {
        const data = await response.json()
        setIsSaved(true)
        setSavedId(data.data.saved_id)
        toast.success("Course saved successfully")
        setShowNotesDialog(false)
        setNotes("")
        setTags([])
      }
    } catch (error) {
      console.error("Error saving course:", error)
      toast.error("Failed to save course")
    } finally {
      setSavingCourse(false)
    }
  }

  // Call checkSavedStatus when course loads
  useEffect(() => {
    if (course) {
      checkSavedStatus()
    }
  }, [course])

  const getBackNavigationPath = () => {
    if (!course) return '/courses'
    if (course.institution?.slug) return `/institutions/${course.institution.slug}/courses`
    return '/courses'
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "beginner": case "BEGINNER": return <Target className="w-4 h-4" />
      case "intermediate": case "INTERMEDIATE": return <Trophy className="w-4 h-4" />
      case "advanced": case "ADVANCED": case "expert": case "EXPERT": return <Crown className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner": case "BEGINNER": return "bg-green-500 hover:bg-green-600"
      case "intermediate": case "INTERMEDIATE": return "bg-blue-500 hover:bg-blue-600"
      case "advanced": case "ADVANCED": case "expert": case "EXPERT": return "bg-purple-500 hover:bg-purple-600"
      default: return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const cleanListItems = (text: string | undefined): string[] => {
    if (!text) return []
    return text.split('\n').map(i => i.trim().replace(/^[•\-]\s*/, '').replace(/\r/g, '')).filter(i => i.length > 0)
  }

  // Early-return screens
  if (authStatus === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-lg text-gray-600">Checking authentication...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!courseId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">Invalid course ID</p>
              <Button className="mt-4" onClick={() => router.push('/courses')}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Courses
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-lg text-gray-600">Loading course details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
              <p className="text-gray-600 mb-6 leading-relaxed">{accessDeniedMessage}</p>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">This may be a restricted course</p>
                    <p className="text-xs text-blue-700">Some courses are only available to members of specific institutions or require a special access code (SPOC). Contact your institution administrator if you believe you should have access.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/courses')} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />Browse Courses
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" onClick={() => router.push('/dashboard/learner/learning/courses')}>
                  <BookOpen className="w-4 h-4" />My Learning
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">{error || "Course not found"}</p>
              <Button className="mt-4" onClick={() => router.push(getBackNavigationPath())}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const learningObjectives = cleanListItems(course.what_you_will_learn)
  const requirements = cleanListItems(course.requirements)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-8">
        <Button variant="ghost" size="sm" className="mb-4 hover:bg-blue-50 hover:text-blue-600" onClick={() => router.push(getBackNavigationPath())}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {course.institution?.name ? `Back to ${course.institution.name}` : 'Back to Courses'}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-2 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />{course.course_category?.name || "General"}
                  </Badge>
                  <Badge className={`${getLevelColor(course.level)} text-white text-xs flex items-center gap-1`}>
                    {getLevelIcon(course.level)}{course.level.charAt(0) + course.level.slice(1).toLowerCase()}
                  </Badge>
                  {course.is_certificate_available && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-xs">
                      <Award className="w-3 h-3 mr-1" />Certificate
                    </Badge>
                  )}
                  <Badge className={course.course_type === "SPOC" ? "bg-purple-500 text-xs" : "bg-blue-500 text-xs"}>
                    <Globe className="w-3 h-3 mr-1" />{course.course_type}
                  </Badge>
                  {course.institution && (
                    <Badge variant="outline" className="text-xs bg-gray-50">
                      <Building2 className="w-3 h-3 mr-1" />
                      {course.institution.name}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{course.title}</h1>
                <p className="text-gray-600 mb-4 leading-relaxed text-sm">{course.short_description || course.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <div><div className="text-sm font-bold text-gray-900">{course.average_rating || 0}</div><div className="text-xs text-gray-600">Rating</div></div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div><div className="text-sm font-bold text-gray-900">{course.enrollment_count || 0}</div><div className="text-xs text-gray-600">Students</div></div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <div><div className="text-sm font-bold text-gray-900">{Math.round((course.duration_minutes || 0) / 60)}h</div><div className="text-xs text-gray-600">Duration</div></div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    <div><div className="text-sm font-bold text-gray-900">{course.total_lessons || 0}</div><div className="text-xs text-gray-600">Lessons</div></div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Avatar className="w-10 h-10 border-2 border-blue-200">
                    <AvatarImage src={course.instructor?.profile_picture_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {course.instructor?.first_name?.[0] || "I"}{course.instructor?.last_name?.[0] || "N"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Instructor</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{course.instructor?.first_name} {course.instructor?.last_name || "Expert"}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 bg-white p-1 rounded-lg border shadow-sm">
                <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">Overview</TabsTrigger>
                <TabsTrigger value="curriculum" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">Instructor</TabsTrigger>
                <TabsTrigger value="reviews" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {learningObjectives.length > 0 && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="w-5 h-5 text-yellow-500" />What You'll Learn</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {learningObjectives.map((item, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {requirements.length > 0 && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg"><Target className="w-5 h-5 text-blue-600" />Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {requirements.map((requirement, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                            <span className="text-xs text-gray-700">{requirement}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="w-5 h-5 text-blue-600" />About This Course</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{course.description}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="curriculum">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><Target className="w-5 h-5 text-blue-600" />Course Curriculum</CardTitle>
                    <CardDescription className="text-xs">
                      {course.modules?.length || 0} modules • {course.total_lessons || 0} lessons • {Math.round((course.duration_minutes || 0) / 60)}h total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {course.modules?.map((module, moduleIndex) => (
                        <AccordionItem key={module.id} value={module.id} className="border rounded-lg mb-2 last:mb-0">
                          <AccordionTrigger className="text-left px-3 py-2 hover:bg-gray-50 rounded-t-lg">
                            <div className="flex items-center justify-between w-full mr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-blue-600">{moduleIndex + 1}</span>
                                </div>
                                <span className="text-sm font-medium">{module.title}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{module.lessons?.length || 0} lessons</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-2">
                            <div className="space-y-1">
                              {module.lessons?.map((lesson) => (
                                <div key={lesson.id} className="flex items-center justify-between p-2 rounded-lg border bg-white hover:bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                      {lesson.is_preview ? <Play className="w-4 h-4 text-blue-600" /> : <Lock className="w-4 h-4 text-gray-400" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-900">{lesson.title}</p>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>{lesson.duration_minutes || 0}m</span>
                                        {lesson.is_preview && (
                                          <Badge variant="outline" className="text-xs py-0"><Gift className="w-2 h-2 mr-1" />Preview</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {lesson.is_preview && (
                                    <Button variant="ghost" size="sm" className="text-xs h-7">
                                      <Play className="w-3 h-3 mr-1" />Watch
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-blue-600" />Course Instructor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {instructorData ? (
                      <div className="flex flex-col md:flex-row items-start gap-4">
                        <Avatar className="w-20 h-20 border-4 border-blue-100">
                          <AvatarImage src={instructorData.instructor?.profile_picture_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                            {instructorData.instructor?.first_name?.[0] || "I"}{instructorData.instructor?.last_name?.[0] || "N"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs font-medium text-blue-600">Expert Instructor</span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{instructorData.instructor?.first_name} {instructorData.instructor?.last_name || "Expert"}</h3>
                          {instructorData.instructor?.bio && <p className="text-sm text-gray-600 mb-3">{instructorData.instructor.bio}</p>}
                          {instructorData.instructor?.email && <p className="text-xs text-gray-500 mb-3">📧 {instructorData.instructor.email}</p>}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 bg-yellow-50 rounded-lg">
                              <div className="text-lg font-bold text-yellow-600">{instructorData.courses?.length || instructorData.statistics?.total_courses || 0}</div>
                              <div className="text-xs text-gray-600">Courses</div>
                            </div>
                            <div className="text-center p-2 bg-blue-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-600">{instructorData.statistics?.total_enrollments || course.enrollment_count || 0}</div>
                              <div className="text-xs text-gray-600">Students</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-600">{instructorData.statistics?.average_rating || course.average_rating || "4.8"}</div>
                              <div className="text-xs text-gray-600">Rating</div>
                            </div>
                          </div>
                          {instructorData.courses && instructorData.courses.length > 1 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Other Courses ({instructorData.courses.length - 1})</h4>
                              <div className="space-y-2">
                                {instructorData.courses.filter((c: any) => c.id !== courseId).slice(0, 3).map((ic: any) => (
                                  <div key={ic.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => router.push(`/courses/${ic.id}`)}>
                                    <BookOpen className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-700 line-clamp-1">{ic.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Loading instructor information...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Student Reviews</CardTitle>
                    <CardDescription className="text-xs">{course.average_rating || 0} average • {course.total_reviews || 0} reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {course.reviews && course.reviews.length > 0 ? (
                      <div className="space-y-3">
                        {course.reviews.map((review) => (
                          <div key={review.id} className="border-b pb-3 last:border-b-0">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={review.user?.profile_picture_url || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">{review.user?.first_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">{review.user?.first_name} {review.user?.last_name}</span>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star key={star} className={`w-3 h-3 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600">{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No reviews yet. Be the first!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Enrollment Actions */}
          <div className="lg:col-span-1">
            <EnrollmentSidebar
              course={course}
              scenario={enrollmentScenario}
              isEnrolling={isEnrolling}
              onEnrollDirect={handleEnrollDirect}
              onRequestAccessCode={handleRequestAccessCode}
              onRedeemSuccess={handleRedeemSuccess}
              isSaved={isSaved}
              savingCourse={savingCourse}
              onToggleSave={handleToggleSave}
            />
          </div>
        </div>
      </div>

      {/* Access Code Request Modal */}
      {course && (
        <AccessCodeRequestModal
          open={showAccessCodeModal}
          onOpenChange={setShowAccessCodeModal}
          courseId={course.id}
          courseTitle={course.title}
          institutionName={course.institution?.name}
          onSuccess={() => {
            // Refresh scenario after successful request
            const currentToken = resolveToken(reduxToken)
            if (currentToken) {
              fetchEnrollmentScenario(currentToken)
            }
          }}
        />
      )}

      {/* Save Course Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Course</DialogTitle>
            <DialogDescription>
              Add notes or tags to remember why you saved this course
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Why do you want to take this course? Add your thoughts here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <Input
                placeholder="Add tags separated by commas (e.g., programming, data science)"
                value={tags.join(", ")}
                onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWithNotes} disabled={savingCourse}>
              {savingCourse ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}