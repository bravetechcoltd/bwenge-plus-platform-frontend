import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BulkImportPage from "@/components/users/BulkImportPage";

export default function BulkImportRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <BulkImportPage />
    </Suspense>
  );
}