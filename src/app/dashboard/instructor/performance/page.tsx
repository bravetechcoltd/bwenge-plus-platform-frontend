"use client"

import { CohortPerformance } from "@/components/learning/academic-performance"

/**
 * Learner performance for an instructor's own courses (LM-001 §7).
 *
 * The scope is the server's: it resolves the instructor's courses and returns
 * only learners enrolled in them. This page passes no filter of its own.
 */
export default function InstructorPerformanceRoute() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
      <header className="mb-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
          Learner performance
        </h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          How learners on your courses are doing, and who needs attention.
        </p>
      </header>
      <CohortPerformance />
    </div>
  )
}
