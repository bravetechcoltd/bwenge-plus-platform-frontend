"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { RequireAccess } from "@/components/auth/require-access"
import { roleOf } from "@/lib/auth/authorization"
import MyCertificatesPage from "@/components/learner/MyCertificatesPage"

/**
 * An instructor's own certificates (IL-001).
 *
 * The same component the learner dashboard renders, reading the same records.
 * A certificate is earned by completing a course, and an instructor earns one
 * the same way anybody else does — by enrolling and finishing it. Nothing here
 * issues a certificate; it only shows the ones the existing completion rules
 * have already granted.
 */
export default function InstructorCertificatesPage() {
  return (
    <RequireAccess
      check={(sessionUser) =>
        roleOf(sessionUser) === "INSTRUCTOR" ||
        roleOf(sessionUser) === "SYSTEM_ADMIN" ||
        roleOf(sessionUser) === "INSTITUTION_ADMIN"
      }
    >
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <MyCertificatesPage />
      </Suspense>
    </RequireAccess>
  )
}
