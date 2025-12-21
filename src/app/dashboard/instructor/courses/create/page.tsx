"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CourseCreationWizard } from "@/components/course/course-creation-wizard-institution";

export default function InstitutionCourseCreatePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  
  // Get institution ID from params OR user's primary institution
  const institutionId = (params.institutionId as string) || user?.primary_institution_id;

  // Allow INSTITUTION_ADMIN with their primary institution
  const isInstitutionAdmin = user?.bwenge_role === "INSTITUTION_ADMIN" && 
                             user?.primary_institution_id;
  
  // Allow INSTRUCTOR who is a member of any institution
  const isInstitutionInstructor = user?.bwenge_role === "INSTRUCTOR" && 
                                  user?.is_institution_member && 
                                  (user?.institution_ids?.length ?? 0) > 0;

  const hasPermission = isInstitutionAdmin || isInstitutionInstructor;

  if (!hasPermission) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700 mb-4">
            You don't have permission to create courses for this institution.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <CourseCreationWizard institutionId={institutionId} />
    </div>
  );
}