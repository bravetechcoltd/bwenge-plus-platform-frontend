// @ts-nocheck

"use client"

import type React from "react"
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

// Safe localStorage helpers
const safeGetLocalStorage = (key: string, defaultValue: string = ""): string => {
  if (typeof window === 'undefined') return defaultValue
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

const safeGetLocalStorageJSON = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : defaultValue
  } catch {
    return defaultValue
  }
}

// ==================== FIXED: Get actual user from all sources ====================
const getActualUser = () => {

  // 1. Try cookies
  let cookieUser = null
  const userCookie = Cookies.get("bwenge_user")
  if (userCookie) {
    try {
      cookieUser = JSON.parse(userCookie)
    } catch (e) {
    }
  }

  // 2. Try localStorage
  let localStorageUser = null
  const localUserStr = safeGetLocalStorage("bwengeplus_user")
  if (localUserStr) {
    try {
      localStorageUser = JSON.parse(localUserStr)
    } catch (e) {
    }
  }

  // 3. Try cross-system context
  const crossSystemContext = safeGetLocalStorageJSON("cross_system_context", null)
  if (crossSystemContext) {
  }

  return {
    cookieUser,
    localStorageUser,
    crossSystemContext
  }
}

// ==================== FIXED: Determine actual role ====================
const determineActualRole = (reduxUser: any): string => {
  const { cookieUser, localStorageUser, crossSystemContext } = getActualUser()

  // Priority: Redux > Cookies > localStorage > cross-system context

  if (reduxUser?.bwenge_role) {
    return reduxUser.bwenge_role
  }

  if (cookieUser?.bwenge_role) {
    return cookieUser.bwenge_role
  }

  if (localStorageUser?.bwenge_role) {
    return localStorageUser.bwenge_role
  }

  if (crossSystemContext?.bwenge_role) {
    return crossSystemContext.bwenge_role
  }

  return "LEARNER"
}

// ==================== FIXED: Get role display name ====================
function getRoleDisplayName(role: string | undefined): string {
  if (!role) return 'Learner'

  const displayMap: Record<string, string> = {
    'SYSTEM_ADMIN': 'System Administrator',
    'INSTITUTION_ADMIN': 'Institution Administrator',
    'CONTENT_CREATOR': 'Content Creator',
    'INSTRUCTOR': 'Instructor',
    'LEARNER': 'Learner',
  }

  return displayMap[role] || 'Learner'
}

// ==================== FIXED: Get role dashboard path ====================
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

// ==================== FIXED: Get role icon ====================
function getRoleIcon(role: string | undefined) {
  const iconMap: Record<string, any> = {
    'SYSTEM_ADMIN': Shield,
    'INSTITUTION_ADMIN': Building2,
    'CONTENT_CREATOR': FileText,
    'INSTRUCTOR': GraduationCap,
    'LEARNER': BookOpen,
  }
  return iconMap[role || 'LEARNER'] || BookOpen
}

// ==================== FIXED: Check if user is learner ====================
function isLearnerRole(role: string | undefined): boolean {
  return role === 'LEARNER' || !role
}

