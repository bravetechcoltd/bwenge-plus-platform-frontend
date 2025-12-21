// @ts-nocheck

"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  Lock,
  BookOpen,
  Video,
  Award,
  ShieldQuestion,
  Clock,
  FileDown,
  Download,
  Search,
  X,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"

interface LearningStep {
  id: string
  type: "content" | "video" | "assessment"
  title: string
  duration?: number
  isCompleted: boolean
  isLocked: boolean
}

interface Lesson {
  id: string
  title: string
  content: string
  video_url: string
  thumbnail_url?: string
  duration_minutes: number
  order_index: number
  isProject: boolean
  isExercise: boolean
  assessments: any[]
  quizzes?: any[]
  resources?: Array<{
    url: string
    title: string
    description?: string
  }>
  isCompleted?: boolean
}

interface Module {
  id: string
  title: string
  description: string
  order_index: number
  lessons: Lesson[]
  final_assessment?: {
    id: string
    title: string
    type: "ASSESSMENT" | "PROJECT"
    time_limit_minutes?: number
    assessment_id?: string
    assessment?: any
  }
}

interface LearningSidebarProps {
  modules: Module[]
  currentStepId: string
  onStepSelect: (stepId: string) => void
  onCourseCompletionSelect: () => void
  courseProgress: number
  progressData: any
  isStepCompleted: (stepId: string) => boolean
  allStepsCompleted: boolean
  getStepScore?: (stepId: string) => number | undefined
}

