"use client"

/**
 * ============================================================================
 * SecurityPreCheck — AS-CAM-001 §3.2, §6.2
 * ============================================================================
 *
 * The camera step between reading the briefing and starting the attempt.
 *
 * Its job is to make the camera's state *true and visible before the clock
 * starts*, so that a learner never discovers a broken webcam ten minutes into
 * an assessment they cannot restart. It asks for permission, shows what the
 * camera actually sees, and reports what it found.
 *
 * ── The one place blocking is correct ──────────────────────────────────────
 *
 * Under STRICT with `camera_required`, this refuses to let the attempt begin.
 * That is the only moment in the whole system where a camera fault stops a
 * learner — and it stops them *before* they have invested anything. Once the
 * attempt is running, nothing here can end it (rule 15).
 *
 * Under MONITOR the same failures are reported and the learner continues. The
 * component is the same; the policy decides.
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UseAssessmentCameraResult } from "@/hooks/use-assessment-camera"

export function SecurityPreCheck({
  camera,
  required,
  onReady,
  className,
}: {
  camera: UseAssessmentCameraResult
  /** STRICT + `camera_required`: the attempt cannot begin without footage. */
  required: boolean
  /** Fired when the check reaches a state that permits starting. */
  onReady: (ok: boolean) => void
  className?: string
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const [checked, setChecked] = React.useState(false)

  // Attach the live stream to the preview element.
  React.useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (camera.previewStream) {
      el.srcObject = camera.previewStream
      void el.play().catch(() => {
        // Autoplay refusal on a muted, user-initiated preview is rare and
        // harmless: the learner still sees the frame once they interact.
      })
    } else {
      el.srcObject = null
    }
  }, [camera.previewStream])

  const run = React.useCallback(async () => {
    const ok = await camera.requestAccess()
    setChecked(true)
    // A failed check still permits starting unless the camera is required.
    onReady(ok || !required)
  }, [camera, required, onReady])

  // An unmonitored or camera-less assessment has nothing to check.
  React.useEffect(() => {
    if (!required && camera.state === "idle") onReady(true)
  }, [required, camera.state, onReady])

  const failed =
    camera.state === "denied" ||
    camera.state === "unavailable" ||
    camera.state === "unsupported"

  const ready = camera.state === "ready"

  return (
    <Card
      className={cn(
        "border-border shadow-none",
        required && failed && "border-destructive/40 bg-destructive/[0.04]",
        ready && "border-success/40 bg-success/[0.04]",
        className
      )}
    >
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              ready
                ? "bg-success/15 text-success"
                : failed
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/10 text-primary"
            )}
          >
            {ready ? (
              <CheckCircle2 className="h-[18px] w-[18px]" />
            ) : failed ? (
              <CameraOff className="h-[18px] w-[18px]" />
            ) : (
              <Camera className="h-[18px] w-[18px]" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {ready
                ? "Camera ready"
                : failed
                  ? required
                    ? "A camera is required for this assessment"
                    : "Camera unavailable"
                  : "Camera check"}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {ready ? (
                <>
                  Your camera is working. Recording starts when you begin and stops
                  when you submit. Video only — no sound is recorded.
                </>
              ) : failed ? (
                <>
                  {camera.error}{" "}
                  {required
                    ? "You'll need a working camera to start this one."
                    : "You can still take this assessment; your instructor will see that the camera wasn't available."}
                </>
              ) : (
                <>
                  This assessment is recorded. We'll ask for your camera, show you
                  what it sees, and record video only — never sound.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Preview. Muted and inline: a preview that made noise would be a
            surprise, and one that went fullscreen on iOS would be worse. */}
        {camera.previewStream && (
          <div className="overflow-hidden rounded-lg border border-border bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="aspect-video w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!checked && camera.state !== "checking" && (
            <Button size="sm" onClick={() => void run()} className="gap-2">
              <Camera className="h-4 w-4" />
              Check my camera
            </Button>
          )}

          {camera.state === "checking" && (
            <Button size="sm" disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking…
            </Button>
          )}

          {failed && (
            <Button size="sm" variant="outline" onClick={() => void run()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}

          {ready && (
            <span className="flex items-center gap-1.5 text-[13px] text-success">
              <ShieldCheck className="h-4 w-4" />
              Ready to start
            </span>
          )}
        </div>

        {/*
          Said plainly, and only where it is true. A learner deciding whether to
          hunt for a webcam deserves to know it is that or nothing.
        */}
        {required && failed && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-[13px] leading-relaxed text-foreground/85">
              This assessment can&apos;t be started without a working camera. If you
              can&apos;t fix it here, contact your instructor rather than waiting —
              they can change the requirement for you.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Status chip — in the session header while the attempt runs
   ══════════════════════════════════════════════════════════════════════════ */

export function CameraStatusChip({
  state,
  pendingChunks,
}: {
  state: UseAssessmentCameraResult["state"]
  pendingChunks: number
}) {
  if (state === "idle" || state === "stopped") return null

  const recording = state === "recording"
  const interrupted = state === "interrupted"

  return (
    <span
      className={cn(
        "hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex",
        recording
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : interrupted
            ? "border-warning/40 bg-warning/10 text-warning"
            : "border-border bg-muted text-muted-foreground"
      )}
      title={
        recording
          ? "Your camera is recording. Video only — no sound."
          : interrupted
            ? "The camera stopped. Your attempt is unaffected."
            : "Camera not recording."
      }
    >
      {recording ? (
        <>
          {/* A recording indicator that pulses, because a camera that is on
              should never be quiet about it. */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-destructive/40 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          Recording
          {pendingChunks > 0 && (
            <span className="tabular-nums opacity-70">· {pendingChunks} to upload</span>
          )}
        </>
      ) : interrupted ? (
        <>
          <CameraOff className="h-3.5 w-3.5" />
          Camera stopped
        </>
      ) : (
        <>
          <CameraOff className="h-3.5 w-3.5" />
          No camera
        </>
      )}
    </span>
  )
}
