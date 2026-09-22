"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Loader2, RefreshCw, Video as VideoIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMediaGrant } from "@/hooks/use-media-grant"
import type { MediaHandle } from "@/lib/learning/api"

/**
 * ============================================================================
 * SecureMediaPlayer
 * ============================================================================
 *
 * Plays a lesson video from an opaque media handle rather than a raw URL.
 *
 * Design notes that matter:
 *
 *  • **Grants expire.** `useMediaGrant` refreshes at 80% of the grant's life.
 *    Swapping `src` mid-playback would reset the element, so the refreshed URL
 *    is only applied when the video is paused or has ended — an actively
 *    watching learner is never interrupted.
 *
 *  • **Watched ranges, not a high-water mark.** Every `timeupdate` reports the
 *    interval actually played. Seeking forward creates a gap, so the server's
 *    merged coverage stays honest without the player having to police seeking.
 *
 *  • **Seeking is allowed.** The previous implementation snapped playback back
 *    whenever the learner jumped more than 3 seconds ahead, which also punished
 *    normal re-watching. Enforcement now comes from coverage, not restriction.
 */

export function SecureMediaPlayer({
  handle,
  title,
  posterHandle,
  initialPositionSeconds = 0,
  seekPolicy = "FREE",
  onWatched,
  onPosition,
  onEnded,
  className,
}: {
  handle: MediaHandle | null
  title: string
  posterHandle?: MediaHandle | null
  initialPositionSeconds?: number
  /**
   * How much of the video a learner may skip (LS-SEC-002 §7.3).
   *
   * **This is deterrence, not enforcement** — §14 marks it so. It is trivially
   * bypassed by anyone who can call `video.currentTime`, and the backend does
   * not enforce it. Merged watched coverage remains the only thing that decides
   * completion, in every mode. This exists so a compliance course can express a
   * linear-viewing rule to honest learners.
   */
  seekPolicy?: "FREE" | "NO_SKIP_AHEAD" | "LINEAR_FIRST"
  onWatched?: (from: number, to: number, duration: number) => void
  onPosition?: (seconds: number, duration: number) => void
  onEnded?: () => void
  className?: string
}) {
  const { url, isExternal, isLoading, error, retry } = useMediaGrant(handle)
  const poster = useMediaGrant(posterHandle ?? null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [duration, setDuration] = useState(0)
  const lastTimeRef = useRef(0)
  /** Furthest point reached by actual playback — the ceiling for a restricted seek. */
  const maxReachedRef = useRef(0)
  /** `LINEAR_FIRST` frees up once the learner has reached the end once. */
  const completedOnceRef = useRef(false)
  const appliedUrlRef = useRef<string | null>(null)
  const seekedToStartRef = useRef(false)

  // ── Apply the URL, but never yank it out from under active playback ──────
  const [activeUrl, setActiveUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return

    if (!activeUrl) {
      setActiveUrl(url)
      appliedUrlRef.current = url
      return
    }

    if (url === appliedUrlRef.current) return

    const video = videoRef.current
    // A refreshed grant only takes effect while paused, so a mid-video URL
    // rotation cannot interrupt the learner.
    if (!video || video.paused || video.ended) {
      const resumeAt = video?.currentTime ?? 0
      setActiveUrl(url)
      appliedUrlRef.current = url
      seekedToStartRef.current = false
      requestAnimationFrame(() => {
        if (videoRef.current && resumeAt > 0) videoRef.current.currentTime = resumeAt
      })
    }
  }, [url, activeUrl])

  // ── Resume from the server-recorded position ─────────────────────────────
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setDuration(video.duration || 0)
    setReady(true)

    // LS-11 — report the duration as soon as it is known, independently of any
    // watched interval.
    //
    // The server divides merged coverage by this to decide completion, and it
    // was arriving only bundled with a watched range — so it was present on
    // **1 of 57** progress rows and the completion gate was running in its
    // dwell fallback almost everywhere. A zero-length interval carries the
    // duration without claiming any coverage.
    if (video.duration && Number.isFinite(video.duration)) {
      onWatched?.(0, 0, video.duration)
    }

    if (!seekedToStartRef.current && initialPositionSeconds > 0) {
      seekedToStartRef.current = true
      // Never resume within the last 5 seconds — that just replays the ending.
      if (initialPositionSeconds < (video.duration || 0) - 5) {
        video.currentTime = initialPositionSeconds
        lastTimeRef.current = initialPositionSeconds
      }
    }
  }, [initialPositionSeconds, onWatched])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.duration) return

    const current = video.currentTime
    const previous = lastTimeRef.current

    // Report only contiguous playback. A jump (seek) starts a new interval
    // instead of claiming everything in between.
    if (current > previous && current - previous < 5) {
      onWatched?.(previous, current, video.duration)
    }

    lastTimeRef.current = current
    if (current > maxReachedRef.current) maxReachedRef.current = current
    onPosition?.(current, video.duration)
  }, [onWatched, onPosition])

  const handleSeeked = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    // ── Seek policy (§7.3) ────────────────────────────────────────────────
    //
    // `FREE` is the default and the reasoning behind it stands: coverage is
    // the stronger control, and snapping playback back punishes legitimate
    // re-watching. The restrictive modes exist only for courses whose business
    // rule requires linear viewing, and they are honest deterrence — the
    // backend still decides completion from coverage alone.
    const restrict =
      seekPolicy === "NO_SKIP_AHEAD" ||
      (seekPolicy === "LINEAR_FIRST" && !completedOnceRef.current)

    if (restrict) {
      const limit = maxReachedRef.current + 2
      if (video.currentTime > limit) {
        video.currentTime = limit
        lastTimeRef.current = limit
        return
      }
    }

    lastTimeRef.current = video.currentTime
  }, [seekPolicy])

  // ── External embeds (YouTube/Vimeo) ──────────────────────────────────────
  if (handle?.is_external && (url || handle.external_url)) {
    const embedUrl = toEmbedUrl(url || handle.external_url!)
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-lg bg-foreground/90",
          className
        )}
      >
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    )
  }

  if (!handle) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40",
          className
        )}
      >
        <VideoIcon className="h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">No video for this lesson.</p>
      </div>
    )
  }

  if (isLoading && !activeUrl) {
    return <Skeleton className={cn("aspect-video w-full rounded-lg", className)} />
  }

  if (error && !activeUrl) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/40 px-6 text-center",
          className
        )}
      >
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {error.code === "LESSON_LOCKED" || error.code === "NOT_ENROLLED"
              ? "You don't have access to this video"
              : "This video couldn't be loaded"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
        </div>
        {error.code !== "LESSON_LOCKED" && error.code !== "NOT_ENROLLED" && (
          <Button size="sm" variant="outline" onClick={retry} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg bg-foreground/90",
        className
      )}
    >
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-background/80" />
        </div>
      )}

      <video
        ref={videoRef}
        key={activeUrl ?? "pending"}
        src={activeUrl ?? undefined}
        poster={poster.url ?? undefined}
        controls
        playsInline
        preload="metadata"
        // Deterrence, not security (§5.1 D6). These remove the browser's own
        // one-click routes out of the player — the download button, the PiP
        // pop-out, the cast target. They do nothing against a screen recorder,
        // and the grant expiring in 15 minutes is the control that matters.
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onSeeked={handleSeeked}
        onEnded={() => {
          // Frees LINEAR_FIRST for revision once the learner has been through once.
          completedOnceRef.current = true
          onEnded?.()
        }}
        aria-label={title}
      >
        {/* Caption track slot — populated when a lesson supplies one. */}
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

function toEmbedUrl(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    )?.[1]
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : url
  }
  if (url.includes("vimeo.com")) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}` : url
  }
  return url
}
