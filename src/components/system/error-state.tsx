"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Clock,
  CloudOff,
  Hourglass,
  LayoutDashboard,
  Lock,
  LogIn,
  RefreshCw,
  SearchX,
  ServerCog,
  ServerCrash,
  WifiOff,
  type LucideIcon,
} from "lucide-react"

import { useSession } from "@/lib/auth/session"
import type { AccessDenialReason } from "@/lib/auth/authorization"
import { ApiError, toErrorKind, type ErrorKind } from "@/lib/api/api-error"
import {
  homeForUser,
  parentDestination,
  signInDestination,
} from "@/lib/navigation/smart-destination"
import {
  StatusScreen,
  StatusSpinner,
  type StatusAction,
  type StatusLayout,
  type StatusTone,
} from "./status-screen"

/**
 * The semantic layer over `StatusScreen` (AXM-CONS-001 §6.4, §8 — findings
 * E-01, E-02, E-03, E-09, C-05).
 *
 * `StatusScreen` decides how a global state *looks*; this decides *which* one a
 * given failure is, and what the user can do about it. The mapping is the whole
 * contract from §8 of the request:
 *
 *   session still resolving  → StatusSpinner, never a denial
 *   unauthenticated (401)    → sign in, returning to this route
 *   authenticated, no right  → access denied, naming the reason
 *   resource absent (404)    → not found, offering the parent list
 *   network unavailable      → offline, with retry
 *   server failure (5xx)     → server error, with retry
 *   validation (400)         → bad request
 *   anything else            → unexpected error, with retry
 *
 * No status is ever displayed as another one.
 */

export type ErrorStateKind =
  | ErrorKind
  | "access-denied"
  | "offline"
  | "maintenance"

export type ErrorStateVariant = StatusLayout

interface Copy {
  icon: LucideIcon
  code?: string
  title: string
  description: string
  tone: StatusTone
  /** Offer Retry when the caller supplied `onRetry`. */
  retryable: boolean
  /** Offer sign-in rather than a dashboard link. */
  signIn?: boolean
  /** Prefer the parent list over the dashboard. */
  preferParent?: boolean
}

const COPY: Record<ErrorStateKind, Copy> = {
  "not-found": {
    icon: SearchX,
    code: "404",
    title: "Not found",
    description:
      "We could not find what you were looking for. It may have been moved or removed.",
    tone: "neutral",
    retryable: false,
    preferParent: true,
  },
  "access-denied": {
    icon: Lock,
    code: "403",
    title: "Access denied",
    description: "You do not have permission to view this page.",
    tone: "warning",
    retryable: false,
  },
  forbidden: {
    icon: Lock,
    code: "403",
    title: "Access denied",
    description: "You do not have permission to view this.",
    tone: "warning",
    retryable: false,
  },
  unauthorized: {
    icon: LogIn,
    code: "401",
    title: "Your session has ended",
    description: "Sign in again to pick up where you left off.",
    tone: "warning",
    retryable: false,
    signIn: true,
  },
  "bad-request": {
    icon: AlertTriangle,
    code: "400",
    title: "That request could not be processed",
    description: "Something about this request was not valid. Try going back.",
    tone: "warning",
    retryable: false,
    preferParent: true,
  },
  conflict: {
    icon: AlertTriangle,
    code: "409",
    title: "That conflicts with existing data",
    description: "Something has already been created or changed here.",
    tone: "warning",
    retryable: false,
  },
  gone: {
    icon: Archive,
    code: "410",
    title: "No longer available",
    description: "This has been removed and is no longer accessible.",
    tone: "neutral",
    retryable: false,
    preferParent: true,
  },
  timeout: {
    icon: Clock,
    code: "408",
    title: "This took too long",
    description: "The server did not respond in time. It may just be busy.",
    tone: "warning",
    retryable: true,
  },
  "rate-limited": {
    icon: Hourglass,
    code: "429",
    title: "Too many requests",
    description: "Please wait a moment before trying again.",
    tone: "warning",
    retryable: true,
  },
  "server-error": {
    icon: ServerCrash,
    code: "500",
    title: "Something went wrong on our end",
    description: "This is not your fault. Try again in a moment.",
    tone: "danger",
    retryable: true,
  },
  "bad-gateway": {
    icon: CloudOff,
    code: "502",
    title: "We could not reach the service",
    description: "The server is not responding correctly right now.",
    tone: "danger",
    retryable: true,
  },
  "service-unavailable": {
    icon: ServerCog,
    code: "503",
    title: "Service temporarily unavailable",
    description:
      "We are performing maintenance or the service is briefly unreachable. Please try again in a few moments.",
    tone: "warning",
    retryable: true,
  },
  maintenance: {
    icon: ServerCog,
    code: "503",
    title: "Down for maintenance",
    description:
      "We are making some improvements and will be back shortly. Nothing is required on your side.",
    tone: "warning",
    retryable: true,
  },
  network: {
    icon: WifiOff,
    code: "OFFLINE",
    title: "You are offline",
    description:
      "We cannot reach the server. Check your internet connection and try again.",
    tone: "danger",
    retryable: true,
  },
  offline: {
    icon: WifiOff,
    code: "OFFLINE",
    title: "You are offline",
    description:
      "We cannot reach the server. Your work is safe — we will reconnect as soon as your connection returns.",
    tone: "danger",
    retryable: true,
  },
  unknown: {
    icon: AlertCircle,
    title: "Something went wrong",
    description: "An unexpected problem stopped this from loading.",
    tone: "danger",
    retryable: true,
  },
}

