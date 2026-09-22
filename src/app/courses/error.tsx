"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/system/error-state"

/**
 * Segment error boundary (AXM-CONS-001 F14, finding E-01).
 *
 * Placed inside the layout so a page crash keeps the sidebar, the header and
 * the user's bearings — the whole point of catching it here rather than at the
 * root.
 */
export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[courses]", error)
  }, [error])

  return <ErrorState variant="card" error={error} onRetry={reset} className="my-8" />
}
