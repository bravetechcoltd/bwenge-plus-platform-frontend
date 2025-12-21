// @ts-nocheck

"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen, FileText, Trophy, Trash2, AlertCircle, Plus, Video, ImageIcon, FileDown, Clock,
  Briefcase, Zap, Check, ListPlus, Type, CheckSquare, Hash, Image as ImageIcon2, Eye,
  Upload, Link, Film, Play, X, Paperclip, FolderOpen
} from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { Module, Lesson, Assessment, Question, LessonMaterial } from "@/types"

// ==================== SHARED FILE SIZE FORMATTER ====================

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ==================== VIDEO UPLOAD CONSTANTS ====================

const ACCEPTED_VIDEO_EXTENSIONS = [
  ".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv",
  ".wmv", ".m4v", ".3gp", ".mpg", ".mpeg", ".m2v",
  ".m4p", ".mp2", ".mpe", ".mpv", ".mxf", ".nsv",
  ".ogv", ".qt", ".rm", ".rmvb", ".svi", ".vob",
  ".yuv", ".ts", ".m2ts", ".mts", ".divx", ".xvid",
  ".h264", ".h265", ".hevc", ".av1",
].join(",")

const MAX_VIDEO_SIZE_BYTES = 4 * 1024 * 1024 * 1024 // 4 GB

// ==================== THUMBNAIL UPLOAD CONSTANTS ====================

const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.gif,.webp,.bmp,.avif"
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// ==================== LESSON MATERIALS CONSTANTS ====================

const ACCEPTED_MATERIAL_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".rtf", ".csv", ".zip", ".rar", ".7z", ".tar", ".gz",
  ".mp3", ".wav", ".ogg",
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".json", ".xml", ".html", ".htm", ".md",
  ".py", ".js", ".ts", ".java", ".c", ".cpp", ".go", ".rb", ".php",
].join(",")
const MAX_MATERIAL_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB per file
const MAX_MATERIALS_COUNT = 10

// ==================== VIDEO UPLOAD SECTION ====================

interface VideoUploadSectionProps {
  lesson: Lesson
  onUpdate: (updates: any) => void
  onVideoFileSelect?: (file: File | null) => void
  selectedVideoFile?: File | null
}

