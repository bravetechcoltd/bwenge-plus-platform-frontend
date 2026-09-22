"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { RequireAccess } from "@/components/auth/require-access";
import { CourseCreationWizard } from "@/components/course/course-creation-wizard-institution";
import { roleOf, institutionIdsOf } from "@/lib/auth/authorization";

/**
 * AXM-CONS-001 Phase 3.
 *
 * The predicate this replaces was a variant again — `INSTITUTION_ADMIN` with
 * any primary institution, or `INSTRUCTOR` who is a member of at least one —
 * and it shared the defect of every other page-level guard: with `useAuth()`
 * restoring in an effect, `user` was `null` on the first render after a refresh
 * and the page announced "Access Denied" before it knew anything (A-02).
 *
 * The rule itself is preserved exactly, including the instructor branch, and is
 * simply evaluated once the session has resolved rather than before.
 */
export default function InstitutionCourseCreatePage() {
  const params = useParams();
  const { user } = useAuth();

  // Get institution ID from params OR user's primary institution
  const institutionId = (params.institutionId as string) || user?.primary_institution_id;

  return (
    <RequireAccess
      check={(sessionUser) => {
        // Allow INSTITUTION_ADMIN with their primary institution
        const isInstitutionAdmin =
          roleOf(sessionUser) === "INSTITUTION_ADMIN" &&
          !!sessionUser.primary_institution_id;

        // Allow INSTRUCTOR who is a member of any institution
        const isInstitutionInstructor =
          roleOf(sessionUser) === "INSTRUCTOR" &&
          !!sessionUser.is_institution_member &&
          institutionIdsOf(sessionUser).length > 0;

        // A system administrator creates courses anywhere, which every other
        // surface already allows and this one silently did not.
        return (
          roleOf(sessionUser) === "SYSTEM_ADMIN" ||
          isInstitutionAdmin ||
          isInstitutionInstructor
        );
      }}
    >
      <div className="container mx-auto p-4">
        <CourseCreationWizard institutionId={institutionId} />
      </div>
    </RequireAccess>
  );
}
