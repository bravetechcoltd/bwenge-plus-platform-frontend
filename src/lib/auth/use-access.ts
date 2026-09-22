"use client"

import useSWR from "swr"
import { useMemo } from "react"
import { useSession, type SessionUser } from "./session"
import {
  AccessDecision,
  GRANTED,
  RESOLVING,
  denied,
  decideInstitutionAccess,
  canAdministerInstitution,
  canManageInstitutionCourses,
  canManageInstitutionMembers,
  canViewInstitutionAnalytics,
  isInstitutionMember,
  type InstitutionAccessSnapshot,
} from "./authorization"
import { fetcher } from "@/lib/fetcher"

/**
 * Access resolution for a component (AXM-CONS-001 F4).
 *
 * The distinction this hook exists to preserve is the one the whole plan turns
 * on: while the answer is unknown the decision is `resolving`, never `denied`.
 * That is true for two separate reasons — the session may still be restoring,
 * and the server's membership answer may still be in flight — and both are
 * handled here so no caller has to remember either.
 */

const API = process.env.NEXT_PUBLIC_API_URL

/**
 * The server's standing for one institution.
 *
 * The client cannot query `institution_members`, so before this endpoint every
 * guard inferred administration from the denormalized columns on the user
 * object — and inferred wrong for five real accounts (A-08). The optimistic
 * client-side predicates still run first, so a user the client can already see
 * is an administrator never waits on the network; this only *adds* the
 * memberships the client cannot see by itself.
 */
export function useInstitutionAccess(institutionId: string | null | undefined) {
  const { status, token } = useSession()

  const key =
    status === "authenticated" && token && institutionId
      ? `${API}/institutions/${institutionId}/my-access`
      : null

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    data: InstitutionAccessSnapshot & { institution_id: string }
  }>(key, (url: string) => fetcher(url, token!), {
    revalidateOnFocus: false,
    // A membership does not change while someone reads a page.
    dedupingInterval: 60_000,
    shouldRetryOnError: true,
    errorRetryCount: 2,
  })

  return {
    snapshot: data?.data ?? null,
    /** True while the answer is genuinely unknown — not while it is negative. */
    isResolving: status === "initializing" || (!!key && isLoading),
    error,
    mutate,
  }
}

export interface AccessCheckResult {
  decision: AccessDecision
  granted: boolean
  resolving: boolean
  user: SessionUser | null
}

/**
 * Generic check. `check` is evaluated only once the session has resolved.
 *
 * ```tsx
 * const { granted, resolving } = useAccess((u) => isSystemAdmin(u))
 * ```
 */
export function useAccess(
  check: (user: SessionUser) => boolean
): AccessCheckResult {
  const { status, user } = useSession()

  const decision = useMemo<AccessDecision>(() => {
    if (status === "initializing") return RESOLVING
    if (status === "unauthenticated" || !user) return denied("unauthenticated")
    return check(user) ? GRANTED : denied("insufficient-role")
    // `check` is typically an inline arrow, so it is intentionally not a
    // dependency — the session and the caller's own props drive re-evaluation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user])

  return {
    decision,
    granted: decision.state === "granted",
    resolving: decision.state === "resolving",
    user,
  }
}

export type InstitutionCapability =
  | "member"
  | "administer"
  | "manage-courses"
  | "manage-members"
  | "view-analytics"

/**
 * Institution access, combining the client's own knowledge with the server's.
 *
 * A grant the client can already justify is returned immediately, so the
 * common case never waits. A grant it cannot justify waits for the server
 * rather than denying — which is exactly the case that used to lock out an
 * administrator recorded only in `institution_members`.
 */
export function useInstitutionCapability(
  institutionId: string | null | undefined,
  capability: InstitutionCapability = "administer"
): AccessCheckResult & { snapshot: InstitutionAccessSnapshot | null } {
  const { status, user } = useSession()
  const { snapshot, isResolving } = useInstitutionAccess(institutionId)

  const decision = useMemo<AccessDecision>(() => {
    if (status === "initializing") return RESOLVING
    if (status === "unauthenticated" || !user) return denied("unauthenticated")

    const evaluate = (snap: InstitutionAccessSnapshot | null): boolean => {
      switch (capability) {
        case "member":
          return isInstitutionMember(user, institutionId, snap)
        case "manage-courses":
          return canManageInstitutionCourses(user, institutionId, snap)
        case "manage-members":
          return canManageInstitutionMembers(user, institutionId, snap)
        case "view-analytics":
          return canViewInstitutionAnalytics(user, institutionId, snap)
        default:
          return canAdministerInstitution(user, institutionId, snap)
      }
    }

    // Optimistic grant: the client can already see the right.
    if (evaluate(null)) return GRANTED

    // It cannot — but the server may see a membership the client never
    // receives. Denying here is the A-08 bug; waiting is the fix.
    if (isResolving || (!snapshot && institutionId)) return RESOLVING

    return decideInstitutionAccess(user, institutionId, evaluate(snapshot))
  }, [status, user, institutionId, capability, snapshot, isResolving])

  return {
    decision,
    granted: decision.state === "granted",
    resolving: decision.state === "resolving",
    user,
    snapshot,
  }
}
