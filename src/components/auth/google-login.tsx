"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { loginWithGoogle } from '@/lib/features/auth/auth-slice'
import type { AppDispatch } from '@/lib/store'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'

/**
 * Google Login Button Component
 * 
 * Usage:
 * <GoogleLoginButton onSuccess={(user) => console.log(user)} />
 */
export function GoogleLoginButton({ onSuccess }: { onSuccess?: (user: any) => void }) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error('Google login failed - no credential received')
      return
    }

    setIsLoading(true)
    
    try {

      // Dispatch the loginWithGoogle action
      const result = await dispatch(loginWithGoogle(credentialResponse.credential)).unwrap()


      toast.success('Welcome! Login successful')

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result.user)
      }

      // Navigate to role-specific dashboard
      const dashboardPath = getRoleDashboardPath(result.user.bwenge_role)
      router.push(dashboardPath)

    } catch (error: any) {

      // Handle no account found — redirect to register
      if (typeof error === 'string' && (error.includes('No account found') || error.includes('NO_ACCOUNT'))) {
        toast.error('No account found with this Google email. Please apply to join BwengePlus first.', {
          description: 'You will be redirected to the application form.',
          duration: 4000,
        })
        setTimeout(() => router.push('/register'), 2000)
        return
      }

      // Handle pending/rejected
      if (typeof error === 'string' && error.includes('pending')) {
        toast.error('Your application is still under review.', {
          description: 'You will receive an email once it is approved.',
        })
        return
      }

      toast.error(error || 'Google login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Google login failed. Please try again.')
  }

  /*
   * AUTH-GOOG-001. Do not render the viewer's identity into the page.
   *
   * Google Identity Services personalises its button by itself: given an
   * active Google session and a previous consent for this client, it renders
   * "Continue as <first name>" with the account's email and avatar. On the
   * homepage that meant a stranger's screen — or a shared machine — showed a
   * real person's name and address before anyone had asked to sign in.
   *
   * `renderButton` has no option for this; the personalisation is decided by
   * GIS, not by the props below. `disableAutoSelect()` is the documented
   * lever: it clears the stored "this user is signed in here" state, which is
   * what the personalised rendering is built on, and also stops silent
   * auto-sign-in.
   *
   * The cost is deliberate and worth stating: a returning user no longer gets
   * one-tap re-entry and presses the button instead.
   *
   * Once per mount, not on every render: the homepage also mounts
   * GoogleOneTapLogin, which calls `initialize` of its own, and two
   * components writing GIS state on every render would race.
   */
  useEffect(() => {
    const clear = () => {
      try {
        ;(window as any)?.google?.accounts?.id?.disableAutoSelect?.()
      } catch {
        // GIS not loaded, or blocked. The button still works; it may simply
        // render personalised, which is what this tries to avoid rather than
        // something the page depends on.
      }
    }

    // GIS may not have finished loading on the first paint.
    clear()
    const retry = window.setTimeout(clear, 600)
    return () => window.clearTimeout(retry)
  }, [])

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-card/80 flex items-center justify-center rounded-lg z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/*
        Centre the button, and let GIS size it.

        width="100%" is not a width GIS accepts - it wants a number of pixels
        - so it was dropped rather than guessed at. Google sizes the button to
        its label, and the flex row centres whatever that comes to.
      */}
      <div className="flex w-full justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          type="standard"
          theme="outline"
          size="large"
          text="signin_with"
          shape="rectangular"
          logo_alignment="left"
        />
      </div>
    </div>
  )
}

export function GoogleOAuthProviderWrapper({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    return <>{children}</>
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  )
}

/**
 * Helper function to determine dashboard path based on user role
 */
function getRoleDashboardPath(role: string): string {
  const roleMap: Record<string, string> = {
    'SYSTEM_ADMIN': '/dashboard/system-admin',
    'INSTITUTION_ADMIN': '/dashboard/institution-admin',
    'CONTENT_CREATOR': '/dashboard/content-creator',
    'INSTRUCTOR': '/dashboard/instructor',
    'LEARNER': '/dashboard/learner',
  }
  
  return roleMap[role] || '/dashboard/learner'
}
