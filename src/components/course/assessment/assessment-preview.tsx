"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Target, CheckCircle, X, Trophy } from "lucide-react"
import type { Assessment } from "@/types"

interface AssessmentPreviewProps {
  assessment: Assessment
  isInstructor?: boolean
}

export function AssessmentPreview({ assessment, isInstructor = false }: AssessmentPreviewProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)

  const totalPoints = assessment.questions?.reduce((acc, q) => acc + q.points, 0) || 0

  const handleSubmit = () => {
    setShowResults(true)
  }

  const renderQuestion = (question: any, index: number) => {
    const questionId = question.id || `question-${index}`
    const userAnswer = answers[questionId]

    return (
      <Card key={questionId} className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground dark:text-white">
              {index + 1}. {question.question_text}
            </h3>
            <Badge variant="outline" className="ml-2">
              {question.points} pt{question.points !== 1 ? "s" : ""}
            </Badge>
          </div>

          {question.question_type === "MULTIPLE_CHOICE" && (
            <RadioGroup
              value={userAnswer}
              onValueChange={(value) => setAnswers({ ...answers, [questionId]: value })}
              className="space-y-2"
            >
              {question.options?.map((option: string, optionIndex: number) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${questionId}-${optionIndex}`} />
                  <Label htmlFor={`${questionId}-${optionIndex}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                  {showResults && isInstructor && (
                    <div className="ml-2">
                      {option === question.correct_answer ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : userAnswer === option ? (
                        <X className="w-5 h-5 text-destructive" />
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === "TRUE_FALSE" && (
            <RadioGroup
              value={userAnswer}
              onValueChange={(value) => setAnswers({ ...answers, [questionId]: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`${questionId}-true`} />
                <Label htmlFor={`${questionId}-true`} className="cursor-pointer">
                  True
                </Label>
                {showResults && isInstructor && question.correct_answer === "true" && (
                  <CheckCircle className="w-5 h-5 text-success" />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${questionId}-false`} />
                <Label htmlFor={`${questionId}-false`} className="cursor-pointer">
                  False
                </Label>
                {showResults && isInstructor && question.correct_answer === "false" && (
                  <CheckCircle className="w-5 h-5 text-success" />
                )}
              </div>
            </RadioGroup>
          )}

          {(question.question_type === "SHORT_ANSWER" || question.question_type === "ESSAY") && (
            <Textarea
              value={userAnswer || ""}
              onChange={(e) => setAnswers({ ...answers, [questionId]: e.target.value })}
              placeholder="Enter your answer..."
              rows={question.question_type === "ESSAY" ? 6 : 3}
              className="resize-none"
            />
          )}

          {showResults && isInstructor && userAnswer === question.correct_answer && (
            <div className="mt-3 p-3 bg-success/10 dark:bg-success/20/20 border border-success/30 dark:border-success/30 rounded-lg">
              <div className="flex items-center gap-2 text-success dark:text-success">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Correct! +{question.points} points</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Assessment Header */}
      <div className="text-center pb-6 border-b">
        <h1 className="text-2xl font-bold text-foreground dark:text-white mb-2">{assessment.title}</h1>
        {assessment.description && <p className="text-muted-foreground dark:text-muted-foreground mb-4">{assessment.description}</p>}
        <div className="flex justify-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            {assessment.questions?.length || 0} Questions
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            {totalPoints} Points
          </Badge>
          {assessment.time_limit_minutes && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {assessment.time_limit_minutes} min
            </Badge>
          )}
          <Badge variant="outline">{assessment.passing_score || 70}% to pass</Badge>
        </div>
      </div>

      {/* Instructions */}
      {!showResults && (
        <Card className="bg-primary/10 dark:bg-primary/20/20 border-primary/30 dark:border-primary/30">
          <CardContent className="p-4">
            <h3 className="font-medium text-primary dark:text-primary mb-2">Instructions</h3>
            <ul className="text-sm text-primary dark:text-primary space-y-1">
              <li>• Answer all questions to the best of your ability</li>
              <li>• You can change your answers before submitting</li>
              {assessment.time_limit_minutes && (
                <li>• You have {assessment.time_limit_minutes} minutes to complete this assessment</li>
              )}
              <li>• You need {assessment.passing_score || 70}% to pass</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {assessment.questions?.map((question, index) => renderQuestion(question, index))}
      </div>

      {/* Submit Button */}
      {!showResults ? (
        <div className="text-center pt-6 border-t">
          <Button onClick={handleSubmit} size="lg" className="px-8">
            Submit Assessment
          </Button>
        </div>
      ) : (
        <Card className="bg-success/10 dark:bg-success/20/20 border-success/30 dark:border-success/30">
          <CardContent className="p-6 text-center">
            <Trophy className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-success dark:text-success mb-2">
              {isInstructor ? "Assessment Preview Complete!" : "Assessment Complete!"}
            </h3>
            <p className="text-success dark:text-success">
              {isInstructor
                ? "This is a preview of how students will experience your assessment."
                : "Your assessment has been submitted successfully."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}