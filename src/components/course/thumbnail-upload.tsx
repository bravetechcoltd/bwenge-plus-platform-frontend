"use client"

import { useState, useRef, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Upload } from "lucide-react"

interface ThumbnailUploadProps {
  onFileSelect: (file: File | null) => void
  currentThumbnail?: string
  className?: string
  selectedFile?: File | null
}

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

export function ThumbnailUpload({
  onFileSelect,
  currentThumbnail,
  className,
  selectedFile: propSelectedFile,
}: ThumbnailUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentThumbnail || null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync preview with prop changes (when navigating back)
  useEffect(() => {
    if (propSelectedFile) {
      // If we have a file from parent, create preview from it
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
        setUploadStatus("success")
      }
      reader.readAsDataURL(propSelectedFile)
    } else if (currentThumbnail) {
      // If no file but we have a thumbnail URL, use that
      setPreviewUrl(currentThumbnail)
      setUploadStatus("success")
    } else {
      // No file and no thumbnail
      setPreviewUrl(null)
      setUploadStatus("idle")
    }
  }, [propSelectedFile, currentThumbnail])

  const handleFileSelect = (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadStatus("error")
      alert("Please select an image file (PNG, JPG, JPEG, GIF, WebP)")
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus("error")
      alert("File size must be less than 5MB")
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
      setUploadStatus("success")
    }
    reader.readAsDataURL(file)

    // Send file to parent
    onFileSelect(file)
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

  const removeThumbnail = () => {
    setPreviewUrl(null)
    setUploadStatus("idle")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onFileSelect(null)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer",
          uploadStatus === "error"
            ? "border-destructive/40 bg-destructive/10"
            : uploadStatus === "success"
              ? "border-success/40 bg-success/10"
              : "border-border hover:border-primary/60 bg-muted/50",
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !previewUrl && fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Course thumbnail preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              className="absolute top-2 right-2 bg-destructive/100 hover:bg-destructive text-white rounded-md p-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                removeThumbnail()
              }}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
            {uploadStatus === "success" && (
              <div className="absolute top-2 left-2 bg-success/100 text-white rounded-full p-1">
                <CheckCircle className="w-4 h-4" />
              </div>
            )}
            {propSelectedFile && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md">
                {propSelectedFile.name}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            {uploadStatus === "error" ? (
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            ) : (
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            )}
            <p className="text-muted-foreground font-medium mb-2">
              {uploadStatus === "error" ? "Upload failed" : "Click to upload or drag and drop"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              PNG, JPG, WebP up to 5MB<br />
              (1280x720 recommended)
            </p>
            <button
              className="px-4 py-2 border-2 border-border rounded-lg bg-card hover:bg-muted transition-colors font-medium text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              type="button"
            >
              Choose File
            </button>
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
      
      {uploadStatus === "error" && (
        <p className="text-sm text-destructive text-center">
          Please try again with a different image file.
        </p>
      )}
    </div>
  )
}