/** Why the access check failed, phrased as something the user can act on. */
const DENIAL_COPY: Record<AccessDenialReason, string> = {
  unauthenticated: "Sign in to view this page.",
  "not-a-member": "You are not a member of this institution.",
  "insufficient-role":
    "Your role does not include access to this page. An administrator can grant it.",
  "wrong-institution":
    "This page belongs to a different institution from the one you administer.",
}

export interface ErrorStateProps {
  kind?: ErrorStateKind
  /** An `ApiError` (or anything thrown); its kind is used when `kind` is absent. */
  error?: unknown
  /** Access-denial reason, used to sharpen the description. */
  reason?: AccessDenialReason
  title?: string
  description?: React.ReactNode
  onRetry?: () => void
  /** Replace the computed primary action. */
  action?: { href?: string; label: string; onClick?: () => void }
  /** Hide the computed navigation action entirely. */
  hideNavigation?: boolean
  /** Hide the status code chip. */
  hideCode?: boolean
  variant?: ErrorStateVariant
  className?: string
  children?: React.ReactNode
}

export function ErrorState({
  kind,
  error,
  reason,
  title,
  description,
  onRetry,
  action,
  hideNavigation,
  hideCode,
  variant = "card",
  className,
  children,
}: ErrorStateProps) {
  const pathname = usePathname()
  const { user, status } = useSession()

  const resolvedKind: ErrorStateKind =
    kind ?? (error ? (toErrorKind(error) ?? "unknown") : "unknown")
  const copy = COPY[resolvedKind] ?? COPY.unknown

  // The server's own sentence beats ours when it sent one — it knows why. Only
  // for client errors: a 500's message is for the log, not for the reader.
  const serverMessage =
    error instanceof ApiError && error.status && error.status < 500
      ? error.message
      : null

  const finalDescription =
    description ??
    (reason ? DENIAL_COPY[reason] : null) ??
    serverMessage ??
    copy.description

  const actions = React.useMemo<StatusAction[]>(() => {
    const list: StatusAction[] = []

    if (onRetry && copy.retryable) {
      list.push({ label: "Try again", onClick: onRetry, icon: RefreshCw })
    }

    if (hideNavigation) return list

    if (action) {
      list.push({
        label: action.label,
        href: action.href,
        onClick: action.onClick,
        variant: list.length ? "secondary" : "primary",
        icon: action.href ? ArrowLeft : undefined,
      })
      return list
    }

    if (copy.signIn) {
      const dest = signInDestination(pathname)
      list.push({ label: dest.label, href: dest.href, icon: LogIn })
      return list
    }

    if (copy.preferParent) {
      const parent = parentDestination(pathname)
      if (parent) {
        list.push({
          label: parent.label,
          href: parent.href,
          variant: list.length ? "secondary" : "primary",
          icon: ArrowLeft,
        })
      }
    }

    // Auth-aware: the dashboard is only offered to someone who has one.
    if (status === "authenticated") {
      const home = homeForUser(user)
      list.push({
        label: home.label,
        href: home.href,
        variant: list.length ? "secondary" : "primary",
        icon: LayoutDashboard,
      })
    } else if (status === "unauthenticated" && !copy.signIn) {
      const dest = signInDestination(pathname)
      list.push({
        label: dest.label,
        href: dest.href,
        variant: list.length ? "secondary" : "primary",
        icon: LogIn,
      })
    }

    return list
  }, [onRetry, copy, hideNavigation, action, pathname, status, user])

  const dense = variant === "inline"

  return (
    <StatusScreen
      layout={variant}
      icon={copy.icon}
      code={hideCode ? undefined : copy.code}
      tone={copy.tone}
      title={title ?? copy.title}
      message={finalDescription}
      actions={actions}
      className={className}
      footer={
        dense ? undefined : (
          <>
            Need help?{" "}
            <a
              href="mailto:support@bwenge.com"
              className="text-primary underline-offset-2 hover:underline"
            >
              Contact support
            </a>
          </>
        )
      }
    >
      {children}
    </StatusScreen>
  )
}

/** Kept as the name the rest of the app already imports. */
export function ResolvingState({
  variant = "card",
  label = "Loading…",
  className,
}: {
  variant?: ErrorStateVariant
  label?: string
  className?: string
}) {
  return <StatusSpinner layout={variant} label={label} className={className} />
}

export { StatusScreen, StatusSpinner } from "./status-screen"
export type { StatusAction, StatusTone, StatusLayout } from "./status-screen"
