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
    return null
  }
}

/**
 * Store COMPLETE auth data in both cookies and localStorage
 */
const storeAuthData = (user: User, token: string) => {
  
  // Log all user data for debugging

  // 1. Store in cookies (for backend API calls)
  Cookies.set("bwenge_token", token, { expires: 7, secure: true, sameSite: 'strict' })
  Cookies.set("bwenge_user", JSON.stringify(user), { expires: 7, secure: true, sameSite: 'strict' })
  
  // 2. Store in localStorage (for frontend state persistence)
  localStorage.setItem("bwengeplus_token", token)
  localStorage.setItem("bwengeplus_user", JSON.stringify(user))
  
  // 3. Store institution-specific data if user has institution
  if (user.institution || user.primary_institution_id) {
    
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
  
}

/**
 * Clear ALL auth data from both cookies and localStorage
 */
const clearAuthData = () => {
  
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
  
}

/**
 * Load COMPLETE auth data from storage
 */
const loadAuthData = () => {
  
  let loadedToken: string | null = null
  let loadedUser: User | null = null
  
  try {
    // Priority 1: Check cookies (backend sets these)
    const cookieToken = Cookies.get("bwenge_token")
    const cookieUser = Cookies.get("bwenge_user")
    
    
    if (cookieToken && cookieUser) {
      const parsedUser = safeJSONParse(cookieUser)
      if (parsedUser) {
        
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
    
    
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser)
      
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
    
  } catch (error) {
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
    }
  }, [])

  // ==================== LOGIN FUNCTION ====================

  const login = async (email: string, password: string) => {
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
        return { 
          success: false, 
          message: data.message || "Login failed" 
        }
      }

      // ✅ IMPORTANT: Store COMPLETE user data from response
      const { user: userData, token: userToken } = data.data!
      

      // ✅ Store ALL data in both cookies and localStorage
      storeAuthData(userData, userToken)
      
      // Update state
      setUser(userData)
      setToken(userToken)

      // Handle institution admins specially
      if (userData.bwenge_role === BwengeRole.INSTITUTION_ADMIN) {
        if (userData.institution) {
        }
      }

      // Redirect based on user role
      const redirectPath = getRedirectPath(userData)
      router.push(redirectPath)

      return { success: true }
    } catch (error: any) {
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
        return { 
          success: false, 
          message: data.message || "Verification failed" 
        }
      }


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


      // Redirect to verification page
      router.push(`/verify-email?email=${registerData.email}&message=Please check your email to verify your account`)
      
      return data
    } catch (error: any) {
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
    
    try {
      // Call logout endpoint
      await fetch(`${API_BASE_URL}/auth/logout${logoutAllSystems ? '?logout_all_systems=true' : ''}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

    } catch (error) {
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
      return
    }


    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data: ApiResponse<User> = await response.json()

      if (data.success && data.data) {
        
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
    }
  }

  // ==================== UPDATE USER ====================

  const updateUser = (updates: Partial<User>) => {
    if (!user) {
      return
    }


    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)
    
    // Update storage with COMPLETE data
    storeAuthData(updatedUser, token!)
    
  }

  // ==================== CHECK ONGERA SESSION ====================

  const checkOngeraSession = async (): Promise<boolean> => {
    if (!token) return false


    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-ongera-session`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data: ApiResponse<{ has_ongera_session: boolean }> = await response.json()
      const hasSession = data.success && data.data?.has_ongera_session === true
      
      return hasSession
    } catch (error) {
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


  // Special handling for institution admins
  if (bwenge_role === BwengeRole.INSTITUTION_ADMIN) {
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