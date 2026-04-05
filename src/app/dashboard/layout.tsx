"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/hooks"
import { Loader2 } from "lucide-react"
import { useCrossSystemAuth } from '@/lib/hooks/useCrossSystemAuth'

// Role-based dashboard mapping
const getRoleDashboardPath = (role: string) => {
  switch (role) {
    case 'SYSTEM_ADMIN':
      return '/dashboard/system-admin';
    case 'INSTITUTION_ADMIN':
      return '/dashboard/institution-admin';
    case 'CONTENT_CREATOR':
      return '/dashboard/content-creator';
    case 'INSTRUCTOR':
      return '/dashboard/instructor';
    case 'LEARNER':
      return '/dashboard/learner';
    case 'ADMIN': // Legacy role, map to SYSTEM_ADMIN
      return '/dashboard/system-admin';
    default:
      return '/dashboard/learner'; // Default fallback
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.bwengeAuth)
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  // ✅ Monitor cross-system authentication
  const { isMonitoring } = useCrossSystemAuth()

  // Authentication check and role-based routing
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login")
        return
      }

      if (isAuthenticated && user) {
        const currentPath = window.location.pathname
        
        // If user is at root dashboard, redirect to role-specific dashboard
        if (currentPath === "/dashboard" || currentPath === "/dashboard/") {
          setIsRedirecting(true)
          const dashboardPath = getRoleDashboardPath(user.bwenge_role)
          
          // Add small delay for better UX
          setTimeout(() => {
            router.replace(dashboardPath)
          }, 500)
        }
        
        // If user tries to access wrong dashboard, redirect to correct one
        const userRole = user.bwenge_role
        const rolePaths = [
          '/dashboard/system-admin',
          '/dashboard/institution-admin', 
          '/dashboard/content-creator',
          '/dashboard/instructor',
          '/dashboard/learner'
        ]
        
        const isOnRolePath = rolePaths.some(path => currentPath.startsWith(path))
        
        if (isOnRolePath) {
          const correctPath = getRoleDashboardPath(userRole)
          
          // Check if user is on the wrong role path
          if (!currentPath.startsWith(correctPath)) {
            // Extract any sub-path after the role
            const subPath = currentPath.split('/').slice(3).join('/')
            const newPath = subPath ? `${correctPath}/${subPath}` : correctPath
            
            // Don't redirect if already redirecting
            if (!isRedirecting) {
              setIsRedirecting(true)
              setTimeout(() => {
                router.replace(newPath)
              }, 500)
            }
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, isRedirecting])

  // Session monitoring info
  useEffect(() => {
    if (isMonitoring) {
    }
  }, [isMonitoring])

  // Show loading state while redirecting
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-card">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#4F46E5] mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isRedirecting ? 'Redirecting to your dashboard...' : 'Loading...'}
          </p>
          {user && isRedirecting && (
            <p className="text-sm text-muted-foreground mt-2">
              Taking you to {user.bwenge_role.replace('_', ' ')} Dashboard
            </p>
          )}
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}