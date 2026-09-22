"use client"

import * as React from "react"
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Eye,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useDocumentUpload, type UploadedDocument } from "@/hooks/useDocumentUpload"

/**
 * ============================================================================
 * File upload with progress (CD-001 §4)
 * ============================================================================
 *
 * Pick a file, watch it upload, see it, replace it, remove it.
 *
 * Adapted from `/components/FileUploadWithProgress` in `/docs/hitcodes.tsx`.
 * The upload lifecycle and the retry/cancel handling are kept; the styling is
 * this project's tokens and the preview goes through this project's
 * `SmartDocumentPreview`.
 *
 * ── Uploading on selection, not on submit ──────────────────────────────────
 *
 * The file goes to Cloudinary the moment it is chosen, and what is stored on
 * the draft is a URL. That is what makes auto-save possible at all: a `File`
 * object cannot be serialised into a draft, so a wizard that held files in
 * memory until submit would lose every attachment the moment the tab closed —
 * which is exactly what the old localStorage draft did.
 */

export interface FileUploadWithProgressProps {
  label?: string
  /** `accept` for the file input, e.g. "image/*" or ".pdf,.docx". */
  accept?: string
  /** Megabytes. Refused before the request rather than after. */
  maxSizeMB?: number
  /** Already-uploaded file, so a reopened draft shows what it has. */
  value?: UploadedDocument | null
  onChange: (document: UploadedDocument | null) => void
  /** Opens the shared preview. Omit to fall back to a new tab. */
  onPreview?: (url: string, fileName?: string, fileType?: string) => void
  description?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function FileUploadWithProgress({
  label,
  accept,
  maxSizeMB = 100,
  value,
  onChange,
  onPreview,
  description,
  required = false,
  disabled = false,
  className = "",
}: FileUploadWithProgressProps) {
  const { uploadSingle } = useDocumentUpload()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [progress, setProgress] = React.useState(0)
  const [status, setStatus] = React.useState<"idle" | "uploading" | "error">("idle")
  const [error, setError] = React.useState<string | null>(null)
  const [lastFile, setLastFile] = React.useState<File | null>(null)

  /**
   * Checked here as well as on the server.
   *
   * Not as a security measure — the server is the authority — but because
   * sending a 400MB video only to be refused wastes the author's upload and
   * several minutes of their time.
   */
  const validate = (file: File): string | null => {
    if (file.size === 0) return "That file is empty."
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${maxSizeMB}MB.`
    }
    return null
  }

  const run = async (file: File) => {
    const problem = validate(file)
    if (problem) {
      setError(problem)
      setStatus("error")
      return
    }

    setLastFile(file)
    setError(null)
    setStatus("uploading")
    setProgress(0)

    // A gentle local tick while the request is in flight; the hook reports the
    // real figure, and this only ever moves forward.
    const tick = setInterval(() => setProgress((p) => (p < 90 ? p + 5 : p)), 300)

    const result = await uploadSingle(file, description)
    clearInterval(tick)

    if (result) {
      setProgress(100)
      setStatus("idle")
      onChange(result)
    } else {
      setStatus("error")
      setError("The upload did not complete. Check your connection and try again.")
    }
  }

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset so choosing the same file twice still fires a change event —
    // otherwise a retry after a failure appears to do nothing.
    e.target.value = ""
    if (file) void run(file)
  }

  const remove = () => {
    onChange(null)
    setStatus("idle")
    setProgress(0)
    setError(null)
    setLastFile(null)
  }

  const openPreview = () => {
    if (!value) return
    if (onPreview) onPreview(value.url, value.fileName, value.fileType)
    else window.open(value.url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <Label className="text-[12px] font-medium">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={choose}
        disabled={disabled || status === "uploading"}
        className="hidden"
        aria-label={label || "Choose a file"}
      />

      {/* ── uploaded ── */}
      {value && status !== "uploading" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">{value.fileName}</p>
            <p className="text-[11px] text-muted-foreground">
              {(value.fileSize / 1024 / 1024).toFixed(2)} MB · uploaded
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={openPreview} aria-label="Preview file">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={disabled}
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── uploading ── */}
      {status === "uploading" && (
        <div className="rounded-lg border border-border bg-card p-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
              {lastFile?.name ?? "Uploading…"}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── empty ── */}
      {!value && status !== "uploading" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card p-4 text-[12px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          Choose a file
          {accept && <span className="text-[11px]">({accept})</span>}
        </button>
      )}

      {/* ── failed ── */}
      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-destructive">{error}</p>
          </div>
          {/* Retry uses the file already chosen, so a failure does not make the
              author hunt for it again. */}
          {lastFile && (
            <Button type="button" variant="ghost" size="sm" onClick={() => void run(lastFile)}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      )}

      {description && !error && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

/** Several files at once — lesson handouts and the like. */
export function MultiFileUploadWithProgress({
  label,
  accept,
  maxSizeMB = 100,
  value = [],
  onChange,
  onPreview,
  disabled = false,
}: Omit<FileUploadWithProgressProps, "value" | "onChange"> & {
  value?: UploadedDocument[]
  onChange: (documents: UploadedDocument[]) => void
}) {
  const [adding, setAdding] = React.useState(false)

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((doc) => (
            <li
              key={doc.publicId || doc.url}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                {doc.fileName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPreview?.(doc.url, doc.fileName, doc.fileType)}
                aria-label={`Preview ${doc.fileName}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(value.filter((d) => d.publicId !== doc.publicId))}
                aria-label={`Remove ${doc.fileName}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <FileUploadWithProgress
          label={label}
          accept={accept}
          maxSizeMB={maxSizeMB}
          value={null}
          disabled={disabled}
          onPreview={onPreview}
          onChange={(doc) => {
            if (doc) onChange([...value, doc])
            setAdding(false)
          }}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          <Upload className="mr-2 h-3.5 w-3.5" />
          Add a file
        </Button>
      )}
    </div>
  )
}
