// @ts-nocheck
"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/lib/store'
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
          renderButton: (element: HTMLElement, options: any) => void
        }
      }
    }
  }
}

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

const storeAuthData = (user: any, token: string) => {
  Cookies.set("bwenge_token", token, { expires: 7, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' })
  Cookies.set("bwenge_user", JSON.stringify(user), { expires: 7, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' })
  
  if (typeof window !== 'undefined') {
    localStorage.setItem("bwengeplus_token", token)
    localStorage.setItem("bwengeplus_user", JSON.stringify(user))
  }
}

/**
 * Custom Google One Tap implementation that completely bypasses FedCM
 * by using a hidden div with renderButton method
 */
export function GoogleOneTapLogin({
  onSuccess,
  autoSelect = false,
  cancelOnTapOutside = true,
  context = 'signin',
  disabled = false,
  forceDisplay = false
}: GoogleOneTapProps) {
  const router = useRouter()
  const { isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const initialized = useRef(false)
  const hasShown = useRef(false)
  const hiddenDivRef = useRef<HTMLDivElement | null>(null)

  const handleCredentialResponse = useCallback(async (response: any) => {
    if (!response?.credential) return

    try {
      const result = await api.post('/auth/google-one-tap', { credential: response.credential })

      if (result.data.success) {
        const user = result.data.data.user
        const token = result.data.data.token
        storeAuthData(user, token)

        toast.success(`Welcome ${user.first_name}!`, { description: 'You have been logged in successfully' })
        if (onSuccess) onSuccess(user)

        const dashboardPath = getRoleDashboardPath(user.bwenge_role)
        setTimeout(() => { window.location.href = dashboardPath }, 500)
      }
    } catch (error: any) {
      const errData = error.response?.data
      const code = errData?.code
      const message = errData?.message || 'Google One Tap login failed'

      if (code === 'NO_ACCOUNT') {
        toast.error('No BwengePlus account found', { description: 'Please apply to join BwengePlus first.', duration: 4000 })
        setTimeout(() => { window.location.href = '/register' }, 2500)
      } else if (code === 'PENDING_APPROVAL') {
        toast.error('Application under review', { description: message, duration: 5000 })
      } else if (code === 'APPLICATION_REJECTED') {
        toast.error('Application not approved', { description: message, duration: 5000 })
      } else {
        toast.error('Authentication Failed', { description: message })
      }
    }
  }, [router, onSuccess])

  useEffect(() => {
    // Don't show if authenticated or disabled
    if (isAuthenticated || disabled) return
    if (!forceDisplay && hasShown.current) return
    if (initialized.current) return
    
    initialized.current = true

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

    // Function to trigger One Tap without FedCM
    const triggerOneTap = () => {
      if (!window.google?.accounts?.id) return

      try {
        // Create hidden div for One Tap if not exists
        if (!hiddenDivRef.current) {
          const hiddenDiv = document.createElement('div')
          hiddenDiv.style.position = 'fixed'
          hiddenDiv.style.top = '-9999px'
          hiddenDiv.style.left = '-9999px'
          hiddenDiv.style.opacity = '0'
          hiddenDiv.style.pointerEvents = 'none'
          hiddenDiv.style.zIndex = '-9999'
          document.body.appendChild(hiddenDiv)
          hiddenDivRef.current = hiddenDiv
        }

        // Initialize with minimal configuration
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: autoSelect,
          cancel_on_tap_outside: cancelOnTapOutside,
          context: context,
          // CRITICAL: Disable FedCM
          use_fedcm_for_prompt: false,
        })

        // Use renderButton on hidden div - this bypasses FedCM completely
        window.google.accounts.id.renderButton(hiddenDivRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: '1',
        })

        // Trigger the One Tap by simulating a click on the hidden button
        setTimeout(() => {
          const iframe = hiddenDivRef.current?.querySelector('iframe')
          if (iframe && !hasShown.current) {
            hasShown.current = true
            // Dispatch click event to show One Tap
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
            iframe.dispatchEvent(clickEvent)
          }
        }, 100)
      } catch (error) {
        // Silent fail
      }
    }

    // Load Google script
    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        triggerOneTap()
        return
      }

      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existingScript) {
        existingScript.addEventListener('load', triggerOneTap, { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = triggerOneTap
      document.body.appendChild(script)
    }

    // Delay to ensure page is fully loaded
    const timer = setTimeout(loadGoogleScript, 500)

    return () => {
      clearTimeout(timer)
      // Clean up hidden div
      if (hiddenDivRef.current && document.body.contains(hiddenDivRef.current)) {
        document.body.removeChild(hiddenDivRef.current)
        hiddenDivRef.current = null
      }
    }
  }, [handleCredentialResponse, autoSelect, cancelOnTapOutside, context, isAuthenticated, disabled, forceDisplay])

  return null
}

/**
 * Alternative: Simple Google Sign-In Button (No One Tap)
 * Use this if One Tap continues to have issues
 */
export function GoogleSignInButton({ 
  onSuccess, 
  className = "",
  buttonText = "Sign in with Google"
}: { 
  onSuccess?: (credential: string) => void
  className?: string
  buttonText?: string
}) {
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || !buttonRef.current) return

    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        initializeButton()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeButton
      document.body.appendChild(script)
    }

    const initializeButton = () => {
      if (!buttonRef.current || !window.google?.accounts?.id) return

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response.credential && onSuccess) {
            onSuccess(response.credential)
          }
        },
        use_fedcm_for_prompt: false,
      })

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: '100%',
      })
    }

    loadGoogleScript()
  }, [onSuccess])

  return (
    <div className={className}>
      <div ref={buttonRef} className="w-full" />
    </div>
  )
}