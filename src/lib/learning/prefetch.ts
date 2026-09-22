"use client"

/**
 * ============================================================================
 * Learning Space prefetch store
 * ============================================================================
 *
 * The course bundle arrives with a readiness object for every activity the
 * learner has reached. Lesson payloads go straight into SWR's cache under the
 * keys the page already uses, so nothing there needs to know a bundle exists.
 * Readiness has no SWR key to prime — `AssessmentRunner` fetches it directly —
 * so it lands here instead.
 *
 * ── Consume-once, deliberately ──────────────────────────────────────────────
 *
 * An entry is handed out at most once and then dropped. Readiness carries
 * attempts-used and the resulting lock state, which change the moment a learner
 * submits or resets an attempt; a cache that kept serving the opening snapshot
 * would tell them they had three attempts left after they had spent them.
 *
 * So the prefetch answers the *first* paint of an activity — the one that used
 * to show a spinner — and every load after that goes to the network exactly as
 * it does today. There is no staleness window, because there is no second read.
 */

import type { AssessmentReadiness } from "./api"

const readiness = new Map<string, AssessmentReadiness>()

/** Course the current entries belong to; switching courses clears them. */
let ownerCourseId: string | null = null

export function primeReadiness(
  courseId: string,
  entries: Record<string, AssessmentReadiness> | null | undefined
): void {
  if (ownerCourseId !== courseId) {
    readiness.clear()
    ownerCourseId = courseId
  }
  if (!entries) return
  for (const [activityId, value] of Object.entries(entries)) {
    if (value) readiness.set(activityId, value)
  }
}

/**
 * Takes the prefetched readiness for an activity, if one is waiting.
 *
 * Returns `null` when there is nothing — a locked step the bundle omitted, a
 * second read, or a session that never bundled — and the caller fetches.
 */
export function takeReadiness(activityId: string): AssessmentReadiness | null {
  const value = readiness.get(activityId)
  if (!value) return null
  readiness.delete(activityId)
  return value
}

/** Drops everything — used when the learner leaves the Learning Space. */
export function clearPrefetch(): void {
  readiness.clear()
  ownerCourseId = null
}
