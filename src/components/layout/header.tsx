// @ts-nocheck
"use client"

import Link from "next/link"
import { Bell, User, Settings, LogOut, Sun, Moon, ChevronDown, BookOpen, HelpCircle, Building2, LayoutDashboard, GraduationCap, Shield, FileText, Loader2, Menu, X } from "lucide-react"

import { loginWithGoogle, logoutBwenge } from "@/lib/features/auth/auth-slice"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from 'sonner'
import { AppDispatch, RootState } from "@/lib/store"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { GoogleLogin } from "@react-oauth/google"

interface HeaderProps {
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
    profile_picture_url?: string
    bwenge_role: BwengeRole
    total_learning_hours: number
    certificates_earned: number
    institution?: {
      id: string
      name: string
      logo_url?: string
    }
  }
}


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

const getActualUser = () => {
  console.log("🔍 [UTIL] Getting actual user from all sources...")
  
  // 1. Try cookies
  let cookieUser: any = null
  const userCookie = Cookies.get("bwenge_user")
  if (userCookie) {
    try {
      cookieUser = JSON.parse(userCookie)
      console.log("✅ [UTIL] Found user in cookies:", cookieUser?.bwenge_role)
    } catch (e) {
      console.error("❌ [UTIL] Failed to parse cookie user:", e)
    }
  }
  
  // 2. Try localStorage
  let localStorageUser: any = null
  const localUserStr = safeGetLocalStorage("bwengeplus_user")
  if (localUserStr) {
    try {
      localStorageUser = JSON.parse(localUserStr)
      console.log("✅ [UTIL] Found user in localStorage:", localStorageUser?.bwenge_role)
    } catch (e) {
      console.error("❌ [UTIL] Failed to parse localStorage user:", e)
    }
  }
  
  // 3. Try cross-system context
  const crossSystemContext: any = safeGetLocalStorageJSON("cross_system_context", null)
  if (crossSystemContext) {
    console.log("✅ [UTIL] Found cross-system context:", crossSystemContext)
  }
  
  return {
    cookieUser,
    localStorageUser,
    crossSystemContext
  }
}

