"use client";

import { Suspense } from "react";
import CourseAnalyticsPage from "@/components/course/CourseAnalyticsPage";
import { Loader2 } from "lucide-react";

function CourseAnalyticsContent() {
  return <CourseAnalyticsPage />;
}

export default function CourseAnalyticsRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CourseAnalyticsContent />
    </Suspense>
  );
}