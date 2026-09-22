"use client";

import { Suspense } from "react";
import SystemAdminInstitutionAnalyticsPage from "@/components/system-admin/SystemAdminInstitutionAnalyticsPage";
import { Loader2 } from "lucide-react";

function AnalyticsContent() {
  return <SystemAdminInstitutionAnalyticsPage />;
}

export default function InstitutionAnalyticsRoute() {
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