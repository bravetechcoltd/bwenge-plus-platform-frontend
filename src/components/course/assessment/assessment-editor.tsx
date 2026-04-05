// @ts-nocheck

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, GripVertical, Target, X, AlertCircle } from "lucide-react"
import type { Assessment, AssessmentQuestion } from "@/types"
import { generateTempId } from "@/lib/utils"

interface AssessmentEditorProps {
  assessment: Assessment
  onUpdate: (updates: Partial<Assessment>) => void
  onDelete?: () => void
}

export function AssessmentEditor({ assessment, onUpdate }: AssessmentEditorProps) {
  const [activeTab, setActiveTab] = useState("questions")
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({})

  const validateQuestions = () => {
    const errors: Record<number, string> = {}

    assessment.questions?.forEach((question, index) => {
      if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
        if (question.type === "MULTIPLE_CHOICE") {
          const hasCorrectAnswer = Array.isArray(question.correct_answer)
            ? question.correct_answer.length > 0
            : question.correct_answer !== "" && question.correct_answer !== undefined

          if (!hasCorrectAnswer) {
            errors[index] = "Please select at least one correct answer"
          }
        } else if (question.type === "TRUE_FALSE") {
          if (question.correct_answer !== "true" && question.correct_answer !== "false") {
            errors[index] = "Please select the correct answer (True or False)"
          }
        }
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  useEffect(() => {
    validateQuestions()
  }, [assessment.questions])

  const addQuestion = () => {
    const newQuestion: AssessmentQuestion = {
      id: generateTempId(),
      question_text: "",
      question_type: "MULTIPLE_CHOICE",
      options: ["", "", "", ""],
      correct_answer: "",
      points: 1,
      order_index: assessment.questions?.length || 0,
    }
    onUpdate({ questions: [...(assessment.questions || []), newQuestion] })
  }

  const updateQuestion = (index: number, updates: Partial<AssessmentQuestion>) => {
    const updatedQuestions = assessment.questions?.map((q, i) => (i === index ? { ...q, ...updates } : q))
    onUpdate({ questions: updatedQuestions })
  }

  const deleteQuestion = (index: number) => {
    const updatedQuestions = assessment.questions?.filter((_, i) => i !== index)
    onUpdate({ questions: updatedQuestions })
  }

  const renderQuestionEditor = (question: AssessmentQuestion, index: number) => {
    const correctAnswers = Array.isArray(question.correct_answer)
      ? question.correct_answer
      : question.correct_answer
        ? [question.correct_answer]
        : []

    const toggleCorrectAnswer = (option: string) => {
      if (question.question_type === "MULTIPLE_CHOICE") {
        const newCorrectAnswers = correctAnswers.includes(option)
          ? correctAnswers.filter((a) => a !== option)
          : [...correctAnswers, option]
        updateQuestion(index, { correct_answer: newCorrectAnswers.length > 0 ? newCorrectAnswers : "" })
      }
    }

    const addOption = () => {
      const newOptions = [...(question.options || []), ""]
      updateQuestion(index, { options: newOptions })
    }

    const removeOption = (optionIndex: number) => {
      const newOptions = question.options?.filter((_, i) => i !== optionIndex) || []
      const optionToRemove = question.options?.[optionIndex]
      if (optionToRemove && correctAnswers.includes(optionToRemove)) {
        const newCorrectAnswers = correctAnswers.filter((a) => a !== optionToRemove)
        updateQuestion(index, {
          options: newOptions,
          correct_answer: newCorrectAnswers.length > 0 ? newCorrectAnswers : "",
        })
      } else {
        updateQuestion(index, { options: newOptions })
      }
    }

    return (
      <Card key={question.id} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
              <Badge variant="outline" className="text-xs">
                Question {index + 1}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {question.points} pt{question.points !== 1 ? "s" : ""}
              </Badge>
              {validationErrors[index] && (
                <Badge variant="destructive" className="text-xs">
                  Missing Correct Answer
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteQuestion(index)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationErrors[index] && (
            <div className="p-3 bg-destructive/10 dark:bg-destructive/20/20 border border-destructive/30 dark:border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive dark:text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{validationErrors[index]}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label>Question</Label>
              <Textarea
                value={question.question_text}
                onChange={(e) => updateQuestion(index, { question_text: e.target.value })}
                placeholder="Enter your question..."
                rows={2}
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={question.question_type}
                  onValueChange={(value) => updateQuestion(index, { question_type: value as AssessmentQuestion["question_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                    <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                    <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                    <SelectItem value="ESSAY">Essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min="1"
                  value={question.points}
                  onChange={(e) => updateQuestion(index, { points: Number.parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>

          {question.question_type === "MULTIPLE_CHOICE" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Answer Options</Label>
                <span className="text-xs text-muted-foreground">Select one or more correct answers</span>
              </div>
              {question.options?.map((option, optionIndex) => (
                <div key={optionIndex} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(question.options || [])]
                      newOptions[optionIndex] = e.target.value
                      updateQuestion(index, { options: newOptions })
                    }}
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  <div className="flex items-center gap-2 px-3 border rounded-md">
                    <Checkbox
                      id={`correct-${question.id}-${optionIndex}`}
                      checked={correctAnswers.includes(option)}
                      onCheckedChange={() => toggleCorrectAnswer(option)}
                    />
                    <Label htmlFor={`correct-${question.id}-${optionIndex}`} className="text-sm cursor-pointer">
                      Correct
                    </Label>
                  </div>
                  {(question.options?.length || 0) > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(optionIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption} className="w-full bg-transparent">
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>
          )}

          {question.question_type === "TRUE_FALSE" && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <div className="flex gap-2">
                <Button
                  variant={question.correct_answer === "true" ? "default" : "outline"}
                  onClick={() => updateQuestion(index, { correct_answer: "true" })}
                >
                  True
                </Button>
                <Button
                  variant={question.correct_answer === "false" ? "default" : "outline"}
                  onClick={() => updateQuestion(index, { correct_answer: "false" })}
                >
                  False
                </Button>
              </div>
            </div>
          )}

          {(question.question_type === "SHORT_ANSWER" || question.question_type === "ESSAY") && (
            <div className="space-y-2">
              <Label>Sample Answer / Grading Notes</Label>
              <Textarea
                value={
                  Array.isArray(question.correct_answer) ? question.correct_answer.join(", ") : question.correct_answer
                }
                onChange={(e) => updateQuestion(index, { correct_answer: e.target.value })}
                placeholder="Provide a sample answer or grading guidelines..."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assessment Title</Label>
              <Input
                value={assessment.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Enter assessment title"
                className="text-lg font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={assessment.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Enter assessment description..."
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Questions</h3>
                <Badge variant="outline">
                  {assessment.questions?.length || 0} question{assessment.questions?.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {assessment.questions?.map((question, index) => renderQuestionEditor(question, index))}

              <Card className="border-dashed border-2 border-border hover:border-primary-400 transition-colors">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground dark:text-white mb-2">Add Question</h3>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">
                    Create a new question for this assessment
                  </p>
                  <Button onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assessment Settings</CardTitle>
                <CardDescription>Configure assessment behavior and grading</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Assessment Type</Label>
                    <Select
                      value={assessment.type}
                      onValueChange={(value) => onUpdate({ type: value as Assessment["type"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUIZ">Quiz</SelectItem>
                        <SelectItem value="EXAM">Exam</SelectItem>
                        <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                        <SelectItem value="PROJECT">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Passing Score (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={assessment.passing_score || ""}
                      onChange={(e) => onUpdate({ passing_score: Number.parseInt(e.target.value) || undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Limit (minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={assessment.time_limit_minutes || ""}
                      onChange={(e) => onUpdate({ time_limit_minutes: Number.parseInt(e.target.value) || undefined })}
                      placeholder="No limit"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Attempts</Label>
                    <Input
                      type="number"
                      min="1"
                      value={assessment.max_attempts || 3}
                      onChange={(e) => onUpdate({ max_attempts: Number.parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order Index</Label>
                    <Input
                      type="number"
                      min="0"
                      value={assessment.order_index || 0}
                      onChange={(e) => onUpdate({ order_index: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grading Summary</CardTitle>
                <CardDescription>Overview of points and scoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{assessment.questions?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {assessment.questions?.reduce((acc, q) => acc + q.points, 0) || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{assessment.passing_score || 70}%</div>
                    <div className="text-sm text-muted-foreground">Passing Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">
                      {assessment.time_limit_minutes ? `${assessment.time_limit_minutes}m` : "∞"}
                    </div>
                    <div className="text-sm text-muted-foreground">Time Limit</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}