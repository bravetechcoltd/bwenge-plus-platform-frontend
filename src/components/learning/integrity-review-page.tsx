"use client"

/**
 * ============================================================================
 * IntegrityReviewPage — AS-CAM-001 §7, §10, §12
 * ============================================================================
 *
 * Everything a reviewer needs about one attempt, and a place to record what
 * they concluded.
 *
 * ── The stance ─────────────────────────────────────────────────────────────
 *
 * This screen presents evidence. It does not present a verdict, a suspicion
 * ranking, or a "probability" of anything — those would be a machine's opinion
 * about a person, dressed as a measurement, and a reviewer reading one is no
 * longer really reviewing.
 *
 * The integrity score exists and is deliberately *not* shown here. It orders a
 * queue elsewhere; on the screen where a decision is made it would function as
 * a prior, which is exactly what it must not be.
 *
 * ── Append-only ────────────────────────────────────────────────────────────
 *
 * A decision never overwrites an earlier one. The history is what an appeal
 * reads, and a reviewer who changed their mind after seeing more is a fact
 * worth keeping rather than hiding.
 */

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  learningApi,
  type AttemptIntegrityDetail,
  type IntegrityReviewRecord,
  type RecordingManifest,
} from "@/lib/learning/api"
import { RecordingPlayer, formatElapsed } from "@/components/learning/recording-player"
import { EventTimeline } from "@/components/learning/event-timeline"

const DECISIONS: Array<{
  value: IntegrityReviewRecord["decision"]
  label: string
  detail: string
}> = [
  {
    value: "CLEARED",
    label: "Cleared",
    detail: "Nothing here indicates misconduct.",
  },
  {
    value: "INCONCLUSIVE",
    label: "Inconclusive",
    detail: "The evidence does not settle it either way.",
  },
  {
    value: "FLAGGED",
    label: "Flagged for follow-up",
    detail: "Worth a conversation with the learner.",
  },
  {
    value: "UPHELD",
    label: "Misconduct upheld",
    detail: "A finding has been made through your institution's process.",
  },
]

