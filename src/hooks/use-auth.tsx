"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { User, BwengeRole, AccountType, ApiResponse, Institution, InstitutionRole } from "@/types"

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string } | undefined>
  verifyEmail: (email: string, otp: string) => Promise<{ success: boolean; message?: string } | undefined>
  register: (data: RegisterData) => Promise<ApiResponse>
  logout: (logoutAllSystems?: boolean) => Promise<void>
  refreshProfile: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  checkOngeraSession: () => Promise<boolean>
}

interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  account_type: AccountType
  username?: string
  phone_number?: string
  institution_id?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// ==================== STORAGE HELPER FUNCTIONS ====================

/**
 * Helper to safely parse JSON from cookies or localStorage
 */
const safeJSONParse = (value: string | undefined): any => {
  if (!value) return null
  try {
    const decoded = decodeURIComponent(value)
    return JSON.parse(decoded)
  } catch (error) {
    console.error("Failed to parse JSON:", error)
    return null
  }
}

/**
 * Store COMPLETE auth data in both cookies and localStorage
 */
const storeAuthData = (user: User, token: string) => {
  console.log("🔐 [storeAuthData] Storing COMPLETE authentication data...")
  
  // Log all user data for debugging
  console.log("📋 [storeAuthData] User data to store:", {
    id: user.id,
    email: user.email,
    bwenge_role: user.bwenge_role,
    account_type: user.account_type,
    institution: user.institution,
    primary_institution_id: user.primary_institution_id,
    is_institution_member: user.is_institution_member,
    institution_ids: user.institution_ids,
    institution_role: user.institution_role,
    profile: user.profile,
    total_learning_hours: user.total_learning_hours,
    certificates_earned: user.certificates_earned,
    bwenge_profile_completed: user.bwenge_profile_completed
  })

  // 1. Store in cookies (for backend API calls)
  Cookies.set("bwenge_token", token, { expires: 7, secure: true, sameSite: 'strict' })
  Cookies.set("bwenge_user", JSON.stringify(user), { expires: 7, secure: true, sameSite: 'strict' })
  
  // 2. Store in localStorage (for frontend state persistence)
  localStorage.setItem("bwengeplus_token", token)
  localStorage.setItem("bwengeplus_user", JSON.stringify(user))
  
  // 3. Store institution-specific data if user has institution
  if (user.institution || user.primary_institution_id) {
    console.log("🏛️ [storeAuthData] Storing institution-specific data")
    
    if (user.institution) {
      Cookies.set("bwenge_institution", JSON.stringify(user.institution), { expires: 7 })
      localStorage.setItem("bwengeplus_institution", JSON.stringify(user.institution))
    }
    
    if (user.primary_institution_id) {
      Cookies.set("bwenge_primary_institution_id", user.primary_institution_id, { expires: 7 })
      localStorage.setItem("bwengeplus_primary_institution_id", user.primary_institution_id)
    }
    
    if (user.institution_role) {
      Cookies.set("bwenge_institution_role", user.institution_role, { expires: 7 })
      localStorage.setItem("bwengeplus_institution_role", user.institution_role)
    }
  }
  
  console.log("✅ [storeAuthData] All data stored successfully:", {
    cookies: {
      token: "****" + token.slice(-10),
      user: "stored",
      institution: user.institution ? "stored" : "not stored"
    },
    localStorage: {
      token: "stored",
      user: "stored",
      institution: user.institution ? "stored" : "not stored"
    }
  })
}

/**
 * Clear ALL auth data from both cookies and localStorage
 */
const clearAuthData = () => {
  console.log("🗑️ [clearAuthData] Clearing ALL authentication data...")
  
  // Clear all auth cookies
  Cookies.remove("bwenge_token")
  Cookies.remove("bwenge_user")
  Cookies.remove("bwenge_institution")
  Cookies.remove("bwenge_primary_institution_id")
  Cookies.remove("bwenge_institution_role")
  
  // Clear all localStorage items
  localStorage.removeItem("bwengeplus_token")
  localStorage.removeItem("bwengeplus_user")
  localStorage.removeItem("bwengeplus_institution")
  localStorage.removeItem("bwengeplus_primary_institution_id")
  localStorage.removeItem("bwengeplus_institution_role")
  
  // Clear any LIS_ prefixed items (legacy)
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("LIS_")) {
      localStorage.removeItem(key)
    }
  })
  
  console.log("✅ [clearAuthData] All auth data cleared")
}

/**
 * Load COMPLETE auth data from storage
 */
