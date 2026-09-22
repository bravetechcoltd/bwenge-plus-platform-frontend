"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AlertTriangle, ArrowUpDown, Search } from "lucide-react"
import { BAND_LABEL, bandClass, type PerformanceBand } from "@/lib/learning/performance-api"

/**
 * ============================================================================
 * Performance UI primitives (LM-001 §19)
 * ============================================================================
 *
 * The dashboard's existing visual language, extracted so every performance
 * surface uses it rather than approximating it.
 *
 * Taken from `/dashboard/learner`, which is the reference the brief names:
 * a `divide-x` strip of small stat tiles rather than a grid of large cards,
 * `rounded-xl border-border bg-card` panels, 3.5-unit padding, and a type
 * scale that tops out at 15px. The first version of these screens used
 * `text-2xl` values in `p-4` cards, which is a different product's density and
 * pushed one table below the fold on a laptop.
 *
 * Nothing here is new design. It is the existing one, named once so the fourth
 * table cannot drift from the first.
 */

// ── Panel ──────────────────────────────────────────────────────────────────

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[13px] font-semibold leading-tight text-card-foreground">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            // Full width on a phone so the search field has something to fill;
            // content-width from sm up so it sits beside the title.
            <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">{actions}</div>
          )}
        </div>
      )}
      <div className="p-3.5">{children}</div>
    </div>
  )
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface Tile {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  tone?: "default" | "warn" | "danger" | "good"
}

/**
 * The horizontal stat strip from the learner dashboard.
 *
 * Wraps rather than scrolls on narrow screens, and drops the dividers there —
 * a divider between wrapped rows reads as a table rule, not a separator.
 */
export function StatStrip({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="rounded-xl border border-border bg-card px-1 py-1.5">
      <div className="flex flex-wrap items-center sm:divide-x sm:divide-border">
        {tiles.map((t) => (
          <div key={t.label} className="flex items-center gap-2 px-3.5 py-1">
            {t.icon && <span className="text-muted-foreground">{t.icon}</span>}
            <div className="flex flex-col">
              <span
                className={`text-[15px] font-bold leading-tight ${
                  t.tone === "danger"
                    ? "text-destructive"
                    : t.tone === "warn"
                      ? "text-orange-600 dark:text-orange-400"
                      : t.tone === "good"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-card-foreground"
                }`}
              >
                {t.value}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">{t.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Toolbar ────────────────────────────────────────────────────────────────

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative w-full sm:w-[200px]">
      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-7 text-[12px]"
      />
    </div>
  )
}

/**
 * A filter as a pill, matching the course tabs on the learner dashboard.
 *
 * Chosen over a Select for short, known option sets: the whole point of a
 * filter row is that the current state is readable without opening anything.
 */
export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; count?: number }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1 text-[10px] opacity-70">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Table ──────────────────────────────────────────────────────────────────

export function Table({ children }: { children: React.ReactNode }) {
  // The negative margin cancels the cells' own 8px padding, so the first
  // column's text lines up with the panel title above it rather than sitting
  // 8px further in.
  return (
    <div className="-mx-2 hidden overflow-x-auto md:block">
      <table className="w-full text-[12px]">{children}</table>
    </div>
  )
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode
  align?: "left" | "right"
  className?: string
}) {
  return (
    <th
      className={`whitespace-nowrap px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode
  align?: "left" | "right"
  className?: string
}) {
  return (
    <td className={`px-2 py-2 ${align === "right" ? "text-right" : ""} ${className}`}>
      {children}
    </td>
  )
}

export function SortTh({
  label,
  field,
  sort,
  direction,
  onSort,
  align = "left",
}: {
  label: string
  field: string
  sort: string
  direction: "asc" | "desc"
  onSort: (field: string, direction: "asc" | "desc") => void
  align?: "left" | "right"
}) {
  const active = sort === field
  return (
    <Th align={align}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(field, active && direction === "asc" ? "desc" : "asc")}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-30"}`} />
      </button>
    </Th>
  )
}

/** Zebra-free rows with a hairline rule, matching the dashboard's tables. */
export function Tr({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-t border-border ${onClick ? "cursor-pointer hover:bg-muted/40" : ""}`}
    >
      {children}
    </tr>
  )
}

// ── Indicators ─────────────────────────────────────────────────────────────

export function BandChip({ band }: { band: PerformanceBand }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${bandClass(band)}`}
    >
      {BAND_LABEL[band]}
    </span>
  )
}

export function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode
  tone?: "muted" | "good" | "bad" | "warn"
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : tone === "bad"
        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
        : tone === "warn"
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
          : "bg-muted text-muted-foreground"
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  )
}

export function MiniBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">{v}%</span>
    </div>
  )
}

export function pct(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${n}%`
}

// ── States ─────────────────────────────────────────────────────────────────

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function EmptyNote({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[12px] text-muted-foreground">{message}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  )
}

export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (p: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-[11px]">
      <span className="text-muted-foreground">
        Page {page + 1} of {pages}
      </span>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

/**
 * The one drawer shape every drill-down uses.
 *
 * Detail opens over the page rather than replacing it (§18), and it opens the
 * same way from every table — a learner, an assessment, a course and an
 * institution should not each have their own idea of what a detail view looks
 * like.
 */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  width = "sm:max-w-2xl",
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  width?: string
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`w-full overflow-y-auto p-4 ${width}`}>
        <SheetHeader className="space-y-1">
          <SheetTitle className="pr-6 text-left text-[15px] leading-tight">{title}</SheetTitle>
          {subtitle && (
            <SheetDescription className="text-left text-[11px]">{subtitle}</SheetDescription>
          )}
        </SheetHeader>
        <div className="mt-3 space-y-3">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

/** A titled block inside a drawer — the drawer's equivalent of `Panel`. */
export function DetailBlock({
  title,
  actions,
  children,
}: {
  title: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        {actions}
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  )
}

/** A compact label/value row for drawer bodies. */
export function DetailRow({
  label,
  value,
  onClick,
}: {
  label: React.ReactNode
  value: React.ReactNode
  onClick?: () => void
}) {
  const Tag: any = onClick ? "button" : "div"
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 border-b border-border py-1.5 text-left last:border-0 ${
        onClick ? "hover:bg-muted/40" : ""
      }`}
    >
      <span className="min-w-0 truncate text-[12px]">{label}</span>
      <span className="shrink-0 text-[12px] font-medium tabular-nums">{value}</span>
    </Tag>
  )
}

/** Card list used in place of a table below md. */
export function MobileList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5 md:hidden">{children}</div>
}

export function MobileRow({
  title,
  subtitle,
  right,
  meta,
  onClick,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  right?: React.ReactNode
  meta?: React.ReactNode
  onClick?: () => void
}) {
  const Tag: any = onClick ? "button" : "div"
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full rounded-lg border border-border p-2.5 text-left ${
        onClick ? "hover:bg-muted/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-tight">{title}</p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
      {meta && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {meta}
        </div>
      )}
    </Tag>
  )
}
