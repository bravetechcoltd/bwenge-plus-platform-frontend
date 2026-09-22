"use client";

import { useParams } from "next/navigation";
import { RequireAccess } from "@/components/auth/require-access";
import { CourseCreationWizard } from "@/components/course/course-creation-wizard-institution";

/**
 * AXM-CONS-001 §8.1 — findings A-02, A-06 #1, A-08, A-09.
 *
 * This page used to gate itself on
 *
 *     user?.bwenge_role === "INSTITUTION_ADMIN" &&
 *     user?.primary_institution_id === institutionId
 *
 * and render "Access Denied — You don't have permission to create courses for
 * this institution" whenever that was false. It was false in two quite
 * different situations, and the page could not tell them apart.
 *
 * The first was temporary: `useAuth()` restored the session in an effect, so
 * on the first render after every refresh `user` was `null` and the guard
 * confidently refused. The second was permanent: the predicate reads
 * `users.bwenge_role` and `users.primary_institution_id`, but the authority
 * for institution administration is the `institution_members` table. Of the
 * three active ADMINs of the institution this route is most often opened for,
 * two were locked out for good — a SYSTEM_ADMIN, and a member whose
 * `bwenge_role` is null. Five of sixteen memberships platform-wide.
 *
 * `RequireAccess` cannot render a denial while the answer is unknown, and
 * `canManageInstitutionCourses` is the union of every rule the system already
 * honours, checked against the server's own membership answer. The wizard and
 * everything below it is unchanged.
 */
export default function InstitutionCourseCreatePage() {
  const params = useParams();
  const institutionId = params.institutionId as string;

  return (
    <RequireAccess institutionId={institutionId} capability="manage-courses">
      <div className="container mx-auto p-4">
        <CourseCreationWizard />
      </div>
    </RequireAccess>
  );
}
