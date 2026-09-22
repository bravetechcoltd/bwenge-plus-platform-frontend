"use client";

import { Suspense } from "react";
import LearnerGradesPage from "@/components/learner/assignments/LearnerGradesPage";
import { Loader2 } from "lucide-react";

function GradesContent() {
  return <LearnerGradesPage />;
}

export default function GradesRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <GradesContent />
    </Suspense>
  );
}