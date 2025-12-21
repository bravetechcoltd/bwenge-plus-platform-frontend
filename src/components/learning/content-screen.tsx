"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, BookOpen, Clock, FileDown, Loader2, Video } from "lucide-react"
import { useState, useEffect } from "react"

interface ContentBlock {
  type: "text" | "video" | "image"
  data: {
    text?: string
    url?: string
    caption?: string
    alt?: string
  }
  id: string
  order: number
}

interface ContentScreenProps {
  lesson: {
    id: string
    title: string
    content: string
    video_url?: string
    thumbnail_url?: string
    duration_minutes: number
    resources?: Array<{
      url: string
      title: string
      description?: string
      type?: string
    }>
  }
  onComplete: (score: number | undefined, passed: boolean) => void
  isCompleted: boolean
  isStepping: boolean
  progressData?: any
}

function parseContentBlocks(content: string): ContentBlock[] {
  try {
    const isHTML = content.includes("<") && content.includes(">")
    const trimmedContent = content.trim()

    if (trimmedContent.startsWith("{") || trimmedContent.startsWith("[")) {
      try {
        let parsedContent = content

        if (parsedContent.startsWith('"') && parsedContent.endsWith('"')) {
          parsedContent = parsedContent.slice(1, -1)
          parsedContent = parsedContent.replace(/\\"/g, '"')
        }

        const contentData = JSON.parse(parsedContent)

        if (contentData.blocks && Array.isArray(contentData.blocks)) {
          return contentData.blocks as ContentBlock[]
        }

        if (Array.isArray(contentData)) {
          return contentData as ContentBlock[]
        }
      } catch (jsonError) {
        console.log("Content is not JSON, treating as HTML")
      }
    }

    if (isHTML || content) {
      return [
        {
          type: "text",
          data: { text: content },
          id: "content-text",
          order: 1,
        },
      ]
    }

    return [
      {
        type: "text",
        data: { text: "No content available" },
        id: "fallback-text",
        order: 1,
      },
    ]
  } catch (error) {
    console.error("Failed to parse content blocks:", error)

    return [
      {
        type: "text",
        data: { text: content },
        id: "error-fallback-text",
        order: 1,
      },
    ]
  }
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text":
      const textContent = block.data.text || ""
      const containsHTML = textContent.includes("<") && textContent.includes(">")

      return (
        <div
          className="ql-editor rich-text-content"
          style={{
            padding: 0,
            backgroundColor: "transparent",
            border: "none",
            minHeight: "auto",
          }}
        >
          {containsHTML ? (
            <div dangerouslySetInnerHTML={{ __html: textContent }} />
          ) : (
            <p className="whitespace-pre-wrap">{textContent}</p>
          )}
        </div>
      )

    case "video":
      if (!block.data.url) return null
      const isYouTube = block.data.url.includes("youtube.com") || block.data.url.includes("youtu.be")

      return (
        <div className="mb-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {isYouTube ? (
              <iframe
                src={block.data.url.replace("watch?v=", "embed/")}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <video src={block.data.url} controls className="w-full h-full" poster={block.data.caption}>
                Your browser does not support the video tag.
              </video>
            )}
          </div>
          {block.data.caption && <p className="text-sm text-muted-foreground mt-2 text-center">{block.data.caption}</p>}
        </div>
      )

    case "image":
      return (
        <div className="mb-6">
          <div className="rounded-lg overflow-hidden">
            <img
              src={block.data.url || "/placeholder.svg"}
              alt={block.data.alt || "Content image"}
              className="w-full max-w-3xl h-auto mx-auto rounded-lg object-contain"
            />
          </div>
          {block.data.caption && <p className="text-sm text-muted-foreground mt-2 text-center">{block.data.caption}</p>}
        </div>
      )

    default:
      return null
  }
}

