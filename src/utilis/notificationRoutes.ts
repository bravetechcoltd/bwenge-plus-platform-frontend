import type { NotificationItem } from "@/lib/features/notifications/notificationSlice";

/**
 * Where a notification takes you (NOTIF-ROUTE-001).
 *
 * ── What was wrong ─────────────────────────────────────────────────────────
 *
 * This resolver keyed only on `entity_type`, which has seven values, and used
 * them to answer for twenty-four distinct notification types. Six of the
 * nineteen paths it could emit did not exist, so clicking the notification
 * landed on a 404. "Enrollment Approved" was one of them: it returned
 * `/dashboard/learner/learning`, and `learning` is a route *group* — it holds
 * `/courses`, `/progress`, `/completed` and `/saved`, but has no `page.tsx` of
 * its own. The others were `/dashboard/learner/assignments`,
 * `/dashboard/learner/enrollments`, `/dashboard/instructor/enrollments`,
 * `/dashboard/institution-admin/users` and `/dashboard/system-admin/security`
 * — every one a parent segment mistaken for a page.
 *
 * ── The rule now ───────────────────────────────────────────────────────────
 *
 * `notification_type` decides, because it is what the user actually clicked:
 * ASSESSMENT_GRADED belongs on the graded list, not on a generic assessments
 * page. `entity_type` is kept only as a fallback, so a type the backend adds
 * before this file knows about it still lands somewhere sensible instead of
 * nowhere. The role's own dashboard is the last resort, and always exists.
 *
 * Every literal below is a real `page.tsx`. The check script re-derives the
 * route table from `src/app/**` and fails if any path here stops existing, so
 * this cannot drift back out of sync silently.
 *
 * ── Why staff screens are not deep-linked ──────────────────────────────────
 *
 * Only `COURSE` notifications carry a course id in `entity_id`. An
 * `ENROLLMENT` one carries an *enrollment* id — `onEnrollmentApproved` passes
 * `enrollmentId` — so building a course URL from an enrolment notification
 * would 404 on a well-formed uuid, which is the same bug wearing a different
 * hat. Deep links are therefore limited to the case where the id's type is
 * known, and staff keep their management list, which is where they can act on
 * the thing they were told about.
 */

type Role = "SYSTEM_ADMIN" | "INSTITUTION_ADMIN" | "INSTRUCTOR" | "LEARNER";

/** The role dashboards. Each is a real page, and the final fallback. */
const HOME: Record<Role, string> = {
  SYSTEM_ADMIN: "/dashboard/system-admin",
  INSTITUTION_ADMIN: "/dashboard/institution-admin",
  INSTRUCTOR: "/dashboard/instructor",
  LEARNER: "/dashboard/learner",
};

/**
 * The precise destination, per notification type and recipient role.
 *
 * A type only lists the roles that actually receive it; anything else falls
 * through to the entity table below.
 */
const BY_TYPE: Record<string, Partial<Record<Role, string>>> = {
  // ── Learner ──────────────────────────────────────────────────────────────
  // The enrolment itself is the subject, so the enrolled-courses list is where
  // the outcome is visible. This is the path that used to 404.
  ENROLLMENT_APPROVED: { LEARNER: "/dashboard/learner/learning/courses" },
  ENROLLMENT_REJECTED: { LEARNER: "/dashboard/learner/learning/courses" },
  ENROLLMENT_PENDING: { LEARNER: "/dashboard/learner/learning/courses" },

  // A grade is on the graded list, not the generic assignments group.
  ASSESSMENT_GRADED: {
    LEARNER: "/dashboard/learner/assignments/graded",
    INSTRUCTOR: "/dashboard/instructor/assessments",
  },
  NEW_LESSON_PUBLISHED: { LEARNER: "/dashboard/learner/learning/courses" },
  CERTIFICATE_ISSUED: {
    LEARNER: "/dashboard/learner/certificates",
    INSTRUCTOR: "/dashboard/instructor/certificates",
    INSTITUTION_ADMIN: "/dashboard/institution-admin/students",
  },
  // A deadline is actionable on what is still outstanding.
  COURSE_DEADLINE_REMINDER: {
    LEARNER: "/dashboard/learner/assignments/pending",
  },

  // ── Institution admin ────────────────────────────────────────────────────
  NEW_ENROLLMENT_REQUEST: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/enrollment/requests",
    INSTRUCTOR: "/dashboard/instructor/enrollment/requests",
    SYSTEM_ADMIN: "/dashboard/system-admin/enrollment-requests",
  },
  NEW_INSTRUCTOR_JOINED: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/users/instructors",
    SYSTEM_ADMIN: "/dashboard/system-admin/instructors",
  },
  NEW_STUDENT_JOINED: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/students",
    SYSTEM_ADMIN: "/dashboard/system-admin/students",
  },
  COURSE_PUBLISHED: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/courses",
    INSTRUCTOR: "/dashboard/instructor/courses",
    SYSTEM_ADMIN: "/dashboard/system-admin/courses",
    LEARNER: "/dashboard/learner/browse/all",
  },
  COURSE_FLAGGED: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/courses",
    SYSTEM_ADMIN: "/dashboard/system-admin/courses/moderation",
  },
  BULK_ENROLLMENT_COMPLETED: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/enrollment/bulk",
    SYSTEM_ADMIN: "/dashboard/system-admin/enrollments",
  },
  ACCESS_CODE_USED: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/enrollment/access-codes",
  },
  // Deliberately the review surface, not a verdict screen (AS-CAM-001 §15).
  ATTEMPT_REVIEW_SUGGESTED: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/assessments",
    INSTRUCTOR: "/dashboard/instructor/assessments",
    SYSTEM_ADMIN: "/dashboard/system-admin/assessments",
  },

  // ── System admin ─────────────────────────────────────────────────────────
  NEW_INSTITUTION_REGISTRATION: {
    SYSTEM_ADMIN: "/dashboard/system-admin/institutions",
  },
  NEW_INSTITUTION_ADMIN: {
    SYSTEM_ADMIN: "/dashboard/system-admin/users/institution-admins",
  },
  CONTENT_MODERATION_FLAG: {
    SYSTEM_ADMIN: "/dashboard/system-admin/courses/moderation",
  },
  SYSTEM_HEALTH_ALERT: {
    SYSTEM_ADMIN: "/dashboard/system-admin/security/health",
  },
  ENROLLMENT_SPIKE: { SYSTEM_ADMIN: "/dashboard/system-admin/enrollments" },
  NEW_INSTRUCTOR_APPLICATION: {
    SYSTEM_ADMIN: "/dashboard/system-admin/applications",
  },
};

