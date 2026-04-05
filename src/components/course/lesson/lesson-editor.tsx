// @ts-nocheck
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Video, ImageIcon, FileDown, Trash2, GripVertical, Clock, Briefcase, Zap, Check, Plus, Eye, BookOpen } from "lucide-react"
import type { Lesson } from "@/types"

interface LessonEditorProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
  onDelete: () => void
}

export function LessonEditor({ lesson, onUpdate, onDelete }: LessonEditorProps) {
  const [activeTab, setActiveTab] = useState("content")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleSave = () => {
    // Any specific save logic if needed
    setHasUnsavedChanges(false)
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <Video className="w-4 h-4" />
      case "TEXT":
        return <FileText className="w-4 h-4" />
      case "QUIZ":
        return <BookOpen className="w-4 h-4" />
      case "ASSIGNMENT":
        return <Briefcase className="w-4 h-4" />
      case "RESOURCE":
        return <FileDown className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input
                value={lesson.title}
                onChange={(e) => {
                  onUpdate({ title: e.target.value })
                  setHasUnsavedChanges(true)
                }}
                placeholder="Enter lesson title"
                className="text-lg font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label>Lesson Type</Label>
              <Select
                value={lesson.type || "VIDEO"}
                onValueChange={(value) => {
                  onUpdate({ type: value })
                  setHasUnsavedChanges(true)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lesson type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video Lesson
                    </div>
                  </SelectItem>
                  <SelectItem value="TEXT">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Text Lesson
                    </div>
                  </SelectItem>
                  <SelectItem value="QUIZ">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Quiz Lesson
                    </div>
                  </SelectItem>
                  <SelectItem value="ASSIGNMENT">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Assignment
                    </div>
                  </SelectItem>
                  <SelectItem value="RESOURCE">
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4" />
                      Resource
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lesson Content</Label>
              <RichTextEditor
                value={lesson.content || ""}
                onChange={(value) => {
                  onUpdate({ content: value })
                  setHasUnsavedChanges(true)
                }}
                className="min-h-[300px]"
              />
            </div>

            {(lesson.type === "VIDEO" || !lesson.type) && (
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  value={lesson.video_url || ""}
                  onChange={(e) => {
                    onUpdate({ video_url: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="https://youtube.com/watch?v=... or any video URL"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input
                value={lesson.thumbnail_url || ""}
                onChange={(e) => {
                  onUpdate({ thumbnail_url: e.target.value })
                  setHasUnsavedChanges(true)
                }}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lesson Settings</CardTitle>
                <CardDescription>Configure lesson properties and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={lesson.duration_minutes || 0}
                    onChange={(e) => {
                      onUpdate({ duration_minutes: Number(e.target.value) })
                      setHasUnsavedChanges(true)
                    }}
                    placeholder="15"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground dark:text-white">Lesson Options</h4>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Preview Lesson
                        </Label>
                        <p className="text-sm text-muted-foreground">Allow students to preview this lesson</p>
                      </div>
                      <Switch
                        checked={lesson.is_preview || false}
                        onCheckedChange={(checked) => {
                          onUpdate({ is_preview: checked })
                          setHasUnsavedChanges(true)
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Published
                        </Label>
                        <p className="text-sm text-muted-foreground">Make this lesson available to students</p>
                      </div>
                      <Switch
                        checked={lesson.is_published !== false}
                        onCheckedChange={(checked) => {
                          onUpdate({ is_published: checked })
                          setHasUnsavedChanges(true)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lesson Resources</CardTitle>
              <CardDescription>Add downloadable resources and materials for students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add links to PDFs, documents, code files, and other resources that complement this lesson.
                </p>

                {(lesson.resources || []).map((resource, idx) => (
                  <div key={idx} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Input
                        value={resource.url || ""}
                        onChange={(e) => {
                          const newResources = [...(lesson.resources || [])]
                          newResources[idx].url = e.target.value
                          onUpdate({ resources: newResources })
                          setHasUnsavedChanges(true)
                        }}
                        placeholder="https://example.com/resource.pdf"
                        className="flex-1"
                      />
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          const newResources = lesson.resources?.filter((_, i) => i !== idx) || []
                          onUpdate({ resources: newResources })
                          setHasUnsavedChanges(true)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <Input
                      value={resource.title || ""}
                      onChange={(e) => {
                        const newResources = [...(lesson.resources || [])]
                        newResources[idx].title = e.target.value
                        onUpdate({ resources: newResources })
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Resource title (e.g., 'Course Slides', 'Exercise Files')"
                      className="text-sm"
                    />
                    <Input
                      value={resource.type || "link"}
                      onChange={(e) => {
                        const newResources = [...(lesson.resources || [])]
                        newResources[idx].type = e.target.value
                        onUpdate({ resources: newResources })
                        setHasUnsavedChanges(true)
                      }}
                      placeholder="Resource type (pdf, link, code, etc.)"
                      className="text-sm"
                    />
                  </div>
                ))}

                <Button 
                  onClick={() => {
                    const newResources = [...(lesson.resources || []), { url: "", title: "", type: "link" }]
                    onUpdate({ resources: newResources })
                    setHasUnsavedChanges(true)
                  }} 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-transparent"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Add Resource
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive bg-transparent">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Lesson
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
            {hasUnsavedChanges ? <Clock className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            {hasUnsavedChanges ? "Save Changes" : "Saved"}
          </Button>
        </div>
      </div>
    </div>
  )
}