// app/dashboard/institution-admin/institution/profile/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InstitutionProfilePage from "@/components/institutions/InstitutionProfilePage";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const institutionId = searchParams.get("institution");

  if (!institutionId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No institution specified. Please go back to the dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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