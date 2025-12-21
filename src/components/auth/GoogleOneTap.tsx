// @ts-nocheck
"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/lib/store'
import { toast } from 'sonner'
import api from '@/lib/api'
import Cookies from 'js-cookie'

interface GoogleOneTapProps {
  onSuccess?: (user: any) => void
  autoSelect?: boolean
  cancelOnTapOutside?: boolean
  context?: 'signin' | 'signup' | 'use'
  disabled?: boolean
  forceDisplay?: boolean
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          cancel: () => void
        }
      }
    }
    __googleOneTapInitialized?: boolean
    __googleOneTapScriptLoaded?: boolean
    __googleOneTapPrompted?: boolean
  }
}

/**
 * Helper function to determine dashboard path based on user role
 */
function getRoleDashboardPath(role: string | undefined): string {
  if (!role) return '/dashboard/learner'
  
  const roleMap: Record<string, string> = {
    'SYSTEM_ADMIN': '/dashboard/system-admin',
    'INSTITUTION_ADMIN': '/dashboard/institution-admin',
    'CONTENT_CREATOR': '/dashboard/content-creator',
    'INSTRUCTOR': '/dashboard/instructor',
    'LEARNER': '/dashboard/learner',
  }
  
  return roleMap[role] || '/dashboard/learner'
}

/**
 * Store authentication data properly
 */
const storeAuthData = (user: any, token: string) => {
  // Store in cookies
  Cookies.set("bwenge_token", token, { 
    expires: 7, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' 
  });
  Cookies.set("bwenge_user", JSON.stringify(user), { 
    expires: 7, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' 
  });
  
  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem("bwengeplus_token", token);
    localStorage.setItem("bwengeplus_user", JSON.stringify(user));
    
    if (user.institution) {
      localStorage.setItem("bwengeplus_institution", JSON.stringify(user.institution));
      Cookies.set("bwenge_institution", JSON.stringify(user.institution), { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    if (user.primary_institution_id) {
      localStorage.setItem("bwengeplus_primary_institution_id", user.primary_institution_id);
      Cookies.set("bwenge_primary_institution_id", user.primary_institution_id, { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    if (user.institution_role) {
      localStorage.setItem("bwengeplus_institution_role", user.institution_role);
      Cookies.set("bwenge_institution_role", user.institution_role, { 
        expires: 7,
        secure: process.env.NODE_ENV === 'production'
      });
    }
  }
};

/**
 * Google One Tap Login Component
 * Displays the Google One Tap prompt automatically when conditions are met
 */
export function GoogleOneTapLogin({
  onSuccess,
  autoSelect = false,
  cancelOnTapOutside = false,
  context = 'signin',
  disabled = false,
  forceDisplay = false
}: GoogleOneTapProps) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const initializationAttempted = useRef(false)
  const promptAttempted = useRef(false)

  const handleCredentialResponse = useCallback(async (response: any) => {
    if (!response.credential) {
      return
    }

    try {
      const result = await api.post('/auth/google-one-tap', {
        credential: response.credential
      })

      if (result.data.success) {
        const user = result.data.data.user
        const token = result.data.data.token

        storeAuthData(user, token)

        toast.success(`Welcome ${user.first_name}!`, {
          description: 'You have been logged in successfully'
        })

        if (onSuccess) {
          onSuccess(user)
        }

        const dashboardPath = getRoleDashboardPath(user.bwenge_role)

        setTimeout(() => {
          window.location.href = dashboardPath
        }, 500)
      }
    } catch (error: any) {
      const errData = error.response?.data
      const code = errData?.code
      const message = errData?.message || 'Google One Tap login failed'

      if (code === 'NO_ACCOUNT') {
        toast.error('No BwengePlus account found', {
          description: 'Please apply to join BwengePlus first. You will be redirected.',
          duration: 4000,
        })
        setTimeout(() => {
          window.location.href = '/register'
        }, 2500)
        return
      }

      if (code === 'PENDING_APPROVAL') {
        toast.error('Application under review', {
          description: message,
          duration: 5000,
        })
        return
      }

      if (code === 'APPLICATION_REJECTED') {
        toast.error('Application not approved', {
          description: message,
          duration: 5000,
        })
        return
      }

      toast.error('Authentication Failed', {
        description: message
      })
    }
  }, [router, onSuccess, dispatch])

  useEffect(() => {
    // Determine if we should show One Tap
    const shouldShow = forceDisplay || (!isAuthenticated && !disabled)
    
    if (!shouldShow) {
      return
    }

    // Prevent multiple initializations
    if (initializationAttempted.current || window.__googleOneTapInitialized) {
      return
    }

    initializationAttempted.current = true

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      return
    }

    // Function to initialize Google One Tap
    const initializeGoogleOneTap = () => {
      if (!window.google) {
        return
      }

      if (window.__googleOneTapInitialized) {
        return
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: autoSelect,
          cancel_on_tap_outside: cancelOnTapOutside,
          context: context,
          itp_support: true,
          ux_mode: 'popup',
          state_cookie_domain: window.location.hostname,
        })

        window.__googleOneTapInitialized = true

        // Display the One Tap prompt
        if (!window.__googleOneTapPrompted && !promptAttempted.current) {
          promptAttempted.current = true
          window.__googleOneTapPrompted = true
          
          window.google.accounts.id.prompt((notification: any) => {
            // Silently handle notifications without logging
            if (notification.isNotDisplayed?.()) {
              // Prompt not displayed - try again after a delay
              setTimeout(() => {
                if (window.google?.accounts?.id && !isAuthenticated) {
                  window.google.accounts.id.prompt()
                }
              }, 3000)
            }
          })
        }
      } catch (error) {
        // Silent fail
        window.__googleOneTapInitialized = false
      }
    }

    // Load or reuse Google One Tap script
    if (window.__googleOneTapScriptLoaded && window.google) {
      initializeGoogleOneTap()
    } else {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          window.__googleOneTapScriptLoaded = true
          initializeGoogleOneTap()
        })
      } else {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        
        script.onload = () => {
          window.__googleOneTapScriptLoaded = true
          initializeGoogleOneTap()
        }

        document.body.appendChild(script)
      }
    }

    // Cleanup function
    return () => {
      if (window.google?.accounts?.id && window.__googleOneTapInitialized) {
        try {
          window.google.accounts.id.cancel()
          window.__googleOneTapInitialized = false
          window.__googleOneTapPrompted = false
        } catch (error) {
          // Silent cleanup
        }
      }
      
      initializationAttempted.current = false
      promptAttempted.current = false
    }
  }, [handleCredentialResponse, autoSelect, cancelOnTapOutside, context, isAuthenticated, disabled, forceDisplay])

  // This component doesn't render anything visible
  return null
}

/**
 * Debug component - only used for development
 */
export function GoogleOneTapDebug() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    // Silent debug - no console logs
    const checkStatus = setInterval(() => {
      // No logging - just for development tools
    }, 5000)

    return () => clearInterval(checkStatus)
  }, [])

  return null
}