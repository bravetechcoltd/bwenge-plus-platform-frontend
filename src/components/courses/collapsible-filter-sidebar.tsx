"use client"

import * as React from "react"
import { Filter, PanelLeftClose, PanelLeftOpen } from "lucide-react"

/**
 * ============================================================================
 * Collapsible filter rail (CS-001)
 * ============================================================================
 *
 * The catalogue sidebars were fixed-width and always open: a filter panel took
 * a permanent bite out of every screen whether or not anyone was filtering, and
 * on a laptop that is the difference between three course cards per row and
 * two.
 *
 * Collapsed, it becomes a narrow rail showing only the filter icon and a count
 * of what is currently applied — so a collapsed panel can never hide the fact
 * that results are being filtered, which is the one thing a hidden filter panel
 * must not do.
 *
 * The choice is remembered per browser. Someone who works collapsed should not
 * have to collapse it again on every visit; `localStorage` is the right store
 * because this is a per-person convenience, not shared state.
 */
export function CollapsibleFilterSidebar({
  children,
  activeCount = 0,
  storageKey = "catalogue_filters_collapsed",
  title = "Filters",
}: {
  children: React.ReactNode
  /** How many filters are applied — surfaced while collapsed. */
  activeCount?: number
  storageKey?: string
  title?: string
}) {
  // Starts expanded so the first render matches the server's, then adopts the
  // stored preference. Reading storage during render would hydrate-mismatch.
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(storageKey) === "1")
    } catch {
      // Private browsing, or storage disabled. The default stands.
    }
  }, [storageKey])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, next ? "1" : "0")
      } catch {}
      return next
    })
  }

  if (collapsed) {
    return (
      <aside className="hidden w-14 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-16 flex flex-col items-center gap-2 py-4">
          <button
            type="button"
            onClick={toggle}
            aria-label="Show filters"
            aria-expanded={false}
            title="Show filters"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Filter className="h-5 w-5" />
            {activeCount > 0 && (
              // The reason a collapsed rail is safe: it still says it is filtering.
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label="Expand filter panel"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-card lg:block">
      <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold text-foreground">{title}</span>
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse filter panel"
            aria-expanded
            title="Collapse filters"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </aside>
  )
}
