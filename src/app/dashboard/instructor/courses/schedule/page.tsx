"use client";

import { Suspense } from "react";
import InstructorTeachingSchedulePage from "@/components/instructor/InstructorTeachingSchedulePage";
import { Loader2 } from "lucide-react";

function TeachingScheduleContent() {
  return <InstructorTeachingSchedulePage />;
}

export default function TeachingScheduleRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <TeachingScheduleContent />
    </Suspense>
  );
}