"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Download,
  Maximize2,
  Minimize2,
  FileText,
  FileArchive,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * ============================================================================
 * Smart document preview (CD-001 §4)
 * ============================================================================
 *
 * Opens a course file in place instead of in a new tab.
 *
 * Adapted from the reference implementation in `/docs/hitcodes.tsx`: the
 * type-detection and per-type renderer structure are kept, the styling is this
 * project's design tokens.
 *
 * ── Why in place ───────────────────────────────────────────────────────────
 *
 * `target="_blank"` on a Cloudinary URL downloads most office formats rather
 * than showing them, and loses the author's place in the wizard. Everything a
 * course carries — an image, a PDF, a video, a slide deck — is viewable in the
 * browser, so the only reason to leave the page was that nothing rendered it.
 */

type SupportedFileType =
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "video"
  | "audio"
  | "text"
  | "archive"
  | "unknown"

const EXTENSION_TYPES: Record<string, SupportedFileType> = {
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image", svg: "image", bmp: "image",
  pdf: "pdf",
  doc: "document", docx: "document", odt: "document", rtf: "document",
  xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet", ods: "spreadsheet",
  ppt: "presentation", pptx: "presentation", odp: "presentation",
  mp4: "video", webm: "video", mov: "video", avi: "video", mkv: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio",
  txt: "text", md: "text", json: "text",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
}

export function getExtension(url: string): string {
  try {
    // The query string is stripped first: a Cloudinary URL often carries one,
    // and `.pdf?v=3` is not an extension anything recognises.
    const path = url.split("?")[0].split("#")[0]
    const last = path.split("/").pop() ?? ""
    const dot = last.lastIndexOf(".")
    return dot === -1 ? "" : last.slice(dot + 1).toLowerCase()
  } catch {
    return ""
  }
}

export function detectFileType(url: string, mimeType?: string): SupportedFileType {
  const byExtension = EXTENSION_TYPES[getExtension(url)]
  if (byExtension) return byExtension

  // The MIME type is the fallback, not the primary: Cloudinary serves plenty
  // of files as `application/octet-stream`, which says nothing.
  const mime = (mimeType ?? "").toLowerCase()
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  if (mime.startsWith("text/")) return "text"
  if (mime === "application/pdf") return "pdf"

  return "unknown"
}

export interface DocumentPreviewProps {
  url: string
  fileName?: string
  fileType?: string
  onClose: () => void
}

export function SmartDocumentPreview({ url, fileName, fileType, onClose }: DocumentPreviewProps) {
  const [fullscreen, setFullscreen] = React.useState(false)
  const kind = React.useMemo(() => detectFileType(url, fileType), [url, fileType])
  const name = fileName || url.split("/").pop()?.split("?")[0] || "File"

  // Escape closes, and the page behind does not scroll while this is open.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const download = () => {
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="course-document-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${name}`}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl ${
            fullscreen ? "h-full w-full" : "h-[85vh] w-full max-w-5xl"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">{name}</p>
                <p className="text-[11px] text-muted-foreground">{labelFor(kind, url)}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="sm" onClick={download} aria-label="Download">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen((f) => !f)}
                aria-label={fullscreen ? "Exit full screen" : "Full screen"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close preview">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/30">
            <PreviewBody kind={kind} url={url} name={name} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function labelFor(kind: SupportedFileType, url: string): string {
  const ext = getExtension(url).toUpperCase()
  const names: Record<SupportedFileType, string> = {
    image: "Image", pdf: "PDF Document", document: "Document", spreadsheet: "Spreadsheet",
    presentation: "Presentation", video: "Video", audio: "Audio", text: "Text",
    archive: "Archive", unknown: "File",
  }
  return ext ? `${names[kind]} (${ext})` : names[kind]
}

function PreviewBody({ kind, url, name }: { kind: SupportedFileType; url: string; name: string }) {
  switch (kind) {
    case "image":
      return (
        <div className="flex h-full items-center justify-center p-4">
          <img src={url} alt={name} className="max-h-full max-w-full object-contain" />
        </div>
      )

    case "pdf":
    case "text":
      return <iframe src={url} title={name} className="h-full w-full border-0" />

    case "document":
    case "spreadsheet":
    case "presentation":
      /*
       * Office formats have no native browser renderer, so this goes through
       * Microsoft's viewer. It requires a publicly reachable URL — which a
       * Cloudinary URL is — and fails visibly rather than silently if not, so
       * the download button beneath is always the way out.
       */
      return (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
          title={name}
          className="h-full w-full border-0"
        />
      )

    case "video":
      return (
        <div className="flex h-full items-center justify-center bg-black p-2">
          <video src={url} controls className="max-h-full max-w-full" />
        </div>
      )

    case "audio":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <p className="text-[13px] font-medium text-foreground">{name}</p>
          <audio src={url} controls className="w-full max-w-md" />
        </div>
      )

    case "archive":
      return (
        <Fallback
          icon={<FileArchive className="h-10 w-10 text-muted-foreground" />}
          title="Archives cannot be previewed"
          hint="Download it to see what is inside."
          url={url}
        />
      )

    default:
      return (
        <Fallback
          icon={<FileText className="h-10 w-10 text-muted-foreground" />}
          title="No preview available for this file type"
          hint="You can still download it or open it in a new tab."
          url={url}
        />
      )
  }
}

function Fallback({
  icon,
  title,
  hint,
  url,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  url: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {icon}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground">{hint}</p>
      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          Open in a new tab
        </a>
      </Button>
    </div>
  )
}

/**
 * Opens the preview from anywhere, without every caller holding modal state.
 *
 * `preview` is rendered by the caller; `open` is passed to whatever should
 * trigger it.
 */
export function useDocumentPreview() {
  const [current, setCurrent] = React.useState<{
    url: string
    fileName?: string
    fileType?: string
  } | null>(null)

  const open = React.useCallback((url: string, fileName?: string, fileType?: string) => {
    setCurrent({ url, fileName, fileType })
  }, [])

  const close = React.useCallback(() => setCurrent(null), [])

  const preview = current ? (
    <SmartDocumentPreview
      url={current.url}
      fileName={current.fileName}
      fileType={current.fileType}
      onClose={close}
    />
  ) : null

  return { open, close, preview, isOpen: Boolean(current) }
}

/** A file shown as a clickable row that opens the preview rather than a tab. */
export function DocumentLink({
  url,
  fileName,
  fileType,
  onOpen,
  className = "",
}: {
  url: string
  fileName?: string
  fileType?: string
  onOpen: (url: string, fileName?: string, fileType?: string) => void
  className?: string
}) {
  const name = fileName || url.split("/").pop()?.split("?")[0] || "File"
  return (
    <button
      type="button"
      onClick={() => onOpen(url, fileName, fileType)}
      className={`inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline ${className}`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </button>
  )
}

export { Loader2 as PreviewSpinner }
