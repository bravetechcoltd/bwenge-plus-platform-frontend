"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/features/notifications/notificationSlice";
import { resolveNotificationRoute } from "@/utilis/notificationRoutes";
import { useRealtimeEvents } from "@/hooks/use-realtime";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ==================== NOTIFICATION STYLING ====================
function getNotificationStyle(type: string) {
  switch (type) {
    case "ENROLLMENT_APPROVED":
      return { color: "border-l-green-500", icon: CheckCheck, iconColor: "text-green-500" };
    case "ENROLLMENT_REJECTED":
      return { color: "border-l-red-500", icon: AlertCircle, iconColor: "text-red-500" };
    case "ENROLLMENT_PENDING":
      return { color: "border-l-amber-500", icon: Clock, iconColor: "text-amber-500" };
    case "ASSESSMENT_GRADED":
      return { color: "border-l-blue-500", icon: FileText, iconColor: "text-blue-500" };
    case "NEW_LESSON_PUBLISHED":
      return { color: "border-l-blue-500", icon: BookOpen, iconColor: "text-blue-500" };
    case "CERTIFICATE_ISSUED":
      return { color: "border-l-green-500", icon: Award, iconColor: "text-green-500" };
    case "COURSE_DEADLINE_REMINDER":
      return { color: "border-l-amber-500", icon: Clock, iconColor: "text-amber-500" };
    case "NEW_ENROLLMENT_REQUEST":
      return { color: "border-l-blue-500", icon: UserPlus, iconColor: "text-blue-500" };
    case "NEW_INSTRUCTOR_JOINED":
      return { color: "border-l-green-500", icon: GraduationCap, iconColor: "text-green-500" };
    case "NEW_STUDENT_JOINED":
      return { color: "border-l-green-500", icon: Users, iconColor: "text-green-500" };
    case "COURSE_PUBLISHED":
      return { color: "border-l-blue-500", icon: BookOpen, iconColor: "text-blue-500" };
    case "COURSE_FLAGGED":
      return { color: "border-l-red-500", icon: AlertCircle, iconColor: "text-red-500" };
    case "BULK_ENROLLMENT_COMPLETED":
      return { color: "border-l-green-500", icon: Users, iconColor: "text-green-500" };
    case "ACCESS_CODE_USED":
      return { color: "border-l-blue-500", icon: Key, iconColor: "text-blue-500" };
    case "NEW_INSTITUTION_REGISTRATION":
      return { color: "border-l-blue-500", icon: Shield, iconColor: "text-blue-500" };
    case "NEW_INSTITUTION_ADMIN":
      return { color: "border-l-blue-500", icon: UserPlus, iconColor: "text-blue-500" };
    case "CONTENT_MODERATION_FLAG":
      return { color: "border-l-red-500", icon: AlertCircle, iconColor: "text-red-500" };
    case "SYSTEM_HEALTH_ALERT":
      return { color: "border-l-red-500", icon: Server, iconColor: "text-red-500" };
    case "ENROLLMENT_SPIKE":
      return { color: "border-l-amber-500", icon: TrendingUp, iconColor: "text-amber-500" };
    case "NEW_INSTRUCTOR_APPLICATION":
      return { color: "border-l-blue-500", icon: UserPlus, iconColor: "text-blue-500" };
    default:
      return { color: "border-l-gray-500", icon: Bell, iconColor: "text-gray-500" };
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
  return date.toLocaleDateString();
}

// ==================== NOTIFICATION ITEM ====================
function NotificationItemRow({
  notification,
  role,
  onRead,
}: {
  notification: NotificationItem;
  role: string;
  onRead: (n: NotificationItem) => void;
}) {
  const style = getNotificationStyle(notification.notification_type);
  const Icon = style.icon;

  return (
    <button
      onClick={() => onRead(notification)}
      className={cn(
        "w-full text-left px-3 py-2.5 border-l-[3px] transition-colors hover:bg-muted/60",
        style.color,
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn("mt-0.5 flex-shrink-0", style.iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "text-[13px] leading-tight truncate",
                !notification.is_read
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/80"
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
            {notification.body}
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {getRelativeTime(notification.created_at)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ==================== MAIN DROPDOWN ====================
export default function NotificationDropdown({
  actualRole,
}: {
  actualRole: string;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, unreadCount, isLoading } = useAppSelector(
    (state) => state.notifications
  );
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch + fallback polling (long interval since we have real-time now)
  useEffect(() => {
    dispatch(fetchUnreadCount());
    dispatch(fetchNotifications({ page: 1, limit: 10 }));

    // Fallback polling at 2 minutes (safety net, socket handles most updates)
    pollingRef.current = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 120000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [dispatch]);

  // ── Real-time: Socket-based notification updates ──────────────────────────
  useRealtimeEvents({
    "new-notification": () => {
      // Re-fetch notifications list and unread count when a new one arrives
      dispatch(fetchNotifications({ page: 1, limit: 10 }));
      dispatch(fetchUnreadCount());
    },
    "unread-count-updated": (data: { unreadCount: number }) => {
      // Directly update count without extra API call
      dispatch(fetchUnreadCount());
    },
    "notification-marked-read": () => {
      // Sync read state across tabs/devices
      dispatch(fetchNotifications({ page: 1, limit: 10 }));
    },
    "all-notifications-read": () => {
      // Sync all-read across tabs/devices
      dispatch(fetchNotifications({ page: 1, limit: 10 }));
      dispatch(fetchUnreadCount());
    },
  });

  const handleRead = useCallback(
    (notification: NotificationItem) => {
      if (!notification.is_read) {
        dispatch(markNotificationAsRead(notification.id));
      }
      const route = resolveNotificationRoute(notification, actualRole);
      router.push(route);
    },
    [dispatch, router, actualRole]
  );

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllNotificationsAsRead());
  }, [dispatch]);

  const rolePath =
    actualRole === "SYSTEM_ADMIN"
      ? "system-admin"
      : actualRole === "INSTITUTION_ADMIN"
        ? "institution-admin"
        : actualRole === "INSTRUCTOR"
          ? "instructor"
          : "learner";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded-lg"
        >
          <Bell className="w-4 h-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 rounded-xl shadow-xl"
        sideOffset={8}
      >
        {/* Zone 1: Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Mark all read
              </button>
            </div>
          )}
        </div>

        {/* Zone 2: Notification List */}
        <ScrollArea className="max-h-[400px]">
          {isLoading && items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((notification) => (
                <NotificationItemRow
                  key={notification.id}
                  notification={notification}
                  role={actualRole}
                  onRead={handleRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Zone 3: Footer */}
        <div className="border-t border-border">
          <Link
            href={`/dashboard/${rolePath}/notifications`}
            className="block text-center py-2.5 text-xs font-medium text-primary hover:text-primary/80 hover:bg-muted/50 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
