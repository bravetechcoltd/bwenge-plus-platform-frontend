"use client"

import * as React from "react"
import { X } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { ErrorState } from "@/components/system/error-state"

/**
 * The Smart Details Modal (AXM-CONS-001 §6.6, F9 — findings M-01 to M-11).
 *
 * The audit found 77 dialog surfaces across 60 files using ten different width
 * vocabularies, four different close affordances, two different colour systems
 * and three different ways of laying out the same label/value data.
 *
 * The approved reference — Institution profile → Members → View Details — is
 * the structural and typographic standard, and its grammar is reproduced here
 * token for token. But that reference is a hand-rolled `motion.div`, so it has
 * no focus trap, no Escape handler, no scroll lock and no `role="dialog"`
 * (M-03). This keeps its appearance and puts Radix underneath it, so the
 * semantics come back without the design changing.
 *
 * Two deliberate deviations from the reference, both to make it correct rather
 * than to restyle it:
 *
 *   `divide-gray-100`  → `divide-border`            (M-06: outside the tokens)
 *   header `text-white` → `text-primary-foreground` (M-06: wrong in dark mode)
 *
 * Sizing resolves the tension in M-04. The reference is `max-w-lg` — 512px,
 * about 35% of a 1440px viewport — while §9 asks for roughly half the viewport
 * on desktop. The reference governs *structure*; the scale below governs
 * *size*, so both requirements are met rather than one overruling the other.
 */

const SIZES = {
  md: "w-[min(94vw,32rem)] lg:w-[min(90vw,36rem)]",
  lg: "w-[min(94vw,44rem)] lg:w-[max(50vw,44rem)] lg:max-w-[68rem]",
  xl: "w-[min(96vw,56rem)] lg:w-[max(60vw,56rem)] lg:max-w-[80rem]",
} as const

export type SmartModalSize = keyof typeof SIZES
export type SmartModalState = "ready" | "loading" | "error" | "empty"

export interface SmartDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rendered in the gradient header band. Use `<DetailsIdentity>`. */
  header?: React.ReactNode
  /** Accessible name. Required when `header` is not a `<DetailsIdentity>`. */
  title?: string
  description?: string
  size?: SmartModalSize
  state?: SmartModalState
  error?: unknown
  onRetry?: () => void
  emptyMessage?: string
  /** Defaults to a single Close, exactly as the reference does. */
  footer?: React.ReactNode
  hideFooter?: boolean
  className?: string
  children?: React.ReactNode
}

export function SmartDetailsModal({
  open,
  onOpenChange,
  header,
  title,
  description,
  size = "lg",
  state = "ready",
  error,
  onRetry,
  emptyMessage = "There is nothing to show here yet.",
  footer,
  hideFooter,
  className,
  children,
}: SmartDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-foreground/50" />
        {/*
          The spread below sets `aria-describedby` to undefined only when
          there is no description to point at. Radix sets that attribute from
          its own context and this spread lands after it, so passing
          `undefined` unconditionally would unwire a description that is
          genuinely rendered. Passing it when there is none is how Radix is
          told the omission is deliberate rather than an oversight.
        */}
        <DialogPrimitive.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "flex flex-col overflow-hidden bg-card shadow-2xl",
            "rounded-xl max-h-[90vh]",
            // Below `sm` the panel becomes a bottom sheet: a centred 44rem
            // dialog on a 320px phone is a horizontal scrollbar waiting to
            // happen, which is the failure §6.6 names.
            "max-sm:inset-x-0 max-sm:bottom-0 max-sm:left-0 max-sm:top-auto",
            "max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0",
            "max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[92vh]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
            "max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom",
            "duration-200 motion-reduce:transition-none",
            SIZES[size],
            className
          )}
        >
          {/* Header — the reference's gradient band, avatar, name and email. */}
          <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-primary to-primary/80 px-5 py-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="sr-only">
                {title ?? "Details"}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="sr-only">
                  {description}
                </DialogPrimitive.Description>
              )}
              {header ?? (
                <h2 className="truncate text-base font-bold leading-tight text-primary-foreground">
                  {title ?? "Details"}
                </h2>
              )}
            </div>

            {/* One close affordance. The students popup rendered two — its own
                ghost X and the primitive's, at the same coordinates (M-09). */}
            <DialogPrimitive.Close
              className={cn(
                "shrink-0 rounded-lg p-2 text-primary-foreground/80 transition-colors",
                "hover:bg-primary-foreground/15 hover:text-primary-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
              )}
            >
              <X className="h-5 w-5" aria-hidden />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Body — the only scroller, so header and footer stay pinned. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {state === "loading" && <DetailsSkeleton />}
            {state === "error" && (
              <ErrorState variant="inline" error={error} onRetry={onRetry} hideNavigation />
            )}
            {state === "empty" && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            )}
            {state === "ready" && <div className="space-y-4">{children}</div>}
          </div>

          {!hideFooter && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/50 px-5 py-3">
              {footer ?? (
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="sm">
                    Close
                  </Button>
                </DialogPrimitive.Close>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

/**
 * The loading state, shaped like the content it replaces.
 *
 * `UserDetailModal` switched to a separate `max-w-4xl` dialog while loading and
 * a `max-w-6xl` one once loaded, so the panel visibly jumped width when the
 * data arrived (M-10). The panel here never changes size between states.
 */
function DetailsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1].map((section) => (
        <div key={section}>
          <div className="h-7 rounded-t-lg bg-primary/10" />
          <div className="divide-y divide-border rounded-b-lg border border-border bg-card px-3 py-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4 py-2.5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-3 w-36 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading details…</span>
    </div>
  )
}

// ── The reference's section grammar ─────────────────────────────────────────

export function DetailSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("mb-4 last:mb-0", className)}>
      <div className="rounded-t-lg bg-primary/10 px-3 py-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-border rounded-b-lg border border-border bg-card px-3 py-2">
        {children}
      </div>
    </section>
  )
}

export function DetailRow({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  const empty = value === null || value === undefined || value === ""

  return (
    <div
      className={cn(
        // Below `sm` the row stacks, because a long email and its label do not
        // fit side by side on a 320px screen.
        "flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
        className
      )}
    >
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 break-words text-xs font-semibold sm:text-right",
          empty ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {empty ? "—" : value}
      </span>
    </div>
  )
}

const BADGE_TONES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
} as const

export function DetailBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: keyof typeof BADGE_TONES
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** The header identity block: avatar, name, subtitle — as the reference has it. */
export function DetailsIdentity({
  name,
  subtitle,
  avatarUrl,
  initials,
  icon,
  badges,
}: {
  name: string
  subtitle?: string | null
  avatarUrl?: string | null
  initials?: string
  icon?: React.ReactNode
  badges?: React.ReactNode
}) {
  const fallback =
    initials ||
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-foreground/20">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : icon ? (
          <span className="text-primary-foreground">{icon}</span>
        ) : (
          <span className="text-lg font-bold text-primary-foreground">{fallback || "?"}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-tight text-primary-foreground">
          {name}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-primary-foreground/80">{subtitle}</p>
        )}
        {badges && <div className="mt-1 flex flex-wrap gap-1">{badges}</div>}
      </div>
    </div>
  )
}

/** A footer with actions beside the standard Close. */
export function DetailsFooter({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <DialogPrimitive.Close asChild>
        <Button variant="ghost" size="sm">
          Close
        </Button>
      </DialogPrimitive.Close>
    </>
  )
}
