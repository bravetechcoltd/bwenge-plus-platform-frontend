"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle, BookOpen, Clock, Loader2, Video,
  AlertCircle, Film, FileText, Image as ImageIcon, File,
  Users, Tag,
  ChevronRight, Play, BookMarked, X, ZoomIn, ZoomOut,
  RotateCw, FileSpreadsheet, Presentation, FileCode, Archive, Eye,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LessonMaterial {
  id?: string
  title: string
  url: string
  public_id?: string
  type: string
  size_bytes?: number
  original_name?: string
}

interface ContentBlock {
  type: "text" | "video" | "image"
  data: { text?: string; url?: string; caption?: string; alt?: string }
  id: string
  order: number
}

interface Lesson {
  id: string
  title: string
  content: string
  video_url?: string
  thumbnail_url?: string
  duration_minutes: number
  resources?: Array<{ url: string; title: string; description?: string; type?: string }>
  lesson_materials?: LessonMaterial[]
}

interface Course {
  id: string
  title: string
  description?: string
  short_description?: string
  thumbnail_url?: string
  what_you_will_learn?: string
  requirements?: string
  language?: string
  level?: string
  course_type?: string
  duration_minutes?: number
  tags?: string[]
  instructor?: { first_name?: string; last_name?: string; profile_picture_url?: string }
  statistics?: {
    total_modules?: number; total_lessons?: number
    total_duration_minutes?: number; total_assessments?: number
  }
}

