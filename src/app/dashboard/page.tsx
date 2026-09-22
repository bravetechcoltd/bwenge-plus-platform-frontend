"use client"

import { Loader2 } from "lucide-react"

/**
 * `/dashboard` — a signpost, not a page.
 *
 * The redirect itself belongs to the layout above, which already resolves the
 * role and owns every routing decision under `/dashboard`. This page used to
 * repeat that logic against Redux alone: if Redux had not hydrated but the
 * auth context had, its effect never fired and it span for ever under the
 * message "Redirecting to your dashboard…" with nothing to redirect it.
 *
 * Two guards racing to route the same user is what produced contradictory
 * answers. There is now one, and this renders only the moment before it acts.
 */
export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-card">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#4F46E5]" />
        <p className="text-[12px] text-muted-foreground">Opening your dashboard…</p>
      </div>
    </div>
  )
}