export default function ContentScreen({
  lesson,
  onComplete,
  isCompleted,
  isStepping,
  progressData,
}: ContentScreenProps) {
  const [isLessonCompleted, setIsLessonCompleted] = useState(false)
  const [checkingProgress, setCheckingProgress] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    const checkLessonCompletion = () => {
      try {
        if (!progressData || !progressData.completedSteps) {
          setCheckingProgress(false)
          return
        }

        const lessonCompletion = progressData.completedSteps.find(
          (step: any) => step.type === "lesson" && step.lessonId === lesson.id && step.isCompleted === true,
        )

        setIsLessonCompleted(!!lessonCompletion)
        setCheckingProgress(false)
        
        if (lessonCompletion && isCompleting) {
          setIsCompleting(false)
        }
      } catch (error) {
        console.error("Error checking lesson completion:", error)
        setCheckingProgress(false)
        setIsCompleting(false)
      }
    }

    checkLessonCompletion()
  }, [lesson.id, progressData, isCompleting])

  const contentBlocks = parseContentBlocks(lesson.content)

  const handleComplete = async () => {
    if (!isLessonCompleted && !isCompleting) {
      console.log("🔄 [ContentScreen] Starting lesson completion...")
      setIsCompleting(true)
      
      try {
        await onComplete(undefined, true)
        console.log("✅ [ContentScreen] Lesson completion triggered")
      } catch (error) {
        console.error("❌ [ContentScreen] Error completing lesson:", error)
        setIsCompleting(false)
      }
    }
  }

  let parsedResources: any[] = []
  try {
    if (typeof lesson.resources === "string" && (lesson.resources as string).trim()) {
      parsedResources = JSON.parse(lesson.resources as string)
    } else if (Array.isArray(lesson.resources)) {
      parsedResources = lesson.resources
    }
  } catch (error) {
    console.error("Failed to parse resources:", error)
    parsedResources = []
  }

  const shouldShowMarkCompleteButton = !isLessonCompleted && !isCompleted && !checkingProgress && !isCompleting

  return (
    <div className="w-full space-y-6">
      <Card className="px-3 shadow-none border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-xl">{lesson.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  {lesson.duration_minutes && lesson.duration_minutes > 0 ? (
                    <span>{lesson.duration_minutes} minutes</span>
                  ) : (
                    <span>Self-paced</span>
                  )}
                  {lesson.thumbnail_url && (
                    <div className="ml-4">
                      <img 
                        src={lesson.thumbnail_url} 
                        alt={lesson.title}
                        className="w-16 h-10 object-cover rounded border"
                      />
                    </div>
                  )}
                  {checkingProgress && <span className="text-xs text-blue-500">Checking progress...</span>}
                  {isCompleting && <span className="text-xs text-blue-500">Marking as complete...</span>}
                  {isLessonCompleted && <span className="text-xs text-green-500">✓ Completed</span>}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="border-t pt-6">
          {lesson.video_url && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Video className="w-5 h-5" /> Video Lesson
              </h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {lesson.video_url.includes("youtube.com") || lesson.video_url.includes("youtu.be") ? (
                  <iframe
                    src={lesson.video_url.replace("watch?v=", "embed/")}
                    title={`${lesson.title} - Video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <video
                    src={lesson.video_url}
                    controls
                    className="w-full h-full"
                    poster={lesson.thumbnail_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
              {lesson.thumbnail_url && (
                <p className="text-xs text-muted-foreground mt-2">
                  Thumbnail available
                </p>
              )}
            </div>
          )}

          {contentBlocks.length > 0 ? (
            <div className="space-y-4 px-4">
              {contentBlocks
                .sort((a, b) => a.order - b.order)
                .map((block) => (
                  <ContentBlockRenderer key={block.id} block={block} />
                ))}

              {shouldShowMarkCompleteButton && (
                <Button 
                  onClick={handleComplete} 
                  disabled={isCompleting || isStepping} 
                  className="flex items-center gap-2"
                >
                  {isCompleting || isStepping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Mark Complete
                    </>
                  )}
                </Button>
              )}
              
              {isLessonCompleted && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    This lesson has been completed
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No content available for this lesson yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {parsedResources && parsedResources.length > 0 && (
        <Card className="px-3 shadow-none mx-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5 text-primary" />
              Lesson Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {parsedResources.map((resource: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <FileDown className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{resource.title}</h4>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                    )}
                    {resource.type && <p className="text-xs text-muted-foreground mt-1">Type: {resource.type}</p>}
                  </div>
                  <Button variant="outline" size="sm" asChild className="flex-shrink-0 bg-transparent">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      View Resource
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}