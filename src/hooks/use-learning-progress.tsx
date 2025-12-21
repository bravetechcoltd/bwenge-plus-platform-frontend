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
  status?: "pending" | "completed" | "failed"
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
    // Check authentication from cookies or auth hook
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
        // Get token from cookie if not available from hook
        const cookieToken = Cookies.get("bwenge_token")
        const currentToken = token || cookieToken

        if (!currentToken) {
          throw new Error("No authentication token found")
        }

        const response = await fetcher(url, currentToken)
        return response.progress as ProgressData
      } catch (err) {
        console.log("⚠️ No progress found, returning empty progress")
        // If no progress exists, return empty progress matching backend structure
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

// In useLearningProgress.tsx, update the getCurrentStep function:

const getCurrentStep = (allSteps: LearningStep[], progressData: ProgressData | null): LearningStep | null => {
  if (!progressData || !allSteps.length) return allSteps[0] || null

  console.log("🔍 [getCurrentStep] Progress Data:", {
    currentStepId: progressData.currentStepId,
    completedSteps: progressData.completedSteps?.length || 0
  })
  console.log("📋 All Steps:", allSteps.map(s => ({ id: s.id, lessonId: s.lessonId, type: s.type })))

  // If there's a currentStepId from backend, find the matching step
  if (progressData.currentStepId) {
    // First try to find a step where lessonId matches currentStepId
    const stepFromCurrentStepId = allSteps.find(step => step.lessonId === progressData.currentStepId)
    
    if (stepFromCurrentStepId) {
      console.log("✅ Found step by currentStepId (lessonId match):", stepFromCurrentStepId)
      
      // Check if this step is completed
      if (isStepCompletedHelper(stepFromCurrentStepId, progressData)) {
        // If completed, find the next step
        const stepIndex = allSteps.findIndex(step => step.id === stepFromCurrentStepId.id)
        const nextStep = stepIndex + 1 < allSteps.length ? allSteps[stepIndex + 1] : stepFromCurrentStepId
        console.log("↪️ Step is completed, moving to next:", nextStep)
        return nextStep
      }
      return stepFromCurrentStepId
    }
    
    // If not found by lessonId, log for debugging
    console.log("⚠️ No step found with lessonId matching currentStepId:", progressData.currentStepId)
  }

  // Fallback: Find the last completed step
  const sortedCompleted = [...progressData.completedSteps]
    .filter((s) => s.isCompleted)
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())

  if (sortedCompleted.length === 0) {
    console.log("📌 No completed steps, returning first step")
    return allSteps[0] || null
  }

  const lastCompleted = sortedCompleted[sortedCompleted.length - 1]
  console.log("📌 Last completed step:", lastCompleted)

  // Find step matching the last completed
  let lastStepIndex = -1
  
  if (lastCompleted.type === "assessment" && lastCompleted.assessmentId) {
    // For assessments, find by assessment ID
    lastStepIndex = allSteps.findIndex(step => 
      step.type === "assessment" && step.assessment?.id === lastCompleted.assessmentId
    )
  } else if (lastCompleted.lessonId) {
    // For lessons, find by lesson ID
    lastStepIndex = allSteps.findIndex(step => step.lessonId === lastCompleted.lessonId)
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
      return progressData.completedSteps.some((s) => s.assessmentId === step.assessment.id && s.isCompleted)
    }
    return progressData.completedSteps.some(
      (s) => String(s.lessonId) === String(step.lessonId) && !s.assessmentId && s.isCompleted,
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
      // Get token from cookie if not available from hook
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken

      if (!currentToken) {
        console.error("❌ No authentication token found")
        return
      }

      // Only mark complete if passed for assessments
      if (payload.assessmentId && !payload.passed) {
        console.log("⚠️ Assessment not passed, skipping completion")
        return
      }

      const cacheKey = getCacheKey()
      if (!cacheKey) return

      // Optimistically update the cache
      await mutate(
        cacheKey,
        async (currentData: any) => {
          if (!currentData) return currentData

          const stepId = payload.assessmentId ? `${payload.assessmentId}-assessment` : `${payload.lessonId}-lesson`
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
            status: payload.passed ? "completed" : "pending",
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
        { revalidate: false }, // Don't revalidate immediately
      )

      // Then make the API call to backend /progress/complete-step
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/complete-step`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
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
            status: payload.passed ? "completed" : "in_progress",
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to mark step complete")
        }

        // Revalidate after successful API call
        mutateProgress()
      } catch (err) {
        console.error("❌ Failed to mark step complete:", err)
        // Revert optimistic update on error
        mutateProgress()
      }
    },
    [token, mutateProgress],
  )

  const updateCurrentStep = useCallback(
    async (stepId: string, time_spent_seconds?: number) => {
      // Get token from cookie if not available from hook
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken

      if (!currentToken || !user) {
        console.error("❌ No authentication found")
        return
      }

      const cacheKey = getCacheKey()
      if (!cacheKey) return

      // Optimistically update
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

      // Then make API call to backend /progress/update-current-step
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/update-current-step`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            courseId,
            userId: user.id,
            lessonId: stepId.split("-")[0], // Extract lesson ID from step ID
            time_spent_seconds: time_spent_seconds || 0,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to update current step")
        }

        mutateProgress()
      } catch (err) {
        console.error("❌ Failed to update current step:", err)
        mutateProgress()
      }
    },
    [token, user, courseId, mutateProgress],
  )

  // Calculate overall progress
  const calculateProgress = useCallback(
    (allSteps: LearningStep[]) => {
      if (!progressData) return 0

      const completedCount = allSteps.filter((step) => {
        if (step.type === "assessment" && step.assessment) {
          return progressData.completedSteps.some(
            (s: { assessmentId: any; isCompleted: any }) => s.assessmentId === step.assessment.id && s.isCompleted,
          )
        }
        return progressData.completedSteps.some(
          (s: { lessonId: any; assessmentId: any; isCompleted: any }) =>
            String(s.lessonId) === String(step.lessonId) && !s.assessmentId && s.isCompleted,
        )
      }).length

      return allSteps.length > 0 ? (completedCount / allSteps.length) * 100 : 0
    },
    [progressData],
  )

