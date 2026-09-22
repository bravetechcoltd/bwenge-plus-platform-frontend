"use client"

/**
 * ============================================================================
 * EventTimeline — AS-CAM-001 §7.1
 * ============================================================================
 *
 * The integrity events for one attempt, in two lists.
 *
 * ── Why two lists and not one ──────────────────────────────────────────────
 *
 * This is the most consequential decision in the review interface.
 *
 * A merged list invites a reviewer to read "12 events" as "12 suspicious
 * acts", when nine of them were a failing upload and a dropped connection. The
 * two kinds of fact are not comparable and must not share a column: one
 * describes what the learner did, the other describes what their equipment
 * did.
 *
 * Behavioural signals are presented first and plainly. Technical incidents are
 * present, quieter, and collapsed by default — visible because a reviewer
 * needs to know a recording has holes, subordinate because none of it is
 * evidence about a person.
 *
 * ── Nothing here concludes anything ────────────────────────────────────────
 *
 * There is no score, no ranking, no "probability". Each row states what was
 * observed and what the server made of it against the thresholds in force, in
 * the words `AttemptIntegrityService.explain` already produces. The conclusion
 * belongs to the reviewer.
 */

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatElapsed } from "@/components/learning/recording-player"
import type { AttemptIntegrityDetail } from "@/lib/learning/api"

type Event = AttemptIntegrityDetail["events"][number]

/**
 * Which events describe equipment rather than conduct.
 *
 * Kept as an explicit list rather than inferred from severity: severity orders
 * a queue, and a MEDIUM technical fault would otherwise sort itself in beside
 * a MEDIUM behavioural one and be read as the same kind of thing.
 */
const TECHNICAL = new Set([
  "CAMERA_UNAVAILABLE",
  "RECORDING_UNSUPPORTED",
  "RECORDING_UPLOAD_FAILED",
  "RECORDING_BUFFER_OVERFLOW",
  "RECORDING_INCOMPLETE",
  "RECORDING_COMPLETE",
  "RECORDING_STARTED",
  "CAMERA_RESTORED",
  "ATTEMPT_REENTRY",
  "PAGE_RELOADED",
])

const LABELS: Record<string, string> = {
  TAB_HIDDEN: "Left the assessment tab",
  WINDOW_BLURRED: "Switched to another window",
  FULLSCREEN_EXITED: "Left full screen",
  SECOND_TAB_DETECTED: "Opened the assessment twice",
  NAVIGATION_ATTEMPTED: "Tried to navigate away",
  IN_APP_NAVIGATION: "Left through the course navigation",
  COPY_ATTEMPTED: "Tried to copy",
  PASTE_ATTEMPTED: "Tried to paste",
  PRINT_ATTEMPTED: "Tried to print",
  CAMERA_DENIED: "Declined camera access",
  CAMERA_REVOKED: "Withdrew camera permission",
  CAMERA_STREAM_ENDED: "Camera stopped",
  ABANDONED_SUSPECTED: "Attempt sat untouched",
  CAMERA_UNAVAILABLE: "No camera on the device",
  RECORDING_UNSUPPORTED: "Browser cannot record",
  RECORDING_UPLOAD_FAILED: "Upload failed",
  RECORDING_BUFFER_OVERFLOW: "Local storage filled",
  RECORDING_INCOMPLETE: "Recording has gaps",
  RECORDING_COMPLETE: "Recording complete",
  RECORDING_STARTED: "Recording started",
  CAMERA_RESTORED: "Camera restored",
  PAGE_RELOADED: "Page reloaded",
  ATTEMPT_REENTRY: "Returned to the attempt",
}

function elapsedOf(event: Event, startedAt: string | null): number | null {
  const meta = event.metadata || {}
  if (typeof meta.elapsed_ms === "number") return meta.elapsed_ms
  if (!startedAt) return null
  const started = new Date(startedAt).getTime()
  const at = new Date(event.created_at).getTime()
  return Number.isFinite(started) && Number.isFinite(at) ? Math.max(0, at - started) : null
}

function EventRow({
  event,
  elapsed,
  onSeek,
  muted,
}: {
  event: Event
  elapsed: number | null
  onSeek?: (ms: number) => void
  muted?: boolean
}) {
  const counted = event.counted && !event.cleared_at

  return (
    <li
      className={cn(
        "flex items-start gap-3 border-b border-border py-2.5 last:border-b-0",
        muted && "opacity-80"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          muted
            ? "bg-muted text-muted-foreground"
            : counted
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground"
        )}
      >
        {muted ? (
          <Wrench className="h-3.5 w-3.5" />
        ) : counted ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Info className="h-3.5 w-3.5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-medium text-foreground">
            {LABELS[event.event_type] ?? event.event_type}
          </span>

          {counted && !muted && (
            <Badge variant="outline" className="h-5 border-warning/40 text-[10px] text-warning">
              counted
            </Badge>
          )}
          {event.cleared_at && (
            <Badge variant="outline" className="h-5 text-[10px] text-muted-foreground">
              cleared
            </Badge>
          )}

          {elapsed !== null && onSeek && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSeek(elapsed)}
              className="h-6 gap-1 px-1.5 text-[11px] tabular-nums text-primary hover:text-primary"
            >
              <Eye className="h-3 w-3" />
              {formatElapsed(elapsed)}
            </Button>
          )}
        </div>

        {/* The server's own words. The client does not compose a judgement. */}
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {event.explanation}
        </p>

        {event.cleared_reason && (
          <p className="mt-1 text-[12px] italic text-muted-foreground">
            Cleared: {event.cleared_reason}
          </p>
        )}
      </div>
    </li>
  )
}

export function EventTimeline({
  events,
  startedAt,
  onSeek,
  className,
}: {
  events: Event[]
  startedAt: string | null
  onSeek?: (ms: number) => void
  className?: string
}) {
  const [showTechnical, setShowTechnical] = React.useState(false)

  const behavioural = events.filter((e) => !TECHNICAL.has(e.event_type))
  const technical = events.filter((e) => TECHNICAL.has(e.event_type))

  return (
    <div className={cn("space-y-4", className)}>
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          What the learner did
          <span className="ml-2 font-normal text-muted-foreground">
            ({behavioural.length})
          </span>
        </h3>

        {behavioural.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">
            Nothing was recorded about this learner&apos;s behaviour during the
            attempt.
          </p>
        ) : (
          <ul className="mt-1">
            {behavioural.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                elapsed={elapsedOf(event, startedAt)}
                onSeek={onSeek}
              />
            ))}
          </ul>
        )}
      </section>

      {technical.length > 0 && (
        <section className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            {showTechnical ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-[13px] font-medium text-foreground">
              Technical incidents
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({technical.length})
              </span>
            </span>
          </button>

          <p className="mt-1 pl-6 text-[12.5px] leading-relaxed text-muted-foreground">
            Equipment and connection problems. These say nothing about the
            learner and none of them counted toward anything.
          </p>

          {showTechnical && (
            <ul className="mt-2 pl-6">
              {technical.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  elapsed={elapsedOf(event, startedAt)}
                  onSeek={onSeek}
                  muted
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
