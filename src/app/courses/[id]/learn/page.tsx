"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"

import { useAuth } from "@/hooks/use-auth"
import { learningExitPath } from "@/lib/learning/exit-destination"
import { useLearningProgress } from "@/hooks/use-learning-progress"
import { useLessonEngagement } from "@/hooks/use-lesson-engagement"
import { useToast } from "@/hooks/use-toast"
import {
  learningApi,
  LearningApiError,
  type LearningStepNode,
  type LessonPayload,
} from "@/lib/learning/api"
import type { LeaveReason } from "@/hooks/use-assessment-navigation-guard"

import { clearPrefetch } from "@/lib/learning/prefetch"

import { LearningHeader } from "@/components/learning/learning-header"
import { LearningSidebar } from "@/components/learning/learning-sidebar"
import {
  LearningActionBar,
  type PrimaryAction,
} from "@/components/learning/learning-action-bar"
import { LessonScreen } from "@/components/learning/lesson-screen"
import { NotesPanel } from "@/components/learning/notes-panel"
import {
  KeyboardShortcutsDialog,
  useLearningShortcuts,
} from "@/components/learning/keyboard-shortcuts"
import {
  AssessmentSkeleton,
  LearningErrorState,
  LearningLockedState,
  LearningNoContentState,
  LearningPageSkeleton,
  OfflineBanner,
} from "@/components/learning/learning-states"
import {
  LessonTimerNotice,
  LessonTimerChip,
} from "@/components/learning/lesson-timer"

/**
 * ============================================================================
 * Learning Space
 * ============================================================================
 *
 * The orchestrator. What changed from the previous 733-line version:
 *
 *  • It no longer builds the curriculum. `generateLearningSteps()` and the
 *    lock rules that lived here and in the sidebar now run on the server, so
 *    the browser renders position rather than deciding it.
 *  • It no longer reports scores or completion. Lesson completion is
 *    evidence-validated server-side; assessment progress is a side effect of
 *    grading.
 *  • It no longer distrusts the backend. The old progress hook carried
 *    comments explaining that enrollment status could report COMPLETED at 75%
 *    — that contradiction is gone now that one service owns progress writes.
 *
 * Heavy screens are code-split: the assessment runner, course completion and
 * certificate were the three largest bundles in this route and are only needed
 * on the steps that use them.
 */

const AssessmentRunner = dynamic(
  () =>
    import("@/components/learning/assessment-runner").then((m) => ({
      default: m.AssessmentRunner,
    })),
  { ssr: false, loading: () => <AssessmentSkeleton /> }
)

const CourseCompletion = dynamic(
  () => import("@/components/learning/course-completion"),
  { ssr: false, loading: () => <AssessmentSkeleton /> }
)

const CourseRating = dynamic(() => import("@/components/learning/course-rating"), {
  ssr: false,
})

const CompletionCelebration = dynamic(
  () =>
    import("@/components/learning/completion-celebration").then((m) => ({
      default: m.CompletionCelebration,
    })),
  { ssr: false }
)

const COMPLETION_STEP_ID = "__course-completion__"

