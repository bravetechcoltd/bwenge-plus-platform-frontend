"use client"

import { useCallback, useMemo, useRef } from "react"
import useSWR, { useSWRConfig } from "swr"
import {
  learningApi,
  LearningApiError,
  type LearningPath,
  type LearningStepNode,
  type LearningRollups,
  type LessonRollup,
  type ModuleRollup,
  type ProgressDiff,
} from "@/lib/learning/api"
import { useRealtimeEvents, useJoinCourseRoom } from "@/hooks/use-realtime"
import { primeReadiness } from "@/lib/learning/prefetch"

/**
 * ============================================================================
 * useLearningProgress — the single source of truth for the Learning Space
 * ============================================================================
 *
 * LP-CONS-001 §5.5. Supersedes `useLearningPath`, whose whole surface it keeps.
 *
 * Three things changed, and each one closes a gap the learner could see:
 *
 *   • **Roll-ups travel with the path.** `rollups.lessons` / `.modules` /
 *     `.course` are the canonical L2/L3/L4 figures. No component computes a
 *     percentage any more — the sidebar chip, the header ring and the progress
 *     page all read the same numbers, so they cannot disagree (G-06).
 *
 *   • **`applyDiff` replaces the refetch.** Completing a lesson used to fire
 *     `refreshPath()` and `refreshLesson()` and then re-render from whatever
 *     came back; in between, the action bar and the sidebar could show
 *     different states. The server now returns exactly what changed, and this
 *     merges it into the cache in one pass — no round trip, no flicker, and no
 *     client-side guess about whether a module just finished (G-16).
 *
 *   • **It listens.** `learning.progress.changed` is applied live, so an
 *     instructor releasing a grade unlocks the next step in an open Learning
 *     Space instead of leaving a padlock until a manual refresh (G-15).
 *
 * The previous export is kept as an alias so nothing has to be re-imported at
 * once; both names return the same object.
 */

export interface UseLearningProgressResult {
  path: LearningPath | undefined
  steps: LearningStepNode[]

  /** Canonical L2/L3/L4 figures. The only source of any percentage. */
  rollups: LearningRollups | undefined
  lessonRollup: (lessonId: string) => LessonRollup | undefined
  moduleRollup: (moduleId: string) => ModuleRollup | undefined

  isLoading: boolean
  error: LearningApiError | undefined

  /** Structured access failure (not enrolled, expired, unpublished…). */
  accessError: LearningApiError | undefined

  currentStep: LearningStepNode | undefined
  currentIndex: number

  getStep: (stepId: string) => LearningStepNode | undefined
  getStepByRef: (refId: string) => LearningStepNode | undefined
  isUnlocked: (stepId: string) => boolean
  lockReason: (stepId: string) => string | null

  nextStep: (fromStepId?: string) => LearningStepNode | undefined
  previousStep: (fromStepId?: string) => LearningStepNode | undefined

  /** Merge a server diff into the cache. No refetch. */
  applyDiff: (diff: ProgressDiff | null | undefined) => void

  /**
   * Show a lesson as complete before the server has answered.
   *
   * Only ever called behind a gate the server itself opened: the button is
   * enabled by `can_complete` from the last heartbeat, so a refusal is the
   * rare path, and the caller revalidates to undo this if one arrives. It
   * moves the tick, the step state and the action bar — never a percentage,
   * because those are the server's to compute and its diff lands moments
   * later with the real ones.
   */
  optimisticComplete: (lessonId: string) => void

  refresh: () => Promise<any>
}

/**
 * Folds a `ProgressDiff` into a cached path.
 *
 * Pure, so the merge is testable and predictable: same path plus same diff
 * always yields the same result. Everything it writes came from the server —
 * it never derives a percentage of its own.
 */