const loadAuthData = () => {
  console.log("🔍 [loadAuthData] Loading authentication data...")
  
  let loadedToken: string | null = null
  let loadedUser: User | null = null
  
  try {
    // Priority 1: Check cookies (backend sets these)
    const cookieToken = Cookies.get("bwenge_token")
    const cookieUser = Cookies.get("bwenge_user")
    
    console.log("🍪 [loadAuthData] Cookie check:", {
      hasToken: !!cookieToken,
      hasUser: !!cookieUser
    })
    
    if (cookieToken && cookieUser) {
      const parsedUser = safeJSONParse(cookieUser)
      if (parsedUser) {
        console.log("✅ [loadAuthData] Loaded from cookies:", {
          userId: parsedUser.id,
          email: parsedUser.email,
          role: parsedUser.bwenge_role,
          hasInstitution: !!parsedUser.institution
        })
        
        loadedToken = cookieToken
        loadedUser = parsedUser
        
        // Sync to localStorage
        localStorage.setItem("bwengeplus_token", cookieToken)
        localStorage.setItem("bwengeplus_user", JSON.stringify(parsedUser))
        
        // Load institution data from cookies if available
        const cookieInstitution = Cookies.get("bwenge_institution")
        const cookiePrimaryInstitutionId = Cookies.get("bwenge_primary_institution_id")
        const cookieInstitutionRole = Cookies.get("bwenge_institution_role")
        
        if (cookieInstitution && loadedUser) {
          const parsedInstitution = safeJSONParse(cookieInstitution)
          if (parsedInstitution) {
            loadedUser.institution = parsedInstitution
            localStorage.setItem("bwengeplus_institution", JSON.stringify(parsedInstitution))
          }
        }
        
        if (cookiePrimaryInstitutionId && loadedUser) {
          loadedUser.primary_institution_id = cookiePrimaryInstitutionId
          localStorage.setItem("bwengeplus_primary_institution_id", cookiePrimaryInstitutionId)
        }
        
        if (cookieInstitutionRole && loadedUser) {
          loadedUser.institution_role = cookieInstitutionRole as InstitutionRole
          localStorage.setItem("bwengeplus_institution_role", cookieInstitutionRole)
        }
        
        return { token: loadedToken, user: loadedUser }
      }
    }
    
    // Priority 2: Check localStorage (fallback)
    const storedToken = localStorage.getItem("bwengeplus_token")
    const storedUser = localStorage.getItem("bwengeplus_user")
    
    console.log("💾 [loadAuthData] localStorage check:", {
      hasToken: !!storedToken,
      hasUser: !!storedUser
    })
    
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser)
      console.log("✅ [loadAuthData] Loaded from localStorage:", {
        userId: parsedUser.id,
        email: parsedUser.email,
        role: parsedUser.bwenge_role
      })
      
      loadedToken = storedToken
      loadedUser = parsedUser
      
      // Load additional institution data from localStorage
      const storedInstitution = localStorage.getItem("bwengeplus_institution")
      const storedPrimaryInstitutionId = localStorage.getItem("bwengeplus_primary_institution_id")
      const storedInstitutionRole = localStorage.getItem("bwengeplus_institution_role")
      
      if (storedInstitution) {
        parsedUser.institution = JSON.parse(storedInstitution)
      }
      
      if (storedPrimaryInstitutionId) {
        parsedUser.primary_institution_id = storedPrimaryInstitutionId
      }
      
      if (storedInstitutionRole) {
        parsedUser.institution_role = storedInstitutionRole as InstitutionRole
      }
      
      // Sync to cookies
      Cookies.set("bwenge_token", storedToken, { expires: 7 })
      Cookies.set("bwenge_user", JSON.stringify(parsedUser), { expires: 7 })
      
      if (storedInstitution) {
        Cookies.set("bwenge_institution", storedInstitution, { expires: 7 })
      }
      
      if (storedPrimaryInstitutionId) {
        Cookies.set("bwenge_primary_institution_id", storedPrimaryInstitutionId, { expires: 7 })
      }
      
      if (storedInstitutionRole) {
        Cookies.set("bwenge_institution_role", storedInstitutionRole, { expires: 7 })
      }
      
      return { token: loadedToken, user: parsedUser }
    }
    
    console.log("⚠️ [loadAuthData] No authentication data found")
  } catch (error) {
    console.error("❌ [loadAuthData] Error during loading:", error)
    clearAuthData()
  }
  
  return { token: null, user: null }
}

