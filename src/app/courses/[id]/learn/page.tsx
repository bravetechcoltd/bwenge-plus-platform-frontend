// @ts-nocheck
"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { useAuth } from "@/hooks/use-auth"
import { useLearningProgress } from "@/hooks/use-learning-progress"
import type { Course, Module, Lesson, Assessment, Enrollment, AssessmentType } from "@/types"
import ContentScreen from "@/components/learning/content-screen"
import { VideoScreen } from "@/components/learning/video-screen"
import { AssessmentScreen } from "@/components/learning/assessment-screen"
import LearningSidebar from "@/components/learning/learning-sidebar"
import LearningNavigation from "@/components/learning/learning-navigation"
import { CompletionCelebration } from "@/components/learning/completion-celebration"
import CourseCompletion from "@/components/learning/course-completion"
import CourseRating from "@/components/learning/course-rating"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Clock, Loader2 } from "lucide-react"

interface LearningStep {
  id: string
  dbId: string
  type: "content" | "video" | "assessment"
  title: string
  lessonId: string
  moduleId: string
  lesson: any
  assessment?: Assessment
  duration?: number
  isCompleted: boolean
}

export default function CourseLearningPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const { token, user } = useAuth()

  // ── State ──────────────────────────────────────────────────────────────────
  const [course, setCourse] = useState<Course>()
  const [enrollment, setEnrollment] = useState<Enrollment>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRating, setShowRating] = useState(false)
  const [userRating, setUserRating] = useState<{ rating: number; comment: string } | null>(null)
  const [courseReviews, setCourseReviews] = useState<any[]>([])
  const [accessExpired, setAccessExpired] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [allSteps, setAllSteps] = useState<LearningStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState<any>({})
  const [isStepping, setIsStepping] = useState(false)
  const [overviewDismissed, setOverviewDismissed] = useState(false)

  // hasInitializedStep: once true, progressData revalidation never resets currentStepIndex
  const hasInitializedStep = useRef(false)

  const {
    progressData,
    markStepComplete,
    getCurrentStep,
    calculateProgress,
    isStepCompleted,
    getStepScore,
    markStepPending,
    isStepPending,
    isStepFailed,
    areAllStepsTrulyPassed,
    refetch,
  } = useLearningProgress(id)

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken || !user) {
      router.push("/login")
      return
    }
  }, [token, user, router])

  // ── checkAllStepsCompleted — STRICT per-step validation ───────────────────
  // NEVER trusts enrollmentStatus or overallProgress from the backend.
  // Backend can mark enrollment as COMPLETED even when assessments are still
  // pending/failed. Only areAllStepsTrulyPassed() is authoritative.
  const checkAllStepsCompleted = (): boolean => {
    if (!progressData || !allSteps.length) return false
    return areAllStepsTrulyPassed(allSteps as any)
  }

  // ── getNextStepLockStatus ──────────────────────────────────────────────────
  // Returns true when the top navigation "Next" button must be locked.
  // - Assessment FAILED or PENDING → lock forward navigation
  // - Assessment PASSED → allow forward
  // - Lesson not completed → lock forward (LEARNER role only)
  // - Next step already passed → always allow (revisit)
  const getNextStepLockStatus = () => {
    if (!user || user.bwenge_role !== "LEARNER") return false
    const currentStep = allSteps[currentStepIndex]
    const nextStepIndex = currentStepIndex + 1
    if (!currentStep || nextStepIndex >= allSteps.length) return false

    // If next step is already completed (passed), always reachable
    if (isStepCompleted(allSteps[nextStepIndex].id)) return false

    if (currentStep.type === "assessment") {
      const failed = isStepFailed(currentStep.id)
      const pending = isStepPending(currentStep.id)
      if (failed || pending) return true
    }

    return !isStepCompleted(currentStep.id)
  }

  // ── Fetch course and enrollment data ──────────────────────────────────────
  useEffect(() => {
    const fetchCourseData = async () => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken
      if (!currentToken || !user) return

      setLoading(true)
      setError(null)

      try {
        const courseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        })
        if (!courseResponse.ok) throw new Error("Failed to fetch course details")

        const courseData = await courseResponse.json()
        if (!courseData.success || !courseData.data) {
          throw new Error(courseData.message || "Course not found")
        }

        setCourse(courseData.data)

        const enrollmentResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user/${user.id}`,
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` } },
        )

        if (enrollmentResponse.ok) {
          const enrollmentData = await enrollmentResponse.json()
          const currentEnrollment = enrollmentData.data?.find(
            (e: Enrollment) => e.course_id === id,
          )
          if (!currentEnrollment) {
            router.push(`/courses/${id}`)
            return
          }

          setEnrollment(currentEnrollment)

          if (courseData.data.course_type === "SPOC" && courseData.data.enrollment_end_date) {
            const expiryDate = new Date(courseData.data.enrollment_end_date)
            const now = new Date()
            if (now > expiryDate && currentEnrollment.status !== "COMPLETED") {
              setAccessExpired(true)
              setLoading(false)
              return
            }
            const timeDiff = expiryDate.getTime() - now.getTime()
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24))
            if (daysLeft <= 7) setDaysRemaining(daysLeft)
          }
        }

        const steps = generateLearningSteps(courseData.data)
        setAllSteps(steps)
        await fetchCourseRating(currentToken)
      } catch (err: any) {
        console.error("❌ [fetchCourseData] Error:", err)
        setError(err.message || "Error fetching course")
      } finally {
        setLoading(false)
      }
    }

    if (user && (token || Cookies.get("bwenge_token"))) fetchCourseData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, token, router])

  // ── Fetch course rating ────────────────────────────────────────────────────
  const fetchCourseRating = async (authToken: string) => {
    try {
      const userRatingRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/reviews/user`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` } },
      )
      if (userRatingRes.ok) {
        const userRatingData = await userRatingRes.json()
        if (userRatingData.success && userRatingData.data) {
          setUserRating({ rating: userRatingData.data.rating, comment: userRatingData.data.comment || "" })
        }
      }
      const reviewsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/reviews`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` } },
      )
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json()
        setCourseReviews(reviewsData.data || [])
      }
    } catch (error) {
      console.error("❌ [fetchCourseRating] Error:", error)
    }
  }

  // ── Handle rating submission ───────────────────────────────────────────────
  const handleRatingSubmit = async (rating: number, comment: string) => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken) return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ rating, comment }),
      })
      if (response.ok) {
        setUserRating({ rating, comment })
        await fetchCourseRating(currentToken)
        setShowRating(false)
      }
    } catch (error) {
      console.error("❌ [handleRatingSubmit] Error:", error)
    }
  }

  // ── Initialize current step ONCE ──────────────────────────────────────────
  useEffect(() => {
    if (!allSteps.length || !progressData) return
    if (hasInitializedStep.current) return

    const lastStep = getCurrentStep(allSteps as any, progressData)
    if (!lastStep) {
      setCurrentStepIndex(0)
      hasInitializedStep.current = true
      return
    }

    const lastIndex = allSteps.findIndex((step) => step.id === lastStep.id)
    if (lastIndex >= 0) {
      setCurrentStepIndex(lastIndex)
    } else {
      setCurrentStepIndex(0)
    }

    hasInitializedStep.current = true
  }, [allSteps, progressData, getCurrentStep])

  // ── Generate learning steps ────────────────────────────────────────────────
  // Journey: lesson → lesson assessment(s) → next lesson → module final assessment
  const generateLearningSteps = (course: Course): LearningStep[] => {
    const steps: LearningStep[] = []

    course.modules?.forEach((module: Module) => {
      const sortedLessons = [...(module.lessons || [])].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0),
      )

      sortedLessons.forEach((lesson: Lesson) => {
        let stepType: "content" | "video" = "content"
        if (lesson.content && lesson.content.trim() && lesson.video_url && lesson.video_url.trim()) {
          stepType = "content"
        } else if (lesson.video_url && lesson.video_url.trim() && !lesson.content?.trim()) {
          stepType = "video"
        }

        const lessonData = { ...lesson, duration: lesson.duration_minutes }

        steps.push({
          id: `${lesson.id}-lesson`,
          dbId: lesson.id,
          type: stepType,
          title: lesson.title,
          lessonId: lesson.id,
          moduleId: module.id,
          lesson: lessonData,
          duration: lesson.duration_minutes,
          isCompleted: false,
        })

        // Lesson assessments immediately follow their lesson
        lesson.assessments?.forEach((assessment: Assessment) => {
          steps.push({
            id: `${lesson.id}-assessment-${assessment.id}`,
            dbId: assessment.id,
            type: "assessment",
            title: assessment.title || `${lesson.title} - Assessment`,
            lessonId: lesson.id,
            moduleId: module.id,
            lesson: lessonData,
            assessment: { ...assessment, description: assessment.description || "" },
            duration: assessment.time_limit_minutes,
            isCompleted: false,
          })
        })

        lesson.quizzes?.forEach((quiz: any) => {
          const quizAsAssessment: Assessment = {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description || "",
            type: "EXAM" as AssessmentType,
            questions: quiz.questions || [],
            passing_score: quiz.passing_score,
            max_attempts: quiz.max_attempts,
            time_limit_minutes: quiz.time_limit_minutes,
            is_published: quiz.is_published,
            created_at: quiz.created_at,
            updated_at: quiz.updated_at,
            course_id: course.id,
            lesson_id: lesson.id,
            module_id: module.id,
            is_final_assessment: false,
            is_module_final: false,
          }

          steps.push({
            id: `${lesson.id}-quiz-${quiz.id}`,
            dbId: quiz.id,
            type: "assessment",
            title: quiz.title || `${lesson.title} - Quiz`,
            lessonId: lesson.id,
            moduleId: module.id,
            lesson: lessonData,
            assessment: quizAsAssessment,
            duration: quiz.time_limit_minutes,
            isCompleted: false,
          })
        })
      })

      if (module.final_assessment) {
        const finalAssessment = module.final_assessment
        const assessmentDetail = finalAssessment.assessment

        steps.push({
          id: `${module.id}-final-assessment`,
          dbId: assessmentDetail?.id || finalAssessment.id,
          type: "assessment",
          title: `${module.title} - Final ${finalAssessment.type === "ASSESSMENT" ? "Assessment" : "Project"}`,
          lessonId: module.id,
          moduleId: module.id,
          lesson: {} as any,
          assessment: {
            id: assessmentDetail?.id || finalAssessment.id,
            title: finalAssessment.title,
            description: assessmentDetail?.description || finalAssessment.project_instructions || "",
            type: finalAssessment.type === "PROJECT" ? "PROJECT" : "EXAM",
            questions: assessmentDetail?.questions || [],
            passing_score: finalAssessment.passing_score_percentage,
            max_attempts: 3,
            time_limit_minutes: finalAssessment.time_limit_minutes,
            is_published: true,
            created_at: finalAssessment.created_at,
            updated_at: finalAssessment.updated_at,
            course_id: course.id,
            module_id: module.id,
            is_final_assessment: true,
            is_module_final: true,
          } as Assessment,
          duration: finalAssessment.time_limit_minutes,
          isCompleted: false,
        })
      }
    })

    console.log("✅ [generateLearningSteps] Generated", steps.length, "steps:",
      steps.map((s) => ({ id: s.id, type: s.type, title: s.title })))
    return steps
  }

  // ── Completion helpers ─────────────────────────────────────────────────────
  const checkLessonComplete = (lessonId: string): boolean => {
    const lessonSteps = allSteps.filter((step) => step.lessonId === lessonId)
    return lessonSteps.every((step) => isStepCompleted(step.id))
  }

  const checkModuleComplete = (moduleId: string): boolean => {
    const moduleSteps = allSteps.filter((step) => step.moduleId === moduleId)
    return moduleSteps.every((step) => isStepCompleted(step.id))
  }

  const checkCourseComplete = (): boolean => checkAllStepsCompleted()

  // ── Handle step complete ───────────────────────────────────────────────────
  // After completing a lesson, advance to NEXT step (may be a lesson assessment).
  // After passing an assessment, advance to NEXT step.
  // Never skip steps — journey: lesson → assessment → next lesson → final assessment.
  const handleStepComplete = async (score?: number, passed?: boolean) => {
    const currentStep = allSteps[currentStepIndex]
    if (!currentStep || !user) return

    setIsStepping(true)

    try {
      const payload: any = { courseId: id, userId: user.id }

      if (currentStep.type === "assessment" && currentStep.assessment) {
        payload.assessmentId = currentStep.assessment.id
        if (score !== undefined) payload.score = score
        payload.isCompleted = true
        payload.passed = passed
        payload.lessonId = currentStep.lessonId
      } else {
        payload.lessonId = currentStep.lessonId
        payload.isCompleted = true
      }

      const isLastStep = currentStepIndex === allSteps.length - 1
      payload.status = isLastStep ? "completed" : "in_progress"

      if (currentStep.type !== "assessment" || passed) {
        await markStepComplete(payload)
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (currentStep.type !== "assessment") {
          if (currentStepIndex < allSteps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1)
          } else if (isLastStep) {
            setShowRating(true)
          }
        }
      }

      const isLessonComplete = checkLessonComplete(currentStep.lessonId)
      const isModuleComplete = checkModuleComplete(currentStep.moduleId)
      const isCourseComplete = checkCourseComplete()

      setCelebrationData({
        stepTitle: currentStep.title,
        stepType: currentStep.type,
        score,
        isLessonComplete,
        isModuleComplete,
        isCourseComplete,
        nextStepTitle: allSteps[currentStepIndex + 1]?.title,
        nextStepId: allSteps[currentStepIndex + 1]?.id,
      })

      if (currentStep.type === "assessment" && passed) {
        if (currentStepIndex < allSteps.length - 1) {
          setTimeout(() => setCurrentStepIndex(currentStepIndex + 1), 1000)
        } else if (isLastStep && isCourseComplete) {
          setShowRating(true)
        }
      }
    } catch (error) {
      console.error("❌ [handleStepComplete] Error:", error)
    } finally {
      setIsStepping(false)
    }
  }

  // ── Navigation handlers ────────────────────────────────────────────────────
  const handleStepPending = async () => {
    const currentStep = allSteps[currentStepIndex]
    if (currentStep.type === "assessment" && user) {
      await markStepPending({
        courseId: id,
        userId: user.id,
        assessmentId: currentStep.assessment!.id,
      })
    }
  }

  // handleNextStep — blocks forward navigation when:
  //   • Current assessment is failed or pending
  //   • Moving to course completion when not all steps are truly passed
  const handleNextStep = () => {
    const currentStep = allSteps[currentStepIndex]

    // Block if current assessment failed or pending
    if (currentStep?.type === "assessment") {
      const failed = isStepFailed(currentStep.id)
      const pending = isStepPending(currentStep.id)
      if (failed || pending) {
        console.log("🔒 [handleNextStep] Blocked: assessment is", failed ? "failed" : "pending")
        return
      }
    }

    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else if (currentStepIndex === allSteps.length - 1) {
      // Moving to course completion — ONLY if all steps truly passed
      if (!checkAllStepsCompleted()) {
        console.log("🔒 [handleNextStep] Blocked: not all steps truly passed")
        return
      }
      setCurrentStepIndex(allSteps.length)
    }
  }

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1)
  }

  const handleStepSelect = (stepId: string) => {
    const stepIndex = allSteps.findIndex((step) => step.id === stepId)
    if (stepIndex >= 0) {
      setCurrentStepIndex(stepIndex)
      setOverviewDismissed(true)
    }
  }

  // handleCourseCompletionSelect — GUARDED: only when all steps truly passed
  const handleCourseCompletionSelect = () => {
    if (!checkAllStepsCompleted()) {
      console.log("🔒 [handleCourseCompletionSelect] Blocked: not all steps truly passed")
      return
    }
    setCurrentStepIndex(allSteps.length)
    setOverviewDismissed(true)
  }

  // ── Progress stats ─────────────────────────────────────────────────────────
  const getProgressStats = () => {
    const completedSteps = allSteps.filter((step) => isStepCompleted(step.id))
    const assessmentSteps = allSteps.filter((step) => step.type === "assessment")
    const completedAssessments = assessmentSteps.filter((step) => isStepCompleted(step.id))
    const scores = completedAssessments
      .map((step) => getStepScore(step.id))
      .filter((s) => s !== undefined) as number[]
    return {
      overallProgress: calculateProgress(allSteps),
      completedLessons: completedSteps.filter((step) => step.type !== "assessment").length,
      totalLessons: allSteps.filter((step) => step.type !== "assessment").length,
      completedAssessments: completedAssessments.length,
      totalAssessments: assessmentSteps.length,
      timeSpent: completedSteps.reduce((total, step) => total + (step.duration || 0), 0),
      averageScore:
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      streak: 7,
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (accessExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="border-2">
            <AlertCircle className="h-6 w-6" />
            <AlertTitle className="text-xl font-bold mb-2">Course Access Expired</AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-base">Your access to this course has expired. The enrollment period has ended.</p>
              <div className="flex gap-3 mt-4">
                <Button onClick={() => router.push("/dashboard")} className="flex-1">My Dashboard</Button>
                <Button onClick={() => router.push("/courses")} variant="outline" className="flex-1">Browse Courses</Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error || !course || allSteps.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-lg font-medium">{error || "Course not found"}</p>
          <Button onClick={() => router.push("/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  const progressStats = getProgressStats()
  // STRICT: never trusts backend enrollmentStatus or overallProgress
  const allStepsCompleted = checkAllStepsCompleted()
  const isOnCompletionStep = currentStepIndex === allSteps.length
  const isFirstStep = currentStepIndex === 0

  // ── Render current step ───────────────────────────────────────────────────
  const renderCurrentStep = () => {
    const currentStep = allSteps[currentStepIndex]
    if (!currentStep) return <div>Loading...</div>

    switch (currentStep.type) {
      case "content":
        return (
          <ContentScreen
            lesson={{
              ...currentStep.lesson,
              duration_minutes: currentStep.lesson.duration_minutes || currentStep.lesson.duration || 0,
              video_url: currentStep.lesson.video_url,
              thumbnail_url: currentStep.lesson.thumbnail_url,
              lesson_materials: currentStep.lesson.lesson_materials || [],
            }}
            onComplete={handleStepComplete}
            isCompleted={isStepCompleted(currentStep.id)}
            isStepping={isStepping}
            progressData={progressData}
            course={course}
            isFirstLesson={isFirstStep && !overviewDismissed}
            onDismissOverview={() => setOverviewDismissed(true)}
          />
        )

      case "video":
        return (
          <VideoScreen
            lesson={{
              ...currentStep.lesson,
              video_url: currentStep.lesson.video_url,
              thumbnail_url: currentStep.lesson.thumbnail_url,
              duration_minutes: currentStep.lesson.duration_minutes || currentStep.lesson.duration || 0,
            }}
            onComplete={() => handleStepComplete(undefined, true)}
            isCompleted={isStepCompleted(currentStep.id)}
          />
        )

      case "assessment":
        return (
          <AssessmentScreen
            assessment={currentStep.assessment!}
            onComplete={handleStepComplete}
            onPending={handleStepPending}
            isCompleted={isStepCompleted(currentStep.id)}
            previousScore={getStepScore(currentStep.id) ?? undefined}
            previousPassed={isStepCompleted(currentStep.id)}
            isStepping={isStepping}
            onClose={() => handleNextStep()}
            isPending={isStepPending(currentStep.id)}
            isFailed={isStepFailed(currentStep.id)}
            refetch={refetch}
            progressData={progressData}
          />
        )

      default:
        return <div>Unknown step type</div>
    }
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <LearningNavigation
        courseTitle={course.title}
        courseId={id}
        currentStepTitle={isOnCompletionStep ? "Course Completion" : allSteps[currentStepIndex].title}
        currentStepIndex={currentStepIndex}
        totalSteps={allSteps.length + 1}
        canGoNext={currentStepIndex < allSteps.length}
        canGoPrevious={currentStepIndex > 0}
        onNext={handleNextStep}
        onPrevious={handlePreviousStep}
        currentStepCompleted={!isOnCompletionStep && isStepCompleted(allSteps[currentStepIndex]?.id)}
        isLastStep={currentStepIndex === allSteps.length - 1}
        isCurrentStepCompleted={!isOnCompletionStep && isStepCompleted(allSteps[currentStepIndex]?.id)}
        isNextStepLocked={getNextStepLockStatus()}
      />

      <div className="">
        <LearningSidebar
          modules={(course.modules || []) as any}
          currentStepId={isOnCompletionStep ? "course-completion" : allSteps[currentStepIndex].id}
          onStepSelect={handleStepSelect}
          onCourseCompletionSelect={handleCourseCompletionSelect}
          courseProgress={progressStats.overallProgress}
          progressData={progressData}
          isStepCompleted={isStepCompleted}
          allStepsCompleted={allStepsCompleted}
          getStepScore={(stepId: string) => getStepScore(stepId) ?? undefined}
          isStepFailed={isStepFailed}
          isStepPending={isStepPending}
        />

        <div className="flex-1 ml-0 lg:ml-[340px] overflow-y-auto">
          <div className="py-8 max-w-full mx-auto">
            {isOnCompletionStep ? (
              <div className="space-y-8">
                <CourseCompletion
                  courseId={id}
                  courseTitle={course.title}
                  progressData={progressData}
                  allSteps={allSteps}
                  getStepScore={(stepId: string) => getStepScore(stepId) ?? undefined}
                  course={course}
                  allStepsCompleted={allStepsCompleted}
                />
                <CourseRating
                  courseId={id}
                  currentRating={userRating?.rating}
                  currentReview={userRating?.comment}
                  onRatingSubmit={handleRatingSubmit}
                  reviews={courseReviews}
                />
              </div>
            ) : (
              <>
                {daysRemaining !== null && daysRemaining <= 7 && (
                  <div className="px-8 pt-4">
                    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <AlertTitle className="text-orange-800 dark:text-orange-200">Course Deadline Approaching</AlertTitle>
                      <AlertDescription className="text-orange-700 dark:text-orange-300">
                        You have {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining to complete this course before access expires.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                {renderCurrentStep()}
              </>
            )}
          </div>
        </div>
      </div>

      {showCelebration && (
        <CompletionCelebration
          data={celebrationData}
          onClose={() => setShowCelebration(false)}
          onNext={() => {
            setShowCelebration(false)
            if (celebrationData.isCourseComplete) setShowRating(true)
          }}
        />
      )}
    </div>
  )
}