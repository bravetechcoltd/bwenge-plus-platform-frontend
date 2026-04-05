// @ts-nocheck

"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle, Lock, BookOpen, Video, Award, ShieldQuestion,
  Clock, FileDown, Download, Search, X, Menu, XCircle,
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
  resources?: Array<{ url: string; title: string; description?: string }>
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
  isStepFailed?: (stepId: string) => boolean
  isStepPending?: (stepId: string) => boolean
}

export default function LearningSidebar({
  modules, currentStepId, onStepSelect, onCourseCompletionSelect,
  courseProgress, progressData, isStepCompleted, allStepsCompleted,
  getStepScore, isStepFailed, isStepPending,
}: LearningSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user } = useAuth()

  // ── Lesson/assessment completion check (passed = truly completed) ──────────
  const isLessonOrAssessmentCompleted = (lessonId: string, assessmentId?: string): boolean => {
    if (!progressData?.completedSteps) return false
    if (assessmentId) {
      return progressData.completedSteps.some(
        (step: any) =>
          step.type === "assessment" &&
          String(step.assessmentId).trim() === String(assessmentId).trim() &&
          step.isCompleted === true &&
          (step.status === "passed" || step.passed === true),
      )
    }
    return progressData.completedSteps.some(
      (step: any) =>
        step.type === "lesson" &&
        String(step.lessonId).trim() === String(lessonId).trim() &&
        step.isCompleted === true,
    )
  }

  // ── Final assessment state helpers ─────────────────────────────────────────
  // CRITICAL: Final assessments in completedSteps have lessonId === null.
  // This is the reliable way to find them, confirmed by the API data.
  const getFinalAssessmentStep = () => {
    if (!progressData?.completedSteps) return null
    return progressData.completedSteps.find(
      (s: any) =>
        s.type === "assessment" &&
        (s.lessonId === null || s.lessonId === undefined || s.lessonId === ""),
    ) || null
  }

  const isFinalAssessmentCompleted = (): boolean => {
    const step = getFinalAssessmentStep()
    if (!step) return false
    return step.isCompleted === true && (step.status === "passed" || step.passed === true)
  }

  const isFinalAssessmentGradedFailed = (): boolean => {
    const step = getFinalAssessmentStep()
    if (!step) return false
    return step.isCompleted === true && step.status !== "passed" && step.passed !== true
  }

  const isFinalAssessmentStillPending = (): boolean => {
    const step = getFinalAssessmentStep()
    if (!step) return false
    return step.status === "pending"
  }

  // ── Lesson assessment state helpers ────────────────────────────────────────
  const isAssessmentGradedFailed = (assessmentId: string): boolean => {
    if (!progressData?.completedSteps) return false
    const step = progressData.completedSteps.find(
      (s: any) =>
        s.type === "assessment" &&
        String(s.assessmentId).trim() === String(assessmentId).trim(),
    )
    if (!step) return false
    return step.isCompleted === true && step.status !== "passed" && step.passed !== true
  }

  const isAssessmentStillPending = (assessmentId: string): boolean => {
    if (!progressData?.completedSteps) return false
    const step = progressData.completedSteps.find(
      (s: any) =>
        s.type === "assessment" &&
        String(s.assessmentId).trim() === String(assessmentId).trim(),
    )
    if (!step) return false
    return step.status === "pending"
  }

  const lessonHasContent = (lesson: Lesson): boolean => !!lesson.content?.trim()
  const lessonHasVideo = (lesson: Lesson): boolean => !!lesson.video_url?.trim()

  const generateLessonStep = (lesson: Lesson): LearningStep => {
    const lessonCompleted = isLessonOrAssessmentCompleted(lesson.id)
    const stepType = lessonHasVideo(lesson) && !lessonHasContent(lesson) ? "video" : "content"
    return {
      id: `${lesson.id}-lesson`,
      type: stepType,
      title: lesson.title,
      duration: lesson.duration_minutes,
      isCompleted: lessonCompleted,
      isLocked: false,
    }
  }

  const generateAssessmentSteps = (lesson: Lesson): LearningStep[] => {
    const steps: LearningStep[] = []
    lesson.assessments?.forEach((assessment) => {
      steps.push({
        id: `${lesson.id}-assessment-${assessment.id}`,
        type: "assessment",
        title: assessment.title || `${lesson.title} - Assessment`,
        duration: assessment.time_limit_minutes,
        isCompleted: isLessonOrAssessmentCompleted(lesson.id, assessment.id),
        isLocked: false,
      })
    })
    lesson.quizzes?.forEach((quiz) => {
      steps.push({
        id: `${lesson.id}-quiz-${quiz.id}`,
        type: "assessment",
        title: quiz.title || `${lesson.title} - Quiz`,
        duration: quiz.time_limit_minutes,
        isCompleted: isLessonOrAssessmentCompleted(lesson.id, quiz.id),
        isLocked: false,
      })
    })
    return steps
  }

  // ── CORE LOCK CALCULATION ──────────────────────────────────────────────────
  // Rules (unlimited retake model):
  //   1. Completed (passed) steps → NEVER locked
  //   2. Failed/pending assessment → step accessible (to retake), all AFTER it locked
  //   3. Steps at/before current position → accessible
  //   4. Assessment right after completed lesson → unlock
  //   5. Sequential locking otherwise
  const calculateStepLocks = () => {
    if (user?.bwenge_role !== "LEARNER") return undefined

    const allStepsWithLocks: (LearningStep & { moduleId: string; lessonId: string; assessmentId?: string })[] = []

    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        allStepsWithLocks.push({
          ...generateLessonStep(lesson),
          moduleId: module.id,
          lessonId: lesson.id,
        })
        generateAssessmentSteps(lesson).forEach((step) => {
          let assessmentId: string | undefined
          if (step.id.includes("-assessment-")) {
            assessmentId = step.id.slice(step.id.indexOf("-assessment-") + "-assessment-".length)
          } else if (step.id.includes("-quiz-")) {
            assessmentId = step.id.slice(step.id.indexOf("-quiz-") + "-quiz-".length)
          }
          allStepsWithLocks.push({ ...step, moduleId: module.id, lessonId: lesson.id, assessmentId })
        })
      })

      if (module.final_assessment) {
        const stepId = `${module.id}-final-assessment`
        allStepsWithLocks.push({
          id: stepId,
          type: "assessment" as const,
          title: module.final_assessment.title,
          duration: module.final_assessment.time_limit_minutes,
          isCompleted: isFinalAssessmentCompleted(),
          isLocked: false,
          moduleId: module.id,
          lessonId: module.id,
          assessmentId: module.final_assessment.assessment_id || module.final_assessment.id,
        })
      }
    })

    const currentStepIndex = allStepsWithLocks.findIndex((step) => step.id === currentStepId)
    let blockedByFailedOrPending = false

    allStepsWithLocks.forEach((step, index) => {
      if (step.isCompleted) { step.isLocked = false; return }

      if (blockedByFailedOrPending) { step.isLocked = true; return }

      // Check if a prior assessment is blocking
      let hasBlockingBehind = false
      for (let i = 0; i < index; i++) {
        const prev = allStepsWithLocks[i]
        if (prev.type === "assessment" && !prev.isCompleted) {
          const isFinal = prev.id.endsWith("-final-assessment")
          const gradedFailed = isFinal ? isFinalAssessmentGradedFailed() : (prev.assessmentId ? isAssessmentGradedFailed(prev.assessmentId) : false)
          const stillPending = isFinal ? isFinalAssessmentStillPending() : (prev.assessmentId ? isAssessmentStillPending(prev.assessmentId) : false)
          if (gradedFailed || stillPending) { hasBlockingBehind = true; break }
        }
      }
      if (hasBlockingBehind) { step.isLocked = true; return }

      // Current step itself is failed/pending
      if (step.type === "assessment") {
        const isFinal = step.id.endsWith("-final-assessment")
        const gradedFailed = isFinal ? isFinalAssessmentGradedFailed() : (step.assessmentId ? isAssessmentGradedFailed(step.assessmentId) : false)
        const stillPending = isFinal ? isFinalAssessmentStillPending() : (step.assessmentId ? isAssessmentStillPending(step.assessmentId) : false)
        if (gradedFailed || stillPending) {
          step.isLocked = false // Accessible to retake
          blockedByFailedOrPending = true
          return
        }
      }

      if (currentStepIndex >= 0 && index <= currentStepIndex) { step.isLocked = false; return }

      if (step.type === "assessment" && index > 0) {
        const prev = allStepsWithLocks[index - 1]
        if (prev?.isCompleted) { step.isLocked = false; return }
      }

      const allPreviousCompleted = index === 0 || allStepsWithLocks.slice(0, index).every((s) => s.isCompleted)
      step.isLocked = !allPreviousCompleted
    })

    return allStepsWithLocks
  }

  const allStepsWithLocks = calculateStepLocks()

  const getStepTypeLabel = (type: string) => {
    switch (type) {
      case "content": return "Reading"
      case "video": return "Video"
      case "assessment": return "Quiz"
      default: return "Lesson"
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    )
  }

  const getAllResources = () => {
    const allResources: Array<{ url: string; title: string; description?: string; lessonTitle: string }> = []
    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        if (typeof lesson.resources === "string") {
          try { lesson.resources = JSON.parse(lesson.resources) } catch { lesson.resources = [] }
        }
        if (Array.isArray(lesson.resources) && lesson.resources.length > 0) {
          lesson.resources.forEach((resource: any) => {
            allResources.push({ ...resource, lessonTitle: lesson.title })
          })
        }
      })
    })
    return allResources
  }

  const allResources = getAllResources()

  const getAllAssessments = () => {
    const list: Array<{ title: string; lessonTitle: string; moduleTitle: string; score?: number; id: string; stepId: string }> = []
    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        lesson.assessments?.forEach((a) => {
          const stepId = `${lesson.id}-assessment-${a.id}`
          list.push({ title: a.title || "Assessment", lessonTitle: lesson.title, moduleTitle: module.title, score: isStepCompleted(stepId) ? getStepScore?.(stepId) : undefined, id: a.id, stepId })
        })
        lesson.quizzes?.forEach((q) => {
          const stepId = `${lesson.id}-quiz-${q.id}`
          list.push({ title: q.title || "Quiz", lessonTitle: lesson.title, moduleTitle: module.title, score: isStepCompleted(stepId) ? getStepScore?.(stepId) : undefined, id: q.id, stepId })
        })
      })
      if (module.final_assessment) {
        const stepId = `${module.id}-final-assessment`
        list.push({ title: module.final_assessment.title || "Final Assessment", lessonTitle: `${module.title} - Final ${module.final_assessment.type === "ASSESSMENT" ? "Assessment" : "Project"}`, moduleTitle: module.title, score: isStepCompleted(stepId) ? getStepScore?.(stepId) : undefined, id: module.final_assessment.id, stepId })
      }
    })
    return list
  }

  const allAssessments = getAllAssessments()

  const filteredModules = modules
    .map((module) => ({ ...module, lessons: module.lessons.filter((lesson) => lesson.title.toLowerCase().includes(searchQuery.toLowerCase())) }))
    .filter((module) => module.lessons.length > 0 || !searchQuery)

  const SidebarContent = () => (
    <>
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Course Progress</h3>
          <span className="text-lg font-bold text-primary">
            {Math.round(progressData?.overallProgress ?? courseProgress)}%
          </span>
        </div>
        <Progress value={progressData?.overallProgress ?? courseProgress} className="h-2.5" />
      </div>

      <Tabs defaultValue="outline" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 bg-background px-4 pt-4">
          <TabsTrigger value="outline" className="flex items-center gap-1.5 text-xs font-medium rounded">
            <BookOpen className="w-4 h-4" /><span className="hidden sm:inline">Outline</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1.5 text-xs font-medium rounded">
            <FileDown className="w-4 h-4" /><span className="hidden sm:inline">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-1.5 text-xs font-medium rounded">
            <Award className="w-4 h-4" /><span className="hidden sm:inline">Grades</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outline" className="flex-1 overflow-y-auto py-2 px-4 space-y-3">
          <div className="mb-4 sticky top-0 bg-background z-10 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="text" placeholder="Search lessons..." className="pl-9 pr-8 h-9 bg-muted/50 border-primary/20 focus:border-primary" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>

          <Accordion type="multiple" value={expandedModules} className="space-y-2">
            {filteredModules.map((module) => {
              const moduleSteps = [
                ...module.lessons.map((lesson) => ({ ...generateLessonStep(lesson), lessonId: lesson.id })),
                ...module.lessons.flatMap((lesson) => generateAssessmentSteps(lesson).map((step) => ({ ...step, lessonId: lesson.id }))),
                ...(module.final_assessment ? [{ id: `${module.id}-final-assessment`, type: "assessment" as const, title: module.final_assessment.title, duration: module.final_assessment.time_limit_minutes, isCompleted: isFinalAssessmentCompleted(), isLocked: false, lessonId: module.id }] : []),
              ]
              const completedCount = moduleSteps.filter((s) => s.isCompleted).length
              const moduleProgress = moduleSteps.length > 0 ? (completedCount / moduleSteps.length) * 100 : 0

              return (
                <AccordionItem key={module.id} value={module.id} className="border rounded bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 rounded-t-lg transition-colors" onClick={() => toggleModule(module.id)}>
                    <div className="grid items-center gap-3 w-full">
                      <div className="min-w-0 overflow-hidden">
                        <p className="font-semibold text-sm truncate">{module.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{completedCount} of {moduleSteps.length} complete</p>
                      </div>
                      <div className="w-full h-1.5 bg-primary/10 rounded overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${moduleProgress}%` }} />
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-3 pt-2 bg-background">
                    <div className="space-y-1.5">
                      {module.lessons.map((lesson) => {
                        const lessonStep = generateLessonStep(lesson)
                        const lessonWithLock = allStepsWithLocks?.find((s) => s.id === lessonStep.id)
                        const isLessonCompleted = lessonWithLock?.isCompleted ?? lessonStep.isCompleted
                        const isLessonLocked = isLessonCompleted ? false : (lessonWithLock?.isLocked ?? false)
                        const isLessonActive = currentStepId === lessonStep.id
                        const hasContent = lessonHasContent(lesson)
                        const hasVideo = lessonHasVideo(lesson)

                        return (
                          <div key={lesson.id} className="space-y-1">
                            <button
                              onClick={() => { if (!isLessonLocked) { onStepSelect(lessonStep.id); setIsMobileOpen(false) } }}
                              disabled={isLessonLocked}
                              className={`w-full text-left p-2.5 rounded border transition-all ${isLessonActive ? "bg-primary text-primary-foreground border-primary shadow-sm" : isLessonLocked ? "opacity-50 cursor-not-allowed hover:bg-muted/30" : "hover:bg-muted border-transparent hover:border-primary/20"}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="flex-shrink-0 mt-0.5">
                                  {isLessonCompleted ? <CheckCircle className="w-4 h-4 text-success" /> : isLessonLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : hasVideo && !hasContent ? <Video className="w-4 h-4 text-primary" /> : <BookOpen className="w-4 h-4 text-primary" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{lesson.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={isLessonActive ? "default" : "outline"} className={`text-xs font-medium ${isLessonActive && "bg-primary-foreground/20 rounded"}`}>Lesson</Badge>
                                    {hasContent && hasVideo && <div className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-primary" /><Video className="w-3 h-3 text-primary" /></div>}
                                    {hasContent && !hasVideo && <BookOpen className="w-3 h-3 text-primary" />}
                                    {!hasContent && hasVideo && <Video className="w-3 h-3 text-primary" />}
                                    {lesson.duration_minutes ? <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{lesson.duration_minutes}m</span> : <span className="text-xs text-muted-foreground">Self Paced</span>}
                                  </div>
                                </div>
                              </div>
                            </button>

                            {generateAssessmentSteps(lesson).map((assessmentStep) => {
                              const stepWithLock = allStepsWithLocks?.find((s) => s.id === assessmentStep.id)
                              const isAssessmentCompleted = stepWithLock?.isCompleted ?? assessmentStep.isCompleted
                              const isAssessmentLocked = isAssessmentCompleted ? false : (stepWithLock?.isLocked ?? false)
                              const isAssessmentActive = currentStepId === assessmentStep.id

                              let assessmentId = ""
                              if (assessmentStep.id.includes("-assessment-")) assessmentId = assessmentStep.id.slice(assessmentStep.id.indexOf("-assessment-") + "-assessment-".length)
                              else if (assessmentStep.id.includes("-quiz-")) assessmentId = assessmentStep.id.slice(assessmentStep.id.indexOf("-quiz-") + "-quiz-".length)

                              const gradedFailed = assessmentId ? isAssessmentGradedFailed(assessmentId) : false
                              const stillPending = assessmentId ? isAssessmentStillPending(assessmentId) : false

                              return (
                                <button
                                  key={assessmentStep.id}
                                  onClick={() => { if (!isAssessmentLocked) { onStepSelect(assessmentStep.id); setIsMobileOpen(false) } }}
                                  disabled={isAssessmentLocked}
                                  className={`w-full text-left p-2.5 rounded border transition-all ml-4 ${isAssessmentActive ? gradedFailed ? "bg-destructive/15 dark:bg-destructive/20/30 text-foreground border-destructive/40 shadow-sm" : "bg-warning/15 dark:bg-warning/20/30 text-foreground border-orange-300 shadow-sm" : isAssessmentLocked ? "opacity-50 cursor-not-allowed hover:bg-muted/30" : gradedFailed ? "hover:bg-destructive/10/50 border-transparent hover:border-destructive/30" : "hover:bg-muted/50 border-transparent hover:border-warning/30"}`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {isAssessmentCompleted ? <CheckCircle className="w-4 h-4 text-success" /> : isAssessmentLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : gradedFailed ? <XCircle className="w-4 h-4 text-destructive" /> : stillPending ? <Clock className="w-4 h-4 text-primary" /> : <Award className="w-4 h-4 text-warning" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${gradedFailed ? "text-destructive dark:text-destructive" : "text-warning dark:text-warning"}`}>{assessmentStep.title}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className={`text-xs font-medium ${gradedFailed ? "bg-destructive/10 dark:bg-destructive/20/30 text-destructive dark:text-destructive border-destructive/30 dark:border-destructive/30" : stillPending ? "bg-primary/10 dark:bg-primary/20/30 text-primary dark:text-primary border-primary/30 dark:border-primary/30" : "bg-warning/10 dark:bg-warning/20/30 text-warning dark:text-warning border-warning/30 dark:border-orange-800"}`}>
                                          {gradedFailed ? "Failed — Retake" : stillPending ? "Awaiting Grade" : getStepTypeLabel(assessmentStep.type)}
                                        </Badge>
                                        {assessmentStep.duration ? <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{assessmentStep.duration}m</span> : <span className="text-xs text-muted-foreground">Self Paced</span>}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}

                      {module.final_assessment && (() => {
                        const stepId = `${module.id}-final-assessment`
                        const stepWithLock = allStepsWithLocks?.find((s) => s.id === stepId)
                        const isFinalCompleted = isStepCompleted(stepId)
                        const isFinalLocked = isFinalCompleted ? false : (stepWithLock?.isLocked ?? false)
                        const isFinalActive = currentStepId === stepId
                        const finalGradedFailed = isFinalAssessmentGradedFailed()
                        const finalStillPending = isFinalAssessmentStillPending()

                        return (
                          <div className="pt-2 mt-2 border-t">
                            <button
                              onClick={() => { if (!isFinalLocked) { onStepSelect(stepId); setIsMobileOpen(false) } }}
                              disabled={isFinalLocked}
                              className={`w-full text-left p-2.5 rounded-md border transition-all ${isFinalActive ? finalGradedFailed ? "bg-destructive/15 text-foreground border-destructive/40 shadow-sm" : "bg-primary text-primary-foreground border-primary shadow-sm" : isFinalLocked ? "opacity-50 cursor-not-allowed" : finalGradedFailed ? "hover:bg-destructive/10/50 border-transparent hover:border-destructive/30" : "hover:bg-muted border-transparent hover:border-primary/20"}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="flex-shrink-0 mt-0.5">
                                  {isFinalCompleted ? <CheckCircle className="w-4 h-4 text-success" /> : isFinalLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : finalGradedFailed ? <XCircle className="w-4 h-4 text-destructive" /> : finalStillPending ? <Clock className="w-4 h-4 text-primary" /> : <ShieldQuestion className="w-4 h-4 text-ring" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${finalGradedFailed ? "text-destructive dark:text-destructive" : "text-chart-2"}`}>{module.final_assessment.title || "Final Assessment"}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={isFinalActive ? "default" : "outline"} className={`text-xs font-medium ${isFinalActive && !finalGradedFailed && "bg-primary-foreground/20 rounded"} ${finalGradedFailed ? "bg-destructive/10 text-destructive border-destructive/30" : finalStillPending ? "bg-primary/10 text-primary border-primary/30" : ""}`}>
                                      {finalGradedFailed ? "Failed — Retake" : finalStillPending ? "Awaiting Grade" : module.final_assessment.type === "ASSESSMENT" ? "Quiz" : "Project"}
                                    </Badge>
                                    {module.final_assessment.time_limit_minutes && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{module.final_assessment.time_limit_minutes}m</span>}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          <div className="mt-4">
            <button
              onClick={() => { if (allStepsCompleted) { onCourseCompletionSelect(); setIsMobileOpen(false) } }}
              disabled={!allStepsCompleted}
              className={`w-full text-left p-3 rounded border-2 transition-all ${currentStepId === "course-completion" ? "bg-primary text-primary-foreground border-primary" : allStepsCompleted ? "hover:bg-success/10 dark:hover:bg-success/20/20 border-success/30 dark:border-success/30" : "opacity-50 cursor-not-allowed border-transparent"}`}
            >
              <div className="flex items-center gap-3">
                {allStepsCompleted ? <Award className="w-5 h-5 text-success" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                <div className="flex-1">
                  <p className="font-semibold text-sm">Course Completion</p>
                  <p className="text-xs text-muted-foreground">
                    {allStepsCompleted ? "View achievements" : "Pass all assessments to unlock"}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </TabsContent>

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
                      {resource.description && <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">{resource.description}</p>}
                    </div>
                  </div>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                    <FileDown className="w-3 h-3" />View Resource
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

        <TabsContent value="assessments" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {allAssessments.map((assessment) => (
              <div key={assessment.id} className="p-3 border rounded bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { onStepSelect(assessment.stepId); setIsMobileOpen(false) }}>
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
                        <Badge variant={assessment.score >= 80 ? "default" : assessment.score >= 60 ? "secondary" : "destructive"} className="text-xs mt-1 rounded">
                          {assessment.score >= 80 ? "Excellent" : assessment.score >= 60 ? "Passed" : "Review"}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs rounded">Pending</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  )

  return (
    <>
      <div className="lg:hidden fixed left-4 bottom-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg h-14 w-14"><Menu className="w-6 h-6" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 flex flex-col"><SidebarContent /></SheetContent>
        </Sheet>
      </div>
      <div className="hidden lg:flex fixed left-0 top-[73px] w-85 border-r bg-background h-[calc(100vh-73px)] overflow-hidden z-[5] flex-col">
        <SidebarContent />
      </div>
    </>
  )
}