export function mergeDiff(
  path: LearningPath | undefined,
  diff: ProgressDiff
): LearningPath | undefined {
  if (!path || !diff?.changed) return path

  const lessonChanges = new Map(diff.lessons.map((l) => [l.lesson_id, l]))
  const moduleChanges = new Map(diff.modules.map((m) => [m.module_id, m]))
  const unlocked = new Set(diff.unlocked)

  const lessons = path.rollups.lessons.map((lesson) => {
    const change = lessonChanges.get(lesson.lesson_id)
    if (!change) return lesson
    return {
      ...lesson,
      state: change.to,
      percent: change.percent_to,
      content_completed:
        change.to === "COMPLETED" ? true : lesson.content_completed,
    }
  })

  const modules = path.rollups.modules.map((module) => {
    const change = moduleChanges.get(module.module_id)
    if (!change) return module
    return {
      ...module,
      state: change.to,
      percent: change.percent_to,
      completed_at: change.completed_at ?? module.completed_at,
    }
  })

  // Step states follow the diff's unlock set, which the server computed from
  // the freshly rebuilt path. A step that is no longer in it is locked.
  const steps = path.steps.map((step) => {
    const lessonChange = step.lesson_id ? lessonChanges.get(step.lesson_id) : undefined
    const nowUnlocked = unlocked.has(step.step_id)

    let state = step.state
    let isCompleted = step.is_completed

    if (
      step.kind === "lesson" &&
      lessonChange &&
      lessonChange.to === "COMPLETED"
    ) {
      state = "passed"
      isCompleted = true
    } else if (step.state === "locked" && nowUnlocked) {
      state = "available"
    } else if (step.state !== "locked" && !nowUnlocked && diff.unlocked.length > 0) {
      state = "locked"
    }

    return {
      ...step,
      state,
      is_completed: isCompleted,
      state_reason: state === "locked" ? step.state_reason : null,
    }
  })

  const percent = diff.course.percent_to
  const isComplete = diff.course.state_to === "COMPLETED"
  const completedSteps = steps.filter((s) => s.is_required && s.is_completed).length

  return {
    ...path,
    steps,
    modules: path.modules.map((moduleNode) => {
      const rollup = modules.find((m) => m.module_id === moduleNode.id)
      if (!rollup) return moduleNode
      return {
        ...moduleNode,
        completed_steps: rollup.completed_steps,
        total_steps: rollup.total_steps,
        state:
          rollup.state === "COMPLETED"
            ? "completed"
            : rollup.state === "LOCKED"
              ? "locked"
              : "available",
      }
    }),
    summary: {
      ...path.summary,
      percent: percent ?? path.summary.percent,
      completed_steps: completedSteps,
      is_course_complete: isComplete,
      state: diff.course.state_to,
    },
    rollups: {
      lessons,
      modules,
      course: {
        ...path.rollups.course,
        percent: percent,
        state: diff.course.state_to,
        is_complete: isComplete,
        completed_steps: completedSteps,
      },
    },
  }
}

/**
 * Marks one lesson complete in a cached path.
 *
 * Pure, like `mergeDiff`, and deliberately narrower: it touches the step and
 * the lesson roll-up and recounts completed steps, and leaves every
 * percentage, module state and course state alone. Those are derived
 * server-side from rules this file does not know, and guessing them is what
 * used to make the header ring and the sidebar disagree for a frame.
 */
export function markLessonComplete(
  path: LearningPath | undefined,
  lessonId: string
): LearningPath | undefined {
  if (!path) return path

  const steps = path.steps.map((step) =>
    step.kind === "lesson" && step.ref_id === lessonId
      ? { ...step, state: "passed" as const, is_completed: true, state_reason: null }
      : step
  )

  const lessons = path.rollups.lessons.map((lesson) =>
    lesson.lesson_id === lessonId
      ? { ...lesson, state: "COMPLETED" as const, percent: 100, content_completed: true }
      : lesson
  )

  return {
    ...path,
    steps,
    summary: {
      ...path.summary,
      completed_steps: steps.filter((s) => s.is_required && s.is_completed).length,
    },
    rollups: { ...path.rollups, lessons },
  }
}

