"use client"

import { RequireAccess } from "@/components/auth/require-access"
import { roleOf } from "@/lib/auth/authorization"
import Profile from "../../profile/page"

/**
 * Instructor profile (IS-001).
 *
 * The shared profile screen, which already reads and writes every field the
 * backend supports — personal, contact, professional, institutional, the
 * profile image and the CV — through `GET`/`PUT /auth/profile`. Instructors
 * were simply the one role with no route to it.
 *
 * Wrapping rather than rebuilding is the established pattern here: the
 * institution-admin and learner dashboards do exactly this. A second profile
 * screen would be a second set of fields to keep in step with the entity.
 *
 * The guard is what the wrapper adds. The other roles' wrappers have none,
 * relying on the dashboard layout alone; this one states the rule locally too,
 * so the page cannot be reached by a role that should not have it.
 */
export default function InstructorProfilePage() {
  return (
    <RequireAccess
      check={(sessionUser) =>
        roleOf(sessionUser) === "INSTRUCTOR" ||
        roleOf(sessionUser) === "SYSTEM_ADMIN" ||
        roleOf(sessionUser) === "INSTITUTION_ADMIN"
      }
    >
      <div className="p-4 md:p-6">
        <Profile />
      </div>
    </RequireAccess>
  )
}
