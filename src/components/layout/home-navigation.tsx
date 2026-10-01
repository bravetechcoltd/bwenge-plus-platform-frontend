// @ts-nocheck
//
// Inherited, not chosen. This code moved verbatim out of src/app/page.tsx,
// which carries @ts-nocheck, and it brings that file’s existing type errors
// with it — the user object is read from cookies and localStorage as `any`,
// so every field access on it fails to check. Dropping the directive would
// turn a move into a rewrite.
//
// It is worth paying down: a @ts-nocheck file is invisible to tsc, which is
// exactly how a missing import in this project once reached the browser as a
// runtime ReferenceError after a clean typecheck.
"use client"

/**
 * ==========================================================================
 * The public navigation bar (NAV-002)
 * ==========================================================================
 *
 * Lifted out of src/app/page.tsx unchanged, so that /our-products and the
 * homepage render one bar rather than two that look alike.
 *
 * Copying the markup would have produced exactly that: two bars identical on
 * the day they were written and divergent on the first change to either —
 * a new nav item, a fix to the account menu, a different logo. Everything
 * the bar needs came with it, including the role helpers and the Google
 * button, because those are what it reads to decide what to show a signed-in
 * visitor.
 *
 * Nothing here was redesigned in the move. If this bar is wrong somewhere, it
 * was wrong on the homepage first.
 */

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "sonner"
import Cookies from "js-cookie"
import { GoogleLogin } from "@react-oauth/google"
import {
  Menu,
  X,
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  GraduationCap,
  LogOut,
  Bookmark,
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

import { CourseSearch } from "@/components/courses/course-search"
import { hardSignOut } from "@/lib/auth/hard-sign-out"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { logoutBwenge, loginWithGoogle } from "@/lib/features/auth/auth-slice"
import type { AppDispatch, RootState } from "@/lib/store"
import {
  ABOUT_NAV_ITEMS,
  ABOUT_NAV_HEADING,
} from "@/components/home/about-sections"
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
export const determineActualRole = (reduxUser: any): string => {
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
export function getRoleDashboardPath(role: string | undefined): string {
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
export function GoogleLoginButton() {
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
export default function HomeNavigation() {
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

  // HP-002. Open state for the About BWENGE+ dropdown.
  const [aboutOpen, setAboutOpen] = useState(false)

  const navLinks = [
    { label: "Courses", href: "/#courses" },
    { label: "Instructors", href: "/#instructors" },
    { label: "Our Products", href: "/our-products" },
  ]

  const handleLogout = async () => {
    try {
      await dispatch(logoutBwenge(false)).unwrap()
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      toast.error('Logout failed')
      /*
       * A failed logout still ends the session in this browser.
       *
       * This branch used to show a toast and stop, leaving every cookie and
       * key in place — so the user was told they were logged out and was not.
       * Whether the server accepted the request or not, this device is done.
       */
      hardSignOut()
      router.push('/')
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
            {/* The same mark as the loaded bar, so it does not change on hydration. */}
            <Link href="/" className="flex items-center" aria-label="BWENGE+ home">
              <Image
                src="/bwenge-plus-mark.png"
                alt="BWENGE+"
                width={760}
                height={260}
                priority
                unoptimized
                className="h-[34px] w-auto object-contain"
              />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center gap-3 lg:gap-5">
          {/*
            LOGO-001. The mark alone, with no wordmark beside it.

            It used to be a 36px box holding BwengePlusLogo.png — which is the
            Bwenge Collaboration Space poster, 1536x1024 with a solid blue
            background baked in. Letterboxed into that box it was a blue
            rectangle with something unreadable inside, and the two lines of
            text beside it were doing the work the logo should do.

            public/bwenge-plus-mark.png is the actual BWENGE+ mark: square,
            transparent, 512px, with the plus at the top right. 40px here and
            40px in the footer, so the two agree.

            unoptimized, because this is already a small square PNG — putting
            it through the image pipeline costs a request and returns the same
            pixels. priority, because it is above the fold on every view.
          */}
          <Link href="/" className="group flex shrink-0 items-center" aria-label="BWENGE+ home">
            <motion.span
              className="block"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="/bwenge-plus-mark.png"
                alt="BWENGE+"
                width={760}
                height={260}
                priority
                unoptimized
                className="h-[34px] w-auto object-contain"
              />
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden shrink-0 items-center gap-1 pl-2 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
                <span className="absolute bottom-1 left-3 right-3 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}

            {/*
              HP-002. Six informational sections behind one item, so the bar
              does not grow by six links. It opens on hover for a pointer and
              on click for everything else — hover alone is unreachable by
              keyboard and unusable on a touch screen, and click alone feels
              stiff on a desktop menu, so both are wired.
            */}
            <div
              className="relative"
              onMouseEnter={() => setAboutOpen(true)}
              onMouseLeave={() => setAboutOpen(false)}
            >
              <button
                type="button"
                onClick={() => setAboutOpen((open) => !open)}
                aria-expanded={aboutOpen}
                aria-haspopup="true"
                className="flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: aboutOpen ? "rgba(91,78,150,0.10)" : "transparent",
                  color: aboutOpen ? "#5B4E96" : undefined,
                }}
              >
                About BWENGE+
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aboutOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {aboutOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute left-0 top-full z-50 w-72 pt-2"
                  >
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                      {/*
                        The reference opens this menu with a short statement of
                        what is behind it, then the five destinations. Each row
                        carries an icon and one line, because a bare list of five
                        similar titles — Vision, Mission, Values — gives no clue
                        which one answers the question being asked.
                      */}
                      <div className="border-b border-border px-4 py-3">
                        <p className="text-sm font-bold text-foreground">{ABOUT_NAV_HEADING.title}</p>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {ABOUT_NAV_HEADING.description}
                        </p>
                      </div>
                      <div className="p-1.5">
                        {ABOUT_NAV_ITEMS.map((item) => (
                          <a
                            key={item.href}
                            href={item.href}
                            onClick={() => setAboutOpen(false)}
                            className="group/item relative flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[rgba(91,78,150,0.07)] focus:bg-[rgba(91,78,150,0.07)] focus:outline-none"
                          >
                            {/* The left accent the reference draws on the active row. */}
                            <span
                              aria-hidden
                              className="absolute inset-y-1.5 left-0 w-[3px] rounded-full opacity-0 transition-opacity group-hover/item:opacity-100"
                              style={{ backgroundColor: "#5B4E96" }}
                            />
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "rgba(91,78,150,0.10)", color: "#5B4E96" }}>
                              <item.icon className="h-4 w-4" strokeWidth={1.9} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-semibold leading-tight text-foreground">
                                {item.label}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                                {item.description}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* User Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
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

        {/*
          NAV-001. The search on its own row.

          It used to sit between the nav links and the account controls in
          the 64px row, taking whatever width was left after both — which
          on a laptop is a short box wedged between two groups of
          unrelated controls, and the thing it is competing with for that
          width is the navigation itself.

          A row of its own gives it the container's full width and leaves
          the nav row to the things that belong together: brand, sections,
          account. The row is hidden below lg, where the search already
          lives inside the mobile menu and a second bar would eat a third
          of a phone screen before any content.

          Still the same component the catalogue, an institution's
          catalogue and a course page use (CS-001), so a query typed here
          returns the same courses in the same order, and clicking a
          result signed out opens the same login modal and comes back to
          the same course.
        */}
        {/*
          Half the row, centred, so the quarter either side reads as deliberate
          margin rather than as a control that happened to stop there. Full
          width made the search the widest thing on the page and left it
          looking like a page element rather than part of the bar.
        */}
        <div className="hidden justify-center border-t border-border/60 py-2.5 lg:flex">
          <CourseSearch className="w-1/2" />
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
              {/* Search first: it is what most people open this menu for. */}
              <div className="px-3 pb-3 lg:hidden">
                <CourseSearch />
              </div>

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

                {/*
                  HP-002. The same six sections, flat rather than behind a
                  dropdown: a menu that is already a vertical list gains
                  nothing from a second level, and loses a tap.
                */}
                <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  About BWENGE+
                </p>
                {ABOUT_NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {item.label}
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
