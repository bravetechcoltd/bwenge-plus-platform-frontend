"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, Search, Users, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { User } from "@/types"

/**
 * The other instructors teaching a course (CI-001).
 *
 * ── Why this is separate from the primary instructor ───────────────────────
 *
 * A course has exactly one `instructor_id` — the owner, stored on the course
 * row itself — and any number of additional instructors, stored in
 * `course_instructors` with their own per-course permissions
 * (`can_grade_assignments`, `can_manage_enrollments`,
 * `can_edit_course_content`). That is the shape the backend already models, so
 * this field adds to the second set rather than turning the first into a list.
 *
 * The primary is therefore excluded from the options below. The server rejects
 * them anyway — "Already primary instructor of this course" — and offering a
 * choice that will be refused is worse than not offering it.
 *
 * ── Why a checkbox list and not a native multiple select ───────────────────
 *
 * `<select multiple>` requires ctrl-click to add a second option, silently
 * replaces the whole selection on a plain click, and is close to unusable on a
 * phone. This is a searchable list with explicit checkmarks and removable
 * chips, so what is selected is always visible.
 */
export function CoInstructorsField({
  instructors,
  primaryInstructorId,
  selectedIds,
  onChange,
  disabled = false,
  labelClassName,
  /** Shown when the course is not institution-scoped. See the note below. */
  unavailableReason,
}: {
  instructors: User[]
  primaryInstructorId?: string | null
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  labelClassName?: string
  unavailableReason?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const displayName = (person: User) =>
    `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
    person.email ||
    "Unnamed instructor"

  /** Everyone who may be added: the list, minus whoever is primary. */
  const options = useMemo(
    () =>
      instructors.filter(
        (person) => person.id && person.id !== primaryInstructorId
      ),
    [instructors, primaryInstructorId]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((person) =>
      `${displayName(person)} ${person.email ?? ""}`.toLowerCase().includes(q)
    )
  }, [options, query])

  const selected = useMemo(
    () => options.filter((person) => selectedIds.includes(person.id)),
    [options, selectedIds]
  )

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id]
    )
  }

  /*
   * If the primary instructor is changed to someone already picked as a
   * co-instructor, they would be in both lists and the server would reject
   * the assignment. Drop them from this one; the primary wins.
   */
  const stale = selectedIds.filter(
    (id) => id === primaryInstructorId || !options.some((o) => o.id === id)
  )
  if (stale.length > 0) {
    queueMicrotask(() =>
      onChange(selectedIds.filter((id) => !stale.includes(id)))
    )
  }

  return (
    <div className="space-y-1.5">
      <Label className={labelClassName}>
        Additional instructors{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>

      {unavailableReason ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[12px] text-muted-foreground">
          {unavailableReason}
        </p>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-left text-[13px] text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-2 truncate">
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {selected.length === 0
                ? "Add other instructors"
                : `${selected.length} selected`}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {selected.map((person) => (
                <Badge
                  key={person.id}
                  variant="secondary"
                  className="gap-1 py-0.5 pl-2 pr-1 text-[12px] font-normal"
                >
                  {displayName(person)}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(person.id)}
                    aria-label={`Remove ${displayName(person)}`}
                    className="rounded-sm p-0.5 hover:bg-background/60"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {open && (
            <div className="rounded-lg border border-border bg-background shadow-sm">
              <div className="relative border-b border-border p-2">
                <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="h-8 pl-7 text-[13px]"
                />
              </div>

              <div className="max-h-52 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                    {options.length === 0
                      ? "No other instructors are available."
                      : "No instructor matches that search."}
                  </p>
                ) : (
                  filtered.map((person) => {
                    const isSelected = selectedIds.includes(person.id)
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => toggle(person.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {displayName(person)}
                          {person.email && (
                            <span className="text-muted-foreground">
                              {" "}
                              — {person.email}
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          <p className="text-[12px] text-muted-foreground">
            They can grade submissions by default. Finer permissions are set on
            the course once it exists.
          </p>
        </>
      )}
    </div>
  )
}
