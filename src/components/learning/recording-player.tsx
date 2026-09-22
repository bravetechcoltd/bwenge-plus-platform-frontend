"use client"

/**
 * ============================================================================
 * RecordingPlayer — AS-CAM-001 §11
 * ============================================================================
 *
 * Plays an attempt's recording and seeks to a chosen moment.
 *
 * ── Why it stitches rather than plays one file ─────────────────────────────
 *
 * The recording exists as 10-second objects in storage and is never
 * concatenated server-side. That keeps upload resilient — a crash costs ten
 * seconds — and it makes seeking exact rather than approximate: chunk *n*
 * begins at `n × chunk_ms` by construction, so "seek to this event" is
 * arithmetic instead of a search through a container index.
 *
 * The cost is that this is a playlist, not a video element with a scrubber.
 * That is the right trade for evidence: a reviewer arrives here from an event,
 * wanting the twenty seconds around it, not a film to watch end to end.
 *
 * ── Gaps are shown, never smoothed ─────────────────────────────────────────
 *
 * Missing chunks are declared by the server and rendered as gaps in the
 * timeline. Playing straight through them would present footage as continuous
 * when it is not, and a reviewer drawing a conclusion from a recording needs
 * to know where it stops being a record.
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Pause, Play, SkipBack, SkipForward, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecordingManifest } from "@/lib/learning/api"

export function RecordingPlayer({
  manifest,
  seekToMs,
  onPositionChange,
  className,
}: {
  manifest: RecordingManifest | null
  /** Set by the timeline; the player jumps to the chunk containing it. */
  seekToMs: number | null
  onPositionChange?: (elapsedMs: number) => void
  className?: string
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const [index, setIndex] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)

  const chunks = manifest?.chunks ?? []
  const chunkMs = manifest?.chunk_ms ?? 10_000
  const current = chunks[index] ?? null

  // ── Seek ────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (seekToMs === null || chunks.length === 0) return

    // The chunk whose window contains the moment. Falls back to the nearest
    // earlier chunk when the exact one is missing, so a seek into a gap lands
    // just before it rather than doing nothing.
    const wanted = Math.floor(seekToMs / chunkMs)
    let target = chunks.findIndex((c) => c.index === wanted)
    if (target === -1) {
      for (let i = chunks.length - 1; i >= 0; i--) {
        if (chunks[i].index <= wanted) {
          target = i
          break
        }
      }
    }
    if (target === -1) target = 0

    setIndex(target)
    const offset = Math.max(0, seekToMs - chunks[target].index * chunkMs)
    const el = videoRef.current
    if (el) {
      const apply = () => {
        try {
          el.currentTime = offset / 1000
        } catch {
          // Metadata not loaded yet; the loadedmetadata handler retries.
        }
      }
      apply()
      el.addEventListener("loadedmetadata", apply, { once: true })
    }
  }, [seekToMs, chunks, chunkMs])

  // Advance through the playlist so a reviewer can watch past a boundary.
  const handleEnded = React.useCallback(() => {
    setIndex((i) => {
      const next = i + 1
      if (next >= chunks.length) {
        setPlaying(false)
        return i
      }
      return next
    })
  }, [chunks.length])

  React.useEffect(() => {
    const el = videoRef.current
    if (!el || !playing) return
    void el.play().catch(() => setPlaying(false))
  }, [index, playing])

  const position = current ? current.index * chunkMs : 0

  React.useEffect(() => {
    onPositionChange?.(position)
  }, [position, onPositionChange])

  if (!manifest || chunks.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 text-center",
          className
        )}
      >
        <VideoOff className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No recording available</p>
        <p className="max-w-[36ch] text-[13px] text-muted-foreground">
          {manifest?.status === "DELETED"
            ? "This recording has passed its retention period and was deleted."
            : manifest?.status === "FAILED"
              ? "Recording never produced usable footage for this attempt."
              : "This attempt was not recorded."}
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-lg border border-border bg-black">
        <video
          ref={videoRef}
          key={current?.url}
          src={current?.url}
          controls
          playsInline
          onEnded={handleEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="aspect-video w-full"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="gap-1.5"
        >
          <SkipBack className="h-3.5 w-3.5" />
          Back {Math.round(chunkMs / 1000)}s
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const el = videoRef.current
            if (!el) return
            if (el.paused) void el.play()
            else el.pause()
          }}
          className="gap-1.5"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setIndex((i) => Math.min(chunks.length - 1, i + 1))}
          disabled={index >= chunks.length - 1}
          className="gap-1.5"
        >
          Forward {Math.round(chunkMs / 1000)}s
          <SkipForward className="h-3.5 w-3.5" />
        </Button>

        <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
          {formatElapsed(position)}
          {manifest.duration_ms ? ` / ${formatElapsed(manifest.duration_ms)}` : ""}
        </span>
      </div>

      {manifest.gaps.length > 0 && (
        <p className="text-[12.5px] leading-relaxed text-warning">
          {manifest.gaps.length} gap{manifest.gaps.length === 1 ? "" : "s"} in this
          recording — footage is missing between{" "}
          {manifest.gaps
            .slice(0, 3)
            .map((g) => `${formatElapsed(g.from_ms)}–${formatElapsed(g.to_ms)}`)
            .join(", ")}
          {manifest.gaps.length > 3 ? " and others" : ""}. Upload problems and
          browser interruptions both look like this.
        </p>
      )}
    </div>
  )
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
