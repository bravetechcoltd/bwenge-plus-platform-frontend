"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle,
  Clock,
  Award,
  AlertCircle,
  FileText,
  RotateCcw,
  Eye,
  AlertTriangle,
  Play,
  ChevronRight,
  Upload,
  X,
  ShieldCheck,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import { Pssnt } from "../weblack/pssnt"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"

interface MatchingPair {
  id: string
  left: string
  right: string
}

interface Question {
  id: string
  question: string
  type:
  | "multiple_choice"
  | "true_false"
  | "essay"
  | "short_answer"
  | "matching"
  | "checkboxes"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "ESSAY"
  | "SHORT_ANSWER"
  options: string[]
  correct_answer: string | string[]
  points: number
  pairs?: MatchingPair[]
  order_index?: number
  question_text?: string
  question_type?: string
  answer?: string | string[]
}

interface Assessment {
  id: string
  title: string
  description: string
  type: "quiz" | "assignment" | "project" | "assessment" | "QUIZ" | "EXAM"
  passing_score: number
  time_limit_minutes: number
  questions?: Question[]
  created_at: string
  updated_at: string
  fileRequired?: boolean
  instructions?: string
  max_attempts?: number
  course_id?: string
  lesson_id?: string
  quizzes?: any[]
}

interface SavedAnswer {
  id: string
  question_id: string
  answer: string | string[]
  is_correct: boolean
  points_earned: number
  assessment_id: string
  attempt_number: number
  is_final_submission: boolean
  created_at: string
  question?: Question
  user_answer?: string | string[]
  points_possible?: number
  explanation?: string
  instructor_feedback?: string
  correct_answer?: string | string[]
}

interface AssessmentScreenProps {
  assessment: Assessment
  onComplete: (score: number, passed: boolean) => void
  onPending: () => void
  isCompleted: boolean
  previousScore?: number
  previousPassed?: boolean
  isStepping?: boolean
  onClose: () => void
  isPending?: boolean
  isFailed?: boolean
  refetch?: () => void
  markStepPending?: boolean
  progressData?: any
}

export function AssessmentScreen({
  assessment,
  onComplete,
  onPending,
  isCompleted,
  previousScore,
  previousPassed,
  isStepping,
  onClose,
  isPending,
  isFailed,
  refetch,
  markStepPending,
  progressData,
}: AssessmentScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [timeRemaining, setTimeRemaining] = useState(assessment.time_limit_minutes * 60)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, string | string[]>>({})
  const [showStartModal, setShowStartModal] = useState(true)
  const [timerStarted, setTimerStarted] = useState(false)
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([])
  const [loadingSavedAnswers, setLoadingSavedAnswers] = useState(false)
  const [passed, setPassed] = useState(false)
  const [loadingRetake, setLoadingRetake] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [scrambledMatchingPairs, setScrambledMatchingPairs] = useState<Record<string, MatchingPair[]>>({})
  const [expanded, setExpanded] = useState(false)
  const [submittedAnswers, setSubmittedAnswers] = useState<SavedAnswer[]>([])
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
const [requiresManualGrading, setRequiresManualGrading] = useState(false);
  const { token, user } = useAuth()
  const router = useRouter()

  // Get questions from assessment - handle both structures
  const getQuestions = (): Question[] => {
    if (assessment.questions && assessment.questions.length > 0) {
      return assessment.questions
    }

    // Handle quiz structure
    if (assessment.quizzes && assessment.quizzes.length > 0) {
      const quiz = assessment.quizzes[0]
      if (quiz.questions && quiz.questions.length > 0) {
        return quiz.questions.map((q: any) => ({
          id: q.id || `question-${Math.random()}`,
          question: q.question_text || q.question || "",
          type: (q.question_type || q.type || "multiple_choice").toLowerCase() as any,
          options: q.options || [],
          correct_answer: q.correct_answer || "",
          points: q.points || 1,
          order_index: q.order_index || 0,
        }))
      }
    }

    return []
  }

  const questions = getQuestions()
  const totalQuestions = questions.length
useEffect(() => {
  const hasSubjectiveQuestions = questions.some(
    (q) => q.type === "SHORT_ANSWER" || q.type === "ESSAY" || q.type === "short_answer" || q.type === "essay"
  );
  setRequiresManualGrading(hasSubjectiveQuestions);
}, [questions]);
  // Check authentication
  useEffect(() => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) {
      router.push("/login")
      return
    }
  }, [token, user, router])

