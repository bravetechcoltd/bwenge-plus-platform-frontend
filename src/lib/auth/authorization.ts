import type { SessionUser } from "./session"

/**
 * The one authorization rule set (AXM-CONS-001 §6.2 — findings A-06 to A-10).
 *
 * The audit found six different client-side predicates for "is this user an
 * administrator of this institution", no two of which agreed, plus a seventh
 * on the server. Two of them ignored the institution entirely, so an
 * administrator of institution A rendered institution B's pages (A-07). One
 * required `primary_institution_id` to match exactly, which permanently denied
 * a SYSTEM_ADMIN and an administrator recorded only in `institution_members` —
 * five of sixteen memberships platform-wide (A-08).
 *
 * What follows is the *union* of every rule the system already honours, so
 * adopting it can only restore access to users who hold it — never grant new
 * access to anyone. And it is only ever an optimistic client-side render
 * decision: every protected endpoint still runs its own guard, and
 * `resolveInstitutionAccess` on the server is the authority (§11).
 *
 * Pure functions, no React. `use-access.ts` is the hook that adds the server's
 * membership answer to them.
 */

export type BwengeRoleName =
  | "SYSTEM_ADMIN"
  | "INSTITUTION_ADMIN"
  | "CONTENT_CREATOR"
  | "INSTRUCTOR"
  | "LEARNER"

export type AccessDenialReason =
  | "unauthenticated"
  | "not-a-member"
  | "insufficient-role"
  | "wrong-institution"

export type AccessDecision =
  | { state: "resolving" }
  | { state: "granted" }
  | { state: "denied"; reason: AccessDenialReason }

export const GRANTED: AccessDecision = { state: "granted" }
export const RESOLVING: AccessDecision = { state: "resolving" }

export function denied(reason: AccessDenialReason): AccessDecision {
  return { state: "denied", reason }
}

/**
 * The server's answer for one institution, as returned by
 * `GET /api/institutions/:id/my-access`. Absent until it arrives, which is a
 * `resolving` state and never a denial.
 */
export interface InstitutionAccessSnapshot {
  isMember: boolean
  membershipRole: string | null
  isAdmin: boolean
  canManageCourses: boolean
  canManageMembers: boolean
  canViewAnalytics: boolean
  viaSystemAdmin: boolean
  source: "system-admin" | "membership" | "user-columns" | "none"
}

// ── Identity ────────────────────────────────────────────────────────────────

export function roleOf(user: SessionUser | null): BwengeRoleName | null {
  const raw = user?.bwenge_role
  return raw ? (String(raw).toUpperCase() as BwengeRoleName) : null
}

export function isSystemAdmin(user: SessionUser | null): boolean {
  return roleOf(user) === "SYSTEM_ADMIN"
}

export function isInstructor(user: SessionUser | null): boolean {
  return roleOf(user) === "INSTRUCTOR"
}

export function isLearner(user: SessionUser | null): boolean {
  return roleOf(user) === "LEARNER"
}

export function hasRole(
  user: SessionUser | null,
  ...roles: BwengeRoleName[]
): boolean {
  const role = roleOf(user)
  return !!role && roles.includes(role)
}

// ── Institution membership ──────────────────────────────────────────────────

/**
 * `institution_ids` is a TypeORM `simple-array`. Through the ORM it is an
 * array; through a raw query or a round-trip via a cookie it can arrive as a
 * comma-separated string. Both are accepted rather than one of them silently
 * evaluating to "no institutions".
 */
export function institutionIdsOf(user: SessionUser | null): string[] {
  const raw = user?.institution_ids
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String)
  if (typeof raw === "string" && raw.length > 0) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export function belongsToInstitution(
  user: SessionUser | null,
  institutionId: string | null | undefined
): boolean {
  if (!user || !institutionId) return false
  if (user.primary_institution_id === institutionId) return true
  if (institutionIdsOf(user).includes(institutionId)) return true
  if (user.institution?.id === institutionId) return true
  return false
}

/**
 * Administration of one institution, from the client's own knowledge.
 *
 * `snapshot` is the server's answer when it has arrived; it is authoritative
 * and checked first, because it is the only source that can see
 * `institution_members`.
 */
