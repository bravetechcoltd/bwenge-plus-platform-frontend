// @ts-nocheck

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { BookOpen, FileText, Trophy, Trash2, AlertCircle, Plus, Video, ImageIcon, FileDown, Clock, Briefcase, Zap, Check, ListPlus, Type, CheckSquare, Hash, Image as ImageIcon2, Eye } from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { Module, Lesson, Assessment, Question } from "@/types"

interface ContentEditorProps {
  item: {
    id: string
    type: "module" | "lesson" | "assessment" | "module_final_assessment"
    title: string
    moduleId?: string
    lessonId?: string
    data: Module | Lesson | Assessment
  }
  modules: Module[]
  onUpdate: (updates: any) => void
  onDelete: () => void
}

export function ContentEditor({ item, modules, onUpdate, onDelete }: ContentEditorProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [currentData, setCurrentData] = useState<Module | Lesson | Assessment>(item.data)

  // Sync when the item prop changes
  useEffect(() => {
    setCurrentData(item.data)
  }, [item])

  if (item.type === "module") {
    const module = currentData as Module
    return (
      <Card className="h-full overflow-y-auto border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <BookOpen className="w-5 h-5 text-[#0158B7]" />
                {module.title || "Untitled Module"}
              </CardTitle>
              <CardDescription className="text-gray-600">Edit module details</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (deleteConfirm ? onDelete() : setDeleteConfirm(true))}
              className={`${deleteConfirm ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-red-600 hover:bg-red-50"} border border-red-300`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteConfirm ? "Confirm Delete" : "Delete"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="module-title" className="text-gray-900 font-medium">Module Title</Label>
            <Input
              id="module-title"
              value={module.title}
              onChange={(e) => {
                setCurrentData({ ...module, title: e.target.value })
                onUpdate({ title: e.target.value })
              }}
              placeholder="e.g., Introduction to React"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-description" className="text-gray-900 font-medium">Description</Label>
            <Textarea
              id="module-description"
              value={module.description || ""}
              onChange={(e) => {
                setCurrentData({ ...module, description: e.target.value })
                onUpdate({ description: e.target.value })
              }}
              placeholder="Describe what students will learn in this module..."
              rows={4}
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-duration" className="text-gray-900 font-medium">Estimated Duration (hours)</Label>
            <Input
              id="module-duration"
              type="number"
              value={module.estimated_duration_hours || 0}
              onChange={(e) => {
                setCurrentData({ ...module, estimated_duration_hours: Number(e.target.value) })
                onUpdate({ estimated_duration_hours: Number(e.target.value) })
              }}
              placeholder="Estimated duration in hours"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-[#0158B7] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Module Statistics</p>
                <p>
                  {module.lessons?.length || 0} lessons •{" "}
                  {module.lessons?.reduce((acc, l) => acc + (l.assessments?.length || 0), 0) || 0} assessments
                  {module.final_assessment && " • Final Assessment ✓"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (item.type === "lesson") {
    const lesson = currentData as Lesson
    const module = modules.find((m) => m.id === item.moduleId)

    return (
      <Card className="h-full overflow-y-auto border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileText className="w-5 h-5 text-[#0158B7]" />
                {lesson.title || "Untitled Lesson"}
              </CardTitle>
              <CardDescription className="text-gray-600">{module?.title}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (deleteConfirm ? onDelete() : setDeleteConfirm(true))}
              className={`${deleteConfirm ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-red-600 hover:bg-red-50"} border border-red-300`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteConfirm ? "Confirm Delete" : "Delete"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="lesson-title" className="text-gray-900 font-medium">Lesson Title</Label>
            <Input
              id="lesson-title"
              value={lesson.title}
              onChange={(e) => {
                setCurrentData({ ...lesson, title: e.target.value })
                onUpdate({ title: e.target.value })
              }}
              placeholder="e.g., React Hooks Basics"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
            />
          </div>

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="content"
                className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600"
              >
                Content
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600"
              >
                Settings
              </TabsTrigger>
              <TabsTrigger 
                value="resources"
                className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600"
              >
                Resources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-type" className="text-gray-900 font-medium">Lesson Type</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    {lesson.type === "VIDEO" && <Video className="w-4 h-4 text-gray-500" />}
                    {lesson.type === "TEXT" && <FileText className="w-4 h-4 text-gray-500" />}
                    {lesson.type === "QUIZ" && <CheckSquare className="w-4 h-4 text-gray-500" />}
                    {lesson.type === "ASSIGNMENT" && <Briefcase className="w-4 h-4 text-gray-500" />}
                    {lesson.type === "RESOURCE" && <FileDown className="w-4 h-4 text-gray-500" />}
                  </div>
                  <select
                    id="lesson-type"
                    value={lesson.type || "VIDEO"}
                    onChange={(e) => {
                      setCurrentData({ ...lesson, type: e.target.value })
                      onUpdate({ type: e.target.value })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 bg-white text-gray-900"
                  >
                    <option value="VIDEO">Video Lesson</option>
                    <option value="TEXT">Text Lesson</option>
                    <option value="QUIZ">Quiz Lesson</option>
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="RESOURCE">Resource</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson-content" className="text-gray-900 font-medium">Lesson Content</Label>
                <RichTextEditor
                  value={lesson.content || ""}
                  onChange={(value) => {
                    setCurrentData({ ...lesson, content: value })
                    onUpdate({ content: value })
                  }}
                  className="min-h-[300px] border-gray-300 rounded-lg overflow-hidden"
                />
              </div>

              {(lesson.type === "VIDEO" || !lesson.type) && (
                <div className="space-y-2">
                  <Label htmlFor="video-url" className="text-gray-900 font-medium">Video URL</Label>
                  <Input
                    id="video-url"
                    value={lesson.video_url || ""}
                    onChange={(e) => {
                      setCurrentData({ ...lesson, video_url: e.target.value })
                      onUpdate({ video_url: e.target.value })
                    }}
                    placeholder="https://youtube.com/watch?v=... or any video URL"
                    className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="thumbnail-url" className="text-gray-900 font-medium">Thumbnail URL</Label>
                <Input
                  id="thumbnail-url"
                  value={lesson.thumbnail_url || ""}
                  onChange={(e) => {
                    setCurrentData({ ...lesson, thumbnail_url: e.target.value })
                    onUpdate({ thumbnail_url: e.target.value })
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-duration" className="text-gray-900 font-medium">Duration (minutes)</Label>
                  <Input
                    id="lesson-duration"
                    type="number"
                    value={lesson.duration_minutes || 0}
                    onChange={(e) => {
                      setCurrentData({ ...lesson, duration_minutes: Number(e.target.value) })
                      onUpdate({ duration_minutes: Number(e.target.value) })
                    }}
                    placeholder="15"
                    className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-0.5">
                    <Label htmlFor="preview-lesson" className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer">
                      <Eye className="w-4 h-4 text-[#0158B7]" />
                      Preview Lesson
                    </Label>
                    <p className="text-sm text-gray-600">Allow students to preview this lesson</p>
                  </div>
                  <Switch
                    id="preview-lesson"
                    checked={lesson.is_preview || false}
                    onCheckedChange={(checked) => {
                      setCurrentData({ ...lesson, is_preview: checked })
                      onUpdate({ is_preview: checked })
                    }}
                    className="data-[state=checked]:bg-[#0158B7]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-0.5">
                    <Label htmlFor="publish-lesson" className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer">
                      <Zap className="w-4 h-4 text-[#0158B7]" />
                      Published
                    </Label>
                    <p className="text-sm text-gray-600">Make this lesson available to students</p>
                  </div>
                  <Switch
                    id="publish-lesson"
                    checked={lesson.is_published !== false}
                    onCheckedChange={(checked) => {
                      setCurrentData({ ...lesson, is_published: checked })
                      onUpdate({ is_published: checked })
                    }}
                    className="data-[state=checked]:bg-[#0158B7]"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium text-gray-900">Lesson Resources</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Add downloadable resources, links, and materials for this lesson
                  </p>
                </div>

                <div className="space-y-3">
                  {(lesson.resources || []).map((resource, index) => (
                    <Card key={index} className="p-4 border border-gray-200 bg-white">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`resource-title-${index}`} className="text-sm text-gray-900 font-medium">Resource Title</Label>
                          <Input
                            id={`resource-title-${index}`}
                            value={resource.title}
                            onChange={(e) => {
                              const newResources = [...(lesson.resources || [])]
                              newResources[index].title = e.target.value
                              setCurrentData({ ...lesson, resources: newResources })
                              onUpdate({ resources: newResources })
                            }}
                            placeholder="e.g., Sample Code, PDF Guide"
                            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`resource-url-${index}`} className="text-sm text-gray-900 font-medium">Resource URL</Label>
                          <Input
                            id={`resource-url-${index}`}
                            value={resource.url}
                            onChange={(e) => {
                              const newResources = [...(lesson.resources || [])]
                              newResources[index].url = e.target.value
                              setCurrentData({ ...lesson, resources: newResources })
                              onUpdate({ resources: newResources })
                            }}
                            placeholder="https://example.com/resource"
                            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`resource-type-${index}`} className="text-sm text-gray-900 font-medium">Resource Type</Label>
                          <Input
                            id={`resource-type-${index}`}
                            value={resource.type || "link"}
                            onChange={(e) => {
                              const newResources = [...(lesson.resources || [])]
                              newResources[index].type = e.target.value
                              setCurrentData({ ...lesson, resources: newResources })
                              onUpdate({ resources: newResources })
                            }}
                            placeholder="pdf, link, code, etc."
                            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newResources = lesson.resources?.filter((_, i) => i !== index) || []
                            setCurrentData({ ...lesson, resources: newResources })
                            onUpdate({ resources: newResources })
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full border border-red-200"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Resource
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    const newResources = [...(lesson.resources || []), { 
                      title: "", 
                      url: "", 
                      type: "link" 
                    }]
                    setCurrentData({ ...lesson, resources: newResources })
                    onUpdate({ resources: newResources })
                  }}
                  className="w-full bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }


if (item.type === "assessment" || item.type === "module_final_assessment") {
  const assessment = currentData as Assessment
  const module = modules.find((m) => m.id === item.moduleId)
  const lesson = module?.lessons?.find((l) => l.id === item.lessonId)

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `question-${Date.now()}`,
      question: "New Question",
      type: "MULTIPLE_CHOICE",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correct_answer: "",
      points: 1,
      order_index: (assessment.questions?.length || 0) + 1,
    }
    
    const updatedAssessment = {
      ...assessment,
      questions: [...(assessment.questions || []), newQuestion]
    }
    
    setCurrentData(updatedAssessment)
    onUpdate({ questions: updatedAssessment.questions })
  }

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updatedQuestions = [...(assessment.questions || [])]
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates }
    
    const updatedAssessment = { ...assessment, questions: updatedQuestions }
    setCurrentData(updatedAssessment)
    onUpdate({ questions: updatedQuestions })
  }

  const deleteQuestion = (index: number) => {
    const updatedQuestions = (assessment.questions || []).filter((_, i) => i !== index)
    const updatedAssessment = { ...assessment, questions: updatedQuestions }
    setCurrentData(updatedAssessment)
    onUpdate({ questions: updatedQuestions })
  }

  return (
    <Card className="h-full overflow-y-auto border border-gray-200 bg-white shadow-sm">
      <CardHeader className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Trophy className="w-5 h-5 text-[#0158B7]" />
              {assessment.title || "Untitled Assessment"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {module?.title} {lesson ? `• ${lesson.title}` : ''}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (deleteConfirm ? onDelete() : setDeleteConfirm(true))}
            className={`${deleteConfirm ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-red-600 hover:bg-red-50"} border border-red-300`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteConfirm ? "Confirm Delete" : "Delete"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="assessment-title" className="text-gray-900 font-medium">Assessment Title</Label>
          <Input
            id="assessment-title"
            value={assessment.title}
            onChange={(e) => {
              setCurrentData({ ...assessment, title: e.target.value })
              onUpdate({ title: e.target.value })
            }}
            placeholder="e.g., Module 1 Quiz"
            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assessment-description" className="text-gray-900 font-medium">Description</Label>
          <Textarea
            id="assessment-description"
            value={assessment.description || ""}
            onChange={(e) => {
              setCurrentData({ ...assessment, description: e.target.value })
              onUpdate({ description: e.target.value })
            }}
            placeholder="Assessment description and instructions"
            rows={3}
            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assessment-type" className="text-gray-900 font-medium">Assessment Type</Label>
            <select
              id="assessment-type"
              value={assessment.type || "QUIZ"}
              onChange={(e) => {
                setCurrentData({ ...assessment, type: e.target.value })
                onUpdate({ type: e.target.value })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 bg-white text-gray-900"
            >
              <option value="QUIZ">Quiz</option>
              <option value="EXAM">Exam</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passing-score" className="text-gray-900 font-medium">Passing Score (%)</Label>
            <Input
              id="passing-score"
              type="number"
              min="0"
              max="100"
              value={assessment.passing_score || 70}
              onChange={(e) => {
                setCurrentData({ ...assessment, passing_score: Number(e.target.value) })
                onUpdate({ passing_score: Number(e.target.value) })
              }}
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="time-limit" className="text-gray-900 font-medium">Time Limit (minutes)</Label>
            <Input
              id="time-limit"
              type="number"
              min="0"
              value={assessment.time_limit_minutes || ""}
              onChange={(e) => {
                setCurrentData({ ...assessment, time_limit_minutes: Number(e.target.value) || null })
                onUpdate({ time_limit_minutes: Number(e.target.value) || null })
              }}
              placeholder="No time limit"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-attempts" className="text-gray-900 font-medium">Max Attempts</Label>
            <Input
              id="max-attempts"
              type="number"
              min="1"
              value={assessment.max_attempts || 3}
              onChange={(e) => {
                setCurrentData({ ...assessment, max_attempts: Number(e.target.value) })
                onUpdate({ max_attempts: Number(e.target.value) })
              }}
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
            />
          </div>
        </div>

        {/* Add is_published switch for assessments */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="space-y-0.5">
            <Label htmlFor="publish-assessment" className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer">
              <Zap className="w-4 h-4 text-[#0158B7]" />
              Published
            </Label>
            <p className="text-sm text-gray-600">Make this assessment available to students</p>
          </div>
          <Switch
            id="publish-assessment"
            checked={assessment.is_published !== false}
            onCheckedChange={(checked) => {
              setCurrentData({ ...assessment, is_published: checked })
              onUpdate({ is_published: checked })
            }}
            className="data-[state=checked]:bg-[#0158B7]"
          />
        </div>

        {/* Questions Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-medium text-gray-900">Questions</Label>
            <Button 
              size="sm" 
              onClick={addQuestion}
              className="bg-[#0158B7] hover:bg-[#014A9C] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {(assessment.questions || []).map((question, index) => (
              <Card key={question.id || index} className="p-4 border border-gray-200 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[#0158B7]" />
                    <span className="font-medium text-gray-900">Question {index + 1}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteQuestion(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`question-text-${index}`} className="text-gray-900 font-medium">Question Text</Label>
                    <Textarea
                      id={`question-text-${index}`}
                      value={question.question}
                      onChange={(e) => updateQuestion(index, { question: e.target.value })}
                      placeholder="Enter your question here"
                      rows={2}
                      className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`question-type-${index}`} className="text-gray-900 font-medium">Question Type</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        {question.type === "MULTIPLE_CHOICE" && <ListPlus className="w-4 h-4 text-gray-500" />}
                        {question.type === "TRUE_FALSE" && <Check className="w-4 h-4 text-gray-500" />}
                        {question.type === "SHORT_ANSWER" && <Type className="w-4 h-4 text-gray-500" />}
                        {question.type === "ESSAY" && <FileText className="w-4 h-4 text-gray-500" />}
                      </div>
                      <select
                        id={`question-type-${index}`}
                        value={question.type || "MULTIPLE_CHOICE"}
                        onChange={(e) => {
                          const value = e.target.value
                          const updates: any = { type: value }
                          if (value === "MULTIPLE_CHOICE") {
                            updates.options = ["Option 1", "Option 2", "Option 3", "Option 4"]
                            updates.correct_answer = ""
                          } else if (value === "TRUE_FALSE") {
                            updates.options = ["True", "False"]
                            updates.correct_answer = ""
                          } else {
                            updates.options = []
                            updates.correct_answer = ""
                          }
                          updateQuestion(index, updates)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 bg-white text-gray-900"
                      >
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="TRUE_FALSE">True/False</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="ESSAY">Essay</option>
                      </select>
                    </div>
                  </div>

                  {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && (
                    <div className="space-y-2">
                      <Label className="text-gray-900 font-medium">Options</Label>
                      {(question.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2 items-center">
                          <Input
                            id={`question-${index}-option-${optionIndex}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(question.options || [])]
                              newOptions[optionIndex] = e.target.value
                              updateQuestion(index, { options: newOptions })
                            }}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuestion(index, { correct_answer: option })}
                            className={`px-3 py-2 rounded text-sm font-medium min-w-[80px] transition-colors ${
                              question.correct_answer === option 
                                ? 'bg-[#0158B7] text-white border border-[#0158B7]' 
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {question.correct_answer === option ? 'Correct ✓' : 'Set Correct'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(question.type === "SHORT_ANSWER" || question.type === "ESSAY") && (
                    <div className="space-y-2">
                      <Label htmlFor={`correct-answer-${index}`} className="text-gray-900 font-medium">Correct Answer</Label>
                      <Textarea
                        id={`correct-answer-${index}`}
                        value={question.correct_answer || ""}
                        onChange={(e) => updateQuestion(index, { correct_answer: e.target.value })}
                        placeholder="Enter the correct answer"
                        rows={2}
                        className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`question-points-${index}`} className="text-gray-900 font-medium">Points</Label>
                    <Input
                      id={`question-points-${index}`}
                      type="number"
                      min="0"
                      value={question.points || 1}
                      onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })}
                      className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

  return null
}