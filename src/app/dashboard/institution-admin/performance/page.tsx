"use client"

import { CohortPerformance } from "@/components/learning/academic-performance"

/**
 * Institution-wide academic performance (LM-001 §8).
 *
 * Strictly isolated: the server scopes to the admin's own institution and an
 * admin with no institution is refused rather than shown everything.
 */
export default function InstitutionPerformanceRoute() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
      <header className="mb-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
          Academic performance
        </h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Every learner in your institution, with their marks and progress.
        </p>
      </header>
      <CohortPerformance />
    </div>
  )
}