export function canAdministerInstitution(
  user: SessionUser | null,
  institutionId: string | null | undefined,
  snapshot?: InstitutionAccessSnapshot | null
): boolean {
  if (!user || !institutionId) return false
  if (snapshot) return snapshot.isAdmin

  if (isSystemAdmin(user)) return true

  const belongs = belongsToInstitution(user, institutionId)
  if (!belongs) return false

  if (roleOf(user) === "INSTITUTION_ADMIN") return true
  if (String(user.institution_role ?? "").toUpperCase() === "ADMIN") return true

  return false
}

export function canManageInstitutionCourses(
  user: SessionUser | null,
  institutionId: string | null | undefined,
  snapshot?: InstitutionAccessSnapshot | null
): boolean {
  if (snapshot) return snapshot.canManageCourses
  if (canAdministerInstitution(user, institutionId)) return true

  // A content creator inside the institution creates its courses. This mirrors
  // `resolveInstitutionAccess`, which grants the same through the membership
  // role and the per-member `can_create_courses` grant.
  return (
    roleOf(user) === "CONTENT_CREATOR" &&
    belongsToInstitution(user, institutionId)
  )
}

export function canManageInstitutionMembers(
  user: SessionUser | null,
  institutionId: string | null | undefined,
  snapshot?: InstitutionAccessSnapshot | null
): boolean {
  if (snapshot) return snapshot.canManageMembers
  return canAdministerInstitution(user, institutionId)
}

export function canViewInstitutionAnalytics(
  user: SessionUser | null,
  institutionId: string | null | undefined,
  snapshot?: InstitutionAccessSnapshot | null
): boolean {
  if (snapshot) return snapshot.canViewAnalytics
  return canAdministerInstitution(user, institutionId)
}

export function isInstitutionMember(
  user: SessionUser | null,
  institutionId: string | null | undefined,
  snapshot?: InstitutionAccessSnapshot | null
): boolean {
  if (snapshot) return snapshot.isMember
  if (isSystemAdmin(user)) return true
  return belongsToInstitution(user, institutionId)
}

// ── Courses ─────────────────────────────────────────────────────────────────

export interface CourseLike {
  id?: string
  status?: string | null
  instructor_id?: string | null
  institution_id?: string | null
  created_by_institution_admin_id?: string | null
  instructor?: { id?: string } | null
  institution?: { id?: string } | null
}

/** Mirrors the server's `isPrivilegedForCourse`. */
export function isPrivilegedForCourse(
  user: SessionUser | null,
  course: CourseLike | null | undefined
): boolean {
  if (!user || !course) return false
  if (isSystemAdmin(user)) return true

  const userId = user.id
  if (userId && course.instructor_id === userId) return true
  if (userId && course.instructor?.id === userId) return true
  if (userId && course.created_by_institution_admin_id === userId) return true

  const institutionId = course.institution_id ?? course.institution?.id ?? null
  return canAdministerInstitution(user, institutionId)
}

/**
 * Mirrors the server's `requireCourseRead`: privileged at any status,
 * everyone else at PUBLISHED. The client cannot see enrolments, so an enrolled
 * learner viewing an archived course is left to the server — which allows it,
 * and this returning `false` would only ever hide a page the API would serve.
 * Callers that render a course use `CourseResource`, which trusts the server.
 */
export function canReadCourse(
  user: SessionUser | null,
  course: CourseLike | null | undefined
): boolean {
  if (!user || !course) return false
  if (isPrivilegedForCourse(user, course)) return true
  return String(course.status ?? "").toUpperCase() === "PUBLISHED"
}

// ── Decisions ───────────────────────────────────────────────────────────────

/**
 * Turn a boolean predicate into a decision that names *why* it failed, so the
 * error surface can offer the right recovery: sign in, go to my own
 * institution, or go home.
 */
export function decideInstitutionAccess(
  user: SessionUser | null,
  institutionId: string | null | undefined,
  granted: boolean
): AccessDecision {
  if (granted) return GRANTED
  if (!user) return denied("unauthenticated")
  if (!institutionId) return denied("not-a-member")
  if (!belongsToInstitution(user, institutionId) && !isSystemAdmin(user)) {
    // They hold an institution, just not this one — worth saying so, because
    // the recovery is "go to yours", not "you have no access at all".
    return denied(
      user.primary_institution_id || institutionIdsOf(user).length
        ? "wrong-institution"
        : "not-a-member"
    )
  }
  return denied("insufficient-role")
}
