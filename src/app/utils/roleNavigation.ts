/**
 * ============================================================================
 * Where a signed-in user belongs (AUTH-NAV-001)
 * ============================================================================
 *
 * One role → one dashboard, decided here and nowhere else.
 *
 * ── The bug this file now prevents ─────────────────────────────────────────
 *
 * `getRoleDashboardPath` used to answer `'/dashboard/learner'` for *any* input
 * it did not recognise — including the empty string. Four copies of it existed
 * (this one, `dashboard/layout.tsx`, `courses/[id]/page.tsx` and
 * `institutions/[slug]/courses/page.tsx`), and the one the dashboard guard
 * used was its own local copy.
 *
 * That default is the whole defect. An authenticated user's object can arrive
 * a render before `bwenge_role` is populated, and in that frame the guard
 * asked "where does role `''` belong?", was told "the learner dashboard", saw
 * that an institution admin was not on it, and redirected them there. An
 * unresolved role is not a learner. It is an unresolved role, and the only
 * correct action is to wait.
 *
 * So `resolveDashboardRedirect` returns one of four answers — WAIT, STAY,
 * REDIRECT or NO_DASHBOARD — and never confuses the first with the last.
 */

export const DASHBOARD_ROOT = "/dashboard"

/** Every role that has a dashboard of its own. */
const ROLE_DASHBOARDS: Record<string, string> = {
  SYSTEM_ADMIN: "/dashboard/system-admin",
  INSTITUTION_ADMIN: "/dashboard/institution-admin",
  CONTENT_CREATOR: "/dashboard/content-creator",
  INSTRUCTOR: "/dashboard/instructor",
  LEARNER: "/dashboard/learner",
  // Legacy, retained: older accounts still carry it.
  ADMIN: "/dashboard/system-admin",
}

/** The role-owned path prefixes, for deciding whether a user is in the wrong place. */
const ROLE_PATHS: Record<string, string[]> = {
  SYSTEM_ADMIN: ["/dashboard/system-admin", "/dashboard/admin"],
  INSTITUTION_ADMIN: ["/dashboard/institution-admin"],
  CONTENT_CREATOR: ["/dashboard/content-creator"],
  INSTRUCTOR: ["/dashboard/instructor"],
  LEARNER: ["/dashboard/learner", "/dashboard/user"],
  ADMIN: ["/dashboard/system-admin", "/dashboard/admin"],
}

/** Every prefix owned by some role — used to spot a cross-role visit. */
const ALL_ROLE_PATHS = Array.from(new Set(Object.values(ROLE_PATHS).flat()))

/** Normalises whatever the API or storage handed us into a known role, or null. */
export function normaliseRole(role: unknown): string | null {
  if (typeof role !== "string") return null
  const upper = role.trim().toUpperCase()
  return upper && ROLE_DASHBOARDS[upper] ? upper : null
}

/**
 * The dashboard for a role.
 *
 * Returns `null` for an unknown or missing role rather than guessing, so a
 * caller has to decide what to do about it. The old silent fallback to the
 * learner dashboard is what sent institution admins to the wrong page.
 */
export function dashboardForRole(role: unknown): string | null {
  const known = normaliseRole(role)
  return known ? ROLE_DASHBOARDS[known] : null
}

/**
 * Backwards-compatible wrapper for callers that genuinely want a path and can
 * live with the learner default — link targets, mostly, where being wrong is
 * cosmetic. Never use this to *redirect* someone.
 */
export const getRoleDashboardPath = (role: string): string =>
  dashboardForRole(role) ?? ROLE_DASHBOARDS.LEARNER

/**
 * Where "back to my learning" goes, which is not the same as "my dashboard".
 *
 * A learner leaving a course page wants their course list, not the dashboard
 * root; every other role wants their dashboard. Two pages had each written
 * their own copy of this — same intent, same values, no shared definition —
 * so it lives here now. The behaviour is unchanged: this is the duplication
 * removed, not the destination.
 */
export function learningHomeForRole(role: unknown): string {
  const known = normaliseRole(role)
  if (!known || known === "LEARNER") return "/dashboard/learner/learning/courses"
  return ROLE_DASHBOARDS[known]
}

export const getRoleDisplayName = (role: string): string => {
  const displayMap: Record<string, string> = {
    SYSTEM_ADMIN: "System Administrator",
    INSTITUTION_ADMIN: "Institution Administrator",
    CONTENT_CREATOR: "Content Creator",
    INSTRUCTOR: "Instructor",
    LEARNER: "Learner",
    ADMIN: "Administrator",
  }
  return displayMap[normaliseRole(role) ?? ""] ?? "User"
}

/** Whether this role owns this path. */
export const canAccessPath = (userRole: string, path: string): boolean => {
  const known = normaliseRole(userRole)
  if (!known) return false
  return (ROLE_PATHS[known] ?? []).some((allowed) => path.startsWith(allowed))
}

/** Whether any role owns this path — i.e. it is a role dashboard, not a shared page. */
export function isRoleOwnedPath(path: string): boolean {
  return ALL_ROLE_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
}

export type DashboardRedirect =
  /** The role is not known yet. Show a loader; do not move anyone. */
  | { action: "WAIT" }
  /** They are where they belong. Render the page. */
  | { action: "STAY" }
  /** Send them here. */
  | { action: "REDIRECT"; path: string; reason: "ROOT" | "WRONG_ROLE" }
  /** Authenticated, but their role has no dashboard. Say so; do not loop. */
  | { action: "NO_DASHBOARD" }

/**
 * The single routing decision, for one user on one path.
 *
 * Pure, so the guard that uses it holds no state of its own — which is what
 * stops a stuck "Redirecting…" screen: there is nothing to get stuck. Each
 * render re-derives the answer from the path and the role.
 *
 * A cross-role visit sends the user to the *root* of their own dashboard, not
 * to the same sub-path under a different role. `/dashboard/institution-admin/
 * students` does not become `/dashboard/learner/students`, which is a route
 * that does not exist and was landing people on a 404 after the redirect.
 */
export function resolveDashboardRedirect(
  currentPath: string,
  role: unknown,
  opts: { roleResolved?: boolean } = {}
): DashboardRedirect {
  // No path yet — `usePathname()` can be null mid-transition. An unknown path
  // is not a permitted one: falling through would reach the `isRoleOwnedPath`
  // test below, which answers false for "" and therefore STAY, letting any
  // dashboard render for any role. A guard must never fail open.
  if (!currentPath || !currentPath.startsWith("/")) return { action: "WAIT" }

  const known = normaliseRole(role)

  if (!known) {
    // A user object without a usable role: either it has not finished loading
    // (wait) or the account genuinely has no dashboard (say so). The caller
    // knows which, because it knows whether the session has settled.
    return opts.roleResolved === true ? { action: "NO_DASHBOARD" } : { action: "WAIT" }
  }

  const home = ROLE_DASHBOARDS[known]

  // `/dashboard` itself is a signpost, not a page.
  if (currentPath === DASHBOARD_ROOT || currentPath === `${DASHBOARD_ROOT}/`) {
    return { action: "REDIRECT", path: home, reason: "ROOT" }
  }

  // Anything that is not a role dashboard — a shared settings page, say — is
  // left alone. Only cross-role visits are corrected.
  if (!isRoleOwnedPath(currentPath)) return { action: "STAY" }

  if (canAccessPath(known, currentPath)) return { action: "STAY" }

  return { action: "REDIRECT", path: home, reason: "WRONG_ROLE" }
}
