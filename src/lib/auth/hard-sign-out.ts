import Cookies from "js-cookie"

/**
 * ============================================================================
 * Hard sign-out (AUTH-NAV-002)
 * ============================================================================
 *
 * Remove every trace of a session from this browser.
 *
 * ── Why a sweep, and not a list ────────────────────────────────────────────
 *
 * The normal logout removes the keys it knows about. That is correct for a
 * deliberate sign-out, where the session being cleared is the one that was
 * written. It is not sufficient for the case this exists for: a session that
 * has become *incoherent* — most often because two logins overlapped and the
 * second inherited part of the first.
 *
 * That was a real defect. `persistAuthData` wrote the institution cookies only
 * when the incoming user had them, so an instructor signing in after an
 * institution admin kept the admin's institution and `institution_role`, and
 * was routed to the institution dashboard. The write path is fixed, but a
 * browser that already holds a mixed session needs a way out that does not
 * depend on knowing which keys were poisoned.
 *
 * So this sweeps by prefix as well as by name: anything belonging to this
 * platform goes, whoever wrote it and whenever.
 *
 * It never throws. It is called on the failure path, and a storage error must
 * not prevent the redirect to sign-in that follows it.
 */

/** Keys written by the auth slice and the auth context. */
const KNOWN_COOKIES = [
  "bwenge_token",
  "bwenge_user",
  "bwenge_institution",
  "bwenge_primary_institution_id",
  "bwenge_institution_role",
]

/**
 * Any key starting with one of these belongs to us.
 *
 * Taken from what a real signed-in browser actually holds, not from what the
 * login code was believed to write. The last four were all present after a
 * login and all survived a sign-out: `persist:` is redux-persist's store,
 * which carries the token; `activeportal` and `course_creation` are
 * per-session working state that the next person to use the browser would
 * otherwise inherit.
 */
const OWNED_PREFIXES = [
  "bwenge",
  "bwengeplus",
  "ongera",
  "cross_system",
  "last_system",
  "last_protection",
  "persist:",
  "activeportal",
  "course_creation",
]

function ownsKey(key: string): boolean {
  const k = key.toLowerCase()
  return OWNED_PREFIXES.some((prefix) => k.startsWith(prefix))
}

export function hardSignOut(): void {
  // ── Cookies ──────────────────────────────────────────────────────────────
  try {
    for (const name of KNOWN_COOKIES) Cookies.remove(name)

    // Sweep anything else of ours, including keys an older build wrote under a
    // name this one no longer knows.
    const all = Cookies.get() ?? {}
    for (const name of Object.keys(all)) {
      if (ownsKey(name)) Cookies.remove(name)
    }

    // `js-cookie` removes at the current path only. A cookie written at "/"
    // from a nested route survives that, and a surviving token is the whole
    // problem, so the root path is cleared explicitly too.
    for (const name of Object.keys(all)) {
      if (ownsKey(name)) Cookies.remove(name, { path: "/" })
    }
  } catch {
    // Nothing actionable: continue to the storage sweep.
  }

  // ── localStorage and sessionStorage ──────────────────────────────────────
  /*
   * Each accessor is read inside its own try, not in the array literal.
   *
   * `window.localStorage` is a getter, and it *throws* rather than returning
   * null when a browser has storage blocked — private mode, or site data
   * turned off. Reading it while building the list put that throw outside
   * every catch here, so this function raised on exactly the browsers it was
   * written to rescue, and the caller's redirect to sign-in never ran.
   */
  const stores: (() => Storage | null)[] = [
    () => (typeof window !== "undefined" ? window.localStorage : null),
    () => (typeof window !== "undefined" ? window.sessionStorage : null),
  ]

  for (const openStore of stores) {
    try {
      const store = openStore()
      if (!store) continue
      // Collected first: removing while iterating shifts the indices.
      const doomed: string[] = []
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i)
        if (key && ownsKey(key)) doomed.push(key)
      }
      // Two unprefixed keys the auth slice also writes.
      for (const extra of ["user", "token"]) {
        if (store.getItem(extra) !== null) doomed.push(extra)
      }
      for (const key of doomed) store.removeItem(key)
    } catch {
      // Storage unavailable — private mode, or blocked. Cookies are gone,
      // which is what carries the token.
    }
  }
}