const determineActualRole = (reduxUser: any): string => {
  const { cookieUser, localStorageUser, crossSystemContext } = getActualUser()
  
  // Priority: Redux > Cookies > localStorage > cross-system context
  
  if (reduxUser?.bwenge_role) {
    console.log("🎯 [UTIL] Using Redux role:", reduxUser.bwenge_role)
    return reduxUser.bwenge_role
  }
  
  if (cookieUser?.bwenge_role) {
    console.log("🎯 [UTIL] Using cookie role:", cookieUser.bwenge_role)
    return cookieUser.bwenge_role
  }
  
  if (localStorageUser?.bwenge_role) {
    console.log("🎯 [UTIL] Using localStorage role:", localStorageUser.bwenge_role)
    return localStorageUser.bwenge_role
  }
  
  if (crossSystemContext?.bwenge_role) {
    console.log("🎯 [UTIL] Using cross-system context role:", crossSystemContext.bwenge_role)
    return crossSystemContext.bwenge_role
  }
  
  console.log("⚠️ [UTIL] No role found, defaulting to LEARNER")
  return "LEARNER"
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
      console.log('🔐 [GoogleLogin] Starting Google authentication...')

      const result = await dispatch(loginWithGoogle(credentialResponse.credential)).unwrap()

      console.log('✅ [GoogleLogin] Authentication successful:', {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.bwenge_role
      })

      toast.success(`Welcome ${result.user.first_name}! Login successful`)

      const dashboardPath = getRoleDashboardPath(result.user.bwenge_role)
      console.log('🔀 [GoogleLogin] Redirecting to:', dashboardPath)

      // Full page reload to ensure all state is initialized
      setTimeout(() => {
        window.location.href = dashboardPath
      }, 500)

    } catch (error: any) {
      console.error('❌ [GoogleLogin] Authentication failed:', error)
      toast.error(error || 'Google login failed. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleGoogleError = () => {
    console.error('❌ [GoogleLogin] Google OAuth error')
    toast.error('Google login failed. Please try again.')
  }

  return (
    <div className="relative w-full">
      {isLoggingIn && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg z-10">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
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

export function Header({ user }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user: reduxUser, isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)

    const [actualRole, setActualRole] = useState<string>("LEARNER")
    const [actualUser, setActualUser] = useState<any>(null)
    const [validationDone, setValidationDone] = useState(false)
  
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()


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
    if (actualUser?.first_name) {
      return actualUser.first_name.charAt(0).toUpperCase()
    }
    if (actualUser?.email) {
      return actualUser.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  useEffect(() => {
    console.log("🔍 [NAV] Validating user from all sources...")
    
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
        bwenge_role: crossSystemContext.bwenge_role || "LEARNER",
        primary_institution_id: crossSystemContext.primary_institution_id,
        institution_ids: crossSystemContext.institution_ids || [],
        institution_role: crossSystemContext.institution_role,
        email: crossSystemContext.email || "user@example.com",
        first_name: crossSystemContext.first_name || "User",
        last_name: crossSystemContext.last_name || "",
        id: crossSystemContext.id || "recovered"
      } as any
      console.log("🔄 [NAV] Recovered user from cross-system context")
    }
    
    console.log("✅ [NAV] Determined role:", determinedRole)
    console.log("✅ [NAV] Determined user:", determinedUser?.bwenge_role)
    
    setActualUser(determinedUser)
    setActualRole(determinedRole)
    setValidationDone(true)
  }, [reduxUser])
  
  const getAvatarGradient = () => {
    switch(actualRole) {
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
  
  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'SYSTEM_ADMIN': "System Administrator",
      'INSTITUTION_ADMIN': "Institution Administrator",
      'CONTENT_CREATOR': "Content Creator",
      'INSTRUCTOR': "Instructor",
      'LEARNER': "Learner"
    }
    return roleMap[role] || "User"
  }

  const roleDisplayName = getRoleDisplayName(actualRole)
  const RoleIcon = getRoleIcon(actualRole)
  const dashboardPath = getRoleDashboardPath(actualRole)
  const isLearner = isLearnerRole(actualRole)


  return (
    <header
      className='fixed top-0 w-full z-50 transition-all duration-300 bg-white border-b border-gray-200'
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
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
              <div className="font-bold text-lg text-gray-900 transition-colors">
                BwengePlus
              </div>
              <div className="text-xs text-gray-500">Never Stop Learning</div>
            </div>
          </Link>



          {/* User Actions */}
          <div className="flex items-center gap-3">
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
                <div className="h-8 w-px bg-gray-300"></div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
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
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg bg-primary/80 transition-all shadow-sm hover:shadow-md"
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
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
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
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative">
                      {actualUser?.profile_picture_url ? (
                        // If profile picture exists, show it
                        <img
                          src={actualUser.profile_picture_url}
                          alt={actualUser.first_name}
                          className="w-8 h-8 rounded-full object-cover border-2 border-blue-600"
                        />
                      ) : (
                        // BEAUTIFUL PLACEHOLDER - Shows first character with role-based gradient
                        <div className={`
                          w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient()} 
                          flex items-center justify-center text-white font-semibold text-sm
                          shadow-md border-2 border-white ring-2 ring-blue-600/30
                        `}>
                          {getUserInitials()}
                        </div>
                      )}
                      {/* Online status indicator */}
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-sm font-semibold text-gray-900">
                        {actualUser?.first_name} {actualUser?.last_name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <RoleIcon className="w-3 h-3" />
                        {roleDisplayName}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
                      >
                        {/* User Info Header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            {actualUser?.profile_picture_url ? (
                              <img
                                src={actualUser.profile_picture_url}
                                alt={actualUser.first_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-blue-600"
                              />
                            ) : (
                              // BEAUTIFUL PLACEHOLDER for dropdown
                              <div className={`
                                w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()} 
                                flex items-center justify-center text-white font-semibold text-lg
                                shadow-lg border-2 border-white ring-2 ring-blue-600/30
                              `}>
                                {getUserInitials()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {actualUser?.first_name} {actualUser?.last_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {actualUser?.email}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-full">
                            <RoleIcon className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">
                              {roleDisplayName}
                            </span>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <Link
                            href={dashboardPath}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            {isLearner ? "My Learning" : "Dashboard"}
                          </Link>

                          <Link
                            href={`/dashboard/${actualRole.toLowerCase()}/profile`}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <User className="w-4 h-4" />
                            Profile
                          </Link>

                          <Link
                            href={`/dashboard/${actualRole.toLowerCase()}/settings`}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </Link>

                          {/* Institution link for admins */}
                          {actualRole === 'INSTITUTION_ADMIN' && (
                            <Link
                              href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Building2 className="w-4 h-4" />
                              Institution
                            </Link>
                          )}

                          {/* Help link */}
                          <Link
                            href="/help"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <HelpCircle className="w-4 h-4" />
                            Help
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100 py-1">
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                              handleLogout()
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
              className="md:hidden border-t border-gray-200 py-3 overflow-hidden"
            >
              <nav className="space-y-2">


                <div className="pt-2 border-t border-gray-200 space-y-2">
                  {!isAuthenticated ? (
                    <>
                      {/* Google Login Button for Mobile */}
                      <div className="px-3">
                        <GoogleLoginButton />
                      </div>

                      {/* Divider with OR */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-white text-gray-500">OR</span>
                        </div>
                      </div>

                      <Link
                        href="/login"
                        className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In with Email
                      </Link>
                      <Link
                        href="/register"
                        className="block px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg bg-primary/80 text-center transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Join Free
                      </Link>
                    </>
                  ) : (
                    <>
                      {/* Mobile User Info */}
                      <div className="px-3 py-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {actualUser?.profile_picture_url ? (
                            <img
                              src={actualUser.profile_picture_url}
                              alt={actualUser.first_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-600"
                            />
                          ) : (
                            // BEAUTIFUL PLACEHOLDER for mobile
                            <div className={`
                              w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()} 
                              flex items-center justify-center text-white font-semibold text-lg
                              shadow-lg border-2 border-white
                            `}>
                              {getUserInitials()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {actualUser?.first_name} {actualUser?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{actualUser?.email}</div>
                          </div>
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 bg-white rounded-full">
                          <RoleIcon className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">
                            {roleDisplayName}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Navigation Links */}
                      <Link
                        href={dashboardPath}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        {isLearner ? "My Learning" : "Dashboard"}
                      </Link>

                      <Link
                        href={`/dashboard/${actualRole.toLowerCase()}/profile`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>

                      <Link
                        href={`/dashboard/${actualRole.toLowerCase()}/settings`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>

                      {/* Institution link for admins */}
                      {actualRole === 'INSTITUTION_ADMIN' && (
                        <Link
                          href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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