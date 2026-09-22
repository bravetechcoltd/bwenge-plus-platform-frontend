"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, X, Loader2, CheckCircle, AlertCircle, LinkIcon, Video as VideoIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface LessonVideoUploadProps {
  onUpdate?: (updates: { video_url?: string }) => void
  currentVideoUrl?: string
  className?: string
  courseId?: string
  moduleId?: string
  lessonId?: string
}

export function LessonVideoUpload({
  onUpdate,
  currentVideoUrl,
  className,
  courseId,
  moduleId,
  lessonId,
}: LessonVideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentVideoUrl || null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [urlInput, setUrlInput] = useState(currentVideoUrl || "")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    if (!file.type.startsWith("video/")) {
      setUploadStatus("error")
      toast.error("Please select a valid video file (MP4, WebM, MOV)")
      return
    }

    if (file.size > 500 * 1024 * 1024) {
      setUploadStatus("error")
      toast.error("File size must be less than 500MB")
      return
    }

    // Start upload
    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("video", file)
      
      // Add metadata if available
      if (courseId) formData.append("courseId", courseId)
      if (moduleId) formData.append("moduleId", moduleId)
      if (lessonId) formData.append("lessonId", lessonId)
      formData.append("type", "lesson_video")

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90))
      }, 500)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/upload-video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Upload failed")
      }

      const data = await response.json()

      setTimeout(() => {
        setUploadStatus("success")
        setUrlInput(data.videoUrl)
        setPreviewUrl(data.videoUrl)
        onUpdate?.({ video_url: data.videoUrl })
        setIsUploading(false)
        toast.success("Video uploaded successfully!")
      }, 500)
    } catch (error: any) {
      setUploadStatus("error")
      setIsUploading(false)
      setPreviewUrl(null)
      toast.error(error.message || "Failed to upload video. Please try again.")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const removeVideo = () => {
    setPreviewUrl(null)
    setUploadStatus("idle")
    setUrlInput("")
    onUpdate?.({ video_url: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUrlSave = () => {
    if (urlInput.trim()) {
      // Validate URL
      try {
        new URL(urlInput)
        setPreviewUrl(urlInput)
        onUpdate?.({ video_url: urlInput })
        toast.success("Video URL saved successfully!")
      } catch {
        toast.error("Please enter a valid URL")
      }
    }
  }

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg transition-colors p-8",
              uploadStatus === "error"
                ? "border-destructive/40 bg-destructive/10 dark:border-destructive dark:bg-destructive/20/20"
                : uploadStatus === "success"
                  ? "border-success/40 bg-success/10 dark:border-success dark:bg-success/20/20"
                  : "border-border dark:border-border hover:border-primary-400",
            )}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {isUploading ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground dark:text-muted-foreground mb-2">Uploading video...</p>
                <p className="text-sm text-muted-foreground mb-4">{uploadProgress}% complete</p>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : previewUrl ? (
              <div className="relative">
                <div className="aspect-video bg-card rounded-lg flex items-center justify-center">
                  <VideoIcon className="w-16 h-16 text-white/50" />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm text-muted-foreground">Video uploaded successfully</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={removeVideo}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                {uploadStatus === "error" ? (
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                ) : (
                  <VideoIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                )}
                <p className="text-muted-foreground dark:text-muted-foreground mb-2">
                  {uploadStatus === "error" ? "Upload failed" : "Drag and drop or click to upload video"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">MP4, WebM, MOV up to 500MB</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Choose Video File
                </Button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </TabsContent>

        <TabsContent value="url" className="space-y-4 pt-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter video URL (YouTube, Vimeo, or direct link)..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleUrlSave} disabled={!urlInput.trim()}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </div>
            {previewUrl && !isUploading && (
              <div className="relative">
                <div className="aspect-video bg-card rounded-lg flex items-center justify-center">
                  {isYouTubeUrl(previewUrl) ? (
                    <div className="text-center text-white">
                      <VideoIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">External Video Link</p>
                      <p className="text-xs opacity-50 mt-1 truncate max-w-full">{previewUrl}</p>
                    </div>
                  ) : (
                    <VideoIcon className="w-16 h-16 text-white/50" />
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeVideo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supported: YouTube, Vimeo, or direct MP4/WebM links. Maximum size: 500MB for direct uploads.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}