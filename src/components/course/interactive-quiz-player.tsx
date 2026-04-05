"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Trophy,
  Target,
  Star,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Zap,
  Brain,
  Lightbulb,
  AlertCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Assessment, QuestionType } from "@/types"

interface InteractiveQuizPlayerProps {
  assessment: Assessment
  onComplete?: (score: number, passed: boolean, answers: Record<string, string>) => void
  onClose?: () => void
  isPreview?: boolean
}

export function InteractiveQuizPlayer({
  assessment,
  onComplete,
  onClose,
  isPreview = false,
}: InteractiveQuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(assessment.time_limit_minutes ? assessment.time_limit_minutes * 60 : 0)
  const [isStarted, setIsStarted] = useState(false)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const currentQuestion = assessment.questions?.[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / (assessment.questions?.length || 1)) * 100
  const totalPossiblePoints = assessment.questions?.reduce((acc, q) => acc + q.points, 0) || 0

  // Timer effect
  useEffect(() => {
    if (isStarted && timeRemaining > 0 && !showResults && !submitted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isStarted, timeRemaining, showResults, submitted])

  const handleStart = () => {
    setIsStarted(true)
  }

  const handleAnswerSelect = (questionId: string, answer: string) => {
    if (!submitted) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }))
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < (assessment.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setShowExplanation(null)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setShowExplanation(null)
    }
  }

  const handleSubmit = () => {
    if (submitted) return

    let correctCount = 0
    let earnedPoints = 0
    let currentStreak = 0
    let maxStreak = 0

    assessment.questions?.forEach((question) => {
      const userAnswer = answers[question.id]
      const isCorrect = userAnswer === question.correct_answer

      if (isCorrect) {
        correctCount++
        earnedPoints += question.points
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    })

    const score = assessment.questions?.length 
      ? (correctCount / assessment.questions.length) * 100 
      : 0
    const passed = score >= (assessment.passing_score || 70)

    setStreak(maxStreak)
    setTotalPoints(earnedPoints)
    setShowResults(true)
    setSubmitted(true)
    onComplete?.(score, passed, answers)
  }

  const handleRetake = () => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    setShowResults(false)
    setTimeRemaining(assessment.time_limit_minutes ? assessment.time_limit_minutes * 60 : 0)
    setIsStarted(false)
    setShowExplanation(null)
    setStreak(0)
    setTotalPoints(0)
    setSubmitted(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success"
    if (score >= 70) return "text-primary"
    if (score >= 50) return "text-warning"
    return "text-destructive"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 95) return { text: "Perfect!", color: "bg-primary/100", icon: Trophy }
    if (score >= 90) return { text: "Excellent!", color: "bg-success/100", icon: Star }
    if (score >= 80) return { text: "Great Job!", color: "bg-primary", icon: Target }
    if (score >= 70) return { text: "Good Work!", color: "bg-warning/100", icon: Lightbulb }
    return { text: "Keep Trying!", color: "bg-muted/500", icon: Brain }
  }

  // Pre-start screen
  if (!isStarted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{assessment.title}</CardTitle>
          <CardDescription className="text-lg">{assessment.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assessment Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <Target className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{assessment.questions?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Trophy className="w-6 h-6 text-warning mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalPossiblePoints}</div>
              <div className="text-sm text-muted-foreground">Points</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{assessment.time_limit_minutes ? `${assessment.time_limit_minutes}m` : "∞"}</div>
              <div className="text-sm text-muted-foreground">Time Limit</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold">{assessment.passing_score || 70}%</div>
              <div className="text-sm text-muted-foreground">To Pass</div>
            </div>
          </div>

          {/* Instructions */}
          <Card className="bg-primary/10 dark:bg-primary/20/20 border-primary/30 dark:border-primary/30">
            <CardContent className="p-4">
              <h3 className="font-medium text-primary dark:text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Instructions
              </h3>
              <ul className="text-sm text-primary dark:text-primary space-y-2">
                <li>• Read each question carefully before selecting your answer</li>
                <li>• You can navigate between questions using the Previous/Next buttons</li>
                <li>• Your answers are automatically saved as you progress</li>
                {assessment.time_limit_minutes && <li>• You have {assessment.time_limit_minutes} minutes to complete this assessment</li>}
                <li>• You need {assessment.passing_score || 70}% to pass this assessment</li>
                <li>• Click "Submit" when you're ready to see your results</li>
              </ul>
            </CardContent>
          </Card>

          {/* Start Button */}
          <div className="text-center">
            <Button onClick={handleStart} size="lg" className="px-8">
              <Zap className="w-5 h-5 mr-2" />
              Start Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Results screen
  if (showResults) {
    const correctAnswers = assessment.questions?.filter(
      (question) => answers[question.id] === question.correct_answer,
    ).length || 0
    const score = assessment.questions?.length 
      ? (correctAnswers / assessment.questions.length) * 100 
      : 0
    const passed = score >= (assessment.passing_score || 70)
    const scoreBadge = getScoreBadge(score)

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto"
      >
        <Card>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                passed ? "bg-success/15" : "bg-destructive/15"
              }`}
            >
              {passed ? (
                <Trophy className="w-10 h-10 text-success" />
              ) : (
                <XCircle className="w-10 h-10 text-destructive" />
              )}
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <CardTitle className={`text-3xl mb-2 ${passed ? "text-success" : "text-destructive"}`}>
                {passed ? "Congratulations!" : "Keep Learning!"}
              </CardTitle>
              <CardDescription className="text-lg">
                You scored {score.toFixed(1)}% ({correctAnswers} out of {assessment.questions?.length || 0} correct)
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score Display */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className={`text-6xl font-bold mb-4 ${getScoreColor(score)}`}>{score.toFixed(1)}%</div>
              <Progress value={score} className="w-full max-w-md mx-auto mb-4" />
              <Badge className={`${scoreBadge.color} text-white text-lg px-4 py-2`}>
                <scoreBadge.icon className="w-5 h-5 mr-2" />
                {scoreBadge.text}
              </Badge>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-success">{correctAnswers}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-destructive">{(assessment.questions?.length || 0) - correctAnswers}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{totalPoints}</div>
                <div className="text-sm text-muted-foreground">Points Earned</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{streak}</div>
                <div className="text-sm text-muted-foreground">Best Streak</div>
              </Card>
            </motion.div>

            {/* Achievement */}
            {passed && !isPreview && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center p-6 bg-success/10 dark:bg-success/20/20 rounded-lg border border-success/30 dark:border-success/30"
              >
                <Award className="w-12 h-12 text-success mx-auto mb-4" />
                <h3 className="text-xl font-bold text-success dark:text-success mb-2">
                  Assessment Completed Successfully!
                </h3>
                <p className="text-success dark:text-success mb-4">
                  You've earned {totalPoints} points and unlocked the next lesson!
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium">+{totalPoints} XP</span>
                </div>
              </motion.div>
            )}

            {/* Preview Notice */}
            {isPreview && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center p-6 bg-primary/10 dark:bg-primary/20/20 rounded-lg border border-primary/30 dark:border-primary/30"
              >
                <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-primary dark:text-primary mb-2">
                  Assessment Preview
                </h3>
                <p className="text-primary dark:text-primary mb-4">
                  This is a preview of how students will experience your assessment.
                </p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex gap-4 justify-center"
            >
              <Button onClick={handleRetake} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Assessment
              </Button>
              {passed && onClose && !isPreview && (
                <Button onClick={onClose}>
                  Continue Learning
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {isPreview && onClose && (
                <Button onClick={onClose} variant="outline">
                  Back to Editor
                  <ArrowLeft className="w-4 h-4 ml-2" />
                </Button>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Quiz interface
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                {assessment.title}
              </CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {assessment.questions?.length || 0}
              </CardDescription>
            </div>
            {assessment.time_limit_minutes && (
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${timeRemaining < 300 ? "text-destructive" : "text-muted-foreground"}`} />
                <span className={`font-mono text-lg ${timeRemaining < 300 ? "text-destructive" : ""}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{progress.toFixed(0)}% Complete</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardHeader>
      </Card>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl leading-relaxed">{currentQuestion?.question_text}</CardTitle>
                <Badge variant="outline" className="ml-4 flex-shrink-0">
                  {currentQuestion?.points || 1} pt{currentQuestion?.points !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Multiple Choice */}
              {currentQuestion?.question_type === "MULTIPLE_CHOICE" && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options?.map((option, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base">
                        {option}
                      </Label>
                    </motion.div>
                  ))}
                </RadioGroup>
              )}

              {/* True/False */}
              {currentQuestion?.question_type === "TRUE_FALSE" && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                  className="flex gap-6 justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="cursor-pointer text-lg font-medium">
                      True
                    </Label>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="cursor-pointer text-lg font-medium">
                      False
                    </Label>
                  </motion.div>
                </RadioGroup>
              )}

              {/* Short Answer / Essay */}
              {(currentQuestion?.question_type === "SHORT_ANSWER" || currentQuestion?.question_type === "ESSAY") && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Textarea
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    placeholder="Enter your answer..."
                    rows={currentQuestion.question_type === "ESSAY" ? 8 : 4}
                    className="resize-none text-base"
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {/* Question Indicators */}
            <div className="flex items-center gap-2">
              {assessment.questions?.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === currentQuestionIndex
                      ? "bg-primary text-primary-foreground"
                      : answers[assessment.questions![index].id]
                        ? "bg-success/100 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!answers[currentQuestion?.id || ""]}
              className={
                currentQuestionIndex === (assessment.questions?.length || 0) - 1 ? "bg-success hover:bg-success" : ""
              }
            >
              {currentQuestionIndex === (assessment.questions?.length || 0) - 1 ? (
                <>
                  Submit Assessment
                  <CheckCircle className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}