"use client";

import { Suspense } from "react";
import LearnerSubmittedAssignmentsPage from "@/components/learner/assignments/LearnerSubmittedAssignmentsPage";
import { Loader2 } from "lucide-react";

function SubmittedContent() {
  return <LearnerSubmittedAssignmentsPage />;
}

export default function SubmittedRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SubmittedContent />
    </Suspense>
  );
}