export default function CourseLearningPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: courseId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  // ── Navigation state ─────────────────────────────────────────────────────
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [celebration, setCelebration] = useState<any>(null)

  /**
   * LC-CONS-001 §14.2 interception point 1 — the sidebar.
   *
   * Changing step is a `setState` call, not a route change, so no browser
   * event fires and nothing observed it. Finding P-15 is that this is the most
   * common way a learner leaves an active assessment, and it was the one exit
   * with no lock on it.
   *
   * The runner publishes a gate here while an attempt is open, and every
   * navigation below awaits it. `null` means there is nothing to protect, so
   * navigation is immediate — the ordinary case for a lesson.
   */
  const [assessmentGuard, setAssessmentGuard] = useState<
    ((reason: LeaveReason) => Promise<boolean>) | null
  >(null)

  // `useState` treats a stored function as an updater, so it must be wrapped.
  const publishAssessmentGuard = useCallback(
    (guard: ((reason: LeaveReason) => Promise<boolean>) | null) => {
      setAssessmentGuard(() => guard)
    },
    []
  )

  const celebratedRef = useRef<Set<string>>(new Set())

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login")
  }, [authLoading, user, router])

  // ── Connection status ────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  // Drop the bundle prefetch when the learner leaves, so a different course
  // never inherits entries from this one.
  useEffect(() => clearPrefetch, [])

  // ── The learning path (server-authoritative) ─────────────────────────────
  const {
    path,
    steps,
    rollups,
    lessonRollup,
    moduleRollup,
    isLoading: pathLoading,
    error: pathError,
    getStep,
    nextStep,
    previousStep,
    applyDiff,
    optimisticComplete,
    refresh: refreshPath,
  } = useLearningProgress(courseId, selectedStepId)

  /*
   * LRN-003. Opening the player at a particular step.
   *
   * ── What was broken ──────────────────────────────────────────────────────
   *
   * Three pages offered "View result" and sent the learner to
   *
   *   /courses/:id/assessments/:assessmentId/results?attempt=1
   *
   * which is not a route in this application and never has been — the only
   * routes under /courses are `[id]` and `[id]/learn`. All three produced a
   * 404. The progress page's "Continue" links on each module carried
   * `?module=<id>` for the same purpose, and this page read no query
   * parameters at all, so those silently landed on the resume step instead.
   *
   * ── Why a parameter rather than a results page ───────────────────────────
   *
   * The result screen already exists: `AssessmentRunner` loads the latest
   * result for a finished attempt and renders `ResultView`, honouring the
   * release policy and carrying the integrity panel with it. A separate
   * results route would be a second implementation of that screen, which is
   * how this codebase ended up with five certificate designs.
   *
   * `alias_ids` is matched too — it exists for precisely this, "a client
   * holding a retired id can still recognise which step it belongs to".
   */
  const deepLinkRef =
    searchParams.get("assessment") ||
    searchParams.get("lesson") ||
    searchParams.get("step") ||
    null
  const deepLinkModule = searchParams.get("module")
  const [deepLinkApplied, setDeepLinkApplied] = useState(false)

  useEffect(() => {
    // Once only, and only once the path is in hand: after that the learner's
    // own navigation owns the selection, so a re-render must not drag them
    // back to where the link pointed.
    if (deepLinkApplied || !steps || steps.length === 0) return
    if (!deepLinkRef && !deepLinkModule) {
      setDeepLinkApplied(true)
      return
    }

    const match = deepLinkRef
      ? steps.find(
          (step: any) =>
            step.step_id === deepLinkRef ||
            step.ref_id === deepLinkRef ||
            step.lesson_id === deepLinkRef ||
            (Array.isArray(step.alias_ids) &&
              step.alias_ids.includes(deepLinkRef))
        )
      : // A module link opens that module's first step, which is what
        // "Continue" on a module card means.
        steps.find((step: any) => step.module_id === deepLinkModule)

    if (match) setSelectedStepId(match.step_id)
    setDeepLinkApplied(true)
  }, [deepLinkApplied, deepLinkRef, deepLinkModule, steps])

  // Land the learner where the server says they left off.
  const activeStepId = selectedStepId ?? path?.summary.current_step_id ?? null
  const isCompletionView = activeStepId === COMPLETION_STEP_ID
  const activeStep = isCompletionView ? undefined : getStep(activeStepId ?? "")

  const activeModule = useMemo(
    () => path?.modules.find((m) => m.id === activeStep?.module_id) ?? null,
    [path, activeStep]
  )

  // ── Lesson payload ───────────────────────────────────────────────────────
  const lessonId = activeStep?.kind === "lesson" ? activeStep.ref_id : null

  const {
    data: lessonPayload,
    isLoading: lessonLoading,
    error: lessonError,
    mutate: refreshLesson,
  } = useSWR<LessonPayload, LearningApiError>(
    lessonId ? ["lesson", lessonId] : null,
    () => learningApi.getLesson(lessonId!),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (err) =>
        !(err instanceof LearningApiError && err.isTerminal),
    }
  )

  // ── Bookmarks ────────────────────────────────────────────────────────────
  const { data: bookmarks, mutate: refreshBookmarks } = useSWR(
    courseId ? ["bookmarks", courseId] : null,
    () => learningApi.listBookmarks(courseId),
    { revalidateOnFocus: false }
  )

  const bookmarkedLessonIds = useMemo(
    () => new Set<string>((bookmarks ?? []).map((b: any) => b.lesson_id)),
    [bookmarks]
  )

  // ── Engagement ───────────────────────────────────────────────────────────
  const hasMeasurableVideo = useMemo(() => {
    const primary = lessonPayload?.media.find((m) => m.role === "PRIMARY_VIDEO")
    return !!primary && !primary.is_external
  }, [lessonPayload])

  const engagement = useLessonEngagement({
    lessonId: lessonId ?? undefined,
    content: lessonPayload?.lesson?.content ?? null,
    hasMeasurableVideo,
    // From the **step**, which reads the canonical `progress` leaf — the same
    // field the sidebar tick and the action-bar chip read. Sourcing it from
    // `lesson_progress` (as `learner_state` used to) is what made a lesson
    // finished months ago re-open its gate and then refuse to complete (G-01).
    alreadyCompleted: activeStep?.is_completed === true,
    initialPositionSeconds: lessonPayload?.learner_state.last_position_seconds ?? 0,
    /*
     * LTM-001. The server's own evaluation for this lesson.
     *
     * Carries the dwell requirement and the dwell already accumulated, so the
     * learning timer has real figures on the first render and a refresh
     * resumes the countdown instead of restarting it. Also what keeps the
     * button disabled from the opening frame on a duration-gated lesson,
     * rather than relying on the local estimate that cannot see the gate.
     */
    initialEvidence: lessonPayload?.evidence ?? null,
    enabled: !!lessonId && !isOffline,
  })

  // `engagement` is rebuilt every render; this one member is not, so callbacks
  // depend on it directly instead of on the whole object.
  const collectEvidence = engagement.collect

  // ── Navigation ───────────────────────────────────────────────────────────
  /**
   * The one gate every in-page navigation passes through.
   *
   * Resolves immediately when no attempt is open, so a learner moving between
   * lessons sees nothing new. While an attempt *is* open it shows the leave
   * warning and resolves with the learner's answer — and only a confirmation
   * records an event (§14.6 rule 5).
   */
  const mayLeaveAssessment = useCallback(async (): Promise<boolean> => {
    if (!assessmentGuard) return true
    return assessmentGuard("STEP_CHANGE")
  }, [assessmentGuard])

  const goToStep = useCallback(
    (step: LearningStepNode) => {
      if (step.state === "locked") {
        toast({
          title: "Locked",
          description: step.state_reason ?? "Complete the previous steps first.",
        })
        return
      }

      void mayLeaveAssessment().then((allowed) => {
        if (!allowed) return
        setSelectedStepId(step.step_id)
        window.scrollTo({ top: 0, behavior: "smooth" })
      })
    },
    [toast, mayLeaveAssessment]
  )

  const goToCompletion = useCallback(() => {
    if (!path?.summary.is_course_complete) {
      toast({
        title: "Not finished yet",
        description: "Pass every lesson and assessment to unlock your certificate.",
      })
      return
    }

    void mayLeaveAssessment().then((allowed) => {
      if (!allowed) return
      setSelectedStepId(COMPLETION_STEP_ID)
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }, [path, toast, mayLeaveAssessment])

  const goNext = useCallback(() => {
    if (!activeStep) return
    const next = nextStep(activeStep.step_id)
    if (next) {
      goToStep(next)
    } else if (path?.summary.is_course_complete) {
      goToCompletion()
    }
  }, [activeStep, nextStep, goToStep, path, goToCompletion])

  /**
   * Leaving an assessment from its own Exit control.
   *
   * Goes *back* — to the step before it, or to the course if there is none.
   * Never forward: mid-attempt the next step is locked, and `goToStep`
   * refuses a locked step with a toast, which is why Exit appeared to do
   * nothing at all.
   *
   * Deliberately does not call `mayLeaveAssessment()`. The runner has
   * already shown its own confirmation and recorded the departure; running
   * the guard here would ask the learner a second time for the same
   * decision, and the second dialog has no way of knowing the first one
   * already said yes.
   */
  const exitAssessment = useCallback(() => {
    const previous = activeStep ? previousStep(activeStep.step_id) : null
    if (previous) {
      setSelectedStepId(previous.step_id)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    router.push(learningExitPath(user?.bwenge_role, courseId))
  }, [activeStep, previousStep, courseId, router, user?.bwenge_role])

  const goPrevious = useCallback(() => {
    if (isCompletionView) {
      const last = steps[steps.length - 1]
      if (last) goToStep(last)
      return
    }
    if (!activeStep) return
    const previous = previousStep(activeStep.step_id)
    if (previous) goToStep(previous)
  }, [activeStep, previousStep, goToStep, isCompletionView, steps])

  // ── Report position so resume works across devices ───────────────────────
  useEffect(() => {
    if (!activeStep || isCompletionView) return

    const payload =
      activeStep.kind === "lesson"
        ? { courseId, lessonId: activeStep.ref_id }
        : { courseId, assessmentId: activeStep.ref_id }

    // Fire and forget: a refusal here means the step is locked, and the guard
    // already stopped the learner from getting this far.
    void learningRequestSilent("/progress/update-current-step", payload)
  }, [activeStep?.step_id, courseId, isCompletionView, activeStep])

  // ── Lesson completion ────────────────────────────────────────────────────
  const handleCompleteLesson = useCallback(async () => {
    if (!lessonId) return
    setCompleting(true)

    // Snapshot the evidence without sending it. This used to be a POST to
    // /heartbeat that had to complete before the completion request could even
    // start — two serial round trips for one press, and the first existed only
    // so the second would not be refused for evidence the server had not
    // received yet. It now travels in the completion body and is recorded
    // inside the same learner lock, which is both faster and less racy.
    const draft = collectEvidence()

    // Move the interface on the click rather than on the response. The button
    // is only enabled when the server's own last verdict said `can_complete`,
    // so a refusal is the exception — and the catch below revalidates, which
    // puts the tick back if one arrives.
    optimisticComplete(lessonId)

    try {
      const result = await learningApi.completeLesson(
        lessonId,
        draft?.payload ?? null
      )

      // The server took the evidence; stop carrying it.
      draft?.commit()

      // Apply the server's diff rather than refetching. One merge updates the
      // step icon, the module chip, the header ring and the action bar in a
      // single render — with the server's numbers, and with no intermediate
      // frame where two of them disagree.
      const diff = result?.progress_diff
      applyDiff(diff)

      // The lesson payload still needs a refresh for its own learner state
      // (notes, bookmark, position); completion no longer comes from it.
      void refreshLesson()

      // Celebration is server-confirmed. It used to be guessed from the
      // pre-refresh path as `completed_steps + 1 >= total_steps`, which fired
      // "Module complete!" one step early in any module where a lesson is
      // followed by an assessment (G-16).
      const courseComplete = diff?.course?.state_to === "COMPLETED"
      const completedModule = (diff?.modules ?? []).find(
        (m) => m.to === "COMPLETED" && m.from !== "COMPLETED"
      )
      const stepKey = activeStep?.step_id ?? lessonId

      if (!celebratedRef.current.has(stepKey)) {
        celebratedRef.current.add(stepKey)

        if (courseComplete || completedModule) {
          setCelebration({
            stepTitle: activeStep?.title,
            stepType: activeStep?.type,
            isLessonComplete: true,
            isModuleComplete: !!completedModule,
            moduleTitle: completedModule?.title,
            isCourseComplete: courseComplete,
            nextStepTitle: nextStep(activeStep?.step_id)?.title,
          })
          return
        }
      }

      if (!courseComplete) goNext()
    } catch (err) {
      const apiError = err as LearningApiError

      // Undo the optimistic tick against the server's own state — never
      // against a locally reconstructed one, which is how the two used to
      // drift apart.
      void refreshPath()

      toast({
        title:
          apiError?.code === "INSUFFICIENT_EVIDENCE"
            ? "Almost there"
            : "Couldn't mark complete",
        description: apiError?.message || "Please try again.",
        variant: apiError?.code === "INSUFFICIENT_EVIDENCE" ? "default" : "destructive",
      })
    } finally {
      setCompleting(false)
    }
  }, [
    lessonId,
    // `collect` is stable; the engagement object itself is a fresh literal on
    // every render, and depending on it rebuilt this callback — and the
    // action bar's memoised primary action — on each one.
    collectEvidence,
    optimisticComplete,
    applyDiff,
    refreshLesson,
    refreshPath,
    activeStep,
    nextStep,
    goNext,
    toast,
  ])

  /**
   * "Review the lesson" on a failed assessment.
   *
   * Goes back to the lesson the activity hangs off — which is the material
   * the learner just got wrong. It was wired to `goNext`, so it advanced past
   * that lesson instead. A module-final has no owning lesson, so there it
   * falls back to the previous step, which is the last lesson of the module.
   */
  const handleReviewLesson = useCallback(() => {
    const ownerId = activeStep?.lesson_id
    const lessonStep = ownerId
      ? steps.find((s) => s.kind === "lesson" && s.ref_id === ownerId)
      : undefined

    if (lessonStep) goToStep(lessonStep)
    else goPrevious()
  }, [activeStep, steps, goToStep, goPrevious])

  // ── Bookmarks ────────────────────────────────────────────────────────────
  const handleToggleBookmark = useCallback(async () => {
    if (!lessonId) return
    const bookmarked = lessonPayload?.learner_state.is_bookmarked === true

    setBookmarkPending(true)
    try {
      if (bookmarked) await learningApi.removeBookmark(lessonId)
      else await learningApi.addBookmark(lessonId)
      await Promise.all([refreshLesson(), refreshBookmarks()])
    } catch {
      toast({
        title: "Couldn't update bookmark",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setBookmarkPending(false)
    }
  }, [lessonId, lessonPayload, refreshLesson, refreshBookmarks, toast])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useLearningShortcuts(
    {
      onNext: goNext,
      onPrevious: goPrevious,
      onToggleSidebar: () => setSidebarOpen((open) => !open),
      onToggleNotes: () => setNotesOpen((open) => !open),
      onFocusSearch: () => {
        const input = document.querySelector<HTMLInputElement>("[data-learning-search]")
        if (input) {
          input.focus()
        } else {
          setSidebarOpen(true)
          setTimeout(
            () =>
              document.querySelector<HTMLInputElement>("[data-learning-search]")?.focus(),
            150
          )
        }
      },
      onShowHelp: () => setShortcutsOpen(true),
    },
    !!path
  )

  // ── Primary action ───────────────────────────────────────────────────────
  const primaryAction: PrimaryAction = useMemo(() => {
    const none: PrimaryAction = {
      kind: "none",
      label: "",
      disabled: true,
      onClick: () => undefined,
    }

    if (isCompletionView || !activeStep) return none

    // Assessment steps drive their own actions from inside the runner.
    if (activeStep.kind !== "lesson") return none

    // One question, one source. This used to ask `learner_state` while the
    // line below asked the step, so the bar could show "Completed" and offer
    // a disabled "Mark complete" at the same time.
    if (activeStep.is_completed) {
      const next = nextStep(activeStep.step_id)
      return {
        kind: "continue",
        label: next ? "Continue" : "Finish course",
        disabled: !next && !path?.summary.is_course_complete,
        disabledReason: next ? null : "Complete every step to finish this course.",
        onClick: goNext,
      }
    }

    return {
      kind: "complete",
      label: "Mark complete",
      disabled: !engagement.canComplete || completing || isOffline,
      disabledReason: isOffline
        ? "You're offline — reconnect to save your progress."
        : engagement.reason,
      loading: completing,
      onClick: handleCompleteLesson,
    }
  }, [
    isCompletionView,
    activeStep,
    lessonPayload,
    engagement.canComplete,
    engagement.reason,
    completing,
    isOffline,
    nextStep,
    goNext,
    handleCompleteLesson,
    path,
  ])

  // ── Render ───────────────────────────────────────────────────────────────
  if (authLoading || (pathLoading && !path)) return <LearningPageSkeleton />

  if (pathError && !path) {
    return (
      <LearningErrorState
        error={pathError}
        courseId={courseId}
        onRetry={() => void refreshPath()}
      />
    )
  }

  if (!path) return <LearningPageSkeleton />

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#lesson-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to lesson content
      </a>

      <LearningHeader
        path={path}
        currentStep={activeStep}
        moduleTitle={activeModule?.title ?? null}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenNotes={() => setNotesOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        notesOpen={notesOpen}
        timer={
          /*
           * The learning timer, pinned under the nav row (LTM-007).
           *
           * In the navigation region rather than the content column, so it
           * stays on screen for the whole lesson instead of scrolling away —
           * and immediately below "My Learning", where it was asked for.
           * Lessons only: an assessment has its own clock, and two countdowns
           * at once would be worse than neither.
           *
           * `canComplete` and `reason` are the same two values
           * `primaryAction` builds the button from, so the panel and the
           * button cannot disagree (LTM-002).
           */
          activeStep?.kind === "lesson" ? (
            <LessonTimerChip
              requiredMs={engagement.timeGate.requiredMs}
              observedMs={engagement.timeGate.observedMs}
              isCompleted={activeStep?.is_completed === true}
              canComplete={engagement.canComplete}
              blockedReason={engagement.reason}
            />
          ) : null
        }
      />

      <OfflineBanner isOffline={isOffline} />

      <div className="flex">
        <LearningSidebar
          path={path}
          activeStepId={activeStepId}
          onSelectStep={goToStep}
          onSelectCompletion={goToCompletion}
          isCompletionActive={isCompletionView}
          bookmarkedLessonIds={bookmarkedLessonIds}
          mobileOpen={sidebarOpen}
          onMobileOpenChange={setSidebarOpen}
        />

        <div className="flex min-h-[calc(100vh-var(--learn-header-h,3.5rem))] min-w-0 flex-1 flex-col">
          <main id="lesson-content" className="flex-1" tabIndex={-1}>
            {steps.length === 0 ? (
              /*
               * LRN-001. A course with no lessons is not a missing course.
               *
               * This passed a hand-made 404 to LearningErrorState with the
               * message "This course has no content yet." — which never
               * reached the screen, because that component's NOT_FOUND branch
               * replaced the caller's message with "This content no longer
               * exists." whenever the status was 404. An enrolled learner
               * opening a published course that had not been authored yet was
               * told it had been deleted, with "Browse courses" as the only
               * way out.
               *
               * The empty case now has its own state, which says what is
               * actually true and offers the way back to My Learning.
               */
              <LearningNoContentState
                courseTitle={path.course.title}
                courseId={courseId}
                isPrivileged={["INSTRUCTOR", "SYSTEM_ADMIN"].includes(
                  String(user?.bwenge_role ?? "").toUpperCase()
                )}
              />
            ) : isCompletionView ? (
              <div className="mx-auto w-full max-w-[820px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
                <CourseCompletion
                  courseId={courseId}
                  courseTitle={path.course.title}
                  summary={path.summary}
                  allStepsCompleted={path.summary.is_course_complete}
                />
                <CourseRating courseId={courseId} />
              </div>
            ) : activeStep?.state === "locked" ? (
              <LearningLockedState
                reason={activeStep.state_reason}
                onGoToNext={() => setSelectedStepId(null)}
              />
            ) : activeStep?.kind === "lesson" ? (
              lessonError ? (
                <LearningErrorState
                  error={lessonError}
                  courseId={courseId}
                  onRetry={() => void refreshLesson()}
                />
              ) : (
                <LessonScreen
                  payload={lessonPayload}
                  step={activeStep}
                  isLoading={lessonLoading}
                  onWatched={engagement.reportWatched}
                  onPosition={engagement.reportPosition}
                  onToggleBookmark={handleToggleBookmark}
                  bookmarkPending={bookmarkPending}
                />
              )
            ) : activeStep ? (
              <AssessmentRunner
                key={activeStep.step_id}
                step={activeStep}
                courseId={courseId}
                // The runner hands back the server's diff when it has one, so
                // grading propagates through the same single merge as lesson
                // completion. It falls back to a refresh when it does not.
                onGraded={(diff?: any) =>
                  diff ? applyDiff(diff) : void refreshPath()
                }
                onContinue={goNext}
                onExit={exitAssessment}
                onReviewLesson={handleReviewLesson}
                onGuardChange={publishAssessmentGuard}
              />
            ) : null}
          </main>

          {!isCompletionView && activeStep && steps.length > 0 && (
            <>
              {/*
                The same gate, said next to the button it governs (LTM-001).

                The header is the top-right corner the timer belongs in, but
                on a phone that is a screen away from "Mark complete" — and a
                disabled button with its explanation off-screen is the thing
                support tickets are made of. Renders nothing once the time has
                elapsed, or when the lesson has no time requirement.
              */}
              {activeStep.kind === "lesson" ? (
                <LessonTimerNotice
                  requiredMs={engagement.timeGate.requiredMs}
                  observedMs={engagement.timeGate.observedMs}
                  isCompleted={activeStep.is_completed === true}
                />
              ) : null}

              <LearningActionBar
                previousStep={previousStep(activeStep.step_id)}
                nextStep={nextStep(activeStep.step_id)}
                onNavigate={goToStep}
                primary={primaryAction}
                gateProgress={
                  activeStep.kind === "lesson" ? engagement.progressPct : null
                }
                isCurrentStepComplete={activeStep.is_completed}
              />
            </>
          )}
        </div>
      </div>

      <NotesPanel
        open={notesOpen}
        onOpenChange={setNotesOpen}
        lessonId={lessonId}
        lessonTitle={activeStep?.title ?? path.course.title}
        initialNotes={lessonPayload?.learner_state.notes ?? null}
      />

      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {celebration && (
        <CompletionCelebration
          data={celebration}
          onClose={() => setCelebration(null)}
          onNext={() => {
            setCelebration(null)
            if (celebration.isCourseComplete) goToCompletion()
            else goNext()
          }}
        />
      )}
    </div>
  )
}

/** Best-effort PUT that never surfaces an error to the learner. */
async function learningRequestSilent(path: string, body: any) {
  try {
    const Cookies = (await import("js-cookie")).default
    const token = Cookies.get("bwenge_token")
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body),
    })
  } catch {
    // Position tracking is a convenience, not a requirement.
  }
}
