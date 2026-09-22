"use client"

import React, { useState } from 'react'
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

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-card/80 flex items-center justify-center rounded-lg z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
        width="100%"
      />
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
