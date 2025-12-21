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
  console.log("🔐 [ONE-TAP STORE] Storing authentication data...");
  
  // 1. Store in cookies (for backend API calls)
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
  
  // 2. Store in localStorage (for frontend state persistence)
  if (typeof window !== 'undefined') {
    localStorage.setItem("bwengeplus_token", token);
    localStorage.setItem("bwengeplus_user", JSON.stringify(user));
    
    // Store institution data if available
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
  
  console.log("✅ [ONE-TAP STORE] All data stored successfully");
};

/**
 * Google One Tap Login Component
 * 
 * Displays the Google One Tap prompt automatically when:
 * - User is not authenticated
 * - Component is mounted
 * - Google One Tap is available in the browser
 * 
 * Usage:
 * ```tsx
 * <GoogleOneTapLogin 
 *   autoSelect={false}
 *   onSuccess={(user) => console.log('User logged in:', user)}
 * />
 * ```
 */
export function GoogleOneTapLogin({
  onSuccess,
  autoSelect = false,
  cancelOnTapOutside = false,
  context = 'signin',
  disabled = false
}: GoogleOneTapProps) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const initializationAttempted = useRef(false)

  const handleCredentialResponse = useCallback(async (response: any) => {
    if (!response.credential) {
      console.error('❌ [GoogleOneTap] No credential received')
      toast.error('Google One Tap failed - no credential received')
      return
    }

    try {
      console.log('🔐 [GoogleOneTap] Processing credential...')
      
      // Send credential to backend
      const result = await api.post('/auth/google-one-tap', {
        credential: response.credential
      })

      if (result.data.success) {
        console.log('✅ [GoogleOneTap] Authentication successful:', {
          userId: result.data.data.user.id,
          email: result.data.data.user.email,
          role: result.data.data.user.bwenge_role
        })
        
        // ✅ FIX: Store auth data FIRST before any navigation
        const user = result.data.data.user
        const token = result.data.data.token
        
        storeAuthData(user, token)
        
        if (dispatch) {
          console.log('✅ [GoogleOneTap] Auth data stored, state will update on next render')
        }
        
        // Show success message
        toast.success(`Welcome ${user.first_name}!`, {
          description: 'You have been logged in successfully'
        })
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(user)
        }

        // ✅ FIX: Navigate to role-specific dashboard with a slight delay
        // This gives time for the state to update
        const dashboardPath = getRoleDashboardPath(user.bwenge_role)
        console.log('🔀 [GoogleOneTap] Redirecting to:', dashboardPath)
        
        // Use setTimeout to ensure state updates before navigation
        setTimeout(() => {
          // Force a page reload to ensure all state is properly initialized
          window.location.href = dashboardPath
        }, 500)
      }
    } catch (error: any) {
      console.error('❌ [GoogleOneTap] Authentication failed:', error)
      
      const errorMessage = error.response?.data?.message || 'Google One Tap login failed'
      toast.error('Authentication Failed', {
        description: errorMessage
      })
    }
  }, [router, onSuccess, dispatch])

  useEffect(() => {
    // Don't show One Tap if already authenticated or disabled
    if (isAuthenticated || disabled) {
      console.log('⏭️ [GoogleOneTap] Skipping - already authenticated or disabled')
      return
    }

    // Prevent multiple initializations
    if (initializationAttempted.current || window.__googleOneTapInitialized) {
      console.log('⏭️ [GoogleOneTap] Already initialized, skipping')
      return
    }

    initializationAttempted.current = true

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      console.error('❌ [GoogleOneTap] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured')
      console.error('⚠️ Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env.local file')
      return
    }

    // Function to initialize Google One Tap
    const initializeGoogleOneTap = () => {
      if (!window.google) {
        console.error('❌ [GoogleOneTap] Google script loaded but window.google is undefined')
        return
      }

      // Check if already initialized
      if (window.__googleOneTapInitialized) {
        console.log('⏭️ [GoogleOneTap] Already initialized globally')
        return
      }

      console.log('✅ [GoogleOneTap] Initializing with client ID:', clientId.substring(0, 20) + '...')

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

        // Mark as initialized
        window.__googleOneTapInitialized = true

        console.log('✅ [GoogleOneTap] Initialized successfully')

        // Display the One Tap prompt
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed?.()) {
            const reason = notification.getNotDisplayedReason?.()
            console.warn('⚠️ [GoogleOneTap] Not displayed:', reason)
            
            // Show user-friendly messages for common issues
            switch (reason) {
              case 'browser_not_supported':
                console.warn('⚠️ Browser does not support Google One Tap')
                break
              case 'invalid_client':
                console.error('❌ Invalid Google Client ID - check your configuration')
                toast.error('Google One Tap configuration error', {
                  description: 'Please contact support'
                })
                break
              case 'missing_client_id':
                console.error('❌ Missing Google Client ID')
                break
              case 'opt_out_or_no_session':
                console.info('ℹ️ User opted out or no Google session available')
                break
              case 'secure_http_required':
                console.error('❌ HTTPS required for Google One Tap (except localhost)')
                break
              case 'suppressed_by_user':
                console.info('ℹ️ User suppressed One Tap')
                break
              case 'unregistered_origin':
                console.error('❌ Origin not registered in Google Cloud Console')
                console.error(`   Current origin: ${window.location.origin}`)
                console.error('   Required action: Add this origin to Google Cloud Console:')
                console.error('   1. Go to https://console.cloud.google.com/apis/credentials')
                console.error('   2. Select your OAuth 2.0 Client ID')
                console.error('   3. Add to "Authorized JavaScript origins":')
                console.error(`      ${window.location.origin}`)
                toast.error('Google One Tap not configured', {
                  description: 'Origin not registered. Check console for details.'
                })
                break
              case 'unknown_reason':
                console.warn('⚠️ Unknown reason for not displaying One Tap')
                break
            }
          } else if (notification.isSkippedMoment?.()) {
            const reason = notification.getSkippedReason?.()
            console.info('ℹ️ [GoogleOneTap] Skipped:', reason)
          } else if (notification.isDismissedMoment?.()) {
            const reason = notification.getDismissedReason?.()
            console.info('ℹ️ [GoogleOneTap] Dismissed:', reason)
          } else {
            console.log('✅ [GoogleOneTap] Displayed successfully')
          }
        })
      } catch (error) {
        console.error('❌ [GoogleOneTap] Initialization error:', error)
        window.__googleOneTapInitialized = false
      }
    }

    // Load or reuse Google One Tap script
    if (window.__googleOneTapScriptLoaded && window.google) {
      // Script already loaded, initialize directly
      console.log('✅ [GoogleOneTap] Script already loaded, initializing...')
      initializeGoogleOneTap()
    } else {
      // Load script
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      
      if (existingScript) {
        // Script exists but may not be loaded yet
        console.log('⏳ [GoogleOneTap] Script exists, waiting for load...')
        existingScript.addEventListener('load', () => {
          window.__googleOneTapScriptLoaded = true
          initializeGoogleOneTap()
        })
      } else {
        // Create new script
        console.log('📥 [GoogleOneTap] Loading script...')
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        
        script.onerror = () => {
          console.error('❌ [GoogleOneTap] Failed to load Google One Tap script')
          window.__googleOneTapScriptLoaded = false
        }

        script.onload = () => {
          console.log('✅ [GoogleOneTap] Script loaded successfully')
          window.__googleOneTapScriptLoaded = true
          initializeGoogleOneTap()
        }

        document.body.appendChild(script)
      }
    }

    // Cleanup function
    return () => {
      // Only cancel if this component initialized it
      if (window.google?.accounts?.id && window.__googleOneTapInitialized) {
        try {
          window.google.accounts.id.cancel()
          console.log('🧹 [GoogleOneTap] Cleanup: cancelled prompt')
        } catch (error) {
          console.warn('⚠️ [GoogleOneTap] Cleanup error:', error)
        }
      }
      
      // Reset initialization flag for this component instance
      initializationAttempted.current = false
    }
  }, [handleCredentialResponse, autoSelect, cancelOnTapOutside, context, isAuthenticated, disabled])

  // This component doesn't render anything visible
  return null
}

/**
 * Debug component - shows current One Tap status
 * Only use in development
 */
export function GoogleOneTapDebug() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    console.log('🐛 [GoogleOneTap Debug] Starting...')
    console.log('🐛 Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')
    console.log('🐛 Origin:', window.location.origin)

    const checkStatus = setInterval(() => {
      const status = {
        scriptLoaded: window.__googleOneTapScriptLoaded || false,
        apiAvailable: !!window.google?.accounts?.id,
        initialized: window.__googleOneTapInitialized || false,
      }
      console.log('🐛 [GoogleOneTap Status]', status)
    }, 5000)

    return () => clearInterval(checkStatus)
  }, [])

  return null
}