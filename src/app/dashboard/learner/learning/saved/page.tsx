"use client";

import { Suspense } from "react";
import LearnerSavedCoursesPage from "@/components/learner/LearnerSavedCoursesPage";
import { Loader2 } from "lucide-react";

function SavedCoursesContent() {
  return <LearnerSavedCoursesPage />;
}

export default function SavedCoursesRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SavedCoursesContent />
    </Suspense>
  );
}