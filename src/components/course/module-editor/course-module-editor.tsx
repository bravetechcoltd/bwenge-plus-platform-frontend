// @ts-nocheck

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, FileText, Video, BookOpen, Target, Clock, Zap, Save } from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { Module, Lesson, Assessment } from "@/types"

interface ModuleEditorProps {
  module: Module
  courseId: string
  onSave: (moduleData: Module) => void
  onCancel: () => void
}

export default function ModuleEditor({ module, courseId, onSave, onCancel }: ModuleEditorProps) {
  const [moduleData, setModuleData] = useState<Module>({
    ...module,
    course_id: courseId,
    lessons: module.lessons || [],
  })

  const [newLessonTitle, setNewLessonTitle] = useState("")

  const updateModuleField = (field: keyof Module, value: any) => {
    setModuleData(prev => ({ ...prev, [field]: value }))
  }

  const addLesson = () => {
    if (!newLessonTitle.trim()) return

    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      course_id: courseId,
      module_id: moduleData.id,
      title: newLessonTitle,
      content: "",
      video_url: "",
      thumbnail_url: "",
      duration_minutes: 0,
      order_index: (moduleData.lessons?.length || 0),
      type: "VIDEO" as any,
      is_preview: false,
      is_published: true,
      resources: [],
      course: null as any,
      created_at: new Date(),
      updated_at: new Date(),
    }

    setModuleData(prev => ({
      ...prev,
      lessons: [...(prev.lessons || []), newLesson]
    }))
    setNewLessonTitle("")
  }

  const updateLesson = (lessonId: string, updates: Partial<Lesson>) => {
    setModuleData(prev => ({
      ...prev,
      lessons: prev.lessons?.map(lesson =>
        lesson.id === lessonId ? { ...lesson, ...updates } : lesson
      ) || []
    }))
  }

  const deleteLesson = (lessonId: string) => {
    setModuleData(prev => ({
      ...prev,
      lessons: prev.lessons?.filter(lesson => lesson.id !== lessonId) || []
    }))
  }

  const addAssessment = (lessonId: string) => {
    const newAssessment: Assessment = {
      id: `assessment-${Date.now()}`,
      course_id: courseId,
      module_id: moduleData.id,
      lesson_id: lessonId,
      title: "New Assessment",
      description: "",
      type: "QUIZ",
      questions: [],
      passing_score: 70,
      max_attempts: 3,
      time_limit_minutes: 30,
      is_published: true,
      is_final_assessment: false,
      is_module_final: false,
      created_at: new Date(),
      updated_at: new Date(),
    }

    setModuleData(prev => ({
      ...prev,
      lessons: prev.lessons?.map(lesson =>
        lesson.id === lessonId
          ? {
              ...lesson,
              assessments: [...(lesson.assessments || []), newAssessment]
            }
          : lesson
      ) || []
    }))
  }

  const handleSave = () => {
    onSave(moduleData)
  }

  return (
    <div className="space-y-6">
      {/* Module Details Card */}
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader className="border-b bg-white/60 dark:bg-gray-900/60">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Module Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Module Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={moduleData.title}
              onChange={(e) => updateModuleField("title", e.target.value)}
              placeholder="Enter module title"
              className="h-11 border-2"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description
            </Label>
            <RichTextEditor
              value={moduleData.description || ""}
              onChange={(value) => updateModuleField("description", value)}
              placeholder="Describe what this module covers..."
              className="border-2 rounded-lg overflow-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order" className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                Order Index
              </Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={moduleData.order_index || 0}
                onChange={(e) => updateModuleField("order_index", parseInt(e.target.value) || 0)}
                className="h-11 border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Estimated Duration (hours)
              </Label>
              <Input
                id="duration"
                type="number"
                min="0"
                step="0.5"
                value={moduleData.estimated_duration_hours || 0}
                onChange={(e) => updateModuleField("estimated_duration_hours", parseFloat(e.target.value) || 0)}
                className="h-11 border-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons Section */}
      <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardHeader className="border-b bg-white/60 dark:bg-gray-900/60">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-green-600" />
              Lessons
            </span>
            <Badge variant="outline" className="text-base px-3 py-1">
              {moduleData.lessons?.length || 0} lessons
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Add New Lesson */}
          <div className="space-y-2 p-4 border-2 border-dashed border-green-200 rounded-lg bg-white/60 dark:bg-gray-900/60">
            <Label htmlFor="newLesson" className="text-sm font-semibold">Add New Lesson</Label>
            <div className="flex gap-2">
              <Input
                id="newLesson"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Enter lesson title"
                onKeyPress={(e) => e.key === "Enter" && addLesson()}
                className="h-11 border-2"
              />
              <Button onClick={addLesson} className="h-11 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Lessons List */}
          {moduleData.lessons && moduleData.lessons.length > 0 && (
            <div className="space-y-4">
              {moduleData.lessons.map((lesson, index) => (
                <Card key={lesson.id} className="border-2 bg-white dark:bg-gray-950">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{lesson.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            {lesson.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLesson(lesson.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`lesson-title-${lesson.id}`} className="text-sm font-medium">Title</Label>
                        <Input
                          id={`lesson-title-${lesson.id}`}
                          value={lesson.title}
                          onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                          className="border-2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`lesson-type-${lesson.id}`} className="text-sm font-medium">Type</Label>
                        <Select
                          value={lesson.type}
                          onValueChange={(value) => updateLesson(lesson.id, { type: value as any })}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="VIDEO">Video</SelectItem>
                            <SelectItem value="TEXT">Text</SelectItem>
                            <SelectItem value="QUIZ">Quiz</SelectItem>
                            <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                            <SelectItem value="LIVE_SESSION">Live Session</SelectItem>
                            <SelectItem value="RESOURCE">Resource</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`lesson-duration-${lesson.id}`} className="text-sm font-medium">Duration (minutes)</Label>
                        <Input
                          id={`lesson-duration-${lesson.id}`}
                          type="number"
                          min="0"
                          value={lesson.duration_minutes}
                          onChange={(e) => updateLesson(lesson.id, { duration_minutes: parseInt(e.target.value) || 0 })}
                          className="border-2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`lesson-order-${lesson.id}`} className="text-sm font-medium">Order</Label>
                        <Input
                          id={`lesson-order-${lesson.id}`}
                          type="number"
                          min="0"
                          value={lesson.order_index}
                          onChange={(e) => updateLesson(lesson.id, { order_index: parseInt(e.target.value) || 0 })}
                          className="border-2"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`lesson-content-${lesson.id}`} className="text-sm font-medium">Content</Label>
                      <RichTextEditor
                        value={lesson.content || ""}
                        onChange={(value) => updateLesson(lesson.id, { content: value })}
                        placeholder="Enter lesson content..."
                        className="border-2 rounded-lg overflow-hidden"
                      />
                    </div>

                    {/* Assessments */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Target className="w-4 h-4 text-amber-600" />
                          Assessments
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addAssessment(lesson.id)}
                          className="border-2"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Assessment
                        </Button>
                      </div>
                      
                      {lesson.assessments && lesson.assessments.length > 0 ? (
                        <div className="space-y-2">
                          {lesson.assessments.map(assessment => (
                            <div key={assessment.id} className="p-3 border-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
                              <div>
                                <span className="font-medium">{assessment.title}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {assessment.questions?.length || 0} questions
                                </Badge>
                              </div>
                              <Badge variant="outline" className="border-2">{assessment.type}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic text-center py-3 border-2 border-dashed rounded-lg">
                          No assessments added yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(!moduleData.lessons || moduleData.lessons.length === 0) && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-white/60 dark:bg-gray-900/60">
              <BookOpen className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-muted-foreground font-medium">No lessons yet. Add your first lesson above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pt-4 border-t-2">
        <Button variant="outline" onClick={onCancel} className="h-11 px-6 border-2">
          Cancel
        </Button>
        <Button onClick={handleSave} className="h-11 px-8">
          <Save className="w-4 h-4 mr-2" />
          Save Module
        </Button>
      </div>
    </div>
  )
}