"use client";

import { Suspense } from "react";
import InstructorAnalyticsPage from "@/components/instructor/InstructorAnalyticsPage";
import { Loader2 } from "lucide-react";

function AnalyticsContent() {
  return <InstructorAnalyticsPage />;
}

export default function InstructorAnalyticsRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}