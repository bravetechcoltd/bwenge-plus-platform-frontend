"use client"

import { useParams } from "next/navigation"
import { ProctoringPanel } from "@/components/learning/proctoring-panel"

/**
 * Assessment security for one course (AS-SEC-001 G-2).
 *
 * Authorisation is the server's: every endpoint behind this panel checks
 * `requireCourseStaff`, so reaching the route without permission returns an
 * error rather than an empty screen pretending to be a permission model.
 */
export default function CourseSecurityRoute() {
  const params = useParams()
  const courseId = params.id as string

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Assessment security
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set how each assessment is monitored, and see whether its question bank
          is deep enough to matter.
        </p>
      </header>

      <ProctoringPanel courseId={courseId} />
    </div>
  )
}
