"use client"

import { CohortPerformance } from "@/components/learning/academic-performance"

/**
 * Global academic performance (LM-001 §9, §10).
 *
 * Includes learners with no institution, shown as independent rather than
 * attached to one for the convenience of the report.
 */
export default function SystemPerformanceRoute() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
      <header className="mb-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
          Academic performance
        </h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Every learner on the platform, institution-linked and independent.
        </p>
      </header>
      <CohortPerformance />
    </div>
  )
}