export function useLearningProgress(
  courseId: string | undefined,
  activeStepId?: string | null
): UseLearningProgressResult {
  const key = courseId ? ["learning-progress", courseId] : null
  const { mutate: globalMutate } = useSWRConfig()

  /**
   * Which course has already been bundled.
   *
   * Opening the Learning Space used to cost one request for the path and then
   * one more for every step the learner visited — a lesson meant
   * `GET /lessons/:id`, an assessment meant `/readiness`, and each re-ran the
   * access chain, which rebuilds the learner's whole path server-side just to
   * answer "is this unlocked?". Walking an eleven-lesson course measured 15
   * requests and 102 seconds against the production database; the bundle is
   * one request and 15 seconds for the same content.
   *
   * So the *first* load fetches the bundle and primes every cache from it;
   * revalidations after that ask for the path alone, which is all that can
   * have changed. A ref, because it must survive re-renders without being a
   * dependency of anything.
   */
  const bundledCourseRef = useRef<string | null>(null)

  const load = useCallback(async (): Promise<LearningPath> => {
    if (!courseId) throw new Error("no course")

    if (bundledCourseRef.current === courseId) {
      return learningApi.getPath(courseId)
    }

    try {
      const bundle = await learningApi.getBundle(courseId)
      bundledCourseRef.current = courseId

      // Prime the exact keys the page already reads, so no component needs to
      // know a bundle exists and every one of them keeps its own endpoint as
      // the revalidation path.
      for (const [lessonId, payload] of Object.entries(bundle.lessons ?? {})) {
        void globalMutate(["lesson", lessonId], payload, { revalidate: false })
      }
      primeReadiness(courseId, bundle.readiness)

      return bundle.path
    } catch (err) {
      // An access failure is the server's decision and must surface. Anything
      // else — an older server without the route, a transient fault — falls
      // back to the path alone, which is exactly the behaviour before this.
      if (err instanceof LearningApiError && err.isAccessDenied) throw err
      return learningApi.getPath(courseId)
    }
  }, [courseId, globalMutate])

  const { data, error, isLoading, mutate } = useSWR<LearningPath, LearningApiError>(
    key,
    load,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      // A 403 is a decision, not a hiccup — retrying just burns requests.
      shouldRetryOnError: (err) => !(err instanceof LearningApiError && err.isTerminal),
      errorRetryCount: 3,
    }
  )

  const steps = useMemo(() => data?.steps ?? [], [data])

  const stepById = useMemo(() => {
    const map = new Map<string, LearningStepNode>()
    for (const step of steps) map.set(step.step_id, step)
    return map
  }, [steps])

  const stepByRef = useMemo(() => {
    const map = new Map<string, LearningStepNode>()
    for (const step of steps) map.set(step.ref_id, step)
    return map
  }, [steps])

  const lessonRollupById = useMemo(() => {
    const map = new Map<string, LessonRollup>()
    for (const lesson of data?.rollups?.lessons ?? []) map.set(lesson.lesson_id, lesson)
    return map
  }, [data])

  const moduleRollupById = useMemo(() => {
    const map = new Map<string, ModuleRollup>()
    for (const module of data?.rollups?.modules ?? []) map.set(module.module_id, module)
    return map
  }, [data])

  const currentStepId = activeStepId ?? data?.summary.current_step_id ?? null
  const currentIndex = currentStepId
    ? steps.findIndex((s) => s.step_id === currentStepId)
    : -1
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : undefined

  const getStep = useCallback((stepId: string) => stepById.get(stepId), [stepById])
  const getStepByRef = useCallback((refId: string) => stepByRef.get(refId), [stepByRef])

  const lessonRollup = useCallback(
    (lessonId: string) => lessonRollupById.get(lessonId),
    [lessonRollupById]
  )
  const moduleRollup = useCallback(
    (moduleId: string) => moduleRollupById.get(moduleId),
    [moduleRollupById]
  )

  const isUnlocked = useCallback(
    (stepId: string) => {
      const step = stepById.get(stepId)
      return !!step && step.state !== "locked"
    },
    [stepById]
  )

  const lockReason = useCallback(
    (stepId: string) => stepById.get(stepId)?.state_reason ?? null,
    [stepById]
  )

  /**
   * Next/previous walk the server's ordering. They do not skip locked steps —
   * the action bar disables the control instead, so the learner can see what
   * comes next and why it is not open yet.
   */
  const nextStep = useCallback(
    (fromStepId?: string) => {
      const from = fromStepId ?? currentStepId
      if (!from) return steps[0]
      const index = steps.findIndex((s) => s.step_id === from)
      if (index < 0 || index + 1 >= steps.length) return undefined
      return steps[index + 1]
    },
    [steps, currentStepId]
  )

  const previousStep = useCallback(
    (fromStepId?: string) => {
      const from = fromStepId ?? currentStepId
      if (!from) return undefined
      const index = steps.findIndex((s) => s.step_id === from)
      if (index <= 0) return undefined
      return steps[index - 1]
    },
    [steps, currentStepId]
  )

  const applyDiff = useCallback(
    (diff: ProgressDiff | null | undefined) => {
      if (!diff || !diff.changed) return
      // `revalidate: false` is the point: the server already told us the
      // outcome, so asking again would only risk rendering a staler answer.
      void mutate((current) => mergeDiff(current, diff), { revalidate: false })
    },
    [mutate]
  )

  const optimisticComplete = useCallback(
    (lessonId: string) => {
      void mutate((current) => markLessonComplete(current, lessonId), {
        revalidate: false,
      })
    },
    [mutate]
  )

  // ── Live updates ─────────────────────────────────────────────────────────
  // An instructor releasing a grade, or the learner acting in another tab,
  // reaches this page as a diff and is applied exactly like a local action.
  const realtimeHandlers = useMemo(
    () => ({
      "learning.progress.changed": (payload: ProgressDiff) => {
        if (!courseId || payload?.course_id !== courseId) return
        applyDiff(payload)
      },
      "grade-released": (payload: { courseId?: string }) => {
        // The grade event carries no diff; a revalidate is the honest response.
        if (!courseId || payload?.courseId !== courseId) return
        void mutate()
      },
      "learning.structure.changed": (payload: { course_id?: string }) => {
        if (!courseId || payload?.course_id !== courseId) return
        void mutate()
      },
    }),
    [courseId, applyDiff, mutate]
  )

  useRealtimeEvents(realtimeHandlers)
  useJoinCourseRoom(courseId ?? null)

  const accessError =
    error instanceof LearningApiError && error.isAccessDenied ? error : undefined

  return {
    path: data,
    steps,
    rollups: data?.rollups,
    lessonRollup,
    moduleRollup,
    isLoading,
    error,
    accessError,
    currentStep,
    currentIndex,
    getStep,
    getStepByRef,
    isUnlocked,
    lockReason,
    nextStep,
    previousStep,
    applyDiff,
    optimisticComplete,
    refresh: mutate,
  }
}

/**
 * Backwards-compatible alias. `useLearningPath` was the name before roll-ups
 * existed; it returns the same object, so both call styles work.
 */
export const useLearningPath = useLearningProgress
export type UseLearningPathResult = UseLearningProgressResult