useEffect(() => {
  if (!progressData || !progressData.completedSteps) {
    console.log("[v0] No progress data available, showing start modal")
    setShowStartModal(true)
    setTimerStarted(false)
    return
  }

  const completedAssessmentIds = progressData.completedSteps
    .filter((s: any) => s.type === "assessment")
    .map((s: any) => ({id: s.assessmentId, ...s}))

  console.log("[v0] DEBUG: Assessment Completion Check", {
    currentAssessmentId: assessment.id,
    completedAssessmentCount: completedAssessmentIds.length,
    completedAssessmentIds: completedAssessmentIds.map((a: any) => ({
      id: a.id,
      isCompleted: a.isCompleted,
      status: a.status,
      percentage: a.percentage,
      score: a.score,
      passed: a.passed
    }))
  })

  // Check if assessment is completed OR pending
  const assessmentStep = progressData.completedSteps.find(
    (step: any) => 
      step.type === "assessment" && 
      step.assessmentId === assessment.id
  )

  if (assessmentStep) {
    console.log("[v0] ASSESSMENT FOUND IN PROGRESS DATA - CHECKING STATUS", {
      assessmentId: assessment.id,
      status: assessmentStep.status,
      isCompleted: assessmentStep.isCompleted,
      percentage: assessmentStep.percentage,
      passed: assessmentStep.passed
    })

    // If assessment is COMPLETED (passed or failed)
    if (assessmentStep.isCompleted === true) {
      console.log("[v0] ASSESSMENT FOUND AS COMPLETED - DISPLAYING RESULTS", {
        assessmentId: assessment.id,
        score: assessmentStep.percentage,
        percentage: assessmentStep.percentage,
        passed: assessmentStep.passed,
        status: assessmentStep.status
      })
      
      const scoreValue = assessmentStep.percentage || assessmentStep.score || 0
      console.log("[v0] Setting score value:", scoreValue)
      setScore(scoreValue)
      setPassed(assessmentStep.passed || (scoreValue >= assessment.passing_score))
      setShowStartModal(false)
      setTimerStarted(false)
      setIsSubmitted(true)
      setShowReview(true)
      fetchSavedAnswers()
    } 
    // If assessment is PENDING (awaiting grading)
    else if (assessmentStep.status === "pending" || !assessmentStep.isCompleted) {
      console.log("[v0] ASSESSMENT FOUND AS PENDING - SHOWING PENDING STATE", {
        assessmentId: assessment.id,
        status: assessmentStep.status,
        isCompleted: assessmentStep.isCompleted
      })
      
      setShowStartModal(false) // DO NOT show start modal for pending assessments
      setTimerStarted(false)
      setIsSubmitted(true) // Mark as submitted since it's pending grading
      setScore(assessmentStep.percentage || 0)
      setPassed(false) // Not passed yet if pending
      setShowReview(false) // Don't show review if not graded yet
      fetchSavedAnswers() // Still fetch saved answers to show what was submitted
    }
    // If assessment exists but is not completed or pending (maybe started but not submitted)
    else {
      console.log("[v0] ASSESSMENT EXISTS BUT NOT COMPLETED OR PENDING - SHOWING START MODAL", {
        assessmentId: assessment.id,
        status: assessmentStep.status,
        isCompleted: assessmentStep.isCompleted
      })
      setShowStartModal(true)
      setTimerStarted(false)
      setIsSubmitted(false)
    }
  } else {
    // Assessment not found in progress data - user hasn't started it yet
    console.log("[v0] ASSESSMENT NOT FOUND IN COMPLETED STEPS - SHOWING START MODAL", {
      assessmentId: assessment.id,
      reason: "Assessment not in completedSteps - user hasn't started it yet"
    })
    setShowStartModal(true)
    setTimerStarted(false)
    setIsSubmitted(false)
    setSavedAnswers([])
    setSubmittedAnswers([])
    setScore(0)
    setPassed(false)
    setShowReview(false)
  }
}, [assessment.id, progressData])
  useEffect(() => {
    console.log("=".repeat(80))
    console.log("🔍 [AssessmentScreen] INITIALIZATION DEBUG")
    console.log("=".repeat(80))

    console.log("📋 [Assessment Data]:", {
      id: assessment.id,
      type: assessment.type,
      title: assessment.title,
      questionsCount: totalQuestions,
      passing_score: assessment.passing_score,
      time_limit_minutes: assessment.time_limit_minutes,
      hasRegularQuestions: !!assessment.questions,
      hasQuizQuestions: !!(assessment.quizzes && assessment.quizzes[0]?.questions),
      quizCount: assessment.quizzes?.length || 0,
    })

    // Fetch enrollment if not already available
    const fetchEnrollment = async () => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken

      if (!currentToken || !user || !assessment.course_id) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user/${user.id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const enrollment = data.data?.find((e: any) => e.course_id === assessment.course_id)
          if (enrollment) {
            setEnrollmentId(enrollment.id)
            console.log("✅ [fetchEnrollment] Found enrollment:", enrollment.id)
          }
        }
      } catch (error) {
        console.error("❌ [fetchEnrollment] Error:", error)
      }
    }

    fetchEnrollment()

    const correctAnswersMap: Record<string, string | string[]> = {}
    const scrambled: Record<string, MatchingPair[]> = {}

    questions.forEach((question) => {
      correctAnswersMap[question.id] = question.correct_answer

      // Scramble right items for matching questions
      if (question.type === "matching" && question.pairs) {
        const rightItems = [...question.pairs]
        // Fisher-Yates shuffle
        for (let i = rightItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
            ;[rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]]
        }
        scrambled[question.id] = rightItems
      }
    })

    setScrambledMatchingPairs(scrambled)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setTimeRemaining(assessment.time_limit_minutes * 60)
    // Don't reset submitted/score state here - let the progressData effect handle it
    // This prevents overwriting the correct state when an assessment is already completed
    setShowReview(false)
    setCorrectAnswers(correctAnswersMap || {})
    setTimerStarted(false)
    // Don't reset saved answers and submitted answers here either
    // They should only be set by the progressData effect or fetchSavedAnswers

    // The logic for setting showStartModal and fetching saved answers when isCompleted/isPending/isFailed
    // is now handled by the progressData useEffect. This part is redundant and potentially conflicting.
    // We can remove the parts related to showStartModal and fetchSavedAnswers here.
    // if ((isCompleted || isPending || isFailed) && previousScore !== undefined) {
    //   setShowStartModal(false)
    //   setTimerStarted(false)
    //   fetchSavedAnswers()
    // } else {
    //   setShowStartModal(true)
    //   setTimerStarted(false)
    //   setSavedAnswers([])
    // }

    console.log("✅ [AssessmentScreen] Initialization complete")
  }, [assessment.id, assessment.time_limit_minutes, token, user, router])

  const fetchSavedAnswers = async () => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) return

    setLoadingSavedAnswers(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/answers/${assessment.id}/user`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [fetchSavedAnswers] Response:", data)

        if (data.success && data.data) {
          // Process answers from backend
          const answersArray = data.data.answers || []
          const processedAnswers = answersArray.map((answer: any) => ({
            ...answer,
            id: answer.answer_id || answer.id,
            question_id: answer.question_id,
            user_answer: answer.user_answer || answer.answer,
            is_correct: answer.is_correct || false,
            points_earned: answer.points_earned || 0,
            points_possible: answer.points_possible || answer.question?.points || 1,
            // Include full question data from backend
            question: answer.question ? {
              id: answer.question.id,
              text: answer.question.text || answer.question.question_text,
              type: answer.question.type || answer.question.question_type,
              options: answer.question.options || [],
              points: answer.question.points || 1,
              correct_answer: answer.question.correct_answer,
            } : null,
          }))

          setSavedAnswers(processedAnswers)
          setSubmittedAnswers(processedAnswers)

          // Update score from backend response
          if (data.data.summary) {
            const summary = data.data.summary
            const calculatedScore = summary.percentage || 0
            console.log("[v0] Setting score from summary:", {
              percentage: calculatedScore,
              has_passed: summary.has_passed,
              total_answers: summary.total_answers
            })
            setScore(calculatedScore)
            setPassed(summary.has_passed || calculatedScore >= assessment.passing_score)
          } else if (data.data.assessment) {
            // Fallback: Calculate score from individual answers if summary not available
            const answers = data.data.answers || []
            const correctCount = answers.filter((a: any) => a.is_correct).length
            const totalCount = answers.length
            const calculatedScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
            console.log("[v0] Calculated score from answers:", {
              percentage: calculatedScore,
              correct: correctCount,
              total: totalCount
            })
            setScore(calculatedScore)
            setPassed(calculatedScore >= assessment.passing_score)
          }

          // Show the review view for completed assessments
          setShowReview(true)
          setIsSubmitted(true)
        }
      } else {
        console.error("❌ [fetchSavedAnswers] Failed with status:", response.status)
      }
    } catch (error) {
      console.error("❌ [fetchSavedAnswers] Error:", error)
    } finally {
      setLoadingSavedAnswers(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  useEffect(() => {
    if (!timerStarted || timeRemaining <= 0 || isSubmitted) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timerStarted, timeRemaining, isSubmitted])

  const handleStartAssessment = () => {
    setShowStartModal(false)
    setTimerStarted(true)
    setIsActive(true)
  }

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  // ==================== ADD THIS HELPER FUNCTION ====================
  const buildQuestionIdMap = (): Map<string, string> => {
    const idMap = new Map<string, string>()

    // If assessment has both JSONB questions and linked quizzes
    if (assessment.questions && assessment.quizzes && assessment.quizzes[0]?.questions) {
      const assessmentQuestions = [...assessment.questions].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

      const quizQuestions = [...assessment.quizzes[0].questions].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0),
      )

      // Map by order index
      assessmentQuestions.forEach((assessmentQ, index) => {
        const quizQ = quizQuestions[index]
        if (quizQ) {
          idMap.set(assessmentQ.id, quizQ.id)
          console.log(`📋 Mapped: ${assessmentQ.id} → ${quizQ.id}`)
        }
      })
    }

    return idMap
  }

const handleSubmit = async () => {
  const cookieToken = Cookies.get("bwenge_token")
  const currentToken = token || cookieToken

  if (!currentToken || !user) {
    toast({
      title: "Authentication Required",
      description: "Please log in to submit answers",
      variant: "destructive",
    })
    return
  }

  // ✅ BUILD QUESTION ID MAPPING
  const questionIdMap = buildQuestionIdMap()
  console.log("📋 Question ID Map:", Object.fromEntries(questionIdMap))

  // Calculate score for auto-graded questions
  let earnedPoints = 0
  let totalPoints = 0
  const correctAnswersMap: Record<string, string | string[]> = {}

  questions.forEach((question) => {
    totalPoints += question.points
    const userAnswer = answers[question.id] || ""
    correctAnswersMap[question.id] = question.correct_answer

    const questionType = question.type.toLowerCase()

    if (questionType === "true_false") {
      if (userAnswer === question.correct_answer) {
        earnedPoints += question.points
      }
    } else if (questionType === "multiple_choice" || questionType === "checkboxes") {
      if (Array.isArray(question.correct_answer)) {
        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer]
        const correctAnswers = question.correct_answer

        const isCorrect =
          userAnswers.length === correctAnswers.length &&
          userAnswers.every((answer) => correctAnswers.includes(answer)) &&
          correctAnswers.every((answer) => userAnswers.includes(answer))

        if (isCorrect) {
          earnedPoints += question.points
        }
      } else {
        if (userAnswer === question.correct_answer) {
          earnedPoints += question.points
        }
      }
    } else if (questionType === "matching") {
      if (question.pairs && question.pairs.length > 0) {
        let allCorrect = true

        question.pairs.forEach((pair, pairIndex) => {
          const userSelection = answers[`${question.id}-match-${pairIndex}`] as string
          if (userSelection !== pair.right) {
            allCorrect = false
          }
        })

        if (allCorrect) {
          earnedPoints += question.points
        }
      }
    }
  })

  try {
    setLoading(true)

    const answersToSubmit = questions.map((question) => {
      const mappedQuestionId = questionIdMap.get(question.id) || question.id

      console.log(`📤 Submitting answer for question: ${question.id} → ${mappedQuestionId}`)

      if (question.type === "matching") {
        const matchingAnswers: Record<string, string> = {}
        Object.entries(answers).forEach(([key, value]) => {
          if (key.startsWith(`${question.id}-match-`)) {
            const index = key.split("-match-")[1]
            matchingAnswers[index] = value as string
          }
        })
        return {
          question_id: mappedQuestionId,
          answer: JSON.stringify(matchingAnswers),
        }
      }
      return {
        question_id: mappedQuestionId,
        answer: Array.isArray(answers[question.id])
          ? (answers[question.id] as string[]).join(",")
          : answers[question.id] || "",
      }
    })

    console.log("📤 Submitting answers:", answersToSubmit)

    // Submit answers using the unified endpoint
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/answers/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        assessment_id: assessment.id,
        answers: answersToSubmit,
        enrollment_id: enrollmentId,
      }),
    })

    const data = await res.json()
    console.log("✅ [handleSubmit] Submission response:", data)

    if (!res.ok) {
      throw new Error(data.message || "Failed to submit answers")
    }
    if (data.success && data.data) {
      // Set submitted answers from backend response
      if (data.data.answers) {
        setSubmittedAnswers(data.data.answers.map((ans: any) => ({
          ...ans,
          question_id: ans.question_id,
          user_answer: ans.user_answer || ans.answer,
          is_correct: ans.is_correct,
          points_earned: ans.points_earned
        })))
      }

      await fetchSavedAnswers()

      const finalScore = data.data.percentage
        ? Number.parseFloat(data.data.percentage)
        : totalPoints > 0
          ? Math.round((earnedPoints / totalPoints) * 100)
          : 0
      const finalPassed = data.data.passed !== undefined ? data.data.passed : finalScore >= assessment.passing_score

      setScore(finalScore)
      setPassed(finalPassed)

      // Update progress if assessment is passed
      if (finalPassed && !requiresManualGrading) {
        await updateProgress(finalScore, true)
      }
    }

    if (requiresManualGrading) {
      onPending()
      toast({
        title: "Assessment Submitted",
        description: "Your assessment has been submitted for manual grading.",
      })
    } else {
      const finalScore = data.data.percentage
        ? Number.parseFloat(data.data.percentage)
        : totalPoints > 0
          ? Math.round((earnedPoints / totalPoints) * 100)
          : 0
      const finalPassed = data.data.passed !== undefined ? data.data.passed : finalScore >= assessment.passing_score

      setScore(finalScore)
      setPassed(finalPassed)
      setCorrectAnswers(correctAnswersMap)
      setIsSubmitted(true)

      if (finalPassed) {
        toast({
          title: "Assessment Completed",
          description: `You scored ${finalScore}% and passed the assessment!`,
        })
      } else {
        toast({
          title: "Assessment Completed",
          description: `You scored ${finalScore}%. You need ${assessment.passing_score}% to pass.`,
          variant: "destructive",
        })
      }
    }
  } catch (error: any) {
    console.error("❌ [handleSubmit] Error:", error)
    toast({
      title: "Submission Error",
      description: error.message || "Failed to submit answers. Please try again.",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}

  const updateProgress = async (score: number, passed: boolean) => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user || !assessment.course_id) return

    try {
      const progressPayload = {
        courseId: assessment.course_id,
        userId: user.id,
        lessonId: assessment.lesson_id,
        assessmentId: assessment.id,
        score: score,
        percentage: score,
        isCompleted: true,
        passed: passed,
        time_spent_seconds: assessment.time_limit_minutes * 60 - timeRemaining,
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/complete-step`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(progressPayload),
      })

      if (response.ok) {
        console.log("✅ [updateProgress] Progress updated successfully")
      }
    } catch (error) {
      console.error("❌ [updateProgress] Error:", error)
    }
  }

  const handleComplete = () => {
    console.log("✅ [handleComplete] Completing assessment with:", { score, passed })
    onComplete(score, passed)
  }

  const handleRetake = async () => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) return

    setCurrentQuestionIndex(0)
    setAnswers({})
    setTimeRemaining(assessment.time_limit_minutes * 60)
    setIsSubmitted(false)
    setScore(0)
    setShowReview(false)
    setShowStartModal(true) // Reset to start modal for retake
    setTimerStarted(false)

    setLoadingRetake(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/retake-assessment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          studentId: user.id,
          assessmentId: assessment.id,
          userId: user.id,
          courseId: assessment.course_id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [handleRetake] Retake response:", data)

        if (data.success) {
          toast({
            title: "Assessment Reset",
            description: "You can now retake this assessment.",
          })
          refetch?.()
        }
      } else {
        throw new Error("Failed to retake assessment")
      }
    } catch (error: any) {
      console.error("❌ [handleRetake] Error:", error)
      toast({
        title: "Retake Failed",
        description: error.message || "Failed to reset assessment for retake",
        variant: "destructive",
      })
    } finally {
      setLoadingRetake(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedFile(event.target.files[0])
    }
  }

  const handleFileUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return
    }

    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append("file", uploadedFile)
    formData.append("assessment_id", assessment.id)
    formData.append("user_id", user.id)
    if (assessment.course_id) formData.append("course_id", assessment.course_id)
    if (enrollmentId) formData.append("enrollment_id", enrollmentId)

    try {
      // Note: You'll need to create a file upload endpoint for assessments
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/assessment-file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUploadedFileUrl(data.data.url)
          toast({
            title: "File Uploaded Successfully",
            description: "Your file has been uploaded and attached to this assessment.",
          })
        }
      } else {
        throw new Error("File upload failed")
      }
    } catch (error: any) {
      console.error("❌ [handleFileUpload] Error:", error)
      toast({
        title: "File Upload Failed",
        description: error.message || "There was an error uploading your file.",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const getUserAnswer = (question: Question, answers: Record<string, any>) => {
    if (question.type !== "matching") {
      return answers[question.id] ?? "Not answered"
    }

    if (!question.pairs || question.pairs.length === 0) {
      return "Not answered"
    }

    const result = question.pairs.map((pair, index) => {
      const userAnswer = answers[`${question.id}-match-${index}`]
      return userAnswer ? `${pair.left} -> ${userAnswer}` : `${pair.left} -> Not matched`
    })

    return result.some((r) => !r.includes("Not matched")) ? result.join("; ") : "Not answered"
  }

// ==================== RENDER STATES ====================

// Show loading state when fetching answers for a completed assessment
if (loadingSavedAnswers) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your answers...</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== CHECK IF ASSESSMENT IS PENDING FROM PROGRESS DATA ====================
const getAssessmentStatusFromProgress = () => {
  if (!progressData?.completedSteps) return null;
  
  // Find the assessment in completedSteps
  const assessmentStep = progressData.completedSteps.find(
    (step: any) => 
      step.type === "assessment" && 
      step.assessmentId === assessment.id
  );
  
  return assessmentStep?.status || null;
};

// Use this to determine if assessment is pending
const assessmentStatus = getAssessmentStatusFromProgress();
const isPendingFromProgress = assessmentStatus === "pending";

// ==================== RENDER PENDING STATE ====================
// Show pending state if:
// 1. isPending prop is true OR
// 2. Assessment status is "pending" from progress data OR
// 3. Score is low and has subjective questions
const shouldShowPending = isPending || isPendingFromProgress || (isSubmitted && score < assessment.passing_score && requiresManualGrading);

if (shouldShowPending) {
  // Check if this assessment has subjective questions
  const hasSubjectiveQuestions = questions.some(
    (q) => q.type === "SHORT_ANSWER" || q.type === "ESSAY" || q.type === "short_answer" || q.type === "essay"
  );
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Pssnt onComplete={(score, passed) => onComplete(score, passed)} />
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="w-16 h-16 text-blue-500" />
          </div>
          <CardTitle className="text-2xl">Assessment Submitted</CardTitle>
          <p className="text-muted-foreground">{assessment.title}</p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {hasSubjectiveQuestions ? "Pending Instructor Review" : "Assessment Being Processed"}
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              {hasSubjectiveQuestions 
                ? "Your assessment has been submitted successfully and is awaiting manual grading by your instructor. You'll be notified once your assessment has been graded."
                : "Your assessment is being processed. Please check back later for your results."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions Answered</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {progressData?.completedSteps?.find((s: any) => s.assessmentId === assessment.id)?.completedAt 
                  ? new Date(progressData.completedSteps.find((s: any) => s.assessmentId === assessment.id)?.completedAt).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">Submitted On</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {progressData?.completedSteps?.find((s: any) => s.assessmentId === assessment.id)?.percentage || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Current Score</div>
            </div>
          </div>

          {assessment.fileRequired && uploadedFileUrl && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <p className="font-medium text-green-700 dark:text-green-300">
                  File uploaded successfully:{" "}
                  <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    {uploadedFileUrl.substring(uploadedFileUrl.lastIndexOf("/") + 1)}
                  </a>
                </p>
              </div>
            </div>
          )}

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-left">
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">What happens next?</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {hasSubjectiveQuestions ? (
                    <>
                      <li>• Your instructor will review your answers</li>
                      <li>• Once graded, you can proceed to the next lesson</li>
                      <li>• You'll receive an email notification when grading is complete</li>
                    </>
                  ) : (
                    <>
                      <li>• Your answers are being processed</li>
                      <li>• Results will be available soon</li>
                      <li>• You can continue with other lessons while waiting</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Show previous attempt if any */}
          {savedAnswers.length > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium text-purple-800 dark:text-purple-200 mb-1">Previous Attempt</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    You have {savedAnswers.filter((a: any) => a.is_graded).length} graded questions from previous attempt(s).
                    <Button
                      variant="link"
                      className="ml-2 p-0 h-auto"
                      onClick={() => setShowReview(true)}
                    >
                      Review Answers
                    </Button>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




  if (showStartModal && !isSubmitted) {
    console.log("[v0] Rendering BEGIN ASSESSMENT modal", {
      showStartModal,
      isSubmitted,
      isCompleted
    })
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Pssnt onComplete={(score, passed) => onComplete(score, passed)} />
        <Dialog
          open={showStartModal}
          // onOpenChange={(open) => {
          //   setShowStartModal(open)
          //   if (!open && onClose) {
          //     onClose()
          //   }
          // }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Award className="w-6 h-6 text-primary" />
                {assessment.title}
              </DialogTitle>
              <DialogDescription className={`text-base mt-4 transition-all ${expanded ? "" : "line-clamp-3"}`}>
                {assessment.description}
              </DialogDescription>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-sm text-primary hover:underline self-start"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{assessment.time_limit_minutes || 0}</div>
                  <div className="text-sm text-muted-foreground">Minutes</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{assessment.passing_score}%</div>
                  <div className="text-sm text-muted-foreground">To Pass</div>
                </div>
              </div>

              {assessment.instructions && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">Instructions:</p>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                        {assessment.instructions.split("\n").map((line, index) => (
                          <li key={index}>• {line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {assessment.fileRequired && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">File Upload Required</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                        Please upload the required file before starting the assessment.
                      </p>
                      <div className="mt-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="text-sm border rounded p-2 w-full"
                        />
                        <Button
                          onClick={handleFileUpload}
                          disabled={!uploadedFile || uploadingFile}
                          className="mt-2 w-full"
                        >
                          {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload File"}
                        </Button>
                        {uploadedFileUrl && (
                          <Alert className="mt-3 py-2">
                            <AlertDescription className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-green-500" />
                              File uploaded successfully.
                              <Button variant="ghost" size="sm" onClick={() => setUploadedFileUrl(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Important Instructions:</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                      <li>• Once you begin, the timer will start automatically</li>
                      <li>• You cannot pause the assessment once started</li>
                      <li>• The assessment will auto-submit when time runs out</li>
                      <li>• Make sure you have a stable internet connection</li>
                      {assessment.max_attempts && <li>• Maximum attempts: {assessment.max_attempts}</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleStartAssessment}
                className="flex items-center gap-2"
                disabled={assessment.fileRequired && !uploadedFileUrl}
              >
                <Play className="w-4 h-4" />
                Begin Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const shouldShowCompleted = isSubmitted && score !== undefined && score >= 0
  
  if (shouldShowCompleted) {
    console.log("[v0] Rendering completed assessment view:", {
      isSubmitted,
      score,
      passed,
      totalQuestions,
      savedAnswersCount: savedAnswers.length
    })
    if (loadingSavedAnswers) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your answers...</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Handle cases where there are no questions but assessment is completed
    if (totalQuestions === 0 && savedAnswers.length === 0) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <Card className="shadow-none border-0">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {passed || previousPassed ? (
                  <CheckCircle className="w-16 h-16 text-green-500" />
                ) : (
                  <AlertCircle className="w-16 h-16 text-red-500" />
                )}
              </div>
              <CardTitle className="text-2xl">Assessment Complete</CardTitle>
              <p className="text-muted-foreground">{assessment.title}</p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-sm text-muted-foreground">Your Score</div>
                  <div className="text-3xl font-bold text-primary mt-1">{score || previousScore || 0}%</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-sm text-muted-foreground">Passing Score</div>
                  <div className="text-3xl font-bold text-blue-600 mt-1">{assessment.passing_score}%</div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg">
                  <div className="text-sm text-muted-foreground">Questions</div>
                  <div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mt-1">0</div>
                </div>
              </div>

              <Alert
                className={
                  (passed || previousPassed)
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                    : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                }
              >
                <AlertDescription
                  className={(passed || previousPassed) ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}
                >
                  {(passed || previousPassed) ? (
                    <>Great job! You've passed this assessment. You can now proceed to the next step.</>
                  ) : (
                    <>
                      You did not pass this assessment. You need {assessment.passing_score}% to pass. You can retake this
                      assessment if attempts remain.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="shadow-none border-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {passed || previousPassed ? (
                <CheckCircle className="w-16 h-16 text-green-500" />
              ) : (
                <AlertCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">Assessment Complete</CardTitle>
            <p className="text-muted-foreground">{assessment.title}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Your Score</div>
                <div className="text-3xl font-bold text-primary mt-1">{score || previousScore || 0}%</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-sm text-muted-foreground">Passing Score</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">{assessment.passing_score}%</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg">
                <div className="text-sm text-muted-foreground">Questions</div>
                <div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mt-1">{totalQuestions}</div>
              </div>
            </div>

            <Alert
              className={
                (passed || previousPassed)
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                  : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
              }
            >
              <AlertDescription
                className={(passed || previousPassed) ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}
              >
                {(passed || previousPassed) ? (
                  <>Great job! You've passed this assessment. You can now proceed to the next step.</>
                ) : (
                  <>
                    You did not pass this assessment. You need {assessment.passing_score}% to pass. You can retake this
                    assessment if attempts remain.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button onClick={() => setShowReview(!showReview)} variant="outline" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {showReview ? "Hide Review" : "Review Your Answers"}
              </Button>
              {!previousPassed && (
                <Button onClick={handleRetake} disabled={loadingRetake} className="flex items-center gap-2">
                  {loadingRetake ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Retake Assessment
                </Button>
              )}
            </div>

            {showReview && (
              <div className="space-y-6 border-t pt-6">
                <h3 className="font-semibold text-lg">Review Your Answers</h3>
                {submittedAnswers.map((submittedAnswer: any, index: number) => (
                  <Card key={submittedAnswer.answer_id || index} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium mb-2">Question {index + 1}</div>
                          <p className="text-sm text-muted-foreground">
                            {submittedAnswer.question?.text || "Question"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {submittedAnswer.is_correct ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span
                            className={`text-sm font-semibold ${submittedAnswer.is_correct ? "text-green-600" : "text-red-600"}`}
                          >
                            {submittedAnswer.is_correct ? "Correct" : "Incorrect"} ({submittedAnswer.points_earned} /{" "}
                            {submittedAnswer.points_possible} points)
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Your answer:</p>
                        <p
                          className={`text-sm mt-1 ${submittedAnswer.is_correct ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
                        >
                          {submittedAnswer.user_answer || "Not answered"}
                        </p>
                      </div>

                      {!submittedAnswer.is_correct && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Correct answer:</p>
                          <p className="text-sm mt-1 text-green-700 dark:text-green-300">
                            {submittedAnswer.correct_answer || "Not available"}
                          </p>
                        </div>
                      )}

                      {submittedAnswer.explanation && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm text-blue-900 dark:text-blue-300">
                          <p className="font-medium mb-1">Explanation:</p>
                          <p>{submittedAnswer.explanation}</p>
                        </div>
                      )}

                      {submittedAnswer.instructor_feedback && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded text-sm text-purple-900 dark:text-purple-300">
                          <p className="font-medium mb-1">Instructor Feedback:</p>
                          <p>{submittedAnswer.instructor_feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }



  if (isFailed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Pssnt onComplete={(score, passed) => onComplete(score, passed)} />
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Assessment Failed</CardTitle>
            <p className="text-muted-foreground">{assessment.title}</p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">{previousScore}%</div>
                <div className="text-sm text-muted-foreground">Your Score</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{assessment.passing_score}%</div>
                <div className="text-sm text-muted-foreground">Passing Score</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-red-700 dark:text-red-300 font-medium">
                  You need {assessment.passing_score}% to pass. You can review your answers and retake this assessment.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowReview(!showReview)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showReview ? "Hide Review" : "Review Answers"}
                </Button>
                <Button onClick={handleRetake} className="flex items-center gap-2" disabled={loadingRetake}>
                  <RotateCcw className="w-4 h-4" />
                  {loadingRetake ? "Retaking..." : "Retake Assessment"}
                </Button>
              </div>
            </div>

            {showReview && (
              <div className="mt-6 text-left">
                <h3 className="text-lg font-semibold mb-4">Review Your Answers</h3>
                <div className="space-y-4">
                  {questions.map((question, index) => {
                    const userAnswer = getUserAnswer(question, answers)
                    const ans = submittedAnswers.find((sa) => sa.question_id === question.id) // Changed to question_id
                    const isCorrect = ans && ans.is_correct
                    const pointsEarned = ans && ans.points_earned

                    return (
                      <div key={question.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${question.type === "essay" ||
                                question.type === "short_answer" ||
                                question.type === "ESSAY" ||
                                question.type === "SHORT_ANSWER"
                                ? "bg-gray-100 text-gray-700"
                                : isCorrect
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium mb-2">{question.question}</p>
                            <div className="text-sm space-y-1">
                              <p>
                                <span className="font-medium">Your answer:</span>{" "}
                                {Array.isArray(userAnswer) ? userAnswer.join(", ") : userAnswer}
                              </p>

                              {/* Correct answer should be fetched from submittedAnswers if available, otherwise from question */}
                              {(() => {
                                const submittedAns = submittedAnswers.find((sa) => sa.question_id === question.id)
                                const correctAnswer = submittedAns?.correct_answer || question.correct_answer
                                if (
                                  correctAnswer !== null &&
                                  correctAnswer !== undefined &&
                                  correctAnswer !== "" &&
                                  question.type !== "essay" &&
                                  question.type !== "short_answer"
                                ) {
                                  return (
                                    <p>
                                      <span className="font-medium">Correct answer:</span>{" "}
                                      {Array.isArray(correctAnswer) ? correctAnswer.join(", ") : correctAnswer}
                                    </p>
                                  )
                                }
                                return null
                              })()}

                              <p
                                className={`font-medium ${question.type === "essay" || question.type === "short_answer" || question.type === "ESSAY" || question.type === "SHORT_ANSWER" ? "text-gray-600" : isCorrect ? "text-green-600" : "text-red-600"}`}
                              >
                                {question.type === "essay" ||
                                  question.type === "short_answer" ||
                                  question.type === "ESSAY" ||
                                  question.type === "SHORT_ANSWER"
                                  ? "Graded"
                                  : isCorrect
                                    ? "✓ Correct"
                                    : "✗ Incorrect"}{" "}
                                ({pointsEarned || 0} / {question.points} points)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSavedAnswerReview = () => {
    if (!questions || questions.length === 0) {
      return <div className="text-center text-muted-foreground">Loading assessment details...</div>
    }

    return (
      <div className="space-y-6">
        {questions.map((question, index) => {
          const savedAnswer = submittedAnswers.find((answer: SavedAnswer) => answer.question_id === question.id)

          return (
            <Card key={question.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-base">Question {index + 1}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">{question.question}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {savedAnswer ? (
                  <>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Your Answer:</p>
                        {/* Render answer based on type */}
                        {question.type === "matching" ? (
                          (() => {
                            try {
                              const parsedAnswer = JSON.parse(savedAnswer.answer as string)
                              const matchedPairs = Object.entries(parsedAnswer)
                                .map(([index, value]) => {
                                  const pair = question.pairs?.[Number.parseInt(index)]
                                  return pair ? `${pair.left} -> ${value}` : `${index} -> ${value}`
                                })
                                .join(", ")
                              return <p className="text-sm mt-1">{matchedPairs || "No match selected"}</p>
                            } catch (e) {
                              console.error("Error parsing matching answer:", e)
                              return <p className="text-sm mt-1">Error displaying answer</p>
                            }
                          })()
                        ) : Array.isArray(savedAnswer.answer) ? (
                          <p className="text-sm mt-1">{savedAnswer.answer.join(", ")}</p>
                        ) : (
                          <p className="text-sm mt-1">{savedAnswer.answer}</p>
                        )}
                      </div>
                      {savedAnswer.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />
                      )}
                    </div>

                    {!savedAnswer.is_correct && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Correct Answer:</p>
                          {/* Render correct answer based on type */}
                          {question.type === "matching" ? (
                            (() => {
                              const correctAnswerPairs = question.pairs
                                ?.map((pair) => `${pair.left} -> ${pair.right}`)
                                .join(", ")
                              return <p className="text-sm mt-1">{correctAnswerPairs || "N/A"}</p>
                            })()
                          ) : Array.isArray(question.correct_answer) ? (
                            <p className="text-sm mt-1">{question.correct_answer.join(", ")}</p>
                          ) : (
                            <p className="text-sm mt-1">{question.correct_answer}</p>
                          )}
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Your Answer:</p>
                      <p className="text-sm mt-1">Not answered</p>
                    </div>
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {savedAnswer ? (
                    <span className={savedAnswer.is_correct ? "text-green-600" : "text-red-600"}>
                      {savedAnswer.points_earned}/{question.points} points
                    </span>
                  ) : (
                    <span>0/{question.points} points</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  if (isSubmitted) {
    const displayScore = score
    const displayPassed = score >= assessment.passing_score

    const requiresManualGrading =
      questions.some(
        (q) => q.type === "short_answer" || q.type === "essay" || q.type === "SHORT_ANSWER" || q.type === "ESSAY",
      ) || false

    if (requiresManualGrading) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <Pssnt onComplete={(score, passed) => onComplete(score, passed)} />
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Clock className="w-16 h-16 text-blue-500" />
              </div>
              <CardTitle className="text-2xl">Assessment Submitted</CardTitle>
              <p className="text-muted-foreground">{assessment.title}</p>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Pending Instructor Review
                </h3>
                <p className="text-blue-700 dark:text-blue-300">
                  Your assessment has been submitted successfully and is awaiting manual grading by your instructor.
                  You'll be notified once your assessment has been graded.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">Questions Answered</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{new Date().toLocaleDateString()}</div>
                  <div className="text-sm text-muted-foreground">Submitted On</div>
                </div>
              </div>

              {assessment.fileRequired && uploadedFileUrl && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-700 dark:text-green-300">
                      File uploaded successfully:{" "}
                      <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        {uploadedFileUrl.substring(uploadedFileUrl.lastIndexOf("/") + 1)}
                      </a>
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">What happens next?</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Your instructor will review your answers</li>
                      <li>• Once graded, you can proceed to the next lesson</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {displayPassed ? (
                <CheckCircle className="w-16 h-16 text-green-500" />
              ) : (
                <AlertCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">{displayPassed ? "Congratulations!" : "Assessment Complete"}</CardTitle>
            <p className="text-muted-foreground">{assessment.title}</p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">{displayScore}%</div>
                <div className="text-sm text-muted-foreground">Your Score</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{assessment.passing_score}%</div>
                <div className="text-sm text-muted-foreground">Passing Score</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
            </div>

            {displayPassed ? (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Great job! You've passed this assessment. You can now proceed to the next step.
                </p>

                <Button
                  size="sm"
                  onClick={handleComplete}
                  className="flex items-center gap-2 mt-4"
                  disabled={isStepping || !passed}
                >
                  {isStepping ? "Loading..." : "Next"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <p className="text-red-700 dark:text-red-300 font-medium">
                    You need {assessment.passing_score}% to pass. You can review your answers and retake this
                    assessment.
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowReview(!showReview)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showReview ? "Hide Review" : "Review Answers"}
                  </Button>
                  <Button onClick={handleRetake} className="flex items-center gap-2" disabled={isStepping}>
                    <RotateCcw className="w-4 h-4" />
                    {isStepping ? "Retaking..." : "Retake Assessment"}
                  </Button>
                </div>
              </div>
            )}

            {(showReview || displayPassed) && (
              <div className="mt-8 text-left space-y-6">
                <h3 className="text-lg font-semibold">{displayPassed ? "Assessment Review" : "Review Your Answers"}</h3>

                {/* Display all questions from savedAnswers */}
                {savedAnswers.length > 0 ? (
                  <div className="space-y-6">
                    {savedAnswers.map((answer: any, index: number) => {
                      // Use question data from backend response
                      const questionText = answer.question?.text ||
                        answer.question?.question_text ||
                        `Question ${index + 1}`;

                      const questionType = answer.question?.type ||
                        answer.question?.question_type ||
                        "MULTIPLE_CHOICE";

                      return (
                        <Card key={answer.answer_id || `answer-${index}`} className="overflow-hidden">
                          <CardContent className="p-6">
                            {/* Question Number and Status */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${answer.is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}
                                >
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-base">{questionText}</h4>
                                  <div className="flex items-center gap-2 mt-2">
                                    {answer.is_correct ? (
                                      <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                                        <CheckCircle className="w-4 h-4" />
                                        Correct
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-sm font-medium text-red-600">
                                        <AlertCircle className="w-4 h-4" />
                                        Incorrect
                                      </span>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      ({answer.points_earned} / {answer.points_possible} points)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Display options for multiple choice questions */}
                            {questionType === "MULTIPLE_CHOICE" && answer.question?.options && (
                              <div className="space-y-2 mb-4">
                                <p className="text-sm text-muted-foreground font-medium mb-3">Options:</p>
                                {answer.question.options.map((option: string, optIndex: number) => {
                                  const isUserAnswer = option === answer.user_answer
                                  const isCorrectOption = option === answer.question.correct_answer

                                  return (
                                    <div
                                      key={optIndex}
                                      className={`p-3 border-2 rounded-lg transition-colors ${isCorrectOption
                                          ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                                          : isUserAnswer && !answer.is_correct
                                            ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                                            : "border-gray-200 bg-gray-50 dark:bg-gray-950/20"
                                        }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center flex-shrink-0">
                                          {isCorrectOption && <CheckCircle className="w-5 h-5 text-green-600" />}
                                          {isUserAnswer && !answer.is_correct && (
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                          )}
                                          {!isCorrectOption && !isUserAnswer && (
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">{option}</p>
                                          {isCorrectOption && (
                                            <span className="text-xs text-green-600 font-semibold">Correct Answer</span>
                                          )}
                                          {isUserAnswer && !answer.is_correct && (
                                            <span className="text-xs text-red-600 font-semibold">Your Answer</span>
                                          )}
                                          {isUserAnswer && answer.is_correct && (
                                            <span className="text-xs text-green-600 font-semibold">
                                              Your Answer (Correct)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* User's Answer */}
                            <div className="border-t pt-4">
                              <p className="text-sm text-muted-foreground font-medium mb-2">Your Answer:</p>
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium">{answer.user_answer || "Not answered"}</p>
                              </div>
                            </div>

                            {/* Correct Answer (if wrong) */}
                            {!answer.is_correct && answer.question?.correct_answer && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground font-medium mb-2">Correct Answer:</p>
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                    {answer.question.correct_answer}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            {answer.question?.explanation && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground font-medium mb-2">Explanation:</p>
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                                  <p className="text-sm text-blue-900 dark:text-blue-100">
                                    {answer.question.explanation}
                                  </p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No answers available</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (totalQuestions === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Pssnt onComplete={(score, passed) => onComplete(score, passed)} />
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No questions available for this assessment.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100
  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswerValue = answers[currentQuestion?.id] || ""

  const renderQuestion = (currentQuestion: Question, index: number) => {
    const questionType = (currentQuestion.type || "").toLowerCase()

    return (
      <div key={currentQuestion.id}>
        <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>

        {questionType === "multiple_choice" && (
          <>
            <RadioGroup
              value={currentAnswerValue as string}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </>
        )}

        {questionType === "checkboxes" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">Select all that apply</p>
            {currentQuestion.options.map((option, index) => {
              const currentAnswers = Array.isArray(currentAnswerValue) ? currentAnswerValue : []
              return (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id={`checkbox-${index}`}
                    checked={currentAnswers.includes(option)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleAnswerChange(currentQuestion.id, [...currentAnswers, option])
                      } else {
                        handleAnswerChange(
                          currentQuestion.id,
                          currentAnswers.filter((a) => a !== option),
                        )
                      }
                    }}
                  />
                  <Label htmlFor={`checkbox-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              )
            })}
          </div>
        )}

        {questionType === "true_false" && (
          <RadioGroup
            value={currentAnswerValue as string}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="flex-1 cursor-pointer">
                True
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="flex-1 cursor-pointer">
                False
              </Label>
            </div>
          </RadioGroup>
        )}

        {(questionType === "essay" || questionType === "short_answer") && (
          <Textarea
            placeholder="Type your answer here..."
            value={currentAnswerValue as string}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            className={questionType === "essay" ? "min-h-32" : "min-h-20"}
          />
        )}

        {questionType === "matching" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-3">
              Match each item on the left with the correct item on the right
            </p>
            <div className="space-y-3">
              {currentQuestion.pairs?.map((pair, pairIdx) => (
                <div key={pair.id} className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-2 block">{pair.left}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">matches with</span>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={(answers[`${currentQuestion.id}-match-${pairIdx}`] as string) || ""}
                        onValueChange={(value) => {
                          const newAnswers = { ...answers }
                          newAnswers[`${currentQuestion.id}-match-${pairIdx}`] = value
                          setAnswers(newAnswers)
                        }}
                        disabled={isSubmitted}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select match..." />
                        </SelectTrigger>
                        <SelectContent>
                          {scrambledMatchingPairs[currentQuestion.id]?.map((scrambledPair) => (
                            <SelectItem key={scrambledPair.id} value={scrambledPair.right}>
                              {scrambledPair.right}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Pssnt onComplete={(score, passed) => onComplete(score, passed)} />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-primary" />
              <div className="mb-4">
                <CardTitle className="text-2xl">{assessment.title}</CardTitle>
                <p className={`text-sm text-muted-foreground mt-1 ${expanded ? "" : "line-clamp-3"}`}>
                  {assessment.description}
                </p>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-sm text-primary hover:underline self-start"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Badge
                variant="outline"
                className={`flex items-center gap-1 ${timeRemaining <= 300 ? "text-red-600 border-red-200" : ""}`}
              >
                <Clock className="w-3 h-3" />
                {formatTime(timeRemaining)}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderQuestion(currentQuestion, currentQuestionIndex)}

          <div className="flex items-center justify-between pt-6 border-t">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              {currentQuestion.points} point{currentQuestion.points !== 1 ? "s" : ""}
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={loading}>{loading ? "Submitting..." : "Submit Assessment"}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Submit Assessment?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit your assessment? Once submitted, you cannot change your answers.
                      {assessment.passing_score > 0 && (
                        <span className="block mt-2 font-medium">
                          You need {assessment.passing_score}% to pass this assessment.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Review Answers</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>Yes, Submit Assessment</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={handleNext}>Next Question</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
