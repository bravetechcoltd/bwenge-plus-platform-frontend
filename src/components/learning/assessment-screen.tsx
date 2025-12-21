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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle, Clock, Award, AlertCircle, FileText, RotateCcw, Eye,
  AlertTriangle, Play, ChevronRight, X, ShieldCheck, Loader2, XCircle, Info,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import { Pssnt } from "../weblack/pssnt"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"

interface MatchingPair { id: string; left: string; right: string }

interface Question {
  id: string; question: string
  type: "multiple_choice" | "true_false" | "essay" | "short_answer" | "matching" | "checkboxes" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "SHORT_ANSWER"
  options: string[]; correct_answer: string | string[]; points: number
  pairs?: MatchingPair[]; order_index?: number; question_text?: string; question_type?: string; answer?: string | string[]
}

interface Assessment {
  id: string; title: string; description: string
  type: "quiz" | "assignment" | "project" | "assessment" | "QUIZ" | "EXAM"
  passing_score: number; time_limit_minutes: number; questions?: Question[]
  created_at: string; updated_at: string; fileRequired?: boolean; instructions?: string
  max_attempts?: number; course_id?: string; lesson_id?: string; module_id?: string
  is_final_assessment?: boolean; quizzes?: any[]
}

interface SavedAnswer {
  id: string; question_id: string; answer: string | string[]; is_correct: boolean
  points_earned: number; assessment_id: string; attempt_number: number; is_final_submission: boolean
  created_at: string; question?: Question; user_answer?: string | string[]; points_possible?: number
  explanation?: string; instructor_feedback?: string; correct_answer?: string | string[]; is_graded?: boolean
}

interface AssessmentScreenProps {
  assessment: Assessment; onComplete: (score: number, passed: boolean) => void; onPending: () => void
  isCompleted: boolean; previousScore?: number; previousPassed?: boolean; isStepping?: boolean
  onClose: () => void; isPending?: boolean; isFailed?: boolean; refetch?: () => void
  markStepPending?: boolean; progressData?: any
}

