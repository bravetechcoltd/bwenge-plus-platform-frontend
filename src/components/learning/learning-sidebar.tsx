"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileQuestion,
  Loader2,
  Lock,
  Search,
  Star,
  Video,
  X,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  learningApi,
  type LearningPath,
  type LearningStepNode,
  type ModuleRollup,
  type StepState,
} from "@/lib/learning/api"
import { useDebounce } from "@/hooks/use-debounce"

/**
 * ============================================================================
 * LearningSidebar — course contents
 * ============================================================================
 *
 * Renders server-supplied state: `LearningPathService` decides locks and
 * roll-ups, and this component draws them. A locked step explains *why*,
 * because the reason arrives alongside the state, and search is server-side.
 *
 * ── The compact layout ──────────────────────────────────────────────────────
 *
 * A course contents rail has to hold four things in ~300px without any of them
 * hiding the others: where you are, what you have done, what is left, and why
 * something is closed. The layout below is built around that:
 *
 *   • **Titles wrap, they do not vanish.** Module and lesson titles clamp to
 *     two lines rather than being cut mid-word, and carry the full text as a
 *     tooltip. Real course titles — "MARKET EQUILIBRIUM FUNDAMENTALS",
 *     "Demand, Supply, and Equilibrium Price" — do not fit on one line at this
 *     width, and truncating them to "Demand, Supply, and Equi…" makes two
 *     lessons in the same module indistinguishable.
 *   • **The module header is sticky.** Scrolling a long module never leaves
 *     you wondering which one you are inside.
 *   • **Progress is a hairline, not a row.** Each module carries a 2px track
 *     under its header instead of a separate percentage line, so the count and
 *     the proportion cost one row between them.
 *   • **Metadata is one line, dot-separated, and omitted when empty.** A
 *     lesson with no duration and no score renders as a single line.
 *   • **The active step is marked with a left accent bar**, not a full ring —
 *     it reads at a glance and costs no horizontal space.
 */

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  content: BookOpen,
  video: Video,
  assessment: FileQuestion,
}

function stepIcon(step: LearningStepNode) {
  if (step.kind === "module_final") return Award
  return STEP_ICONS[step.type] ?? BookOpen
}

function stateVisual(state: StepState) {
  switch (state) {
    case "passed":
      return { Icon: CheckCircle2, className: "text-success" }
    case "pending":
      return { Icon: Clock, className: "text-warning" }
    case "failed":
      return { Icon: XCircle, className: "text-destructive" }
    case "locked":
      return { Icon: Lock, className: "text-muted-foreground/70" }
    default:
      return null
  }
}

/**
 * Radix renders the scroll viewport's children inside a `display: table`
 * wrapper, which shrink-wraps to its content instead of to the rail. Anything
 * with `truncate` or `line-clamp` therefore never clamps — the row simply grows
 * and pushes its own right-hand content out of sight, which is exactly how a
 * long module title used to run off the edge and take the `4/5` counter with
 * it. Forcing the wrapper back to `block` makes the rail the width authority.
 *
 * Scoped to this component deliberately: the shared `ScrollArea` is used across
 * the app and its default behaviour is fine wherever clamping is not wanted.
 *
 * `display: table` is set as an *inline style* by Radix, so the override has to
 * be `!important` — hence the trailing `!` (Tailwind v4's important modifier;
 * the v3 leading-`!` form does not compile here).
 */
const SCROLL_VIEWPORT_FIX =
  "[&>[data-slot=scroll-area-viewport]>div]:block!"

