import { ResolvingState } from "@/components/system/error-state"

/**
 * Segment loading state (AXM-CONS-001 F15, finding E-04).
 *
 * `src/app/courses/loading.tsx` was the only one in the application, so every
 * other route transition was an unannounced pause — exactly the ambiguity that
 * made a premature "not found" plausible to a reader.
 */
export default function Loading() {
  return <ResolvingState variant="page" />
}
