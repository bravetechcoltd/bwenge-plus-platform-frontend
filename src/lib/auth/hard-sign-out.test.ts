import { describe, it, expect, beforeEach, vi } from "vitest"

/**
 * AUTH-NAV-003.
 *
 * The key list below is not invented — it is what a real signed-in browser was
 * observed holding in localStorage. Four of them (`activePortalInstitutionId`
 * and the three `course_creation_*`) were on no logout list and survived every
 * sign-out, so the next person to open the browser inherited the previous
 * user's institution and draft. `persist:root` holds the token.
 *
 * The test asserts the whole set goes, so adding a key to the app without
 * adding it to the sweep fails here rather than in someone's browser.
 */

const removed: string[] = []
vi.mock("js-cookie", () => ({
  default: {
    get: () => ({
      bwenge_token: "t",
      bwenge_user: "u",
      bwenge_institution: "i",
      bwenge_primary_institution_id: "p",
      bwenge_institution_role: "r",
      // Not ours: a consent banner, an analytics id. Must be left alone.
      cookie_consent: "yes",
      _ga: "GA1.1",
    }),
    remove: (name: string) => removed.push(name),
  },
}))

/** Exactly what the screenshot showed after a login. */
const OBSERVED_KEYS = [
  "activePortalInstitutionId",
  "bwenge_protection_active",
  "bwengeplus_institution",
  "bwengeplus_institution_role",
  "bwengeplus_primary_institution_id",
  "bwengeplus_token",
  "bwengeplus_user",
  "course_creation_data",
  "course_creation_modules",
  "course_creation_step",
  "cross_system_context",
  "last_protection_sync",
  "last_system_login",
  "ongera_cross_system_context",
  "ongera_last_sync",
  "ongera_protection_active",
  "persist:root",
]

/** Written by other things on the same origin. A sign-out is not a wipe. */
const FOREIGN_KEYS = ["theme", "cookie_consent", "sidebar_collapsed"]

describe("hard sign-out", () => {
  beforeEach(() => {
    removed.length = 0
    localStorage.clear()
    sessionStorage.clear()
    for (const k of [...OBSERVED_KEYS, ...FOREIGN_KEYS]) localStorage.setItem(k, "x")
  })

  it("clears every key a signed-in browser was seen holding", async () => {
    const { hardSignOut } = await import("./hard-sign-out")
    hardSignOut()

    const survivors = OBSERVED_KEYS.filter((k) => localStorage.getItem(k) !== null)
    expect(survivors).toEqual([])
  })

  it("leaves keys that are not ours alone", async () => {
    const { hardSignOut } = await import("./hard-sign-out")
    hardSignOut()

    for (const k of FOREIGN_KEYS) {
      expect(localStorage.getItem(k)).toBe("x")
    }
  })

  it("clears the redux-persist store, which carries the token", async () => {
    const { hardSignOut } = await import("./hard-sign-out")
    localStorage.setItem("persist:root", JSON.stringify({ bwengeAuth: '{"token":"secret"}' }))
    hardSignOut()
    expect(localStorage.getItem("persist:root")).toBeNull()
  })

  it("clears sessionStorage too", async () => {
    const { hardSignOut } = await import("./hard-sign-out")
    sessionStorage.setItem("bwengeplus_token", "t")
    sessionStorage.setItem("theme", "dark")
    hardSignOut()
    expect(sessionStorage.getItem("bwengeplus_token")).toBeNull()
    expect(sessionStorage.getItem("theme")).toBe("dark")
  })

  it("removes our cookies at the root path, and not other people's", async () => {
    const { hardSignOut } = await import("./hard-sign-out")
    hardSignOut()

    expect(removed).toContain("bwenge_token")
    // js-cookie removes at the current path only; a cookie written at "/" from
    // a nested route survives that, and a surviving token is the whole problem.
    expect(removed.filter((n) => n === "bwenge_token").length).toBeGreaterThan(1)
    expect(removed).not.toContain("cookie_consent")
    expect(removed).not.toContain("_ga")
  })

  it("does not throw when storage is unavailable", async () => {
    const { hardSignOut } = await import("./hard-sign-out")
    const original = Object.getOwnPropertyDescriptor(window, "localStorage")
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked")
      },
    })

    // It runs on the failure path; a storage error must not stop the redirect
    // to sign-in that follows it.
    expect(() => hardSignOut()).not.toThrow()

    if (original) Object.defineProperty(window, "localStorage", original)
  })
})