// ==================== FIXED: Google Login Button ====================
function GoogleLoginButton() {
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error('Google login failed - no credential received')
      return
    }

    setIsLoggingIn(true)

    try {

      const result = await dispatch(loginWithGoogle(credentialResponse.credential)).unwrap()



      toast.success(`Welcome ${result.user.first_name}! Login successful`)

      const dashboardPath = getRoleDashboardPath(result.user.bwenge_role)

      // Full page reload to ensure all state is initialized
      setTimeout(() => {
        window.location.href = dashboardPath
      }, 500)

    } catch (error: any) {
      toast.error(error || 'Google login failed. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleGoogleError = () => {

    toast.error('Google login failed. Please try again.')
  }

  return (
    <div className="relative w-full">
      {isLoggingIn && (
        <div className="absolute inset-0 bg-background/90 flex items-center justify-center rounded-lg z-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        type="standard"
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </div>
  )
}

// ==================== FIXED: ENHANCED NAVIGATION ====================
function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user: reduxUser, isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // ==================== Track actual role ====================
  const [actualRole, setActualRole] = useState<string>("LEARNER")
  const [actualUser, setActualUser] = useState<any>(null)
  const [validationDone, setValidationDone] = useState(false)

  // ==================== Validate user from all sources ====================
  useEffect(() => {

    // Get from all sources
    const { cookieUser, localStorageUser, crossSystemContext } = getActualUser()

    // Determine the actual role
    const determinedRole = determineActualRole(reduxUser)

    // Determine the actual user object (priority: redux > cookie > localStorage)
    let determinedUser = reduxUser
    if (!determinedUser && cookieUser) determinedUser = cookieUser
    if (!determinedUser && localStorageUser) determinedUser = localStorageUser

    // If still no user but cross-system context exists, create a minimal user
    if (!determinedUser && crossSystemContext) {
      determinedUser = {
        bwenge_role: crossSystemContext.bwenge_role,
        primary_institution_id: crossSystemContext.primary_institution_id,
        institution_ids: crossSystemContext.institution_ids,
        institution_role: crossSystemContext.institution_role,
        IsForWhichSystem: crossSystemContext.system,
        email: "user@example.com",
        first_name: "User",
        last_name: "",
        id: "recovered"
      }
    }


    setActualUser(determinedUser)
    setActualRole(determinedRole)
    setValidationDone(true)
  }, [reduxUser])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false)
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserMenu])

  const navLinks = [
    { label: "Courses", href: "#courses" },
    { label: "Instructors", href: "#instructors" }
  ]

  const handleLogout = async () => {
    try {
      await dispatch(logoutBwenge(false)).unwrap()
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  // Get role-specific display
  const roleDisplayName = getRoleDisplayName(actualRole)
  const RoleIcon = getRoleIcon(actualRole)
  const dashboardPath = getRoleDashboardPath(actualRole)
  const isLearner = isLearnerRole(actualRole)

  // ==================== Helper function to get user initials ====================
  const getUserInitials = () => {
    if (actualUser?.first_name) {
      return actualUser.first_name.charAt(0).toUpperCase()
    }
    if (actualUser?.email) {
      return actualUser.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  // ==================== Helper function to get gradient based on role ====================
  const getAvatarGradient = () => {
    switch (actualRole) {
      case 'SYSTEM_ADMIN':
        return 'from-red-500 to-orange-500'
      case 'INSTITUTION_ADMIN':
        return 'from-blue-500 to-cyan-500'
      case 'CONTENT_CREATOR':
        return 'from-purple-500 to-pink-500'
      case 'INSTRUCTOR':
        return 'from-green-500 to-emerald-500'
      case 'LEARNER':
        return 'from-indigo-500 to-violet-500'
      default:
        return 'from-gray-500 to-gray-700'
    }
  }

  if (!validationDone) {
    return (
      <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg text-foreground">BwengePlus</div>
                <div className="text-xs text-muted-foreground">Never Stop Learning</div>
              </div>
            </Link>
            <div className="w-8 h-8" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border ${isScrolled ? "shadow-lg" : "shadow-sm"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <div className="font-bold text-lg text-foreground transition-colors">
                BwengePlus
              </div>
              <div className="text-xs text-muted-foreground">Never Stop Learning</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {mounted && theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {!isAuthenticated ? (
              // NOT AUTHENTICATED - Show Login Buttons
              <div className="hidden md:flex items-center gap-3">
                {/* Google Login Button */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-[200px]"
                >
                  <GoogleLoginButton />
                </motion.div>

                {/* Divider */}
                <div className="h-8 w-px bg-border"></div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Link
                    href="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign In
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                  >
                    Join Free
                  </Link>
                </motion.div>
              </div>
            ) : (
              // AUTHENTICATED - Show User Menu with correct role
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="hidden md:flex items-center gap-3"
              >
                {/* Dynamic Dashboard Button */}
                <Link
                  href={dashboardPath}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {isLearner ? "My Learning" : "Dashboard"}
                </Link>

                {/* User Avatar Dropdown - THIS IS THE MAIN AVATAR DISPLAY */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowUserMenu(!showUserMenu)
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="relative">
                      {actualUser?.profile_picture_url ? (
                        // If profile picture exists, show it
                        <img
                          src={actualUser.profile_picture_url}
                          alt={actualUser.first_name}
                          className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        // BEAUTIFUL PLACEHOLDER - Shows first character with role-based gradient
                        <div className={`
                          w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient()}
                          flex items-center justify-center text-white font-semibold text-sm
                          shadow-md border-2 border-background ring-2 ring-primary/30
                        `}>
                          {getUserInitials()}
                        </div>
                      )}
                      {/* Online status indicator */}
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success/100 rounded-full border-2 border-background" />
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-sm font-semibold text-foreground">
                        {actualUser?.first_name} {actualUser?.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <RoleIcon className="w-3 h-3" />
                        {roleDisplayName}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-64 bg-popover rounded-xl shadow-xl border border-border py-2 z-50"
                      >
                        {/* User Info Header */}
                        <div className="px-4 py-3 border-b border-border">
                          <div className="flex items-center gap-3">
                            {actualUser?.profile_picture_url ? (
                              <img
                                src={actualUser.profile_picture_url}
                                alt={actualUser.first_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                              />
                            ) : (
                              // BEAUTIFUL PLACEHOLDER for dropdown
                              <div className={`
                                w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()}
                                flex items-center justify-center text-white font-semibold text-lg
                                shadow-lg border-2 border-background ring-2 ring-primary/30
                              `}>
                                {getUserInitials()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-popover-foreground truncate">
                                {actualUser?.first_name} {actualUser?.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {actualUser?.email}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
                            <RoleIcon className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-primary">
                              {roleDisplayName}
                            </span>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <Link
                            href={dashboardPath}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            {isLearner ? "My Learning" : "Dashboard"}
                          </Link>

                          <Link
                            href={`/dashboard/${actualRole.toLowerCase()}/profile`}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <User className="w-4 h-4" />
                            Profile
                          </Link>

                          <Link
                            href={`/dashboard/${actualRole.toLowerCase()}/settings`}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </Link>

                          {/* Institution link for admins */}
                          {actualRole === 'INSTITUTION_ADMIN' && (
                            <Link
                              href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Building2 className="w-4 h-4" />
                              Institution
                            </Link>
                          )}

                          {/* Help link */}
                          <Link
                            href="/help"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <HelpCircle className="w-4 h-4" />
                            Help
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-border py-1">
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                              handleLogout()
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-border py-3 overflow-hidden"
            >
              <nav className="space-y-2">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}

                <div className="pt-2 border-t border-border space-y-2">
                  {!isAuthenticated ? (
                    <>
                      {/* Google Login Button for Mobile */}
                      <div className="px-3">
                        <GoogleLoginButton />
                      </div>

                      {/* Divider with OR */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-background text-muted-foreground">OR</span>
                        </div>
                      </div>

                      <Link
                        href="/login"
                        className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In with Email
                      </Link>
                      <Link
                        href="/register"
                        className="block px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg text-center transition-colors hover:bg-primary/90"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Join Free
                      </Link>
                    </>
                  ) : (
                    <>
                      {/* Mobile User Info */}
                      <div className="px-3 py-2 bg-accent rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {actualUser?.profile_picture_url ? (
                            <img
                              src={actualUser.profile_picture_url}
                              alt={actualUser.first_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                            />
                          ) : (
                            // BEAUTIFUL PLACEHOLDER for mobile
                            <div className={`
                              w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()}
                              flex items-center justify-center text-white font-semibold text-lg
                              shadow-lg border-2 border-background
                            `}>
                              {getUserInitials()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {actualUser?.first_name} {actualUser?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">{actualUser?.email}</div>
                          </div>
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 bg-background rounded-full">
                          <RoleIcon className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            {roleDisplayName}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Navigation Links */}
                      <Link
                        href={dashboardPath}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        {isLearner ? "My Learning" : "Dashboard"}
                      </Link>

                      <Link
                        href={`/dashboard/${actualRole.toLowerCase()}/profile`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>

                      <Link
                        href={`/dashboard/${actualRole.toLowerCase()}/settings`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>

                      {/* Institution link for admins */}
                      {actualRole === 'INSTITUTION_ADMIN' && (
                        <Link
                          href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Building2 className="w-4 h-4" />
                          Institution
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
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

function HeroSection() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
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
    <section className="pt-16 bg-background">
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside
          className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 z-40 overflow-y-auto ${isSidebarOpen ? "w-64" : "w-0 md:w-12"
            }`}
        >
          {/* Toggle button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute right-[10px] top-[18px] w-[26px] h-[26px] bg-primary text-white rounded-full flex items-center justify-center shadow-sm hover:bg-primary/80 hover:text-white hover:shadow-primary hover:shadow-md transition-all duration-200 z-50"
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
                <div className="bg-primary rounded-xl p-6 text-white h-full min-h-[400px] lg:min-h-0 shadow-lg flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-card/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">BwengePlus</h3>
                      <p className="text-xs text-primary/80">Never Stop Learning</p>
                    </div>
                  </div>

                  <p className="text-sm mb-6 text-blue-50 leading-relaxed flex-1">
                    Rwanda's premier integrated e-learning platform delivering quality education through MOOCs and SPOCs
                    for institutions, professionals, and lifelong learners.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-card/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Secure Learning</h4>
                        <p className="text-xs text-primary/80">Private SPOCs for institutions</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-card/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Open Access</h4>
                        <p className="text-xs text-primary/80">Public MOOCs for everyone</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-card/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Certified Learning</h4>
                        <p className="text-xs text-primary/80">Industry-recognized certificates</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 mt-auto">
                    <div>
                      <div className="text-2xl font-bold">{mockStats.partnerInstitutions}+</div>
                      <div className="text-xs text-primary/80">Partner Institutions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{mockStats.completionRate}%</div>
                      <div className="text-xs text-primary/80">Completion Rate</div>
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

const bannerImages = [
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
                  ? "bg-primary text-white shadow-md"
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
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary transition-colors"
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
              className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
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
      <section id="courses" className="py-12 bg-muted/50">
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
    <section id="courses" className="py-12 bg-muted/50">
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
function TopInstructors() {
  const mockInstructors = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      title: "Senior Software Engineer",
      students: 25000,
      courses: 12,
      rating: 4.9,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      expertise: ["Web Development", "Cloud Computing"],
      featured: true,
    },
    {
      id: 2,
      name: "Prof. Michael Chen",
      title: "AI Research Lead",
      students: 18000,
      courses: 8,
      rating: 4.8,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      expertise: ["Machine Learning", "Data Science"],
      featured: true,
    },
    {
      id: 3,
      name: "Emma Wilson",
      title: "Lead Product Designer",
      students: 22000,
      courses: 10,
      rating: 4.9,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
      expertise: ["UI/UX Design", "Product Strategy"],
      featured: true,
    },
  ]

  return (
    <section id="instructors" className="py-6 bg-muted/50">
      <div className="max-w-7xl mx-auto px-3">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold mb-1">It’s truly inspiring to see your effort contributing to my future.</h2>
          <p className="text-sm text-muted-foreground"> Thanks to all instructors</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mockInstructors.map((instructor) => (
            <div key={instructor.id} className="bg-card rounded-lg p-4 shadow text-center relative">
              {instructor.featured && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 bg-yellow-400 text-warning text-xs font-bold rounded">TOP</span>
                </div>
              )}

              <div className="relative mx-auto mb-2">
                <img
                  src={instructor.avatar || "/placeholder.svg"}
                  alt={instructor.name}
                  className="w-16 h-16 rounded-full mx-auto border-2 border-border"
                />
                <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-5 h-5 bg-success/100 rounded-full border-2 border-white flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </div>

              <h3 className="text-sm font-bold mb-0.5">{instructor.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{instructor.title}</p>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <div className="text-lg font-bold text-primary">{instructor.courses}</div>
                  <div className="text-xs text-muted-foreground">Courses</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{(instructor.students / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-muted-foreground">Students</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{instructor.rating}</div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 justify-center mb-2">
                {instructor.expertise.map((skill, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
                    {skill}
                  </span>
                ))}
              </div>

              <button className="w-full bg-primary text-white py-1.5 rounded text-xs font-semibold">
                View Profile
              </button>
            </div>
          ))}
        </div>
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
      <div className="max-w-7xl mx-auto px-3 text-center text-white">
        <div className="inline-block mb-2">
          <div className="w-10 h-10 bg-card/20 rounded-full flex items-center justify-center mx-auto">
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
            className="flex-1 px-3 py-2 bg-card/10 border border-white/30 rounded-lg text-white placeholder-white/60 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-card text-primary px-4 py-2 rounded-lg font-semibold text-sm min-w-[100px]"
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Subscribe"}
          </button>
        </form>

        <p className="text-xs text-white/80">Join 50,000+ learners</p>
      </div>
    </section>
  )
}

// Final CTA (Preserved 100%)
function FinalCTA() {
  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)

  return (
    <section className="py-8 bg-card text-white text-center">
      <div className="max-w-7xl mx-auto px-3">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
          <Rocket className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Start Learning Today</h2>
        <p className="text-base mb-4">Join thousands transforming careers</p>

        <div className="flex gap-2 justify-center mb-4">
          <Link
            href={isAuthenticated ? "/dashboard" : "/register"}
            className="inline-flex items-center gap-1.5 bg-primary text-white font-semibold py-2 px-4 rounded-lg text-sm"
          >
            <Zap className="w-4 h-4" />
            {isAuthenticated ? "Continue" : "Start Free"}
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 border-2 border-white text-white font-semibold py-2 px-4 rounded-lg text-sm"
          >
            <BookOpen className="w-4 h-4" />
            Browse
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <div>
            <div className="text-xl font-bold">30-Day</div>
            <div className="text-xs text-muted-foreground">Money Back</div>
          </div>
          <div>
            <div className="text-xl font-bold">24/7</div>
            <div className="text-xs text-muted-foreground">Support</div>
          </div>
          <div>
            <div className="text-xl font-bold">1000+</div>
            <div className="text-xs text-muted-foreground">Reviews</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer (Preserved 100%)
function Footer() {
  const footerLinks = {
    Learning: [
      { label: "Web Dev", href: "/paths/web" },
      { label: "Data Science", href: "/paths/data" },
      { label: "Design", href: "/paths/design" },
      { label: "Business", href: "/paths/business" },
    ],
    Resources: [
      { label: "Blog", href: "/blog" },
      { label: "Help", href: "/help" },
      { label: "Community", href: "/community" },
    ],
    Company: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
    Legal: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  }

  return (
    <footer className="bg-card text-white pt-6 pb-4">
      <div className="max-w-7xl mx-auto px-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-base font-bold">BwengePlus</div>
                  <div className="text-xs text-muted-foreground">Never Stop Learning</div>
                </div>
              </div>
            </Link>
            <p className="text-xs text-muted-foreground mb-3">Empowering learners worldwide</p>

            <div className="flex items-center gap-2">
              {[Twitter, Facebook, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 bg-card rounded flex items-center justify-center">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-bold text-sm mb-2">{category}</h3>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs text-muted-foreground hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border my-3" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
          <div className="text-muted-foreground">© {new Date().getFullYear()} BwengePlus</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-muted-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-muted-foreground">
              Terms
            </Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-1 text-muted-foreground"
            >
              Top <ChevronUp className="w-3 h-3" />
            </button>
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
        
        <Navigation />
        <HeroSection />
        <CategoryFilters
          onCategoryChange={setActiveCategory}
          activeCategory={activeCategory}
        />
        <FeaturedCourses key={activeCategory} activeCategory={activeCategory} />
        <TopInstructors />
        <PlatformFeatures />
        <NewsletterCTA />
        <FinalCTA />
        <Footer />
      </div>
    </GoogleOAuthProvider>
  )
}