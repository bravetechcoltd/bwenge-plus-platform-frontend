import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ContentCreatorsPage from "@/components/users/ContentCreatorsPage";

export default function ContentCreatorsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ContentCreatorsPage />
    </Suspense>
  );
}