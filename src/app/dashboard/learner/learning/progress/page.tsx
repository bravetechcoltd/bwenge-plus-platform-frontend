"use client";

import { Suspense } from "react";
import LearnerProgressPage from "@/components/learner/LearnerProgressPage";
import { Loader2 } from "lucide-react";

function ProgressContent() {
  return <LearnerProgressPage />;
}

export default function ProgressRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ProgressContent />
    </Suspense>
  );
}