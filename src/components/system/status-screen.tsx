"use client"

import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * The shared presentation for every global application state
 * (AXM-CONS-001 §5 / §18 — Global Application States).
 *
 * One foundation, status-specific content. Every global state — 400, 401, 403,
 * 404, 408, 429, 500, 502, 503, offline, maintenance, unexpected — is this
 * component with a different icon, code, title, explanation and set of
 * recovery actions. There is deliberately no second layout: the whole point of
 * the audit's finding E-09 was that 58 hand-written variants had drifted apart.
 *
 * Deliberately pure: no data, no fetching, no session reads, no side effects.
 * `ErrorState` is the semantic layer that chooses what to put in it, and
 * `StatusActions` supplies the auth-aware destinations.
 *
 * Colour comes from the project's tokens. The reference implementation this was
 * modelled on hard-coded `#5B7FA2` and `text-gray-900`, which reads as a
 * different product bolted on and is illegible in dark mode.
 */

export type StatusTone = "neutral" | "info" | "warning" | "danger"

export type StatusLayout =
  /** Fills the viewport. For route-level states rendered outside app chrome. */
  | "fullscreen"
  /** Fills the space the page was given, inside existing chrome. */
  | "page"
  /** A bordered card in the flow of a page. */
  | "card"
  /** Bare, for embedding in a panel or a modal body. */
  | "inline"

export interface StatusAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost"
  icon?: LucideIcon
  disabled?: boolean
}

const TONE: Record<StatusTone, { surface: string; icon: string; code: string }> = {
  neutral: {
    surface: "bg-muted",
    icon: "text-muted-foreground",
    code: "text-muted-foreground",
  },
  info: {
    surface: "bg-primary/10",
    icon: "text-primary",
    code: "text-primary",
  },
  warning: {
    surface: "bg-warning/10",
    icon: "text-warning",
    code: "text-warning",
  },
  danger: {
    surface: "bg-destructive/10",
    icon: "text-destructive",
    code: "text-destructive",
  },
}

export interface StatusScreenProps {
  icon?: LucideIcon
  /** The HTTP status or a short state label — "404", "OFFLINE". */
  code?: string | number
  title: string
  message?: React.ReactNode
  actions?: StatusAction[]
  tone?: StatusTone
  layout?: StatusLayout
  /** Extra content between the message and the actions. */
  children?: React.ReactNode
  /** Rendered under the actions — a secondary link, a support address. */
  footer?: React.ReactNode
  className?: string
}

export function StatusScreen({
  icon: Icon,
  code,
  title,
  message,
  actions,
  tone = "neutral",
  layout = "card",
  children,
  footer,
  className,
}: StatusScreenProps) {
  const t = TONE[tone]
  const dense = layout === "inline"

  const body = (
    <div
      className={cn(
        "mx-auto flex w-full flex-col items-center text-center",
        dense ? "max-w-sm gap-3 px-4 py-6" : "max-w-md gap-4 px-6 py-10 sm:py-12"
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl",
            t.surface,
            dense ? "h-11 w-11" : "h-16 w-16"
          )}
        >
          <Icon
            className={cn(t.icon, dense ? "h-5 w-5" : "h-7 w-7")}
            aria-hidden="true"
          />
        </div>
      )}

      {code != null && (
        <p
          className={cn(
            "font-mono text-[11px] font-semibold uppercase tracking-[0.2em]",
            t.code
          )}
        >
          {code}
        </p>
      )}

      <div className="space-y-2">
        <h1
          className={cn(
            "font-semibold text-balance text-foreground",
            dense ? "text-base" : "text-xl sm:text-2xl"
          )}
        >
          {title}
        </h1>
        {message && (
          <div
            className={cn(
              "text-pretty leading-relaxed text-muted-foreground",
              dense ? "text-xs" : "text-sm"
            )}
          >
            {message}
          </div>
        )}
      </div>

      {children}

      {actions && actions.length > 0 && (
        <div className="flex w-full flex-col items-stretch gap-2 pt-1 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          {actions.map((action, i) => {
            const ActionIcon = action.icon
            const variant =
              action.variant === "ghost"
                ? "ghost"
                : action.variant === "secondary"
                  ? "outline"
                  : "default"
            const content = (
              <>
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" aria-hidden="true" />}
                {action.label}
              </>
            )

            if (action.href && !action.disabled) {
              return (
                <Button
                  key={`${action.label}-${i}`}
                  asChild
                  variant={variant}
                  size={dense ? "sm" : "default"}
                  className="w-full sm:w-auto"
                >
                  <Link href={action.href} onClick={action.onClick}>
                    {content}
                  </Link>
                </Button>
              )
            }

            return (
              <Button
                key={`${action.label}-${i}`}
                variant={variant}
                size={dense ? "sm" : "default"}
                onClick={action.onClick}
                disabled={action.disabled}
                className="w-full sm:w-auto"
              >
                {content}
              </Button>
            )
          })}
        </div>
      )}

      {footer && (
        <div className="pt-1 text-xs text-muted-foreground">{footer}</div>
      )}
    </div>
  )

  if (layout === "fullscreen") {
    return (
      <div
        role="alert"
        className={cn(
          "flex min-h-[100dvh] w-full items-center justify-center bg-background",
          className
        )}
      >
        {body}
      </div>
    )
  }

  if (layout === "page") {
    // Fills the region the page was handed, without assuming it owns the
    // viewport — a denial inside the dashboard keeps the sidebar and header,
    // which is the user's way back out.
    return (
      <div
        role="alert"
        className={cn(
          "flex min-h-[60vh] w-full flex-1 items-center justify-center py-8",
          className
        )}
      >
        {body}
      </div>
    )
  }

  if (layout === "card") {
    return (
      <div
        role="alert"
        className={cn(
          "w-full rounded-xl border border-border bg-card shadow-sm",
          className
        )}
      >
        {body}
      </div>
    )
  }

  return (
    <div role="alert" className={cn("w-full", className)}>
      {body}
    </div>
  )
}

/**
 * The loading counterpart, so a surface never has to choose between a spinner
 * it invented and a denial it cannot justify yet (§6.1).
 */
export function StatusSpinner({
  layout = "card",
  label = "Loading…",
  className,
}: {
  layout?: StatusLayout
  label?: string
  className?: string
}) {
  const body = (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )

  const wrapper =
    layout === "fullscreen"
      ? "flex min-h-[100dvh] w-full items-center justify-center bg-background"
      : layout === "page"
        ? "flex min-h-[60vh] w-full flex-1 items-center justify-center"
        : "w-full"

  return (
    <div role="status" aria-live="polite" className={cn(wrapper, className)}>
      {body}
    </div>
  )
}
