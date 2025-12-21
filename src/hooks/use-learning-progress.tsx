// @ts-nocheck
"use client"

import { useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import useSWR, { mutate } from "swr"
import { fetcher } from "@/lib/fetcher"
import Cookies from "js-cookie"

export interface LearningStep {
  id: string
  dbId: string
  type: "content" | "video" | "assessment"
  lessonId: string
  isCompleted: boolean
  completedAt?: string
  score?: number
  assessment?: any
  assessmentId?: number
  status?: "pending" | "completed" | "failed" | "passed"
}

export interface ProgressData {
  courseId: string
  userId: string
  enrollmentId: string
  overallProgress: number
  completedSteps: LearningStep[]
  currentStepId: string
  lastAccessedAt: string
  enrollmentStatus: string
  enrollmentProgressPercentage: number
  totalLessons: number
  completedLessons: number
  totalTimeSpentMinutes: number
  finalScore?: number
  completionDate?: string
}

export function useLearningProgress(courseId: string) {
  const { token, user } = useAuth()

  const getCacheKey = () => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken || !user || !courseId) return null
    return `${process.env.NEXT_PUBLIC_API_URL}/progress/course/${courseId}/user/${user.id}`
  }

  const {
    data: progressData,
    error,
    isLoading,
    mutate: mutateProgress,
  } = useSWR(
    getCacheKey(),
    async (url) => {
      try {
        const cookieToken = Cookies.get("bwenge_token")
        const currentToken = token || cookieToken
        if (!currentToken) throw new Error("No authentication token found")
        const response = await fetcher(url, currentToken)
        return response.progress as ProgressData
      } catch (err) {
        console.log("⚠️ No progress found, returning empty progress")
        return {
          courseId,
          userId: user!.id,
          enrollmentId: "",
          overallProgress: 0,
          completedSteps: [],
          currentStepId: "",
          lastAccessedAt: new Date().toISOString(),
          enrollmentStatus: "ACTIVE",
          enrollmentProgressPercentage: 0,
          totalLessons: 0,
          completedLessons: 0,
          totalTimeSpentMinutes: 0,
        } as ProgressData
      }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    },
  )

  const getCurrentStep = (allSteps: LearningStep[], progressData: ProgressData | null): LearningStep | null => {
    if (!progressData || !allSteps.length) return allSteps[0] || null

    console.log("🔍 [getCurrentStep] Progress Data:", {
      currentStepId: progressData.currentStepId,
      completedSteps: progressData.completedSteps?.length || 0,
    })
    console.log("📋 All Steps:", allSteps.map((s) => ({ id: s.id, lessonId: s.lessonId, type: s.type })))

    if (progressData.currentStepId) {
      const stepFromCurrentStepId = allSteps.find(
        (step) => step.lessonId === progressData.currentStepId,
      )
      if (stepFromCurrentStepId) {
        console.log("✅ Found step by currentStepId (lessonId match):", stepFromCurrentStepId)
        if (isStepCompletedHelper(stepFromCurrentStepId, progressData)) {
          const stepIndex = allSteps.findIndex((step) => step.id === stepFromCurrentStepId.id)
          const nextStep =
            stepIndex + 1 < allSteps.length ? allSteps[stepIndex + 1] : stepFromCurrentStepId
          console.log("↪️ Step is completed, moving to next:", nextStep)
          return nextStep
        }
        return stepFromCurrentStepId
      }
      console.log("⚠️ No step found with lessonId matching currentStepId:", progressData.currentStepId)
    }

    const sortedCompleted = [...progressData.completedSteps]
      .filter((s) => s.isCompleted)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())

    if (sortedCompleted.length === 0) {
      console.log("📌 No completed steps, returning first step")
      return allSteps[0] || null
    }

    const lastCompleted = sortedCompleted[sortedCompleted.length - 1]
    console.log("📌 Last completed step:", lastCompleted)

    let lastStepIndex = -1
    if (lastCompleted.type === "assessment" && lastCompleted.assessmentId) {
      lastStepIndex = allSteps.findIndex(
        (step) => step.type === "assessment" && step.assessment?.id === String(lastCompleted.assessmentId),
      )
    } else if (lastCompleted.lessonId) {
      lastStepIndex = allSteps.findIndex((step) => step.lessonId === lastCompleted.lessonId)
    }

    if (lastStepIndex >= 0 && lastStepIndex + 1 < allSteps.length) {
      console.log("↪️ Returning next step after last completed")
      return allSteps[lastStepIndex + 1]
    } else if (lastStepIndex >= 0) {
      console.log("📌 Returning last step")
      return allSteps[lastStepIndex]
    }

    console.log("📌 Default: returning first step")
    return allSteps[0] || null
  }

  const isStepCompletedHelper = (step: LearningStep, progressData: ProgressData) => {
    if (step.type === "assessment" && step.assessment) {
      return progressData.completedSteps.some(
        (s) =>
          String(s.assessmentId) === String(step.assessment.id) &&
          s.isCompleted === true &&
          (s.status === "passed" || s.passed === true),
      )
    }
    return progressData.completedSteps.some(
      (s) =>
        s.type === "lesson" &&
        String(s.lessonId) === String(step.lessonId) &&
        s.isCompleted === true,
    )
  }

  const markStepComplete = useCallback(
    async (payload: {
      courseId: string
      userId: string
      lessonId?: string
      assessmentId?: string
      score?: number
      percentage?: number
      answers?: any
      time_spent_seconds?: number
      isCompleted?: boolean
      passed?: boolean
    }) => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken
      if (!currentToken) {
        console.error("❌ No authentication token found")
        return
      }
      if (payload.assessmentId && !payload.passed) {
        console.log("⚠️ Assessment not passed, skipping completion")
        return
      }
      const cacheKey = getCacheKey()
      if (!cacheKey) return

      await mutate(
        cacheKey,
        async (currentData: any) => {
          if (!currentData) return currentData
          const stepId = payload.assessmentId
            ? `${payload.assessmentId}-assessment`
            : `${payload.lessonId}-lesson`
          const updatedSteps = [...currentData.completedSteps]
          const existingStepIndex = updatedSteps.findIndex((step: any) => step.id === stepId)
          const stepData = {
            id: stepId,
            type: payload.assessmentId ? "assessment" : "lesson",
            lessonId: payload.lessonId,
            assessmentId: payload.assessmentId,
            isCompleted: !!payload.isCompleted,
            completedAt: new Date().toISOString(),
            score: payload.score,
            percentage: payload.score,
            status: payload.passed ? "passed" : "pending",
          }
          if (existingStepIndex >= 0) {
            updatedSteps[existingStepIndex] = stepData
          } else {
            updatedSteps.push(stepData)
          }
          return {
            ...currentData,
            completedSteps: updatedSteps,
            lastAccessedAt: new Date().toISOString(),
          }
        },
        { revalidate: false },
      )

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/complete-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
          body: JSON.stringify({
            courseId: payload.courseId,
            userId: payload.userId,
            lessonId: payload.lessonId,
            assessmentId: payload.assessmentId,
            score: payload.score,
            percentage: payload.percentage,
            answers: payload.answers,
            time_spent_seconds: payload.time_spent_seconds,
            isCompleted: payload.isCompleted,
            status: payload.passed ? "passed" : "in_progress",
          }),
        })
        if (!response.ok) throw new Error("Failed to mark step complete")
        mutateProgress()
      } catch (err) {
        console.error("❌ Failed to mark step complete:", err)
        mutateProgress()
      }
    },
    [token, mutateProgress],
  )

  const updateCurrentStep = useCallback(
    async (stepId: string, time_spent_seconds?: number) => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken
      if (!currentToken || !user) {
        console.error("❌ No authentication found")
        return
      }
      const cacheKey = getCacheKey()
      if (!cacheKey) return

      await mutate(
        cacheKey,
        (currentData: any) =>
          currentData
            ? {
                ...currentData,
                currentStepId: stepId,
                lastAccessedAt: new Date().toISOString(),
              }
            : null,
        { revalidate: false },
      )

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/progress/update-current-step`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify({
              courseId,
              userId: user.id,
              lessonId: stepId.split("-")[0],
              time_spent_seconds: time_spent_seconds || 0,
            }),
          },
        )
        if (!response.ok) throw new Error("Failed to update current step")
        mutateProgress()
      } catch (err) {
        console.error("❌ Failed to update current step:", err)
        mutateProgress()
      }
    },
    [token, user, courseId, mutateProgress],
  )

  const calculateProgress = useCallback(
    (allSteps: LearningStep[]) => {
      if (!progressData) return 0
      const completedCount = allSteps.filter((step) => {
        if (step.type === "assessment" && step.assessment) {
          return progressData.completedSteps.some(
            (s: any) =>
              String(s.assessmentId) === String(step.assessment.id) &&
              s.isCompleted === true &&
              (s.status === "passed" || s.passed === true),
          )
        }
        return progressData.completedSteps.some(
          (s: any) =>
            s.type === "lesson" &&
            String(s.lessonId) === String(step.lessonId) &&
            s.isCompleted === true,
        )
      }).length
      return allSteps.length > 0 ? (completedCount / allSteps.length) * 100 : 0
    },
    [progressData],
  )

  // ── isStepCompleted ────────────────────────────────────────────────────────
  // Step ID formats used in the system:
  //   Lesson:             "{lessonId}-lesson"
  //   Lesson assessment:  "{lessonId}-assessment-{assessmentId}"
  //   Lesson quiz:        "{lessonId}-quiz-{quizId}"
  //   Module final:       "{moduleId}-final-assessment"
  //
  // A step is completed ONLY when isCompleted===true AND status==="passed" (or passed===true).
  //
  // CRITICAL: The backend API can return:
  //   enrollmentStatus="COMPLETED", overallProgress=75, isCompleted=false, status="pending"
  //   for the same assessment simultaneously. We NEVER trust enrollment-level fields.
  //   We ALWAYS validate per-step: isCompleted===true AND status==="passed".
  //
  // For module final assessments, the completedStep in the API has lessonId=null.
  // We match them by assessmentId directly (not by moduleId which is not stored in completedSteps).
  const isStepCompleted = useCallback(
    (stepId: string) => {
      if (!progressData || !progressData.completedSteps) return false

      console.log(`🔍 [isStepCompleted] Checking step: ${stepId}`)

      // ── 1. Lesson step ────────────────────────────────────────────────────
      if (stepId.endsWith("-lesson")) {
        const lessonId = stepId.slice(0, -"-lesson".length)
        const isCompleted = progressData.completedSteps.some(
          (s: any) =>
            s.type === "lesson" &&
            String(s.lessonId) === String(lessonId) &&
            s.isCompleted === true,
        )
        console.log(`📚 Lesson step ${stepId}: ${isCompleted ? "✅" : "❌"}`)
        return isCompleted
      }

      // ── 2. Lesson assessment: "{lessonId}-assessment-{assessmentId}" ──────
      // STRICT: isCompleted MUST be true AND status must be "passed" (or passed===true).
      // The backend can set percentage=100 with isCompleted=false — we reject that.
      if (stepId.includes("-assessment-")) {
        const idx = stepId.indexOf("-assessment-")
        const assessmentId = stepId.slice(idx + "-assessment-".length)
        const step = progressData.completedSteps.find(
          (s: any) =>
            s.type === "assessment" &&
            String(s.assessmentId).trim() === String(assessmentId).trim(),
        )
        const isCompleted =
          !!step &&
          step.isCompleted === true &&
          (step.status === "passed" || step.passed === true)
        console.log(
          `📝 Assessment step ${stepId} (assessmentId=${assessmentId}): ${isCompleted ? "✅" : "❌"}`,
          step
            ? { isCompleted: step.isCompleted, status: step.status, passed: step.passed }
            : "not found",
        )
        return isCompleted
      }

      // ── 3. Lesson quiz: "{lessonId}-quiz-{quizId}" ────────────────────────
      if (stepId.includes("-quiz-")) {
        const idx = stepId.indexOf("-quiz-")
        const quizId = stepId.slice(idx + "-quiz-".length)
        const step = progressData.completedSteps.find(
          (s: any) =>
            s.type === "assessment" &&
            String(s.assessmentId).trim() === String(quizId).trim(),
        )
        const isCompleted =
          !!step &&
          step.isCompleted === true &&
          (step.status === "passed" || step.passed === true)
        console.log(`🧪 Quiz step ${stepId} (quizId=${quizId}): ${isCompleted ? "✅" : "❌"}`)
        return isCompleted
      }

      // ── 4. Module final assessment: "{moduleId}-final-assessment" ─────────
      // CRITICAL FIX: The API stores final assessment completedSteps with lessonId=null.
      // Lesson assessments always have a non-null lessonId.
      // So we find the final assessment by: type==="assessment" AND lessonId===null.
      // We then validate: isCompleted===true AND status==="passed" (or passed===true).
      // We do NOT use moduleId matching (not stored in completedSteps) or
      // s.id === stepId (s.id is the assessmentId like "cd80dc39-...", not the stepId).
      if (stepId.endsWith("-final-assessment")) {
        const finalStep = progressData.completedSteps.find(
          (s: any) =>
            s.type === "assessment" &&
            (s.lessonId === null || s.lessonId === undefined || s.lessonId === ""),
        )
        const isCompleted =
          !!finalStep &&
          finalStep.isCompleted === true &&
          (finalStep.status === "passed" || finalStep.passed === true)
        console.log(
          `🏆 Module final ${stepId}: ${isCompleted ? "✅" : "❌"}`,
          finalStep
            ? { isCompleted: finalStep.isCompleted, status: finalStep.status, passed: finalStep.passed }
            : "not found",
        )
        return isCompleted
      }

      console.log(`❓ Unknown step ID format: ${stepId}`)
      return false
    },
    [progressData],
  )

  const getStepScore = useCallback(
    (dbId: string) => {
      if (!progressData) return null
      const completedStep = progressData.completedSteps.find(
        (step: any) =>
          (step.lessonId && step.lessonId === dbId) ||
          (step.assessmentId && String(step.assessmentId) === String(dbId)),
      )
      return completedStep?.score ?? completedStep?.percentage ?? null
    },
    [progressData],
  )

  const markStepPending = useCallback(
    async (payload: {
      courseId: string
      userId: string
      lessonId?: string
      assessmentId?: string
    }) => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken
      if (!currentToken) {
        console.error("❌ No authentication token found")
        return
      }
      const cacheKey = getCacheKey()
      if (!cacheKey) return

      await mutate(
        cacheKey,
        (currentData: any) => {
          if (!currentData) return currentData
          const stepId = payload.assessmentId
            ? `${payload.assessmentId}-assessment`
            : `${payload.lessonId}-lesson`
          const updatedSteps = [...currentData.completedSteps]
          const existingIndex = updatedSteps.findIndex((s: any) => s.id === stepId)
          const stepData: LearningStep = {
            id: stepId,
            type: payload.assessmentId ? "assessment" : "content",
            lessonId: payload.lessonId || "",
            assessmentId: payload.assessmentId ? Number(payload.assessmentId) : undefined,
            isCompleted: false,
            status: "pending",
            dbId: "",
          }
          if (existingIndex >= 0) {
            updatedSteps[existingIndex] = { ...updatedSteps[existingIndex], ...stepData }
          } else {
            updatedSteps.push(stepData)
          }
          return { ...currentData, completedSteps: updatedSteps }
        },
        { revalidate: false },
      )

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/pending-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
          body: JSON.stringify({
            courseId: payload.courseId,
            userId: payload.userId,
            lessonId: payload.lessonId,
            assessmentId: payload.assessmentId,
          }),
        })
        if (!response.ok) throw new Error("Failed to mark step pending")
        mutateProgress()
      } catch (err) {
        console.error("❌ Failed to mark step pending:", err)
        mutateProgress()
      }
    },
    [token, mutateProgress],
  )

  // ── isStepPending ──────────────────────────────────────────────────────────
  // Returns true ONLY when submitted but instructor has NOT yet fully graded.
  // "Graded but failed" (isCompleted=true, status!="passed") is NOT pending.
  // A step with status="pending" (regardless of isCompleted) IS pending.
  //
  // For module final assessments: match by lessonId===null (API-confirmed pattern).
  const isStepPending = useCallback(
    (stepId: string) => {
      if (!progressData || !progressData.completedSteps) return false

      console.log(`🔍 [isStepPending] Checking step: ${stepId}`)

      // Module final assessment: lessonId is null in the API
      if (stepId.endsWith("-final-assessment")) {
        const finalStep = progressData.completedSteps.find(
          (s: any) =>
            s.type === "assessment" &&
            (s.lessonId === null || s.lessonId === undefined || s.lessonId === ""),
        )
        if (!finalStep) return false
        const isPending = finalStep.status === "pending"
        console.log(`🏆 [isStepPending] Final: ${isPending ? "PENDING" : "NOT PENDING"}`, finalStep)
        return isPending
      }

      let assessmentId: string | null = null
      if (stepId.includes("-assessment-")) {
        const idx = stepId.indexOf("-assessment-")
        assessmentId = stepId.slice(idx + "-assessment-".length)
      } else if (stepId.includes("-quiz-")) {
        const idx = stepId.indexOf("-quiz-")
        assessmentId = stepId.slice(idx + "-quiz-".length)
      }

      if (!assessmentId) return false

      const assessmentStep = progressData.completedSteps.find(
        (s: any) =>
          s.type === "assessment" &&
          String(s.assessmentId).trim() === String(assessmentId).trim(),
      )

      if (!assessmentStep) return false

      const isPending = assessmentStep.status === "pending"
      console.log(`📝 [isStepPending] Result: ${isPending ? "PENDING" : "NOT PENDING"}`, assessmentStep)
      return isPending
    },
    [progressData],
  )

  // ── isStepFailed ───────────────────────────────────────────────────────────
  // Returns true when the assessment has been FULLY GRADED (isCompleted=true)
  // but the learner did NOT pass (status !== "passed" and passed !== true).
  //
  // Unlimited retake model:
  //   isStepFailed=true  → AssessmentScreen shows Retake (always enabled)
  //   isStepFailed=true  → Sidebar + navigation lock forward steps
  //
  // For module final assessments: match by lessonId===null (API-confirmed pattern).
  const isStepFailed = useCallback(
    (stepId: string) => {
      if (!progressData || !progressData.completedSteps) return false

      console.log(`🔍 [isStepFailed] Checking step: ${stepId}`)

      // Module final assessment: lessonId is null in the API
      if (stepId.endsWith("-final-assessment")) {
        const finalStep = progressData.completedSteps.find(
          (s: any) =>
            s.type === "assessment" &&
            (s.lessonId === null || s.lessonId === undefined || s.lessonId === ""),
        )
        if (!finalStep) return false
        // Failed = graded (isCompleted=true) AND not passed AND not just pending
        const isFailed =
          finalStep.isCompleted === true &&
          finalStep.status !== "passed" &&
          finalStep.passed !== true
        console.log(`🏆 [isStepFailed] Final: ${isFailed ? "FAILED" : "NOT FAILED"}`, finalStep)
        return isFailed
      }

      let assessmentId: string | null = null
      if (stepId.includes("-assessment-")) {
        const idx = stepId.indexOf("-assessment-")
        assessmentId = stepId.slice(idx + "-assessment-".length)
      } else if (stepId.includes("-quiz-")) {
        const idx = stepId.indexOf("-quiz-")
        assessmentId = stepId.slice(idx + "-quiz-".length)
      }

      if (!assessmentId) return false

      const step = progressData.completedSteps.find(
        (s: any) =>
          s.type === "assessment" &&
          String(s.assessmentId).trim() === String(assessmentId).trim(),
      )

      if (!step) return false

      // Failed = graded AND not passed AND not just pending
      const isFailed =
        step.isCompleted === true &&
        step.status !== "passed" &&
        step.passed !== true
      console.log(`📝 [isStepFailed] Result: ${isFailed ? "FAILED" : "NOT FAILED"}`, step)
      return isFailed
    },
    [progressData],
  )

  // ── areAllStepsTrulyPassed ─────────────────────────────────────────────────
  // Returns true ONLY when every single step in allSteps has been PASSED.
  //
  // NEVER trusts enrollmentStatus or overallProgress from the backend.
  // These backend fields can be set to COMPLETED/100% even when individual
  // assessments are still pending or failed, as proven by the API response:
  //   enrollmentStatus="COMPLETED", overallProgress=75, finalAssessment.isCompleted=false
  //
  // This is the ONLY authoritative source for course completion gating.
  const areAllStepsTrulyPassed = useCallback(
    (allSteps: LearningStep[]) => {
      if (!progressData || !allSteps.length) return false
      const result = allSteps.every((step) => isStepCompleted(step.id))
      console.log(`🔍 [areAllStepsTrulyPassed] Result: ${result}`)
      return result
    },
    [progressData, isStepCompleted],
  )

  return {
    progressData,
    loading: isLoading,
    error,
    markStepComplete,
    getCurrentStep,
    updateCurrentStep,
    calculateProgress,
    isStepCompleted,
    getStepScore,
    refetch: mutateProgress,
    markStepPending,
    isStepPending,
    isStepFailed,
    areAllStepsTrulyPassed,
  }
}