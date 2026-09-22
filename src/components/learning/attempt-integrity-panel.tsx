"use client"

/**
 * ============================================================================
 * AttemptIntegrityPanel — the instructor's view of one attempt
 * ============================================================================
 *
 * LS-SEC-002 §18.3, §18.4. Finding LS-15.
 *
 * Sixteen integrity events had accumulated in the database with no endpoint, no
 * admin page and no instructor view. A system generating security evidence into
 * a table nothing reads is not, operationally, generating evidence at all.
 *
 * Three principles shape this panel:
 *
 *  · **The score is never shown without its inputs.** §18.4 requires a reviewer
 *    to be able to derive the number from what is on screen. The weights are
 *    displayed and the arithmetic is shown, because a reviewer who has to trust
 *    an opaque score cannot review anything.
 *
 *  · **Observations that were deliberately not counted are still shown**, marked
 *    as such. A reviewer seeing only the counted events would not know that the
 *    learner also had four sub-grace tab switches that the system correctly
 *    ignored — and that context is what distinguishes a flaky connection from
 *    a pattern.
 *
 *  · **Nothing here changes a grade.** Clearing an event adjusts the score and
 *    the queue, not the result. Any decision to fail a learner is a human one,
 *    made elsewhere, and recorded.
 */

import { useCallback, useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  Loader2,
  ShieldCheck,
  Undo2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { LearningApiError } from "@/lib/learning/api"
import {
  describeIntegrityEvent,
  learningSecurityApi,
  type IntegrityEvent,
  type IntegritySeverity,
} from "@/lib/learning/security-api"

const SEVERITY_TONE: Record<IntegritySeverity, string> = {
  HIGH: "border-destructive/30 bg-destructive/10 text-destructive",
  MEDIUM: "border-warning/30 bg-warning/10 text-warning",
  LOW: "border-border bg-muted text-muted-foreground",
  INFO: "border-border bg-muted/50 text-muted-foreground",
}

function scoreTone(score: number): string {
  if (score >= 90) return "text-success"
  if (score >= 60) return "text-warning"
  return "text-destructive"
}

function formatTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

/**
 * LC-CONS-001 §16.2. How the learner left, in a reviewer's words.
 *
 * The distinction earns its place: a sidebar click and a browser back press
 * are recorded identically by the counter, but they mean different things to
 * someone deciding whether an event is worth acting on.
 */
function describeNavigationReason(reason: string): string {
  switch (reason) {
    case "STEP_CHANGE":
      return "via the course sidebar"
    case "BACK_NAVIGATION":
      return "via the back button"
    case "IN_APP_LINK":
      return "via a link"
    case "PAGE_UNLOAD":
      return "by closing the page"
    default:
      return reason.replace(/_/g, " ").toLowerCase()
  }
}

/** Compact absence duration, for the re-entry row. */
function formatSilence(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.round(minutes / 60)}h`
}

export function AttemptIntegrityPanel({ attemptId }: { attemptId: string }) {
  const { toast } = useToast()
  const [reason, setReason] = useState("")
  const [clearing, setClearing] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR(
    attemptId ? ["attempt-integrity", attemptId] : null,
    () => learningSecurityApi.getAttemptIntegrity(attemptId),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const clear = useCallback(
    async (eventId?: string) => {
      if (reason.trim().length < 3) {
        toast({
          title: "A reason is required",
          description:
            "Say briefly why this is a false positive — the note is kept with the record.",
          variant: "destructive",
        })
        return
      }

      setClearing(eventId ?? "all")
      try {
        const result = await learningSecurityApi.clearIntegrityEvents(
          attemptId,
          reason.trim(),
          eventId
        )
        toast({
          title: `${result.cleared} event${result.cleared === 1 ? "" : "s"} cleared`,
          description: `Integrity score is now ${result.integrity_score}.`,
        })
        setReason("")
        await mutate()
      } catch (err) {
        toast({
          title: "Couldn't clear the events",
          description: (err as LearningApiError)?.message || "Please try again.",
          variant: "destructive",
        })
      } finally {
        setClearing(null)
      }
    },
    [attemptId, reason, toast, mutate]
  )

  if (isLoading) {
    return (
      <Card className="shadow-none">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex items-center gap-2.5 p-5 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          {(error as LearningApiError)?.message ??
            "Integrity information isn't available for this attempt."}
        </CardContent>
      </Card>
    )
  }

  const { attempt, events, scoring } = data
  const counted = events.filter((event) => event.counted && !event.cleared_at)
  const observed = events.filter((event) => !event.counted || event.cleared_at)

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Assessment integrity
          {attempt.auto_submitted ? (
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/10 text-warning"
            >
              Submitted by policy
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Score, with its arithmetic ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Integrity score</p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                scoreTone(attempt.integrity_score)
              )}
            >
              {attempt.integrity_score}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Counted violations</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {attempt.violation_count}
            </p>
          </div>

          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {scoring.base} − {scoring.LOW}×low − {scoring.MEDIUM}×medium −{" "}
            {scoring.HIGH}×high. Cleared events are excluded. This is a signal for
            review, never a verdict — it does not affect the grade.
          </p>
        </div>

        {attempt.auto_submit_reason ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-warning">
              This attempt was submitted automatically ({attempt.auto_submit_reason}).
              The learner&apos;s saved answers were graded normally. If this was
              wrong, grant a new attempt.
            </p>
          </div>
        ) : null}

        {/* ── Counted ────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Counted violations{" "}
            <span className="font-normal text-muted-foreground">
              ({counted.length})
            </span>
          </p>

          {counted.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Nothing was recorded against this attempt.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {counted.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onClear={() => void clear(event.id)}
                  clearing={clearing === event.id}
                />
              ))}
            </ul>
          )}
        </div>

        {/* ── Observed but not counted ───────────────────────────────────── */}
        {observed.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              Observed, not counted ({observed.length})
            </p>
            {/* Shown deliberately: a reviewer who sees only the counted events
                cannot tell a flaky connection from a pattern. */}
            <ul className="space-y-1.5">
              {observed.map((event) => (
                <EventRow key={event.id} event={event} muted />
              ))}
            </ul>
          </div>
        ) : null}

        {/* ── Clearing ───────────────────────────────────────────────────── */}
        {counted.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 px-3.5 py-3">
            <p className="text-xs text-muted-foreground">
              Clearing a false positive keeps a record of who cleared it and why.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason — e.g. learner reported a network drop"
                className="h-9 max-w-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={clearing !== null}
                onClick={() => void clear()}
              >
                {clearing === "all" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
                Clear all
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function EventRow({
  event,
  onClear,
  clearing,
  muted,
}: {
  event: IntegrityEvent
  onClear?: () => void
  clearing?: boolean
  muted?: boolean
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm",
        muted ? "border-border bg-muted/20" : SEVERITY_TONE[event.severity]
      )}
    >
      <span className="font-medium">{describeIntegrityEvent(event.event_type)}</span>

      <span className="text-xs tabular-nums opacity-80">
        {formatTime(event.created_at)}
      </span>

      {event.metadata?.duration_ms ? (
        <span className="text-xs opacity-80">
          away {Math.round(Number(event.metadata.duration_ms) / 1000)}s
        </span>
      ) : null}

      {/*
        LC-CONS-001 §16.2 — the context that makes the new event types
        readable.

        "Left the assessment" is far more useful when it says *how*: closing
        the tab and clicking the next lesson in the sidebar are different
        actions, and a reviewer deciding whether to clear an event needs to
        tell them apart. A re-entry is likewise only meaningful alongside how
        long the learner was away — two seconds is a reload, twenty minutes is
        a conversation to have.
      */}
      {event.event_type === "IN_APP_NAVIGATION" && event.metadata?.reason ? (
        <span className="text-xs opacity-80">
          {describeNavigationReason(String(event.metadata.reason))}
        </span>
      ) : null}

      {event.event_type === "ATTEMPT_REENTRY" ? (
        <span className="text-xs opacity-80">
          {event.metadata?.silence_ms
            ? `away ${formatSilence(Number(event.metadata.silence_ms))}`
            : "resumed"}
        </span>
      ) : null}

      {event.cleared_at ? (
        <Badge variant="outline" className="text-[11px]">
          Cleared{event.cleared_reason ? ` — ${event.cleared_reason}` : ""}
        </Badge>
      ) : !event.counted ? (
        <Badge variant="outline" className="text-[11px]">
          {event.metadata?.reason === "below_grace"
            ? "Below grace period"
            : event.metadata?.reason === "blur_without_hide"
              ? "Focus only"
              : event.metadata?.reason === "reload"
                ? "Page reload"
                : "Not counted"}
        </Badge>
      ) : null}

      {onClear ? (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2 text-xs"
          disabled={clearing}
          onClick={onClear}
        >
          {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Clear"}
        </Button>
      ) : null}
    </li>
  )
}
