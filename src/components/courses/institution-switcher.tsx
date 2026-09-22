"use client"

import * as React from "react"
import { Building2, ChevronDown } from "lucide-react"

interface SwitcherInstitution {
  id?: string
  slug: string
  name: string
  logo_url?: string | null
  total_courses?: number
}

/**
 * Move between institution catalogues, from the navigation bar.
 *
 * Lifted out of the institution page's own navigation so it can sit in the
 * shared bar's left group — it is a way of changing which catalogue you are
 * browsing, which is the same kind of control as Explore, and belongs beside
 * it rather than in a bar that only one page has.
 */
export function InstitutionSwitcher({
  institutions,
  selectedSlug,
  onChange,
}: {
  institutions: SwitcherInstitution[]
  selectedSlug: string
  onChange: (slug: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const boxRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])

  // One institution is not a choice. Rendering a picker that can only ever say
  // the same thing is noise in the bar.
  if (!institutions || institutions.length < 2) return null

  const current = institutions.find((i) => i.slug === selectedSlug)

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex max-w-[220px] items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
      >
        {current?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate">{current?.name ?? "Institutions"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {institutions.map((inst) => (
            <button
              key={inst.slug}
              type="button"
              onClick={() => {
                setOpen(false)
                onChange(inst.slug)
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent ${
                inst.slug === selectedSlug ? "bg-accent" : ""
              }`}
            >
              {inst.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inst.logo_url} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-popover-foreground">
                  {inst.name}
                </span>
                {inst.total_courses !== undefined && (
                  <span className="block text-[11px] text-muted-foreground">
                    {inst.total_courses} course{inst.total_courses === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
