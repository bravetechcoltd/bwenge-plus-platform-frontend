"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Clock,
  Video,
  Briefcase,
  Zap,
  FileDown,
  Trophy,
  Target,
  Edit,
  Eye,
  Download,
  ExternalLink,
  FileText,
  X,
} from "lucide-react"
import type { Lesson } from "@/types"

interface LessonDetailModalProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  isInstructor?: boolean
}

export function LessonDetailModal({
  lesson,
  open,
  onOpenChange,
  onEdit,
  isInstructor = false,
}: LessonDetailModalProps) {
  if (!open || !lesson) return null

  const renderContent = (content: string) => {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => {
          if (typeof item === "string") {
            return (
              <div
                key={index}
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: item }}
              />
            )
          }
          return null
        })
      }
      return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
    } catch {
      return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
    }
  }

  const getLessonTypeBadge = (type: string) => {
    switch (type) {
      case "VIDEO":
        return { text: "Video", color: "bg-blue-500", icon: Video }
      case "TEXT":
        return { text: "Text", color: "bg-gray-500", icon: FileText }
      case "QUIZ":
        return { text: "Quiz", color: "bg-purple-500", icon: Trophy }
      case "ASSIGNMENT":
        return { text: "Assignment", color: "bg-orange-500", icon: Briefcase }
      case "LIVE_SESSION":
        return { text: "Live Session", color: "bg-red-500", icon: Zap }
      case "RESOURCE":
        return { text: "Resource", color: "bg-green-500", icon: FileDown }
      default:
        return { text: "Lesson", color: "bg-gray-500", icon: FileText }
    }
  }

  // Get video URL from either video_url or videoUrl
  const videoUrl = (lesson as any).video_url || lesson.video_url;
  // Get thumbnail URL from either thumbnail_url or thumbnailUrl
  const thumbnailUrl = (lesson as any).thumbnail_url || lesson.thumbnail_url;
  // Get duration from either duration_minutes or duration
  const durationMinutes = (lesson as any).duration_minutes || lesson.duration_minutes || lesson.duration_minutes || 0;
  // Get order index
  const orderIndex = (lesson as any).order_index || lesson.order_index;
  // Get preview status
  const isPreview = (lesson as any).is_preview || lesson.is_preview || false;
  // Get lesson type
  const lessonType = (lesson as any).type || lesson.type || "TEXT";
  
  const lessonTypeBadge = getLessonTypeBadge(lessonType);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-0 duration-200">
      <div className="relative bg-background rounded-lg border shadow-lg w-full max-w-4xl my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-semibold leading-none">{lesson.title}</h2>
            <div className="flex items-center gap-2">
              {isInstructor && onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Lesson
                </Button>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-2"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Lesson Metadata */}
            <div className="flex flex-wrap gap-2">
              <Badge className={`flex items-center gap-1 ${lessonTypeBadge.color} text-white`}>
                <lessonTypeBadge.icon className="w-3 h-3" />
                {lessonTypeBadge.text}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {durationMinutes} min
              </Badge>
              {isPreview && (
                <Badge className="flex items-center gap-1 bg-yellow-500 text-white">
                  <Eye className="w-3 h-3" />
                  Preview Available
                </Badge>
              )}
              {orderIndex && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Order: {orderIndex}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Video Content */}
            {videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Video Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl || "/placeholder.svg"}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover rounded-lg opacity-50"
                      />
                    ) : (
                      <div className="text-center text-white">
                        <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm opacity-75">Video Player</p>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-4 transition-all hover:scale-110"
                      >
                        <ExternalLink className="w-6 h-6" />
                      </a>
                    </div>
                  </div>
                  <div className="mt-3">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open video in new tab
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lesson Content */}
            {lesson.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lesson Content</CardTitle>
                </CardHeader>
                <CardContent>{renderContent(lesson.content)}</CardContent>
              </Card>
            )}

            {/* Assessments */}
            {lesson.assessments && lesson.assessments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Assessments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lesson.assessments.map((assessment, index) => (
                      <div key={assessment.id || index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{assessment.title}</h4>
                            {assessment.description && (
                              <p className="text-sm text-muted-foreground mt-1">{assessment.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary">{assessment.type}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            <Target className="w-3 h-3 mr-1" />
                            {assessment.questions?.length || 0} Questions
                          </Badge>
                          {(assessment as any).passing_score && (
                            <Badge variant="outline" className="text-xs">
                              {(assessment as any).passing_score}% to pass
                            </Badge>
                          )}
                          {assessment.passing_score && (
                            <Badge variant="outline" className="text-xs">
                              {assessment.passing_score}% to pass
                            </Badge>
                          )}
                          {(assessment as any).time_limit_minutes && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {(assessment as any).time_limit_minutes} min
                            </Badge>
                          )}
                          {assessment.time_limit_minutes && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {assessment.time_limit_minutes} min
                            </Badge>
                          )}
                          {assessment.max_attempts && (
                            <Badge variant="outline" className="text-xs">
                              {assessment.max_attempts} attempt{assessment.max_attempts !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resources */}
            {lesson.resources && lesson.resources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileDown className="w-5 h-5" />
                    Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lesson.resources.map((resource, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{resource.title}</h4>
                          
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 inline-block flex items-center gap-1"
                            >
                              {resource.type === "link" ? (
                                <>
                                  <ExternalLink className="w-3 h-3" />
                                  Open Link
                                </>
                              ) : (
                                <>
                                  <Download className="w-3 h-3" />
                                  Download Resource
                                </>
                              )}
                            </a>
                          </div>
                          <FileDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Content Message */}
            {!lesson.content && !videoUrl && (!lesson.assessments || lesson.assessments.length === 0) && (!lesson.resources || lesson.resources.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No content available for this lesson yet.</p>
                  {isInstructor && (
                    <p className="text-sm mt-2">Click "Edit Lesson" to add content.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}