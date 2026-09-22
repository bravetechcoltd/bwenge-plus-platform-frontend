"use client";

import { RequireAccess } from "@/components/auth/require-access";
import { CourseDraftsView } from "@/components/course/course-drafts-view";
import { roleOf } from "@/lib/auth/authorization";

/**
 * Saved course drafts (CD-001 §2).
 *
 * The guard matches this role's course-creation page: somebody who may not
 * start a course has no drafts to manage. The service scopes every query to
 * the signed-in author regardless, so this decides who sees the screen, not
 * whose drafts appear on it.
 */
export default function SystemAdminCourseDraftsPage() {
  return (
    <RequireAccess
      check={(sessionUser) =>
        roleOf(sessionUser) === "SYSTEM_ADMIN"
      }
    >
      <div className="container mx-auto p-4">
        <CourseDraftsView createHref={"/dashboard/system-admin/courses/create"} />
      </div>
    </RequireAccess>
  );
}