// Update the isStepCompleted function:

const isStepCompleted = useCallback(
  (stepId: string) => {
    if (!progressData || !progressData.completedSteps) return false

    console.log(`🔍 [isStepCompleted] Checking step: ${stepId}`)
    
    // Parse step ID format: lessonId-lesson, lessonId-assessment-id, lessonId-quiz-id, moduleId-final-assessment
    const parts = stepId.split('-')
    const lessonOrModuleId = parts[0] // First part is lessonId or moduleId
    const stepType = parts[1] // Second part is step type
    
    if (!lessonOrModuleId) return false

    // 1. Check for lesson steps (lessonId-lesson)
    if (stepType === "lesson") {
      // Check if any step for this lesson is completed (content or video)
      const isCompleted = progressData.completedSteps.some(
        (s: any) => 
          s.lessonId && 
          String(s.lessonId) === String(lessonOrModuleId) && 
          s.isCompleted
      )
      console.log(`📚 Lesson step ${stepId}: ${isCompleted ? '✅' : '❌'}`)
      return isCompleted
    }

    // 2. Check for assessment steps (lessonId-assessment-id or lessonId-quiz-id)
    if (stepType === "assessment" || stepType === "quiz") {
      // Extract assessment ID from stepId (last part)
      const assessmentId = parts[parts.length - 1]
      
      const assessmentCompleted = progressData.completedSteps.some(
        (s: any) => 
          s.assessmentId && 
          String(s.assessmentId) === String(assessmentId) && 
          s.isCompleted
      )
      console.log(`📝 Assessment step ${stepId}: ${assessmentCompleted ? '✅' : '❌'}`)
      return assessmentCompleted
    }

    // 3. Check for module final assessments (moduleId-final-assessment)
    // For final assessments, we need the specific assessment ID from the step data
    // This will be passed from the sidebar as moduleId-final-assessment-assessmentId
    if (stepId.includes("final-assessment")) {
      // Extract the assessment ID if it exists (format: moduleId-final-assessment-assessmentId)
      const assessmentId = parts.length > 3 ? parts[parts.length - 1] : null
      
      if (assessmentId) {
        // Check if this specific assessment is completed
        const isCompleted = progressData.completedSteps.some(
          (s: any) => 
            s.type === "assessment" && 
            String(s.assessmentId) === String(assessmentId) && 
            s.isCompleted
        )
        console.log(`🏆 Module final ${stepId}: ${isCompleted ? '✅' : '❌'}`)
        return isCompleted
      } else {
        // Fallback: if no specific ID, return false (module final not completed)
        console.log(`🏆 Module final ${stepId}: ❌ (no assessment ID found)`)
        return false
      }
    }

    console.log(`❓ Unknown step type: ${stepId}`)
    return false
  },
  [progressData]
)
  // Get step score
  const getStepScore = useCallback(
    (dbId: string) => {
      if (!progressData) return null

      const completedStep = progressData.completedSteps.find(
        (step: { lessonId: string; assessmentId: number }) =>
          (step.lessonId && step.lessonId === dbId) || (step.assessmentId && step.assessmentId === Number(dbId)),
      )

      return completedStep?.score ?? null
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
      // Get token from cookie if not available from hook
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken

      if (!currentToken) {
        console.error("❌ No authentication token found")
        return
      }

      const cacheKey = getCacheKey()
      if (!cacheKey) return

      // Optimistically update
      await mutate(
        cacheKey,
        (currentData: any) => {
          if (!currentData) return currentData

          const stepId = payload.assessmentId ? `${payload.assessmentId}-assessment` : `${payload.lessonId}-lesson`
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

      // Then make API call to backend /progress/pending-step
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/pending-step`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            courseId: payload.courseId,
            userId: payload.userId,
            lessonId: payload.lessonId,
            assessmentId: payload.assessmentId,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to mark step pending")
        }

        mutateProgress()
      } catch (err) {
        console.error("❌ Failed to mark step pending:", err)
        mutateProgress()
      }
    },
    [token, mutateProgress],
  )

const isStepPending = useCallback(
  (stepId: string) => {
    if (!progressData || !progressData.completedSteps) return false;

    console.log(`🔍 [isStepPending] Checking step: ${stepId}`);
    
    // Parse step ID format: lessonId-assessment-id
    const parts = stepId.split('-');
    const assessmentId = parts.length > 2 ? parts[2] : null;
    
    if (!assessmentId) return false;

    // Find the assessment in completedSteps
    const assessmentStep = progressData.completedSteps.find(
      (s: any) => 
        s.type === "assessment" && 
        String(s.assessmentId) === String(assessmentId)
    );

    console.log(`📝 [isStepPending] Found step:`, assessmentStep);
    
    // Check if it's pending
    const isPending = assessmentStep?.status === "pending" || 
                      (assessmentStep?.percentage !== undefined && 
                       assessmentStep?.percentage < 70 && 
                       assessmentStep?.isCompleted === false);

    console.log(`❓ [isStepPending] Result: ${isPending ? 'PENDING' : 'NOT PENDING'}`);
    return isPending;
  },
  [progressData]
);

  const isStepFailed = useCallback(
    (stepId: string) => {
      if (!progressData) return false

      const parts = stepId.split("-")
      const assessmentId = parts[2]

      const step = progressData.completedSteps.find(
        (s: { assessmentId: { toString: () => string } }) => s.assessmentId?.toString() === assessmentId,
      )
      return step?.status === "failed"
    },
    [progressData],
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
  }
}
