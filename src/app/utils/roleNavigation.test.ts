import { describe, it, expect } from "vitest"
import {
  canAccessPath,
  dashboardForRole,
  isRoleOwnedPath,
  normaliseRole,
  resolveDashboardRedirect,
} from "./roleNavigation"

/**
 * ============================================================================
 * Post-login routing (AUTH-NAV-001)
 * ============================================================================
 *
 *   npm test
 *
 * These assert the three states that were being conflated, because conflating
 * them is the whole bug:
 *
 *   "we do not know the role yet"   → WAIT
 *   "the role has no dashboard"     → NO_DASHBOARD
 *   "the role is LEARNER"           → the learner dashboard
 *
 * The old code answered the first two with the third.
 */

describe("an unresolved role is not a learner", () => {
  it("waits when the role has not arrived yet", () => {
    // The frame that broke everything: the user object is there, the role is
    // not, and the guard used to conclude "learner" and redirect.
    expect(resolveDashboardRedirect("/dashboard/institution-admin", undefined)).toEqual({
      action: "WAIT",
    })
    expect(resolveDashboardRedirect("/dashboard/institution-admin", "")).toEqual({
      action: "WAIT",
    })
    expect(resolveDashboardRedirect("/dashboard/institution-admin", null)).toEqual({
      action: "WAIT",
    })
  })

  it("does not send an admin to the learner dashboard while the role loads", () => {
    const decision = resolveDashboardRedirect("/dashboard/institution-admin", "")
    expect(decision.action).not.toBe("REDIRECT")
  })

  it("reports a settled session with no usable role as exactly that", () => {
    expect(
      resolveDashboardRedirect("/dashboard/learner", "", { roleResolved: true })
    ).toEqual({ action: "NO_DASHBOARD" })
    expect(
      resolveDashboardRedirect("/dashboard/learner", "SOMETHING_ELSE", {
        roleResolved: true,
      })
    ).toEqual({ action: "NO_DASHBOARD" })
  })

  it("never resolves an unknown role to a path", () => {
    expect(dashboardForRole("")).toBeNull()
    expect(dashboardForRole(undefined)).toBeNull()
    expect(dashboardForRole("NOT_A_ROLE")).toBeNull()
    expect(normaliseRole("")).toBeNull()
  })
})

describe("each role lands on its own dashboard", () => {
  const cases: Array<[string, string]> = [
    ["LEARNER", "/dashboard/learner"],
    ["INSTRUCTOR", "/dashboard/instructor"],
    ["INSTITUTION_ADMIN", "/dashboard/institution-admin"],
    ["SYSTEM_ADMIN", "/dashboard/system-admin"],
    ["CONTENT_CREATOR", "/dashboard/content-creator"],
    // Legacy role still present on older accounts.
    ["ADMIN", "/dashboard/system-admin"],
  ]

  for (const [role, home] of cases) {
    it(`${role} → ${home}`, () => {
      expect(dashboardForRole(role)).toBe(home)
      expect(resolveDashboardRedirect("/dashboard", role)).toEqual({
        action: "REDIRECT",
        path: home,
        reason: "ROOT",
      })
    })

    it(`${role} stays put once it is on ${home}`, () => {
      // The assertion that proves the loader cannot latch: the same pure call
      // that asked for the redirect says STAY on arrival.
      expect(resolveDashboardRedirect(home, role)).toEqual({ action: "STAY" })
      expect(resolveDashboardRedirect(`${home}/performance`, role)).toEqual({
        action: "STAY",
      })
    })
  }

  it("accepts a role in any casing the API might send", () => {
    expect(dashboardForRole("institution_admin")).toBe("/dashboard/institution-admin")
    expect(dashboardForRole("  LEARNER  ")).toBe("/dashboard/learner")
  })
})

describe("a cross-role visit is corrected, not compounded", () => {
  it("sends a learner off the institution dashboard to their own", () => {
    expect(
      resolveDashboardRedirect("/dashboard/institution-admin", "LEARNER")
    ).toEqual({
      action: "REDIRECT",
      path: "/dashboard/learner",
      reason: "WRONG_ROLE",
    })
  })

  it("does not carry the sub-path across roles", () => {
    // The old guard built `/dashboard/learner/students` from
    // `/dashboard/institution-admin/students` — a route that does not exist,
    // so the redirect landed on a 404.
    const decision = resolveDashboardRedirect(
      "/dashboard/institution-admin/students",
      "LEARNER"
    )
    expect(decision).toEqual({
      action: "REDIRECT",
      path: "/dashboard/learner",
      reason: "WRONG_ROLE",
    })
  })

  it("leaves shared dashboard pages alone", () => {
    // Not owned by any role, so nobody is bounced off it.
    expect(isRoleOwnedPath("/dashboard/settings")).toBe(false)
    expect(resolveDashboardRedirect("/dashboard/settings", "LEARNER")).toEqual({
      action: "STAY",
    })
  })

  it("does not mistake a prefix for a match", () => {
    // `/dashboard/learners` is not `/dashboard/learner`.
    expect(isRoleOwnedPath("/dashboard/learner")).toBe(true)
    expect(isRoleOwnedPath("/dashboard/learner/courses")).toBe(true)
    expect(isRoleOwnedPath("/dashboard/learnerships")).toBe(false)
  })

  it("keeps each role out of every other role's dashboard", () => {
    const homes = [
      ["LEARNER", "/dashboard/learner"],
      ["INSTRUCTOR", "/dashboard/instructor"],
      ["INSTITUTION_ADMIN", "/dashboard/institution-admin"],
      ["SYSTEM_ADMIN", "/dashboard/system-admin"],
    ] as const

    for (const [role, home] of homes) {
      for (const [, otherHome] of homes) {
        if (home === otherHome) continue
        expect(canAccessPath(role, otherHome)).toBe(false)
        expect(resolveDashboardRedirect(otherHome, role)).toEqual({
          action: "REDIRECT",
          path: home,
          reason: "WRONG_ROLE",
        })
      }
    }
  })
})

