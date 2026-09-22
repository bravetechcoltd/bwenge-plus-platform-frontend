"use client"

import { MyPerformance } from "@/components/learning/academic-performance"

/**
 * The learner's own academic record (LM-001 §5, §6, §13).
 *
 * Everything shown is the learner's own; the endpoint behind it never takes an
 * id, so there is no scope to get wrong.
 */
export default function LearnerPerformanceRoute() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-4 sm:py-5">
      <header className="mb-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">My performance</h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Your marks across every course, and the record of how you got them.
        </p>
      </header>
      <MyPerformance />
    </div>
  )
}
