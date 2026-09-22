"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { RequireAccess } from "@/components/auth/require-access";
import { CourseDraftsView } from "@/components/course/course-drafts-view";
import { roleOf, institutionIdsOf } from "@/lib/auth/authorization";

/**
 * Saved course drafts (CD-001 §2).
 *
 * The same guard as this institution's course-creation page, so the two are
 * reachable by exactly the same people.
 */
export default function InstitutionCourseDraftsPage() {
  const params = useParams();
  const { user } = useAuth();
  const institutionId = (params.institutionId as string) || user?.primary_institution_id;

  return (
    <RequireAccess
      check={(sessionUser) => {
        const isInstitutionAdmin =
          roleOf(sessionUser) === "INSTITUTION_ADMIN" && !!sessionUser.primary_institution_id;
        const isInstitutionInstructor =
          roleOf(sessionUser) === "INSTRUCTOR" &&
          !!sessionUser.is_institution_member &&
          institutionIdsOf(sessionUser).length > 0;

        return (
          roleOf(sessionUser) === "SYSTEM_ADMIN" || isInstitutionAdmin || isInstitutionInstructor
        );
      }}
    >
      <div className="container mx-auto p-4">
        <CourseDraftsView
          createHref={`/dashboard/institution-admin/${institutionId}/courses/create`}
        />
      </div>
    </RequireAccess>
  );
}
