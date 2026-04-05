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
import { useTheme } from "next-themes"

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
  
  // 1. Try cookies
  let cookieUser: any = null
  const userCookie = Cookies.get("bwenge_user")
  if (userCookie) {
    try {
      cookieUser = JSON.parse(userCookie)
    } catch (e) {
    }
  }
  
  // 2. Try localStorage
  let localStorageUser: any = null
  const localUserStr = safeGetLocalStorage("bwengeplus_user")
  if (localUserStr) {
    try {
      localStorageUser = JSON.parse(localUserStr)
    } catch (e) {
    }
  }
  
  // 3. Try cross-system context
  const crossSystemContext: any = safeGetLocalStorageJSON("cross_system_context", null)
  if (crossSystemContext) {
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
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

    const [actualRole, setActualRole] = useState<string>("LEARNER")
    const [actualUser, setActualUser] = useState<any>(null)
    const [validationDone, setValidationDone] = useState(false)

  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])


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
    }
    
    
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
    <header className='fixed top-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border'>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div>
              <div className="font-bold text-base text-foreground leading-tight">BwengePlus</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Never Stop Learning</div>
            </div>
          </Link>

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
              <div className="hidden md:flex items-center gap-2">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-[200px]"
                >
                  <GoogleLoginButton />
                </motion.div>

                <div className="h-6 w-px bg-border"></div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Link
                    href="/login"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
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
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm"
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
                className="hidden md:flex items-center gap-2"
              >
                <Link
                  href={dashboardPath}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {isLearner ? "My Learning" : "Dashboard"}
                </Link>

                {/* User Avatar Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowUserMenu(!showUserMenu)
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="relative">
                      {actualUser?.profile_picture_url ? (
                        <img
                          src={actualUser.profile_picture_url}
                          alt={actualUser.first_name}
                          className="w-7 h-7 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className={`
                          w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient()}
                          flex items-center justify-center text-white font-semibold text-xs
                          shadow-sm
                        `}>
                          {getUserInitials()}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-success/100 rounded-full border border-background" />
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-xs font-semibold text-foreground leading-tight">
                        {actualUser?.first_name} {actualUser?.last_name}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 leading-tight">
                        <RoleIcon className="w-2.5 h-2.5" />
                        {roleDisplayName}
                      </div>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1.5 w-60 bg-popover rounded-xl shadow-lg border border-border py-1.5 z-50"
                      >
                        {/* User Info Header */}
                        <div className="px-3 py-2.5 border-b border-border">
                          <div className="flex items-center gap-2.5">
                            {actualUser?.profile_picture_url ? (
                              <img
                                src={actualUser.profile_picture_url}
                                alt={actualUser.first_name}
                                className="w-9 h-9 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className={`
                                w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient()}
                                flex items-center justify-center text-white font-semibold text-sm
                                shadow-sm
                              `}>
                                {getUserInitials()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {actualUser?.first_name} {actualUser?.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {actualUser?.email}
                              </div>
                            </div>
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-accent rounded-full">
                            <RoleIcon className="w-3 h-3 text-accent-foreground" />
                            <span className="text-xs font-medium text-accent-foreground">
                              {roleDisplayName}
                            </span>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <Link
                            href={dashboardPath}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                            {isLearner ? "My Learning" : "Dashboard"}
                          </Link>

                          <Link
                            href={`/dashboard/${actualRole.toLowerCase()}/profile`}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <User className="w-4 h-4 text-muted-foreground" />
                            Profile
                          </Link>

                          <Link
                            href={`/dashboard/${actualRole.toLowerCase()}/settings`}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-4 h-4 text-muted-foreground" />
                            Settings
                          </Link>

                          {actualRole === 'INSTITUTION_ADMIN' && (
                            <Link
                              href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`}
                              className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              Institution
                            </Link>
                          )}

                          <Link
                            href="/help"
                            className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            Help
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-border pt-1">
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                              handleLogout()
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
              transition={{ duration: 0.25 }}
              className="md:hidden border-t border-border py-3 overflow-hidden"
            >
              <nav className="space-y-1">
                <div className="space-y-1">
                  {!isAuthenticated ? (
                    <>
                      <div className="px-2">
                        <GoogleLoginButton />
                      </div>

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
                        className="block px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In with Email
                      </Link>
                      <Link
                        href="/register"
                        className="block px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg text-center hover:bg-primary/90 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Join Free
                      </Link>
                    </>
                  ) : (
                    <>
                      {/* Mobile User Info */}
                      <div className="px-3 py-2.5 bg-accent rounded-lg mx-1">
                        <div className="flex items-center gap-2.5 mb-2">
                          {actualUser?.profile_picture_url ? (
                            <img
                              src={actualUser.profile_picture_url}
                              alt={actualUser.first_name}
                              className="w-9 h-9 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className={`
                              w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient()}
                              flex items-center justify-center text-white font-semibold text-sm shadow-sm
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
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded-full">
                          <RoleIcon className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-foreground">
                            {roleDisplayName}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={dashboardPath}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                        {isLearner ? "My Learning" : "Dashboard"}
                      </Link>

                      <Link
                        href={`/dashboard/${actualRole.toLowerCase()}/profile`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        Profile
                      </Link>

                      <Link
                        href={`/dashboard/${actualRole.toLowerCase()}/settings`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        Settings
                      </Link>

                      {actualRole === 'INSTITUTION_ADMIN' && (
                        <Link
                          href={`/dashboard/institution-admin/institution/profile?institution=${actualUser?.primary_institution_id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Building2 className="w-4 h-4 text-muted-foreground" />
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