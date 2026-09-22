import type { SessionUser } from "@/lib/auth/session"
import { institutionIdsOf, roleOf } from "@/lib/auth/authorization"

/**
 * Where "back to somewhere useful" actually is (AXM-CONS-001 §6.5).
 *
 * The two not-found pages both offered a "Contact Support" link to `/contact`,
 * a route that does not exist — the page that exists to recover from a broken
 * link offered a broken one (E-03). Recovery destinations are resolved from
 * the session here instead of being hard-coded per page, so a course detail
 * 404 offers *its own* dashboard's course list rather than a generic home.
 */

export interface Destination {
  href: string
  label: string
}

/** The dashboard this user actually lands on. */
export function homeForUser(user: SessionUser | null): Destination {
  if (!user) return { href: "/login", label: "Sign in" }

  switch (roleOf(user)) {
    case "SYSTEM_ADMIN":
      return { href: "/dashboard/system-admin", label: "Go to dashboard" }
    case "INSTITUTION_ADMIN": {
      const institutionId =
        user.primary_institution_id ||
        institutionIdsOf(user)[0] ||
        user.institution?.id
      return {
        href: institutionId
          ? `/dashboard/institution-admin/${institutionId}/courses`
          : "/dashboard/institution-admin",
        label: "Go to dashboard",
      }
    }
    case "INSTRUCTOR":
      return { href: "/dashboard/instructor", label: "Go to dashboard" }
    case "CONTENT_CREATOR":
      return { href: "/dashboard/instructor", label: "Go to dashboard" }
    default:
      return { href: "/dashboard/learner", label: "Go to dashboard" }
  }
}

/** Sign-in that comes back to where the user actually was (§13). */
export function signInDestination(pathname?: string | null): Destination {
  const next = pathname && pathname !== "/login" ? pathname : null
  return {
    href: next ? `/login?next=${encodeURIComponent(next)}` : "/login",
    label: "Sign in",
  }
}

/**
 * The list a detail page belongs to.
 *
 * `/dashboard/system-admin/courses/<id>` → `/dashboard/system-admin/courses`,
 * and the same for every other `<section>/<id>` pair, including the trailing
 * `/preview`, `/modules`, `/students` and `/lessons/<id>` sub-routes.
 */
export function parentOf(pathname: string | null | undefined): string | null {
  if (!pathname) return null

  const segments = pathname.split("/").filter(Boolean)
  if (segments.length < 2) return null

  // Walk back to the last segment that looks like a collection rather than an
  // identifier or a leaf view.
  const LEAF = new Set([
    "preview",
    "modules",
    "students",
    "lessons",
    "analytics",
    "instructors",
    "create",
    "edit",
  ])
  const looksLikeId = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ||
    /^\d+$/.test(s)

  const out = [...segments]
  while (out.length > 1) {
    const last = out[out.length - 1]
    if (looksLikeId(last) || LEAF.has(last)) {
      out.pop()
      continue
    }
    break
  }

  const href = "/" + out.join("/")
  return href === pathname ? null : href
}

export function parentDestination(
  pathname: string | null | undefined
): Destination | null {
  const href = parentOf(pathname)
  if (!href) return null

  const name = href.split("/").filter(Boolean).pop() || "list"
  const label = `Back to ${name.replace(/-/g, " ")}`
  return { href, label }
}
