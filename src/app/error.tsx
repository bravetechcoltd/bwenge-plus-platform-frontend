"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/system/error-state"

/**
 * The root error boundary (AXM-CONS-001 F12, finding E-01).
 *
 * There was no `error.tsx` anywhere in this application. Any exception during
 * render — a null dereference on a partially loaded course, a malformed date,
 * a missing relation — took the whole route down to Next's default screen in
 * development and a blank frame in production, with no recovery affordance and
 * no way back to the dashboard.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Kept: without it a production digest is the only trace of what happened.
    console.error("[route error]", error)
  }, [error])

  return <ErrorState variant="fullscreen" error={error} onRetry={reset} />
}
