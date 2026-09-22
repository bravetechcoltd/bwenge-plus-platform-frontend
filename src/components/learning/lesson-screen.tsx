"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Star,
  Video,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { sanitizeRichText } from "@/components/ui/rich-text"
import { SecureMediaPlayer } from "@/components/learning/secure-media-player"
import { LessonContentSkeleton, LearningEmptyState } from "@/components/learning/learning-states"
import { useMediaDownload } from "@/hooks/use-media-grant"
import type { LessonPayload, MediaHandle, LearningStepNode } from "@/lib/learning/api"

/**
 * ============================================================================
 * LessonScreen — one surface for reading and video lessons
 * ============================================================================
 *
 * Consolidates `content-screen.tsx` (66KB) and `video-screen.tsx` (6KB), which
 * had drifted apart: the video screen read `lesson.videoUrl` while the page
 * passed `video_url`, so video-only lessons silently rendered "No video
 * available" (audit defect D1). One component, one prop contract.
 *
 * The completion gate is no longer here. Engagement is measured by
 * `useLessonEngagement` and evaluated by the server; this component renders
 * the content and reports what it observes.
 */

export function LessonScreen({
  payload,
  step,
  isLoading,
  onWatched,
  onPosition,
  onToggleBookmark,
  bookmarkPending,
}: {
  payload: LessonPayload | undefined
  step: LearningStepNode
  isLoading: boolean
  onWatched: (from: number, to: number, duration: number) => void
  onPosition: (seconds: number, duration: number) => void
  onToggleBookmark: () => void
  bookmarkPending: boolean
}) {
  const { open: openMedia, pendingId } = useMediaDownload()
  const [tab, setTab] = useState("lesson")

  // Reset to the lesson tab whenever the learner moves to a new step.
  useEffect(() => {
    setTab("lesson")
  }, [step.step_id])

  const lesson = payload?.lesson
  const learnerState = payload?.learner_state

  // Stabilised so the derived memos below don't recompute on every render.
  const media = useMemo(() => payload?.media ?? [], [payload?.media])

  const primaryVideo = useMemo(
    () => media.find((m) => m.role === "PRIMARY_VIDEO") ?? null,
    [media]
  )
  const thumbnail = useMemo(
    () => media.find((m) => m.role === "THUMBNAIL") ?? null,
    [media]
  )
  const attachments = useMemo(
    () => media.filter((m) => m.role === "RESOURCE" || m.role === "MATERIAL"),
    [media]
  )

  if (isLoading || !lesson) return <LessonContentSkeleton />

  const hasContent = !!lesson.content && String(lesson.content).trim().length > 0
  // From the step, not `learner_state`. One question, one source — the same
  // field the sidebar tick and the action bar read (LP-CONS-001 rule A3).
  const isCompleted = step.is_completed === true

  return (
    <article className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 sm:py-8">
      {/* ── Lesson head ─────────────────────────────────────────────────── */}
      <header className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-normal">
            {step.type === "video" ? (
              <Video className="h-3 w-3" />
            ) : (
              <BookOpen className="h-3 w-3" />
            )}
            {step.type === "video" ? "Video" : "Reading"}
          </Badge>

          {step.duration_minutes ? (
            <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
              <Clock className="h-3 w-3" />
              {step.duration_minutes} min
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Self-paced</span>
          )}

          {isCompleted && (
            <Badge className="gap-1 bg-success/15 text-success hover:bg-success/20">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </Badge>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold leading-snug text-foreground">
            {lesson.title}
          </h1>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onToggleBookmark}
            disabled={bookmarkPending}
            aria-label={
              learnerState?.is_bookmarked ? "Remove bookmark" : "Bookmark this lesson"
            }
            aria-pressed={learnerState?.is_bookmarked === true}
          >
            {bookmarkPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star
                className={cn(
                  "h-4 w-4",
                  learnerState?.is_bookmarked
                    ? "fill-warning text-warning"
                    : "text-muted-foreground"
                )}
              />
            )}
          </Button>
        </div>
      </header>

      {/* ── Video ───────────────────────────────────────────────────────── */}
      {primaryVideo && (
        <div className="mb-6">
          <SecureMediaPlayer
            handle={primaryVideo}
            posterHandle={thumbnail}
            title={lesson.title}
            initialPositionSeconds={learnerState?.last_position_seconds ?? 0}
            seekPolicy={payload?.policy?.seek_policy ?? "FREE"}
            onWatched={onWatched}
            onPosition={onPosition}
          />
          {learnerState?.last_position_seconds
            ? learnerState.last_position_seconds > 5 && !isCompleted && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Resumed from {formatTime(learnerState.last_position_seconds)}.
                </p>
              )
            : null}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {attachments.length > 0 ? (
        <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
          <TabsList className="mb-4">
            <TabsTrigger value="lesson">Lesson</TabsTrigger>
            <TabsTrigger value="materials" className="gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Materials
              <span className="ml-0.5 rounded bg-muted px-1 text-[10px] tabular-nums">
                {attachments.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lesson" className="mt-0 min-w-0">
            <LessonBody html={lesson.content} hasContent={hasContent} hasVideo={!!primaryVideo} />
          </TabsContent>

          <TabsContent value="materials" className="mt-0 min-w-0">
            <MaterialsList
              attachments={attachments}
              onOpen={openMedia}
              pendingId={pendingId}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <LessonBody html={lesson.content} hasContent={hasContent} hasVideo={!!primaryVideo} />
      )}
    </article>
  )
}

function LessonBody({
  html,
  hasContent,
  hasVideo,
}: {
  html: string | null
  hasContent: boolean
  hasVideo: boolean
}) {
  if (!hasContent) {
    if (hasVideo) return null
    return (
      <LearningEmptyState
        title="No content yet"
        description="This lesson doesn't have any content added to it yet."
        icon={FileText}
      />
    )
  }

  return (
    <div
      className={cn(
        "rich-text-content",
        // `min-w-0` is what actually lets the body shrink inside the flex
        // column above it. Without it a long line pushes the whole column
        // wider than the viewport instead of wrapping.
        "min-w-0 max-w-full text-[15px]",
        "[&_h2]:scroll-mt-20 [&_h3]:scroll-mt-20",
        "[&_a]:text-primary [&_a]:underline-offset-2",
        "[&_img]:rounded-lg [&_img]:border [&_img]:border-border",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg",
        "[&_table]:block [&_table]:overflow-x-auto",

        // ── Content deterrence (LS-SEC-002 §5.1, finding LS-13) ────────────
        //
        // `select-none` existed on the public *marketing* course page but
        // nowhere in the Learning Space — the protection was on the page that
        // shows a description, not on the one that shows the material.
        //
        // This is **deterrence, not security** (§5, and the matrix in §14 marks
        // it so). It stops a casual drag-select. It does not stop DevTools,
        // Reader mode, or a screenshot, and nothing in this codebase pretends
        // otherwise — the real boundary is `requireLessonAccess`.
        //
        // Code blocks and tables keep selection: a learner copying a snippet
        // into their editor is studying, not exfiltrating, and breaking that
        // would be a net negative.
        "select-none [&_pre]:select-text [&_code]:select-text [&_table]:select-text",
        // Nor does it apply to a screen-reader session (§21.4): `user-select:
        // none` interferes with select-to-speak and with assistive selection.
        "[@media(prefers-reduced-motion:reduce)]:select-text"
      )}
      onContextMenu={(event) => {
        // Suppressed on images only. Suppressing it over text would block
        // "Look up", translation and the browser's own accessibility menu for
        // no security benefit at all.
        const target = event.target as HTMLElement
        if (target?.tagName === "IMG") event.preventDefault()
      }}
      onDragStart={(event) => {
        const target = event.target as HTMLElement
        if (target?.tagName === "IMG") event.preventDefault()
      }}
      // Lesson bodies are authored by instructors through the platform's own
      // editor and stored server-side; they are not learner-supplied input.
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html || "") }}
    />
  )
}

function MaterialsList({
  attachments,
  onOpen,
  pendingId,
}: {
  attachments: MediaHandle[]
  onOpen: (handle: MediaHandle) => void
  pendingId: string | null
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {attachments.map((item) => (
            <li key={item.media_id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                disabled={pendingId === item.media_id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.title || "Attachment"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.mime_type || item.kind}
                    {item.size_bytes ? ` · ${formatBytes(item.size_bytes)}` : ""}
                  </span>
                </span>

                {pendingId === item.media_id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
