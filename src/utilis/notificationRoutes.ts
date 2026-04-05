import type { NotificationItem } from "@/lib/features/notifications/notificationSlice";

const rolePaths: Record<string, string> = {
  SYSTEM_ADMIN: "system-admin",
  INSTITUTION_ADMIN: "institution-admin",
  INSTRUCTOR: "instructor",
  LEARNER: "learner",
};

export function resolveNotificationRoute(
  notification: NotificationItem,
  role: string
): string {
  const base = `/dashboard/${rolePaths[role] || "learner"}`;
  const { entity_type, entity_id } = notification;

  switch (entity_type) {
    case "ENROLLMENT":
      if (role === "INSTITUTION_ADMIN")
        return `${base}/enrollments`;
      if (role === "INSTRUCTOR")
        return `${base}/enrollments`;
      if (role === "LEARNER")
        return `${base}/learning`;
      return `${base}/enrollments`;

    case "COURSE":
      if (role === "SYSTEM_ADMIN")
        return `${base}/courses`;
      if (role === "INSTITUTION_ADMIN")
        return `${base}/courses`;
      if (role === "INSTRUCTOR")
        return `${base}/courses`;
      if (role === "LEARNER" && entity_id)
        return `${base}/learning`;
      return `${base}/courses`;

    case "INSTITUTION":
      if (role === "SYSTEM_ADMIN")
        return `${base}/institutions`;
      if (role === "INSTITUTION_ADMIN")
        return `${base}/institution/profile${entity_id ? `?institution=${entity_id}` : ""}`;
      return base;

    case "USER":
      if (role === "SYSTEM_ADMIN")
        return `${base}/users`;
      if (role === "INSTITUTION_ADMIN")
        return `${base}/users`;
      return base;

    case "ASSESSMENT":
      if (role === "LEARNER")
        return `${base}/assignments`;
      if (role === "INSTRUCTOR")
        return `${base}/assessments`;
      return base;

    case "CERTIFICATE":
      if (role === "LEARNER")
        return `${base}/certificates`;
      return base;

    case "SYSTEM":
      if (role === "SYSTEM_ADMIN")
        return `${base}/security`;
      return base;

    default:
      return base;
  }
}
