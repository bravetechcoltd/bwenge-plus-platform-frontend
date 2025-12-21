"use client";

import { Suspense } from "react";
import LearnerGradedAssignmentsPage from "@/components/learner/assignments/LearnerGradedAssignmentsPage";
import { Loader2 } from "lucide-react";

function GradedContent() {
  return <LearnerGradedAssignmentsPage />;
}

export default function GradedRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <GradedContent />
    </Suspense>
  );
}