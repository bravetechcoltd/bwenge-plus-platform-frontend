"use client";

import { Suspense } from "react";
import BulkEnrollmentPage from "@/components/enrollment/BulkEnrollmentPage";
import { Loader2 } from "lucide-react";

function BulkEnrollmentContent() {
  return <BulkEnrollmentPage />;
}

export default function BulkEnrollmentRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <BulkEnrollmentContent />
    </Suspense>
  );
}