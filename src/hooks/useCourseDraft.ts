"use client"

import * as React from "react"
import Cookies from "js-cookie"

/**
 * ============================================================================
 * Course draft auto-save (CD-001 §1, §3)
 * ============================================================================
 *
 * Keeps the course being written saved on the server, continuously.
 *
 * ── What it replaces ───────────────────────────────────────────────────────
 *
 * The wizard's own `localStorage` auto-save, which survived a refresh and
 * nothing else: not a different browser, not a different machine, not a
 * logout. It also held a single draft under fixed keys, so starting a second
 * course overwrote the first, and because the keys were not scoped to a user,
 * the next person to sign in on that browser inherited the previous author's
 * work.
 *
 * The local write stays — it is instant, and it covers the seconds between
 * keystroke and request — but it is now a cache in front of the record, not
 * the record.
 *
 * ── Why one row per session, not one per save ──────────────────────────────
 *
 * The first save creates a draft and returns its id; every save after that
 * sends that id and updates the same row. The id is held in a ref rather than
 * state so that a save firing during a render cannot read a stale one and
 * create a second draft — which is the way a debounced auto-save usually ends
 * up littering the table.
 */

export interface CourseDraftRecord {
  id: string
  title: string
  course_type: string | null
  level: string | null
  completion_percentage: number
  current_step: number
  course_data: Record<string, any>
  modules: any[]
  uploaded_files: any[]
  status: "IN_PROGRESS" | "PUBLISHED" | "DISCARDED"
  institution_id: string | null
  published_course_id: string | null
  last_autosaved_at: string | null
  created_at: string
  updated_at: string
}

export type SaveState = "idle" | "saving" | "saved" | "error"

const DEBOUNCE_MS = 1500

function authHeaders(): Record<string, string> {
  const token = Cookies.get("bwenge_token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const base = () => `${process.env.NEXT_PUBLIC_API_URL}/course-drafts`

/** Loads one draft in full, for continuing it. */
export async function fetchDraft(id: string): Promise<CourseDraftRecord | null> {
  const res = await fetch(`${base()}/${id}`, { headers: authHeaders() })
  if (!res.ok) return null
  const json = await res.json()
  return json?.success ? json.data : null
}

/** The signed-in author's drafts. */
export async function fetchDrafts(params: {
  search?: string
  status?: string
} = {}): Promise<CourseDraftRecord[]> {
  const query = new URLSearchParams()
  if (params.search?.trim()) query.set("search", params.search.trim())
  if (params.status && params.status !== "ALL") query.set("status", params.status)

  const res = await fetch(`${base()}?${query.toString()}`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Could not load your drafts")
  const json = await res.json()
  return json?.data?.drafts ?? []
}

export async function discardDraft(id: string): Promise<void> {
  const res = await fetch(`${base()}/${id}`, { method: "DELETE", headers: authHeaders() })
  if (!res.ok) throw new Error("Could not discard that draft")
}

/** Links a draft to the course it became, after the course is created. */
export async function linkDraftToCourse(draftId: string, courseId: string): Promise<void> {
  try {
    await fetch(`${base()}/${draftId}/published`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ course_id: courseId }),
    })
  } catch {
    // The course exists, which is what the author cares about. A draft left
    // marked in-progress is untidy, not broken, and must never turn a
    // successful publish into a visible failure.
  }
}

export interface UseCourseDraftOptions {
  courseData: Record<string, any>
  modules: any[]
  currentStep: number
  uploadedFiles?: any[]
  /** Pauses auto-save — while the wizard is still loading, or submitting. */
  enabled?: boolean
  /** Continuing an existing draft. */
  initialDraftId?: string | null
}

export function useCourseDraft({
  courseData,
  modules,
  currentStep,
  uploadedFiles = [],
  enabled = true,
  initialDraftId = null,
}: UseCourseDraftOptions) {
  const [draftId, setDraftId] = React.useState<string | null>(initialDraftId)
  const [saveState, setSaveState] = React.useState<SaveState>("idle")
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)

  // The id the next save will use. A ref, not state: see the note above.
  const draftIdRef = React.useRef<string | null>(initialDraftId)
  // The last payload actually sent, so an unchanged wizard stops talking.
  const lastPayloadRef = React.useRef<string>("")
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = React.useRef(false)

  React.useEffect(() => {
    draftIdRef.current = initialDraftId
    setDraftId(initialDraftId)
  }, [initialDraftId])

  const save = React.useCallback(
    async (payload: Record<string, any>): Promise<string | null> => {
      // One save at a time. The debounce makes overlap unlikely and a slow
      // network makes it certain, and two concurrent creates are two drafts.
      if (inFlightRef.current) return draftIdRef.current
      inFlightRef.current = true
      setSaveState("saving")

      try {
        const res = await fetch(base(), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...payload, id: draftIdRef.current ?? undefined }),
        })

        if (!res.ok) throw new Error(`Save failed (${res.status})`)

        const json = await res.json()
        if (!json?.success || !json.data?.id) throw new Error("Save failed")

        draftIdRef.current = json.data.id
        setDraftId(json.data.id)
        setSaveState("saved")
        setLastSavedAt(new Date())
        return json.data.id
      } catch {
        // Deliberately quiet. Auto-save failing is not something to interrupt
        // someone's writing over — the indicator shows it, the local mirror
        // still holds the work, and the next keystroke tries again.
        setSaveState("error")
        return null
      } finally {
        inFlightRef.current = false
      }
    },
    []
  )

  React.useEffect(() => {
    if (!enabled) return

    // Nothing worth saving yet. A draft row whose only content is the wizard's
    // defaults is noise in the author's list.
    const hasContent =
      String(courseData?.title ?? "").trim().length > 0 ||
      String(courseData?.description ?? "").trim().length > 0 ||
      modules.length > 0

    if (!hasContent) return

    const payload = {
      title: courseData?.title ?? "",
      course_type: courseData?.course_type ?? null,
      level: courseData?.level ?? null,
      institution_id: courseData?.institution_id ?? null,
      current_step: currentStep,
      course_data: courseData,
      modules,
      uploaded_files: uploadedFiles,
    }

    const serialised = JSON.stringify(payload)
    if (serialised === lastPayloadRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      lastPayloadRef.current = serialised
      void save(payload)
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [courseData, modules, currentStep, uploadedFiles, enabled, save])

  /** Forces a save now — before submitting, or on an explicit "Save draft". */
  const saveNow = React.useCallback(async (): Promise<string | null> => {
    if (timerRef.current) clearTimeout(timerRef.current)
    return save({
      title: courseData?.title ?? "",
      course_type: courseData?.course_type ?? null,
      level: courseData?.level ?? null,
      institution_id: courseData?.institution_id ?? null,
      current_step: currentStep,
      course_data: courseData,
      modules,
      uploaded_files: uploadedFiles,
    })
  }, [courseData, modules, currentStep, uploadedFiles, save])

  return { draftId, saveState, lastSavedAt, saveNow }
}
