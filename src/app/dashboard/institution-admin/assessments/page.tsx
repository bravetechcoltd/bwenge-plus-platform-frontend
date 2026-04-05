"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, CheckCircle, XCircle, FileText, User, Calendar, Award, ArrowLeft, TrendingUp, TrendingDown, Check, X, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface PendingSubmission {
  key: string
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  assessment: {
    id: string
    course_id: string
    title: string
    passing_score: number
    questions: Array<{
      id: string
      type: string
      points: number
      question: string
      order_index: number
      correct_answer: string
      options?: string[]
    }>
    course?: {
      id: string
      title: string
    }
    description?: string
    type?: string
    max_attempts?: number
    time_limit_minutes?: number
    is_published?: boolean
    created_at?: string
    updated_at?: string
  }
  answers: Array<{
    id: string
    question_id: string
    answer: string
    selected_option?: string
    is_correct: boolean
    points_earned: number
    is_graded: boolean
    feedback?: string
    created_at: string
    updated_at: string
  }>
  submitted_at: string
}

export default function InstructorAssessmentsPage() {
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null)
  const [gradingAnswers, setGradingAnswers] = useState<Record<string, { pointsEarned: number; feedback: string }>>({})
  const [submittingGrade, setSubmittingGrade] = useState(false)
  const { token, user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingSubmissions()
  }, [])

  const fetchPendingSubmissions = async () => {
    if (!token || !user) return
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/answers/pending-submissions`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setPendingSubmissions(data.data?.submissions || [])
      } else {
        toast({ title: "Error", description: "Failed to load pending assessments", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load pending assessments", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleGradeSubmission = (submission: PendingSubmission) => {
    setSelectedSubmission(submission)
    const initialGrading: Record<string, { pointsEarned: number; feedback: string }> = {}
    
    // Only initialize grading for ungraded subjective questions
    submission.answers.forEach((answer) => {
      const question = submission.assessment.questions.find(q => q.id === answer.question_id)
      if (question && ["SHORT_ANSWER", "ESSAY"].includes(question.type) && !answer.is_graded) {
        initialGrading[answer.question_id] = { pointsEarned: 0, feedback: "" }
      }
    })
    setGradingAnswers(initialGrading)
  }

  const handleSubmitGrade = async () => {
    if (!selectedSubmission || !token) return
    setSubmittingGrade(true)
    try {
      const gradedAnswers = Object.entries(gradingAnswers)
        .map(([questionId, grade]) => {
          const answer = selectedSubmission.answers.find(a => a.question_id === questionId)
          if (!answer) return null
          const question = selectedSubmission.assessment.questions.find(q => q.id === questionId)
          if (!question || !["SHORT_ANSWER", "ESSAY"].includes(question.type)) return null
          return {
            answer_id: answer.id,
            points_earned: grade.pointsEarned,
            feedback: grade.feedback || null
          }
        })
        .filter(item => item !== null)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/answers/grade-manually`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assessment_id: selectedSubmission.assessment.id,
          user_id: selectedSubmission.user.id,
          graded_answers: gradedAnswers
        }),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Assessment graded successfully" })
        setSelectedSubmission(null)
        fetchPendingSubmissions()
      } else {
        throw new Error("Failed to submit grade")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSubmittingGrade(false)
    }
  }

  const updateQuestionGrade = (questionId: string, updates: Partial<{ pointsEarned: number; feedback: string }>) => {
    setGradingAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }))
  }

  const calculateScores = () => {
    if (!selectedSubmission) return { earned: 0, total: 0, percentage: 0, autoGraded: 0, manualGraded: 0, pending: 0 }

    let earnedPoints = 0
    let totalPoints = 0
    let autoGradedPoints = 0
    let manualGradedPoints = 0
    let pendingPoints = 0

    // Get all questions from assessment
    selectedSubmission.assessment.questions.forEach((question) => {
      totalPoints += question.points
      
      // Find corresponding answer
      const answer = selectedSubmission.answers.find(a => a.question_id === question.id)
      
      if (answer) {
        // Check if it's a subjective question that needs manual grading
        if (["SHORT_ANSWER", "ESSAY"].includes(question.type)) {
          // Subjective question
          if (answer.is_graded) {
            // Already graded by instructor
            earnedPoints += answer.points_earned
            manualGradedPoints += answer.points_earned
          } else {
            // Currently being graded - use the points from gradingAnswers state
            const grade = gradingAnswers[question.id]
            if (grade && grade.pointsEarned > 0) {
              earnedPoints += grade.pointsEarned
              manualGradedPoints += grade.pointsEarned
            } else {
              // Not yet graded
              pendingPoints += question.points
            }
          }
        } else {
          // Auto-graded objective question - use points_earned from answer
          earnedPoints += answer.points_earned
          autoGradedPoints += answer.points_earned
        }
      } else {
        // No answer submitted for this question
        if (["MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type)) {
          // Auto-graded question not answered - gets 0 points
          // Don't add to pending - it's already 0 points
        } else {
          // Subjective question not answered
          pendingPoints += question.points
        }
      }
    })

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    return { 
      earned: earnedPoints, 
      total: totalPoints, 
      percentage, 
      autoGraded: autoGradedPoints, 
      manualGraded: manualGradedPoints, 
      pending: pendingPoints 
    }
  }

  const hasGradableQuestions = selectedSubmission?.answers.some((answer) => {
    const question = selectedSubmission.assessment.questions.find(q => q.id === answer.question_id)
    return question && ["ESSAY", "SHORT_ANSWER"].includes(question.type) && !answer.is_graded
  }) ?? false

  // Get all questions including auto-graded ones
  const getAllQuestionsWithAnswers = () => {
    if (!selectedSubmission) return []
    
    return selectedSubmission.assessment.questions.map((question) => {
      const answer = selectedSubmission.answers.find(a => a.question_id === question.id)
      return { question, answer }
    }).sort((a, b) => a.question.order_index - b.question.order_index)
  }

  // Get the student's answer text for auto-graded questions
  const getStudentAnswerForQuestion = (question: any, answer: any) => {
    if (!answer) return "No answer"
    
    if (["MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type)) {
      // For auto-graded questions, show the selected option
      return answer.answer || answer.selected_option || "No answer"
    }
    
    return answer.answer || "No answer"
  }

  // Check if answer is correct for auto-graded questions
  const isAnswerCorrect = (question: any, answer: any) => {
    if (!answer) return false
    
    if (["MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type)) {
      const studentAnswer = answer.answer || answer.selected_option
      const correctAnswer = question.correct_answer
      
      // Normalize both answers for comparison
      const normalize = (str: string) => str?.toString().trim().toLowerCase() || ""
      return normalize(studentAnswer) === normalize(correctAnswer)
    }
    
    return answer.is_correct
  }

  // Get points earned for auto-graded questions
  const getPointsEarned = (question: any, answer: any) => {
    if (!answer) return 0
    
    if (["MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type)) {
      // For auto-graded questions, calculate points based on correctness
      return isAnswerCorrect(question, answer) ? question.points : 0
    }
    
    return answer.points_earned || 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 dark:bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assessments...</p>
        </div>
      </div>
    )
  }

  // Grading View
  if (selectedSubmission) {
    const scores = calculateScores()
    const isPassing = scores.percentage >= selectedSubmission.assessment.passing_score
    const isComplete = scores.pending === 0

    // Get all questions with answers for display
    const allQuestionsWithAnswers = getAllQuestionsWithAnswers()

    return (
      <div className="min-h-screen flex flex-col bg-muted/50 dark:bg-background">
        {/* Smart Compact Header */}
        <header className="bg-card dark:bg-card border-b border-border dark:border-border sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(null)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <div>
                  <h1 className="text-sm font-semibold">Grading Assessment</h1>
                  <p className="text-xs text-muted-foreground">{selectedSubmission.assessment.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Score:</span>
                <span className="text-sm font-bold">{scores.earned}/{scores.total}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
          {/* Student Info Card */}
          <div className="bg-card dark:bg-card rounded-lg shadow-sm border border-border dark:border-border p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Student</p>
                <p className="font-semibold truncate">{selectedSubmission.user.first_name} {selectedSubmission.user.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                <p className="font-semibold">{new Date(selectedSubmission.submitted_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assessment</p>
                <p className="font-semibold truncate">{selectedSubmission.assessment.title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={isComplete ? (isPassing ? "default" : "destructive") : "secondary"} className="text-xs">
                  {isComplete ? (isPassing ? "Will Pass" : "Will Fail") : "Grading..."}
                </Badge>
              </div>
            </div>
          </div>

          {/* Live Score Card */}
          <div className={`rounded-lg shadow-sm border p-4 mb-4 transition-all ${
            isComplete 
              ? (isPassing ? "bg-success/10 dark:bg-success/20/20 border-success/30 dark:border-success/30" : "bg-destructive/10 dark:bg-destructive/20/20 border-destructive/30 dark:border-red-900")
              : "bg-primary/10 dark:bg-primary/20/20 border-primary/30 dark:border-primary/30"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isComplete ? (
                  isPassing ? (
                    <div className="flex items-center gap-2 text-success dark:text-success">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-semibold">PASSED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive dark:text-destructive">
                      <TrendingDown className="w-5 h-5" />
                      <span className="font-semibold">FAILED</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-primary dark:text-primary">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">IN PROGRESS</span>
                  </div>
                )}
                <div className="h-8 w-px bg-secondary dark:bg-secondary"></div>
                <div>
                  <p className="text-2xl font-bold">{scores.percentage}%</p>
                  <p className="text-xs text-muted-foreground">Passing: {selectedSubmission.assessment.passing_score}%</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold text-lg">{scores.earned} / {scores.total} pts</p>
                <div className="flex gap-2 text-xs mt-1">
                  <span className="text-success">Auto: {scores.autoGraded}pts</span>
                  <span className="text-primary">Manual: {scores.manualGraded}pts</span>
                  {scores.pending > 0 && <span className="text-warning">Pending: {scores.pending}pts</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Questions - Show ALL questions including auto-graded ones */}
          <div className="space-y-3">
            {allQuestionsWithAnswers.map(({ question, answer }, index) => {
              const isSubjective = ["SHORT_ANSWER", "ESSAY"].includes(question.type)
              const isAutoGraded = !isSubjective
              const studentAnswer = getStudentAnswerForQuestion(question, answer)
              const isCorrect = isAnswerCorrect(question, answer)
              const pointsEarned = getPointsEarned(question, answer)
              const isAlreadyGraded = answer?.is_graded || false
              const isBeingGraded = isSubjective && gradingAnswers[question.id]
              const currentGrade = gradingAnswers[question.id]

              return (
                <div key={question.id} className="bg-card dark:bg-card rounded-lg shadow-sm border border-border dark:border-border p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium mb-1">{question.question}</p>
                        {isAutoGraded && (
                          <div className="flex items-center gap-1.5">
                            <Badge 
                              variant={isCorrect ? "default" : answer ? "destructive" : "outline"} 
                              className={`text-xs ${
                                isCorrect 
                                  ? 'bg-success/15 text-success dark:bg-success/20 dark:text-success' 
                                  : answer
                                    ? 'bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-destructive'
                                    : 'bg-muted text-foreground dark:bg-card dark:text-muted-foreground'
                              }`}
                            >
                              {isCorrect ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  {pointsEarned} pts
                                </>
                              ) : answer ? (
                                <>
                                  <X className="w-3 h-3 mr-1" />
                                  0 pts
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3 mr-1" />
                                  0 pts
                                </>
                              )}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{question.type.replace('_', ' ')}</Badge>
                        <span>•</span>
                        <span>{question.points} pts</span>
                        {isAutoGraded && answer && (
                          <>
                            <span>•</span>
                            <span className={`font-medium ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-10 space-y-3">
                    {/* Student Answer Section */}
                    <div className="p-3 bg-muted/50 dark:bg-card/50 rounded border border-border dark:border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Student's Answer:</p>
                      <p className={`text-sm ${answer ? '' : 'text-muted-foreground italic'}`}>
                        {studentAnswer}
                      </p>
                      
                      {/* Show correct answer for auto-graded questions */}
                      {isAutoGraded && (
                        <div className="mt-2 pt-2 border-t border-border dark:border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Correct Answer:</p>
                          <p className="text-sm text-success dark:text-success">{question.correct_answer}</p>
                        </div>
                      )}
                    </div>

                    {/* Grading Section - Only for subjective questions that need grading */}
                    {isSubjective && !isAlreadyGraded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs mb-1.5 block">Points</Label>
                          <Input
                            type="number"
                            min="0"
                            max={question.points}
                            value={currentGrade?.pointsEarned || 0}
                            onChange={(e) => updateQuestionGrade(question.id, {
                              pointsEarned: Math.min(Number(e.target.value), question.points),
                            })}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1.5 block">Feedback</Label>
                          <Textarea
                            placeholder="Optional feedback..."
                            value={currentGrade?.feedback || ""}
                            onChange={(e) => updateQuestionGrade(question.id, {
                              feedback: e.target.value,
                            })}
                            rows={2}
                            className="text-sm resize-none h-[50px] focus:ring-0"
                          />
                        </div>
                      </div>
                    )}

                    {/* Already graded subjective questions */}
                    {isSubjective && isAlreadyGraded && answer && (
                      <div className="p-3 bg-primary/10 dark:bg-primary/20/20 rounded border border-primary/30 dark:border-primary/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Already Graded</p>
                            <p className="text-sm">Points: <span className="font-bold">{answer.points_earned} / {question.points}</span></p>
                            {answer.feedback && (
                              <p className="text-xs mt-1 text-muted-foreground">Feedback: {answer.feedback}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
                            Graded
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </main>

        {/* Smart Compact Footer */}
        <footer className="bg-card dark:bg-card border-t border-border dark:border-border sticky bottom-0 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Score: </span>
                  <span className="font-bold text-lg">{scores.percentage}%</span>
                </div>
                <div className="h-6 w-px bg-secondary dark:bg-secondary"></div>
                <div>
                  <span className="text-muted-foreground">Points: </span>
                  <span className="font-semibold">{scores.earned}/{scores.total}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(null)} disabled={submittingGrade}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmitGrade} disabled={submittingGrade || !hasGradableQuestions}>
                  {submittingGrade ? "Submitting..." : "Submit Grade"}
                </Button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // List View
  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Assessment Grading</h1>
          <p className="text-sm text-muted-foreground">Review and grade student submissions</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Pending ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="graded" className="gap-2 text-sm">
              <CheckCircle className="w-4 h-4" />
              Graded
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingSubmissions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">No Pending Assessments</h3>
                  <p className="text-sm text-muted-foreground">All assessments have been graded</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 dark:bg-card border-b">
                        <tr>
                          <th className="text-left p-3 text-xs font-semibold whitespace-nowrap">Student</th>
                          <th className="text-left p-3 text-xs font-semibold whitespace-nowrap">Assessment</th>
                          <th className="text-left p-3 text-xs font-semibold whitespace-nowrap">Submitted</th>
                          <th className="text-left p-3 text-xs font-semibold whitespace-nowrap">Questions</th>
                          <th className="text-left p-3 text-xs font-semibold whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSubmissions.map((submission) => (
                          <tr key={submission.key} className="border-b hover:bg-muted/50 dark:hover:bg-card/50">
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{submission.user.first_name} {submission.user.last_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{submission.user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 whitespace-nowrap max-w-xs">
                              <span className="text-sm truncate block" title={submission.assessment.title}>
                                {submission.assessment.title}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <Badge variant="outline" className="text-xs">
                                {submission.answers.filter(a => !a.is_graded).length}/{submission.answers.length}
                              </Badge>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <Button size="sm" onClick={() => handleGradeSubmission(submission)} className="h-8 text-xs">
                                Grade
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="graded">
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Graded Assessments</h3>
                <p className="text-sm text-muted-foreground">View previously graded assessments</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}