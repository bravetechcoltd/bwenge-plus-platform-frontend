"use client"

import { RequireAccess } from "@/components/auth/require-access"
import { roleOf } from "@/lib/auth/authorization"
import LearnerCourses from "../../../learner/learning/courses/page"

/**
 * An instructor's own enrolled courses (IL-001).
 *
 * Distinct from `/dashboard/instructor/courses`, which lists the courses they
 * *teach*. This is the same list a learner sees, because an instructor taking
 * a course is a learner on it: the same enrolment, the same progress, the same
 * completion rules and the same certificate at the end.
 *
 * The learner screen is reused wholesale rather than rebuilt. It scopes to the
 * authenticated user through the existing enrolment API, so it needs nothing
 * role-specific to be correct here — and a second copy would be a second place
 * for progress and completion to drift out of step.
 */
export default function InstructorLearningCoursesPage() {
  return (
    <RequireAccess
      check={(sessionUser) =>
        roleOf(sessionUser) === "INSTRUCTOR" ||
        roleOf(sessionUser) === "SYSTEM_ADMIN" ||
        roleOf(sessionUser) === "INSTITUTION_ADMIN"
      }
    >
      <LearnerCourses />
    </RequireAccess>
  )
}
