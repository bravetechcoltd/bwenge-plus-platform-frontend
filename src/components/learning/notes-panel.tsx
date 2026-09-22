"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Cloud, CloudOff, Loader2, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"
import { learningApi } from "@/lib/learning/api"

/**
 * Notes drawer (plan §8.2, A12).
 *
 * Notes persist into the pre-existing `lesson_progress.notes` column — no new
 * table was introduced for this, per the plan's anti-duplication register.
 *
 * Autosaves on a 1s debounce and again on close, so a learner who types and
 * immediately navigates away does not lose the note.
 */

const DEBOUNCE_MS = 1000

export function NotesPanel({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  initialNotes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonId: string | null
  lessonTitle: string
  initialNotes: string | null
}) {
  const [value, setValue] = useState(initialNotes ?? "")
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)
  const lessonRef = useRef(lessonId)

  // Swap content when the learner moves to another lesson, flushing first so
  // an in-flight edit is not dropped on the floor.
  useEffect(() => {
    if (lessonRef.current !== lessonId) {
      if (dirtyRef.current && lessonRef.current) {
        void learningApi.saveNotes(lessonRef.current, value).catch(() => undefined)
      }
      lessonRef.current = lessonId
      dirtyRef.current = false
      setValue(initialNotes ?? "")
      setState("idle")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  useEffect(() => {
    if (!dirtyRef.current) setValue(initialNotes ?? "")
  }, [initialNotes])

  const save = useCallback(async () => {
    if (!lessonId || !dirtyRef.current) return
    dirtyRef.current = false
    setState("saving")
    try {
      await learningApi.saveNotes(lessonId, value)
      setState("saved")
    } catch {
      setState("error")
      dirtyRef.current = true
    }
  }, [lessonId, value])

  useEffect(() => {
    if (!dirtyRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void save(), DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, save])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) void save()
      onOpenChange(next)
    },
    [onOpenChange, save]
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-[92vw] max-w-md flex-col p-0 sm:w-96">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <StickyNote className="h-4 w-4" />
            Notes
          </SheetTitle>
          <p className="truncate text-xs text-muted-foreground">{lessonTitle}</p>
        </SheetHeader>

        <div className="flex flex-1 flex-col p-4">
          <Textarea
            value={value}
            onChange={(e) => {
              dirtyRef.current = true
              setState("idle")
              setValue(e.target.value)
            }}
            placeholder="Write your notes for this lesson…"
            aria-label={`Notes for ${lessonTitle}`}
            className="min-h-[300px] flex-1 resize-none text-sm leading-6"
            disabled={!lessonId}
          />

          <div className="mt-2 flex items-center justify-between">
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                state === "error"
                  ? "text-warning"
                  : state === "saved"
                    ? "text-success"
                    : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {state === "saving" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </>
              ) : state === "saved" ? (
                <>
                  <Cloud className="h-3 w-3" /> Saved
                </>
              ) : state === "error" ? (
                <>
                  <CloudOff className="h-3 w-3" /> Couldn't save — retrying
                </>
              ) : (
                <>Notes save automatically</>
              )}
            </span>

            <span className="text-xs tabular-nums text-muted-foreground">
              {value.length.toLocaleString()} / 20,000
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
