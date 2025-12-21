import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import InviteUsersPage from "@/components/users/InviteUsersPage";

export default function InviteUsersRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <InviteUsersPage />
    </Suspense>
  );
}