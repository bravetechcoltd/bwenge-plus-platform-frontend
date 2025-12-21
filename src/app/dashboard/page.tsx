"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/hooks"
import { getRoleDashboardPath } from "@/app/utils/roleNavigation"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAppSelector((state) => state.bwengeAuth)

  useEffect(() => {
    if (isAuthenticated && user) {
      const dashboardPath = getRoleDashboardPath(user.bwenge_role)
      router.replace(dashboardPath)
    }
  }, [isAuthenticated, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5] mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}