export function IntegrityReviewPage({
  courseId,
  attemptId,
}: {
  courseId: string
  attemptId: string
}) {
  const { toast } = useToast()

  const [detail, setDetail] = React.useState<AttemptIntegrityDetail | null>(null)
  const [manifest, setManifest] = React.useState<RecordingManifest | null>(null)
  const [reviews, setReviews] = React.useState<IntegrityReviewRecord[]>([])
  const [recordingMeta, setRecordingMeta] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [seekTo, setSeekTo] = React.useState<number | null>(null)
  const [decision, setDecision] = React.useState<IntegrityReviewRecord["decision"] | "">("")
  const [rationale, setRationale] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [watched, setWatched] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [integrity, status] = await Promise.all([
        learningApi.getAttemptIntegrity(attemptId),
        learningApi.getRecordingStatus(attemptId).catch(() => null),
      ])
      setDetail(integrity)
      setReviews(status?.reviews ?? [])
      setRecordingMeta(status?.recording ?? null)

      // Requested separately: fetching it is what gets audited, so it happens
      // when a reviewer opens the attempt rather than as a side effect of a
      // list somewhere.
      const rec = await learningApi.getRecordingManifest(attemptId).catch(() => null)
      setManifest(rec)
      setError(null)
    } catch {
      setError("Couldn't load this attempt. You may not have access to it.")
    } finally {
      setLoading(false)
    }
  }, [attemptId])

  React.useEffect(() => {
    void load()
  }, [load])

  const submitDecision = async () => {
    if (!decision || rationale.trim().length < 10) return
    setSaving(true)
    try {
      const saved = await learningApi.recordIntegrityDecision(attemptId, {
        decision,
        rationale: rationale.trim(),
        evidence_seen: {
          recording_viewed: watched,
          events: detail?.events.map((e) => e.id) ?? [],
        },
      })
      setReviews((prev) => [saved, ...prev])
      setDecision("")
      setRationale("")
      toast({ title: "Decision recorded", description: "Added to this attempt's history." })
    } catch {
      toast({
        title: "Couldn't record that",
        description: "The decision was not saved.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <Card>
        <CardContent className="flex items-start gap-2.5 py-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const a = detail.attempt

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/dashboard/instructor/courses/${courseId}/security`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Assessment security
        </Link>
      </div>

      {/* ── The attempt ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Attempt review
            <Badge variant="outline" className="text-[10px]">
              attempt {a.attempt_number}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Result">
              {a.percentage === null ? (
                "Not released"
              ) : (
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    a.passed ? "text-success" : "text-destructive"
                  )}
                >
                  {Math.round(a.percentage)}%{" "}
                  <span className="font-normal">{a.passed ? "pass" : "fail"}</span>
                </span>
              )}
            </Fact>
            <Fact label="Counted events">
              <span className="tabular-nums">{a.violation_count}</span>
            </Fact>
            <Fact label="Submitted">
              {a.auto_submitted ? (
                <span className="text-warning">Automatically</span>
              ) : (
                "By the learner"
              )}
            </Fact>
            <Fact label="Recording">
              {recordingMeta ? (
                <span
                  className={cn(
                    recordingMeta.status === "COMPLETE"
                      ? "text-success"
                      : recordingMeta.status === "DELETED"
                        ? "text-muted-foreground"
                        : "text-warning"
                  )}
                >
                  {recordingMeta.status.toLowerCase()}
                  {recordingMeta.duration_ms
                    ? ` · ${formatElapsed(recordingMeta.duration_ms)}`
                    : ""}
                </span>
              ) : (
                "None"
              )}
            </Fact>
          </div>

          {recordingMeta?.retention_due_at && !recordingMeta.deleted_at && (
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Footage is deleted on{" "}
              {new Date(recordingMeta.retention_due_at).toLocaleDateString()}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Evidence ─────────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordingPlayer
              manifest={manifest}
              seekToMs={seekTo}
              onPositionChange={() => setWatched(true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">What was recorded</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTimeline
              events={detail.events}
              startedAt={a.started_at}
              onSeek={manifest ? (ms) => setSeekTo(ms) : undefined}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Decision ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Record a decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Nothing above is a conclusion. The system records what it could observe
            and does not decide what it means — that judgement is yours, and this is
            where it goes on the record.
          </p>

          <div className="grid gap-3 sm:grid-cols-[260px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="decision">Decision</Label>
              <Select
                value={decision}
                onValueChange={(v) => setDecision(v as IntegrityReviewRecord["decision"])}
              >
                <SelectTrigger id="decision">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {DECISIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {decision && (
                <p className="text-[12px] text-muted-foreground">
                  {DECISIONS.find((d) => d.value === decision)?.detail}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rationale">Reason</Label>
              <Textarea
                id="rationale"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                placeholder="What you looked at, and what led you to this."
              />
              <p className="text-[12px] text-muted-foreground">
                Required. A decision without a stated reason cannot be reviewed by
                anyone afterwards, including you.
              </p>
            </div>
          </div>

          <Button
            onClick={() => void submitDecision()}
            disabled={!decision || rationale.trim().length < 10 || saving}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Record decision
          </Button>
        </CardContent>
      </Card>

      {/* ── History ──────────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Review history
              <span className="ml-2 font-normal text-muted-foreground">
                ({reviews.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex items-start gap-3 border-b border-border py-3 last:border-b-0"
              >
                <span className="mt-0.5">
                  {review.decision === "CLEARED" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : review.decision === "UPHELD" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-foreground">
                    {DECISIONS.find((d) => d.value === review.decision)?.label ??
                      review.decision}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    {review.rationale}
                  </p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    {new Date(review.created_at).toLocaleString()}
                    {review.evidence_seen?.recording_viewed
                      ? " · recording viewed"
                      : " · recording not viewed"}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{children}</p>
    </div>
  )
}
