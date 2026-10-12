import type Cookies from "js-cookie"

/**
 * One definition of how an auth cookie is written (AUTH-COOKIE-001).
 *
 * ── The inconsistency this removes ─────────────────────────────────────────
 *
 * There were two rules in the codebase, and the login used the broken one.
 *
 *   `use-auth.tsx`   secure: window.location.protocol === "https:"
 *   `auth-slice.ts`  secure: process.env.NODE_ENV === "production"
 *   `GoogleOneTap`   secure: process.env.NODE_ENV === "production"
 *
 * `NODE_ENV` describes how the bundle was *built*, not how it is *served*. A
 * production build served over http — a staging host, an IP address, a LAN
 * box, a container behind a plain-http proxy — therefore wrote
 * `Secure` cookies to a non-secure origin, and the browser **silently
 * discards** those. No error, no warning: the cookie simply is not there on
 * the next read.
 *
 * `use-auth.tsx` already carried a comment describing this exact failure and
 * derived the flag from the live protocol to avoid it. The auth slice did not
 * — and the login runs through the slice, so the one path that must not lose
 * the cookie was the one that could.
 *
 * ── Why that logs someone out ──────────────────────────────────────────────
 *
 * `lib/api.ts` reads `Cookies.get("bwenge_token")` on every request and sets
 * the `Authorization` header from it. No cookie means no header, which the
 * backend answers 401, and the response interceptor treats a 401 as an
 * expired session: it clears cookies and redirects to `/login`. The result is
 * a login that appears to succeed and then signs itself out.
 *
 * Deriving the flag from `window.location.protocol` keeps HTTPS strict — where
 * the flag matters — and keeps plain-http deployments working, instead of
 * guessing from a build-time constant that cannot know either.
 */
export function isSecureOrigin(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:"
}

/**
 * The attributes every auth cookie is written with.
 *
 * `sameSite: "strict"` is kept from the previous call sites. It does not
 * affect the token's usefulness: `api.ts` reads the value with JavaScript and
 * sends it as an `Authorization` header, rather than relying on the browser to
 * attach the cookie to a cross-origin API request.
 */
export function authCookieOptions(): Cookies.CookieAttributes {
  return {
    expires: 7,
    secure: isSecureOrigin(),
    sameSite: "strict",
  }
}