export function AssessmentScreen({
  assessment, onComplete, onPending, isCompleted, previousScore, previousPassed,
  isStepping, onClose, isPending, isFailed, refetch, markStepPending, progressData,
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
  const [requiresManualGrading, setRequiresManualGrading] = useState(false)

  // assessmentStatus drives the main render branch:
  //   null            = not started
  //   "pending"       = submitted, awaiting instructor grading
  //   "graded_failed" = graded, score < passing → ALWAYS show Retake (unlimited)
  //   "completed"     = passed
  const [assessmentStatus, setAssessmentStatus] = useState<null | "pending" | "graded_failed" | "completed">(null)
  const [submissionDate, setSubmissionDate] = useState<string | null>(null)
  // attemptNumber is informational only — NEVER gates retakes
  const [attemptNumber, setAttemptNumber] = useState<number>(0)

  const hasStartedRef = useRef(false)
  const { token, user } = useAuth()
  const router = useRouter()

  const getQuestions = (): Question[] => {
    if (assessment.questions && assessment.questions.length > 0) return assessment.questions
    if (assessment.quizzes && assessment.quizzes.length > 0) {
      const quiz = assessment.quizzes[0]
      if (quiz.questions && quiz.questions.length > 0) {
        return quiz.questions.map((q: any) => ({
          id: q.id || `question-${Math.random()}`, question: q.question_text || q.question || "",
          type: (q.question_type || q.type || "multiple_choice").toLowerCase() as any,
          options: q.options || [], correct_answer: q.correct_answer || "", points: q.points || 1, order_index: q.order_index || 0,
        }))
      }
    }
    return []
  }

  const questions = getQuestions()
  const totalQuestions = questions.length

  useEffect(() => {
    const hasSubjective = questions.some((q) => q.type === "SHORT_ANSWER" || q.type === "ESSAY" || q.type === "short_answer" || q.type === "essay")
    setRequiresManualGrading(hasSubjective)
  }, [questions])

  useEffect(() => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken || !user) router.push("/login")
  }, [token, user, router])

  // Sync from progressData — respects hasStartedRef guard
  useEffect(() => {
    if (hasStartedRef.current) return
    if (!progressData?.completedSteps) { setShowStartModal(true); setTimerStarted(false); return }

    // For final assessments: find by lessonId===null
    // For lesson assessments: find by assessmentId match
    let assessmentStep: any = null
    if (assessment.is_final_assessment) {
      assessmentStep = progressData.completedSteps.find(
        (s: any) => s.type === "assessment" && (s.lessonId === null || s.lessonId === undefined || s.lessonId === ""),
      )
    }
    if (!assessmentStep) {
      assessmentStep = progressData.completedSteps.find(
        (s: any) => s.type === "assessment" && String(s.assessmentId).trim() === String(assessment.id).trim(),
      )
    }

    if (!assessmentStep) {
      setShowStartModal(true); setTimerStarted(false); setIsSubmitted(false)
      setSavedAnswers([]); setSubmittedAnswers([]); setScore(0); setPassed(false)
      setShowReview(false); setAssessmentStatus(null); setSubmissionDate(null); return
    }

    if (assessmentStep.completedAt) setSubmissionDate(assessmentStep.completedAt)
    if (assessmentStep.attempt_number) setAttemptNumber(assessmentStep.attempt_number)

    const scoreVal = assessmentStep.percentage ?? assessmentStep.score ?? 0

    if (assessmentStep.status === "passed" || (assessmentStep.isCompleted === true && scoreVal >= assessment.passing_score)) {
      setScore(scoreVal); setPassed(true); setAssessmentStatus("completed")
      setShowStartModal(false); setIsSubmitted(true); setShowReview(true); fetchSavedAnswers(); return
    }
    if (assessmentStep.status === "failed" || (assessmentStep.isCompleted === true && scoreVal < assessment.passing_score)) {
      setScore(scoreVal); setPassed(false); setAssessmentStatus("graded_failed")
      setShowStartModal(false); setIsSubmitted(true); setShowReview(false); fetchSavedAnswers(); return
    }
    if (assessmentStep.status === "pending" || assessmentStep.isCompleted === false) {
      setScore(scoreVal); setPassed(false); setAssessmentStatus("pending")
      setShowStartModal(false); setIsSubmitted(true); setShowReview(false); fetchSavedAnswers(); return
    }

    setShowStartModal(true); setTimerStarted(false); setIsSubmitted(false); setAssessmentStatus(null)
  }, [assessment.id, assessment.is_final_assessment, progressData, assessment.passing_score])

  useEffect(() => {
    const fetchEnrollment = async () => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken
      if (!currentToken || !user || !assessment.course_id) return
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user/${user.id}`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` } })
        if (response.ok) {
          const data = await response.json()
          const enrollment = data.data?.find((e: any) => e.course_id === assessment.course_id)
          if (enrollment) setEnrollmentId(enrollment.id)
        }
      } catch (error) { console.error("❌ [fetchEnrollment]", error) }
    }
    fetchEnrollment()

    const correctAnswersMap: Record<string, string | string[]> = {}
    const scrambled: Record<string, MatchingPair[]> = {}
    questions.forEach((question) => {
      correctAnswersMap[question.id] = question.correct_answer
      if (question.type === "matching" && question.pairs) {
        const rightItems = [...question.pairs]
        for (let i = rightItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]]
        }
        scrambled[question.id] = rightItems
      }
    })
    setScrambledMatchingPairs(scrambled); setCurrentQuestionIndex(0); setAnswers({})
    setTimeRemaining(assessment.time_limit_minutes * 60); setShowReview(false); setCorrectAnswers(correctAnswersMap || {})
  }, [assessment.id, assessment.time_limit_minutes, token, user, router])

  const fetchSavedAnswers = async () => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken || !user) return
    setLoadingSavedAnswers(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/answers/${assessment.id}/user`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` } })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const answersArray = data.data.answers || []
          const processedAnswers = answersArray.map((answer: any) => ({
            ...answer, id: answer.answer_id || answer.id, question_id: answer.question_id,
            user_answer: answer.user_answer || answer.answer, is_correct: answer.is_correct || false,
            points_earned: answer.points_earned || 0, points_possible: answer.points_possible || answer.question?.points || 1,
            is_graded: answer.is_graded || false, instructor_feedback: answer.instructor_feedback || null,
            question: answer.question ? {
              id: answer.question.id, text: answer.question.text || answer.question.question_text,
              type: answer.question.type || answer.question.question_type, options: answer.question.options || [],
              points: answer.question.points || 1, correct_answer: answer.question.correct_answer,
            } : null,
          }))
          setSavedAnswers(processedAnswers); setSubmittedAnswers(processedAnswers)
          if (data.data.summary) {
            const summary = data.data.summary; const pct = summary.percentage || 0
            const isFullyGraded = summary.is_fully_graded === true; const hasPendingGrading = summary.pending_grading > 0
            const hasPassed = summary.has_passed || pct >= assessment.passing_score
            setScore(pct); setPassed(hasPassed)
            if (isFullyGraded && hasPassed) { setAssessmentStatus("completed"); setShowReview(true) }
            else if (isFullyGraded && !hasPassed) { setAssessmentStatus("graded_failed"); setShowReview(false) }
            else if (hasPendingGrading || summary.is_pending) { setAssessmentStatus("pending"); setShowReview(false) }
            else if (pct >= assessment.passing_score) { setAssessmentStatus("completed"); setShowReview(true) }
            else { setAssessmentStatus("graded_failed"); setShowReview(false) }
            setIsSubmitted(true)
            const currentAttempt = processedAnswers[0]?.attempt_number || 1
            setAttemptNumber(currentAttempt)
          }
        }
      }
    } catch (error) { console.error("❌ [fetchSavedAnswers]", error) }
    finally { setLoadingSavedAnswers(false) }
  }

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  useEffect(() => {
    if (!timerStarted || timeRemaining <= 0 || isSubmitted) return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => { if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(timer)
  }, [timerStarted, timeRemaining, isSubmitted])

  const handleStartAssessment = () => { hasStartedRef.current = true; setShowStartModal(false); setTimerStarted(true); setIsActive(true) }
  const handleNext = () => { if (currentQuestionIndex < totalQuestions - 1) setCurrentQuestionIndex((prev) => prev + 1) }
  const handlePrevious = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex((prev) => prev - 1) }

  const buildQuestionIdMap = (): Map<string, string> => {
    const idMap = new Map<string, string>()
    if (assessment.questions && assessment.quizzes && assessment.quizzes[0]?.questions) {
      const aQs = [...assessment.questions].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      const qQs = [...assessment.quizzes[0].questions].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      aQs.forEach((assessmentQ, index) => { const quizQ = qQs[index]; if (quizQ) idMap.set(assessmentQ.id, quizQ.id) })
    }
    return idMap
  }

  const handleSubmit = async () => {
    const cookieToken = Cookies.get("bwenge_token"); const currentToken = token || cookieToken
    if (!currentToken || !user) { toast({ title: "Authentication Required", description: "Please log in to submit answers", variant: "destructive" }); return }
    const questionIdMap = buildQuestionIdMap(); let earnedPoints = 0; let totalPoints = 0
    const correctAnswersMap: Record<string, string | string[]> = {}
    questions.forEach((question) => {
      totalPoints += question.points; const userAnswer = answers[question.id] || ""
      correctAnswersMap[question.id] = question.correct_answer; const qt = question.type.toLowerCase()
      if (qt === "true_false") { if (userAnswer === question.correct_answer) earnedPoints += question.points }
      else if (qt === "multiple_choice" || qt === "checkboxes") {
        if (Array.isArray(question.correct_answer)) {
          const ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer]; const ca = question.correct_answer
          if (ua.length === ca.length && ua.every((a) => ca.includes(a)) && ca.every((a) => ua.includes(a))) earnedPoints += question.points
        } else { if (userAnswer === question.correct_answer) earnedPoints += question.points }
      } else if (qt === "matching") {
        if (question.pairs && question.pairs.length > 0) {
          let allCorrect = true
          question.pairs.forEach((pair, idx) => { if ((answers[`${question.id}-match-${idx}`] as string) !== pair.right) allCorrect = false })
          if (allCorrect) earnedPoints += question.points
        }
      }
    })
    try {
      setLoading(true)
      const answersToSubmit = questions.map((question) => {
        const mappedId = questionIdMap.get(question.id) || question.id
        if (question.type === "matching") {
          const matchingAnswers: Record<string, string> = {}
          Object.entries(answers).forEach(([key, value]) => { if (key.startsWith(`${question.id}-match-`)) matchingAnswers[key.split("-match-")[1]] = value as string })
          return { question_id: mappedId, answer: JSON.stringify(matchingAnswers) }
        }
        return { question_id: mappedId, answer: Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).join(",") : answers[question.id] || "" }
      })
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/answers/submit`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ assessment_id: assessment.id, answers: answersToSubmit, enrollment_id: enrollmentId, module_id: assessment.module_id, is_final_assessment: assessment.is_final_assessment || false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to submit answers")
      if (data.success && data.data) {
        if (data.data.answers) setSubmittedAnswers(data.data.answers.map((ans: any) => ({ ...ans, user_answer: ans.user_answer || ans.answer, is_graded: ans.is_graded || false })))
        const finalScore = data.data.percentage ? Number.parseFloat(data.data.percentage) : totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
        const finalPassed = data.data.passed !== undefined ? data.data.passed : finalScore >= assessment.passing_score
        setScore(finalScore); setPassed(finalPassed); setSubmissionDate(new Date().toISOString()); setAttemptNumber((prev) => prev + 1)
        if (requiresManualGrading) {
          setIsSubmitted(true); setShowReview(false); setAssessmentStatus("pending"); onPending()
          toast({ title: "Assessment Submitted", description: "Your assessment has been submitted for manual grading." })
          await fetchSavedAnswers()
        } else {
          setCorrectAnswers(correctAnswersMap); setIsSubmitted(true)
          if (finalPassed) {
            setAssessmentStatus("completed")
            await updateProgress(finalScore, true)
            toast({ title: "Assessment Passed!", description: `You scored ${finalScore}% — well done!` })
          } else {
            setAssessmentStatus("graded_failed")
            toast({ title: "Assessment Complete", description: `You scored ${finalScore}%. You need ${assessment.passing_score}% to pass. Retake anytime — no attempt limit.`, variant: "destructive" })
          }
          await fetchSavedAnswers()
        }
      }
    } catch (error: any) {
      console.error("❌ [handleSubmit]", error)
      toast({ title: "Submission Error", description: error.message || "Failed to submit answers.", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const updateProgress = async (score: number, passed: boolean) => {
    const cookieToken = Cookies.get("bwenge_token"); const currentToken = token || cookieToken
    if (!currentToken || !user || !assessment.course_id) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/complete-step`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ courseId: assessment.course_id, userId: user.id, lessonId: assessment.lesson_id, moduleId: assessment.module_id, assessmentId: assessment.id, score, percentage: score, isCompleted: true, passed, time_spent_seconds: assessment.time_limit_minutes * 60 - timeRemaining }),
      })
    } catch (error) { console.error("❌ [updateProgress]", error) }
  }

  const handleComplete = () => onComplete(score, passed)

  // UNLIMITED retakes — no attempt count check ever
  const handleRetake = async () => {
    const cookieToken = Cookies.get("bwenge_token"); const currentToken = token || cookieToken
    if (!currentToken || !user) return
    hasStartedRef.current = false
    setCurrentQuestionIndex(0); setAnswers({}); setTimeRemaining(assessment.time_limit_minutes * 60)
    setIsSubmitted(false); setScore(0); setPassed(false); setShowReview(false)
    setShowStartModal(true); setTimerStarted(false); setAssessmentStatus(null); setSavedAnswers([])
    setLoadingRetake(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/retake-assessment`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ studentId: user.id, assessmentId: assessment.id, userId: user.id, courseId: assessment.course_id, moduleId: assessment.module_id }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) { toast({ title: "Assessment Reset", description: "You can now retake this assessment." }); refetch?.() }
      } else { throw new Error("Failed to retake assessment") }
    } catch (error: any) {
      toast({ title: "Retake Failed", description: error.message || "Failed to reset assessment for retake", variant: "destructive" })
      setAssessmentStatus("graded_failed"); setIsSubmitted(true); setShowStartModal(false)
    } finally { setLoadingRetake(false) }
  }

  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, "0")}` }

  const renderAnswerReview = (answers: SavedAnswer[], showCorrectAnswers: boolean) => (
    <div className="space-y-6">
      {answers.map((answer: any, index: number) => {
        const questionText = answer.question?.text || answer.question?.question_text || ""
        const questionType = answer.question?.type || answer.question?.question_type || "MULTIPLE_CHOICE"
        return (
          <Card key={answer.answer_id || `answer-${index}`} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${answer.is_correct ? "bg-green-100 text-green-700" : answer.is_graded === false ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{index + 1}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">{questionText}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      {answer.is_correct ? <span className="flex items-center gap-1 text-sm font-medium text-green-600"><CheckCircle className="w-4 h-4" /> Correct</span> : answer.is_graded === false ? <span className="flex items-center gap-1 text-sm font-medium text-yellow-600"><Clock className="w-4 h-4" /> Pending Grading</span> : <span className="flex items-center gap-1 text-sm font-medium text-red-600"><AlertCircle className="w-4 h-4" /> Incorrect</span>}
                      <span className="text-sm text-muted-foreground">({answer.points_earned} / {answer.points_possible} points)</span>
                    </div>
                  </div>
                </div>
              </div>
              {questionType === "MULTIPLE_CHOICE" && answer.question?.options && (
                <div className="space-y-2 mb-4">
                  {answer.question.options.map((option: string, optIdx: number) => {
                    const isUserAnswer = option === answer.user_answer
                    const isCorrectOption = option === answer.question.correct_answer
                    const showCorrectOption = showCorrectAnswers && isCorrectOption
                    return (
                      <div key={optIdx} className={`p-3 border-2 rounded-lg ${showCorrectOption ? "border-green-300 bg-green-50 dark:bg-green-950/20" : isUserAnswer && !answer.is_correct ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-gray-200 bg-gray-50 dark:bg-gray-950/20"}`}>
                        <div className="flex items-start gap-3">
                          {showCorrectOption ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" /> : isUserAnswer && !answer.is_correct ? <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{option}</p>
                            {showCorrectOption && <span className="text-xs text-green-600 font-semibold">Correct Answer</span>}
                            {isUserAnswer && !answer.is_correct && <span className="text-xs text-red-600 font-semibold">Your Answer</span>}
                            {isUserAnswer && answer.is_correct && showCorrectAnswers && <span className="text-xs text-green-600 font-semibold">Your Answer (Correct)</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="border-t pt-4"><p className="text-sm text-muted-foreground font-medium mb-2">Your Answer:</p><div className="p-3 bg-muted/50 rounded-lg"><p className="text-sm font-medium">{answer.user_answer || "Not answered"}</p></div></div>
              {showCorrectAnswers && answer.question?.correct_answer && answer.is_graded !== false && (
                <div className="mt-3"><p className="text-sm text-muted-foreground font-medium mb-2">Correct Answer:</p><div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200"><p className="text-sm font-medium text-green-900 dark:text-green-100">{answer.question.correct_answer}</p></div></div>
              )}
              {answer.instructor_feedback && (
                <div className="mt-3"><p className="text-sm text-muted-foreground font-medium mb-2">Instructor Feedback:</p><div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200"><p className="text-sm text-purple-900 dark:text-purple-100">{answer.instructor_feedback}</p></div></div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  // RENDER STATES

  if (loadingSavedAnswers) {
    return <div className="max-w-4xl mx-auto p-6"><Card><CardContent className="flex flex-col items-center justify-center py-16 space-y-4"><Loader2 className="w-12 h-12 animate-spin text-primary" /><p className="text-muted-foreground">Loading your answers...</p></CardContent></Card></div>
  }

  if (assessmentStatus === "pending") {
    const submittedOn = submissionDate ? new Date(submissionDate).toLocaleDateString() : new Date().toLocaleDateString()
    const currentScorePct = score || 0; const gradedCount = savedAnswers.filter((a: any) => a.is_graded || a.instructor_feedback).length
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Pssnt onComplete={(s, p) => onComplete(s, p)} />
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4"><Clock className="w-16 h-16 text-blue-500" /></div>
            <CardTitle className="text-2xl">Assessment Submitted</CardTitle>
            <p className="text-muted-foreground">{assessment.title}</p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Pending Instructor Review</h3>
              <p className="text-blue-700 dark:text-blue-300">Your assessment has been submitted successfully and is awaiting manual grading by your instructor. You'll be notified once your assessment has been graded.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg"><div className="text-2xl font-bold text-primary">{totalQuestions}</div><div className="text-sm text-muted-foreground">Questions Answered</div></div>
              <div className="p-4 border rounded-lg"><div className="text-2xl font-bold text-blue-600">{submittedOn}</div><div className="text-sm text-muted-foreground">Submitted On</div></div>
              <div className="p-4 border rounded-lg"><div className="text-2xl font-bold text-green-600">{Number(currentScorePct).toFixed(2)}%</div><div className="text-sm text-muted-foreground">Current Score</div></div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-left"><p className="font-medium text-amber-800 dark:text-amber-200 mb-1">What happens next?</p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1"><li>• Your instructor will review your answers</li><li>• Once graded, you can proceed to the next lesson/module</li><li>• You'll receive an email notification when grading is complete</li></ul>
                </div>
              </div>
            </div>
            {gradedCount > 0 && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="flex items-start gap-3"><Eye className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="text-left"><p className="font-medium text-purple-800 dark:text-purple-200 mb-1">Previous Attempt</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">You have {gradedCount} graded question{gradedCount !== 1 ? "s" : ""} from previous attempt(s). <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => setShowReview(true)}>Review Answers</Button></p>
                  </div>
                </div>
              </div>
            )}
            {showReview && savedAnswers.length > 0 && (
              <div className="text-left border-t pt-6 space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-semibold text-lg">Previous Answers</h3><Button variant="ghost" size="sm" onClick={() => setShowReview(false)}><X className="w-4 h-4 mr-1" /> Close</Button></div>
                {savedAnswers.map((answer: any, index: number) => (
                  <Card key={answer.answer_id || index} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1"><div className="font-medium mb-1">Question {index + 1}</div><p className="text-sm text-muted-foreground">{answer.question?.text || ""}</p></div>
                        <div className="flex items-center gap-2 ml-4">
                          {answer.is_correct ? <CheckCircle className="w-5 h-5 text-green-500" /> : answer.is_graded ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-yellow-500" />}
                          <span className={`text-sm font-semibold ${answer.is_correct ? "text-green-600" : answer.is_graded ? "text-red-600" : "text-yellow-600"}`}>{answer.points_earned} / {answer.points_possible} pts</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Your answer:</p>
                      <p className={`text-sm ${answer.is_correct ? "text-green-700" : answer.is_graded ? "text-red-700" : "text-yellow-700"}`}>{answer.user_answer || "Not answered"}</p>
                      {answer.instructor_feedback && <div className="p-3 bg-purple-50 rounded text-sm text-purple-900"><p className="font-medium mb-1">Instructor Feedback:</p><p>{answer.instructor_feedback}</p></div>}
                      {!answer.is_graded && !answer.instructor_feedback && <div className="p-3 bg-yellow-50 rounded text-sm text-yellow-800"><p className="font-medium mb-1">Pending Review:</p><p>This answer is awaiting instructor grading.</p></div>}
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

  if (assessmentStatus === "graded_failed") {
    const submittedOn = submissionDate ? new Date(submissionDate).toLocaleDateString() : new Date().toLocaleDateString()
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Pssnt onComplete={(s, p) => onComplete(s, p)} />
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4"><XCircle className="w-16 h-16 text-red-500" /></div>
            <CardTitle className="text-2xl">Assessment Result</CardTitle>
            <p className="text-muted-foreground">{assessment.title}</p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg"><div className="text-2xl font-bold text-red-600">{Number(score).toFixed(2)}%</div><div className="text-sm text-muted-foreground">Your Score</div></div>
              <div className="p-4 border rounded-lg"><div className="text-2xl font-bold text-primary">{assessment.passing_score}%</div><div className="text-sm text-muted-foreground">Required to Pass</div></div>
              <div className="p-4 border rounded-lg"><div className="text-2xl font-bold text-blue-600">{submittedOn}</div><div className="text-sm text-muted-foreground">Submitted On</div></div>
            </div>
            {attemptNumber > 0 && (
              <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />Attempt {attemptNumber} completed — you can retake as many times as needed to pass
              </div>
            )}
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-left"><p className="font-medium text-red-800 dark:text-red-200 mb-1">Below Passing Score — Retake Required to Progress</p><p className="text-sm text-red-700 dark:text-red-300">You scored {Number(score).toFixed(2)}%, below the required {assessment.passing_score}%. Review your answers, then retake. There is no attempt limit.</p></div>
              </div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-left"><p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Cannot Proceed to Next Step</p><p className="text-sm text-amber-700 dark:text-amber-300">You must achieve at least {assessment.passing_score}% to unlock the next lesson/module. Retake as many times as needed — no attempt limit.</p></div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowReview(!showReview)} className="flex items-center gap-2"><Eye className="w-4 h-4" />{showReview ? "Hide Review" : "Review Answers"}</Button>
              <Button onClick={handleRetake} disabled={loadingRetake} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                {loadingRetake ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}Retake Assessment
              </Button>
            </div>
            {showReview && savedAnswers.length > 0 && <div className="mt-8 text-left space-y-6 border-t pt-6"><h3 className="text-lg font-semibold">Review Your Answers</h3>{renderAnswerReview(savedAnswers, false)}</div>}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (assessmentStatus === "completed" || (isSubmitted && !requiresManualGrading && passed)) {
    const displayPassed = passed || previousPassed || false
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="shadow-none border-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">{displayPassed ? <CheckCircle className="w-16 h-16 text-green-500" /> : <AlertCircle className="w-16 h-16 text-red-500" />}</div>
            <CardTitle className="text-2xl">{displayPassed ? "Congratulations!" : "Assessment Complete"}</CardTitle>
            <p className="text-muted-foreground">{assessment.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg"><div className="text-sm text-muted-foreground">Your Score</div><div className="text-3xl font-bold text-primary mt-1">{score || previousScore || 0}%</div></div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg"><div className="text-sm text-muted-foreground">Passing Score</div><div className="text-3xl font-bold text-blue-600 mt-1">{assessment.passing_score}%</div></div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg"><div className="text-sm text-muted-foreground">Questions</div><div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mt-1">{totalQuestions}</div></div>
            </div>
            {displayPassed ? (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-green-700 dark:text-green-300 font-medium">Great job! You've passed this assessment. You can now proceed to the next step.</p>
                <Button size="sm" onClick={handleComplete} className="flex items-center gap-2 mt-4" disabled={isStepping}>{isStepping ? "Loading..." : "Next"}<ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg"><p className="text-red-700 dark:text-red-300 font-medium">You need {assessment.passing_score}% to pass. Review your answers and retake — there is no attempt limit.</p></div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setShowReview(!showReview)} className="flex items-center gap-2"><Eye className="w-4 h-4" />{showReview ? "Hide Review" : "Review Answers"}</Button>
                  <Button onClick={handleRetake} disabled={loadingRetake} className="flex items-center gap-2">{loadingRetake ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}Retake Assessment</Button>
                </div>
              </div>
            )}
            {(showReview || displayPassed) && savedAnswers.length > 0 && <div className="mt-8 text-left space-y-6 border-t pt-6"><h3 className="text-lg font-semibold">{displayPassed ? "Assessment Review" : "Review Your Answers"}</h3>{renderAnswerReview(savedAnswers, displayPassed)}</div>}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showStartModal && !isSubmitted) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Pssnt onComplete={(score, passed) => onComplete(score, passed)} />
        <Dialog open={showStartModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl"><Award className="w-6 h-6 text-primary" />{assessment.title}</DialogTitle>
              <DialogDescription className={`text-base mt-4 transition-all ${expanded ? "" : "line-clamp-3"}`}>{assessment.description}</DialogDescription>
              <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm text-primary hover:underline self-start">{expanded ? "Show less" : "Show more"}</button>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center"><div className="text-2xl font-bold text-primary">{totalQuestions}</div><div className="text-sm text-muted-foreground">Questions</div></div>
                <div className="p-4 border rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{assessment.time_limit_minutes || 0}</div><div className="text-sm text-muted-foreground">Minutes</div></div>
                <div className="p-4 border rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{assessment.passing_score}%</div><div className="text-sm text-muted-foreground">To Pass</div></div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" /><span>Unlimited retakes — attempt as many times as needed to pass.{attemptNumber > 0 && <span className="ml-1 font-medium">(Previous attempts: {attemptNumber})</span>}</span>
              </div>
              {assessment.instructions && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg"><div className="flex items-start gap-3"><FileText className="w-5 h-5 text-blue-600 mt-0.5" /><div><p className="font-medium text-blue-800 dark:text-blue-200">Instructions:</p><ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">{assessment.instructions.split("\n").map((line, index) => <li key={index}>• {line}</li>)}</ul></div></div></div>
              )}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" /><div><p className="font-medium text-amber-800 dark:text-amber-200">Important Instructions:</p><ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1"><li>• Once you begin, the timer will start automatically</li><li>• You cannot pause the assessment once started</li><li>• The assessment will auto-submit when time runs out</li><li>• Make sure you have a stable internet connection</li><li>• You must achieve {assessment.passing_score}% to proceed to the next step</li></ul></div></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleStartAssessment} className="flex items-center gap-2"><Play className="w-4 h-4" />Begin Assessment</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (totalQuestions === 0) {
    return <div className="max-w-4xl mx-auto p-6"><Pssnt onComplete={(s, p) => onComplete(s, p)} /><Card><CardContent className="text-center py-12"><FileText className="w-12 h-12 mx-auto mb-4 opacity-50" /><p className="text-muted-foreground">No questions available for this assessment.</p></CardContent></Card></div>
  }

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100
  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswerValue = answers[currentQuestion?.id] || ""

  const renderQuestion = (q: Question) => {
    const qt = (q.type || "").toLowerCase()
    return (
      <div key={q.id}>
        <h3 className="text-lg font-medium mb-4">{q.question}</h3>
        {qt === "multiple_choice" && (
          <RadioGroup value={currentAnswerValue as string} onValueChange={(v) => handleAnswerChange(q.id, v)}>
            {q.options.map((option, i) => <div key={i} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"><RadioGroupItem value={option} id={`option-${i}`} /><Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer">{option}</Label></div>)}
          </RadioGroup>
        )}
        {qt === "checkboxes" && (
          <div className="space-y-2"><p className="text-sm text-muted-foreground mb-3">Select all that apply</p>
            {q.options.map((option, i) => { const checked = Array.isArray(currentAnswerValue) && currentAnswerValue.includes(option); return <div key={i} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"><Checkbox id={`checkbox-${i}`} checked={checked} onCheckedChange={(isChecked) => { const curr = Array.isArray(currentAnswerValue) ? currentAnswerValue : []; handleAnswerChange(q.id, isChecked ? [...curr, option] : curr.filter((a) => a !== option)) }} /><Label htmlFor={`checkbox-${i}`} className="flex-1 cursor-pointer">{option}</Label></div> })}
          </div>
        )}
        {qt === "true_false" && (
          <RadioGroup value={currentAnswerValue as string} onValueChange={(v) => handleAnswerChange(q.id, v)}>
            {["true", "false"].map((v) => <div key={v} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"><RadioGroupItem value={v} id={v} /><Label htmlFor={v} className="flex-1 cursor-pointer capitalize">{v}</Label></div>)}
          </RadioGroup>
        )}
        {(qt === "essay" || qt === "short_answer") && (
          <Textarea placeholder="Type your answer here..." value={currentAnswerValue as string} onChange={(e) => handleAnswerChange(q.id, e.target.value)} className={qt === "essay" ? "min-h-32" : "min-h-20"} />
        )}
        {qt === "matching" && (
          <div className="space-y-4"><p className="text-sm text-muted-foreground mb-3">Match each item on the left with the correct item on the right</p>
            {q.pairs?.map((pair, pairIdx) => (
              <div key={pair.id} className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="flex-1"><Label className="text-sm font-medium mb-2 block">{pair.left}</Label></div>
                  <span className="text-sm text-muted-foreground">matches with</span>
                  <div className="flex-1">
                    <Select value={(answers[`${q.id}-match-${pairIdx}`] as string) || ""} onValueChange={(value) => setAnswers((prev) => ({ ...prev, [`${q.id}-match-${pairIdx}`]: value }))} disabled={isSubmitted}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{scrambledMatchingPairs[q.id]?.map((sp) => <SelectItem key={sp.id} value={sp.right}>{sp.right}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Pssnt onComplete={(s, p) => onComplete(s, p)} />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-primary" />
              <div className="mb-4">
                <CardTitle className="text-2xl">{assessment.title}</CardTitle>
                <p className={`text-sm text-muted-foreground mt-1 ${expanded ? "" : "line-clamp-3"}`}>{assessment.description}</p>
                <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm text-primary hover:underline self-start">{expanded ? "Show less" : "Show more"}</button>
              </div>
            </div>
            <Badge variant="outline" className={`flex items-center gap-1 ${timeRemaining <= 300 ? "text-red-600 border-red-200" : ""}`}><Clock className="w-3 h-3" />{formatTime(timeRemaining)}</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span>Question {currentQuestionIndex + 1} of {totalQuestions}</span><span>{Math.round(progress)}% Complete</span></div>
            <Progress value={progress} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderQuestion(currentQuestion)}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>Previous</Button>
            <div className="text-sm text-muted-foreground">{currentQuestion.points} point{currentQuestion.points !== 1 ? "s" : ""}</div>
            {currentQuestionIndex === totalQuestions - 1 ? (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button disabled={loading}>{loading ? "Submitting..." : "Submit Assessment"}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" />Submit Assessment?</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to submit? Once submitted, you cannot change your answers.{assessment.passing_score > 0 && <span className="block mt-2 font-medium">You need {assessment.passing_score}% to pass.</span>}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Review Answers</AlertDialogCancel><AlertDialogAction onClick={handleSubmit}>Yes, Submit Assessment</AlertDialogAction></AlertDialogFooter>
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