// ==================== AUTH PROVIDER ====================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Initialize from storage on mount
  useEffect(() => {
    const { token: loadedToken, user: loadedUser } = loadAuthData()
    if (loadedToken && loadedUser) {
      setToken(loadedToken)
      setUser(loadedUser)
      console.log("🚀 [AuthProvider] Initialized from storage:", {
        userId: loadedUser.id,
        email: loadedUser.email,
        role: loadedUser.bwenge_role,
        institutionAdmin: loadedUser.bwenge_role === BwengeRole.INSTITUTION_ADMIN
      })
    }
  }, [])

  // ==================== LOGIN FUNCTION ====================

  const login = async (email: string, password: string) => {
    console.log("🔐 [login] Starting login process...")
    setIsLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data: ApiResponse<{ user: User; token: string }> = await response.json()

      if (!response.ok || !data.success) {
        console.log("❌ [login] Login failed:", data.message)
        return { 
          success: false, 
          message: data.message || "Login failed" 
        }
      }

      // ✅ IMPORTANT: Store COMPLETE user data from response
      const { user: userData, token: userToken } = data.data!
      
      console.log("✅ [login] Login successful - Full user data:", {
        id: userData.id,
        email: userData.email,
        bwenge_role: userData.bwenge_role,
        account_type: userData.account_type,
        // Institution data
        is_institution_member: userData.is_institution_member,
        institution_ids: userData.institution_ids,
        institution_role: userData.institution_role,
        primary_institution_id: userData.primary_institution_id,
        has_institution_object: !!userData.institution,
        // Profile data
        profile_picture_url: userData.profile_picture_url,
        enrolled_courses_count: userData.enrolled_courses_count,
        completed_courses_count: userData.completed_courses_count,
        total_learning_hours: userData.total_learning_hours,
        certificates_earned: userData.certificates_earned,
        bwenge_profile_completed: userData.bwenge_profile_completed
      })

      // ✅ Store ALL data in both cookies and localStorage
      storeAuthData(userData, userToken)
      
      // Update state
      setUser(userData)
      setToken(userToken)

      // Handle institution admins specially
      if (userData.bwenge_role === BwengeRole.INSTITUTION_ADMIN) {
        console.log("🏛️ [login] User is an INSTITUTION_ADMIN")
        if (userData.institution) {
          console.log("📋 Institution details:", {
            name: userData.institution.name,
            type: userData.institution.type,
            id: userData.institution.id
          })
        }
      }

      // Redirect based on user role
      const redirectPath = getRedirectPath(userData)
      console.log("🔀 [login] Redirecting to:", redirectPath)
      router.push(redirectPath)

      return { success: true }
    } catch (error: any) {
      console.error("❌ [login] Exception:", error)
      return { 
        success: false, 
        message: error.message || "Something went wrong. Try again." 
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ==================== EMAIL VERIFICATION ====================

  const verifyEmail = async (email: string, otp: string) => {
    console.log("📧 [verifyEmail] Starting email verification...")
    setIsLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      })

      const data: ApiResponse<{ user: User; token: string }> = await response.json()

      if (!response.ok || !data.success) {
        console.log("❌ [verifyEmail] Verification failed:", data.message)
        return { 
          success: false, 
          message: data.message || "Verification failed" 
        }
      }

      console.log("✅ [verifyEmail] Verification successful")

      // Store COMPLETE auth data
      const { user: userData, token: userToken } = data.data!
      storeAuthData(userData, userToken)
      
      setUser(userData)
      setToken(userToken)

      // Redirect based on user role
      const redirectPath = getRedirectPath(userData)
      router.push(redirectPath)

      return { success: true }
    } catch (error: any) {
      console.error("❌ [verifyEmail] Exception:", error)
      return { 
        success: false, 
        message: error.message || "Something went wrong. Try again." 
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ==================== REGISTRATION ====================

  const register = async (registerData: RegisterData): Promise<ApiResponse> => {
    console.log("📝 [register] Starting registration...")
    setIsLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      })

      const data: ApiResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Registration failed")
      }

      console.log("✅ [register] Registration successful")

      // Redirect to verification page
      router.push(`/verify-email?email=${registerData.email}&message=Please check your email to verify your account`)
      
      return data
    } catch (error: any) {
      console.error("❌ [register] Exception:", error)
      return { 
        success: false, 
        message: error.message || "Registration failed" 
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ==================== LOGOUT ====================

  const logout = async (logoutAllSystems = false) => {
    console.log("👋 [logout] Starting logout...")
    
    try {
      // Call logout endpoint
      await fetch(`${API_BASE_URL}/auth/logout${logoutAllSystems ? '?logout_all_systems=true' : ''}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("✅ [logout] Logout successful")
    } catch (error) {
      console.error("❌ [logout] Error:", error)
      // Continue with local cleanup even if API call fails
    }

    // Clear ALL auth data
    clearAuthData()
    
    // Clear state
    setUser(null)
    setToken(null)

    // Redirect to login
    router.push("/login")
  }

  // ==================== REFRESH PROFILE ====================

  const refreshProfile = async () => {
    if (!token) {
      console.log("⚠️ [refreshProfile] No token available")
      return
    }

    console.log("🔄 [refreshProfile] Refreshing user profile...")

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data: ApiResponse<User> = await response.json()

      if (data.success && data.data) {
        console.log("✅ [refreshProfile] Profile refreshed:", {
          userId: data.data.id,
          email: data.data.email,
          bwenge_role: data.data.bwenge_role,
          has_institution: !!data.data.institution
        })
        
        const updatedUser = data.data
        
        // ✅ Preserve all institution data
        if (!updatedUser.institution && user?.institution) {
          updatedUser.institution = user.institution
        }
        
        if (!updatedUser.primary_institution_id && user?.primary_institution_id) {
          updatedUser.primary_institution_id = user.primary_institution_id
        }
        
        if (!updatedUser.institution_role && user?.institution_role) {
          updatedUser.institution_role = user.institution_role
        }
        
        setUser(updatedUser)
        
        // Update storage with COMPLETE data
        storeAuthData(updatedUser, token)
      }
    } catch (error) {
      console.error("❌ [refreshProfile] Error:", error)
    }
  }

  // ==================== UPDATE USER ====================

  const updateUser = (updates: Partial<User>) => {
    if (!user) {
      console.log("⚠️ [updateUser] No user to update")
      return
    }

    console.log("📝 [updateUser] Updating user data...")

    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)
    
    // Update storage with COMPLETE data
    storeAuthData(updatedUser, token!)
    
    console.log("✅ [updateUser] User updated")
  }

  // ==================== CHECK ONGERA SESSION ====================

  const checkOngeraSession = async (): Promise<boolean> => {
    if (!token) return false

    console.log("🔍 [checkOngeraSession] Checking Ongera session...")

    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-ongera-session`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data: ApiResponse<{ has_ongera_session: boolean }> = await response.json()
      const hasSession = data.success && data.data?.has_ongera_session === true
      
      console.log("✅ [checkOngeraSession] Result:", hasSession)
      return hasSession
    } catch (error) {
      console.error("❌ [checkOngeraSession] Error:", error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        setToken,
        token,
        isLoading,
        login,
        verifyEmail,
        register,
        logout,
        refreshProfile,
        updateUser,
        checkOngeraSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Determine redirect path based on user role
 */
function getRedirectPath(user: User): string {
  const { bwenge_role, account_type } = user

  console.log("📍 [getRedirectPath] Determining redirect path:", {
    bwenge_role,
    account_type,
    is_institution_admin: bwenge_role === BwengeRole.INSTITUTION_ADMIN,
    institution_id: user.primary_institution_id
  })

  // Special handling for institution admins
  if (bwenge_role === BwengeRole.INSTITUTION_ADMIN) {
    console.log("🏛️ [getRedirectPath] User is an INSTITUTION_ADMIN")
    if (user.primary_institution_id) {
      return `/dashboard/institution-admin/${user.primary_institution_id}/dashboard`
    }
    return "/dashboard/institution-admin/dashboard"
  }

  // Map Bwenge roles to paths
  const roleMap: Record<BwengeRole, string> = {
    [BwengeRole.SYSTEM_ADMIN]: "/admin/dashboard",
    [BwengeRole.INSTITUTION_ADMIN]: "/institution/admin/dashboard", // Fallback
    [BwengeRole.CONTENT_CREATOR]: "/creator/dashboard",
    [BwengeRole.INSTRUCTOR]: "/instructor/dashboard",
    [BwengeRole.LEARNER]: "/dashboard",
  }

  // Use Bwenge role first, fallback to account type
  if (bwenge_role && roleMap[bwenge_role]) {
    return roleMap[bwenge_role]
  }

  // Fallback based on account type
  switch (account_type) {
    case AccountType.ADMIN:
      return "/admin/dashboard"
    case AccountType.INSTITUTION:
      return "/institution/dashboard"
    case AccountType.RESEARCHER:
      return "/instructor/dashboard"
    case AccountType.DIASPORA:
    case AccountType.STUDENT:
    default:
      return "/dashboard"
  }
}