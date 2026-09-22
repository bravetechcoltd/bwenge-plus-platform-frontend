"use client"

import { RequireAccess } from "@/components/auth/require-access"
import { roleOf } from "@/lib/auth/authorization"
import { InstructorEnrollmentRequestsView } from "@/components/instructor/enrollment-requests-view"

/**
 * Instructor enrolment requests (IER-001).
 *
 * The canonical route — this is the path the sidebar has always pointed at,
 * and until now nothing was here.
 *
 * The guard decides who may open the screen; what appears on it is decided by
 * the server, which scopes `/enrollments/pending` by role and hands an
 * instructor only the courses they teach or are assigned to manage. Both are
 * needed: without the guard the page opens for anyone, and without the server
 * scoping the guard would be the only thing standing between an instructor and
 * another instructor's requests.
 */
export default function InstructorEnrollmentRequestsPage() {
  return (
    <RequireAccess
      check={(sessionUser) =>
        roleOf(sessionUser) === "INSTRUCTOR" ||
        roleOf(sessionUser) === "CONTENT_CREATOR" ||
        roleOf(sessionUser) === "SYSTEM_ADMIN" ||
        roleOf(sessionUser) === "INSTITUTION_ADMIN"
      }
    >
      <InstructorEnrollmentRequestsView />
    </RequireAccess>
  )
}
