"use client"

/**
 * ============================================================================
 * Deleting a course, with the consequences stated first
 * ============================================================================
 *
 * This replaced a native `confirm("Are you sure you want to delete this
 * course? This action cannot be undone.")`, which had three problems beyond
 * looking like 1998.
 *
 * It blocked the whole browser, it could not say what was attached to the
 * course, and it was not true: the endpoint behind it set `status = ARCHIVED`
 * and replied "deleted". An administrator who accepted "cannot be undone" got
 * something that very much could be, and then found the course still counting
 * against its category with no idea why.
 *
 * So the dialog asks which of the two is wanted, and says what each one does.
 * Permanent deletion loads what is attached — the enrolments, the certificates
 * already issued — and requires the course title typed back, because a
 * credential someone has been awarded is not something to remove on a
 * misclick.
 */

import * as React from "react"
import {
  AlertTriangle,
  Archive,
  BookOpen,
  FileCheck2,
  Loader2,
  Trash2,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  courseDeletionApi,
  type CourseDeletionPreview,
} from "@/lib/courses/deletion-api"

export type DeleteMode = "archive" | "permanent"

export interface DeleteCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string | null
  courseTitle: string
  /** Runs the delete. Resolves when it is done; rejects with a message. */
  onConfirm: (mode: DeleteMode) => Promise<void>
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone?: "danger"
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        tone === "danger" && value > 0
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-muted/30"
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tone === "danger" && value > 0 ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function DeleteCourseDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onConfirm,
}: DeleteCourseDialogProps) {
  const [mode, setMode] = React.useState<DeleteMode>("archive")
  const [preview, setPreview] = React.useState<CourseDeletionPreview | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setMode("archive")
    setTyped("")
    setError(null)
    setPreview(null)
  }, [open, courseId])

  /*
   * The preview is fetched when permanent is chosen, not when the dialog
   * opens: archiving is the common case and does not need it, and a request
   * per opened menu would be a request per glance.
   */
  React.useEffect(() => {
    if (!open || mode !== "permanent" || !courseId || preview) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const loaded = await courseDeletionApi.preview(courseId)
        if (!cancelled) setPreview(loaded)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the details.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, mode, courseId, preview])

  const nameMatches =
    typed.trim().toLowerCase() === courseTitle.trim().toLowerCase() && courseTitle.trim().length > 0

  const canConfirm = mode === "archive" || nameMatches

  const run = async () => {
    if (!canConfirm) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm(mode)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "The course could not be removed.")
    } finally {
      setBusy(false)
    }
  }

  const counts = preview?.counts
  const enrolled = preview?.irreversible.learners_enrolled ?? 0
  const certificates = preview?.irreversible.certificates_issued ?? 0

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove &ldquo;{courseTitle}&rdquo;</DialogTitle>
          <DialogDescription>
            There are two ways to do this and they are not the same.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Archive */}
          <button
            type="button"
            onClick={() => setMode("archive")}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              mode === "archive"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <Archive
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                mode === "archive" ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Archive it</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Hidden from learners, kept in the database. Enrolments, progress and
                certificates survive, and it can be published again. It still counts
                against its category.
              </p>
            </div>
          </button>

          {/* Permanent */}
          <button
            type="button"
            onClick={() => setMode("permanent")}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              mode === "permanent"
                ? "border-destructive bg-destructive/5"
                : "border-border hover:border-destructive/50"
            )}
          >
            <Trash2
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                mode === "permanent" ? "text-destructive" : "text-muted-foreground"
              )}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Delete it permanently</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                The course and everything attached to it are removed, and it is detached
                from its category. This cannot be undone.
              </p>
            </div>
          </button>

          {mode === "permanent" && (
            <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                <AlertTriangle className="h-4 w-4" />
                What goes with it
              </p>

              {loading ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : counts ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat icon={BookOpen} label="Lessons" value={counts.lessons} />
                    <Stat icon={FileCheck2} label="Assessments" value={counts.assessments} />
                    <Stat icon={Users} label="Enrolled" value={counts.enrollments} tone="danger" />
                    <Stat
                      icon={FileCheck2}
                      label="Certificates"
                      value={counts.certificates}
                      tone="danger"
                    />
                  </div>

                  {(enrolled > 0 || certificates > 0) && (
                    <p className="text-xs leading-relaxed text-destructive">
                      {enrolled > 0 && (
                        <>
                          {enrolled} {enrolled === 1 ? "learner is" : "learners are"} enrolled and
                          will lose their progress.
                        </>
                      )}
                      {enrolled > 0 && certificates > 0 && " "}
                      {certificates > 0 && (
                        <>
                          {certificates}{" "}
                          {certificates === 1 ? "certificate has" : "certificates have"} been
                          issued for it and will stop verifying.
                        </>
                      )}
                    </p>
                  )}

                  {preview?.course.category && (
                    <p className="text-xs text-muted-foreground">
                      It will be removed from{" "}
                      <span className="font-medium text-foreground">
                        {preview.course.category.name}
                      </span>
                      . The category itself is not affected.
                    </p>
                  )}
                </>
              ) : null}

              <div className="space-y-1.5 pt-1">
                <Label htmlFor="confirm-course-title" className="text-xs">
                  Type{" "}
                  <span className="font-mono font-semibold text-destructive">{courseTitle}</span>{" "}
                  to confirm
                </Label>
                <Input
                  id="confirm-course-title"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Enter the course title"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={mode === "permanent" ? "destructive" : "default"}
            onClick={run}
            disabled={busy || !canConfirm}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "permanent" ? "Delete permanently" : "Archive course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
