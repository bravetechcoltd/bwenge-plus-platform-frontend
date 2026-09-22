/**
 * ============================================================================
 * Who may enrol (CE-001 §1) — the interface half
 * ============================================================================
 *
 * The mirror of `src/services/learning/enrollmentEligibility.ts` on the server.
 *
 * The server is the rule; this exists so the interface can say the same thing
 * *before* a request is sent, rather than offering an admin a button whose only
 * possible outcome is a 403. Neither side is load-bearing alone: remove this
 * and an administrator gets a confusing refusal after clicking; remove the
 * server check and a crafted request succeeds.
 *
 * Both carry the same message deliberately. An administrator who somehow
 * reaches the API directly should read exactly what the page would have told
 * them.
 */

/** Roles that take courses. Everyone else administers them. */
const ENROLLING_ROLES = new Set(["LEARNER", "INSTRUCTOR", "CONTENT_CREATOR"])

export const ENROLMENT_ROLE_MESSAGE =
  "Course enrolment is available to learners and instructors. " +
  "Administrator accounts manage courses rather than take them."

export interface EnrolmentRoleDecision {
  allowed: boolean
  code: "OK" | "ROLE_NOT_ELIGIBLE" | "UNKNOWN_ROLE"
  message: string
}

/**
 * Whether this role may enrol.
 *
 * An absent or not-yet-loaded role returns `UNKNOWN_ROLE` with `allowed: true`.
 * That is the deliberate choice: "we do not know yet" must not render as
 * "you are refused", which is the mistake that has bitten this codebase before
 * in the dashboard guards. The server refuses if the answer turns out to be
 * no, so an optimistic interface costs a failed request and never grants
 * anything.
 */
export function canRoleEnrol(role: string | null | undefined): EnrolmentRoleDecision {
  const normalised = String(role ?? "").trim().toUpperCase()

  if (!normalised) {
    return { allowed: true, code: "UNKNOWN_ROLE", message: "" }
  }

  if (ENROLLING_ROLES.has(normalised)) {
    return { allowed: true, code: "OK", message: "" }
  }

  return { allowed: false, code: "ROLE_NOT_ELIGIBLE", message: ENROLMENT_ROLE_MESSAGE }
}

/** A short label for the account type, for the warning's heading. */
export function roleLabel(role: string | null | undefined): string {
  const normalised = String(role ?? "").trim().toUpperCase()
  if (normalised === "SYSTEM_ADMIN") return "System Administrator"
  if (normalised === "INSTITUTION_ADMIN") return "Institution Administrator"
  return normalised
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ")
}
