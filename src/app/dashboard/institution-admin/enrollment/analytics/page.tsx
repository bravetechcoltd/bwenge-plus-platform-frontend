"use client";

import { Suspense } from "react";
import EnrollmentAnalyticsPage from "@/components/enrollment/EnrollmentAnalyticsPage";
import { Loader2 } from "lucide-react";

function EnrollmentAnalyticsContent() {
  return <EnrollmentAnalyticsPage />;
}

export default function EnrollmentAnalyticsRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <EnrollmentAnalyticsContent />
    </Suspense>
  );
}