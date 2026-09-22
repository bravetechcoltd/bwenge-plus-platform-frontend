"use client"

import { RequireAccess } from "@/components/auth/require-access"
import { roleOf } from "@/lib/auth/authorization"
import SettingsPage from "../../settings/page"

/**
 * Instructor settings (IS-001).
 *
 * The shared settings screen — appearance, notifications, and security
 * (password and two-factor) — all backed by real endpoints under
 * `/auth/settings`.
 *
 * What an instructor may change is decided by the endpoints, not by this
 * wrapper: every one of them scopes to the caller's own row and takes no user
 * id, so there is no route by which an instructor edits anyone else's account.
 * Platform-wide configuration lives under the system-admin settings routes,
 * which this page does not link to and those routes refuse anyway.
 */
export default function InstructorSettingsPage() {
  return (
    <RequireAccess
      check={(sessionUser) =>
        roleOf(sessionUser) === "INSTRUCTOR" ||
        roleOf(sessionUser) === "SYSTEM_ADMIN" ||
        roleOf(sessionUser) === "INSTITUTION_ADMIN"
      }
    >
      <div className="p-4 md:p-6">
        <SettingsPage />
      </div>
    </RequireAccess>
  )
}