describe("the redirect settles", () => {
  it("a redirect target immediately resolves to STAY", () => {
    // Follow the decision the way the router does, and assert it terminates.
    // A pair that never reached STAY would be an infinite loop in the guard.
    const roles = ["LEARNER", "INSTRUCTOR", "INSTITUTION_ADMIN", "SYSTEM_ADMIN", "ADMIN"]
    const starts = [
      "/dashboard",
      "/dashboard/",
      "/dashboard/learner",
      "/dashboard/instructor",
      "/dashboard/institution-admin",
      "/dashboard/system-admin",
      "/dashboard/institution-admin/students",
    ]

    for (const role of roles) {
      for (const start of starts) {
        let path = start
        let hops = 0
        let decision = resolveDashboardRedirect(path, role)
        while (decision.action === "REDIRECT") {
          path = decision.path
          decision = resolveDashboardRedirect(path, role)
          hops++
          expect(hops).toBeLessThanOrEqual(2)
        }
        expect(decision.action).toBe("STAY")
      }
    }
  })
})

describe("an instructor is never routed to the institution dashboard", () => {
  it("sends an instructor to their own dashboard from the institution one", () => {
    // The reported bug: signing in as an instructor landed on
    // /dashboard/institution-admin. The cause was upstream — a stale
    // `institution_role` cookie surviving the previous session — but the guard
    // must correct it regardless of how they got there.
    expect(
      resolveDashboardRedirect("/dashboard/institution-admin", "INSTRUCTOR")
    ).toEqual({
      action: "REDIRECT",
      path: "/dashboard/instructor",
      reason: "WRONG_ROLE",
    })
  })

  it("keeps an instructor on any page of their own dashboard", () => {
    for (const path of [
      "/dashboard/instructor",
      "/dashboard/instructor/performance",
      "/dashboard/instructor/courses/assigned",
    ]) {
      expect(resolveDashboardRedirect(path, "INSTRUCTOR")).toEqual({ action: "STAY" })
    }
  })

  it("is decided by bwenge_role alone, whatever an institution field says", () => {
    // `institution_role` is not an input here, and must never become one: an
    // instructor who belongs to an institution is still an instructor.
    expect(dashboardForRole("INSTRUCTOR")).toBe("/dashboard/instructor")
    expect(canAccessPath("INSTRUCTOR", "/dashboard/institution-admin")).toBe(false)
  })
})

describe("the guard never fails open", () => {
  it("waits rather than allowing when the path is not known yet", () => {
    // `usePathname()` can be null mid-transition. The guard passed `?? ""`,
    // which reached `isRoleOwnedPath("")` — false — and therefore STAY, so any
    // dashboard rendered for any role. This is how an institution admin saw
    // the instructor dashboard inside institution chrome.
    for (const path of ["", null as any, undefined as any, "dashboard/instructor"]) {
      expect(resolveDashboardRedirect(path, "INSTITUTION_ADMIN")).toEqual({
        action: "WAIT",
      })
    }
  })

  it("still corrects a known cross-role path", () => {
    expect(
      resolveDashboardRedirect("/dashboard/instructor", "INSTITUTION_ADMIN")
    ).toEqual({
      action: "REDIRECT",
      path: "/dashboard/institution-admin",
      reason: "WRONG_ROLE",
    })
  })
})

describe("one role, or none", () => {
  it("an instructor reaches the instructor dashboard from anywhere", () => {
    // The permanent guarantee: whatever path an instructor arrives on, the
    // resolver sends them to exactly one place and then leaves them there.
    const elsewhere = [
      "/dashboard",
      "/dashboard/institution-admin",
      "/dashboard/institution-admin/course-learners",
      "/dashboard/system-admin",
      "/dashboard/learner/performance",
    ]
    for (const path of elsewhere) {
      const first = resolveDashboardRedirect(path, "INSTRUCTOR")
      expect(first.action).toBe("REDIRECT")
      if (first.action !== "REDIRECT") continue
      expect(first.path).toBe("/dashboard/instructor")
      // And it settles immediately — no second opinion, no bounce.
      expect(resolveDashboardRedirect(first.path, "INSTRUCTOR")).toEqual({
        action: "STAY",
      })
    }
  })

  it("routes on bwenge_role alone, never on an institution field", () => {
    // An instructor who belongs to an institution is an instructor. The
    // institution fields describe where they teach, not what they are.
    expect(dashboardForRole("INSTRUCTOR")).toBe("/dashboard/instructor")
    expect(canAccessPath("INSTRUCTOR", "/dashboard/institution-admin")).toBe(false)
    expect(canAccessPath("INSTITUTION_ADMIN", "/dashboard/instructor")).toBe(false)
  })
})
