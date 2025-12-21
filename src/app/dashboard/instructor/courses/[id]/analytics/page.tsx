"use client";

import { Suspense } from "react";
import CourseAnalyticsPage from "@/components/course/CourseAnalyticsPage";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

function CourseAnalyticsContent() {
  const params = useParams();
  const courseId = params.id as string;
  
  return <CourseAnalyticsPage courseId={courseId} />;
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
