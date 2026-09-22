import { describe, it, expect } from "vitest"
import { canRoleEnrol, roleLabel, ENROLMENT_ROLE_MESSAGE } from "./role-eligibility"

/**
 * CE-001 §1.
 *
 * The rule the interface uses to decide whether to offer enrolment at all.
 * It has to agree with `src/services/learning/enrollmentEligibility.ts` on the
 * server, and it has to be careful about the difference between "no" and
 * "not yet known".
 */
describe("who may enrol", () => {
  it("allows the roles that take courses", () => {
    expect(canRoleEnrol("LEARNER").allowed).toBe(true)
    expect(canRoleEnrol("INSTRUCTOR").allowed).toBe(true)
    expect(canRoleEnrol("CONTENT_CREATOR").allowed).toBe(true)
  })

  it("refuses the roles that administer them", () => {
    for (const role of ["SYSTEM_ADMIN", "INSTITUTION_ADMIN"]) {
      const decision = canRoleEnrol(role)
      expect(decision.allowed).toBe(false)
      expect(decision.code).toBe("ROLE_NOT_ELIGIBLE")
      expect(decision.message).toBe(ENROLMENT_ROLE_MESSAGE)
    }
  })

  it("says the same thing the server says", () => {
    // Copied from the server's refusal. If one side is reworded without the
    // other, an administrator reaching the API directly reads something
    // different from what the page told them.
    expect(ENROLMENT_ROLE_MESSAGE).toBe(
      "Course enrolment is available to learners and instructors. " +
        "Administrator accounts manage courses rather than take them."
    )
  })

  it("treats an unresolved role as unknown, not as refused", () => {
    // The role arrives a render or two after the page does. Refusing during
    // that window would show an administrator's warning to a learner, which is
    // the same "I do not know yet, so I will decide anyway" mistake the
    // dashboard guards had.
    for (const value of [null, undefined, "", "   "]) {
      const decision = canRoleEnrol(value)
      expect(decision.allowed).toBe(true)
      expect(decision.code).toBe("UNKNOWN_ROLE")
    }
  })

  it("is not fooled by casing or surrounding space", () => {
    expect(canRoleEnrol(" system_admin ").allowed).toBe(false)
    expect(canRoleEnrol("Institution_Admin").allowed).toBe(false)
    expect(canRoleEnrol("learner").allowed).toBe(true)
  })

  it("does not silently allow a role nobody has heard of", () => {
    // An unrecognised non-empty role is a refusal, not a pass: a role that
    // exists but is not on the list has not been decided to be a learner.
    expect(canRoleEnrol("AUDITOR").allowed).toBe(false)
  })

  it("names the account type for the warning", () => {
    expect(roleLabel("SYSTEM_ADMIN")).toBe("System Administrator")
    expect(roleLabel("INSTITUTION_ADMIN")).toBe("Institution Administrator")
    expect(roleLabel("CONTENT_CREATOR")).toBe("Content Creator")
  })
})