function VideoUploadSection({ lesson, onUpdate, onVideoFileSelect, selectedVideoFile }: VideoUploadSectionProps) {
  const [videoTab, setVideoTab] = useState<"url" | "upload">(selectedVideoFile ? "upload" : "url")
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndSetFile = useCallback((file: File) => {
    setFileError("")
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "")
    const isVideo = file.type.startsWith("video/") || ACCEPTED_VIDEO_EXTENSIONS.includes(ext)
    if (!isVideo) { setFileError("File type not supported. Please upload a video file."); return }
    if (file.size > MAX_VIDEO_SIZE_BYTES) { setFileError("File too large. Maximum size is 4 GB."); return }
    const blobUrl = URL.createObjectURL(file)
    onUpdate({ video_url: blobUrl })
    onVideoFileSelect?.(file)
  }, [onUpdate, onVideoFileSelect])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleRemoveFile = () => {
    setFileError("")
    onUpdate({ video_url: "" })
    onVideoFileSelect?.(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
        <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <span className="font-medium">Progress tracking enabled:</span> Students must watch at
          least 90% of this video before marking it complete. Skipping ahead is restricted.
        </p>
      </div>

      <Tabs value={videoTab} onValueChange={(v) => setVideoTab(v as "url" | "upload")}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="url" className="text-xs gap-1.5"><Link className="w-3 h-3" /> Video URL</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs gap-1.5"><Upload className="w-3 h-3" /> Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-2">
          <Input
            value={lesson.video_url && lesson.video_url.startsWith("blob:") ? "" : lesson.video_url || ""}
            onChange={(e) => { onUpdate({ video_url: e.target.value }); if (selectedVideoFile) onVideoFileSelect?.(null) }}
            placeholder="https://youtube.com/watch?v=... or any video URL"
            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">Paste a direct video URL, YouTube, or Vimeo link</p>
        </TabsContent>

        <TabsContent value="upload" className="mt-2">
          {selectedVideoFile ? (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{selectedVideoFile.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(selectedVideoFile.size)} • Ready to upload on save</p>
                <div className="flex items-center gap-1 mt-1">
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">File selected</span>
                </div>
              </div>
              <button type="button" onClick={handleRemoveFile}
                className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                dragOver ? "border-[#0158B7] bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Drop video here or <span className="text-[#0158B7]">browse</span></p>
                <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI, MKV, WebM and all video formats • Up to 4 GB</p>
              </div>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_VIDEO_EXTENSIONS} onChange={handleFileInput} className="hidden" />
            </div>
          )}
          {fileError && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{fileError}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== THUMBNAIL UPLOAD SECTION ====================

interface ThumbnailUploadSectionProps {
  lesson: Lesson
  onUpdate: (updates: any) => void
  onThumbnailFileSelect?: (file: File | null) => void
  selectedThumbnailFile?: File | null
}

function ThumbnailUploadSection({ lesson, onUpdate, onThumbnailFileSelect, selectedThumbnailFile }: ThumbnailUploadSectionProps) {
  const [thumbTab, setThumbTab] = useState<"url" | "upload">(selectedThumbnailFile ? "upload" : "url")
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedThumbnailFile) {
      const url = URL.createObjectURL(selectedThumbnailFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (lesson.thumbnail_url && !lesson.thumbnail_url.startsWith("blob:")) {
      setPreviewUrl(lesson.thumbnail_url)
    } else {
      setPreviewUrl("")
    }
  }, [selectedThumbnailFile, lesson.thumbnail_url])

  const validateAndSetFile = useCallback((file: File) => {
    setFileError("")
    if (!file.type.startsWith("image/")) { setFileError("Please upload an image file (JPG, PNG, WEBP, etc.)"); return }
    if (file.size > MAX_IMAGE_SIZE_BYTES) { setFileError("Image too large. Maximum size is 10 MB."); return }
    const blobUrl = URL.createObjectURL(file)
    onUpdate({ thumbnail_url: blobUrl })
    onThumbnailFileSelect?.(file)
  }, [onUpdate, onThumbnailFileSelect])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) validateAndSetFile(f) }
  const handleRemove = () => {
    setFileError(""); setPreviewUrl("")
    onUpdate({ thumbnail_url: "" }); onThumbnailFileSelect?.(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-3">
      <Tabs value={thumbTab} onValueChange={(v) => setThumbTab(v as "url" | "upload")}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="url" className="text-xs gap-1.5"><Link className="w-3 h-3" /> Image URL</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs gap-1.5"><Upload className="w-3 h-3" /> Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-2 space-y-2">
          <Input
            value={lesson.thumbnail_url && lesson.thumbnail_url.startsWith("blob:") ? "" : lesson.thumbnail_url || ""}
            onChange={(e) => { onUpdate({ thumbnail_url: e.target.value }); if (selectedThumbnailFile) onThumbnailFileSelect?.(null) }}
            placeholder="https://example.com/image.jpg"
            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900"
          />
          {previewUrl && !selectedThumbnailFile && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
              <img src={previewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              <button type="button" onClick={handleRemove}
                className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-2">
          {selectedThumbnailFile && previewUrl ? (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-blue-200">
              <img src={previewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 flex items-center justify-between">
                <span className="text-xs text-white truncate">{selectedThumbnailFile.name}</span>
                <button type="button" onClick={handleRemove}
                  className="ml-2 p-0.5 rounded-full hover:bg-red-500/80 text-white transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                dragOver ? "border-[#0158B7] bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <ImageIcon2 className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Drop image here or <span className="text-[#0158B7]">browse</span></p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP, GIF • Up to 10 MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_EXTENSIONS} onChange={handleFileInput} className="hidden" />
            </div>
          )}
          {fileError && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{fileError}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== LESSON MATERIALS SECTION ====================

interface LessonMaterialsSectionProps {
  lesson: Lesson
  onUpdate: (updates: any) => void
  onMaterialFilesChange?: (files: File[]) => void
  pendingMaterialFiles?: File[]
}

function LessonMaterialsSection({ lesson, onUpdate, onMaterialFilesChange, pendingMaterialFiles = [] }: LessonMaterialsSectionProps) {
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingMaterials: LessonMaterial[] = lesson.lesson_materials || []

  const handleFiles = useCallback((incoming: FileList | File[]) => {
    setFileError("")
    const arr = Array.from(incoming)
    if (pendingMaterialFiles.length + existingMaterials.length + arr.length > MAX_MATERIALS_COUNT) {
      setFileError(`Maximum ${MAX_MATERIALS_COUNT} materials allowed.`); return
    }
    for (const f of arr) {
      if (f.size > MAX_MATERIAL_SIZE_BYTES) { setFileError(`"${f.name}" exceeds 100 MB limit.`); return }
    }
    onMaterialFilesChange?.([...pendingMaterialFiles, ...arr])
  }, [pendingMaterialFiles, existingMaterials, onMaterialFilesChange])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFiles(e.target.files) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files) }
  const removePending = (idx: number) => onMaterialFilesChange?.(pendingMaterialFiles.filter((_, i) => i !== idx))
  const removeExisting = (idx: number) => { const updated = existingMaterials.filter((_, i) => i !== idx); onUpdate({ lesson_materials: updated }) }

  const getIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase()
    if (ext === "pdf") return "📄"
    if (["doc","docx"].includes(ext)) return "📝"
    if (["xls","xlsx","csv"].includes(ext)) return "📊"
    if (["ppt","pptx"].includes(ext)) return "📑"
    if (["zip","rar","7z","tar","gz"].includes(ext)) return "🗜️"
    if (["mp3","wav","ogg"].includes(ext)) return "🎵"
    if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "🖼️"
    return "📎"
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Upload downloadable materials — PDFs, slides, code files, zip archives, etc. Up to {MAX_MATERIALS_COUNT} files, 100 MB each.
      </p>

      {existingMaterials.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Uploaded ({existingMaterials.length})</p>
          {existingMaterials.map((mat, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-base flex-shrink-0">{getIcon(mat.original_name || mat.title)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{mat.title || mat.original_name}</p>
                {mat.size_bytes && <p className="text-xs text-gray-500">{formatFileSize(mat.size_bytes)}</p>}
              </div>
              <a href={mat.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex-shrink-0 px-1">View</a>
              <button type="button" onClick={() => removeExisting(i)}
                className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingMaterialFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Pending upload ({pendingMaterialFiles.length})</p>
          {pendingMaterialFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-base flex-shrink-0">{getIcon(file.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)} • Will upload on save</p>
              </div>
              <button type="button" onClick={() => removePending(i)}
                className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(pendingMaterialFiles.length + existingMaterials.length) < MAX_MATERIALS_COUNT && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            dragOver ? "border-[#0158B7] bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <Paperclip className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Drop files here or <span className="text-[#0158B7]">browse</span></p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, DOCX, XLSX, PPT, ZIP, MP3, images, code • Up to 100 MB each</p>
          </div>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_MATERIAL_EXTENSIONS} multiple onChange={handleFileInput} className="hidden" />
        </div>
      )}

      {fileError && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{fileError}
        </div>
      )}
    </div>
  )
}

// ==================== MAIN CONTENT EDITOR ====================

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
  /** Callback for lesson video file */
  onVideoFileSelect?: (lessonId: string, file: File | null) => void
  /** Map lessonId -> video File */
  videoFiles?: Map<string, File>
  /** NEW: Callback for lesson thumbnail file */
  onThumbnailFileSelect?: (lessonId: string, file: File | null) => void
  /** NEW: Map lessonId -> thumbnail File */
  thumbnailFiles?: Map<string, File>
  /** NEW: Callback for lesson material files */
  onMaterialFilesChange?: (lessonId: string, files: File[]) => void
  /** NEW: Map lessonId -> material File[] */
  materialFiles?: Map<string, File[]>
}

export function ContentEditor({
  item, modules, onUpdate, onDelete,
  onVideoFileSelect, videoFiles,
  onThumbnailFileSelect, thumbnailFiles,
  onMaterialFilesChange, materialFiles,
}: ContentEditorProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [currentData, setCurrentData] = useState<Module | Lesson | Assessment>(item.data)

  useEffect(() => { setCurrentData(item.data) }, [item])

  // ==================== MODULE EDITOR ====================

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
            <Button variant="ghost" size="sm"
              onClick={() => (deleteConfirm ? onDelete() : setDeleteConfirm(true))}
              className={`${deleteConfirm ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-red-600 hover:bg-red-50"} border border-red-300`}>
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteConfirm ? "Confirm Delete" : "Delete"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="module-title" className="text-gray-900 font-medium">Module Title</Label>
            <Input id="module-title" value={module.title}
              onChange={(e) => { setCurrentData({ ...module, title: e.target.value }); onUpdate({ title: e.target.value }) }}
              placeholder="e.g., Introduction to React"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-description" className="text-gray-900 font-medium">Description</Label>
            <Textarea id="module-description" value={module.description || ""}
              onChange={(e) => { setCurrentData({ ...module, description: e.target.value }); onUpdate({ description: e.target.value }) }}
              placeholder="Describe what students will learn in this module..."
              rows={4}
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-duration" className="text-gray-900 font-medium">Estimated Duration (hours)</Label>
            <Input id="module-duration" type="number" value={module.estimated_duration_hours || 0}
              onChange={(e) => { setCurrentData({ ...module, estimated_duration_hours: Number(e.target.value) }); onUpdate({ estimated_duration_hours: Number(e.target.value) }) }}
              placeholder="Estimated duration in hours"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
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

  // ==================== LESSON EDITOR ====================

  if (item.type === "lesson") {
    const lesson = currentData as Lesson
    const module = modules.find((m) => m.id === item.moduleId)
    const currentVideoFile = videoFiles?.get(item.id) || null
    const currentThumbnailFile = thumbnailFiles?.get(item.id) || null
    const currentMaterialFiles = materialFiles?.get(item.id) || []

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
            <Button variant="ghost" size="sm"
              onClick={() => (deleteConfirm ? onDelete() : setDeleteConfirm(true))}
              className={`${deleteConfirm ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-red-600 hover:bg-red-50"} border border-red-300`}>
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteConfirm ? "Confirm Delete" : "Delete"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="lesson-title" className="text-gray-900 font-medium">Lesson Title</Label>
            <Input id="lesson-title" value={lesson.title}
              onChange={(e) => { setCurrentData({ ...lesson, title: e.target.value }); onUpdate({ title: e.target.value }) }}
              placeholder="e.g., React Hooks Basics"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
          </div>

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
              {["content", "media", "settings", "resources"].map((tab) => (
                <TabsTrigger key={tab} value={tab}
                  className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600 text-xs capitalize">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* CONTENT */}
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
                  <select id="lesson-type" value={lesson.type || "VIDEO"}
                    onChange={(e) => { setCurrentData({ ...lesson, type: e.target.value }); onUpdate({ type: e.target.value }) }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 bg-white text-gray-900">
                    <option value="VIDEO">Video Lesson</option>
                    <option value="TEXT">Text Lesson</option>
                    <option value="QUIZ">Quiz Lesson</option>
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="RESOURCE">Resource</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Lesson Content</Label>
                <RichTextEditor
                  value={lesson.content || ""}
                  onChange={(value) => { setCurrentData({ ...lesson, content: value }); onUpdate({ content: value }) }}
                  className="min-h-[300px] border-gray-300 rounded-lg overflow-hidden"
                />
              </div>
            </TabsContent>

            {/* MEDIA (NEW) */}
            <TabsContent value="media" className="space-y-6 mt-4">
              {(lesson.type === "VIDEO" || !lesson.type) && (
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#0158B7]" /> Video Source
                  </Label>
                  <VideoUploadSection
                    lesson={lesson}
                    onUpdate={(u) => { setCurrentData({ ...lesson, ...u }); onUpdate(u) }}
                    onVideoFileSelect={(f) => onVideoFileSelect?.(item.id, f)}
                    selectedVideoFile={currentVideoFile}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-900 font-medium flex items-center gap-2">
                  <ImageIcon2 className="w-4 h-4 text-[#0158B7]" /> Lesson Thumbnail
                  <span className="text-xs font-normal text-gray-500">(cover image shown to students)</span>
                </Label>
                <ThumbnailUploadSection
                  lesson={lesson}
                  onUpdate={(u) => { setCurrentData({ ...lesson, ...u }); onUpdate(u) }}
                  onThumbnailFileSelect={(f) => onThumbnailFileSelect?.(item.id, f)}
                  selectedThumbnailFile={currentThumbnailFile}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#0158B7]" /> Course Materials
                  <span className="text-xs font-normal text-gray-500">(downloadable files for students)</span>
                </Label>
                <LessonMaterialsSection
                  lesson={lesson}
                  onUpdate={(u) => { setCurrentData({ ...lesson, ...u }); onUpdate(u) }}
                  onMaterialFilesChange={(files) => onMaterialFilesChange?.(item.id, files)}
                  pendingMaterialFiles={currentMaterialFiles}
                />
              </div>
            </TabsContent>

            {/* SETTINGS */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-duration" className="text-gray-900 font-medium">Duration (minutes)</Label>
                  <Input id="lesson-duration" type="number" value={lesson.duration_minutes || 0}
                    onChange={(e) => { setCurrentData({ ...lesson, duration_minutes: Number(e.target.value) }); onUpdate({ duration_minutes: Number(e.target.value) }) }}
                    placeholder="15"
                    className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-0.5">
                    <Label htmlFor="preview-lesson" className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer">
                      <Eye className="w-4 h-4 text-[#0158B7]" /> Preview Lesson
                    </Label>
                    <p className="text-sm text-gray-600">Allow students to preview this lesson</p>
                  </div>
                  <Switch id="preview-lesson" checked={lesson.is_preview || false}
                    onCheckedChange={(c) => { setCurrentData({ ...lesson, is_preview: c }); onUpdate({ is_preview: c }) }}
                    className="data-[state=checked]:bg-[#0158B7]" />
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-0.5">
                    <Label htmlFor="publish-lesson" className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer">
                      <Zap className="w-4 h-4 text-[#0158B7]" /> Published
                    </Label>
                    <p className="text-sm text-gray-600">Make this lesson available to students</p>
                  </div>
                  <Switch id="publish-lesson" checked={lesson.is_published !== false}
                    onCheckedChange={(c) => { setCurrentData({ ...lesson, is_published: c }); onUpdate({ is_published: c }) }}
                    className="data-[state=checked]:bg-[#0158B7]" />
                </div>
              </div>
            </TabsContent>

            {/* RESOURCES */}
            <TabsContent value="resources" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium text-gray-900">External Resource Links</Label>
                  <p className="text-sm text-gray-600 mt-1">Add external links and references (different from uploaded materials in the Media tab)</p>
                </div>

                <div className="space-y-3">
                  {(lesson.resources || []).map((resource, index) => (
                    <Card key={index} className="p-4 border border-gray-200 bg-white">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`resource-title-${index}`} className="text-sm text-gray-900 font-medium">Resource Title</Label>
                          <Input id={`resource-title-${index}`} value={resource.title}
                            onChange={(e) => {
                              const r = [...(lesson.resources || [])]
                              r[index].title = e.target.value
                              setCurrentData({ ...lesson, resources: r }); onUpdate({ resources: r })
                            }}
                            placeholder="e.g., Sample Code, PDF Guide"
                            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`resource-url-${index}`} className="text-sm text-gray-900 font-medium">Resource URL</Label>
                          <Input id={`resource-url-${index}`} value={resource.url}
                            onChange={(e) => {
                              const r = [...(lesson.resources || [])]
                              r[index].url = e.target.value
                              setCurrentData({ ...lesson, resources: r }); onUpdate({ resources: r })
                            }}
                            placeholder="https://example.com/resource"
                            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`resource-type-${index}`} className="text-sm text-gray-900 font-medium">Resource Type</Label>
                          <Input id={`resource-type-${index}`} value={resource.type || "link"}
                            onChange={(e) => {
                              const r = [...(lesson.resources || [])]
                              r[index].type = e.target.value
                              setCurrentData({ ...lesson, resources: r }); onUpdate({ resources: r })
                            }}
                            placeholder="pdf, link, code, etc."
                            className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
                        </div>
                        <Button variant="ghost" size="sm"
                          onClick={() => {
                            const r = lesson.resources?.filter((_, i) => i !== index) || []
                            setCurrentData({ ...lesson, resources: r }); onUpdate({ resources: r })
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full border border-red-200">
                          <Trash2 className="w-4 h-4 mr-2" /> Remove Resource
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button variant="outline"
                  onClick={() => {
                    const r = [...(lesson.resources || []), { title: "", url: "", type: "link" }]
                    setCurrentData({ ...lesson, resources: r }); onUpdate({ resources: r })
                  }}
                  className="w-full bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50">
                  <Plus className="w-4 h-4 mr-2" /> Add Resource Link
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  // ==================== ASSESSMENT EDITOR ====================

  if (item.type === "assessment" || item.type === "module_final_assessment") {
    const assessment = currentData as Assessment
    const module = modules.find((m) => m.id === item.moduleId)
    const lesson = module?.lessons?.find((l) => l.id === item.lessonId)

    const addQuestion = () => {
      const q: Question = {
        id: `question-${Date.now()}`, question: "New Question", type: "MULTIPLE_CHOICE",
        options: ["Option 1", "Option 2", "Option 3", "Option 4"], correct_answer: "",
        points: 1, order_index: (assessment.questions?.length || 0) + 1,
      }
      const updated = { ...assessment, questions: [...(assessment.questions || []), q] }
      setCurrentData(updated); onUpdate({ questions: updated.questions })
    }

    const updateQuestion = (index: number, updates: Partial<Question>) => {
      const qs = [...(assessment.questions || [])]
      qs[index] = { ...qs[index], ...updates }
      const updated = { ...assessment, questions: qs }
      setCurrentData(updated); onUpdate({ questions: qs })
    }

    const deleteQuestion = (index: number) => {
      const qs = (assessment.questions || []).filter((_, i) => i !== index)
      const updated = { ...assessment, questions: qs }
      setCurrentData(updated); onUpdate({ questions: qs })
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
                {module?.title} {lesson ? `• ${lesson.title}` : ""}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm"
              onClick={() => (deleteConfirm ? onDelete() : setDeleteConfirm(true))}
              className={`${deleteConfirm ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-red-600 hover:bg-red-50"} border border-red-300`}>
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteConfirm ? "Confirm Delete" : "Delete"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="assessment-title" className="text-gray-900 font-medium">Assessment Title</Label>
            <Input id="assessment-title" value={assessment.title}
              onChange={(e) => { setCurrentData({ ...assessment, title: e.target.value }); onUpdate({ title: e.target.value }) }}
              placeholder="e.g., Module 1 Quiz"
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment-description" className="text-gray-900 font-medium">Description</Label>
            <Textarea id="assessment-description" value={assessment.description || ""}
              onChange={(e) => { setCurrentData({ ...assessment, description: e.target.value }); onUpdate({ description: e.target.value }) }}
              placeholder="Assessment description and instructions" rows={3}
              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessment-type" className="text-gray-900 font-medium">Assessment Type</Label>
              <select id="assessment-type" value={assessment.type || "QUIZ"}
                onChange={(e) => { setCurrentData({ ...assessment, type: e.target.value }); onUpdate({ type: e.target.value }) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 bg-white text-gray-900">
                <option value="QUIZ">Quiz</option>
                <option value="EXAM">Exam</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="PROJECT">Project</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passing-score" className="text-gray-900 font-medium">Passing Score (%)</Label>
              <Input id="passing-score" type="number" min="0" max="100" value={assessment.passing_score || 70}
                onChange={(e) => { setCurrentData({ ...assessment, passing_score: Number(e.target.value) }); onUpdate({ passing_score: Number(e.target.value) }) }}
                className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time-limit" className="text-gray-900 font-medium">Time Limit (minutes)</Label>
              <Input id="time-limit" type="number" min="0" value={assessment.time_limit_minutes || ""}
                onChange={(e) => { setCurrentData({ ...assessment, time_limit_minutes: Number(e.target.value) || null }); onUpdate({ time_limit_minutes: Number(e.target.value) || null }) }}
                placeholder="No time limit"
                className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-attempts" className="text-gray-900 font-medium">Max Attempts</Label>
              <Input id="max-attempts" type="number" min="1" value={assessment.max_attempts || 3}
                onChange={(e) => { setCurrentData({ ...assessment, max_attempts: Number(e.target.value) }); onUpdate({ max_attempts: Number(e.target.value) }) }}
                className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="space-y-0.5">
              <Label htmlFor="publish-assessment" className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer">
                <Zap className="w-4 h-4 text-[#0158B7]" /> Published
              </Label>
              <p className="text-sm text-gray-600">Make this assessment available to students</p>
            </div>
            <Switch id="publish-assessment" checked={assessment.is_published !== false}
              onCheckedChange={(c) => { setCurrentData({ ...assessment, is_published: c }); onUpdate({ is_published: c }) }}
              className="data-[state=checked]:bg-[#0158B7]" />
          </div>

          {/* Questions */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-medium text-gray-900">Questions</Label>
              <Button size="sm" onClick={addQuestion} className="bg-[#0158B7] hover:bg-[#014A9C] text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Question
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
                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`question-text-${index}`} className="text-gray-900 font-medium">Question Text</Label>
                      <Textarea id={`question-text-${index}`} value={question.question}
                        onChange={(e) => updateQuestion(index, { question: e.target.value })}
                        placeholder="Enter your question here" rows={2}
                        className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
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
                        <select id={`question-type-${index}`} value={question.type || "MULTIPLE_CHOICE"}
                          onChange={(e) => {
                            const v = e.target.value; const u: any = { type: v }
                            if (v === "MULTIPLE_CHOICE") { u.options = ["Option 1","Option 2","Option 3","Option 4"]; u.correct_answer = "" }
                            else if (v === "TRUE_FALSE") { u.options = ["True","False"]; u.correct_answer = "" }
                            else { u.options = []; u.correct_answer = "" }
                            updateQuestion(index, u)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 bg-white text-gray-900">
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
                        {(question.options || []).map((option, oi) => (
                          <div key={oi} className="flex gap-2 items-center">
                            <Input value={option}
                              onChange={(e) => { const o = [...(question.options || [])]; o[oi] = e.target.value; updateQuestion(index, { options: o }) }}
                              placeholder={`Option ${oi + 1}`}
                              className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
                            <button type="button" onClick={() => updateQuestion(index, { correct_answer: option })}
                              className={`px-3 py-2 rounded text-sm font-medium min-w-[80px] transition-colors ${
                                question.correct_answer === option
                                  ? "bg-[#0158B7] text-white border border-[#0158B7]"
                                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}>
                              {question.correct_answer === option ? "Correct ✓" : "Set Correct"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(question.type === "SHORT_ANSWER" || question.type === "ESSAY") && (
                      <div className="space-y-2">
                        <Label className="text-gray-900 font-medium">Correct Answer</Label>
                        <Textarea value={question.correct_answer || ""}
                          onChange={(e) => updateQuestion(index, { correct_answer: e.target.value })}
                          placeholder="Enter the correct answer" rows={2}
                          className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-gray-900 font-medium">Points</Label>
                      <Input type="number" min="0" value={question.points || 1}
                        onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })}
                        className="border-gray-300 focus:border-[#0158B7] focus:ring-2 focus:ring-[#0158B7]/20 focus:ring-offset-0 text-gray-900" />
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