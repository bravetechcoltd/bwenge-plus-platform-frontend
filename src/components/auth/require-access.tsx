"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useSession, type SessionUser } from "@/lib/auth/session"
import {
  useAccess,
  useInstitutionCapability,
  type InstitutionCapability,
} from "@/lib/auth/use-access"
import type { AccessDecision } from "@/lib/auth/authorization"
import { ErrorState, ResolvingState } from "@/components/system/error-state"

/**
 * The shared route guard (AXM-CONS-001 F3 — findings A-01 to A-12).
 *
 * Every protected page in the application used to answer the access question
 * itself, in one of six mutually inconsistent ways, and every one of them
 * shared the same defect: they treated an unresolved session as a refusal. On
 * the first render after a refresh the user was `null`, so the page printed
 * Access Denied and then — a frame later, once the effect had run — quietly
 * corrected itself. For the accounts in finding A-08 it never corrected,
 * because the predicate was asking the wrong question entirely.
 *
 * This component makes the correct behaviour the easy behaviour:
 *
 *   resolving → a loading state. Never a denial.
 *   granted   → the page.
 *   denied    → one shared ErrorState that says *why*, and offers a way out.
 *
 * The page body it wraps is unchanged. No page logic moves into the guard.
 */

interface BaseProps {
  children: React.ReactNode
  /** Replaces the default loading state. */
  fallback?: React.ReactNode
  /** Replaces the default denial surface. */
  deniedFallback?: React.ReactNode
  /** Send unauthenticated visitors to sign-in instead of showing a message. */
  redirectOnUnauthenticated?: boolean
  className?: string
}

type Props = BaseProps &
  (
    | {
        /** Arbitrary predicate, evaluated only once the session has resolved. */
        check: (user: SessionUser) => boolean
        institutionId?: never
        capability?: never
      }
    | {
        /** Institution access, resolved against the server's membership answer. */
        institutionId: string | null | undefined
        capability?: InstitutionCapability
        check?: never
      }
  )

export function RequireAccess(props: Props) {
  return "check" in props && props.check ? (
    <PredicateGuard {...(props as BaseProps & { check: (u: SessionUser) => boolean })} />
  ) : (
    <InstitutionGuard
      {...(props as BaseProps & {
        institutionId: string | null | undefined
        capability?: InstitutionCapability
      })}
    />
  )
}

function PredicateGuard({
  check,
  ...rest
}: BaseProps & { check: (user: SessionUser) => boolean }) {
  const { decision } = useAccess(check)
  return <Decide decision={decision} {...rest} />
}

function InstitutionGuard({
  institutionId,
  capability = "administer",
  ...rest
}: BaseProps & {
  institutionId: string | null | undefined
  capability?: InstitutionCapability
}) {
  const { decision } = useInstitutionCapability(institutionId, capability)
  return <Decide decision={decision} {...rest} />
}

function Decide({
  decision,
  children,
  fallback,
  deniedFallback,
  redirectOnUnauthenticated,
  className,
}: BaseProps & { decision: AccessDecision }) {
  const router = useRouter()
  const pathname = usePathname()

  const unauthenticated =
    decision.state === "denied" && decision.reason === "unauthenticated"

  // Preserving the destination is the difference between signing back in and
  // landing where you were, and signing back in and landing on a dashboard
  // wondering what you were doing (§13).
  React.useEffect(() => {
    if (!redirectOnUnauthenticated || !unauthenticated) return
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ""
    router.replace(`/login${next}`)
  }, [redirectOnUnauthenticated, unauthenticated, pathname, router])

  if (decision.state === "resolving") {
    return <>{fallback ?? <ResolvingState variant="page" label="Checking your access…" />}</>
  }

  if (decision.state === "denied") {
    if (redirectOnUnauthenticated && unauthenticated) {
      return <>{fallback ?? <ResolvingState variant="page" label="Redirecting…" />}</>
    }
    if (deniedFallback) return <>{deniedFallback}</>

    return (
      <ErrorState
        variant="page"
        kind={unauthenticated ? "unauthorized" : "access-denied"}
        reason={decision.reason}
        className={className}
      />
    )
  }

  return <>{children}</>
}

/**
 * Authentication only — no role or institution requirement.
 *
 * For pages that any signed-in user may open but which still must not flash a
 * denial while the session restores.
 */
export function RequireAuth({
  children,
  fallback,
  redirectOnUnauthenticated = true,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectOnUnauthenticated?: boolean
}) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!redirectOnUnauthenticated) return
    if (status !== "unauthenticated") return
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ""
    router.replace(`/login${next}`)
  }, [status, redirectOnUnauthenticated, pathname, router])

  if (status === "initializing") {
    return <>{fallback ?? <ResolvingState variant="page" />}</>
  }

  if (status === "unauthenticated") {
    return redirectOnUnauthenticated ? (
      <>{fallback ?? <ResolvingState variant="page" label="Redirecting…" />}</>
    ) : (
      <ErrorState variant="page" kind="unauthorized" />
    )
  }

  return <>{children}</>
}
