"use client";

import { Suspense } from "react";
import InstructorCourseMaterialsPage from "@/components/instructor/InstructorCourseMaterialsPage";
import { Loader2 } from "lucide-react";

function CourseMaterialsContent() {
  return <InstructorCourseMaterialsPage />;
}

export default function CourseMaterialsRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CourseMaterialsContent />
    </Suspense>
  );
}