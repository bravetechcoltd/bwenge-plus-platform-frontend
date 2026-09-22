"use client"

import { useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useAppSelector } from "@/lib/hooks"
import type { User } from "@/types"

/**
 * The session tri-state (AXM-CONS-001 §6.1 — findings A-02, A-03, A-04, C-03).
 *
 * The whole of the false Access Denied and the false Course not found is the
 * absence of a third value. Before this module there were exactly two:
 * "authenticated" and "not authenticated" — and because the session was
 * restored from storage inside a `useEffect`, the first render after every
 * refresh reported the second one while the truth was still unknown.
 *
 * A guard read that as "denied". SWR read the resulting `null` key as "not
 * loading", and a course page read `course === undefined && loading === false`
 * as "this course does not exist". One absence, two confident wrong answers.
 *
 * `status` is the fix, and the rule that goes with it is the whole point:
 *
 *   No component may render a negative outcome — denied, empty, not found —
 *   while `status === "initializing"`. An unresolved session is not a "no".
 *
 * This does NOT introduce a third store. It reads the two that already exist —
 * the `AuthProvider` context and the `bwengeAuth` slice — and reports whichever
 * has resolved. Both keep working exactly as they do today; 58 files consume
 * the first and 48 the second, and none of them has to change to benefit.
 */

export type SessionStatus = "initializing" | "authenticated" | "unauthenticated"

export interface SessionState {
  status: SessionStatus
  user: SessionUser | null
  token: string | null
  /** True only while a credential request is in flight — the old `isLoading`. */
  isSubmitting: boolean
  /** Convenience: `status === "initializing"`. */
  isResolving: boolean
  /** Convenience: `status === "authenticated"`. */
  isAuthenticated: boolean
  /**
   * The one role for this session (AUTH-NAV-004).
   *
   * Resolved here so every consumer agrees. Two independent resolutions with
   * different precedence — this one preferring the context, the dashboard
   * chrome preferring Redux — is how one component decided a user was an
   * instructor while another decided they were an institution admin, on the
   * same screen.
   */
  role: string | null
  /**
   * True when the two stores name different roles.
   *
   * Not a display concern: it means one of them is stale, so the session
   * cannot be trusted to route anyone. The dashboard guard ends it.
   */
  roleConflict: boolean
}

/**
 * The shape the authorization predicates need. Deliberately structural rather
 * than the full `User`, because the two sources hold slightly different
 * objects and every field below is present in both.
 */
export interface SessionUser {
  id?: string
  email?: string
  first_name?: string
  last_name?: string
  username?: string
  profile_picture_url?: string
  bwenge_role?: string | null
  institution_role?: string | null
  primary_institution_id?: string | null
  institution_ids?: string[] | string | null
  is_institution_member?: boolean
  institution?: { id?: string; name?: string; logo_url?: string } | null
  [key: string]: unknown
}

export function useSession(): SessionState {
  const context = useAuth()
  const redux = useAppSelector((state) => state.bwengeAuth)

  return useMemo(() => {
    // Redux hydrates at module evaluation, the context during its first
    // render; either may be the one that has an answer first, so whichever
    // has a user wins.
    //
    // The comment here used to say they "cannot disagree about *who*, only
    // about *when*", because both read the same cookies. That was wrong, and
    // the wrongness was the bug: Redux is written by the current login while
    // the context is rehydrated from cookies, so a cookie left by a previous
    // session makes them name two different people. Redux therefore wins on
    // identity — it is the store the live login writes — and the disagreement
    // is reported rather than silently resolved.
    const user = (redux.user ?? context.user ?? null) as SessionUser | null
    const token = redux.token ?? context.token ?? null

    const reduxRole = (redux.user as SessionUser | null)?.bwenge_role ?? null
    const contextRole = (context.user as SessionUser | null)?.bwenge_role ?? null
    const role = reduxRole ?? contextRole ?? null
    const roleConflict =
      !!reduxRole &&
      !!contextRole &&
      String(reduxRole).toUpperCase() !== String(contextRole).toUpperCase()

    let status: SessionStatus
    if (user && token) {
      status = "authenticated"
    } else if (context.isRestoring) {
      // Storage has not been read yet. This is the frame that used to print
      // Access Denied.
      status = "initializing"
    } else {
      status = "unauthenticated"
    }

    return {
      status,
      user,
      token,
      isSubmitting: context.isLoading,
      isResolving: status === "initializing",
      isAuthenticated: status === "authenticated",
      role,
      roleConflict,
    }
  }, [context.user, context.token, context.isLoading, context.isRestoring, redux.user, redux.token])
}

/** The full `User` where a caller genuinely needs it. */
export function useSessionUser(): User | null {
  const { user } = useSession()
  return (user as unknown as User) ?? null
}
