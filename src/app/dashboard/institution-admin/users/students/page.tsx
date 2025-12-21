
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import StudentsPage from "@/components/users/StudentsPage";

export default function StudentsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <StudentsPage />
    </Suspense>
  );
}