"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Search,
  FileEdit,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  Plus,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  fetchDrafts,
  discardDraft,
  type CourseDraftRecord,
} from "@/hooks/useCourseDraft"

/**
 * ============================================================================
 * Course drafts (CD-001 §2)
 * ============================================================================
 *
 * The courses this author has started and not yet published.
 *
 * The interaction pattern follows the draft-listing reference in
 * `/docs/hitcodes.tsx` — search, status filter, progress, continue, discard,
 * and the same responsive table-to-cards behaviour. Everything visual is this
 * project's design tokens, and nothing loan-specific came across.
 */

const STATUS_FILTERS = [
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ALL", label: "All" },
] as const

/** Where "Continue" goes. Each role has its own creation route. */
export interface CourseDraftsViewProps {
  createHref: string
  title?: string
}

export function CourseDraftsView({
  createHref,
  title = "Course Drafts",
}: CourseDraftsViewProps) {
  const router = useRouter()

  const [drafts, setDrafts] = React.useState<CourseDraftRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<string>("IN_PROGRESS")
  const [discarding, setDiscarding] = React.useState<string | null>(null)
  const [confirming, setConfirming] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDrafts(await fetchDrafts({ status }))
    } catch (e: any) {
      // Said plainly rather than shown as an empty list: "you have no drafts"
      // and "we could not fetch your drafts" are very different messages to
      // someone who knows they saved one.
      setError(e?.message ?? "Could not load your drafts.")
    } finally {
      setLoading(false)
    }
  }, [status])

  React.useEffect(() => {
    void load()
  }, [load])

  /*
   * Filtered here rather than by refetching on every keystroke: a single
   * author's drafts are a short list, already in memory, and a round trip per
   * character would make the field feel slower than it is.
   */
  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drafts
    return drafts.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.course_type ?? "").toLowerCase().includes(q) ||
        (d.level ?? "").toLowerCase().includes(q)
    )
  }, [drafts, search])

  const discard = async (id: string) => {
    setDiscarding(id)
    try {
      await discardDraft(id)
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      toast.success("Draft discarded")
    } catch {
      toast.error("Could not discard that draft")
    } finally {
      setDiscarding(null)
      setConfirming(null)
    }
  }

  const resume = (draft: CourseDraftRecord) => {
    // The id travels in the URL, so the wizard continues this row rather than
    // starting a new one — which is what stops a reopened draft duplicating.
    router.push(`${createHref}?draft=${draft.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-[12px] text-muted-foreground">
            Courses you have started. Everything is saved automatically as you write.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push(createHref)}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          New course
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your drafts"
            aria-label="Search drafts"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              aria-pressed={status === f.value}
              className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                status === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-[13px] text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-[13px] font-medium text-foreground">
            {search.trim()
              ? `No draft matches “${search.trim()}”`
              : status === "PUBLISHED"
                ? "No drafts have been published yet"
                : "You have no drafts in progress"}
          </p>
          <p className="max-w-sm text-[12px] text-muted-foreground">
            Start a course and it will appear here automatically — you do not need to save it
            yourself.
          </p>
          {!search.trim() && (
            <Button size="sm" className="mt-1" onClick={() => router.push(createHref)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Start a course
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((draft) => (
            <li
              key={draft.id}
              className="rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[14px] font-medium text-foreground">
                      {draft.title?.trim() || "Untitled course"}
                    </p>
                    {draft.status === "PUBLISHED" ? (
                      <Badge variant="outline" className="border-success/40 bg-success/10 text-[10px] text-success">
                        <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Draft
                      </Badge>
                    )}
                    {draft.course_type && (
                      <Badge variant="outline" className="text-[10px]">
                        {draft.course_type}
                      </Badge>
                    )}
                    {draft.level && (
                      <Badge variant="outline" className="text-[10px]">
                        {draft.level}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeTime(draft.last_autosaved_at ?? draft.updated_at)}
                    </span>
                    <span>{draft.modules?.length ?? 0} module(s)</span>
                    <span>Step {(draft.current_step ?? 0) + 1}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${draft.completion_percentage ?? 0}%` }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {draft.completion_percentage ?? 0}%
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {confirming === draft.id ? (
                    // Inline rather than a dialog: the question is small, and a
                    // modal for it is more ceremony than the action deserves.
                    <>
                      <span className="text-[11px] text-muted-foreground">Discard?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={discarding === draft.id}
                        onClick={() => void discard(draft.id)}
                      >
                        {discarding === draft.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Yes"
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                        No
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => resume(draft)}>
                        <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                        Continue
                        <ArrowRight className="ml-1.5 h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirming(draft.id)}
                        aria-label={`Discard ${draft.title || "untitled draft"}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** "3 minutes ago". Absolute dates make an auto-saving list hard to scan. */
function relativeTime(iso: string | null): string {
  if (!iso) return "not saved yet"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "unknown"

  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  return new Date(iso).toLocaleDateString()
}
