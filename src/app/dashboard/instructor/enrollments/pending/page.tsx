import { redirect } from "next/navigation"

/**
 * The screen moved to `/dashboard/instructor/enrollment/requests` (IER-001).
 *
 * A redirect rather than a deletion: the instructor dashboard home linked here
 * and so, most likely, do bookmarks. One screen, one URL, and the old address
 * keeps working.
 */
export default function PendingEnrollmentsRedirect() {
  redirect("/dashboard/instructor/enrollment/requests")
}
