"use client";

import { Suspense } from "react";
import LearnerPendingAssignmentsPage from "@/components/learner/assignments/LearnerPendingAssignmentsPage";
import { Loader2 } from "lucide-react";

function PendingContent() {
  return <LearnerPendingAssignmentsPage />;
}

export default function PendingRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PendingContent />
    </Suspense>
  );
}