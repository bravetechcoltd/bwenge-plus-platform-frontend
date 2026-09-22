"use client"

import { ErrorState } from "@/components/system/error-state"

/**
 * Planned maintenance and confirmed 503 (AXM-CONS-001 §5).
 *
 * Distinct from `/offline`: there the connection is the problem, here the
 * connection is fine and the service is deliberately away. Conflating them
 * sends the user to check a router that is working perfectly.
 */
export default function MaintenanceRoute() {
  return (
    <ErrorState
      variant="fullscreen"
      kind="maintenance"
      onRetry={() => window.location.reload()}
    />
  )
}
