"use client"

import { StudentProgressDashboard } from "@/components/progress/student-progress-dashboard"

export default function StudentProgressPage() {
  // In a real app, get user ID from auth context
  const userId = "current-user-id"

  return (
    <div className="container mx-auto px-4 py-6">
      <StudentProgressDashboard userId={userId} />
    </div>
  )
}
