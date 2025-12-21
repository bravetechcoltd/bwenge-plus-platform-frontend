"use client";

import { Suspense } from "react";
import ExportEnrollmentPage from "@/components/enrollment/ExportEnrollmentPage";
import { Loader2 } from "lucide-react";

function ExportEnrollmentContent() {
  return <ExportEnrollmentPage />;
}

export default function ExportEnrollmentRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ExportEnrollmentContent />
    </Suspense>
  );
}