/**
 * The coarse fallback, by `entity_type`.
 *
 * Reached when the backend sends a notification type this build has not seen.
 * Less precise than the table above, but never a dead end.
 */
const BY_ENTITY: Record<string, Partial<Record<Role, string>>> = {
  ENROLLMENT: {
    LEARNER: "/dashboard/learner/learning/courses",
    INSTRUCTOR: "/dashboard/instructor/enrollment/requests",
    INSTITUTION_ADMIN: "/dashboard/institution-admin/enrollments",
    SYSTEM_ADMIN: "/dashboard/system-admin/enrollments",
  },
  COURSE: {
    LEARNER: "/dashboard/learner/learning/courses",
    INSTRUCTOR: "/dashboard/instructor/courses",
    INSTITUTION_ADMIN: "/dashboard/institution-admin/courses",
    SYSTEM_ADMIN: "/dashboard/system-admin/courses",
  },
  INSTITUTION: {
    INSTITUTION_ADMIN: "/dashboard/institution-admin/institution/profile",
    SYSTEM_ADMIN: "/dashboard/system-admin/institutions",
  },
  USER: {
    INSTRUCTOR: "/dashboard/instructor/students",
    INSTITUTION_ADMIN: "/dashboard/institution-admin/users/members",
    SYSTEM_ADMIN: "/dashboard/system-admin/users",
  },
  ASSESSMENT: {
    LEARNER: "/dashboard/learner/assignments/pending",
    INSTRUCTOR: "/dashboard/instructor/assessments",
    INSTITUTION_ADMIN: "/dashboard/institution-admin/assessments",
    SYSTEM_ADMIN: "/dashboard/system-admin/assessments",
  },
  CERTIFICATE: {
    LEARNER: "/dashboard/learner/certificates",
    INSTRUCTOR: "/dashboard/instructor/certificates",
    INSTITUTION_ADMIN: "/dashboard/institution-admin/students",
    SYSTEM_ADMIN: "/dashboard/system-admin/students",
  },
  SYSTEM: { SYSTEM_ADMIN: "/dashboard/system-admin/security/health" },
};

/**
 * Roles with no dashboard of their own — CONTENT_CREATOR is the live example
 * — read as learners, which is what the dashboard guard does with them too.
 */
function normaliseRole(role: string | null | undefined): Role {
  switch (role) {
    case "SYSTEM_ADMIN":
    case "INSTITUTION_ADMIN":
    case "INSTRUCTOR":
    case "LEARNER":
      return role;
    default:
      return "LEARNER";
  }
}

/**
 * True when `entity_id` is known to hold a course id.
 *
 * Only `COURSE` notifications qualify. See the note above on enrolment ids.
 */
function isCourseEntity(notification: NotificationItem): boolean {
  return (
    notification.entity_type === "COURSE" && Boolean(notification.entity_id)
  );
}

export function resolveNotificationRoute(
  notification: NotificationItem,
  role: string
): string {
  const r = normaliseRole(role);
  const { notification_type, entity_type } = notification;

  // A learner told about their own course goes to the course itself rather
  // than to a list. Both `/courses/[id]` and `/courses/[id]/learn` exist.
  if (r === "LEARNER" && isCourseEntity(notification)) {
    return notification_type === "NEW_LESSON_PUBLISHED"
      ? `/courses/${notification.entity_id}/learn`
      : `/courses/${notification.entity_id}`;
  }

  return (
    BY_TYPE[notification_type]?.[r] ?? BY_ENTITY[entity_type]?.[r] ?? HOME[r]
  );
}

/**
 * Every static path this module can return, for the route-existence test.
 *
 * Exported so the check reads the real tables rather than a hand-copied list
 * that could fall out of step with them.
 */
export const __ALL_STATIC_ROUTES__: string[] = [
  ...Object.values(HOME),
  ...Object.values(BY_TYPE).flatMap((m) => Object.values(m)),
  ...Object.values(BY_ENTITY).flatMap((m) => Object.values(m)),
].filter((p): p is string => typeof p === "string");
