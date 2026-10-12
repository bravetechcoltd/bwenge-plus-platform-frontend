"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useSession } from "@/lib/auth/session"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, RefreshCw } from "lucide-react"

/**
 * The parts all three student pages share (ISTU-001).
 *
 * Courses, Learning Progress and Certificates ask three different questions
 * about one student, and each used to be a dead menu item. They are three
 * pages rather than three tabs on one because each loads a different shape of
 * data at a different cost — but they resolve the student, handle an
 * unresolved session and report an empty or failed load identically, and that
 * part lives here so they cannot drift apart.
 */

/* ── Scope ───────────────────────────────────────────────────────────────── */

export type ScopeState =
  | { kind: "resolving" }
  | { kind: "no-institution" }
  | { kind: "ready"; institutionId: string; studentId: string; token: string }

/**
 * Who is being looked at, and with whose credentials.
 *
 * The session is read from both stores, as everywhere else in this codebase:
 * `useAuth()` is the provider context and `useSession()` resolves
 * `redux.token ?? context.token`. Reading only one is what made the students
 * list itself hang on a skeleton forever.
 *
 * `"resolving"` is a real third state and not a synonym for "signed out". No
 * page below may render "nothing here" while it holds.
 */
export function useStudentScope(): ScopeState {
  const params = useParams()
  const { token: contextToken, user: contextUser } = useAuth()
  const {
    token: sessionToken,
    user: sessionUser,
    status: sessionStatus,
  } = useSession()

  const token = contextToken ?? sessionToken
  const user = contextUser ?? sessionUser
  const studentId = String(
    Array.isArray(params?.studentId) ? params.studentId[0] : params?.studentId ?? ""
  )
  const institutionId = (user as any)?.primary_institution_id as
    | string
    | undefined

  if (sessionStatus === "initializing") return { kind: "resolving" }
  if (!token || !institutionId || !studentId) return { kind: "no-institution" }

  return { kind: "ready", institutionId, studentId, token }
}

/**
 * One list, loaded once the scope resolves.
 *
 * Every page below needs the same four states and the same reload, and each
 * of the sixteen pages that wrote this by hand got the unresolved-session case
 * wrong in the same way, so it is written once.
 */
export function useStudentResource<T>(
  load: (institutionId: string, studentId: string, token: string) => Promise<T>,
  deps: unknown[] = []
) {
  const scope = useStudentScope()
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const ready = scope.kind === "ready"
  const institutionId = ready ? scope.institutionId : ""
  const studentId = ready ? scope.studentId : ""
  const token = ready ? scope.token : ""

  useEffect(() => {
    // Wait while the session is genuinely unresolved — but never leave
    // isLoading true on a resolved "nothing to fetch", which is the whole of
    // the never-ending skeleton this codebase kept reproducing.
    if (scope.kind === "resolving") return

    if (!ready) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    load(institutionId, studentId, token)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: any) => {
        if (cancelled) return
        setData(null)
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Something went wrong loading this student."
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.kind, institutionId, studentId, token, reloadKey, ...deps])

  return {
    scope,
    data,
    isLoading,
    error,
    reload: () => setReloadKey((k) => k + 1),
  }
}

/* ── States ──────────────────────────────────────────────────────────────── */

export function StudentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index} className="border-border/60">
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-14 w-20 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2 w-full" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function LoadFailed({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Could not load this</p>
          {/* The server's own message, not a generic one. An admin who can see
              why a request failed can usually act on it. */}
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="border-dashed border-border/70 bg-muted/20">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="rounded-full bg-background p-3 shadow-sm ring-1 ring-border/60">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="max-w-sm">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

export function NoInstitutionState() {
  return (
    <div className="p-6">
      <Card className="mx-auto max-w-lg border-border/70 bg-muted/30">
        <CardContent className="p-6 text-center">
          <p className="font-semibold text-foreground">
            No institution on this account
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Student records are kept per institution, and this account is not
            associated with one.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ── Presentation ────────────────────────────────────────────────────────── */

export type Tone = "success" | "primary" | "muted" | "warning" | "danger"

const toneClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  primary: "bg-primary/10 text-primary ring-primary/20",
  warning: "bg-warning/15 text-warning-foreground ring-warning/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  muted: "bg-muted text-muted-foreground ring-border",
}

/** A status word. Flat, ringed, no border — the house style for these pages. */
export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** One figure, with its label under it. */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  hint?: string
  tone?: Tone
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-background/70 p-3 ring-1 ring-border/60">
      <div
        className={cn(
          "rounded-lg p-2 ring-1 ring-inset",
          toneClasses[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-bold leading-tight text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

/** A thin progress rail. Shows a hairline at 0 so the track is legible. */
export function ProgressRail({
  value,
  tone = "primary",
  className,
}: {
  value: number
  tone?: "primary" | "success"
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "success" ? "bg-success" : "bg-primary"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
