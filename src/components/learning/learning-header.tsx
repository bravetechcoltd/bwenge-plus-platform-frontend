"use client"

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
}: {
  path: LearningPath
  currentStep: LearningStepNode | undefined
  moduleTitle: string | null
  onOpenSidebar: () => void
  onOpenNotes: () => void
  onOpenShortcuts: () => void
  notesOpen: boolean
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

  const daysRemaining = course.days_remaining
  const showDeadline =
    daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7

  return (
    <header
      className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="banner"
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
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

        {/* Breadcrumb: Course › Module › Lesson */}
        <div className="min-w-0 flex-1">
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
    </header>
  )
}
