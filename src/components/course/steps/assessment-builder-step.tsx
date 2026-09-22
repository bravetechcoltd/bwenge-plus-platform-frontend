"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trophy, Target, Clock, AlertCircle, Shield } from "lucide-react"
import { AssessmentEditor } from "../assessment/assessment-editor"
import { AssessmentPreview } from "../assessment/assessment-preview"
import { AssessmentSecurityStep } from "./assessment-security-step"
import { AssessmentType } from "@/types"
import type { Module, Assessment, AssessmentQuestion } from "@/types"
// Add AssessmentQuestion import

/**
 * A saved assessment has a UUID; one the builder invented this session does
 * not. Security settings attach to a row that exists, so the control is only
 * offered once the course has been saved (LC-CONS-001 §19.3).
 */
const PERSISTED_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isSaved = (id: string | undefined | null): boolean =>
  !!id && PERSISTED_ID.test(String(id))

interface AssessmentBuilderStepProps {
  modules: Module[]
  setModules: (modules: Module[]) => void
  onNext: () => void
  onPrevious: () => void
}

export function AssessmentBuilderStep({ modules, setModules, onNext, onPrevious }: AssessmentBuilderStepProps) {
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false) // Add preview mode state
  const [securityMode, setSecurityMode] = useState(false)
  const [canProceed, setCanProceed] = useState(true)
  const [validationMessage, setValidationMessage] = useState<string>("")

  const allAssessments = modules.flatMap((module) =>
    (module.lessons || []).flatMap((lesson) => lesson.assessments || []),
  )

  const currentAssessment = allAssessments.find((a) => a.id === selectedAssessment)

  const addAssessment = (lessonId: string, moduleId: string) => {
    const newAssessment: Assessment = {
      // LC-CONS-001 §19.4 — `temp-` is the prefix the backend documents for a
      // client-invented row. The old `assessment-${Date.now()}` matched no
      // `temp-` test anywhere, so the server treated it as a persisted id,
      // looked it up, found nothing, and created the row again on the next
      // save. That is how three assessments landed on one lesson in a single
      // 31-millisecond write. The backend now tests id *shape* rather than
      // prefix, so this is belt and braces — but the contract should be
      // honoured by the client that has it.
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: "New Assessment",
      description: "",
      type: AssessmentType.QUIZ,
      questions: [],
      passing_score: 70,
      time_limit_minutes: 30,
      lesson_id: lessonId,
      module_id: moduleId,
      course_id: "",
      max_attempts: 3,
      is_published: false,
      is_final_assessment: false,
      is_module_final: false,
      created_at: new Date(),
      updated_at: new Date(),
    }

    setModules(
      modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons?.map((lesson) =>
                lesson.id === lessonId
                  ? { ...lesson, assessments: [...(lesson.assessments || []), newAssessment] }
                  : lesson,
              ),
            }
          : module,
      ),
    )

    setSelectedAssessment(newAssessment.id)
  }

  const updateAssessment = (assessmentId: string, updates: Partial<Assessment>) => {
    setModules(
      modules.map((module) => ({
        ...module,
        lessons: module.lessons?.map((lesson) => ({
          ...lesson,
          assessments: lesson.assessments?.map((assessment) =>
            assessment.id === assessmentId ? { ...assessment, ...updates } : assessment,
          ),
        })),
      })),
    )
  }

  const deleteAssessment = (assessmentId: string) => {
    setModules(
      modules.map((module) => ({
        ...module,
        lessons: module.lessons?.map((lesson) => ({
          ...lesson,
          assessments: lesson.assessments?.filter((assessment) => assessment.id !== assessmentId),
        })),
      })),
    )
    setSelectedAssessment(null)
  }

  useEffect(() => {
    const invalidQuestions: string[] = []

    allAssessments.forEach((assessment) => {
      assessment.questions?.forEach((question: AssessmentQuestion, qIndex) => { // Add type annotation
        if (question.question_type === "MULTIPLE_CHOICE" || question.question_type === "TRUE_FALSE") {
          if (question.question_type === "MULTIPLE_CHOICE") {
            const hasCorrectAnswer = Array.isArray(question.correct_answer)
              ? question.correct_answer.length > 0
              : question.correct_answer !== "" && question.correct_answer !== undefined

            if (!hasCorrectAnswer) {
              invalidQuestions.push(
                `"${assessment.title}" - Question ${qIndex + 1}: Multiple choice question missing correct answer`,
              )
            }
          } else if (question.question_type === "TRUE_FALSE") {
            if (question.correct_answer !== "true" && question.correct_answer !== "false") {
              invalidQuestions.push(
                `"${assessment.title}" - Question ${qIndex + 1}: True/False question missing correct answer`,
              )
            }
          }
        }
      })
    })

    setCanProceed(invalidQuestions.length === 0)
    setValidationMessage(
      invalidQuestions.length > 0
        ? `Please fix the following issues before proceeding:\n${invalidQuestions.slice(0, 3).join("\n")}${invalidQuestions.length > 3 ? `\n...and ${invalidQuestions.length - 3} more` : ""}`
        : "",
    )
  }, [allAssessments])

  // Add Preview Toggle Button in the Assessment Editor/Preview section
  const renderAssessmentContent = () => {
    if (!selectedAssessment || !currentAssessment) {
      return (
        <Card className="h-full flex items-center justify-center">
          <CardContent className="text-center">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">Ready to Add Assessments?</h3>
            <p className="text-muted-foreground dark:text-muted-foreground mb-6">
              Create quizzes and assignments to test student knowledge and track progress
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
              <Card className="p-4 text-center hover:bg-muted/50 dark:hover:bg-card cursor-pointer">
                <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium text-sm">Quiz</h4>
                <p className="text-xs text-muted-foreground">Multiple choice questions</p>
              </Card>
              <Card className="p-4 text-center hover:bg-muted/50 dark:hover:bg-card cursor-pointer">
                <Target className="w-8 h-8 text-success mx-auto mb-2" />
                <h4 className="font-medium text-sm">Assignment</h4>
                <p className="text-xs text-muted-foreground">Project-based tasks</p>
              </Card>
              <Card className="p-4 text-center hover:bg-muted/50 dark:hover:bg-card cursor-pointer">
                <Clock className="w-8 h-8 text-warning mx-auto mb-2" />
                <h4 className="font-medium text-sm">Timed Test</h4>
                <p className="text-xs text-muted-foreground">Time-limited assessments</p>
              </Card>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 truncate">
                <Trophy className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{currentAssessment.title}</span>
              </CardTitle>
              <CardDescription className="truncate">
                {currentAssessment.type} • {currentAssessment.questions?.length || 0} questions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={securityMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSecurityMode(!securityMode)
                  setPreviewMode(false)
                }}
                disabled={!isSaved(currentAssessment.id)}
                title={
                  isSaved(currentAssessment.id)
                    ? undefined
                    : "Save the course first — security settings attach to a saved assessment."
                }
              >
                <Shield className="mr-1.5 h-4 w-4" />
                Security
              </Button>
              <Button
                variant={previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPreviewMode(!previewMode)
                  setSecurityMode(false)
                }}
              >
                {previewMode ? "Edit" : "Preview"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[500px] overflow-y-auto">
          {securityMode ? (
            /*
              LC-CONS-001 §19.3 — the control that closes finding P-32.

              The backend has always had a policy endpoint; nothing in the
              product called it, so `proctoring_policy` was NULL on every
              assessment and the whole monitoring stack was unreachable. It
              lives here, beside the questions, because this is where the
              instructor already is — not in a settings area they must go and
              find.
            */
            <AssessmentSecurityStep
              scope="assessment"
              targetId={currentAssessment.id}
              targetName={currentAssessment.title}
            />
          ) : previewMode ? (
            <AssessmentPreview
              assessment={currentAssessment}
              isInstructor={true}
            />
          ) : (
            <AssessmentEditor
              assessment={currentAssessment}
              onUpdate={(updates) => updateAssessment(currentAssessment.id, updates)}
              onDelete={() => deleteAssessment(currentAssessment.id)}
            />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">Create Assessments</h2>
        <p className="text-muted-foreground dark:text-muted-foreground">Build quizzes and assignments to test student understanding</p>
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            {allAssessments.length} Assessments
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            {allAssessments.reduce((acc, a) => acc + (a.questions?.length || 0), 0)} Questions
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* Course Structure & Assessments */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Assessments</CardTitle>
              <CardDescription>Manage quizzes and assignments</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] overflow-y-auto">
              <div className="space-y-4">
                {modules.map((module) => (
                  <div key={module.id} className="space-y-2">
                    <div className="font-medium text-sm text-muted-foreground dark:text-muted-foreground truncate" title={module.title}>
                      {module.title}
                    </div>
                    {module.lessons?.map((lesson) => (
                      <div key={lesson.id} className="ml-2 space-y-1">
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground truncate" title={lesson.title}>
                          {lesson.title}
                        </div>
                        {lesson.assessments?.map((assessment) => (
                          <Button
                            key={assessment.id}
                            variant={selectedAssessment === assessment.id ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start text-left ml-4 min-h-[32px]"
                            onClick={() => {
                              setSelectedAssessment(assessment.id)
                              setPreviewMode(false) // Reset to edit mode when selecting assessment
                            }}
                          >
                            <Trophy className="w-3 h-3 mr-2 flex-shrink-0" />
                            <span className="truncate" title={assessment.title}>
                              {assessment.title}
                            </span>
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 ml-4 min-h-[32px]"
                          onClick={() => addAssessment(lesson.id, module.id)}
                        >
                          <Plus className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span className="truncate">Add Assessment</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Editor/Preview */}
        <div className="lg:col-span-3">
          {renderAssessmentContent()}
        </div>
      </div>

      {/* Progress & Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onPrevious}>
          Previous Step
        </Button>

        <div className="text-center flex-1 mx-4">
          {!canProceed && validationMessage && (
            <div className="bg-destructive/10 dark:bg-destructive/20/20 border border-destructive/30 dark:border-destructive/30 rounded-lg px-4 py-3 max-w-2xl mx-auto">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-destructive dark:text-destructive text-sm font-medium mb-1">
                    Cannot proceed - please fix validation errors:
                  </p>
                  <p className="text-destructive dark:text-destructive text-xs whitespace-pre-line">{validationMessage}</p>
                </div>
              </div>
            </div>
          )}
          {allAssessments.length > 0 && canProceed && (
            <div className="bg-success/10 dark:bg-success/20/20 border border-success/30 dark:border-success/30 rounded-lg px-4 py-2">
              <p className="text-success dark:text-success text-sm">
                Excellent! You've created {allAssessments.length} assessment{allAssessments.length !== 1 ? "s" : ""}{" "}
                with {allAssessments.reduce((acc, a) => acc + (a.questions?.length || 0), 0)} total questions.
              </p>
            </div>
          )}
        </div>

        <Button onClick={onNext} size="lg" className="px-8" disabled={!canProceed}>
          Final Review
        </Button>
      </div>
    </div>
  )
}