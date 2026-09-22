"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import Cookies from "js-cookie"
import type { RootState } from "@/lib/store"
import { LoginModal } from "@/components/auth/LoginModal"
import { Search, Loader2, BookOpen, CornerDownLeft, Sparkles } from "lucide-react"
import {
  discoverCourses,
  interestLabel,
  type DiscoveredCourse,
  type DiscoveryResult,
  EMPTY_DISCOVERY,
} from "@/lib/courses/discovery"

/**
 * ============================================================================
 * Catalogue search (CS-001, personalised in CE-001 §4–§6)
 * ============================================================================
 *
 * The navigation search, wherever it appears.
 *
 * ── Why it did nothing ─────────────────────────────────────────────────────
 *
 * The field submitted to `/courses?search=…`, and `/courses` never read the
 * parameter. A learner typed a query, was taken to the catalogue, and found an
 * empty search box and an unfiltered list. Nothing was broken in a way that
 * would show up as an error: one side sent a value the other side did not
 * listen for. Both halves were fixed.
 *
 * ── Why it now asks the server ─────────────────────────────────────────────
 *
 * It used to fetch the first hundred published courses once and filter that
 * array in the browser. Three things were wrong with that. A catalogue larger
 * than the page size silently lost its tail, so a course could exist and be
 * unfindable. Each surface that searched had its own idea of which fields
 * counted. And the browser has no way to know what the learner said they were
 * interested in at registration.
 *
 * All three go away by asking `/course-discovery`, which is the same service
 * the catalogue pages use. Signed in, the ordering reflects the learner's own
 * answers and each suggestion says which interest it matched; signed out it is
 * the keyword search it always was.
 */

/** How long to wait after the last keystroke before asking the server. */
const DEBOUNCE_MS = 220

/** Below this, a query matches so much that suggesting anything is noise. */
const MIN_QUERY = 2

function subtitleFor(course: DiscoveredCourse): string {
  return [course.category_name ?? course.category, course.institution_name, course.instructor_name]
    .filter(Boolean)
    .join(" · ")
}

export function CourseSearch({
  className = "",
  placeholder = "What do you want to learn?",
  initialValue = "",
  institutionId,
}: {
  className?: string
  placeholder?: string
  initialValue?: string
  /** Scopes suggestions to one institution's catalogue. */
  institutionId?: string
}) {
  const router = useRouter()

  /*
   * Opening a course requires signing in (CE-001 §2).
   *
   * The catalogue cards already did this — click one signed out and the login
   * modal appears, then takes you to the course. The search suggestions in
   * the bar above them did not, so the same click on the same course behaved
   * differently depending on which control you used.
   *
   * It is handled here rather than in each page because the bar appears on
   * the catalogue, an institution's catalogue and a course page, and only
   * this component knows which course was picked.
   */
  const { user, isAuthenticated } = useSelector((state: RootState) => state.bwengeAuth)
  const [pendingCourseId, setPendingCourseId] = React.useState<string | null>(null)

  // Redux is the first source, with the cookie as a fallback so a reload that
  // has not rehydrated the store yet does not ask a signed-in learner to sign
  // in again.
  const signedIn = Boolean(isAuthenticated || user || Cookies.get("bwenge_token"))
  const [query, setQuery] = React.useState(initialValue)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<DiscoveryResult>(EMPTY_DISCOVERY)
  const [failed, setFailed] = React.useState(false)
  const [highlighted, setHighlighted] = React.useState(-1)
  const boxRef = React.useRef<HTMLDivElement>(null)

  const trimmed = query.trim()
  const showResults = open && trimmed.length >= MIN_QUERY

  /*
   * One request per settled query, and the one in flight is abandoned when a
   * newer keystroke supersedes it — otherwise a slow response for "acc" can
   * land after the fast one for "accounting" and overwrite it, which shows the
   * learner results for something they have finished typing.
   */
  React.useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setResult(EMPTY_DISCOVERY)
      setFailed(false)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setLoading(true)

    const timer = setTimeout(() => {
      discoverCourses({ search: trimmed, institutionId, limit: 6, signal: controller.signal })
        .then((r) => {
          if (cancelled) return
          setResult(r)
          setFailed(false)
        })
        .catch((error) => {
          if (cancelled || controller.signal.aborted) return
          // A failed lookup means no suggestions. Submitting still works, which
          // is the behaviour that matters: the field must never be a dead end.
          setResult(EMPTY_DISCOVERY)
          setFailed(true)
          if (process.env.NODE_ENV !== "production") {
            console.error("Course search failed", error)
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [trimmed, institutionId])

  const results = result.courses

  React.useEffect(() => {
    setHighlighted(-1)
  }, [query])

  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", onClickOutside)
    return () => document.removeEventListener("click", onClickOutside)
  }, [])

  const goToCatalogue = (q: string) => {
    setOpen(false)
    router.push(q.trim() ? `/courses?search=${encodeURIComponent(q.trim())}` : "/courses")
  }

  const openCourse = (id: string) => {
    setOpen(false)

    if (!signedIn) {
      // Remembered so the modal can return them here afterwards, rather than
      // to a dashboard or back to an empty search.
      setPendingCourseId(id)
      return
    }

    router.push(`/courses/${id}`)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((h) => (h + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => (h <= 0 ? results.length - 1 : h - 1))
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault()
      openCourse(results[highlighted].id)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      {/*
        The shared modal, not a second login form. `redirectTo` is the course
        that was clicked, so signing in continues the journey that was
        interrupted instead of ending it on a dashboard.
      */}
      <LoginModal
        isOpen={pendingCourseId !== null}
        onClose={() => setPendingCourseId(null)}
        redirectTo={pendingCourseId ? `/courses/${pendingCourseId}` : "/courses"}
        message="Sign in to view this course and enroll."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          goToCatalogue(query)
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search courses"
          aria-expanded={showResults && results.length > 0}
          role="combobox"
          aria-controls="course-search-results"
          className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {showResults && (
        <div
          id="course-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {loading && results.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            // An honest miss, with the one action still available. A failed
            // request says so rather than claiming nothing matched.
            <button
              type="button"
              onClick={() => goToCatalogue(query)}
              className="flex w-full items-center gap-2 px-3 py-3 text-left text-[12px] text-muted-foreground hover:bg-accent"
            >
              <Search className="h-3.5 w-3.5" />
              {failed
                ? `Course search is unavailable right now. Open the catalogue for “${trimmed}”.`
                : `No course matches “${trimmed}”. Search the full catalogue anyway.`}
            </button>
          ) : (
            <>
              {result.personalised && (
                <p className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Ordered by your interests
                </p>
              )}
              {results.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={i === highlighted}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => openCourse(c.id)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2 text-left ${
                    i === highlighted ? "bg-accent" : "hover:bg-accent"
                  }`}
                >
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {c.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {subtitleFor(c)}
                    </span>
                    {/*
                      Why this course is where it is. Reordering without saying
                      so leaves a learner unable to tell a good match from an
                      arbitrary one.
                    */}
                    {c.matched_interests.length > 0 && (
                      <span className="mt-0.5 block truncate text-[10px] text-primary">
                        Matches your interest in{" "}
                        {c.matched_interests.slice(0, 2).map(interestLabel).join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToCatalogue(query)}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-[12px] text-muted-foreground hover:bg-accent"
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
                See all results for “{trimmed}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
