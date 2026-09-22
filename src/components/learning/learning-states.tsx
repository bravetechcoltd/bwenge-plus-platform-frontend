"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  BookOpen,
  Clock,
  Lock,
  RefreshCw,
  WifiOff,
} from "lucide-react"
import type { LearningApiError } from "@/lib/learning/api"

/**
 * Shared loading / empty / error / locked states for the Learning Space
 * (plan §11.4).
 *
 * Two rules drive these:
 *   • a skeleton mirrors the layout it replaces, so nothing jumps when real
 *     content arrives
 *   • an error always says what happened and offers one way forward — the old
 *     Learning Space rendered a bare `error.message` and a "Back to Courses"
 *     button for every failure, including ones the learner could recover from
 */

// ============================================================================
// SKELETONS
// ============================================================================

export function LearningPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border px-4 flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-4 w-56" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-2 w-32 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-80 border-r border-border p-3 space-y-3">
          <Skeleton className="h-9 w-full rounded-md" />
          {Array.from({ length: 3 }).map((_, moduleIndex) => (
            <div key={moduleIndex} className="space-y-2 pt-2">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 4 }).map((_, stepIndex) => (
                <Skeleton key={stepIndex} className="h-9 w-full rounded" />
              ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 px-4 py-8">
          <div className="mx-auto w-full max-w-[820px] space-y-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function LessonContentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[820px] space-y-6 px-4 py-8">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

export function AssessmentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[820px] space-y-6 px-4 py-8">
      <Skeleton className="h-6 w-1/2" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  )
}

// ============================================================================
// EMPTY
// ============================================================================

export function LearningEmptyState({
  title,
  description,
  icon: Icon = BookOpen,
  action,
}: {
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-5" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// LOCKED
// ============================================================================

/**
 * Shown when the server reports a step as locked.
 *
 * The reason comes from the backend (`state_reason`), which is why it can name
 * the specific step that has to come first instead of a generic padlock.
 */
export function LearningLockedState({
  title = "This step is locked",
  reason,
  onGoToNext,
}: {
  title?: string
  reason?: string | null
  onGoToNext?: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {reason || "Complete the previous steps to unlock this one."}
      </p>
      {onGoToNext && (
        <Button onClick={onGoToNext} className="mt-5" size="sm">
          Go to where I left off
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// ERROR
// ============================================================================

/**
 * Maps a `LearningApiError` code to language a learner can act on.
 *
 * The backend refuses with a structured code precisely so this mapping can
 * exist — an access refusal is a different conversation from a network blip.
 */
export function LearningErrorState({
  error,
  courseId,
  onRetry,
}: {
  error: LearningApiError | Error
  courseId?: string
  onRetry?: () => void
}) {
  const router = useRouter()
  const code = (error as LearningApiError).code
  const status = (error as LearningApiError).status

  const config = (() => {
    switch (code) {
      case "NOT_ENROLLED":
        return {
          icon: BookOpen,
          title: "You're not enrolled in this course",
          body: "Enroll to start learning. If you've just requested access, it may still be awaiting approval.",
          primary: courseId
            ? { label: "View course", onClick: () => router.push(`/courses/${courseId}`) }
            : { label: "Browse courses", onClick: () => router.push("/courses") },
        }
      case "ENROLLMENT_INACTIVE":
        return {
          icon: AlertCircle,
          title: "Your enrollment isn't active",
          body: error.message,
          primary: courseId
            ? { label: "View course", onClick: () => router.push(`/courses/${courseId}`) }
            : { label: "My dashboard", onClick: () => router.push("/dashboard") },
        }
      case "ACCESS_EXPIRED":
        return {
          icon: Clock,
          title: "Your access has expired",
          body: "The enrollment period for this course has ended. Contact your institution if you need an extension.",
          primary: { label: "My dashboard", onClick: () => router.push("/dashboard") },
        }
      case "COURSE_NOT_AVAILABLE":
        return {
          icon: AlertCircle,
          title: "This course isn't available",
          body: "It may have been unpublished or archived by its instructor.",
          primary: { label: "Browse courses", onClick: () => router.push("/courses") },
        }
      case "MODULE_LOCKED":
      case "LESSON_LOCKED":
      case "PREREQUISITE_NOT_MET":
        return {
          icon: Lock,
          title: "This step is locked",
          body: error.message,
          primary: onRetry ? { label: "Go back", onClick: onRetry } : undefined,
        }
      // Every way a token can be refused lands here. `authMiddleware` answers
      // 401 in seven different places and only one of them used to name a
      // code, so an expired token arrived as a generic failure and this branch
      // — the only one that offers a way back in — never ran.
      case "SESSION_REVOKED":
      case "UNAUTHENTICATED":
      case "TOKEN_EXPIRED":
      case "INVALID_TOKEN":
        return {
          icon: AlertCircle,
          title: "Please sign in again",
          body:
            code === "TOKEN_EXPIRED"
              ? "Your session has expired. Sign in to pick up where you left off."
              : "Your session has ended.",
          primary: { label: "Sign in", onClick: () => router.push("/login") },
        }
      case "ACCOUNT_INACTIVE":
        return {
          icon: AlertCircle,
          title: "Your account is inactive",
          body: "This account has been deactivated. Contact your administrator to restore access.",
          primary: { label: "Sign in", onClick: () => router.push("/login") },
        }
      case "NETWORK_ERROR":
        return {
          icon: WifiOff,
          title: "You're offline",
          body: "Check your connection — your progress is saved and will sync when you're back.",
          primary: onRetry ? { label: "Try again", onClick: onRetry } : undefined,
        }
      case "RATE_LIMITED":
        return {
          icon: Clock,
          title: "Slow down a moment",
          body: "Too many requests in a short window. Wait a few seconds and try again.",
          primary: onRetry ? { label: "Try again", onClick: onRetry } : undefined,
        }
      case "NOT_FOUND":
        return {
          icon: AlertCircle,
          title: "Not found",
          body: status === 404 ? "This content no longer exists." : error.message,
          primary: { label: "Browse courses", onClick: () => router.push("/courses") },
        }
      default:
        return {
          icon: AlertCircle,
          title: "Something went wrong",
          body: error.message || "We couldn't load this right now.",
          primary: onRetry ? { label: "Try again", onClick: onRetry } : undefined,
        }
    }
  })()

  const Icon = config.icon

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{config.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{config.body}</p>

        <div className="mt-6 flex items-center justify-center gap-2">
          {config.primary && (
            <Button size="sm" onClick={config.primary.onClick}>
              {config.primary.label}
            </Button>
          )}
          {onRetry && config.primary?.label !== "Try again" && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Persistent offline indicator. Writes queue locally and flush on reconnect,
 * so this is informational rather than blocking.
 */
export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning-foreground"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Offline — your progress is saved and will sync when you reconnect.
    </div>
  )
}
