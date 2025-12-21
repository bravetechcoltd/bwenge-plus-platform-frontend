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
            ? "border-red-300 bg-red-50"
            : uploadStatus === "success"
              ? "border-green-300 bg-green-50"
              : "border-gray-300 hover:border-blue-400 bg-gray-50",
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
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-md p-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                removeThumbnail()
              }}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
            {uploadStatus === "success" && (
              <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
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
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            ) : (
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <p className="text-gray-700 font-medium mb-2">
              {uploadStatus === "error" ? "Upload failed" : "Click to upload or drag and drop"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              PNG, JPG, WebP up to 5MB<br />
              (1280x720 recommended)
            </p>
            <button
              className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-100 transition-colors font-medium text-gray-700"
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
        <p className="text-sm text-red-600 text-center">
          Please try again with a different image file.
        </p>
      )}
    </div>
  )
}