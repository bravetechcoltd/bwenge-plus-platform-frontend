"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useCrossSystemAuth } from "@/lib/hooks/useCrossSystemAuth"
import { useSession } from "@/lib/auth/session"
import {
  getRoleDisplayName,
  resolveDashboardRedirect,
} from "@/app/utils/roleNavigation"
import { hardSignOut } from "@/lib/auth/hard-sign-out"

/**
 * The dashboard guard (AUTH-NAV-001).
 *
 * ── The stuck loader ───────────────────────────────────────────────────────
 *
 * This layout used to hold `isRedirecting` state, set it to `true` before a
 * `router.replace`, and never set it back. Because one layout serves every
 * `/dashboard/*` route, it does not unmount when the route changes — so the
 * flag stayed `true` after arrival and the loader rendered for ever. The user
 * reached the right page and never saw it.
 *
 * The fix is to hold no state. `resolveDashboardRedirect` is pure, so the
 * answer is re-derived from the path and the role on every render: the moment
 * the path becomes the right one, the same function says STAY and the children
 * render. There is nothing left that can latch.
 *
 * ── The wrong dashboard ────────────────────────────────────────────────────
 *
 * The old guard read `String(user.bwenge_role ?? "")` and asked its own local
 * copy of `getRoleDashboardPath` where that belonged. For `""` the answer was
 * the learner dashboard — so in any frame where the user object had arrived
 * but the role had not, an institution admin was judged to be on the wrong
 * dashboard and sent to the learner one. Combined with the latch above, that
 * is the reported symptom exactly: a spinner that never ends, on the wrong
 * dashboard.
 *
 * An unresolved role now returns WAIT. Nobody is moved on a guess.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  // `usePathname` rather than `window.location.pathname`: the latter is not
  // reactive, so after a client-side navigation the guard was still judging
  // the page the user had left.
  const pathname = usePathname()

  /**
   * AXM-CONS-001 finding A-12.
   *
   * This layout gated on `state.bwengeAuth`, which hydrates at module
   * evaluation, while the pages beneath it gated on the `useAuth()` context,
   * which hydrated in an effect. The layout therefore *passed* on the render
   * in which the page *denied* — the exact mechanism by which a user saw the
   * full authenticated chrome, sidebar and role badge intact, wrapped around
   * an "Access Denied" card.
   *
   * Both now read `useSession()`, so the chrome and the body cannot disagree.
   */
  const { status, user, role, roleConflict } = useSession()
  const isAuthenticated = status === "authenticated"
  const isResolving = status === "initializing"

  // Monitor cross-system authentication.
  useCrossSystemAuth()

  // A role is "resolved" once the session has settled. Before that, a missing
  // role means "not loaded"; after it, it means "this account has none".
  const decision = resolveDashboardRedirect(pathname ?? "", role, {
    roleResolved: isAuthenticated,
  })

  // Remembers the last path we sent the router to, so a re-render does not
  // fire the same navigation twice. It is a de-duplicator, not a gate: it
  // never decides what the user sees.
  /**
   * False until the browser has taken over.
   *
   * SEO-004 made the application server-render, so this guard now runs on the
   * server as well. There it has no cookies, no localStorage and no Redux, so
   * it reached a different conclusion from the first render in the browser and
   * React reported a hydration mismatch on every dashboard route.
   *
   * Pinning both to one output fixes it: the server and the first client
   * render always produce the loader below, and the real decision is taken
   * from the second render, once storage has been read.
   *
   * Nothing is lost. The dashboard sits behind a login and is excluded from
   * search indexing, so it has no reason to be in the server HTML. The public
   * pages, which do, are unaffected.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const lastPush = useRef<string | null>(null)

  /*
   * How many times we have tried to move this session somewhere valid
   * (AUTH-NAV-002).
   *
   * `resolveDashboardRedirect` settles in at most two hops, so repeated
   * attempts mean the session itself is incoherent — usually a role that does
   * not match the identity, because two logins overlapped and the second
   * inherited part of the first. Bouncing such a session around for ever is
   * worse than ending it.
   */
  const attempts = useRef(0)
  const ended = useRef(false)

  /** Ends an unusable session: wipe the browser, then start again at login. */
  const abandonSession = useCallback((reason: string) => {
    if (ended.current) return
    ended.current = true
    console.warn(`[dashboard] ending session: ${reason}`)
    hardSignOut()
    // A full load, not a client navigation: nothing held in memory should
    // survive a session we have just declared incoherent.
    window.location.replace("/login")
  }, [])

  useEffect(() => {
    if (isResolving) return

    if (!isAuthenticated) {
      if (lastPush.current !== "/login") {
        lastPush.current = "/login"
        router.replace("/login")
      }
      return
    }

    // The two stores name different roles, so one of them is stale and nothing
    // can be routed safely — this is the state that framed an instructor with
    // an institution-admin dashboard. End it; the wipe removes whichever copy
    // was stale, and the next login is clean.
    if (roleConflict) {
      abandonSession("session stores disagree about this user's role")
      return
    }

    // Signed in, but no dashboard exists for this account. No path would
    // satisfy the guard, so this is a dead end rather than a wrong turn: end
    // the session instead of holding someone on a message they cannot act on.
    if (decision.action === "NO_DASHBOARD") {
      abandonSession("authenticated with no role that opens a dashboard")
      return
    }

    if (decision.action === "REDIRECT" && lastPush.current !== decision.path) {
      attempts.current += 1
      if (attempts.current > 4) {
        abandonSession(`could not settle on a dashboard after ${attempts.current} attempts`)
        return
      }
      lastPush.current = decision.path
      // No artificial delay. The old 500ms timeout only made the stuck loader
      // look deliberate.
      router.replace(decision.path)
    }

    if (decision.action === "STAY") {
      // Arrived. Clear the de-duplicator so a later cross-role visit is not
      // silently ignored because it happens to target the same path, and
      // forget the attempts: this session routes fine.
      lastPush.current = null
      attempts.current = 0
    }
  }, [isResolving, isAuthenticated, decision, roleConflict, router, abandonSession])

  if (!mounted || isResolving || decision.action === "WAIT") {
    /*
     * The message is pinned too, not just the branch.
     *
     * Taking the `!mounted` path still left `message` derived from
     * `decision`, which the server and the browser resolve differently — the
     * server has no storage, so it said "Signing you in…" where the client
     * said "Preparing your workspace…". React compares text, so the mismatch
     * survived even though both rendered the same element.
     *
     * Before mount there is exactly one thing that can honestly be said, and
     * both sides now say it.
     */
    const message = !mounted
      ? "Loading…"
      : decision.action === "WAIT"
        ? "Preparing your workspace…"
        : "Signing you in…"

    return <DashboardStatus message={message} />
  }

  if (!isAuthenticated) return <DashboardStatus message="Redirecting to sign in…" />

  if (roleConflict) return <DashboardStatus message="Signing you out…" />

  if (decision.action === "NO_DASHBOARD") {
    // The effect above is already ending the session. This is the frame before
    // the redirect to login lands — previously this fell through to the learner
    // dashboard, which is how someone ended up on a page that was not theirs.
    return <DashboardStatus message="Signing you out…" />
  }

  if (decision.action === "REDIRECT") {
    return (
      <DashboardStatus
        message={
          decision.reason === "WRONG_ROLE"
            ? `Opening your ${getRoleDisplayName(String(role ?? ""))} dashboard…`
            : "Opening your dashboard…"
        }
      />
    )
  }

  return <>{children}</>
}

function DashboardStatus({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-card">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#4F46E5]" />
        <p className="text-[12px] text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