interface ContentScreenProps {
  lesson: Lesson
  onComplete: (score: number | undefined, passed: boolean) => void
  isCompleted: boolean
  isStepping: boolean
  progressData?: any
  course?: Course
  isFirstLesson?: boolean
  onDismissOverview?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE TYPE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type FileCategory =
  | "image" | "pdf" | "video" | "audio"
  | "word" | "excel" | "powerpoint"
  | "code" | "archive" | "unknown"

function getFileCategory(type: string, url?: string): FileCategory {
  const t = (type || "").toLowerCase()
  const u = (url || "").toLowerCase()
  const ext = u.split("?")[0].split(".").pop() || ""

  if (t.includes("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "tiff"].includes(ext)) return "image"
  if (t.includes("pdf") || ext === "pdf") return "pdf"
  if (t.includes("video/") || ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"].includes(ext)) return "video"
  if (t.includes("audio/") || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "audio"
  if (t.includes("word") || t.includes("msword") || ["doc", "docx", "odt", "rtf"].includes(ext)) return "word"
  if (t.includes("excel") || t.includes("spreadsheet") || ["xls", "xlsx", "csv", "ods"].includes(ext)) return "excel"
  if (t.includes("presentation") || t.includes("powerpoint") || ["ppt", "pptx", "odp"].includes(ext)) return "powerpoint"
  if (["js", "ts", "py", "java", "c", "cpp", "cs", "go", "rb", "php", "html", "css", "json", "xml", "yaml", "sh", "bash"].includes(ext)) return "code"
  if (["zip", "rar", "tar", "gz", "7z", "bz2"].includes(ext)) return "archive"
  return "unknown"
}

function canPreview(cat: FileCategory): boolean {
  return ["image", "pdf", "video", "audio", "word", "excel", "powerpoint"].includes(cat)
}

function CategoryIcon({ cat, className = "w-5 h-5" }: { cat: FileCategory; className?: string }) {
  switch (cat) {
    case "image": return <ImageIcon className={`${className} text-green-500`} />
    case "pdf": return <FileText className={`${className} text-red-500`} />
    case "video": return <Film className={`${className} text-purple-500`} />
    case "audio": return <Film className={`${className} text-pink-500`} />
    case "word": return <FileText className={`${className} text-blue-600`} />
    case "excel": return <FileSpreadsheet className={`${className} text-emerald-600`} />
    case "powerpoint": return <Presentation className={`${className} text-orange-500`} />
    case "code": return <FileCode className={`${className} text-violet-500`} />
    case "archive": return <Archive className={`${className} text-amber-500`} />
    default: return <File className={`${className} text-gray-400`} />
  }
}

function categoryLabel(cat: FileCategory): string {
  const MAP: Record<FileCategory, string> = {
    image: "Image", pdf: "PDF", video: "Video", audio: "Audio",
    word: "Document", excel: "Spreadsheet", powerpoint: "Presentation",
    code: "Code", archive: "Archive", unknown: "File",
  }
  return MAP[cat]
}

function categoryColor(cat: FileCategory): string {
  const MAP: Record<FileCategory, string> = {
    image: "bg-green-50 text-green-700 border-green-200",
    pdf: "bg-red-50 text-red-700 border-red-200",
    video: "bg-purple-50 text-purple-700 border-purple-200",
    audio: "bg-pink-50 text-pink-700 border-pink-200",
    word: "bg-blue-50 text-blue-700 border-blue-200",
    excel: "bg-emerald-50 text-emerald-700 border-emerald-200",
    powerpoint: "bg-orange-50 text-orange-700 border-orange-200",
    code: "bg-violet-50 text-violet-700 border-violet-200",
    archive: "bg-amber-50 text-amber-700 border-amber-200",
    unknown: "bg-gray-50 text-gray-600 border-gray-200",
  }
  return MAP[cat]
}

function fmtSize(bytes?: number): string {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewModalProps {
  material: LessonMaterial
  onClose: () => void
}

function MaterialPreviewModal({ material, onClose }: PreviewModalProps) {
  const cat = getFileCategory(material.type, material.url)
  const name = material.title || material.original_name || "File"
  const size = fmtSize(material.size_bytes)

  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const googleViewerUrl = (url: string) =>
    `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`

  const renderPreview = () => {
    switch (cat) {
      case "image":
        return (
          <div className="flex-1 overflow-auto bg-[#111827] flex items-center justify-center p-4">
            <img
              src={material.url}
              alt={name}
              draggable={false}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 6,
                userSelect: "none",
              }}
            />
          </div>
        )
      case "pdf":
        return (
          <iframe
            src={material.url}
            className="flex-1 w-full"
            title={name}
            style={{ border: "none", display: "block" }}
          />
        )
      case "video":
        return (
          <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
            <video
              src={material.url}
              controls
              autoPlay={false}
              className="w-full h-full object-contain"
              controlsList="nodownload nofullscreen"
              onContextMenu={e => e.preventDefault()}
            />
          </div>
        )
      case "audio":
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-primary/5 p-12">
            <div className="w-32 h-32 rounded-full bg-white shadow-xl flex items-center justify-center ring-4 ring-primary/10">
              <Film className="w-16 h-16 text-primary/50" />
            </div>
            <p className="text-base font-semibold text-gray-700 text-center max-w-xs leading-snug">{name}</p>
            <audio src={material.url} controls className="w-full max-w-md" />
          </div>
        )
      case "word":
      case "powerpoint":
      case "excel":
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-4 py-2 bg-primary flex items-center gap-2 text-xs text-white/90">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-white/80" />
              Previewed via Google Docs Viewer — open the file for the full experience.
            </div>
            <iframe
              src={googleViewerUrl(material.url)}
              className="flex-1 w-full"
              title={name}
              style={{ border: "none", display: "block" }}
              loading="lazy"
            />
          </div>
        )
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-muted/30 p-12 text-center">
            <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-border flex items-center justify-center shadow-sm">
              <CategoryIcon cat={cat} className="w-12 h-12" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-bold text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
            </div>
          </div>
        )
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="material-preview-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-[2vh_2vw]"
        onClick={onClose}
      >
        <motion.div
          key="material-preview-panel"
          initial={{ scale: 0.97, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: "96vw", height: "96vh" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-primary">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <CategoryIcon cat={cat} className="w-4 h-4 !text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white leading-tight truncate">{name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                    {categoryLabel(cat)}
                  </span>
                  {size && <span className="text-[10px] text-white/60 tabular-nums">{size}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {cat === "image" && (
                <>
                  <button onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))} title="Zoom out" className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/15 transition-colors">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-white/60 tabular-nums w-9 text-center select-none font-mono">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))} title="Zoom in" className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/15 transition-colors">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate 90°" className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/15 transition-colors">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-white/25 mx-1" />
                </>
              )}
              <button onClick={onClose} title="Close (Esc)" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors text-xs font-medium border border-white/20">
                <X className="w-4 h-4" />Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">{renderPreview()}</div>
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-border bg-muted/40">
            <div className="flex items-center gap-2 min-w-0">
              <File className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate max-w-[500px]">{material.original_name || name}</span>
              {size && <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">· {size}</span>}
            </div>
            <button onClick={onClose} className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border bg-white rounded-lg hover:bg-muted/50 transition-colors">Close</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON RESOURCES SECTION
// ─────────────────────────────────────────────────────────────────────────────

function FileTile({ cat }: { cat: FileCategory }) {
  const BG: Record<FileCategory, string> = {
    image: "bg-green-50", pdf: "bg-red-50", video: "bg-purple-50", audio: "bg-pink-50",
    word: "bg-blue-50", excel: "bg-emerald-50", powerpoint: "bg-orange-50",
    code: "bg-violet-50", archive: "bg-amber-50", unknown: "bg-muted/50",
  }
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${BG[cat]}`}>
      <CategoryIcon cat={cat} className="w-4 h-4" />
    </div>
  )
}

interface LessonResourcesSectionProps {
  materials: LessonMaterial[]
  resources: Array<{ url: string; title: string; description?: string; type?: string }>
}

function LessonResourcesSection({ materials, resources }: LessonResourcesSectionProps) {
  const [previewing, setPreviewing] = useState<LessonMaterial | null>(null)
  const hasMaterials = materials.length > 0
  const hasResources = resources.length > 0
  if (!hasMaterials && !hasResources) return null

  return (
    <>
      {previewing && <MaterialPreviewModal material={previewing} onClose={() => setPreviewing(null)} />}
      <div className="mt-5 rounded-xl overflow-hidden border border-border shadow-sm bg-white">
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-primary">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Lesson Resources</p>
              <p className="text-[11px] text-white/65 mt-0.5">
                {hasMaterials && `${materials.length} file${materials.length !== 1 ? "s" : ""}`}
                {hasMaterials && hasResources && " · "}
                {hasResources && `${resources.length} link${resources.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            {Array.from(new Set(materials.map(m => getFileCategory(m.type, m.url)))).slice(0, 4).map(cat => (
              <span key={cat} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">{categoryLabel(cat)}</span>
            ))}
          </div>
        </div>

        {hasMaterials && (
          <>
            {hasResources && (
              <div className="px-5 py-1.5 bg-muted/30 border-b border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Course Files</p>
              </div>
            )}
            <div className="grid items-center px-5 py-2 border-b border-border bg-muted/20" style={{ gridTemplateColumns: "2rem 1fr 5rem 4rem 5.5rem" }}>
              <span />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-2">File Name</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Type</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Size</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Action</span>
            </div>
            <div className="divide-y divide-border/50">
              {materials.map((mat, idx) => {
                const cat = getFileCategory(mat.type, mat.url)
                const name = mat.title || mat.original_name || "Untitled"
                const size = fmtSize(mat.size_bytes)
                const previewable = canPreview(cat)
                const ext = (mat.url.split("?")[0].split(".").pop() || mat.type?.split("/").pop() || "").toUpperCase().slice(0, 6)
                return (
                  <div key={mat.public_id || mat.url || idx} className="grid items-center px-5 py-2.5 hover:bg-muted/20 transition-colors" style={{ gridTemplateColumns: "2rem 1fr 5rem 4rem 5.5rem" }}>
                    <FileTile cat={cat} />
                    <div className="min-w-0 pl-2">
                      <p className="text-[13px] font-semibold text-foreground truncate leading-snug">{name}</p>
                      <span className="text-[10px] font-bold text-muted-foreground/60 tracking-wider">{ext}</span>
                    </div>
                    <div className="flex justify-center">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${categoryColor(cat)}`}>{categoryLabel(cat)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground tabular-nums">{size || "—"}</span>
                    </div>
                    <div className="flex justify-center">
                      {previewable ? (
                        <button onClick={() => setPreviewing(mat)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-lg hover:bg-primary/15 transition-colors whitespace-nowrap">
                          <Eye className="w-3 h-3" />Preview
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-muted-foreground/40 bg-muted/30 border border-border/50 rounded-lg cursor-not-allowed whitespace-nowrap">
                          <Eye className="w-3 h-3" />Preview
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {hasResources && (
          <>
            <div className={`px-5 py-1.5 border-b border-border ${hasMaterials ? "border-t bg-muted/30" : "bg-muted/20"}`}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">External Links</p>
            </div>
            <div className="grid items-center px-5 py-2 border-b border-border bg-muted/20" style={{ gridTemplateColumns: "2rem 1fr 4rem" }}>
              <span />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-2">Title</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Type</span>
            </div>
            <div className="divide-y divide-border/50">
              {resources.map((res, idx) => {
                const isValidLink = !!res.url
                return (
                  <div key={idx} className="grid items-center px-5 py-2.5 hover:bg-muted/20 transition-colors" style={{ gridTemplateColumns: "2rem 1fr 4rem" }}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 pl-2">
                      <a href={isValidLink ? res.url : "#"} target="_blank" rel="noopener noreferrer"
                        onClick={e => !isValidLink && e.preventDefault()}
                        className={`block text-[13px] font-semibold truncate leading-snug ${isValidLink ? "text-foreground hover:underline cursor-pointer" : "text-muted-foreground cursor-not-allowed"}`}>
                        {res.title}
                      </a>
                      {res.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{res.description}</p>}
                      {res.url && <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5 font-mono">{res.url}</p>}
                    </div>
                    <div className="flex justify-center">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-primary/8 text-primary border-primary/20 whitespace-nowrap">{res.type || "Link"}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RICH TEXT / CONTENT BLOCK RENDERER
// ─────────────────────────────────────────────────────────────────────────────

function RichContent({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null
  const isHtml = /<[a-z][\s\S]*>/i.test(html)
  if (isHtml) {
    return (
      <div
        className={`
          rich-text-content prose prose-sm max-w-none
          prose-p:my-2 prose-p:leading-relaxed prose-p:text-gray-700 prose-p:break-words
          prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mt-4 prose-headings:mb-2
          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h3:font-semibold
          prose-h4:text-sm prose-h4:font-semibold prose-h5:text-sm prose-h5:font-medium
          prose-ul:my-2 prose-ul:pl-5 prose-ul:list-disc
          prose-ol:my-2 prose-ol:pl-5 prose-ol:list-decimal
          prose-li:my-1 prose-li:leading-relaxed prose-li:marker:text-gray-500
          prose-strong:font-semibold prose-strong:text-gray-900
          prose-em:text-gray-700 prose-em:italic
          prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4
          prose-blockquote:py-1 prose-blockquote:my-2 prose-blockquote:italic prose-blockquote:text-gray-600
          prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-3 prose-pre:rounded-lg
          prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap
          prose-a:text-[#0158B7] prose-a:underline prose-a:break-words
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:my-1 [&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-gray-700
          [&_strong]:font-semibold [&_strong]:text-gray-900
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2.5 [&_h2]:text-gray-900
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-gray-900
          [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mb-1.5 [&_h4]:text-gray-900
          overflow-hidden break-words whitespace-normal w-full max-w-full
          ${className}
        `}
        style={{ wordWrap: "break-word", overflowWrap: "break-word", wordBreak: "break-word", maxWidth: "100%" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  return (
    <p className={`text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap w-full max-w-full ${className}`}
      style={{ wordWrap: "break-word", overflowWrap: "break-word", wordBreak: "break-word" }}>
      {html}
    </p>
  )
}

function parseContentBlocks(content: string): ContentBlock[] {
  try {
    const isHTML = content.includes("<") && content.includes(">")
    const trimmedContent = content.trim()
    if (trimmedContent.startsWith("{") || trimmedContent.startsWith("[")) {
      try {
        let parsedContent = content
        if (parsedContent.startsWith('"') && parsedContent.endsWith('"')) {
          parsedContent = parsedContent.slice(1, -1).replace(/\\"/g, '"')
        }
        const contentData = JSON.parse(parsedContent)
        if (contentData.blocks && Array.isArray(contentData.blocks)) return contentData.blocks as ContentBlock[]
        if (Array.isArray(contentData)) return contentData as ContentBlock[]
      } catch {
        console.log("Content is not JSON, treating as HTML")
      }
    }
    if (isHTML || content) {
      return [{ type: "text", data: { text: content }, id: "content-text", order: 1 }]
    }
    return [{ type: "text", data: { text: "No content available" }, id: "fallback-text", order: 1 }]
  } catch (error) {
    console.error("Failed to parse content blocks:", error)
    return [{ type: "text", data: { text: content }, id: "error-fallback-text", order: 1 }]
  }
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text": {
      const textContent = block.data.text || ""
      const containsHTML = textContent.includes("<") && textContent.includes(">")
      return (
        <div className="ql-editor rich-text-content" style={{ padding: 0, backgroundColor: "transparent", border: "none", minHeight: "auto" }}>
          {containsHTML ? <RichContent html={textContent} /> : <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{textContent}</p>}
        </div>
      )
    }
    case "video": {
      if (!block.data.url) return null
      const isYouTube = block.data.url.includes("youtube.com") || block.data.url.includes("youtu.be")
      return (
        <div className="mb-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {isYouTube ? (
              <iframe src={block.data.url.replace("watch?v=", "embed/")} title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen className="w-full h-full" />
            ) : (
              <video src={block.data.url} controls className="w-full h-full" poster={block.data.caption}>
                Your browser does not support the video tag.
              </video>
            )}
          </div>
          {block.data.caption && <p className="text-sm text-muted-foreground mt-2 text-center">{block.data.caption}</p>}
        </div>
      )
    }
    case "image":
      return (
        <div className="mb-6">
          <div className="rounded-lg overflow-hidden">
            <img src={block.data.url || "/placeholder.svg"} alt={block.data.alt || "Content image"}
              className="w-full max-w-3xl h-auto mx-auto rounded-lg object-contain" />
          </div>
          {block.data.caption && <p className="text-sm text-muted-foreground mt-2 text-center">{block.data.caption}</p>}
        </div>
      )
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE OVERVIEW SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function CourseOverviewScreen({ course, onStart }: { course: Course; onStart: () => void }) {
  const totalModules = course.statistics?.total_modules || 0
  const totalLessons = course.statistics?.total_lessons || 0
  const totalDuration = course.statistics?.total_duration_minutes || course.duration_minutes || 0
  const instructorName = course.instructor
    ? `${course.instructor.first_name || ""} ${course.instructor.last_name || ""}`.trim()
    : null

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg mb-8">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-56 md:h-72 object-cover" />
        ) : (
          <div className="w-full h-56 md:h-72 bg-gradient-to-br from-[#0158B7] to-[#0141A0] flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {course.level && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-800 capitalize">{course.level.toLowerCase()}</span>
          )}
          {course.course_type && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${course.course_type === "MOOC" ? "bg-green-500/90 text-white" : "bg-purple-500/90 text-white"}`}>
              {course.course_type === "MOOC" ? "Public" : "Private"}
            </span>
          )}
        </div>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-snug drop-shadow-lg line-clamp-2">{course.title}</h1>
          </div>
          <Button onClick={onStart} size="lg" className="flex-shrink-0 bg-[#0158B7] hover:bg-[#014A9C] text-white px-6 shadow-lg flex items-center gap-2">
            <Play className="w-4 h-4 fill-white" />Start Learning
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: <BookOpen className="w-4 h-4 text-[#0158B7]" />, label: "Modules", value: totalModules },
          { icon: <BookMarked className="w-4 h-4 text-green-600" />, label: "Lessons", value: totalLessons },
          { icon: <Clock className="w-4 h-4 text-orange-500" />, label: "Duration", value: totalDuration > 0 ? `${totalDuration} min` : "Self-paced" },
          { icon: <Users className="w-4 h-4 text-indigo-500" />, label: "Language", value: course.language || "English" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">{stat.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {instructorName && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
          {course.instructor?.profile_picture_url ? (
            <img src={course.instructor.profile_picture_url} alt={instructorName} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0158B7]/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#0158B7]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#0158B7]" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Instructor</p>
            <p className="text-sm font-semibold text-gray-900">{instructorName}</p>
          </div>
        </div>
      )}

      {course.short_description && (
        <div className="mb-6 p-5 bg-[#0158B7]/5 border border-[#0158B7]/15 rounded-xl">
          <RichContent html={course.short_description} className="text-[#0158B7]" />
        </div>
      )}
      {course.description && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#0158B7]" />About This Course</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"><RichContent html={course.description} /></div>
        </section>
      )}
      {course.what_you_will_learn && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />What You'll Learn</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"><RichContent html={course.what_you_will_learn} /></div>
        </section>
      )}
      {course.requirements && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-500" />Requirements</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"><RichContent html={course.requirements} /></div>
        </section>
      )}
      {(course.tags || []).length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-gray-500" />Topics</h2>
          <div className="flex flex-wrap gap-2">
            {course.tags!.map((tag, i) => (
              <span key={i} className="text-xs font-medium px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full">{tag}</span>
            ))}
          </div>
        </section>
      )}
      <div className="flex justify-center pt-4">
        <Button onClick={onStart} size="lg" className="bg-[#0158B7] hover:bg-[#014A9C] text-white px-10 py-6 text-base font-semibold flex items-center gap-2 rounded-xl shadow-lg">
          <Play className="w-5 h-5 fill-white" />Start First Lesson<ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCH-GATED VIDEO
// ─────────────────────────────────────────────────────────────────────────────

const WATCH_THRESHOLD = 0.90
const watchedLessonsRegistry = new Map<string, boolean>()

interface WatchGatedVideoProps {
  videoUrl: string
  thumbnailUrl?: string
  lessonTitle: string
  lessonId: string
  isCompleted: boolean
  onWatchedEnough: () => void
}

function WatchGatedVideo({ videoUrl, thumbnailUrl, lessonTitle, lessonId, isCompleted, onWatchedEnough }: WatchGatedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [watchedPercent, setWatchedPercent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasWatchedEnough, setHasWatchedEnough] = useState(
    () => isCompleted || watchedLessonsRegistry.get(lessonId) === true
  )
  const maxReachedRef = useRef(0)

  useEffect(() => {
    maxReachedRef.current = 0
    setWatchedPercent(0)
    setCurrentTime(0)
    setDuration(0)
    setIsLoading(true)
    const alreadyWatched = isCompleted || watchedLessonsRegistry.get(lessonId) === true
    setHasWatchedEnough(alreadyWatched)
  }, [lessonId, isCompleted])

  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")
  const isVimeo = videoUrl.includes("vimeo.com")

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const current = v.currentTime
    if (current > maxReachedRef.current + 3 && !isCompleted) {
      v.currentTime = maxReachedRef.current
      return
    }
    if (current > maxReachedRef.current) maxReachedRef.current = current
    const pct = (maxReachedRef.current / v.duration) * 100
    setWatchedPercent(Math.min(pct, 100))
    setCurrentTime(v.currentTime)
    if (pct >= WATCH_THRESHOLD * 100 && !hasWatchedEnough) {
      setHasWatchedEnough(true)
      watchedLessonsRegistry.set(lessonId, true)
      onWatchedEnough()
    }
  }, [isCompleted, hasWatchedEnough, lessonId, onWatchedEnough])

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration)
    setIsLoading(false)
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.addEventListener("timeupdate", handleTimeUpdate)
    v.addEventListener("loadedmetadata", handleLoadedMetadata)
    v.addEventListener("canplay", () => setIsLoading(false))
    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate)
      v.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [handleTimeUpdate])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (isYouTube || isVimeo) {
    const getEmbedUrl = (url: string) => {
      if (isYouTube) {
        const id = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)?.[1]
        return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : url
      }
      if (isVimeo) {
        const id = url.match(/vimeo\.com\/(\d+)/)?.[1]
        return id ? `https://player.vimeo.com/video/${id}` : url
      }
      return url
    }
    return (
      <div className="space-y-3">
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-md">
          <iframe src={getEmbedUrl(videoUrl)} title={lessonTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen className="w-full h-full" onLoad={() => setIsLoading(false)} />
        </div>
        {!isCompleted && !hasWatchedEnough && (
          <>
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Watch the entire video before marking this lesson complete.
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              setHasWatchedEnough(true)
              watchedLessonsRegistry.set(lessonId, true)
              onWatchedEnough()
            }}>
              I've finished watching
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-md">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
        <video ref={videoRef} src={videoUrl} controls className="w-full h-full" poster={thumbnailUrl}
          controlsList="nodownload" onContextMenu={e => e.preventDefault()}>
          Your browser does not support the video tag.
        </video>
      </div>
      {duration > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{fmt(currentTime)}</span>
            <span className={`font-medium ${watchedPercent >= WATCH_THRESHOLD * 100 ? "text-green-600" : "text-gray-400"}`}>
              {Math.round(watchedPercent)}% watched
              {watchedPercent < WATCH_THRESHOLD * 100 && !isCompleted && (
                <span className="text-gray-400 font-normal"> — watch {Math.round(WATCH_THRESHOLD * 100)}% to complete</span>
              )}
            </span>
            <span>{fmt(duration)}</span>
          </div>
          <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${watchedPercent >= WATCH_THRESHOLD * 100 ? "bg-green-500" : "bg-[#0158B7]"}`}
              style={{ width: `${watchedPercent}%` }} />
          </div>
          {!isCompleted && !hasWatchedEnough && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              You cannot skip — watch at least {Math.round(WATCH_THRESHOLD * 100)}% to mark complete.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL ENGAGEMENT GATE HOOK (UPDATED: 1 SECOND DWELL TIME)
// ─────────────────────────────────────────────────────────────────────────────

const AVG_WPM = 200
const SCROLL_GATE = 0.90
const BOTTOM_DWELL_MS = 1000 // Changed from 3000 to 1000 (1 second)
const MIN_INTERACTIONS = 3

function estimateReadTimeMs(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ")
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(10000, (words / AVG_WPM) * 60 * 1000)
}

interface ScrollGateState {
  scrollReached: boolean
  dwellMet: boolean
  readTimeMet: boolean
  interactionsMet: boolean
}

function useScrollEngagementGate(
  containerRef: React.RefObject<HTMLElement>,
  lessonId: string,
  lessonContent: string,
  isAlreadyCompleted: boolean,
): { canComplete: boolean; gateState: ScrollGateState; progressPct: number } {

  const [gateState, setGateState] = useState<ScrollGateState>({
    scrollReached: false,
    dwellMet: false,
    readTimeMet: false,
    interactionsMet: false,
  })

  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openedAtRef = useRef(Date.now())
  const interactionCountRef = useRef(0)
  const tabHiddenTimeRef = useRef(0)
  const tabHiddenSinceRef = useRef<number | null>(null)
  const fastScrollProtectRef = useRef(false)
  const dwellActiveRef = useRef(false)

  const startDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current)
    dwellActiveRef.current = true
    dwellTimerRef.current = setTimeout(() => {
      setGateState(s => ({ ...s, dwellMet: true }))
      dwellTimerRef.current = null
      dwellActiveRef.current = false
    }, BOTTOM_DWELL_MS)
  }, [])

  const clearDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current)
      dwellTimerRef.current = null
    }
    dwellActiveRef.current = false
  }, [])

  // Reset on lesson change
  useEffect(() => {
    setGateState({ scrollReached: false, dwellMet: false, readTimeMet: false, interactionsMet: false })
    openedAtRef.current = Date.now()
    interactionCountRef.current = 0
    tabHiddenTimeRef.current = 0
    tabHiddenSinceRef.current = null
    fastScrollProtectRef.current = false
    clearDwellTimer()
    if (readTimerRef.current) clearTimeout(readTimerRef.current)
  }, [lessonId, clearDwellTimer])

  // Read time timer
  useEffect(() => {
    if (isAlreadyCompleted) return
    const minMs = estimateReadTimeMs(lessonContent)

    const startReadTimer = () => {
      if (readTimerRef.current) clearTimeout(readTimerRef.current)
      const remaining = Math.max(1000, minMs - tabHiddenTimeRef.current)
      readTimerRef.current = setTimeout(() => {
        setGateState(s => ({ ...s, readTimeMet: true }))
      }, remaining)
    }
    startReadTimer()

    const onVisibility = () => {
      if (document.hidden) {
        tabHiddenSinceRef.current = Date.now()
        if (readTimerRef.current) clearTimeout(readTimerRef.current)
      } else {
        if (tabHiddenSinceRef.current !== null) {
          tabHiddenTimeRef.current += Date.now() - tabHiddenSinceRef.current
          tabHiddenSinceRef.current = null
        }
        startReadTimer()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      if (readTimerRef.current) clearTimeout(readTimerRef.current)
    }
  }, [lessonId, lessonContent, isAlreadyCompleted])

  // Scroll + dwell - monitors the ACTUAL scrollable element (the document)
  useEffect(() => {
    if (isAlreadyCompleted) return

    // Check if there's any scrollable content
    const isScrollNeeded = () => {
      return document.documentElement.scrollHeight > window.innerHeight
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      const scrollable = scrollHeight - clientHeight

      // If no scroll needed, content fits on screen
      if (scrollable <= 10 || !isScrollNeeded()) {
        if (!fastScrollProtectRef.current) {
          setGateState(s => ({ ...s, scrollReached: true }))
          if (!dwellActiveRef.current) startDwellTimer()
        }
        return
      }

      const pct = scrollTop / scrollable

      if (pct >= SCROLL_GATE) {
        const elapsed = Date.now() - openedAtRef.current
        if (elapsed < 2000 && !fastScrollProtectRef.current) {
          fastScrollProtectRef.current = true
          setGateState(s => ({ ...s, scrollReached: false, dwellMet: false }))
          clearDwellTimer()
          return
        }
        if (!fastScrollProtectRef.current) {
          setGateState(s => ({ ...s, scrollReached: true }))
          if (!dwellActiveRef.current) startDwellTimer()
        }
      } else {
        clearDwellTimer()
        if (pct < 0.5) fastScrollProtectRef.current = false
        setGateState(s => ({ ...s, scrollReached: false, dwellMet: false }))
      }
    }

    // Initial check
    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // Also listen for resize in case content changes
    window.addEventListener("resize", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
      clearDwellTimer()
    }
  }, [lessonId, isAlreadyCompleted, startDwellTimer, clearDwellTimer])

  // Interaction tracking
  useEffect(() => {
    if (isAlreadyCompleted) return
    
    const onInteract = () => {
      interactionCountRef.current += 1
      if (interactionCountRef.current >= MIN_INTERACTIONS) {
        setGateState(s => ({ ...s, interactionsMet: true }))
      }
    }
    
    document.addEventListener("mousemove", onInteract, { passive: true })
    document.addEventListener("click", onInteract, { passive: true })
    document.addEventListener("touchstart", onInteract, { passive: true })
    document.addEventListener("keydown", onInteract, { passive: true })
    
    return () => {
      document.removeEventListener("mousemove", onInteract)
      document.removeEventListener("click", onInteract)
      document.removeEventListener("touchstart", onInteract)
      document.removeEventListener("keydown", onInteract)
    }
  }, [lessonId, isAlreadyCompleted])

  const canComplete = isAlreadyCompleted || (
    gateState.scrollReached &&
    gateState.dwellMet &&
    gateState.readTimeMet &&
    gateState.interactionsMet
  )

  const gatesDone = [gateState.scrollReached, gateState.dwellMet, gateState.readTimeMet, gateState.interactionsMet].filter(Boolean).length
  const progressPct = isAlreadyCompleted ? 100 : Math.round((gatesDone / 4) * 100)

  return { canComplete, gateState, progressPct }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL SCROLL GATE INDICATOR — right-side rail
// ─────────────────────────────────────────────────────────────────────────────

interface VerticalGateIndicatorProps {
  gateState: ScrollGateState
  progressPct: number
  isCompleted: boolean
}

function VerticalGateIndicator({ gateState, progressPct, isCompleted }: VerticalGateIndicatorProps) {
  if (isCompleted) return null

  const allDone = gateState.scrollReached && gateState.dwellMet && gateState.readTimeMet && gateState.interactionsMet
  if (allDone) return null

  const gates = [
    { done: gateState.scrollReached },
    { done: gateState.dwellMet },
    { done: gateState.readTimeMet },
    { done: gateState.interactionsMet },
  ]

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
      style={{ gap: 0 }}
      aria-hidden="true"
    >
      {/* Track background */}
      <div
        style={{
          position: "relative",
          width: 4,
          height: 120,
          borderRadius: 999,
          background: "rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Smooth fill bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: `${progressPct}%`,
            borderRadius: 999,
            background: progressPct === 100
              ? "#16a34a"
              : progressPct >= 75
              ? "#0158B7"
              : progressPct >= 50
              ? "#0158B7"
              : progressPct >= 25
              ? "#0158B7"
              : "#cbd5e1",
            transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease",
          }}
        />
      </div>

      {/* Gate dots */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: 120,
          justifyContent: "space-between",
          paddingTop: 2,
          paddingBottom: 2,
        }}
      >
        {gates.map((gate, i) => (
          <div
            key={i}
            style={{
              width: gate.done ? 8 : 6,
              height: gate.done ? 8 : 6,
              borderRadius: "50%",
              background: gate.done ? "#16a34a" : "rgba(0,0,0,0.18)",
              border: gate.done ? "1.5px solid #16a34a" : "1.5px solid rgba(0,0,0,0.15)",
              transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CONTENT SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function ContentScreen({
  lesson, onComplete, isCompleted, isStepping, progressData,
  course, isFirstLesson = false, onDismissOverview,
}: ContentScreenProps) {
  const [isLessonCompleted, setIsLessonCompleted] = useState(false)
  const [checkingProgress, setCheckingProgress] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [videoWatchedEnough, setVideoWatchedEnough] = useState(isCompleted)
  const [showOverview, setShowOverview] = useState(!!(isFirstLesson && course && !isLessonCompleted))

  const contentContainerRef = useRef<HTMLDivElement>(null)

  // Check completion from progressData
  useEffect(() => {
    try {
      if (!progressData || !progressData.completedSteps) { setCheckingProgress(false); return }
      const lessonCompletion = progressData.completedSteps.find(
        (step: any) => step.type === "lesson" && step.lessonId === lesson.id && step.isCompleted === true,
      )
      const completed = !!lessonCompletion
      setIsLessonCompleted(completed)
      setCheckingProgress(false)
      if (completed) {
        setVideoWatchedEnough(true)
        setShowOverview(false)
        if (isCompleting) setIsCompleting(false)
      }
    } catch (error) {
      console.error("Error checking lesson completion:", error)
      setCheckingProgress(false)
      setIsCompleting(false)
    }
  }, [lesson.id, progressData, isCompleting])

  useEffect(() => {
    const alreadyDone = isCompleted || isLessonCompleted
    setVideoWatchedEnough(alreadyDone)
  }, [lesson.id, isCompleted, isLessonCompleted])

  useEffect(() => {
    if (isLessonCompleted || isCompleted) {
      setShowOverview(false)
      setVideoWatchedEnough(true)
    }
  }, [isLessonCompleted, isCompleted])

  const contentBlocks = parseContentBlocks(lesson.content || "")
  const lessonIsAlreadyDone = isLessonCompleted || isCompleted

  const { canComplete: scrollCanComplete, gateState, progressPct } = useScrollEngagementGate(
    contentContainerRef as React.RefObject<HTMLElement>,
    lesson.id,
    lesson.content || "",
    lessonIsAlreadyDone,
  )

  const handleComplete = async () => {
    if (!isLessonCompleted && !isCompleting) {
      setIsCompleting(true)
      try {
        await onComplete(undefined, true)
      } catch (error) {
        console.error("❌ [ContentScreen] Error completing lesson:", error)
        setIsCompleting(false)
      }
    }
  }

  let parsedResources: any[] = []
  try {
    if (typeof lesson.resources === "string" && (lesson.resources as string).trim()) parsedResources = JSON.parse(lesson.resources as string)
    else if (Array.isArray(lesson.resources)) parsedResources = lesson.resources
  } catch { parsedResources = [] }

  const hasVideo = !!(lesson.video_url?.trim())
  const hasMaterials = !!(lesson.lesson_materials && lesson.lesson_materials.length > 0)
  const canMarkComplete = (!hasVideo || videoWatchedEnough) && scrollCanComplete
  const shouldShowMarkCompleteButton = !isLessonCompleted && !isCompleted && !checkingProgress && !isCompleting && canMarkComplete

  if (showOverview && course) {
    return (
      <div className="w-full py-6 select-none" onContextMenu={e => e.preventDefault()}>
        <CourseOverviewScreen course={course} onStart={() => { setShowOverview(false); onDismissOverview?.() }} />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Vertical gate indicator — fixed to right edge */}
      {!lessonIsAlreadyDone && (
        <VerticalGateIndicator
          gateState={gateState}
          progressPct={progressPct}
          isCompleted={lessonIsAlreadyDone}
        />
      )}

      {/* Main content - NO internal scrolling, let the parent handle it */}
      <div
        ref={contentContainerRef}
        className="w-full space-y-6 pb-10 select-none"
        onContextMenu={e => e.preventDefault()}
      >
        <Card className="shadow-none border-0 bg-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl font-bold text-gray-900 leading-snug">{lesson.title}</CardTitle>
                <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {lesson.duration_minutes && lesson.duration_minutes > 0 ? `${lesson.duration_minutes} min` : "Self-paced"}
                  </span>
                  {hasVideo && <span className="flex items-center gap-1.5 text-purple-600"><Video className="w-4 h-4" />Video included</span>}
                  {hasMaterials && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <File className="w-4 h-4" />
                      {lesson.lesson_materials!.length} material{lesson.lesson_materials!.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {checkingProgress && <span className="text-xs text-blue-500 animate-pulse">Checking progress…</span>}
                  {isCompleting && <span className="text-xs text-blue-500 animate-pulse">Marking complete…</span>}
                  {isLessonCompleted && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      <CheckCircle className="w-3 h-3" />Completed
                    </span>
                  )}
                </div>
              </div>
              {lesson.thumbnail_url && (
                <img src={lesson.thumbnail_url} alt={lesson.title} className="w-20 h-14 object-cover rounded-lg border border-gray-100 flex-shrink-0 shadow-sm" />
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-6">
            {/* Video */}
            {hasVideo && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-500" />Video Lesson
                </h3>
                <WatchGatedVideo
                  videoUrl={lesson.video_url!}
                  thumbnailUrl={lesson.thumbnail_url}
                  lessonTitle={lesson.title}
                  lessonId={lesson.id}
                  isCompleted={isLessonCompleted || isCompleted}
                  onWatchedEnough={() => setVideoWatchedEnough(true)}
                />
              </div>
            )}

            {/* Lesson text content */}
            {contentBlocks.length > 0 && lesson.content ? (
              <div className="space-y-4">
                <div className="space-y-4">
                  {contentBlocks.sort((a, b) => a.order - b.order).map(block => (
                    <ContentBlockRenderer key={block.id} block={block} />
                  ))}
                </div>

                <div className="pt-2">
                  {shouldShowMarkCompleteButton && (
                    <Button onClick={handleComplete} disabled={isCompleting || isStepping}
                      className="flex items-center gap-2 bg-[#0158B7] hover:bg-[#014A9C] text-white">
                      {isCompleting || isStepping
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Completing…</>
                        : <><CheckCircle className="w-4 h-4" />Mark Complete</>
                      }
                    </Button>
                  )}
                  {hasVideo && !videoWatchedEnough && !isCompleted && !isLessonCompleted && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />Watch the video above to unlock completion.
                    </p>
                  )}
                  {isLessonCompleted && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-green-700 dark:text-green-300 font-medium text-sm">This lesson has been completed</span>
                    </div>
                  )}
                </div>
              </div>
            ) : !hasVideo ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No content available for this lesson yet.</p>
              </div>
            ) : (
              <div className="pt-1">
                {shouldShowMarkCompleteButton && (
                  <Button onClick={handleComplete} disabled={isCompleting || isStepping}
                    className="flex items-center gap-2 bg-[#0158B7] hover:bg-[#014A9C] text-white mt-3">
                    {isCompleting || isStepping
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Completing…</>
                      : <><CheckCircle className="w-4 h-4" />Mark Complete</>
                    }
                  </Button>
                )}
                {hasVideo && !videoWatchedEnough && !isCompleted && !isLessonCompleted && (
                  <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />Watch the video above to unlock completion.
                  </p>
                )}
                {isLessonCompleted && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium text-sm">This lesson has been completed</span>
                  </div>
                )}
              </div>
            )}

            {/* Resources */}
            {(hasMaterials || parsedResources.length > 0) && (
              <LessonResourcesSection
                materials={lesson.lesson_materials || []}
                resources={parsedResources}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}