"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, X, Loader2, CheckCircle, AlertCircle, LinkIcon, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface LessonImageUploadProps {
  onUpdate?: (updates: { thumbnail_url?: string }) => void
  currentImageUrl?: string
  className?: string
  courseId?: string
  moduleId?: string
  lessonId?: string
}

export function LessonImageUpload({
  onUpdate,
  currentImageUrl,
  className,
  courseId,
  moduleId,
  lessonId,
}: LessonImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [urlInput, setUrlInput] = useState(currentImageUrl || "")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setUploadStatus("error")
      toast.error("Please select a valid image file (PNG, JPG, JPEG, GIF)")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("error")
      toast.error("File size must be less than 10MB")
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Start upload
    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("image", file)
      
      // Add metadata if available
      if (courseId) formData.append("courseId", courseId)
      if (moduleId) formData.append("moduleId", moduleId)
      if (lessonId) formData.append("lessonId", lessonId)
      formData.append("type", "lesson_thumbnail")

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/upload-image`, {
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
        setUrlInput(data.imageUrl)
        onUpdate?.({ thumbnail_url: data.imageUrl })
        setIsUploading(false)
        toast.success("Image uploaded successfully!")
      }, 500)
    } catch (error: any) {
      setUploadStatus("error")
      setIsUploading(false)
      setPreviewUrl(null)
      toast.error(error.message || "Failed to upload image. Please try again.")
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

  const removeImage = () => {
    setPreviewUrl(null)
    setUploadStatus("idle")
    setUrlInput("")
    onUpdate?.({ thumbnail_url: "" })
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
        onUpdate?.({ thumbnail_url: urlInput })
        toast.success("Image URL saved successfully!")
      } catch {
        toast.error("Please enter a valid URL")
      }
    }
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
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Lesson image preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                {!isUploading && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">{uploadProgress}%</p>
                      <div className="w-32 bg-secondary rounded-full h-2 mt-2 mx-auto">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {uploadStatus === "success" && (
                  <div className="absolute top-2 left-2 bg-success/100 text-white rounded-full p-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                {uploadStatus === "error" ? (
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                )}
                <p className="text-muted-foreground dark:text-muted-foreground mb-2">
                  {uploadStatus === "error" ? "Upload failed" : "Drag and drop or click to upload"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">PNG, JPG, GIF up to 10MB (16:9 recommended)</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Choose File"
                  )}
                </Button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </TabsContent>

        <TabsContent value="url" className="space-y-4 pt-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter image URL (https://example.com/image.jpg)..."
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
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="URL preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supported image formats: JPG, PNG, GIF, WebP. Maximum size: 10MB.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}