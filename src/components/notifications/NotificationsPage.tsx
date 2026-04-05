"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/features/notifications/notificationSlice";
import { resolveNotificationRoute } from "@/utilis/notificationRoutes";
import {
  Bell,
  CheckCheck,
  BookOpen,
  UserPlus,
  Award,
  AlertCircle,
  GraduationCap,
  Shield,
  Clock,
  FileText,
  Key,
  Users,
  TrendingUp,
  Server,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getNotificationStyle(type: string) {
  switch (type) {
    case "ENROLLMENT_APPROVED":
      return { color: "border-l-green-500 bg-green-50 dark:bg-green-950/20", icon: CheckCheck, iconColor: "text-green-600" };
    case "ENROLLMENT_REJECTED":
      return { color: "border-l-red-500 bg-red-50 dark:bg-red-950/20", icon: AlertCircle, iconColor: "text-red-600" };
    case "ENROLLMENT_PENDING":
      return { color: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20", icon: Clock, iconColor: "text-amber-600" };
    case "ASSESSMENT_GRADED":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: FileText, iconColor: "text-blue-600" };
    case "NEW_LESSON_PUBLISHED":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: BookOpen, iconColor: "text-blue-600" };
    case "CERTIFICATE_ISSUED":
      return { color: "border-l-green-500 bg-green-50 dark:bg-green-950/20", icon: Award, iconColor: "text-green-600" };
    case "COURSE_DEADLINE_REMINDER":
      return { color: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20", icon: Clock, iconColor: "text-amber-600" };
    case "NEW_ENROLLMENT_REQUEST":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: UserPlus, iconColor: "text-blue-600" };
    case "NEW_INSTRUCTOR_JOINED":
      return { color: "border-l-green-500 bg-green-50 dark:bg-green-950/20", icon: GraduationCap, iconColor: "text-green-600" };
    case "NEW_STUDENT_JOINED":
      return { color: "border-l-green-500 bg-green-50 dark:bg-green-950/20", icon: Users, iconColor: "text-green-600" };
    case "COURSE_PUBLISHED":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: BookOpen, iconColor: "text-blue-600" };
    case "COURSE_FLAGGED":
      return { color: "border-l-red-500 bg-red-50 dark:bg-red-950/20", icon: AlertCircle, iconColor: "text-red-600" };
    case "BULK_ENROLLMENT_COMPLETED":
      return { color: "border-l-green-500 bg-green-50 dark:bg-green-950/20", icon: Users, iconColor: "text-green-600" };
    case "ACCESS_CODE_USED":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: Key, iconColor: "text-blue-600" };
    case "NEW_INSTITUTION_REGISTRATION":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: Shield, iconColor: "text-blue-600" };
    case "NEW_INSTITUTION_ADMIN":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: UserPlus, iconColor: "text-blue-600" };
    case "CONTENT_MODERATION_FLAG":
      return { color: "border-l-red-500 bg-red-50 dark:bg-red-950/20", icon: AlertCircle, iconColor: "text-red-600" };
    case "SYSTEM_HEALTH_ALERT":
      return { color: "border-l-red-500 bg-red-50 dark:bg-red-950/20", icon: Server, iconColor: "text-red-600" };
    case "ENROLLMENT_SPIKE":
      return { color: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20", icon: TrendingUp, iconColor: "text-amber-600" };
    case "NEW_INSTRUCTOR_APPLICATION":
      return { color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20", icon: UserPlus, iconColor: "text-blue-600" };
    default:
      return { color: "border-l-gray-500 bg-muted/30", icon: Bell, iconColor: "text-gray-500" };
  }
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: diffDay > 365 ? "numeric" : undefined,
  });
}

export default function NotificationsPage({ role }: { role: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, unreadCount, isLoading, pagination } = useAppSelector(
    (state) => state.notifications
  );
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const refetchNotifications = useCallback(() => {
    const isReadParam =
      filter === "unread" ? false : filter === "read" ? true : undefined;
    dispatch(
      fetchNotifications({ page: currentPage, limit: 15, is_read: isReadParam })
    );
  }, [dispatch, currentPage, filter]);

  useEffect(() => {
    refetchNotifications();
  }, [refetchNotifications]);

  // Real-time: refetch when new notifications arrive or read status changes
  useRealtimeEvent("new-notification", refetchNotifications);
  useRealtimeEvent("all-notifications-read", refetchNotifications);
  useRealtimeEvent("notification-marked-read", refetchNotifications);

  const handleRead = useCallback(
    (notification: NotificationItem) => {
      if (!notification.is_read) {
        dispatch(markNotificationAsRead(notification.id));
      }
      const route = resolveNotificationRoute(notification, role);
      router.push(route);
    },
    [dispatch, router, role]
  );

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllNotificationsAsRead());
  }, [dispatch]);

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "unread", "read"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter(f);
              setCurrentPage(1);
            }}
            className="text-xs capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                  ? "No read notifications"
                  : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          items.map((notification) => {
            const style = getNotificationStyle(notification.notification_type);
            const Icon = style.icon;

            return (
              <button
                key={notification.id}
                onClick={() => handleRead(notification)}
                className={cn(
                  "w-full text-left rounded-lg border-l-4 p-4 transition-all hover:shadow-md",
                  style.color,
                  !notification.is_read
                    ? "ring-1 ring-primary/10"
                    : "opacity-80"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                      notification.is_read
                        ? "bg-muted"
                        : "bg-background shadow-sm"
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5", style.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={cn(
                          "text-sm",
                          !notification.is_read
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/80"
                        )}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.body}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
