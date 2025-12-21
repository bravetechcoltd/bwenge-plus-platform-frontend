"use client";

import { Suspense } from "react";
import InstitutionProfilePage from "@/components/institutions/InstitutionProfilePage";
import { Loader2 } from "lucide-react";

function ProfilePageContent() {
  return <InstitutionProfilePage />;
}

export default function InstitutionProfileRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}