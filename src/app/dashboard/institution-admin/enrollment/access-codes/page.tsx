"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import AccessCodesPage from "@/components/enrollment/AccessCodesPage";

/**
 * AC-001. The page the institution dashboard's "Generate Codes" button points
 * at. It did not exist, so the button led to a 404.
 *
 * The institution comes from the query string the dashboard already builds,
 * and falls back to the admin's own — a link that loses its parameter should
 * land on their institution rather than on an error.
 */
export default function Page() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const institutionId =
    searchParams?.get("institution") || user?.primary_institution_id || null;

  if (!institutionId) {
    return (
      <div className="p-6">
        <div className="mx-auto flex max-w-lg items-start gap-3 rounded-lg border border-border bg-muted/40 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold text-foreground">No institution to show codes for</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Access codes belong to an institution&rsquo;s private courses, and this account is
              not associated with one.
            </p>
            <Link
              href="/dashboard/institution-admin"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AccessCodesPage institutionId={institutionId} />;
}
