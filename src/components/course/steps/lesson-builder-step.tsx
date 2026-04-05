// @ts-nocheck

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, PlayCircle, FileText, Eye } from "lucide-react"
import { LessonEditor } from "../lesson/lesson-editor"
import { LessonPreview } from "../lesson/lesson-preview"
import type { Module, Lesson } from "@/types"

interface LessonBuilderStepProps {
  modules: Module[]
  setModules: (modules: Module[]) => void
  onNext: () => void
  onPrevious: () => void
}

export function LessonBuilderStep({ modules, setModules, onNext, onPrevious }: LessonBuilderStepProps) {
  const [selectedModule, setSelectedModule] = useState<string>(modules[0]?.id || "")
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const currentModule = modules.find((m) => m.id === selectedModule)
  const currentLesson = currentModule?.lessons?.find((l) => l.id === selectedLesson)
  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0)

  const addLesson = (moduleId: string) => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: "New Lesson",
      content: "",
      duration_minutes: 0,
      order_index: (currentModule?.lessons?.length || 0) + 1,
      module_id: moduleId,
      course_id: "",
      type: "VIDEO",
      is_published: false,
      is_preview: false,
      assessments: [],
      resources: [],
      created_at: new Date(),
      updated_at: new Date(),
    }

    setModules(
      modules.map((module) =>
        module.id === moduleId ? { ...module, lessons: [...(module.lessons || []), newLesson] } : module,
      ),
    )

    setSelectedLesson(newLesson.id)
  }

  const updateLesson = (lessonId: string, updates: Partial<Lesson>) => {
    setModules(
      modules.map((module) => ({
        ...module,
        lessons: module.lessons?.map((lesson) => (lesson.id === lessonId ? { ...lesson, ...updates } : lesson)),
      })),
    )
  }

  const deleteLesson = (lessonId: string) => {
    setModules(
      modules.map((module) => ({
        ...module,
        lessons: module.lessons?.filter((lesson) => lesson.id !== lessonId),
      })),
    )
    setSelectedLesson(null)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">Create Engaging Lessons</h2>
        <p className="text-muted-foreground dark:text-muted-foreground">
          Build interactive content with videos, text, quizzes, and more
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {modules.length} Modules
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <PlayCircle className="w-4 h-4" />
            {totalLessons} Lessons
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* Module & Lesson Navigation */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Course Structure</CardTitle>
              <CardDescription>Select a module to add lessons</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
              {modules.map((module) => (
                <div key={module.id} className="space-y-2">
                  <Button
                    variant={selectedModule === module.id ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => setSelectedModule(module.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{module.title}</div>
                      <div className="text-xs opacity-70">{module.lessons?.length || 0} lessons</div>
                    </div>
                  </Button>

                  {selectedModule === module.id && (
                    <div className="ml-4 space-y-1">
                      {module.lessons?.map((lesson, index) => (
                        <Button
                          key={lesson.id}
                          variant={selectedLesson === lesson.id ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => setSelectedLesson(lesson.id)}
                        >
                          <span className="text-xs mr-2 flex-shrink-0">{index + 1}.</span>
                          <span className="truncate">{lesson.title}</span>
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-primary-600"
                        onClick={() => addLesson(module.id)}
                      >
                        <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Add Lesson</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Lesson Content Area */}
        <div className="lg:col-span-3">
          {selectedLesson && currentLesson ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate">{currentLesson.title}</span>
                    </CardTitle>
                    <CardDescription className="truncate">Module: {currentModule?.title}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[500px] overflow-hidden p-0">
                <div className="h-full overflow-y-auto p-6">
                  {previewMode ? (
                    <LessonPreview lesson={currentLesson} />
                  ) : (
                    <LessonEditor
                      lesson={currentLesson}
                      onUpdate={(updates) => updateLesson(currentLesson.id, updates)}
                      onDelete={() => deleteLesson(currentLesson.id)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">Ready to Create Lessons?</h3>
                <p className="text-muted-foreground dark:text-muted-foreground mb-6">
                  Select a module from the left and start adding engaging lessons
                </p>
                {currentModule && (
                  <Button onClick={() => addLesson(currentModule.id)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Lesson
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Progress & Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onPrevious}>
          Previous Step
        </Button>

        <div className="text-center">
          {totalLessons > 0 && (
            <div className="bg-success/10 dark:bg-success/20/20 border border-success/30 dark:border-success/30 rounded-lg px-4 py-2">
              <p className="text-success dark:text-success text-sm">
                Great progress! You've created {totalLessons} lesson{totalLessons !== 1 ? "s" : ""} across{" "}
                {modules.length} module{modules.length !== 1 ? "s" : ""}.
              </p>
            </div>
          )}
        </div>

        <Button onClick={onNext} disabled={totalLessons === 0} size="lg" className="px-8">
          Continue to Assessments
        </Button>
      </div>
    </div>
  )
}