interface LearningSidebarProps {
  path: LearningPath
  activeStepId: string | null
  onSelectStep: (step: LearningStepNode) => void
  onSelectCompletion: () => void
  isCompletionActive: boolean
  bookmarkedLessonIds: Set<string>
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

export function LearningSidebar(props: LearningSidebarProps) {
  const { mobileOpen, onMobileOpenChange } = props

  return (
    <>
      {/* Desktop: persistent rail */}
      <aside
        className="hidden w-[19rem] shrink-0 border-r border-border bg-sidebar xl:w-80 lg:block"
        aria-label="Course contents"
      >
        <div className="sticky top-[var(--learn-header-h,3.5rem)] h-[calc(100vh-var(--learn-header-h,3.5rem))]">
          <SidebarBody {...props} />
        </div>
      </aside>

      {/* Mobile: drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[88vw] max-w-sm p-0 sm:w-80">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-sm font-semibold">Course contents</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-var(--learn-header-h,3.5rem))]">
            <SidebarBody {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarBody({
  path,
  activeStepId,
  onSelectStep,
  onSelectCompletion,
  isCompletionActive,
  bookmarkedLessonIds,
  onMobileOpenChange,
}: LearningSidebarProps) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searching, setSearching] = useState(false)
  const debouncedQuery = useDebounce(query, 300)

  const listRef = useRef<HTMLDivElement>(null)
  const storageKey = `bwenge:sidebar:${path.course.id}`
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  // Restore the learner's expand/collapse choices for this course.
  useEffect(() => {
    let restored: string[] = []
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) restored = JSON.parse(raw)
    } catch {
      // Private mode or blocked storage — fall back to defaults.
    }

    const activeModule = path.steps.find((s) => s.step_id === activeStepId)?.module_id
    const next = new Set<string>(restored)
    if (activeModule) next.add(activeModule)
    if (next.size === 0 && path.modules[0]) next.add(path.modules[0].id)
    setExpanded(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.course.id])

  // Keep the module containing the active step open.
  useEffect(() => {
    const activeModule = path.steps.find((s) => s.step_id === activeStepId)?.module_id
    if (!activeModule) return
    setExpanded((prev) => {
      if (prev.has(activeModule)) return prev
      const next = new Set(prev)
      next.add(activeModule)
      return next
    })
  }, [activeStepId, path.steps])

  const toggleModule = useCallback(
    (moduleId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(moduleId)) next.delete(moduleId)
        else next.add(moduleId)
        try {
          window.localStorage.setItem(storageKey, JSON.stringify([...next]))
        } catch {
          // Non-critical.
        }
        return next
      })
    },
    [storageKey]
  )

  // ── Server-side search (A14) ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    if (debouncedQuery.trim().length < 2) {
      setSearchResults(null)
      setSearching(false)
      return
    }

    setSearching(true)
    learningApi
      .search(path.course.id, debouncedQuery.trim())
      .then((res) => {
        if (!cancelled) setSearchResults(res.results)
      })
      .catch(() => {
        if (!cancelled) setSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, path.course.id])

  // ── Roving focus through step buttons ────────────────────────────────────
  const onListKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return

    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-step-button]") ?? []
    ).filter((b) => !b.disabled)

    if (buttons.length === 0) return

    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    event.preventDefault()

    const nextIndex =
      event.key === "ArrowDown"
        ? Math.min(buttons.length - 1, index + 1)
        : Math.max(0, index - 1)

    buttons[nextIndex < 0 ? 0 : nextIndex]?.focus()
  }, [])

  const stepById = useMemo(() => {
    const map = new Map<string, LearningStepNode>()
    for (const step of path.steps) map.set(step.step_id, step)
    return map
  }, [path.steps])

  // Canonical L3 figures, keyed for lookup. The chip and the hairline both read
  // from here, so the sidebar can never show a percentage the header disagrees
  // with.
  const rollupByModule = useMemo(() => {
    const map = new Map<string, ModuleRollup>()
    for (const rollup of path.rollups?.modules ?? []) map.set(rollup.module_id, rollup)
    return map
  }, [path.rollups])

  const handleSelect = useCallback(
    (step: LearningStepNode) => {
      if (step.state === "locked") return
      onSelectStep(step)
      onMobileOpenChange(false)
    },
    [onSelectStep, onMobileOpenChange]
  )

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full flex-col">
        {/* Search */}
        <div className="shrink-0 border-b border-sidebar-border p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this course"
              aria-label="Search course content"
              className="h-8 pl-8 pr-8 text-[13px]"
              data-learning-search
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className={cn("min-h-0 flex-1", SCROLL_VIEWPORT_FIX)}>
          <div ref={listRef} onKeyDown={onListKeyDown} className="p-1.5">
            {searchResults !== null ? (
              <SearchResults
                results={searchResults}
                searching={searching}
                stepById={stepById}
                activeStepId={activeStepId}
                onSelect={handleSelect}
              />
            ) : (
              <>
                {path.modules.map((module, moduleIndex) => (
                  <ModuleGroup
                    key={module.id}
                    module={module}
                    rollup={rollupByModule.get(module.id)}
                    index={moduleIndex + 1}
                    isOpen={expanded.has(module.id)}
                    onToggle={() => toggleModule(module.id)}
                    activeStepId={activeStepId}
                    bookmarkedLessonIds={bookmarkedLessonIds}
                    onSelect={handleSelect}
                  />
                ))}

                {/* Course completion */}
                <div className="mt-1.5 border-t border-sidebar-border pt-1.5">
                  <button
                    type="button"
                    data-step-button
                    disabled={!path.summary.is_course_complete}
                    onClick={() => {
                      onSelectCompletion()
                      onMobileOpenChange(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isCompletionActive
                        ? "bg-primary/10 font-medium text-foreground ring-1 ring-inset ring-primary/25"
                        : path.summary.is_course_complete
                          ? "hover:bg-sidebar-accent"
                          : "cursor-not-allowed opacity-55"
                    )}
                    aria-current={isCompletionActive ? "step" : undefined}
                    title={
                      path.summary.is_course_complete
                        ? undefined
                        : "Pass every lesson and assessment to unlock this."
                    }
                  >
                    {path.summary.is_course_complete ? (
                      <Award className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    )}
                    <span className="min-w-0 flex-1 truncate">Course completion</span>
                    {path.summary.is_course_complete && (
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-success">
                        100%
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

/**
 * One module: a sticky header carrying the number, the title, the count and a
 * hairline progress track, over the list of its steps.
 */
function ModuleGroup({
  module: moduleNode,
  rollup,
  index,
  isOpen,
  onToggle,
  activeStepId,
  bookmarkedLessonIds,
  onSelect,
}: {
  module: LearningPath["modules"][number]
  rollup: ModuleRollup | undefined
  index: number
  isOpen: boolean
  onToggle: () => void
  activeStepId: string | null
  bookmarkedLessonIds: Set<string>
  onSelect: (step: LearningStepNode) => void
}) {
  const complete = moduleNode.state === "completed"
  const locked = moduleNode.state === "locked"
  const blocked = rollup?.state === "BLOCKED"

  const total = moduleNode.total_steps
  const done = moduleNode.completed_steps
  const percent = rollup?.percent ?? (total > 0 ? Math.round((done / total) * 100) : 0)
  const hasProgress = percent > 0 && !complete

  const label = `${index}. ${moduleNode.title}`

  return (
    <section className="mb-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className={cn(
              // `sticky` keeps the module you are inside visible while its
              // steps scroll past. `z-10` and an opaque background stop the
              // rows showing through it.
              "sticky top-0 z-10 flex w-full items-start gap-2 rounded-md bg-sidebar px-2 py-2 text-left transition-colors",
              "hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            {isOpen ? (
              <ChevronDown className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}

            {/* Number chip — carries the module's state as a colour, so the
                row needs no separate status icon. */}
            <span
              className={cn(
                "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[10px] font-semibold tabular-nums",
                complete
                  ? "bg-success/15 text-success"
                  : blocked
                    ? "bg-warning/15 text-warning"
                    : locked
                      ? "bg-muted text-muted-foreground/70"
                      : "bg-primary/10 text-primary"
              )}
              aria-hidden="true"
            >
              {index}
            </span>

            <span className="min-w-0 flex-1">
              {/* Two lines, then ellipsis — a real module title does not fit
                  on one at this width, and cutting it mid-word makes two
                  modules in the same course look identical. */}
              <span
                className={cn(
                  "line-clamp-2 text-[13px] font-semibold leading-[1.35] tracking-tight",
                  locked ? "text-muted-foreground" : "text-sidebar-foreground"
                )}
              >
                {label}
              </span>
            </span>

            <span className="mt-px flex shrink-0 items-center gap-1">
              {complete ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : locked ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
              ) : (
                <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {done}/{total}
                </span>
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-64">
          <p className="font-medium">{label}</p>
          <p className="mt-0.5 text-xs opacity-80">
            {complete
              ? "Completed"
              : locked
                ? "Locked"
                : blocked && rollup?.blocked_by
                  ? `Blocked by "${rollup.blocked_by}"`
                  : `${done} of ${total} complete · ${percent}%`}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Hairline progress. Costs 2px instead of a whole row, and disappears
          entirely once the module is done — a full bar next to a tick is
          saying the same thing twice. */}
      {hasProgress && (
        <div
          className="mx-2 mb-0.5 h-[2px] overflow-hidden rounded-full bg-muted"
          role="presentation"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              blocked ? "bg-warning" : "bg-primary"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {isOpen && (
        <ul className="ml-[15px] space-y-px border-l border-sidebar-border pl-1.5">
          {moduleNode.steps.map((step) => (
            <li key={step.step_id}>
              <StepRow
                step={step}
                isActive={step.step_id === activeStepId}
                isBookmarked={!!step.lesson_id && bookmarkedLessonIds.has(step.lesson_id)}
                onSelect={onSelect}
              />
            </li>
          ))}
          {moduleNode.steps.length === 0 && (
            <li className="px-2 py-2.5 text-[11px] text-muted-foreground">
              No lessons in this module yet.
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

function StepRow({
  step,
  isActive,
  isBookmarked,
  onSelect,
}: {
  step: LearningStepNode
  isActive: boolean
  isBookmarked: boolean
  onSelect: (step: LearningStepNode) => void
}) {
  const Icon = stepIcon(step)
  const visual = stateVisual(step.state)
  const locked = step.state === "locked"

  // Metadata is assembled first so the line can be dropped entirely when there
  // is nothing to put on it — an empty row of padding under every title is what
  // makes a contents list feel loose.
  const meta: React.ReactNode[] = []

  if (step.duration_minutes) {
    meta.push(
      <span key="d" className="tabular-nums">
        {step.duration_minutes} min
      </span>
    )
  }

  if (step.kind !== "lesson" && step.state === "passed" && step.score !== null) {
    meta.push(
      <span key="s" className="font-medium tabular-nums text-success">
        {Math.round(step.score)}%
      </span>
    )
  }

  if (step.kind !== "lesson" && step.state === "failed") {
    meta.push(
      <span key="f" className="font-medium text-destructive">
        Retake
      </span>
    )
  }

  if (step.kind !== "lesson" && step.state === "pending") {
    meta.push(
      <span key="p" className="font-medium text-warning">
        Grading
      </span>
    )
  }

  if (
    step.kind !== "lesson" &&
    step.attempts.allowed !== null &&
    step.state !== "passed"
  ) {
    meta.push(
      <span key="a" className="tabular-nums">
        {step.attempts.used}/{step.attempts.allowed} tries
      </span>
    )
  }

  if (!step.is_required) {
    meta.push(
      <span key="o" className="text-muted-foreground/80">
        Optional
      </span>
    )
  }

  const row = (
    <button
      type="button"
      data-step-button
      disabled={locked}
      onClick={() => onSelect(step)}
      aria-current={isActive ? "step" : undefined}
      aria-label={
        locked && step.state_reason
          ? `${step.title}. Locked: ${step.state_reason}`
          : step.title
      }
      className={cn(
        "group relative flex w-full items-start gap-2 rounded-md py-1.5 pl-2 pr-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary/[0.07] font-medium text-foreground"
          : locked
            ? "cursor-not-allowed opacity-60"
            : "hover:bg-sidebar-accent"
      )}
    >
      {/* Left accent instead of a full ring: reads instantly, costs no width. */}
      {isActive && (
        <span
          className="absolute inset-y-1 left-0 w-[2.5px] rounded-full bg-primary"
          aria-hidden="true"
        />
      )}

      <span className="mt-[3px] shrink-0">
        {visual ? (
          <visual.Icon className={cn("h-[15px] w-[15px]", visual.className)} />
        ) : (
          <Icon
            className={cn(
              "h-[15px] w-[15px]",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-1.5">
          <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-[1.35]">
            {step.title}
          </span>
          {isBookmarked && (
            <Star className="mt-[3px] h-3 w-3 shrink-0 fill-warning text-warning" />
          )}
        </span>

        {meta.length > 0 && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground">
            {meta.map((node, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span className="text-muted-foreground/40" aria-hidden="true">
                    ·
                  </span>
                )}
                {node}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  )

  // Every step gets its full title on hover, so a two-line clamp never hides
  // anything. A locked step shows the server's reason instead.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{row}</span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-64">
        <p className="font-medium">{step.title}</p>
        {locked && step.state_reason && (
          <p className="mt-0.5 text-xs opacity-80">{step.state_reason}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function SearchResults({
  results,
  searching,
  stepById,
  activeStepId,
  onSelect,
}: {
  results: any[]
  searching: boolean
  stepById: Map<string, LearningStepNode>
  activeStepId: string | null
  onSelect: (step: LearningStepNode) => void
}) {
  if (searching) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Searching…
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-[13px] font-medium text-foreground">No matches</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a different word or phrase.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {results.length} {results.length === 1 ? "result" : "results"}
      </p>
      {results.map((result) => {
        const step = stepById.get(result.step_id)
        if (!step) return null
        return (
          <button
            key={result.lesson_id}
            type="button"
            data-step-button
            disabled={step.state === "locked"}
            onClick={() => onSelect(step)}
            className={cn(
              "w-full rounded-md px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              step.step_id === activeStepId
                ? "bg-primary/[0.07]"
                : step.state === "locked"
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-sidebar-accent"
            )}
          >
            <span className="flex items-start gap-1.5">
              {step.state === "locked" ? (
                <Lock className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              ) : (
                <BookOpen className="mt-[3px] h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-[1.35]">
                {result.title}
              </span>
            </span>
            {result.excerpt && (
              <span className="mt-1 block line-clamp-2 pl-5 text-[11px] leading-snug text-muted-foreground">
                {result.excerpt}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
