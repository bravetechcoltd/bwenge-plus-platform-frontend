// @ts-nocheck
"use client"

import { use, useEffect, useState } from "react"
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

  // State management
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
    refetch,
  } = useLearningProgress(id)

  // ==================== AUTHENTICATION CHECK ====================
  useEffect(() => {
    console.log("🔐 [CourseLearningPage] Authentication check...")

    // Check authentication
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) {
      console.log("❌ [CourseLearningPage] No authentication found, redirecting to login")
      router.push("/login")
      return
    }

    console.log("✅ [CourseLearningPage] User authenticated:", {
      userId: user.id,
      email: user.email,
      role: user.bwenge_role,
    })
  }, [token, user, router])

  const getNextStepLockStatus = () => {
    if (!user || user.bwenge_role !== "LEARNER") {
      return false
    }

    const currentStep = allSteps[currentStepIndex]
    const nextStepIndex = currentStepIndex + 1

    if (!currentStep || nextStepIndex >= allSteps.length) {
      return false
    }

    const isCurrentCompleted = isStepCompleted(currentStep.id)

    return !isCurrentCompleted
  }

  // ==================== FETCH COURSE AND ENROLLMENT DATA ====================
  useEffect(() => {
    const fetchCourseData = async () => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken

      if (!currentToken || !user) {
        console.log("⚠️ [fetchCourseData] Missing auth, skipping fetch")
        return
      }

      console.log("📡 [fetchCourseData] Fetching course data for ID:", id)
      setLoading(true)
      setError(null)

      try {
        // Fetch course details with full curriculum
        const courseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        })

        if (!courseResponse.ok) {
          throw new Error("Failed to fetch course details")
        }

        const courseData = await courseResponse.json()
        console.log("✅ [fetchCourseData] Course fetched:", {
          id: courseData.data?.id,
          title: courseData.data?.title,
          modules: courseData.data?.modules?.length,
        })

        if (!courseData.success || !courseData.data) {
          throw new Error(courseData.message || "Course not found")
        }

        setCourse(courseData.data)

        // Check enrollment status
        const enrollmentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user/${user.id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        })

        if (enrollmentResponse.ok) {
          const enrollmentData = await enrollmentResponse.json()
          console.log("📋 [fetchCourseData] Enrollment data:", enrollmentData)

          const currentEnrollment = enrollmentData.data?.find((e: Enrollment) => e.course_id === id)

          if (!currentEnrollment) {
            console.log("⚠️ [fetchCourseData] User not enrolled in this course")
            router.push(`/courses/${id}`)
            return
          }

          setEnrollment(currentEnrollment)

          // Check access expiration for SPOC courses
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
            if (daysLeft <= 7) {
              setDaysRemaining(daysLeft)
            }
          }
        }

        // Generate learning steps from course structure
        const steps = generateLearningSteps(courseData.data)
        setAllSteps(steps)

        // Fetch existing rating
        await fetchCourseRating(currentToken)
      } catch (err: any) {
        console.error("❌ [fetchCourseData] Error:", err)
        setError(err.message || "Error fetching course")
      } finally {
        setLoading(false)
      }
    }

    if (user && (token || Cookies.get("bwenge_token"))) {
      fetchCourseData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, token, router])

  // ==================== FETCH COURSE RATING ====================
  const fetchCourseRating = async (authToken: string) => {
    try {
      console.log("⭐ [fetchCourseRating] Fetching rating for course:", id)

      // Fetch user's rating
      const userRatingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/reviews/user`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (userRatingRes.ok) {
        const userRatingData = await userRatingRes.json()
        if (userRatingData.success && userRatingData.data) {
          setUserRating({
            rating: userRatingData.data.rating,
            comment: userRatingData.data.comment || "",
          })
        }
      }

      // Fetch all reviews
      const reviewsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/reviews`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json()
        setCourseReviews(reviewsData.data || [])
      }

      console.log("✅ [fetchCourseRating] Rating data loaded")
    } catch (error) {
      console.error("❌ [fetchCourseRating] Error:", error)
    }
  }

  // ==================== HANDLE RATING SUBMISSION ====================
  const handleRatingSubmit = async (rating: number, comment: string) => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken) return

    try {
      console.log("📝 [handleRatingSubmit] Submitting rating:", { rating, comment })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ rating, comment }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [handleRatingSubmit] Rating submitted successfully")

        setUserRating({ rating, comment })
        await fetchCourseRating(currentToken)
        setShowRating(false)
      }
    } catch (error) {
      console.error("❌ [handleRatingSubmit] Error:", error)
    }
  }

  // ==================== INITIALIZE CURRENT STEP ====================
  useEffect(() => {
    if (!allSteps.length || !progressData) {
      console.log("⏳ Waiting for steps and progress data...")
      return
    }

    console.log("📍 [useEffect] Initializing current step...")
    console.log("📊 Progress Data:", {
      currentStepId: progressData.currentStepId,
      overallProgress: progressData.overallProgress,
      completedSteps: progressData.completedSteps?.length || 0
    })
    console.log("📋 All Steps:", allSteps.map(s => ({ id: s.id, lessonId: s.lessonId })))

    const lastStep = getCurrentStep(allSteps as any, progressData)

    if (!lastStep) {
      console.log("❌ No step found, starting from first")
      setCurrentStepIndex(0)
      return
    }

    const lastIndex = allSteps.findIndex((step) => step.id === lastStep.id)
    console.log("🎯 Found step at index:", lastIndex, "Step:", lastStep)

    if (lastIndex >= 0) {
      setCurrentStepIndex(lastIndex)
      console.log("✅ [useEffect] Current step index set to:", lastIndex)
    } else {
      console.log("⚠️ Step not found in allSteps, defaulting to 0")
      setCurrentStepIndex(0)
    }
  }, [allSteps, progressData, getCurrentStep])

  // ==================== GENERATE LEARNING STEPS ====================
  const generateLearningSteps = (course: Course): LearningStep[] => {
  console.log("🔨 [generateLearningSteps] Generating steps for course:", course.title)
  const steps: LearningStep[] = []

  course.modules?.forEach((module: Module) => {
    // Sort lessons by order_index
    const sortedLessons = [...(module.lessons || [])].sort((a, b) => {
      return (a.order_index || 0) - (b.order_index || 0)
    })

    sortedLessons.forEach((lesson: Lesson) => {
      // Create a single step for each lesson (combining content and video)
      // Determine step type based on lesson content
      let stepType: "content" | "video" = "content"
      
      if (lesson.content && lesson.content.trim() && lesson.video_url && lesson.video_url.trim()) {
        stepType = "content" // Mixed content, default to content
      } else if (lesson.video_url && lesson.video_url.trim() && !lesson.content?.trim()) {
        stepType = "video" // Video-only lessons
      } else {
        stepType = "content" // Default for content-only or no content
      }

      // Create lesson data object
      const lessonData = {
        ...lesson,
        duration: lesson.duration_minutes,
      }

      // Add single lesson step
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

      // Add assessment steps (only for assessments, not as part of lesson)
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

      // Add quiz steps
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

    // Add module final assessment
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

    console.log("✅ [generateLearningSteps] Generated", steps.length, "steps")
    console.log("📋 Steps:", steps.map(s => ({ id: s.id, type: s.type, title: s.title })))
    return steps
  }

  // ==================== CHECK COMPLETION FUNCTIONS ====================
  const checkLessonComplete = (lessonId: string): boolean => {
    const lessonSteps = allSteps.filter((step) => step.lessonId === lessonId)
    return lessonSteps.every((step) => isStepCompleted(step.id))
  }

  const checkModuleComplete = (moduleId: string): boolean => {
    const moduleSteps = allSteps.filter((step) => step.moduleId === moduleId)
    return moduleSteps.every((step) => isStepCompleted(step.id))
  }

  const checkCourseComplete = (): boolean => {
    return allSteps.every((step) => isStepCompleted(step.id))
  }

  // ==================== HANDLE STEP COMPLETE ====================
  const handleStepComplete = async (score?: number, passed?: boolean) => {
  const currentStep = allSteps[currentStepIndex]
  if (!currentStep || !user) return

  console.log("✅ [handleStepComplete] Completing step:", {
    stepId: currentStep.id,
    type: currentStep.type,
    score,
    passed,
  })

  // Set stepping state to true
  setIsStepping(true)

  try {
    const payload: any = {
      courseId: id,
      userId: user.id,
    }

    if (currentStep.type === "assessment" && currentStep.assessment) {
      payload.assessmentId = currentStep.assessment.id
      if (score !== undefined) payload.score = score
      payload.isCompleted = true
      payload.passed = passed
      payload.lessonId = currentStep.lessonId // Also include lessonId for context
    } else {
      // For lesson steps (content or video), use lessonId
      payload.lessonId = currentStep.lessonId
      payload.isCompleted = true
    }

    const isLastStep = currentStepIndex === allSteps.length - 1
    payload.status = isLastStep ? "completed" : "in_progress"

    // Mark step as complete if not assessment or if passed
    if (currentStep.type !== "assessment" || passed) {
      await markStepComplete(payload)
      
      // Wait for progress data to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Automatically move to next step for non-assessment steps
      if (currentStep.type !== "assessment") {
        if (currentStepIndex < allSteps.length - 1) {
          // Find the next non-assessment step or next step
          let nextIndex = currentStepIndex + 1
          while (nextIndex < allSteps.length && allSteps[nextIndex].type === "assessment") {
            nextIndex++
          }
          
          if (nextIndex < allSteps.length) {
            setCurrentStepIndex(nextIndex)
          } else if (isLastStep) {
            setShowRating(true)
          }
        } else if (isLastStep) {
          setShowRating(true)
        }
      }
    }

    // Check completion status for celebration
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

    // For assessments that passed, show celebration and move to next step
    if (currentStep.type === "assessment" && passed) {
      if (currentStepIndex < allSteps.length - 1) {
        // Find next non-assessment step
        let nextIndex = currentStepIndex + 1
        while (nextIndex < allSteps.length && allSteps[nextIndex].type === "assessment") {
          nextIndex++
        }
        
        if (nextIndex < allSteps.length) {
          setTimeout(() => {
            setCurrentStepIndex(nextIndex)
          }, 1000)
        } else if (isLastStep && isCourseComplete) {
          setShowRating(true)
        }
      } else if (isLastStep && isCourseComplete) {
        setShowRating(true)
      }
    }
  } catch (error) {
    console.error("❌ [handleStepComplete] Error:", error)
  } finally {
      // Always reset stepping state
      setIsStepping(false)
    }
  }

  // ==================== NAVIGATION HANDLERS ====================
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

  const handleNextStep = () => {
    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleStepSelect = (stepId: string) => {
    const stepIndex = allSteps.findIndex((step) => step.id === stepId)
    if (stepIndex >= 0) {
      setCurrentStepIndex(stepIndex)
    }
  }

  const handleCourseCompletionSelect = () => {
    setCurrentStepIndex(allSteps.length)
  }

  const checkAllStepsCompleted = (): boolean => {
    if (!progressData || !allSteps.length) return false

    console.log("🔍 [checkAllStepsCompleted] Checking all steps...")

    // Check if all steps are completed according to progress data
    const allCompleted = allSteps.every((step) => {
      const isCompleted = isStepCompleted(step.id)
      console.log(`📝 Step ${step.id} (${step.title}): ${isCompleted ? '✅' : '❌'}`)
      return isCompleted
    })

    // Also check if backend marks course as completed
    const backendCompleted = progressData.enrollmentStatus === "COMPLETED" ||
      progressData.overallProgress >= 100

    console.log("📊 [checkAllStepsCompleted] Results:", {
      frontendAllCompleted: allCompleted,
      backendStatus: progressData.enrollmentStatus,
      backendProgress: progressData.overallProgress,
      backendCompleted: backendCompleted
    })

    // If backend says course is completed, trust it even if frontend step tracking is off
    return backendCompleted || allCompleted
  }

  // ==================== PROGRESS STATISTICS ====================
  const getProgressStats = () => {
    const completedSteps = allSteps.filter((step) => isStepCompleted(step.id))
    const assessmentSteps = allSteps.filter((step) => step.type === "assessment")
    const completedAssessments = assessmentSteps.filter((step) => isStepCompleted(step.id))

    const scores = completedAssessments
      .map((step) => getStepScore(step.id))
      .filter((score) => score !== undefined) as number[]

    return {
      overallProgress: calculateProgress(allSteps),
      completedLessons: completedSteps.filter((step) => step.type !== "assessment").length,
      totalLessons: allSteps.filter((step) => step.type !== "assessment").length,
      completedAssessments: completedAssessments.length,
      totalAssessments: assessmentSteps.length,
      timeSpent: completedSteps.reduce((total, step) => total + (step.duration || 0), 0),
      averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      streak: 7,
    }
  }

  // ==================== RENDER STATES ====================
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
                <Button onClick={() => router.push("/dashboard")} className="flex-1">
                  My Dashboard
                </Button>
                <Button onClick={() => router.push("/courses")} variant="outline" className="flex-1">
                  Browse Courses
                </Button>
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
  const allStepsCompleted = checkAllStepsCompleted()
  const isOnCompletionStep = currentStepIndex === allSteps.length

  // ==================== RENDER CURRENT STEP ====================
  const renderCurrentStep = () => {
  const currentStep = allSteps[currentStepIndex]

  if (!currentStep) {
    return <div>Loading...</div>
  }

  switch (currentStep.type) {
    case "content":
      return (
        <ContentScreen
          lesson={{
            ...currentStep.lesson,
            duration_minutes: currentStep.lesson.duration_minutes || currentStep.lesson.duration || 0,
            video_url: currentStep.lesson.video_url,
            thumbnail_url: currentStep.lesson.thumbnail_url,
          }}
          onComplete={handleStepComplete}
          isCompleted={isStepCompleted(currentStep.id)}
          isStepping={isStepping}
          progressData={progressData}
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

  // ==================== MAIN RENDER ====================
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
                      <AlertTitle className="text-orange-800 dark:text-orange-200">
                        Course Deadline Approaching
                      </AlertTitle>
                      <AlertDescription className="text-orange-700 dark:text-orange-300">
                        You have {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining to complete this
                        course before access expires.
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
            if (celebrationData.isCourseComplete) {
              setShowRating(true)
            }
          }}
        />
      )}
    </div>
  )
}