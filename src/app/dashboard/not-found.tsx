"use client"

import { ErrorState } from "@/components/system/error-state"

/** See `src/app/not-found.tsx` — this was its byte-identical duplicate (E-02). */
export default function DashboardNotFound() {
  return <ErrorState variant="fullscreen" kind="not-found" />
}