export default function LearningSidebar({
  modules,
  currentStepId,
  onStepSelect,
  onCourseCompletionSelect,
  courseProgress,
  progressData,
  isStepCompleted,
  allStepsCompleted,
  getStepScore,
}: LearningSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user } = useAuth()

  const isLessonOrAssessmentCompleted = (lessonId: string, assessmentId?: string): boolean => {
    if (!progressData?.completedSteps) {
      console.log("[v0] No completedSteps available")
      return false
    }

    // Check if assessment is completed
    if (assessmentId) {
      const isCompleted = progressData.completedSteps.some(
        (step: any) => 
          step.type === "assessment" &&
          step.assessmentId && 
          String(step.assessmentId).trim() === String(assessmentId).trim() && 
          step.isCompleted === true
      )
      
      if (!isCompleted) {
        console.log("[v0] Assessment NOT found as completed:", {
          assessmentId,
          availableAssessments: progressData.completedSteps
            .filter((s: any) => s.type === "assessment")
            .map((s: any) => ({id: s.assessmentId, completed: s.isCompleted}))
        })
      }
      
      return isCompleted
    }

    // Check if lesson is completed (including both content and video)
    const lessonSteps = progressData.completedSteps.filter(
      (step: any) => step.type === "lesson" && step.lessonId && String(step.lessonId).trim() === String(lessonId).trim()
    )
    
    // If there's at least one completion for this lesson, consider it completed
    return lessonSteps.some((step: any) => step.isCompleted === true)
  }

  // Helper to check if lesson has content
  const lessonHasContent = (lesson: Lesson): boolean => {
    return !!lesson.content && lesson.content.trim() !== ""
  }

  // Helper to check if lesson has video
  const lessonHasVideo = (lesson: Lesson): boolean => {
    return !!lesson.video_url && lesson.video_url.trim() !== ""
  }

  // Helper to check if lesson has assessments
  const lessonHasAssessments = (lesson: Lesson): boolean => {
    return (lesson.assessments && lesson.assessments.length > 0) || 
           (lesson.quizzes && lesson.quizzes.length > 0)
  }

  // Generate a single step for each lesson
  const generateLessonStep = (lesson: Lesson): LearningStep => {
    const lessonCompleted = isLessonOrAssessmentCompleted(lesson.id) ?? false
    
    // Determine step type based on lesson content
    let stepType: "content" | "video" = "content"
    if (lessonHasVideo(lesson) && !lessonHasContent(lesson)) {
      stepType = "video"
    } else if (lessonHasVideo(lesson) && lessonHasContent(lesson)) {
      stepType = "content" // Default to content for mixed lessons
    }

    return {
      id: `${lesson.id}-lesson`, // Use consistent ID format
      type: stepType,
      title: lesson.title,
      duration: lesson.duration_minutes,
      isCompleted: lessonCompleted,
      isLocked: false,
    }
  }

  // Generate assessment steps separately
  const generateAssessmentSteps = (lesson: Lesson): LearningStep[] => {
    const steps: LearningStep[] = []

    // Add assessments
    if (lesson.assessments && lesson.assessments.length > 0) {
      lesson.assessments.forEach((assessment) => {
        const stepId = `${lesson.id}-assessment-${assessment.id}`
        const assessmentCompleted = isLessonOrAssessmentCompleted(lesson.id, assessment.id) ?? false
        steps.push({
          id: stepId,
          type: "assessment",
          title: assessment.title || `${lesson.title} - Assessment`,
          duration: assessment.time_limit_minutes,
          isCompleted: assessmentCompleted,
          isLocked: false,
        })
      })
    }

    // Add quizzes
    if (lesson.quizzes && lesson.quizzes.length > 0) {
      lesson.quizzes.forEach((quiz) => {
        const stepId = `${lesson.id}-quiz-${quiz.id}`
        const quizCompleted = isLessonOrAssessmentCompleted(lesson.id, quiz.id) ?? false
        steps.push({
          id: stepId,
          type: "assessment",
          title: quiz.title || `${lesson.title} - Quiz`,
          duration: quiz.time_limit_minutes,
          isCompleted: quizCompleted,
          isLocked: false,
        })
      })
    }

    return steps
  }

  const calculateStepLocks = () => {
    if (user?.bwenge_role !== "LEARNER") return
    const allStepsWithLocks: (LearningStep & { moduleId: string; lessonId: string })[] = []

    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        // Add main lesson step
        const lessonStep = generateLessonStep(lesson)
        allStepsWithLocks.push({
          ...lessonStep,
          moduleId: module.id,
          lessonId: lesson.id,
        })

        // Add assessment steps
        const assessmentSteps = generateAssessmentSteps(lesson)
        assessmentSteps.forEach((step) => {
          allStepsWithLocks.push({
            ...step,
            moduleId: module.id,
            lessonId: lesson.id,
          })
        })
      })

      // Add final assessment step if module has one
      if (module.final_assessment) {
        const stepId = `${module.id}-final-assessment`
        allStepsWithLocks.push({
          id: stepId,
          type: "assessment",
          title: `${module.title} - Final ${module.final_assessment.type === "ASSESSMENT" ? "Assessment" : "Project"}`,
          duration: module.final_assessment.time_limit_minutes,
          isCompleted: isLessonOrAssessmentCompleted(
            "",
            module.final_assessment.assessment_id || module.final_assessment.id,
          ),
          isLocked: false,
          moduleId: module.id,
          lessonId: module.id,
        })
      }
    })

    // Find current step index
    const currentStepIndex = allStepsWithLocks.findIndex((step) => step.id === currentStepId)

    // Lock logic: enable steps up to current + completed steps
    allStepsWithLocks.forEach((step, index) => {
      const isCompleted = step.isCompleted
      const isCurrentOrBefore = index <= currentStepIndex
      const allPreviousCompleted = index === 0 || allStepsWithLocks.slice(0, index).every((s) => s.isCompleted)

      step.isLocked = !isCompleted && !isCurrentOrBefore && !allPreviousCompleted && user?.bwenge_role === "LEARNER"
    })

    return allStepsWithLocks
  }

  const allStepsWithLocks = calculateStepLocks()

  const getStepTypeLabel = (type: string) => {
    switch (type) {
      case "content":
        return "Reading"
      case "video":
        return "Video"
      case "assessment":
        return "Quiz"
      default:
        return "Lesson"
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]))
  }

  const getAllResources = () => {
    const allResources: Array<{ url: string; title: string; description?: string; lessonTitle: string }> = []
    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        if (typeof lesson.resources === "string") {
          try {
            lesson.resources = JSON.parse(lesson.resources)
          } catch (e) {
            lesson.resources = []
          }
        }
        if (Array.isArray(lesson.resources) && lesson.resources.length > 0) {
          lesson.resources.forEach((resource: any) => {
            allResources.push({
              ...resource,
              lessonTitle: lesson.title,
            })
          })
        }
      })
    })
    return allResources
  }

  const allResources = getAllResources()

  const getAllAssessments = () => {
    const assessmentsList: Array<{
      title: string
      lessonTitle: string
      moduleTitle: string
      score?: number
      id: string
      stepId: string
    }> = []

    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        lesson.assessments?.forEach((assessment) => {
          const stepId = `${lesson.id}-assessment-${assessment.id}`
          const score = getStepScore?.(stepId)

          assessmentsList.push({
            title: assessment.title || "Assessment",
            lessonTitle: lesson.title,
            moduleTitle: module.title,
            score: isStepCompleted(stepId) ? score : undefined,
            id: assessment.id,
            stepId,
          })
        })

        lesson.quizzes?.forEach((quiz) => {
          const stepId = `${lesson.id}-quiz-${quiz.id}`
          const score = getStepScore?.(stepId)

          assessmentsList.push({
            title: quiz.title || "Quiz",
            lessonTitle: lesson.title,
            moduleTitle: module.title,
            score: isStepCompleted(stepId) ? score : undefined,
            id: quiz.id,
            stepId,
          })
        })
      })

      // Add final assessment
      if (module.final_assessment) {
        const stepId = `${module.id}-final-assessment`
        const score = getStepScore?.(stepId)

        assessmentsList.push({
          title: module.final_assessment.title || "Final Assessment",
          lessonTitle: `${module.title} - Final ${module.final_assessment.type === "ASSESSMENT" ? "Assessment" : "Project"}`,
          moduleTitle: module.title,
          score: isStepCompleted(stepId) ? score : undefined,
          id: module.final_assessment.id,
          stepId,
        })
      }
    })
    return assessmentsList
  }

  const allAssessments = getAllAssessments()

  const filteredModules = modules
    .map((module) => ({
      ...module,
      lessons: module.lessons.filter((lesson) => lesson.title.toLowerCase().includes(searchQuery.toLowerCase())),
    }))
    .filter((module) => module.lessons.length > 0 || !searchQuery)

  const SidebarContent = () => (
    <>
      {/* Header with Progress */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Course Progress</h3>
          <span className="text-lg font-bold text-primary">
            {Math.round(progressData?.overallProgress ?? courseProgress)}%
          </span>
        </div>
        <Progress value={progressData?.overallProgress ?? courseProgress} className="h-2.5" />
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="outline" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 bg-background px-4 pt-4">
          <TabsTrigger value="outline" className="flex items-center gap-1.5 text-xs font-medium rounded">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Outline</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1.5 text-xs font-medium rounded">
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-1.5 text-xs font-medium rounded">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Grades</span>
          </TabsTrigger>
        </TabsList>

        {/* Course Outline Tab */}
        <TabsContent value="outline" className="flex-1 overflow-y-auto py-2 px-4 space-y-3">
          {/* Search Bar */}
          <div className="mb-4 sticky top-0 bg-background z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search lessons..."
              className="pl-9 pr-8 h-9 bg-muted/50 border-primary/20 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Modules Accordion */}
          <Accordion type="multiple" value={expandedModules} className="space-y-2">
            {filteredModules.map((module) => {
              const moduleSteps = [
                ...module.lessons.map((lesson) => ({
                  ...generateLessonStep(lesson),
                  lessonId: lesson.id,
                })),
                ...module.lessons.flatMap((lesson) => 
                  generateAssessmentSteps(lesson).map((step) => ({
                    ...step,
                    lessonId: lesson.id,
                  }))
                ),
                ...(module.final_assessment
                  ? [
                      {
                        id: `${module.id}-final-assessment`,
                        type: "assessment" as const,
                        title: module.final_assessment.title,
                        duration: module.final_assessment.time_limit_minutes,
                        isCompleted: isLessonOrAssessmentCompleted(
                          "",
                          module.final_assessment.assessment_id || module.final_assessment.id,
                        ),
                        isLocked: false,
                        lessonId: module.id,
                      },
                    ]
                  : []),
              ]

              const completedSteps = moduleSteps.filter((step) => step.isCompleted).length
              const moduleProgress = moduleSteps.length > 0 ? (completedSteps / moduleSteps.length) * 100 : 0

              return (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="border rounded bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden"
                >
                  <AccordionTrigger
                    className="px-4 py-3 hover:bg-muted/40 rounded-t-lg transition-colors"
                    onClick={() => toggleModule(module.id)}
                  >
                    <div className="grid items-center gap-3 w-full">
                      <div className="min-w-0 overflow-hidden">
                        <p className="font-semibold text-sm truncate">{module.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {completedSteps} of {moduleSteps.length} complete
                        </p>
                      </div>
                      <div className="w-full h-1.5 bg-primary/10 rounded overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${moduleProgress}%` }}
                        />
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-3 pt-2 bg-background">
                    <div className="space-y-1.5">
                      {module.lessons.map((lesson) => {
                        // Main lesson step
                        const lessonStep = generateLessonStep(lesson)
                        const lessonStepWithLock = allStepsWithLocks?.find((s) => s.id === lessonStep.id)
                        const isLessonLocked = lessonStepWithLock?.isLocked || false
                        const isLessonActive = currentStepId === lessonStep.id
                        const isLessonCompleted = lessonStepWithLock?.isCompleted || false

                        // Lesson badges to show content types
                        const hasContent = lessonHasContent(lesson)
                        const hasVideo = lessonHasVideo(lesson)
                        const hasAssessments = lessonHasAssessments(lesson)

                        return (
                          <div key={lesson.id} className="space-y-1">
                            {/* Main Lesson Button */}
                            <button
                              onClick={() => {
                                if (!isLessonLocked) {
                                  onStepSelect(lessonStep.id)
                                  setIsMobileOpen(false)
                                }
                              }}
                              disabled={isLessonLocked}
                              className={`w-full text-left p-2.5 rounded border transition-all ${
                                isLessonActive
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : isLessonLocked
                                    ? "opacity-50 cursor-not-allowed hover:bg-muted/30"
                                    : "hover:bg-muted border-transparent hover:border-primary/20"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="flex-shrink-0 mt-0.5">
                                  {isLessonCompleted ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : isLessonLocked ? (
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                  ) : hasVideo && !hasContent ? (
                                    <Video className="w-4 h-4 text-purple-500" />
                                  ) : (
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      variant={isLessonActive ? "default" : "outline"}
                                      className={`text-xs font-medium ${isLessonActive && "bg-primary-foreground/20 rounded"}`}
                                    >
                                      Lesson
                                    </Badge>
                                    
                                    {/* Show content type badges */}
                                    {hasContent && hasVideo && (
                                      <div className="flex items-center gap-1">
                                        <BookOpen className="w-3 h-3 text-blue-500" />
                                        <Video className="w-3 h-3 text-purple-500" />
                                      </div>
                                    )}
                                    {hasContent && !hasVideo && (
                                      <BookOpen className="w-3 h-3 text-blue-500" />
                                    )}
                                    {!hasContent && hasVideo && (
                                      <Video className="w-3 h-3 text-purple-500" />
                                    )}
                                    
                                    {lesson.duration_minutes ? (
                                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="w-3 h-3" />
                                        {lesson.duration_minutes}m
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                        Self Paced
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Assessment steps for this lesson */}
                            {generateAssessmentSteps(lesson).map((assessmentStep) => {
                              const stepWithLock = allStepsWithLocks?.find((s) => s.id === assessmentStep.id)
                              const isAssessmentLocked = stepWithLock?.isLocked || false
                              const isAssessmentActive = currentStepId === assessmentStep.id
                              const isAssessmentCompleted = stepWithLock?.isCompleted || false

                              return (
                                <button
                                  key={assessmentStep.id}
                                  onClick={() => {
                                    if (!isAssessmentLocked) {
                                      onStepSelect(assessmentStep.id)
                                      setIsMobileOpen(false)
                                    }
                                  }}
                                  disabled={isAssessmentLocked}
                                  className={`w-full text-left p-2.5 rounded border transition-all ml-4 ${
                                    isAssessmentActive
                                      ? "bg-orange-100 dark:bg-orange-900/30 text-foreground border-orange-300 shadow-sm"
                                      : isAssessmentLocked
                                        ? "opacity-50 cursor-not-allowed hover:bg-muted/30"
                                        : "hover:bg-muted/50 border-transparent hover:border-orange-200"
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {isAssessmentCompleted ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : isAssessmentLocked ? (
                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <Award className="w-4 h-4 text-orange-500" />
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate text-orange-700 dark:text-orange-300">
                                        {assessmentStep.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className="text-xs font-medium bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                                        >
                                          {getStepTypeLabel(assessmentStep.type)}
                                        </Badge>
                                        {assessmentStep.duration ? (
                                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                            <Clock className="w-3 h-3" />
                                            {assessmentStep.duration}m
                                          </span>
                                        ) : (
                                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                            Self Paced
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}

                      {/* Module Final Assessment */}
                      {module.final_assessment && (
                        <div className="pt-2 mt-2 border-t">
                          <button
                            onClick={() => {
                              const stepId = `${module.id}-final-assessment`
                              const stepWithLock = allStepsWithLocks?.find((s) => s.id === stepId)
                              if (!stepWithLock?.isLocked) {
                                onStepSelect(stepId)
                                setIsMobileOpen(false)
                              }
                            }}
                            disabled={
                              allStepsWithLocks?.find((s) => s.id === `${module.id}-final-assessment`)?.isLocked
                            }
                            className={`w-full text-left p-2.5 rounded-md border transition-all ${
                              currentStepId === `${module.id}-final-assessment`
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : allStepsWithLocks?.find((s) => s.id === `${module.id}-final-assessment`)?.isLocked
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-muted border-transparent hover:border-primary/20"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="flex-shrink-0 mt-0.5">
                                {isStepCompleted(`${module.id}-final-assessment`) ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : allStepsWithLocks?.find((s) => s.id === `${module.id}-final-assessment`)
                                    ?.isLocked ? (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ShieldQuestion className="w-4 h-4 text-ring" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-chart-2">
                                  {module.final_assessment.title || "Final Assessment"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant={currentStepId === `${module.id}-final-assessment` ? "default" : "outline"}
                                    className={`text-xs font-medium ${currentStepId === `${module.id}-final-assessment` && "bg-primary-foreground/20 rounded"}`}
                                  >
                                    {module.final_assessment.type === "ASSESSMENT" ? "Quiz" : "Project"}
                                  </Badge>
                                  {module.final_assessment.time_limit_minutes && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      <Clock className="w-3 h-3" />
                                      {module.final_assessment.time_limit_minutes}m
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          {/* Course Completion Button */}
          <div className="mt-4">
            <button
              onClick={() => {
                console.log("🎯 Course completion clicked", {
                  allStepsCompleted,
                  enrollmentStatus: progressData?.enrollmentStatus,
                  progress: progressData?.overallProgress
                })
                onCourseCompletionSelect()
                setIsMobileOpen(false)
              }}
              disabled={!allStepsCompleted}
              className={`w-full text-left p-3 rounded border-2 transition-all ${
                currentStepId === "course-completion"
                  ? "bg-primary text-primary-foreground border-primary"
                  : allStepsCompleted
                    ? "hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "opacity-50 cursor-not-allowed border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                {allStepsCompleted || progressData?.enrollmentStatus === "COMPLETED" || progressData?.overallProgress >= 100 ? (
                  <Award className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">Course Completion</p>
                  <p className="text-xs text-muted-foreground">
                    {allStepsCompleted || progressData?.enrollmentStatus === "COMPLETED" || progressData?.overallProgress >= 100 
                      ? "View achievements" 
                      : "Complete all lessons"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {progressData?.enrollmentStatus || 'UNKNOWN'} | Progress: {progressData?.overallProgress || 0}%
                  </p>
                </div>
              </div>
            </button>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="flex-1 overflow-y-auto p-4">
          {allResources.length > 0 ? (
            <div className="space-y-3">
              {allResources.map((resource, index) => (
                <div key={index} className="p-3 border rounded bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-start gap-3 mb-2">
                    <Download className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-foreground">{resource.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{resource.lessonTitle}</p>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">{resource.description}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                  >
                    <FileDown className="w-3 h-3" />
                    View Resource
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileDown className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No resources available</p>
            </div>
          )}
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              {allAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="p-3 border rounded bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    onStepSelect(assessment.stepId)
                    setIsMobileOpen(false)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{assessment.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{assessment.lessonTitle}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{assessment.moduleTitle}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {assessment.score !== undefined ? (
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{assessment.score}%</div>
                          <Badge
                            variant={
                              assessment.score >= 80 ? "default" : assessment.score >= 60 ? "secondary" : "destructive"
                            }
                            className="text-xs mt-1 rounded"
                          >
                            {assessment.score >= 80 ? "Excellent" : assessment.score >= 60 ? "Passed" : "Review"}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs rounded">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed left-4 bottom-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 flex flex-col">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-[73px] w-85 border-r bg-background h-[calc(100vh-73px)] overflow-hidden z-[5] flex-col">
        <SidebarContent />
      </div>
    </>
  )
}
