"use client"

/**
 * ============================================================================
 * The courses inside a category, and where each one goes next
 * ============================================================================
 *
 * Deleting a category with courses in it is refused, and rightly — the courses
 * would be left pointing at a row that no longer exists. The problem was what
 * happened next: the dialog said "6 courses", disabled the button, and labelled
 * it "Reassign Courses First" without offering anywhere to do that. The count
 * was the end of the road.
 *
 * This is the road. It lists the six, gives each one its own destination, and
 * moves them in a single request — after which the delete the administrator
 * came for is available.
 *
 * ── Why a destination per course ───────────────────────────────────────────
 *
 * The server already had `reassign_to` on the delete, which sweeps an entire
 * category into one other category. That is the right shape for a category
 * created by mistake and the wrong one for a category being retired, because
 * six courses filed together years ago usually belong in four different places
 * now. Deciding is the work; a bulk move is offered as a starting point rather
 * than as the only option.
 */

import * as React from "react"
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FolderInput,
  Loader2,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  categoryReassignApi,
  pendingAssignments,
  UNCATEGORISED,
  type CategoryCourse,
  type CategoryCourses,
} from "@/lib/categories/reassign-api"

function statusTone(status: string): string {
  switch (String(status).toUpperCase()) {
    case "PUBLISHED":
      return "border-success/40 text-success"
    case "DRAFT":
      return "border-warning/40 text-warning"
    case "ARCHIVED":
      return "border-muted-foreground/40 text-muted-foreground"
    default:
      return "border-border text-muted-foreground"
  }
}

function instructorName(course: CategoryCourse): string | null {
  const first = course.instructor?.first_name?.trim() ?? ""
  const last = course.instructor?.last_name?.trim() ?? ""
  const full = `${first} ${last}`.trim()
  return full.length > 0 ? full : null
}

export interface CategoryCoursesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string | null
  categoryName: string
  /** Called after a successful move, so the caller can refresh its counts. */
  onMoved?: (moved: number, remaining: number) => void
}

export function CategoryCoursesDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  onMoved,
}: CategoryCoursesDialogProps) {
  const [data, setData] = React.useState<CategoryCourses | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  /** course id -> chosen destination, or UNCATEGORISED. */
  const [chosen, setChosen] = React.useState<Record<string, string>>({})

  const load = React.useCallback(async () => {
    if (!categoryId) return
    setLoading(true)
    setError(null)
    try {
      const loaded = await categoryReassignApi.list(categoryId)
      setData(loaded)
      // Every row starts where it already is, so an untouched row is a row
      // that does not move. `pendingAssignments` drops those.
      setChosen(
        Object.fromEntries(loaded.courses.map((course) => [course.id, categoryId]))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the courses.")
    } finally {
      setLoading(false)
    }
  }, [categoryId])

  React.useEffect(() => {
    if (open) void load()
  }, [open, load])

  const courses = data?.courses ?? []
  const destinations = data?.destinations ?? []

  const moves = React.useMemo(
    () => (categoryId ? pendingAssignments(courses, chosen, categoryId) : []),
    [courses, chosen, categoryId]
  )

  const setAll = (destination: string) =>
    setChosen(Object.fromEntries(courses.map((course) => [course.id, destination])))

  const save = async () => {
    if (moves.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const moved = await categoryReassignApi.reassign(moves)
      const remaining = courses.length - moved
      onMoved?.(moved, remaining)

      if (remaining <= 0) {
        onOpenChange(false)
      } else {
        // Some stayed behind on purpose; reload so the list matches the
        // database rather than what the screen happened to be showing.
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move the courses.")
    } finally {
      setSaving(false)
    }
  }

  const nowhereToPut = !loading && !error && courses.length > 0 && destinations.length === 0

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-primary" />
            Courses in &ldquo;{categoryName}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Give each course a new category. A category has to be empty before it can be
            deleted, and nothing here is deleted — the courses are moved.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : error && courses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-9 w-9 text-success" />
              <div>
                <p className="font-medium text-foreground">This category is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nothing is filed under it, so it can be deleted.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Move everything at once — the starting point, not the only option. */}
              {destinations.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Move all {courses.length} to
                  </Label>
                  <Select onValueChange={setAll}>
                    <SelectTrigger className="h-9 w-full sm:w-64">
                      <SelectValue placeholder="Pick one for all of them" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((destination) => (
                        <SelectItem key={destination.id} value={destination.id}>
                          {destination.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={UNCATEGORISED}>No category</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    You can still change any of them below.
                  </span>
                </div>
              )}

              {nowhereToPut && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-sm text-foreground">
                    This is the only category in the institution, so there is nowhere to move
                    these courses. Create another one first, or leave them uncategorised.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {courses.map((course) => {
                  const destination = chosen[course.id]
                  const moving = destination && destination !== categoryId
                  const who = instructorName(course)

                  return (
                    <div
                      key={course.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-xl border bg-card p-3 transition-colors sm:flex-row sm:items-center",
                        moving ? "border-primary/40 bg-primary/[0.04]" : "border-border"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {course.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", statusTone(course.status))}
                          >
                            {course.status}
                          </Badge>
                          {course.course_type && (
                            <Badge variant="outline" className="text-[10px]">
                              {course.course_type}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {who && <span className="truncate">{who}</span>}
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {course.total_lessons ?? 0} lessons
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {course.enrollment_count ?? 0} enrolled
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {moving && (
                          <ArrowRight className="hidden h-4 w-4 text-primary sm:block" />
                        )}
                        <Select
                          value={destination}
                          onValueChange={(value) =>
                            setChosen((prev) => ({ ...prev, [course.id]: value }))
                          }
                        >
                          <SelectTrigger
                            className="h-9 w-full sm:w-56"
                            aria-label={`New category for ${course.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Where it is now, so "leave it" is a visible choice
                                rather than the absence of one. */}
                            {categoryId && (
                              <SelectItem value={categoryId}>
                                {categoryName} (stay)
                              </SelectItem>
                            )}
                            {destinations.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                            <SelectItem value={UNCATEGORISED}>No category</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}
              </div>

              {error && courses.length > 0 && (
                <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {courses.length === 0
              ? "Nothing to move"
              : moves.length === 0
                ? `${courses.length} course${courses.length === 1 ? "" : "s"}, none moving yet`
                : `${moves.length} of ${courses.length} will move`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {courses.length === 0 ? "Close" : "Cancel"}
            </Button>
            {courses.length > 0 && (
              <Button onClick={save} disabled={saving || moves.length === 0}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Move {moves.length > 0 ? moves.length : ""}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
