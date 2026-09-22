"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/system/error-state"

/**
 * The standalone offline route (AXM-CONS-001 §7).
 *
 * `OfflineGate` covers the in-app case, where the tree is already mounted and
 * must stay that way. This covers the other one: a cold navigation that never
 * reached the app at all. It is the destination for a hard load with no
 * connection, and the natural target for a service-worker fallback.
 *
 * It reloads itself when the browser reports the connection back, rather than
 * polling — a poll here would be a reload loop, which §7 explicitly rules out.
 */
export default function OfflineRoute() {
  useEffect(() => {
    const onOnline = () => window.location.reload()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [])

  return (
    <ErrorState
      variant="fullscreen"
      kind="offline"
      onRetry={() => window.location.reload()}
    />
  )
}
