"use client";

import { Suspense } from "react";
import LearnerCompletedPage from "@/components/learner/LearnerCompletedPage";
import { Loader2 } from "lucide-react";

function CompletedContent() {
  return <LearnerCompletedPage />;
}

export default function CompletedRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CompletedContent />
    </Suspense>
  );
}