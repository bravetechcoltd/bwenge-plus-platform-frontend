"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, Clock, FileText, ImageIcon, Video, Download, BookOpen, Eye, FileDown } from "lucide-react"
import type { Lesson } from "@/types"

interface LessonPreviewProps {
  lesson: Lesson
}

export function LessonPreview({ lesson }: LessonPreviewProps) {
  const getLessonIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <Video className="w-5 h-5" />
      case "TEXT":
        return <FileText className="w-5 h-5" />
      case "QUIZ":
        return <BookOpen className="w-5 h-5" />
      case "ASSIGNMENT":
        return <FileText className="w-5 h-5" />
      case "RESOURCE":
        return <FileDown className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Lesson Header */}
      <div className="text-center pb-6 border-b">
        <h1 className="text-2xl font-bold text-foreground dark:text-white mb-2">{lesson.title}</h1>
        <div className="flex justify-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            {getLessonIcon(lesson.type || "TEXT")}
            {lesson.type || "TEXT"} Lesson
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {lesson.duration_minutes || 0} min
          </Badge>
          {lesson.is_preview && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              Preview
            </Badge>
          )}
        </div>
      </div>

      {/* Video Player for Video Lessons */}
      {lesson.type === "VIDEO" && lesson.video_url && (
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-card rounded-lg flex items-center justify-center">
              <Button size="lg" className="rounded-full w-16 h-16">
                <PlayCircle className="w-8 h-8" />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Video URL: {lesson.video_url}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lesson Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            {lesson.content ? (
              <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
            ) : (
              <p className="text-muted-foreground italic">No content added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      {(lesson.resources || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Lesson Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lesson.resources?.map((resource, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileDown className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{resource.title || `Resource ${index + 1}`}</p>
                      <p className="text-sm text-muted-foreground">{resource.type || "link"}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson Info */}
      <Card>
        <CardHeader>
          <CardTitle>Lesson Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lesson Type</p>
              <p className="font-medium">{lesson.type || "TEXT"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p className="font-medium">{lesson.duration_minutes || 0} minutes</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Preview Status</p>
              <p className="font-medium">{lesson.is_preview ? "Available" : "Not Available"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Published Status</p>
              <p className="font-medium">{lesson.is_published !== false ? "Published" : "Draft"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}