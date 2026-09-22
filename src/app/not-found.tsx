"use client"

import { ErrorState } from "@/components/system/error-state"

/**
 * AXM-CONS-001 §7.2 — findings E-02 and E-03.
 *
 * This file and `dashboard/not-found.tsx` were byte-identical duplicates, so
 * any change to one silently diverged from the other. Both ended with a
 * "Contact Support" link to `/contact`, a route that does not exist — the page
 * whose job is recovering from a broken link offered a broken one.
 *
 * Both now render the shared error surface, which resolves its own
 * destinations from the session (§6.5).
 */
export default function NotFound() {
  return <ErrorState variant="fullscreen" kind="not-found" />
}
