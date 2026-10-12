"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Clock,
  Keyboard,
  ListTree,
  StickyNote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LearningPath, LearningStepNode } from "@/lib/learning/api"
import { useAuth } from "@/hooks/use-auth"
import { learningExitPath, learningExitLabel } from "@/lib/learning/exit-destination"

/**
 * Compact 56px sticky header (plan §9.3).
 *
 * It answers two of the four orientation questions on its own — *where am I*
 * (breadcrumb) and *what have I completed* (progress) — in one row, replacing
 * the previous stacked navigation plus full-width in-content alert blocks that
 * pushed the lesson down the page.
 */
export function LearningHeader({
  path,
  currentStep,
  moduleTitle,
  onOpenSidebar,
  onOpenNotes,
  onOpenShortcuts,
  notesOpen,
  timer,
}: {
  path: LearningPath
  currentStep: LearningStepNode | undefined
  moduleTitle: string | null
  onOpenSidebar: () => void
  onOpenNotes: () => void
  onOpenShortcuts: () => void
  notesOpen: boolean
  /**
   * The learning timer, shown in this row's free space (LTM-008).
   *
   * Passed in rather than built here: the player owns the engagement state,
   * and a second subscription would be a second opinion about elapsed time.
   * It sits in the navigation row itself, so it stays on screen for the whole
   * lesson instead of scrolling away with the content.
   */
  timer?: React.ReactNode
}) {
  const router = useRouter()
  const { course, summary } = path

  /*
   * Back goes where the viewer came from (IL-001).
   *
   * An instructor reached the player from their own courses list, and the
   * public course page offers them enrolment they already have with no route
   * back to the dashboard they were working in.
   */
  const { user } = useAuth()
  const exitPath = learningExitPath(user?.bwenge_role, course.id)
  const exitLabel = learningExitLabel(user?.bwenge_role)

  /*
   * The header publishes its own height (LTM-007).
   *
   * The sidebar is pinned with `top-14 h-[calc(100vh-3.5rem)]` and the
   * content column with a matching `min-h`, both of which assumed this
   * region was exactly 56px. It no longer is while the learning timer is
   * shown, and a taller sticky header would hide the top of the sidebar
   * behind itself.
   *
   * Measured rather than derived: the alternative is for the page to
   * recompute the panel's visibility rule — `requiredMs !== null &&
   * !canComplete && !is_completed` — which is the same "two opinions" trap
   * the timer props exist to avoid. The element knows how tall it is.
   */
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = headerRef.current
    if (!element) return

    const root = document.documentElement
    const apply = () =>
      root.style.setProperty("--learn-header-h", `${element.offsetHeight}px`)

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(element)

    return () => {
      observer.disconnect()
      // Left set, the next page without this header would inherit it.
      root.style.removeProperty("--learn-header-h")
    }
  }, [])

  const daysRemaining = course.days_remaining
  const showDeadline =
    daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7

  return (
    <header
      ref={headerRef}
      /* No fixed height: the timer sits inside this sticky container, below
         the 56px nav row, so the region grows only while it is shown. */
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="banner"
    >
      <div className="relative flex h-14 items-center gap-2 px-3 sm:px-4">
        {/* Back */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => router.push(exitPath)}
          aria-label={exitLabel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Mobile: sidebar trigger doubles as the progress counter */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open course contents"
        >
          <ListTree className="h-3.5 w-3.5" />
          <span className="text-xs tabular-nums">
            {summary.completed_steps}/{summary.total_steps}
          </span>
        </Button>

        {/* Breadcrumb: Course › Module › Lesson.
            Capped so a long title cannot run under the centred button. */}
        <div className="min-w-0 flex-1 sm:max-w-[32%]">
          <div className="flex items-baseline gap-1.5 truncate">
            <span className="truncate text-sm font-semibold text-foreground">
              {course.title}
            </span>
            {moduleTitle && (
              <>
                <span className="text-muted-foreground/50" aria-hidden="true">
                  ›
                </span>
                <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                  {moduleTitle}
                </span>
              </>
            )}
          </div>
          {currentStep && (
            <p className="truncate text-xs text-muted-foreground">
              {currentStep.title}
            </p>
          )}
        </div>

        {/* Pushes what follows away from the capped breadcrumb. */}
        <div className="hidden flex-1 sm:block" aria-hidden="true" />

        {/*
          Back to My Learning (LRN-002), and the learning timer beside it
          (LTM-009).

          The icon button at the far left exits to wherever the viewer came
          from — `/courses/:id` for a learner, their own courses list for an
          instructor — which is useful but is not the learner's home. There
          was no route from the player back to /dashboard/learner at all.

          ── Why this is no longer absolutely centred ───────────────────────

          It used to be `absolute left-1/2 -translate-x-1/2`, so that it held
          the centre whatever the course title's length. Once the timer took
          the row's free space the two occupied the same place and the button
          disappeared behind it — an absolutely positioned element cannot
          participate in the flex row's spacing, so nothing was keeping them
          apart.

          Both are flow items now, in one group, so the layout itself
          guarantees they never overlap. The pair sits just left of centre
          rather than dead centre, which is a small price for a button that
          is always visible.
        */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2 sm:px-3"
            onClick={() => router.push("/dashboard/learner")}
            aria-label="Back to My Learning"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden text-xs font-medium sm:inline">
              My Learning
            </span>
          </Button>

          {/*
            Rendered at `md` and up: below that the row cannot hold both, and
            `LessonTimerNotice` carries the same state beside the completion
            button there. It renders nothing at all when the lesson has no
            time requirement or the gate is already satisfied, so the space
            simply returns to the spacers.
          */}
          {timer ? <div className="hidden md:block">{timer}</div> : null}
        </div>

        {/* And a second spacer, so the pair sits in the gap rather than flush
            against the progress group. */}
        <div className="hidden flex-1 sm:block" aria-hidden="true" />

        {/* Deadline chip — a single line, not a full-width alert block */}
        {showDeadline && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="hidden shrink-0 gap-1 border-warning/40 text-warning sm:inline-flex"
                >
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">
                    {daysRemaining! <= 0
                      ? "Expired"
                      : `${daysRemaining}d left`}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {daysRemaining! <= 0
                  ? "Your access to this course has expired."
                  : `You have ${daysRemaining} ${
                      daysRemaining === 1 ? "day" : "days"
                    } to complete this course.`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Progress — the one place a course percentage appears (§9.2) */}
        {summary.state === "NO_CONTENT" ? (
          // An empty course is not "0% forever"; it says so (G-10).
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            No published content yet
          </span>
        ) : (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Progress
              value={summary.percent}
              className="h-1.5 w-24 md:w-32"
              aria-label={`Course progress: ${summary.percent} percent`}
            />
            <span className="w-16 text-right text-xs font-medium tabular-nums text-muted-foreground">
              {summary.completed_steps}/{summary.total_steps}
            </span>
            {summary.state === "BLOCKED" && summary.blocked_by && (
              // A learner held up by a failed or pending activity is told
              // which one, rather than being left to work it out from the
              // padlocks further down the sidebar.
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/15 text-[10px] font-bold text-warning"
                      aria-label={`Blocked by ${summary.blocked_by}`}
                    >
                      !
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Blocked by &ldquo;{summary.blocked_by}&rdquo;
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/*
          The learning timer used to sit here, top-right (LTM-001), and was
          moved into the content column (LTM-004): at 56px, sharing this row
          with the breadcrumb, the progress bar and three icon buttons, it was
          reported as not visible. `LessonTimerPanel` in the player renders it
          now.
        */}

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={notesOpen ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={onOpenNotes}
                  aria-label="Toggle notes"
                  aria-pressed={notesOpen}
                >
                  <StickyNote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-8 w-8 md:inline-flex"
                  onClick={onOpenShortcuts}
                  aria-label="Keyboard shortcuts"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Mobile progress bar sits under the row so the header stays 56px */}
      <div className="sm:hidden">
        <Progress
          value={summary.percent}
          className={cn("h-0.5 rounded-none")}
          aria-label={`Course progress: ${summary.percent} percent`}
        />
      </div>

      {/*
        LTM-008. The timer moved up into the navigation row itself, into the
        free space beside "My Learning" — see the slot above. It was briefly a
        full-width strip here, beneath the row (LTM-007), which read as a
        separate band rather than as part of the navigation.
      */}
    </header>
  )
}
