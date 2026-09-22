"use client"

import { InstitutionCourseManagement } from "@/components/learning/institution-courses"

/**
 * Institution courses and the learners on them (IC-001 §7, §8, §9).
 *
 * Scoped by the server to the admin's own institution. Public MOOCs appear
 * here alongside restricted courses: publishing a course to the public changes
 * who may enrol, not who may manage it (§10).
 */
export default function InstitutionCourseLearnersRoute() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
      <header className="mb-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
          Course learners
        </h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Every course your institution owns, who is enrolled, and how they are doing.
        </p>
      </header>
      <InstitutionCourseManagement />
    </div>
  )
}
