"use client"

import { Check, Loader2, AlertCircle, Cloud } from "lucide-react"
import type { SaveState } from "@/hooks/useCourseDraft"

/**
 * Says whether the work is safe (CD-001 §1).
 *
 * Auto-save is only reassuring if it is visible. Without this the author has
 * no way to tell a saved course from one about to be lost, and the honest
 * answer matters most in the state that used to be silent: when saving has
 * been failing.
 */
export function DraftSaveIndicator({
  state,
  lastSavedAt,
}: {
  state: SaveState
  lastSavedAt: Date | null
}) {
  if (state === "idle" && !lastSavedAt) return null

  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    )
  }

  if (state === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-destructive">
        <AlertCircle className="h-3 w-3" />
        Not saved — retrying
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {state === "saved" ? <Check className="h-3 w-3 text-success" /> : <Cloud className="h-3 w-3" />}
      Draft saved
      {lastSavedAt && (
        <span className="tabular-nums">
          {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </span>
  )
}
