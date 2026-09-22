import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  CloudUpload,
} from "lucide-react";
import { useDocumentUpload, UploadedDocument } from "@/hooks/useDocumentUpload";
import toast from "react-hot-toast";
import { useDocumentPreview } from "@/components/workflow/SmartDocumentPreview";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PendingFile {
  id: string;
  description: string;
  file: File;
  status: "queued" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface FileUploadWithProgressProps {
  onUploadComplete: (documents: UploadedDocument[]) => void;
  onUploadStart?: () => void;
  maxFiles?: number;
  accept?: string;
  label?: string;
  hint?: string;
  multiple?: boolean;
  preserveUrls?: boolean;
  storageKey?: string;
  /**
   * When true, renders a free-form description input (original behavior for
   * generic buckets like "Borrower Documents" where the user types each file's
   * meaning manually). Ignored if `documentTitle` is set.
   */
  showDescription?: boolean;
  /**
   * When set, every uploaded file's `description` is auto-populated with this
   * title (mirrors original behavior for fixed-purpose fields like
   * "Spouse CRB Report", "RDB Registration Document", etc.). Suppresses the
   * manual description input. The backend reads `description` from each URL
   * payload (see `toDocUrl` in loanApplicationService) — so this is what gets
   * persisted.
   */
  documentTitle?: string;
  /**
   * When provided, the "View" affordance on each successfully-uploaded item
   * opens the `SmartDocumentPreview` modal instead of `target="_blank"`.
   * Pass the `openPreview` function returned by `useDocumentPreview()`.
   */
  onPreview?: (url: string, fileName?: string, fileType?: string) => void;
  /**
   * Optional custom upload transport. Defaults to the authenticated
   * `useDocumentUpload().uploadSingle` (dashboard). The public borrower
   * invitation portal passes a session-token uploader so the SAME component is
   * reused outside the authenticated dashboard.
   */
  uploader?: (file: File, description?: string) => Promise<UploadedDocument | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <ImageIcon className="w-3.5 h-3.5 text-sky-500" />;
  if (ext === "pdf") return <FileText className="w-3.5 h-3.5 text-rose-500" />;
  return <FileText className="w-3.5 h-3.5 text-slate-400" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component — compact, modern, smart UI
// ─────────────────────────────────────────────────────────────────────────────

export const FileUploadWithProgress: React.FC<FileUploadWithProgressProps> = ({
  onUploadComplete,
  onUploadStart,
  maxFiles = 10,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  label = "Upload Documents",
  hint,
  multiple = true,
  preserveUrls = true,
  storageKey,
  showDescription = false,
  documentTitle,
  onPreview,
  uploader,
}) => {
  // ── state ──────────────────────────────────────────────────────────────────

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pendingDescription, setPendingDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadSingle: defaultUploadSingle } = useDocumentUpload();
  // Reuse the same component with a pluggable transport: the dashboard uses the
  // authenticated uploader; the public portal passes a session-token uploader.
  const uploadSingle = uploader ?? defaultUploadSingle;

  // Internal smart-preview fallback: when the parent does NOT pass `onPreview`,
  // we still render uploaded items through the in-app document modal instead
  // of opening a new tab. Mounting `useDocumentPreview()` here costs one
  // useState and a no-op `PreviewComponent` until the user actually clicks View.
  const { openPreview: _openPreviewInternal, PreviewComponent: InternalPreviewComponent } = useDocumentPreview();
  const effectivePreview = onPreview ?? _openPreviewInternal;

  // ── persistence (drafts in localStorage) ──────────────────────────────────

  useEffect(() => {
    if (!storageKey || !preserveUrls) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: UploadedDocument[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUploadedDocs(parsed);
          onUploadComplete(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, preserveUrls]);

  useEffect(() => {
    if (!storageKey || !preserveUrls) return;
    if (uploadedDocs.length === 0) {
      // clear stale draft if user removed all files
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(uploadedDocs));
  }, [uploadedDocs, storageKey, preserveUrls]);

  useEffect(() => {
    onUploadComplete(uploadedDocs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedDocs]);

  // ── core upload logic ──────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (id: string, file: File, description: string) => {
      setPendingFiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "uploading", progress: 0 } : p
        )
      );

      onUploadStart?.();

      const progressInterval = setInterval(() => {
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.id === id && p.status === "uploading" && p.progress < 85
              ? { ...p, progress: p.progress + 8 }
              : p
          )
        );
      }, 200);

      try {
        const result = await uploadSingle(file, description);
        clearInterval(progressInterval);

        if (result) {
          setPendingFiles((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, status: "success", progress: 100 } : p
            )
          );

          setTimeout(() => {
            setUploadedDocs((prev) => [...prev, result]);
            setPendingFiles((prev) => prev.filter((p) => p.id !== id));
          }, 600);
        } else {
          throw new Error("Upload returned no result");
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status: "error", progress: 0, error: err?.message ?? "Upload failed" }
              : p
          )
        );
        toast.error(`Failed to upload "${file.name}"`);
      }
    },
    [uploadSingle, onUploadStart]
  );

  // ── file selection ─────────────────────────────────────────────────────────

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const slotsLeft = maxFiles - uploadedDocs.length - pendingFiles.length;
      const toProcess = files.slice(0, slotsLeft);

      if (files.length > slotsLeft) {
        toast.error(`Only ${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} remaining.`);
      }

      toProcess.forEach((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            `"${file.name}" is ${formatFileSize(file.size)} — max ${MAX_FILE_SIZE_MB} MB.`
          );
          return;
        }

        const id = uid();
        // Description priority (backend stores this on each URL payload):
        //   1. `documentTitle` prop  → fixed-title field, always wins
        //   2. user-typed `pendingDescription` → free-form bucket
        //   3. file name (sans extension) → final fallback
        const description =
          (documentTitle && documentTitle.trim()) ||
          pendingDescription.trim() ||
          file.name.replace(/\.[^.]+$/, "");

        setPendingFiles((prev) => [
          ...prev,
          { id, description, file, status: "queued", progress: 0 },
        ]);
        setPendingDescription("");
        uploadFile(id, file, description);
      });
    },
    [
      maxFiles,
      uploadedDocs.length,
      pendingFiles.length,
      pendingDescription,
      uploadFile,
      documentTitle,
    ]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFilesSelected(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) handleFilesSelected(files);
    },
    [handleFilesSelected]
  );

  // ── remove / retry ─────────────────────────────────────────────────────────

  const retryPending = (id: string) => {
    const entry = pendingFiles.find((p) => p.id === id);
    if (entry) uploadFile(id, entry.file, entry.description);
  };

  const removePending = (id: string) =>
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));

  const removeUploaded = (url: string) =>
    setUploadedDocs((prev) => prev.filter((d) => d.url !== url));

  // ── derived ────────────────────────────────────────────────────────────────

  const totalSlotsFilled = uploadedDocs.length + pendingFiles.length;
  const slotsLeft = maxFiles - totalSlotsFilled;
  const canAdd = slotsLeft > 0;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-1.5">
      {/* ── Header (label + counter) ── */}
      {(label || hint || maxFiles > 1) && (
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            {label && (
              <p className="text-xs font-medium text-gray-700 truncate">
                {label}
              </p>
            )}
            {hint && (
              <p className="text-[10px] text-gray-400 truncate">{hint}</p>
            )}
          </div>
          {maxFiles > 1 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${
                totalSlotsFilled >= maxFiles
                  ? "bg-red-50 text-red-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {totalSlotsFilled}/{maxFiles}
            </span>
          )}
        </div>
      )}

      {/* ── Drop / click zone (compact single row) ── */}
      {canAdd && (
        <div
          className={`relative rounded-lg border border-dashed transition-all duration-150 ${
            isDragging
              ? "border-[#5B7FA2] bg-blue-50/60"
              : "border-gray-200 bg-gray-50/40 hover:border-[#5B7FA2]/50 hover:bg-blue-50/20"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <div className="px-2.5 py-1.5 space-y-1.5">
            {showDescription && !documentTitle && (
              <input
                type="text"
                value={pendingDescription}
                onChange={(e) => setPendingDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fileInputRef.current?.click();
                }}
                placeholder="Description (optional)"
                className="w-full px-2 py-1 text-[11px] bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5B7FA2]/40 focus:border-[#5B7FA2] placeholder:text-gray-300"
              />
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md group cursor-pointer"
            >
              <div
                className={`p-1 rounded-full transition-colors ${
                  isDragging
                    ? "bg-[#5B7FA2] text-white"
                    : "bg-white border border-gray-200 text-[#5B7FA2] group-hover:bg-[#5B7FA2] group-hover:text-white group-hover:border-[#5B7FA2]"
                }`}
              >
                <CloudUpload className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] text-gray-500 group-hover:text-[#5B7FA2] transition-colors">
                {isDragging
                  ? "Drop here"
                  : `Click or drop · max ${MAX_FILE_SIZE_MB}MB`}
              </span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* ── In-flight uploads ── */}
      <AnimatePresence initial={false}>
        {pendingFiles.map((pf) => (
          <motion.div
            key={pf.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-100 rounded-md"
          >
            <div className="flex-shrink-0">{getFileIcon(pf.file.name)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-gray-700 truncate">
                  {pf.description || pf.file.name}
                </p>
                <span className="text-[9px] text-gray-400 flex-shrink-0">
                  {formatFileSize(pf.file.size)}
                </span>
              </div>

              {pf.status === "uploading" || pf.status === "queued" ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#5B7FA2] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pf.progress}%` }}
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 w-6 text-right">
                    {pf.status === "queued" ? "—" : `${pf.progress}%`}
                  </span>
                </div>
              ) : pf.status === "success" ? (
                <div className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-[9px]">Uploaded</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-[9px] truncate">{pf.error ?? "Failed"}</span>
                </div>
              )}
            </div>

            {pf.status === "uploading" || pf.status === "queued" ? (
              <Loader2 className="w-3.5 h-3.5 text-[#5B7FA2] animate-spin flex-shrink-0" />
            ) : pf.status === "error" ? (
              <button
                type="button"
                onClick={() => retryPending(pf.id)}
                className="flex-shrink-0 text-[9px] text-white bg-red-400 hover:bg-red-500 px-1.5 py-0.5 rounded"
              >
                Retry
              </button>
            ) : (
              <button
                type="button"
                onClick={() => removePending(pf.id)}
                className="flex-shrink-0 p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Successfully uploaded ── */}
      <AnimatePresence initial={false}>
        {uploadedDocs.map((doc) => (
          <motion.div
            key={doc.url}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 px-2 py-1.5 bg-emerald-50/60 border border-emerald-100 rounded-md"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-gray-700 truncate">
                {doc.description || doc.fileName}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-400 truncate">
                  {doc.fileName}
                </span>
                <span className="text-[9px] text-gray-300">·</span>
                <span className="text-[9px] text-gray-400">
                  {formatFileSize(doc.fileSize)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                effectivePreview(doc.url, doc.fileName, doc.fileType);
              }}
              className="flex-shrink-0 text-[9px] text-[#5B7FA2] hover:underline"
            >
              View
            </button>

            <button
              type="button"
              onClick={() => removeUploaded(doc.url)}
              className="flex-shrink-0 p-0.5 hover:bg-red-50 rounded text-gray-300 hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Internal preview modal — only mounts when the parent does NOT pass
          its own `onPreview` handler. The component itself returns null when
          closed, so this is effectively free until the user clicks View. */}
      {!onPreview && <InternalPreviewComponent />}
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    Image as ImageIcon,
    FileCode,
    FileSpreadsheet,
    Presentation,
    FileArchive,
    FileAudio,
    FileVideo,
    Download,
    ExternalLink,
    Maximize2,
    Minimize2,
    RotateCw,
    ZoomIn,
    ZoomOut,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Copy,
    Check,
    Loader2,
    Eye,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Document type definitions — broadened to cover every file we now ship
// through Cloudinary uploads (images, PDFs, MS-Office, plain text/code,
// audio/video, archives, and a graceful fallback for anything else).
type SupportedFileType =
    | 'image'
    | 'pdf'
    | 'document'
    | 'spreadsheet'
    | 'presentation'
    | 'video'
    | 'audio'
    | 'text'
    | 'code'
    | 'archive'
    | 'unknown';

interface DocumentPreviewProps {
    url: string;
    fileName?: string;
    fileType?: string;
    onClose: () => void;
    onDownload?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
// Cloudinary URLs frequently carry query strings (signed delivery, version
// pins, transform tokens) and rarely include an explicit content-disposition
// extension. Strip those so the extension-detection logic below stays sane.
const cleanUrl = (url: string): string => {
    if (!url) return '';
    try {
        const noQuery = url.split('?')[0].split('#')[0];
        return noQuery;
    } catch {
        return url;
    }
};

const getExtension = (url: string): string => {
    const clean = cleanUrl(url);
    const last = clean.split('/').pop() || '';
    const dot = last.lastIndexOf('.');
    if (dot < 0) return '';
    return last.slice(dot + 1).toLowerCase();
};

const getFileNameFromUrl = (url: string, fallback?: string): string => {
    if (fallback && fallback.trim()) return fallback;
    const clean = cleanUrl(url);
    const last = clean.split('/').pop() || '';
    return last || 'document';
};

// Helper to detect file type from URL, mime type or extension.
const detectFileType = (url: string, mimeType?: string): SupportedFileType => {
    if (mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('opendocument.text')) return 'document';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('sheet') || mimeType.includes('csv')) return 'spreadsheet';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('slides')) return 'presentation';
        if (mimeType.startsWith('text/')) return 'text';
        if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'archive';
    }

    const extension = getExtension(url);

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif', 'heic', 'heif', 'tif', 'tiff'];
    const docExts = ['doc', 'docx', 'odt', 'rtf'];
    const spreadsheetExts = ['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers'];
    const presentationExts = ['ppt', 'pptx', 'odp', 'key'];
    const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'avi', 'mkv', '3gp'];
    const audioExts = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'wma'];
    const textExts = ['txt', 'md', 'markdown', 'log', 'csv', 'tsv'];
    const codeExts = [
        'json', 'xml', 'yaml', 'yml', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'less',
        'html', 'htm', 'sql', 'sh', 'bash', 'zsh', 'py', 'rb', 'php', 'go', 'rs',
        'java', 'kt', 'swift', 'c', 'cc', 'cpp', 'h', 'hpp', 'cs', 'env', 'ini',
        'conf', 'toml', 'dockerfile'
    ];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'];

    if (imageExts.includes(extension)) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (docExts.includes(extension)) return 'document';
    if (spreadsheetExts.includes(extension)) return 'spreadsheet';
    if (presentationExts.includes(extension)) return 'presentation';
    if (videoExts.includes(extension)) return 'video';
    if (audioExts.includes(extension)) return 'audio';
    if (codeExts.includes(extension)) return 'code';
    if (textExts.includes(extension)) return 'text';
    if (archiveExts.includes(extension)) return 'archive';

    return 'unknown';
};

// Get icon based on file type
const getFileIcon = (type: SupportedFileType) => {
    switch (type) {
        case 'image': return <ImageIcon className="w-5 h-5" />;
        case 'pdf': return <FileText className="w-5 h-5" />;
        case 'document': return <FileText className="w-5 h-5" />;
        case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5" />;
        case 'presentation': return <Presentation className="w-5 h-5" />;
        case 'video': return <FileVideo className="w-5 h-5" />;
        case 'audio': return <FileAudio className="w-5 h-5" />;
        case 'text': return <FileText className="w-5 h-5" />;
        case 'code': return <FileCode className="w-5 h-5" />;
        case 'archive': return <FileArchive className="w-5 h-5" />;
        default: return <FileText className="w-5 h-5" />;
    }
};

// ── Image Preview ───────────────────────────────────────────────────────────
const ImagePreview: React.FC<{ url: string; onClose?: () => void }> = ({ url }) => {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handleReset = () => { setScale(1); setRotation(0); setIsZoomed(false); };
    const handleToggleZoom = () => setIsZoomed(!isZoomed);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-center gap-2 p-2 bg-white border-b border-gray-200 sticky top-0 z-10">
                <button onClick={handleZoomOut} disabled={scale <= 0.5} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50" title="Zoom Out">
                    <ZoomOut className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-xs text-gray-600 min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} disabled={scale >= 3} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50" title="Zoom In">
                    <ZoomIn className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={handleRotate} className="p-1.5 rounded-lg hover:bg-gray-100" title="Rotate">
                    <RotateCw className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={handleToggleZoom} className="p-1.5 rounded-lg hover:bg-gray-100" title={isZoomed ? "Fit to Screen" : "Zoom to Fit"}>
                    {isZoomed ? <Minimize2 className="w-4 h-4 text-gray-600" /> : <Maximize2 className="w-4 h-4 text-gray-600" />}
                </button>
                <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-gray-100" title="Reset">
                    <RotateCw className="w-4 h-4 text-gray-600" style={{ transform: 'scaleX(-1)' }} />
                </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4 relative">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100/80 pointer-events-none">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500">Loading image…</p>
                    </div>
                )}
                {error ? (
                    <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                        <p className="text-sm text-gray-600">Failed to load image</p>
                        <div className="flex gap-2">
                            <button onClick={() => { setLoading(true); setError(false); }} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">Retry</button>
                            <button onClick={() => window.open(url, '_blank')} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Open in New Tab</button>
                        </div>
                    </div>
                ) : (
                    <motion.img
                        src={url}
                        alt="Document preview"
                        className="max-w-full max-h-full object-contain cursor-pointer"
                        style={{
                            transform: `scale(${isZoomed ? scale : 1}) rotate(${rotation}deg)`,
                            transition: 'transform 0.2s ease'
                        }}
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                        animate={isZoomed ? { scale } : { scale: 1 }}
                    />
                )}
            </div>
        </div>
    );
};

// ── PDF Preview ─────────────────────────────────────────────────────────────
const PdfPreview: React.FC<{ url: string }> = ({ url }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        setLoading(true);
        setError(false);
    }, [url]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto bg-gray-100 relative">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100/80 pointer-events-none">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500">Loading PDF…</p>
                    </div>
                )}
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                        <p className="text-sm text-gray-600">Failed to load PDF inline</p>
                        <div className="flex gap-2">
                            <button onClick={() => window.open(url, '_blank')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">Open in New Tab</button>
                            <button onClick={() => { setLoading(true); setError(false); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Retry</button>
                        </div>
                    </div>
                ) : (
                    <iframe
                        ref={iframeRef}
                        src={url}
                        className="w-full h-full min-h-[500px] border-0 bg-white"
                        title="PDF Document"
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                    />
                )}
            </div>
        </div>
    );
};

// ── Office Preview (Word/Excel/PowerPoint) ──────────────────────────────────
// Supports two embedded viewers: Microsoft Office Web Viewer (default — best
// for Office formats) and Google Docs Viewer (fallback). User can switch
// between them with a toggle. The URL must be publicly fetchable.
const OfficePreview: React.FC<{ url: string; fileType: SupportedFileType }> = ({ url, fileType }) => {
    const [viewer, setViewer] = useState<'office' | 'google'>('office');
    const [loading, setLoading] = useState(true);

    const viewerUrl = (() => {
        const encoded = encodeURIComponent(url);
        if (viewer === 'office') {
            return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
        }
        return `https://docs.google.com/viewer?url=${encoded}&embedded=true`;
    })();

    const label = (() => {
        switch (fileType) {
            case 'document': return 'Word Document';
            case 'spreadsheet': return 'Spreadsheet';
            case 'presentation': return 'Presentation';
            default: return 'Office Document';
        }
    })();

    useEffect(() => { setLoading(true); }, [viewer, url]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {getFileIcon(fileType)}
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-500 mr-2">Viewer:</span>
                    <button
                        onClick={() => setViewer('office')}
                        className={`text-[11px] px-2 py-1 rounded ${viewer === 'office' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Microsoft
                    </button>
                    <button
                        onClick={() => setViewer('google')}
                        className={`text-[11px] px-2 py-1 rounded ${viewer === 'google' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Google
                    </button>
                    <button
                        onClick={() => setLoading(true)}
                        className="text-[11px] p-1 rounded hover:bg-gray-100 text-gray-600 ml-1"
                        title="Reload"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-gray-100 relative">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100/80 pointer-events-none">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500">Loading viewer…</p>
                        <p className="text-[11px] text-gray-400">Large files may take a few seconds</p>
                    </div>
                )}
                <iframe
                    src={viewerUrl}
                    className="w-full h-full border-0"
                    title="Office Document Viewer"
                    onLoad={() => setLoading(false)}
                />
            </div>

            <div className="bg-white border-t border-gray-200 px-3 py-1.5 text-[11px] text-gray-500">
                If this preview can't render, try the other viewer above or{' '}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">open in a new tab</a>.
            </div>
        </div>
    );
};

// ── Video Preview ───────────────────────────────────────────────────────────
const VideoPreview: React.FC<{ url: string }> = ({ url }) => (
    <div className="flex items-center justify-center h-full bg-black">
        <video
            src={url}
            controls
            controlsList="nodownload"
            className="max-w-full max-h-full"
            style={{ outline: 'none' }}
        >
            Your browser does not support inline video playback.
        </video>
    </div>
);

// ── Audio Preview ───────────────────────────────────────────────────────────
const AudioPreview: React.FC<{ url: string; fileName?: string }> = ({ url, fileName }) => (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
            <FileAudio className="w-12 h-12 text-blue-500" />
        </div>
        <p className="text-sm font-medium text-gray-800 mb-4 max-w-md text-center break-words">
            {fileName || 'Audio file'}
        </p>
        <audio src={url} controls className="w-full max-w-md">
            Your browser does not support inline audio playback.
        </audio>
    </div>
);

// ── Plain text / code preview (fetch + render in <pre>) ─────────────────────
const TextPreview: React.FC<{ url: string; mode: 'text' | 'code' }> = ({ url, mode }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wrap, setWrap] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
            })
            .then((t) => {
                if (cancelled) return;
                // Cap super-large files to keep DOM snappy; surface a hint.
                const max = 500_000;
                if (t.length > max) {
                    setContent(t.slice(0, max) + `\n\n… (truncated — file is ${t.length.toLocaleString()} chars; open in a new tab to see everything)`);
                } else {
                    setContent(t);
                }
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e.message || 'Failed to load');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [url]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            toast.success('Copied to clipboard');
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Copy failed');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    {mode === 'code' ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    <span className="font-medium">{mode === 'code' ? 'Source / Config' : 'Text File'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setWrap((w) => !w)}
                        className={`text-[11px] px-2 py-1 rounded ${wrap ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        title="Toggle word wrap"
                    >
                        {wrap ? 'Wrap: ON' : 'Wrap: OFF'}
                    </button>
                    <button onClick={copy} className="text-[11px] px-2 py-1 rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                        <p className="text-sm text-gray-600">Could not fetch file ({error}).</p>
                        <p className="text-[11px] text-gray-500 text-center max-w-md">
                            The host may not allow cross-origin reads. Try opening the file in a new tab.
                        </p>
                        <button onClick={() => window.open(url, '_blank')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                            Open in New Tab
                        </button>
                    </div>
                ) : (
                    <pre
                        className="text-[12px] text-gray-800 p-4 font-mono"
                        style={{
                            whiteSpace: wrap ? 'pre-wrap' : 'pre',
                            wordBreak: wrap ? 'break-word' : 'normal',
                        }}
                    >
                        {content}
                    </pre>
                )}
            </div>
        </div>
    );
};

// ── Archive (zip/rar/...) — can't preview; offer download/open ──────────────
const ArchivePreview: React.FC<{ url: string; fileName?: string }> = ({ url, fileName }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <FileArchive className="w-10 h-10 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Archive File</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md">
            {fileName ? <><span className="font-medium text-gray-700">{fileName}</span> — </> : null}
            archives can't be previewed inline. Download it to inspect its contents.
        </p>
        <div className="flex gap-2">
            <a href={url} download className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                <Download className="w-4 h-4" /> Download
            </a>
            <button onClick={() => window.open(url, '_blank')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white">
                <ExternalLink className="w-4 h-4" /> Open in New Tab
            </button>
        </div>
    </div>
);

// ── Unknown file types — graceful fallback ──────────────────────────────────
const UnsupportedPreview: React.FC<{ url: string; fileName?: string; fileType?: string }> = ({ url, fileName, fileType }) => {
    const ext = (fileType || getExtension(url) || '').toUpperCase();
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Preview not available</h3>
            <p className="text-sm text-gray-500 mb-1 max-w-md">
                {fileName ? <span className="font-medium text-gray-700">{fileName}</span> : null}
            </p>
            <p className="text-xs text-gray-500 mb-6">
                {ext ? `Type: ${ext} — ` : ''}we can't render this file type inline. Try downloading or opening it in a new tab.
            </p>
            <div className="flex gap-2">
                <a href={url} download className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    <Download className="w-4 h-4" /> Download
                </a>
                <button onClick={() => window.open(url, '_blank')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white">
                    <ExternalLink className="w-4 h-4" /> Open in New Tab
                </button>
            </div>
        </div>
    );
};

// ── Main Smart Document Preview Component ───────────────────────────────────
export const SmartDocumentPreview: React.FC<DocumentPreviewProps> = ({
    url,
    fileName,
    fileType: providedFileType,
    onClose,
    onDownload,
}) => {
    const [fileType, setFileType] = useState<SupportedFileType>('unknown');
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        const detected = detectFileType(url, providedFileType);
        setFileType(detected);
    }, [url, providedFileType]);

    const handleDownload = () => {
        if (onDownload) { onDownload(); return; }
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = getFileNameFromUrl(url, fileName);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch {
            window.open(url, '_blank');
        }
    };

    const renderPreview = () => {
        switch (fileType) {
            case 'image':
                return <ImagePreview url={url} onClose={onClose} />;
            case 'pdf':
                return <PdfPreview url={url} />;
            case 'document':
            case 'spreadsheet':
            case 'presentation':
                return <OfficePreview url={url} fileType={fileType} />;
            case 'video':
                return <VideoPreview url={url} />;
            case 'audio':
                return <AudioPreview url={url} fileName={fileName} />;
            case 'text':
                return <TextPreview url={url} mode="text" />;
            case 'code':
                return <TextPreview url={url} mode="code" />;
            case 'archive':
                return <ArchivePreview url={url} fileName={fileName} />;
            default:
                return <UnsupportedPreview url={url} fileName={fileName} fileType={providedFileType} />;
        }
    };

    const getFileTypeLabel = () => {
        const extension = getExtension(url).toUpperCase();
        switch (fileType) {
            case 'image': return `Image${extension ? ` (${extension})` : ''}`;
            case 'pdf': return 'PDF Document';
            case 'document': return `Document${extension ? ` (${extension})` : ''}`;
            case 'spreadsheet': return `Spreadsheet${extension ? ` (${extension})` : ''}`;
            case 'presentation': return `Presentation${extension ? ` (${extension})` : ''}`;
            case 'video': return `Video${extension ? ` (${extension})` : ''}`;
            case 'audio': return `Audio${extension ? ` (${extension})` : ''}`;
            case 'text': return `Text${extension ? ` (${extension})` : ''}`;
            case 'code': return `Code${extension ? ` (${extension})` : ''}`;
            case 'archive': return `Archive${extension ? ` (${extension})` : ''}`;
            default: return extension || 'Document';
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="document-preview-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 ${fullscreen ? 'p-0' : ''}`}
                onClick={onClose}
            >
                <motion.div
                    key="document-preview-content"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col ${fullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-7xl max-h-[95vh]'}`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-[#5B7FA2] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-white/20 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                                {getFileIcon(fileType)}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-white leading-tight">Document Preview</h2>
                                <div className="flex items-center gap-2 text-white/75 text-xs min-w-0">
                                    <span className="flex-shrink-0">{getFileTypeLabel()}</span>
                                    {fileName && (
                                        <>
                                            <span>•</span>
                                            <span className="truncate max-w-[260px]" title={fileName}>{fileName}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => setFullscreen(!fullscreen)}
                                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                                title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={onClose}
                                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-hidden bg-gray-100">
                        {renderPreview()}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate">{getFileNameFromUrl(url, fileName)}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={onClose} className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export const useDocumentPreview = () => {
    const [previewState, setPreviewState] = useState<{
        isOpen: boolean;
        url: string;
        fileName?: string;
        fileType?: string;
    }>({
        isOpen: false,
        url: '',
        fileName: undefined,
        fileType: undefined,
    });

    const openPreview = (url: string, fileName?: string, fileType?: string) => {
        setPreviewState({ isOpen: true, url, fileName, fileType });
    };

    const closePreview = () => {
        setPreviewState({ isOpen: false, url: '', fileName: undefined, fileType: undefined });
    };

    const PreviewComponent = () => {
        if (!previewState.isOpen) return null;
        return (
            <SmartDocumentPreview
                url={previewState.url}
                fileName={previewState.fileName}
                fileType={previewState.fileType}
                onClose={closePreview}
            />
        );
    };

    return {
        openPreview,
        closePreview,
        PreviewComponent,
        isOpen: previewState.isOpen,
    };
};

export const DocumentLink: React.FC<{
    url: string;
    fileName?: string;
    fileType?: string;
    children?: React.ReactNode;
    className?: string;
    onPreview?: (url: string, fileName?: string, fileType?: string) => void;
}> = ({ url, fileName, fileType, children, className, onPreview }) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onPreview) {
            onPreview(url, fileName, fileType);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className || ''}`}
        >
            {children || (
                <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                </>
            )}
        </button>
    );
};

export default SmartDocumentPreview;
import { useState, useCallback, useRef } from "react";

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }
  return null
}

const getOrganizationId = () => {
  if (typeof window !== "undefined") {
    const userString = localStorage.getItem("user")
    const user = userString ? JSON.parse(userString) : null
    return user?.organizationId
  }
  return null
}



export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  url?: string;
  error?: string;
}

export interface UploadedDocument {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  description?: string;
}

export const useDocumentUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const updateProgress = (fileName: string, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev =>
      prev.map(p => p.fileName === fileName ? { ...p, ...updates } : p)
    );
  };

  const uploadSingle = useCallback(async (file: File, description?: string): Promise<UploadedDocument | null> => {
    const formData = new FormData();
    formData.append("document", file);

    const abortController = new AbortController();
    abortControllers.current.set(file.name, abortController);

    // Add progress tracking
    updateProgress(file.name, {
      fileName: file.name,
      progress: 0,
      status: "uploading"
    });

    try {
      const token = getAuthToken();
      
      // Use XMLHttpRequest for better progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<UploadedDocument>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateProgress(file.name, { progress });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data) {
              const uploadedDoc = {
                ...response.data,
                description
              };
              updateProgress(file.name, {
                status: "success",
                url: response.data.url
              });
              setUploadedDocuments(prev => [...prev, uploadedDoc]);
              resolve(uploadedDoc);
            } else {
              reject(new Error(response.message || "Upload failed"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", `${API_BASE_URL}/documents/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });

      const result = await uploadPromise;
      abortControllers.current.delete(file.name);
      return result;
    } catch (error: any) {
      updateProgress(file.name, {
        status: "error",
        error: error.message
      });
      abortControllers.current.delete(file.name);
      return null;
    }
  }, []);

  const uploadMultiple = useCallback(async (files: File[], descriptions?: string[]) => {
    setIsUploading(true);
    
    // Initialize progress tracking
    const initialProgress = files.map((file, index) => ({
      fileName: file.name,
      progress: 0,
      status: "pending" as const,
      description: descriptions?.[index]
    }));
    setUploadProgress(initialProgress);

    const results: UploadedDocument[] = [];
    
    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const description = descriptions?.[i];
      const result = await uploadSingle(file, description);
      if (result) {
        results.push(result);
      }
    }

    setIsUploading(false);
    return results;
  }, [uploadSingle]);

  const cancelUpload = useCallback((fileName: string) => {
    const controller = abortControllers.current.get(fileName);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileName);
      updateProgress(fileName, { status: "error", error: "Upload cancelled" });
    }
  }, []);

  const clearUploads = useCallback(() => {
    setUploadProgress([]);
    setUploadedDocuments([]);
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current.clear();
  }, []);

  return {
    uploadSingle,
    uploadMultiple,
    cancelUpload,
    clearUploads,
    isUploading,
    uploadProgress,
    uploadedDocuments
  };
};


// @ts-nocheck
"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { motion, AnimatePresence } from "framer-motion"
import CopilotRecommendationButton from "@/components/copilot/CopilotRecommendationButton"
import { currencyCode, formatNumber } from "@/lib/currency/format"
import { MoneyInput } from "@/lib/currency"
import { REAL_COLLATERAL_CATEGORIES, GROUP_LABELS } from "@/lib/collateralCategories"
import CollateralOwnersEditor, { makeDefaultOwner, ownersValid } from "@/components/collateral/CollateralOwnersEditor"
import { validateBorrowerIdentity, validateBorrowerAddressIncome, validateEmail } from "@/lib/loanApplication/borrowerBasicSchema"
import {
  User,
  Building2,
  DollarSign,
  FileText,
  Upload,
  X,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Lock,
  Shield,
  HelpCircle,
  Plus,
  Minus,
  Users,
  Heart,
  Briefcase,
  ClipboardList,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Home,
  Users as UsersIcon,
  FileCheck,
  Clock,
  Search,
  Check,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  File,
  Image,
  Download,
  ExternalLink,
  Trash2,
  Edit,
  Copy,
  Mail,
  Phone,
  Globe,
  Award,
  Target,
  TrendingUp,
  PieChart,
  BarChart3,
  CreditCard,
  Wallet,
  PiggyBank,
  Landmark,
  Car,
  Home as HomeIcon,
  TreePine,
  Factory,
  Store,
  Hotel,
  Plane,
  Truck,
  Wrench,
  GraduationCap,
  Stethoscope,
  HeartPulse,
  Hammer,
  ShieldCheck,
  Fingerprint,
  Scan,
  Camera,
  Video,
  Mic,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Globe2,
  Bell,
  BellOff,
  Settings,
  Menu,
  LogOut,
  RefreshCw,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link,
  Image as ImageIcon,
  Table,
  Code,
  Hash,
  AtSign,
  DollarSign as DollarIcon,
  Percent,
  PlusCircle,
  MinusCircle,
  XCircle,
  CheckCircle,
  AlertCircle as AlertIcon,
  Info as InfoIcon,
  HelpCircle as HelpIcon,
  MailOpen,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  PhoneForwarded,
  PhoneMissed,
  PhoneOff,
  MessageSquare,
  MessageCircle,
  MessageCircleOff,
  Send,
  Reply,
  Forward,
  Share,
  Share2,
  Printer,
  Bookmark,
  BookmarkCheck,
  Star,
  StarHalf,
  StarOff,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Frown,
  Smile,
  Laugh,
  HeartOff,
  HeartCrack,
  Flame,
  Droplet,
  Wind,
  Zap,
  Leaf,
  Flower,
  SunDim,
  MoonStar,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Umbrella,
  Thermometer,
  ThermometerSun,
  ThermometerSnowflake,
  Compass,
  Navigation,
  MapPin as MapPinIcon,
  Flag,
  FlagOff,
  Award as AwardIcon,
  Medal,
  Trophy,
  Crown,
  Sparkles,
  PartyPopper,
  Gift,
  Coins,
  CreditCard as CreditCardIcon,
  Banknote,
  Wallet as WalletIcon,
  PiggyBank as PiggyBankIcon,
  Landmark as LandmarkIcon,
  Building,
  Building2 as Building2Icon,
  Store as StoreIcon,
  Hotel as HotelIcon,
  Home as HomeIcon2,
  TreePine as TreePineIcon,
  Factory as FactoryIcon,
  Wrench as WrenchIcon,
  GraduationCap as GraduationCapIcon,
  Stethoscope as StethoscopeIcon,
  HeartPulse as HeartPulseIcon,
  Shield as ShieldIcon,
  ShieldCheck as ShieldCheckIcon,
  Fingerprint as FingerprintIcon,
  Scan as ScanIcon,
  Camera as CameraIcon,
  Video as VideoIcon,
  Mic as MicIcon,
  Volume2 as Volume2Icon,
  VolumeX as VolumeXIcon,
  Maximize2 as Maximize2Icon,
  Minimize2 as Minimize2Icon,
  Moon as MoonIcon,
  Sun as SunIcon,
  Globe2 as Globe2Icon,
  Bell as BellIcon,
  BellOff as BellOffIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  LogOut as LogOutIcon,
  RefreshCw as RefreshCwIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Quote as QuoteIcon,
  Link as LinkIcon,
  ImageIcon as ImageIcon2,
  Table as TableIcon,
  Code as CodeIcon,
  Hash as HashIcon,
  AtSign as AtSignIcon,
  Percent as PercentIcon,
  PlusCircle as PlusCircleIcon,
  MinusCircle as MinusCircleIcon,
  XCircle as XCircleIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Info as InfoIcon2,
  HelpCircle as HelpCircleIcon,
} from "lucide-react"
import { PhoneInput } from 'react-international-phone'
import NextImage from 'next/image'

import {
  createLoanApplication,
  clearError,
  type LoanApplicationRequest,
  Gender,
  MaritalStatus,
  RelationshipType,
  CollateralType,
  BusinessType,
  BusinessStructure,
  EconomicSector,
  IncomeFrequency,
  BorrowerType,
  InstitutionType,
  SpouseInfo,
  RepaymentFrequency,
  PaymentPeriod,
  InstitutionRelevantDocument,
} from "@/lib/features/auth/loanApplicationSlice"
import type { AppDispatch, RootState } from "@/lib/store"
import toast from "react-hot-toast"
import { RwandaLocationService } from "@/lib/rwandaLocations"
import { FileUploadWithProgress } from "@/components/FileUploadWithProgress";
import { UploadedDocument } from "@/hooks/useDocumentUpload";
import { isGlobalUser as _isGlobalUser, isBranchScopedUser as _isBranchScopedUser } from "@/lib/access";
import { useDocumentPreview, DocumentLink } from "@/components/workflow/SmartDocumentPreview";
import { generateDraftId, saveDraft, patchDraft, getDraft, deleteDraft } from "@/lib/draftLoanApplications";
import { useSearchParams } from "next/navigation";
import LoanApplicationDocument from "@/components/loan/loan-application-document";
import { adaptWizardState } from "@/lib/loan/loanApplicationPdfModel";

const paymentFrequencyOptions = [
  { value: RepaymentFrequency.DAILY, label: 'Daily' },
  { value: RepaymentFrequency.WEEKLY, label: 'Weekly' },
  { value: RepaymentFrequency.BIWEEKLY, label: 'Bi-weekly' },
  { value: RepaymentFrequency.MONTHLY, label: 'Monthly' },
  { value: RepaymentFrequency.QUARTERLY, label: 'Quarterly' },
  { value: RepaymentFrequency.SEMI_ANNUALLY, label: 'Semi-Annually' },
  { value: RepaymentFrequency.ANNUALLY, label: 'Annually' },
]

const paymentPeriodOptions = [
  { value: PaymentPeriod.THREE_MONTHS, label: '3 Months', category: 'Salary/Short-term' },
  { value: PaymentPeriod.SIX_MONTHS, label: '6 Months', category: 'Salary/Short-term' },
  { value: PaymentPeriod.NINE_MONTHS, label: '9 Months', category: 'Salary/Short-term' },
  { value: PaymentPeriod.ONE_YEAR, label: '12 Months', category: 'Salary/Short-term' },
  { value: PaymentPeriod.EIGHTEEN_MONTHS, label: '18 Months', category: 'Personal/SME' },
  { value: PaymentPeriod.TWO_YEARS, label: '24 Months', category: 'Personal/SME' },
  { value: PaymentPeriod.THREE_YEARS, label: '36 Months', category: 'Personal/SME' },
  { value: PaymentPeriod.FOUR_YEARS, label: '48 Months', category: 'Car/Business' },
  { value: PaymentPeriod.FIVE_YEARS, label: '60 Months', category: 'Car/Business' },
  { value: PaymentPeriod.TEN_YEARS, label: '120 Months', category: 'Mortgage/Housing' },
  { value: PaymentPeriod.FIFTEEN_YEARS, label: '180 Months', category: 'Mortgage/Housing' },
  { value: PaymentPeriod.TWENTY_YEARS, label: '240 Months', category: 'Mortgage/Housing' },
  { value: PaymentPeriod.CUSTOM, label: 'Custom Period', category: 'Other' },
]

const incomeSources = [
  { value: "salary", label: "Salary/Employment" },
  { value: "business", label: "Business Income" },
  { value: "farming", label: "Agricultural/Farming" },
  { value: "freelance", label: "Freelance/Contract Work" },
  { value: "rental", label: "Rental Income" },
  { value: "pension", label: "Pension" },
  { value: "investment", label: "Investment Income" },
  { value: "remittance", label: "Remittances" },
  { value: "other", label: "Other (Please specify)" }
]

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface OccupationSupportingDocument {
  id: string
  description: string
  file?: File
  fileName: string
}

interface GuarantorInfo {
  name: string
  phone: string
  address?: string
  nationalId?: string
  email?: string
  guarantorType?: 'individual' | 'institution'
  guaranteedAmount?: number
  documents?: Array<{
    description: string
    file?: File
    fileUrl?: string
  }>
}

interface ShareholderBoardMemberInfo {
  type: 'shareholder' | 'board_member'
  firstName: string
  lastName: string
  middleName?: string
  nationalId: string
  phone: string
  email?: string
  position?: string
  sharePercentage?: number
  rdbFullInformation?: string
  shareholderResolution?: string
  boardResolution?: string
  isAlsoGuarantor?: boolean
  additionalDocuments?: Array<{
    description: string
    file?: File
    fileUrl?: string
  }>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const validateNationalId = (id: string): boolean => {
  return /^\d{16}$/.test(id)
}

// Rwandan National ID encodes only the birth YEAR (digits 2–5) — day and month
// are NOT part of the number. So we can reliably derive the birth year (and the
// current age), but not the exact day/month. Returns null for an invalid NID or
// an implausible embedded year.
const deriveBirthYearFromNID = (nid: string): number | null => {
  if (!/^\d{16}$/.test(nid)) return null
  const y = Number(nid.slice(1, 5))
  const now = new Date().getFullYear()
  return y >= 1900 && y <= now ? y : null
}
const ageFromYear = (year: number): number => new Date().getFullYear() - year

// `validateEmail` is imported from the shared borrowerBasicSchema (single source
// of truth) so the create wizard, the officer-continuation and the public /apply
// portal all apply the exact same smart email rule.

// Flexible UPI validator — Rwanda land-parcel UPIs come in multiple shapes
// across districts ("RW1234567890", "5/01/10/04/5365", "AB-12.34", etc.).
// Accept letters, digits, slash, hyphen, dot, asterisk, dollar sign, space.
// Length kept loose (3–40) so it covers both legacy and new formats.
const validateUpiNumber = (upi: string): boolean => {
  return /^[A-Za-z0-9\/\-\.\*\$\s]{3,40}$/.test(upi)
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

interface TooltipProps {
  children: React.ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top' }) => {
  const [show, setShow] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex"
      >
        {children}
      </div>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`absolute ${positionClasses[position]} px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg`}
        >
          {content}
          <div className={`absolute ${position === 'top' ? 'top-full' : position === 'bottom' ? 'bottom-full' : position === 'left' ? 'left-full' : 'right-full'} ${position === 'top' ? 'left-1/2 transform -translate-x-1/2 border-t-4 border-l-4 border-r-4 border-t-gray-900 border-l-transparent border-r-transparent' : position === 'bottom' ? 'left-1/2 transform -translate-x-1/2 border-b-4 border-l-4 border-r-4 border-b-gray-900 border-l-transparent border-r-transparent' : position === 'left' ? 'top-1/2 transform -translate-y-1/2 border-l-4 border-t-4 border-b-4 border-l-gray-900 border-t-transparent border-b-transparent' : 'top-1/2 transform -translate-y-1/2 border-r-4 border-t-4 border-b-4 border-r-gray-900 border-t-transparent border-b-transparent'}`} />
        </motion.div>
      )}
    </div>
  )
}

interface ProgressIndicatorProps {
  current: number
  total: number
  label?: string
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ current, total, label }) => {
  const percentage = (current / total) * 100

  const getColorClass = () => {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-orange-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-gray-600">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
          className={`h-2 rounded-full ${getColorClass()}`}
        />
      </div>
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultExpanded?: boolean
  completionPercentage?: number
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
  completionPercentage
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {completionPercentage !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${completionPercentage === 100
              ? 'bg-green-100 text-green-700'
              : completionPercentage > 50
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
              }`}>
              {completionPercentage}%
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface StepProgressBarProps {
  stepNumber: number
  completedFields: number
  totalFields: number
}

const StepProgressBar: React.FC<StepProgressBarProps> = ({ stepNumber, completedFields, totalFields }) => {
  const percentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0

  const getColorClass = () => {
    if (percentage < 50) return 'bg-red-500'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-1 mb-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Step {stepNumber} Progress</span>
        <span className="font-medium">{completedFields}/{totalFields} fields</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
          className={`h-1.5 rounded-full ${getColorClass()}`}
        />
      </div>
    </div>
  )
}

interface RequirementsPanelProps {
  errors: Record<string, string>
  groups: Array<{
    title: string
    icon: React.ElementType
    items: Array<{
      field: string
      message: string
      required?: boolean
    }>
  }>
  onItemClick: (field: string) => void
  isOpen: boolean
  onClose: () => void
}

const RequirementsPanel: React.FC<RequirementsPanelProps> = ({
  errors,
  groups,
  onItemClick,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null

  const hasErrors = Object.keys(errors).length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-24 right-4 w-96 max-w-full z-50"
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-sm font-semibold text-yellow-800">
              {hasErrors ? 'Requirements Needed' : 'All Requirements Met'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          {!hasErrors ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600">All requirements are satisfied!</p>
              <p className="text-xs text-gray-500 mt-1">You can proceed to the next step</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group, groupIndex) => {
                const groupItems = group.items.filter(item => errors[item.field])
                if (groupItems.length === 0) return null

                return (
                  <div key={groupIndex} className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <group.icon className="w-4 h-4" />
                      <span>{group.title}</span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {groupItems.length} missing
                      </span>
                    </div>
                    <div className="space-y-1">
                      {groupItems.map((item, itemIndex) => (
                        <button
                          key={itemIndex}
                          onClick={() => onItemClick(item.field)}
                          className="w-full text-left px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
                        >
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-red-700">{item.message}</p>
                              <p className="text-xs text-gray-500 mt-1 group-hover:text-red-600">
                                Click to fix →
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface CompletionMeterProps {
  completedFields: number
  totalFields: number
}

const CompletionMeter: React.FC<CompletionMeterProps> = ({ completedFields, totalFields }) => {
  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0

  const getColorClass = () => {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-orange-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTextColorClass = () => {
    if (percentage < 25) return 'text-red-600'
    if (percentage < 50) return 'text-orange-600'
    if (percentage < 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <PieChart className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">Application Completion</h3>
        </div>
        <span className={`text-sm font-bold ${getTextColorClass()}`}>
          {percentage}%
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-2.5 rounded-full ${getColorClass()}`}
        />
      </div>

      <p className="text-xs text-gray-600">
        {totalFields - completedFields} field{totalFields - completedFields !== 1 ? 's' : ''} remaining
      </p>
    </div>
  )
}

interface FieldValidationIndicatorProps {
  isValid?: boolean
  isDirty?: boolean
  error?: string
  hint?: string
  className?: string
}

const FieldValidationIndicator: React.FC<FieldValidationIndicatorProps> = ({
  isValid,
  isDirty,
  error,
  hint,
  className = ''
}) => {
  if (!isDirty && !error) {
    return hint ? (
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    ) : null
  }

  return (
    <div className="space-y-1 mt-1">
      {error ? (
        <div className="flex items-center space-x-1 text-red-500">
          <AlertCircle className="w-3 h-3" />
          <p className="text-xs">{error}</p>
        </div>
      ) : isValid ? (
        <div className="flex items-center space-x-1 text-green-500">
          <CheckCircle className="w-3 h-3" />
          <p className="text-xs">Valid</p>
        </div>
      ) : null}
    </div>
  )
}

interface NationalIdInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  className?: string
  disabled?: boolean
}

const NationalIdInput: React.FC<NationalIdInputProps> = ({
  value,
  onChange,
  onBlur,
  error,
  className = '',
  disabled = false
}) => {
  const [isDirty, setIsDirty] = useState(false)
  const isValid = isDirty && validateNationalId(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 16)
    onChange(newValue)
    if (!isDirty) setIsDirty(true)
  }

  const getProgressColor = () => {
    if (value.length === 0) return 'bg-gray-200'
    if (value.length < 16) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={() => {
            setIsDirty(true)
            onBlur?.()
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${error
            ? 'border-red-300 focus:ring-red-500'
            : isValid
              ? 'border-green-300 focus:ring-green-500'
              : 'border-gray-300 focus:ring-blue-500'
            } ${className}`}
          placeholder="Enter 16-digit National ID"
          disabled={disabled}
          maxLength={16}
        />
        {isDirty && isValid && !error && (
          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${getProgressColor()}`}
            style={{ width: `${(value.length / 16) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">
          {value.length}/16
        </span>
      </div>

      <FieldValidationIndicator
        isValid={isValid}
        isDirty={isDirty}
        error={error}
        hint="Your National ID is printed on your ID card and contains exactly 16 numbers"
      />
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CompactLoanApplicationForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.loanApplication)
  const { user } = useSelector((state: RootState) => state.auth)
  const [occupationDocuments, setOccupationDocuments] = useState<UploadedDocument[]>([]);
  const [loanDocuments, setLoanDocuments] = useState<UploadedDocument[]>([]);
  const [borrowerDocuments, setBorrowerDocuments] = useState<UploadedDocument[]>([]);
  const [guarantorDocuments, setGuarantorDocuments] = useState<UploadedDocument[]>([]);
  const [collateralDocuments, setCollateralDocuments] = useState<UploadedDocument[]>([]);
  const [institutionDocuments, setInstitutionDocuments] = useState<UploadedDocument[]>([]);
  const [shareholderDocuments, setShareholderDocuments] = useState<UploadedDocument[]>([]);
  const [boardMemberDocuments, setBoardMemberDocuments] = useState<UploadedDocument[]>([]);

  // ── Pre-uploaded Cloudinary URLs (categorized) ─────────────────────────────
  const [proofOfOwnershipUrls, setProofOfOwnershipUrls] = useState<UploadedDocument[]>([]);
  const [ownerIdentificationUrls, setOwnerIdentificationUrls] = useState<UploadedDocument[]>([]);
  const [legalDocumentUrls, setLegalDocumentUrls] = useState<UploadedDocument[]>([]);
  const [physicalEvidenceUrls, setPhysicalEvidenceUrls] = useState<UploadedDocument[]>([]);
  const [valuationReportUrls, setValuationReportUrls] = useState<UploadedDocument[]>([]);
  const [additionalCollateralDocUrls, setAdditionalCollateralDocUrls] = useState<UploadedDocument[]>([]);
  const [upiDocumentUrl, setUpiDocumentUrl] = useState<UploadedDocument | null>(null);

  // Per-guarantor identification + CRB URLs are now stored on
  // guarantorStructuredDocs (per-guarantor), not as global flat arrays.

  const [institutionLegalDocumentUrls, setInstitutionLegalDocumentUrls] = useState<UploadedDocument[]>([]);
  const [cooperativeLegalDocumentUrls, setCooperativeLegalDocumentUrls] = useState<UploadedDocument[]>([]);
  const [otherInstitutionLegalDocumentUrls, setOtherInstitutionLegalDocumentUrls] = useState<UploadedDocument[]>([]);
  const [institutionLicenseUrls, setInstitutionLicenseUrls] = useState<UploadedDocument[]>([]);
  const [institutionTradingLicenseUrls, setInstitutionTradingLicenseUrls] = useState<UploadedDocument[]>([]);
  const [institutionRegistrationUrls, setInstitutionRegistrationUrls] = useState<UploadedDocument[]>([]);

  // Per-member shareholder/board-member URLs are now stored on
  // memberStructuredDocs (per-member), not as global flat arrays.

  const [marriageCertificateUrls, setMarriageCertificateUrls] = useState<UploadedDocument[]>([]);
  const [spouseCrbReportUrls, setSpouseCrbReportUrls] = useState<UploadedDocument[]>([]);
  const [spouseIdentificationUrls, setSpouseIdentificationUrls] = useState<UploadedDocument[]>([]);
  const [witnessCrbReportUrls, setWitnessCrbReportUrls] = useState<UploadedDocument[]>([]);
  const [witnessIdentificationUrls, setWitnessIdentificationUrls] = useState<UploadedDocument[]>([]);

  const [guarantorUploadedDocs, setGuarantorUploadedDocs] = useState<
    Record<number, UploadedDocument[]>
  >({});

  const [memberUploadedDocs, setMemberUploadedDocs] = useState<
    Record<number, UploadedDocument[]>
  >({});

  // Per-member, per-category pre-uploaded docs. Each row owns its own
  // identification / CRB / proof-of-shares / board-resolution / RDB info /
  // shareholder-resolution so a document is unambiguously tied to the
  // specific member it belongs to.
  type MemberStructuredDocs = {
    identification?: UploadedDocument | null;
    crbReport?: UploadedDocument | null;
    proofOfShares?: UploadedDocument | null;
    boardResolution?: UploadedDocument | null;
    rdbFullInformation?: UploadedDocument | null;
    shareholderResolution?: UploadedDocument | null;
  };
  const [memberStructuredDocs, setMemberStructuredDocs] = useState<
    Record<number, MemberStructuredDocs>
  >({});

  // Per-guarantor structured docs (identification + CRB report).
  // Additional free-form docs continue to live on guarantorUploadedDocs.
  type GuarantorStructuredDocs = {
    identification?: UploadedDocument | null;
    crbReport?: UploadedDocument | null;
  };
  const [guarantorStructuredDocs, setGuarantorStructuredDocs] = useState<
    Record<number, GuarantorStructuredDocs>
  >({});


  const [occupationSupportingDocuments, setOccupationSupportingDocuments] = useState<OccupationSupportingDocument[]>([
    { id: '1', description: '', file: undefined, fileName: '' }
  ])
  const [institutionRelevantDocuments, setInstitutionRelevantDocuments] = useState<InstitutionRelevantDocument[]>([
    { id: '1', description: '', file: undefined, fileName: '' }
  ])
  const [loanRelevantDocuments, setLoanRelevantDocuments] = useState<Array<{ description: string; file?: File }>>([])
  const [additionalCollateralDocuments, setAdditionalCollateralDocuments] = useState<Array<{ description: string; file?: File }>>([])

  // Document description states
  const [institutionRelevantDocumentDescriptions, setInstitutionRelevantDocumentDescriptions] = useState<string[]>([])
  const [loanRelevantDocumentDescriptions, setLoanRelevantDocumentDescriptions] = useState<string[]>([])
  const [borrowerDocumentDescriptions, setBorrowerDocumentDescriptions] = useState<string[]>([])

  // Payment related states
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod | ''>('')
  const [customPaymentPeriod, setCustomPaymentPeriod] = useState<string>('')
  const [preferredPaymentFrequency, setPreferredPaymentFrequency] = useState<string>('')

  // UI states
  const [currentStep, setCurrentStep] = useState(1)
  // Dynamic Loan Application PDF — 'blank' (Step 1 printable template) or
  // 'filled' (Review & Submit, generated from the current wizard state).
  const [appPdf, setAppPdf] = useState<null | 'blank' | 'filled'>(null)
  // Frozen at open time so autosave-driven re-renders don't rebuild the PDF.
  const [pdfApp, setPdfApp] = useState<any>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [autoSaveMessage, setAutoSaveMessage] = useState<string | null>(null)
  const [showRequirementsPanel, setShowRequirementsPanel] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  // Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOfficerDropdownOpen, setIsOfficerDropdownOpen] = useState(false)
  const [officerSearchTerm, setOfficerSearchTerm] = useState("")

  // Location states
  const [provinces, setProvinces] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [sectors, setSectors] = useState<string[]>([])
  const [cells, setCells] = useState<string[]>([])
  const [villages, setVillages] = useState<string[]>([])

  // Organization data
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([])

  // Borrower search states
  const [clientAccounts, setClientAccounts] = useState<any[]>([])
  const [borrowerProfiles, setBorrowerProfiles] = useState<any[]>([])
  const [searchBorrowerIdentifier, setSearchBorrowerIdentifier] = useState('')
  const [searchResults, setSearchResults] = useState<any | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  // "Does the borrower already exist?" — default No. Unchecked = New Borrower
  // (search disabled); checked = existing borrower (search enabled, relationship
  // defaults to Repeat and is refined by the search auto-detect).
  const [borrowerExists, setBorrowerExists] = useState(false)
  const [isAutoPopulated, setIsAutoPopulated] = useState(false)
  const [sourceBorrowerId, setSourceBorrowerId] = useState<number | null>(null)
  const [clientAccountId, setClientAccountId] = useState<number | null>(null)
  const [autoPopulatedFields, setAutoPopulatedFields] = useState<string[]>([])
  const [isFetchingData, setIsFetchingData] = useState(false)
  // Invitation → existing-borrower recognition on draft continuation
  // (docs/invitation-existing-borrower-recognition-plan.md). `borrowerListsLoaded`
  // gates recognition until the matchable Customer Accounts / Borrower Profiles are
  // available; `existingHint` carries the portal's authoritative link
  // (data.__existingBorrower); the ref makes recognition run exactly once.
  const [borrowerListsLoaded, setBorrowerListsLoaded] = useState(false)
  const [existingHint, setExistingHint] = useState<any>(null)
  const invitationRecognizedRef = useRef(false)

  // Toasts fired from inside state-mutating helpers (auto-fill / clear / recognize)
  // are deferred to a macrotask so they can NEVER update the toast component during
  // a React render pass — which triggers "Cannot update a component (toast) while
  // rendering CompactLoanApplicationForm". Deferring keeps the toast visible but
  // moves the toast-store setState safely after the current render/commit.
  const deferToast = (fn: () => void) => { try { setTimeout(fn, 0) } catch { /* noop */ } }
  const [displayAccountInfo, setDisplayAccountInfo] = useState<any | null>(null)
  const [shouldDisplayAccountCard, setShouldDisplayAccountCard] = useState(false)

  // Income sources state
  const [incomeSourcesList, setIncomeSourcesList] = useState<Array<{
    source: string
    otherSource?: string
    frequency: IncomeFrequency
    amount: number
  }>>([])

  // Guarantors state
  const [guarantors, setGuarantors] = useState<GuarantorInfo[]>([
    {
      name: '',
      phone: '',
      address: '',
      nationalId: '',
      email: '',
      guarantorType: 'individual',
      guaranteedAmount: undefined,
    }
  ])

  // Shareholder/board members state
  const [shareholderBoardMembers, setShareholderBoardMembers] = useState<ShareholderBoardMemberInfo[]>([])

  // ── Cross-session draft id (per-user, stored in localStorage by id) ───────
  // If we land here via /draftloanapplication "Continue" we read ?draftId=...,
  // otherwise we mint a new id so saves are consistent. The previous in-page
  // "loan-application-draft" mechanism is preserved (session-scoped backup);
  // this is the cross-session permanent draft addressable by id.
  const _searchParams = useSearchParams?.();
  const [draftId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const fromUrl = _searchParams?.get("draftId") || "";
    return fromUrl || generateDraftId();
  });
  const [draftHydrated, setDraftHydrated] = useState(false);
  // Smart document preview — used by every uploaded-document list below.
  const { openPreview, PreviewComponent } = useDocumentPreview();

  // Form data
  const [formData, setFormData] = useState<LoanApplicationRequest>({
    borrowerType: BorrowerType.INDIVIDUAL,
    firstName: "",
    lastName: "",
    middleName: "",
    nationalId: "",
    gender: Gender.MALE,
    dateOfBirth: "",
    maritalStatus: MaritalStatus.SINGLE,
    placeOfBirth: "",
    primaryPhone: "",
    alternativePhone: "",
    email: "",
    address: {
      country: "Rwanda",
      village: "",
      cell: "",
      sector: "",
      district: "",
      province: "",
    },
    occupation: "",
    monthlyIncome: undefined,
    incomeSource: "",
    relationshipWithNDFSP: RelationshipType.NEW_BORROWER,
    previousLoansPaidOnTime: 0, // new borrower ⇒ zero prior loans (see relationship watcher)
    borrowerNotes: "",
    nationalIdDistrict: "",
    nationalIdSector: "",
    parentsInformation: {
      motherFullName: "",
      motherDistrictOfBirth: "",
      motherSectorOfBirth: "",
      fatherFullName: "",
      fatherDistrictOfBirth: "",
      fatherSectorOfBirth: "",
    },
    incomeSources: [],
    selectedIncomeSource: "",
    otherIncomeSource: "",
    incomeFrequency: undefined,
    incomeAmount: undefined,
    purposeOfLoan: "",
    branchName: "",
    businessOfficer: "",
    disbursedAmount: 0,
    businessType: null,
    businessStructure: null,
    economicSector: null,
    loanNotes: "",
    preferredPaymentFrequency: undefined,
    paymentFrequency: undefined,
    paymentPeriod: undefined,
    customPaymentPeriod: "",
    occupationSupportingDocDescriptions: [],
    occupationSupportingDocuments: [],
    institutionRelevantDocumentDescriptions: [],
    loanRelevantDocumentDescriptions: [],
    loanRelevantDocuments: [],
    borrowerDocumentDescriptions: [],
    guarantorDocumentDescriptions: [],
    shareholderAdditionalDocDescriptions: [],
    boardMemberAdditionalDocDescriptions: [],
    collateralAdditionalDocDescriptions: [],
    collateralLocation: "",
    collateralOwnerInfo: undefined,
    marketValue: undefined,
    insuranceValue: undefined,
    forcedSaleValue: undefined,
    collateralType: CollateralType.IMMOVABLE,
    collateralDescription: "",
    upiNumber: "",
    collateralValue: undefined,
    guarantorName: "",
    guarantorPhone: "",
    guarantorAddress: "",
    valuationDate: "",
    valuedBy: "",
    collateralNotes: "",
    spouseInfo: undefined,
    institutionProfile: undefined,
    shareholderBoardMembers: undefined,
    guarantors: undefined,
    sourceBorrowerId: undefined,
    clientAccountId: undefined,
  })


  const getStepErrors = useCallback((step: number): Record<string, string> => {
    const errors: Record<string, string> = {};
    const req = (fail: boolean, key: string, msg: string) => { if (fail) errors[key] = msg; };

    switch (step) {
      case 1:
        // Borrower identity validation is delegated to the shared borrower-basic
        // schema (src/lib/loanApplication/borrowerBasicSchema.ts) so this wizard
        // and the public borrower-invitation portal can never drift — identical
        // keys and messages as before.
        Object.assign(errors, validateBorrowerIdentity(formData.borrowerType, formData));
        break;

      case 2:
        // Address + income validation — same shared source of truth. Occupation
        // supporting documents remain OPTIONAL at creation time (unchanged).
        Object.assign(
          errors,
          validateBorrowerAddressIncome(formData.borrowerType, formData, incomeSourcesList, currencyCode())
        );
        break;

      case 3:
        req(!formData.purposeOfLoan?.trim(), "purposeOfLoan",
          "Purpose of loan is required — describe what the funds will be used for");
        req(!formData.branchName?.trim(), "branchName",
          "Branch name is required — select the branch handling this application");
        req(!formData.businessOfficer?.trim(), "businessOfficer",
          "Business officer is required — select the officer assigned to this application");
        if (!formData.disbursedAmount || formData.disbursedAmount <= 0) {
          errors.disbursedAmount = `Loan amount must be greater than 0 ${currencyCode()}`;
        }
        req(!preferredPaymentFrequency, "preferredPaymentFrequency",
          "Repayment frequency is required (e.g. Monthly, Weekly)");
        req(!paymentPeriod, "paymentPeriod",
          "Payment period is required (e.g. 12 Months, 36 Months)");
        if (paymentPeriod === PaymentPeriod.CUSTOM) {
          req(!customPaymentPeriod?.trim(), "customPaymentPeriod",
            "Custom payment period: please specify the duration (e.g. '5 years', '18 months')");
        }
        break;

      case 4:
        // Collateral is entirely optional. The officer may leave every field
        // empty and continue, or fill whatever their company's process needs.
        // Nothing here is required — Next/Submit are never blocked by collateral.
        // We only validate the FORMAT of a value that was actually entered.
        if (formData.upiNumber?.trim() && !validateUpiNumber(formData.upiNumber.trim())) {
          errors.upiNumber = "UPI Number must be 3–40 characters; letters, digits, /, -, ., *, $ and spaces are allowed (e.g. RW1234567890 or 5/01/10/04/5365)";
        }
        break;

case 5:
  // Step 5 documents — guarantor / shareholder / board-member Identification, CRB
  // Report, Proof of Shares, and additional supporting files — are OPTIONAL at
  // creation time. Every upload slot remains visible and functional; any files
  // provided are persisted and indexed exactly as before, and missing documents
  // can be supplied later during review / approval / disbursement. No document
  // requirement blocks Next/Submit. (Non-document member/guarantor data continues
  // to be captured through its own fields.)
  break;

      default:
        break;
    }

    return errors;
  }, [
    formData, incomeSourcesList, occupationDocuments,
    loanDocuments, guarantors, guarantorUploadedDocs, guarantorStructuredDocs,
    shareholderBoardMembers, memberUploadedDocs, memberStructuredDocs,
    preferredPaymentFrequency, paymentPeriod, customPaymentPeriod,
    upiDocumentUrl,
    BorrowerType, MaritalStatus, CollateralType, RelationshipType, PaymentPeriod,
    validateNationalId, validateEmail, validateUpiNumber,
  ]);


  // Refs
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const totalSteps = formData.borrowerType === BorrowerType.INSTITUTION ? 7 : 6

  const filteredBranches = useMemo(() => {
    if (!user?.organization?.branches) return []
    const branches = user.organization.branches
    if (!searchTerm.trim()) return branches
    return branches.filter((branch: any) =>
      branch.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [user?.organization?.branches, searchTerm])

  // ── Branch auto-fill from user login ─────────────────────────────────
  // Prefer Redux as source of truth, fall back to localStorage `user` so the
  // value is available on the very first render. Redux hydrates from a cookie
  // (1-day expiry) which can be missing on a fresh tab even when the user is
  // logged in; localStorage persists across the whole session.
  const autoAssignedBranch = useMemo(() => {
    const fromRedux = (user as any)?.branch;
    if (fromRedux) return fromRedux as string;
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return "";
      const parsed = JSON.parse(stored);
      return (parsed?.branch as string) ?? "";
    } catch { return ""; }
  }, [user]);

  useEffect(() => {
    if (autoAssignedBranch && formData.branchName !== autoAssignedBranch) {
      handleInputChange("branchName", autoAssignedBranch);
    }
    // We deliberately depend only on the auto-fill drivers; handleInputChange is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAssignedBranch]);

const filteredUsers = useMemo(() => {
  if (!organizationUsers || organizationUsers.length === 0) return []
  
  // Filter only users with business officer role
  const businessOfficers = organizationUsers.filter(user => {
    const role = user.role?.toLowerCase() || ''
    return role.includes('business_officer') || 
           role.includes('business-officer') || 
           role.includes('business officer') ||
           role === 'officer'
  })
  
  if (!officerSearchTerm.trim()) return businessOfficers
  
  return businessOfficers.filter(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase()
    const username = u.username?.toLowerCase() || ''
    const role = u.role?.toLowerCase() || ''
    const search = officerSearchTerm.toLowerCase()
    return fullName.includes(search) || username.includes(search) || role.includes(search)
  })
}, [organizationUsers, officerSearchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        const dropdown = document.getElementById('branch-dropdown-container')
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setIsDropdownOpen(false)
        }
      }
      if (isOfficerDropdownOpen) {
        const dropdown = document.getElementById('officer-dropdown-container')
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setIsOfficerDropdownOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen, isOfficerDropdownOpen])

// Find this useEffect (around line 1050-1080) and replace with:
useEffect(() => {
  const fetchOrganizationUsers = async () => {
    try {
      const userString = localStorage.getItem("user")
      const user = userString ? JSON.parse(userString) : null

      if (!user?.organizationId) return

      // Add filter parameter to only fetch business officers
      const response = await fetch(`${API_BASE_URL}/organizations/${user.organizationId}/users?role=business_officer`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Filter again on client side for safety
        const businessOfficers = (data.data || []).filter((user: any) => {
          const role = user.role?.toLowerCase() || ''
          return role.includes('business_officer') || 
                 role.includes('business-officer') || 
                 role.includes('business officer') ||
                 role === 'officer'
        })
        setOrganizationUsers(businessOfficers)
      }
    } catch (error) {
      // error fetching organization users
    }
  }

  fetchOrganizationUsers()
}, [])

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const serializable = incomeSourcesList.map(s => ({
        source: s.source,
        otherSource: s.otherSource,
        frequency: s.frequency,
        amount: s.amount,
      }));
      localStorage.setItem("loan-income-sources", JSON.stringify(serializable));
    } catch { /* ignore */ }
  }, [incomeSourcesList]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load guarantor documents from localStorage
    const savedGuarantorDocs = localStorage.getItem("loan-guarantor-docs");
    if (savedGuarantorDocs) {
      try {
        setGuarantorUploadedDocs(JSON.parse(savedGuarantorDocs));
      } catch (e) {
        // failed to load guarantor docs
      }
    }

    // Load member documents from localStorage
    const savedMemberDocs = localStorage.getItem("loan-member-docs");
    if (savedMemberDocs) {
      try {
        setMemberUploadedDocs(JSON.parse(savedMemberDocs));
      } catch (e) {
        // failed to load member docs
      }
    }
  }, []);


  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("loan-guarantor-docs", JSON.stringify(guarantorUploadedDocs));
  }, [guarantorUploadedDocs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("loan-member-docs", JSON.stringify(memberUploadedDocs));
  }, [memberUploadedDocs]);
  

  const updateGuarantorDocs = useCallback((index: number, docs: UploadedDocument[]) => {
    setGuarantorUploadedDocs(prev => ({ ...prev, [index]: docs }));
  }, []);

  const updateMemberDocs = useCallback((index: number, docs: UploadedDocument[]) => {
    setMemberUploadedDocs(prev => ({ ...prev, [index]: docs }));
  }, []);

  const updateMemberStructuredDoc = useCallback(
    (index: number, key: keyof MemberStructuredDocs, doc: UploadedDocument | null) => {
      setMemberStructuredDocs(prev => ({
        ...prev,
        [index]: { ...(prev[index] || {}), [key]: doc },
      }));
    },
    []
  );

  const updateGuarantorStructuredDoc = useCallback(
    (index: number, key: keyof GuarantorStructuredDocs, doc: UploadedDocument | null) => {
      setGuarantorStructuredDocs(prev => ({
        ...prev,
        [index]: { ...(prev[index] || {}), [key]: doc },
      }));
    },
    []
  );

  useEffect(() => {
    if (formData.relationshipWithNDFSP === RelationshipType.NEW_BORROWER) {
      setSourceBorrowerId(null)
      setClientAccountId(null)
      setFormData(prev => ({
        ...prev,
        sourceBorrowerId: undefined,
        clientAccountId: undefined,
        // A first-time borrower logically has zero prior loans — force 0.
        previousLoansPaidOnTime: 0,
      }))
    } else if (!isAutoPopulated) {
      // Switching to Repeat/Returning: let the officer type the real count
      // (unless it was auto-populated from an existing borrower profile).
      setFormData(prev => ({
        ...prev,
        previousLoansPaidOnTime: prev.previousLoansPaidOnTime === 0 ? undefined : prev.previousLoansPaidOnTime,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.relationshipWithNDFSP])

  // Auto-derive the birth YEAR from a valid National ID and pre-fill the year
  // portion of Date of Birth (day/month are not encoded in the Rwandan NID, so
  // they stay editable). Never overwrites an officer-typed date or an
  // auto-populated (existing-borrower) DOB.
  useEffect(() => {
    const year = deriveBirthYearFromNID(formData.nationalId || "")
    if (!year) return
    if (isAutoPopulated && autoPopulatedFields.includes("dateOfBirth")) return
    // Only fill when DOB is empty or its year disagrees with the NID year.
    const currentYear = formData.dateOfBirth ? Number(String(formData.dateOfBirth).slice(0, 4)) : NaN
    if (!formData.dateOfBirth || currentYear !== year) {
      setFormData(prev => ({ ...prev, dateOfBirth: `${year}-01-01` }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.nationalId])

  // Auto-save notification effect
  useEffect(() => {
    if (autoSaveMessage) {
      const timer = setTimeout(() => {
        setAutoSaveMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [autoSaveMessage])

  // Auto-save functionality
  const saveToLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const dataToSave = {
          formData,
          currentStep,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem("loan-application-draft", JSON.stringify(dataToSave))
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        // setAutoSaveMessage("Saved just now")
      } catch (error) {
        // failed to save to localStorage
      }
    }
  }, [formData, currentStep])

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(saveToLocalStorage, 500)
  }, [saveToLocalStorage])

  // ── Cross-session draft store (addressable by draftId) ────────────────────
  // 1) On mount: if the URL carries ?draftId=…, hydrate the form from that
  //    draft. Otherwise seed a new draft row so it appears on the Drafts page.
  // 2) On any change: debounced save to the per-id store. This is independent
  //    of the existing single-slot "loan-application-draft" backup (preserved).
  // ── Full-form snapshot for draft persistence ────────────────────────────
  // The draft must capture the WHOLE image of the create-loan form so a user
  // can resume on any device and see every field + every uploaded-document
  // URL exactly as they left it. We bundle every relevant state slice into
  // one object and ship that on autosave. Hydration restores each slice
  // back to its setter if present in the draft.
  const buildFullSnapshot = (): Record<string, any> => ({
    // Top-level core form
    formData,
    currentStep,
    // Composite collections
    incomeSourcesList,
    guarantors,
    shareholderBoardMembers,
    occupationSupportingDocuments,
    institutionRelevantDocuments,
    loanRelevantDocuments,
    additionalCollateralDocuments,
    institutionRelevantDocumentDescriptions,
    loanRelevantDocumentDescriptions,
    borrowerDocumentDescriptions,
    // Payment timing
    paymentPeriod,
    customPaymentPeriod,
    preferredPaymentFrequency,
    // Uploaded-document URL collections (cloud links survive across devices)
    occupationDocuments,
    loanDocuments,
    borrowerDocuments,
    guarantorDocuments,
    collateralDocuments,
    institutionDocuments,
    shareholderDocuments,
    boardMemberDocuments,
    proofOfOwnershipUrls,
    ownerIdentificationUrls,
    legalDocumentUrls,
    physicalEvidenceUrls,
    valuationReportUrls,
    additionalCollateralDocUrls,
    upiDocumentUrl,
    institutionLegalDocumentUrls,
    cooperativeLegalDocumentUrls,
    otherInstitutionLegalDocumentUrls,
    institutionLicenseUrls,
    institutionTradingLicenseUrls,
    institutionRegistrationUrls,
    marriageCertificateUrls,
    spouseCrbReportUrls,
    spouseIdentificationUrls,
    witnessCrbReportUrls,
    witnessIdentificationUrls,
    guarantorUploadedDocs,
    memberUploadedDocs,
    memberStructuredDocs,
    guarantorStructuredDocs,
  });

  // Restores every slice from a fetched draft. Each slice is restored only
  // if it exists in the snapshot, so older drafts (saved before more state
  // slices were added) continue to open without throwing.
  const hydrateFromSnapshot = (snap: Record<string, any>) => {
    // Capture the portal's authoritative existing-borrower link (if any); the
    // recognition effect uses it as first-priority. Additive; no effect on
    // officer-created drafts (which never carry it).
    try { setExistingHint((snap as any)?.__existingBorrower || null); } catch { /* ignore */ }
    const safe = (key: string, setter: (v: any) => void) => {
      if (snap && Object.prototype.hasOwnProperty.call(snap, key)) {
        try { setter(snap[key]); } catch { /* ignore individual slice errors */ }
      }
    };
    // Pin branchName to current user's branch before applying formData.
    let pinnedBranch = "";
    try {
      const u = localStorage.getItem("user");
      pinnedBranch = u ? (JSON.parse(u)?.branch ?? "") : "";
    } catch { pinnedBranch = ""; }
    if (snap.formData) {
      const fd = { ...snap.formData };
      if (pinnedBranch) (fd as any).branchName = pinnedBranch;
      setFormData(fd);
    }
    safe("currentStep", setCurrentStep);
    safe("incomeSourcesList", setIncomeSourcesList);
    safe("guarantors", setGuarantors);
    safe("shareholderBoardMembers", setShareholderBoardMembers);
    safe("occupationSupportingDocuments", setOccupationSupportingDocuments);
    safe("institutionRelevantDocuments", setInstitutionRelevantDocuments);
    safe("loanRelevantDocuments", setLoanRelevantDocuments);
    safe("additionalCollateralDocuments", setAdditionalCollateralDocuments);
    safe("institutionRelevantDocumentDescriptions", setInstitutionRelevantDocumentDescriptions);
    safe("loanRelevantDocumentDescriptions", setLoanRelevantDocumentDescriptions);
    safe("borrowerDocumentDescriptions", setBorrowerDocumentDescriptions);
    safe("paymentPeriod", setPaymentPeriod);
    safe("customPaymentPeriod", setCustomPaymentPeriod);
    safe("preferredPaymentFrequency", setPreferredPaymentFrequency);
    safe("occupationDocuments", setOccupationDocuments);
    safe("loanDocuments", setLoanDocuments);
    safe("borrowerDocuments", setBorrowerDocuments);
    safe("guarantorDocuments", setGuarantorDocuments);
    safe("collateralDocuments", setCollateralDocuments);
    safe("institutionDocuments", setInstitutionDocuments);
    safe("shareholderDocuments", setShareholderDocuments);
    safe("boardMemberDocuments", setBoardMemberDocuments);
    safe("proofOfOwnershipUrls", setProofOfOwnershipUrls);
    safe("ownerIdentificationUrls", setOwnerIdentificationUrls);
    safe("legalDocumentUrls", setLegalDocumentUrls);
    safe("physicalEvidenceUrls", setPhysicalEvidenceUrls);
    safe("valuationReportUrls", setValuationReportUrls);
    safe("additionalCollateralDocUrls", setAdditionalCollateralDocUrls);
    safe("upiDocumentUrl", setUpiDocumentUrl);
    safe("institutionLegalDocumentUrls", setInstitutionLegalDocumentUrls);
    safe("cooperativeLegalDocumentUrls", setCooperativeLegalDocumentUrls);
    safe("otherInstitutionLegalDocumentUrls", setOtherInstitutionLegalDocumentUrls);
    safe("institutionLicenseUrls", setInstitutionLicenseUrls);
    safe("institutionTradingLicenseUrls", setInstitutionTradingLicenseUrls);
    safe("institutionRegistrationUrls", setInstitutionRegistrationUrls);
    safe("marriageCertificateUrls", setMarriageCertificateUrls);
    safe("spouseCrbReportUrls", setSpouseCrbReportUrls);
    safe("spouseIdentificationUrls", setSpouseIdentificationUrls);
    safe("witnessCrbReportUrls", setWitnessCrbReportUrls);
    safe("witnessIdentificationUrls", setWitnessIdentificationUrls);
    safe("guarantorUploadedDocs", setGuarantorUploadedDocs);
    safe("memberUploadedDocs", setMemberUploadedDocs);
    safe("memberStructuredDocs", setMemberStructuredDocs);
    safe("guarantorStructuredDocs", setGuarantorStructuredDocs);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (draftHydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const fromUrl = _searchParams?.get("draftId") || "";
        if (fromUrl) {
          const rec = await getDraft(fromUrl);
          if (cancelled) return;
          if (rec?.data) {
            hydrateFromSnapshot(rec.data);
          }
        } else {
          // Seed an empty draft so the new id shows up on the Drafts page.
          await saveDraft(draftId, buildFullSnapshot());
        }
      } catch { /* non-fatal — never block the create page */ }
      if (!cancelled) setDraftHydrated(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, draftHydrated]);

  // ── Whole-image autosave ────────────────────────────────────────────────
  // We rebuild a fresh snapshot on every render (cheap object spread) and
  // serialize it to a string in a ref to detect actual changes. The timer is
  // only set when the serialized payload differs from the last-shipped one.
  // The save itself is fire-and-forget so the UI never blocks.
  const _lastShippedRef = useRef<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!draftId || !draftHydrated) return;
    let serialized = "";
    try {
      serialized = JSON.stringify(buildFullSnapshot());
    } catch {
      // Snapshot un-serializable (Files etc.) — skip this tick.
      return;
    }
    if (serialized === _lastShippedRef.current) return;
    const t = setTimeout(() => {
      _lastShippedRef.current = serialized;
      patchDraft(draftId, JSON.parse(serialized)).catch(() => { /* ignore */ });
    }, 600);
    return () => clearTimeout(t);
    // Watching every slice individually would explode the deps array, so we
    // intentionally depend on `serialized` via the ref above and trigger via
    // the deps that matter most. The serialization check above is the real
    // change-detection layer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData, currentStep,
    incomeSourcesList, guarantors, shareholderBoardMembers,
    occupationSupportingDocuments, institutionRelevantDocuments,
    loanRelevantDocuments, additionalCollateralDocuments,
    institutionRelevantDocumentDescriptions, loanRelevantDocumentDescriptions, borrowerDocumentDescriptions,
    paymentPeriod, customPaymentPeriod, preferredPaymentFrequency,
    occupationDocuments, loanDocuments, borrowerDocuments,
    guarantorDocuments, collateralDocuments, institutionDocuments,
    shareholderDocuments, boardMemberDocuments,
    proofOfOwnershipUrls, ownerIdentificationUrls, legalDocumentUrls,
    physicalEvidenceUrls, valuationReportUrls, additionalCollateralDocUrls,
    upiDocumentUrl,
    institutionLegalDocumentUrls, cooperativeLegalDocumentUrls, otherInstitutionLegalDocumentUrls,
    institutionLicenseUrls, institutionTradingLicenseUrls, institutionRegistrationUrls,
    marriageCertificateUrls, spouseCrbReportUrls, spouseIdentificationUrls,
    witnessCrbReportUrls, witnessIdentificationUrls,
    guarantorUploadedDocs, memberUploadedDocs, memberStructuredDocs, guarantorStructuredDocs,
    draftId, draftHydrated,
  ])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("loan-application-draft")
        if (saved) {
          const data = JSON.parse(saved)
          // Pin branchName to the logged-in user's assigned branch — drafts
          // saved before a relogin, or by a different teller on this machine,
          // must never override the current user's branch assignment.
          let pinnedBranch = "";
          try {
            const u = localStorage.getItem("user");
            pinnedBranch = u ? (JSON.parse(u)?.branch ?? "") : "";
          } catch { pinnedBranch = ""; }
          const restored = data.formData ?? {};
          if (pinnedBranch) restored.branchName = pinnedBranch;
          setFormData(restored)
          setCurrentStep(data.currentStep)
          setLastSaved(new Date(data.timestamp))
        }
      } catch (error) {
        // failed to load from localStorage
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("loan-income-sources");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setIncomeSourcesList(parsed);
      }
    }
  }, []);



  useEffect(() => {
    setHasUnsavedChanges(true)
    debouncedSave()
  }, [formData, debouncedSave])

  useEffect(() => {
    setProvinces(RwandaLocationService.getProvinces())
  }, [])

  // Update dependent dropdowns
  useEffect(() => {
    const { province, district, sector, cell } = formData.address

    if (province) {
      setDistricts(RwandaLocationService.getDistricts(province))
    } else {
      setDistricts([])
      setSectors([])
      setCells([])
      setVillages([])
    }

    if (province && district) {
      setSectors(RwandaLocationService.getSectors(province, district))
    } else {
      setSectors([])
      setCells([])
      setVillages([])
    }

    if (province && district && sector) {
      setCells(RwandaLocationService.getCells(province, district, sector))
    } else {
      setCells([])
      setVillages([])
    }

    if (province && district && sector && cell) {
      setVillages(RwandaLocationService.getVillages(province, district, sector, cell))
    } else {
      setVillages([])
    }
  }, [formData.address])

  // Ensure institution profile is initialized
  useEffect(() => {
    if (formData.borrowerType === BorrowerType.INSTITUTION && !formData.institutionProfile) {
      setFormData(prev => ({
        ...prev,
        institutionProfile: {
          institutionName: "",
          institutionType: InstitutionType.COMPANY,
          otherInstitutionType: "",
          licenseNumber: "",
          tinNumber: "",
          registrationDate: "",
          contactPerson: "",
          contactPhone: "",
          contactEmail: "",
          address: {
            street: "",
          },
        }
      }))
    }
  }, [formData.borrowerType, formData.institutionProfile])

  // Fetch existing borrower data
  useEffect(() => {
    const fetchExistingBorrowerData = async () => {
      try {
        setIsFetchingData(true)
        const userString = localStorage.getItem("user")
        const user = userString ? JSON.parse(userString) : null

        if (!user?.organizationId) {
          return
        }

        const [clientAccountsResponse, borrowerProfilesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/organizations/${user.organizationId}/client-borrower-accounts?page=1&limit=100`, {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${API_BASE_URL}/organizations/${user.organizationId}/borrowers?page=1&limit=100`, {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
              "Content-Type": "application/json",
            },
          }),
        ])

        if (clientAccountsResponse.ok) {
          const clientData = await clientAccountsResponse.json()
          setClientAccounts(clientData.data || [])
        }

        if (borrowerProfilesResponse.ok) {
          const borrowerData = await borrowerProfilesResponse.json()
          setBorrowerProfiles(borrowerData.data || [])
        }
      } catch (error) {
        toast.error('Failed to load existing borrower data')
      } finally {
        setIsFetchingData(false)
        setBorrowerListsLoaded(true)
      }
    }

    fetchExistingBorrowerData()
  }, [])

  // ── Invitation → existing-borrower recognition (runs ONCE on draft continuation) ─
  // When an officer continues a draft (esp. one produced by a borrower invitation)
  // whose applicant already exists, recognize them and auto-fill via the SAME
  // canonical path as manual Search. Priority: (1) the portal's explicit
  // borrowerProfileId hint, (2) identity match — individual→NID, institution→TIN,
  // email as documented last resort. Ambiguous (>1) matches never auto-select; the
  // officer picks via the existing manual Search. Fresh officer creation (no draftId)
  // and already-recognized drafts are untouched. The backend resolution ladder
  // remains the safety net; when recognized we also pass sourceBorrowerId at submit.
  useEffect(() => {
    if (invitationRecognizedRef.current) return
    if (!draftId || !draftHydrated || !borrowerListsLoaded) return
    invitationRecognizedRef.current = true // once only, regardless of outcome
    if (isAutoPopulated) return // already recognized (e.g. via manual Search)

    const isInst = formData.borrowerType === BorrowerType.INSTITUTION
    const nid = String(formData.nationalId || '').trim()
    const tin = String((formData as any)?.institutionProfile?.tinNumber || (formData as any)?.tinNumber || '').trim()
    const email = String(formData.email || '').trim().toLowerCase()
    const pid = existingHint?.borrowerProfileId

    // Priority 1 — explicit borrowerProfileId from the invitation portal.
    let profile: any = pid ? (borrowerProfiles.find((p: any) => p.id === pid) || null) : null

    // Priority 2 — identity match (only when the explicit link didn't resolve):
    // individual→NID, institution→TIN, email as documented last resort.
    if (!profile) {
      const profMatches = borrowerProfiles.filter((p: any) => isInst
        ? (!!tin && (p?.institutionProfile?.tinNumber === tin || p?.tinNumber === tin))
        : (!!nid && p.nationalId === nid))
      let emailMatches: any[] = []
      if (!profMatches.length && email) {
        emailMatches = borrowerProfiles.filter((p: any) => String(p.email || '').trim().toLowerCase() === email)
      }
      const candidates = profMatches.length ? profMatches : emailMatches
      if (candidates.length > 1) {
        // Ambiguous → never guess. Route to the officer's existing manual selection,
        // pre-seeded with the identity, so they choose explicitly.
        setBorrowerExists(true)
        setSearchBorrowerIdentifier(nid || tin || email)
        deferToast(() => toast('Multiple existing borrowers match — please Search & select the correct one.', { icon: 'ℹ️' }))
        return
      }
      profile = candidates[0] || null
    }

    // REPEAT vs RETURNING (same rule as manual Search): a borrower who already
    // holds a client account (e.g. a prior disbursed loan) is a REPEAT borrower;
    // matched by the profile-id link first so a null account nationalId can't
    // misclassify them. Otherwise a known borrower profile is RETURNING.
    const account = findClientAccountForBorrower({
      profileId: profile?.id ?? null,
      identifier: isInst ? tin : nid,
      isIndividual: !isInst,
    })

    if (account) {
      setClientAccountId(account.id)
      applyExistingBorrower(enrichAccountForRepeat(account, profile, isInst ? tin : nid), { relationshipType: RelationshipType.REPEAT_BORROWER, source: 'clientAccount' })
      deferToast(() => toast.success('Recognised repeat borrower (existing account) — details auto-filled.'))
    } else if (profile) {
      applyExistingBorrower(profile, { relationshipType: RelationshipType.RETURNING_BORROWER, source: 'borrowerProfile' })
      deferToast(() => toast.success('Recognised returning borrower — details auto-filled.'))
    }
    // else: genuinely new invited borrower — leave the new-borrower flow unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, draftHydrated, borrowerListsLoaded, clientAccounts, borrowerProfiles, existingHint, isAutoPopulated,
      formData.borrowerType, formData.nationalId, formData.email])

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  const markFieldTouched = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field))
  }

  const getFieldError = (field: string): string | undefined => {
    return validationErrors[field]
  }

  const isFieldTouched = (field: string): boolean => {
    return touchedFields.has(field)
  }


  const isStepComplete = useCallback((step: number): boolean => {
    if (step > 5) return true;
    const errs = getStepErrors(step);
    const ok = Object.keys(errs).length === 0;

    return ok;
  }, [getStepErrors]);

  const getTabState = (step: number): "locked" | "in-progress" | "completed" | "failed" | "accessible" => {
    if (step === currentStep) return "in-progress";

    if (step < currentStep) {
      return isStepComplete(step) ? "completed" : "failed";
    }

    // Future step — locked unless ALL preceding steps are complete
    for (let i = 1; i < step; i++) {
      if (!isStepComplete(i)) return "locked";
    }
    return "accessible";
  };
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      if (field.includes(".")) {
        const parts = field.split(".")
        if (parts.length === 2) {
          const [parent, child] = parts
          const parentKey = parent as keyof LoanApplicationRequest
          return {
            ...prev,
            [parentKey]: {
              ...(prev[parentKey] as Record<string, any>),
              [child]: value,
            },
          }
        } else if (parts.length === 3) {
          const [parent, child, subChild] = parts
          const parentKey = parent as keyof LoanApplicationRequest
          return {
            ...prev,
            [parentKey]: {
              ...(prev[parentKey] as Record<string, any>),
              [child]: {
                ...((prev[parentKey] as Record<string, any>)?.[child] || {}),
                [subChild]: value,
              },
            },
          }
        }
      }

      if (field === "relationshipWithNDFSP") {
        if (value !== RelationshipType.REPEAT_BORROWER &&
          value !== RelationshipType.RETURNING_BORROWER &&
          isAutoPopulated) {
          clearAutoPopulatedData()
        }
        setSearchResults(null)
        setSearchBorrowerIdentifier('')
      }

      if (field === "borrowerType" && isAutoPopulated) {
        clearAutoPopulatedData()
      }

      if (field === "sourceBorrowerId" || field === "clientAccountId") {
        return {
          ...prev,
          [field]: value
        }
      }

      if (field === "borrowerType" && value === BorrowerType.INSTITUTION) {
        return {
          ...prev,
          borrowerType: value,
          institutionProfile: prev.institutionProfile || {
            institutionName: "",
            institutionType: InstitutionType.COMPANY,
            otherInstitutionType: "",
            licenseNumber: "",
            tinNumber: "",
            registrationDate: "",
            contactPerson: "",
            contactPhone: "",
            contactEmail: "",
            address: { street: "" }
          }
        }
      }

      return {
        ...prev,
        [field as keyof LoanApplicationRequest]: value
      }
    })

    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleInstitutionProfileChange = (field: string, value: any) => {
    setFormData(prev => {
      const currentProfile = prev.institutionProfile || {
        institutionName: "",
        institutionType: InstitutionType.COMPANY,
        otherInstitutionType: "",
        licenseNumber: "",
        tinNumber: "",
        registrationDate: "",
        contactPerson: "",
        contactPhone: "",
        contactEmail: "",
        address: { street: "" }
      }

      if (field === "address.street") {
        return {
          ...prev,
          institutionProfile: {
            ...currentProfile,
            address: {
              ...currentProfile.address,
              street: value
            }
          }
        }
      }

      return {
        ...prev,
        institutionProfile: {
          ...currentProfile,
          [field]: value
        }
      }
    })
  }

  const handleSpouseInfoChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      spouseInfo: {
        ...(prev.spouseInfo || {}),
        [field]: value,
      } as SpouseInfo
    }))
  }

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }))
  }

  const handleMaritalStatusChange = (value: MaritalStatus) => {
    handleInputChange("maritalStatus", value)
    if (value === MaritalStatus.MARRIED) {
      setAutoSaveMessage("Spouse will be automatically added as guarantor")
    }
  }

  const handlePreferredPaymentFrequencyChange = (frequency: string) => {
    setPreferredPaymentFrequency(frequency)
    handleInputChange("preferredPaymentFrequency", frequency)
  }

  const handleOccupationSupportingDocumentsChange = (documents: OccupationSupportingDocument[]) => {
    setOccupationSupportingDocuments(documents)
    const descriptions = documents
      .filter(doc => doc.description.trim() && doc.file)
      .map(doc => doc.description.trim())
    if (descriptions.length > 0) {
      handleInputChange("occupationSupportingDocDescriptions", JSON.stringify(descriptions))
    }
  }

  // Income source handlers
  const addIncomeSource = () => {
    setIncomeSourcesList(prev => [...prev, {
      source: "",
      frequency: IncomeFrequency.MONTHLY,
      amount: 0
    }])
  }

  const removeIncomeSource = (index: number) => {
    setIncomeSourcesList(prev => prev.filter((_, i) => i !== index))
  }

  const updateIncomeSource = (index: number, field: string, value: any) => {
    setIncomeSourcesList(prev => prev.map((source, i) =>
      i === index ? { ...source, [field]: value } : source
    ))
  }

  // Guarantor handlers
  const addGuarantor = () => {
    setGuarantors(prev => [...prev, {
      name: '',
      phone: '',
      address: '',
      nationalId: '',
      email: '',
      guarantorType: 'individual',
      guaranteedAmount: undefined,
    }])
  }

  const removeGuarantor = (index: number) => {
    const oldLength = guarantors.length;
    setGuarantors(prev => prev.filter((_, i) => i !== index))
    // Re-key per-guarantor docs so indices stay aligned with the trimmed list
    setGuarantorUploadedDocs(prev => {
      const next: Record<number, UploadedDocument[]> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = parseInt(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });
    setGuarantorStructuredDocs(prev => {
      const next: Record<number, GuarantorStructuredDocs> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = parseInt(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });
    // Re-key localStorage drafts so each guarantor's saved files stay with them.
    if (typeof window !== 'undefined') {
      const slots = ['identification', 'crbReport', 'docs', 'inst-docs'];
      // Both Individual (`guarantor-${i}-docs`) and Institution
      // (`guarantor-inst-${i}-docs`) key prefixes are handled below.
      for (let i = index + 1; i < oldLength; i++) {
        slots.forEach(slot => {
          const fromKey = slot === 'inst-docs'
            ? `loan-app-draft:guarantor-inst-${i}-docs`
            : `loan-app-draft:guarantor-${i}-${slot}`;
          const toKey = slot === 'inst-docs'
            ? `loan-app-draft:guarantor-inst-${i - 1}-docs`
            : `loan-app-draft:guarantor-${i - 1}-${slot}`;
          const val = localStorage.getItem(fromKey);
          if (val !== null) {
            localStorage.setItem(toKey, val);
          } else {
            localStorage.removeItem(toKey);
          }
        });
      }
      const lastIdx = oldLength - 1;
      slots.forEach(slot => {
        const orphanKey = slot === 'inst-docs'
          ? `loan-app-draft:guarantor-inst-${lastIdx}-docs`
          : `loan-app-draft:guarantor-${lastIdx}-${slot}`;
        localStorage.removeItem(orphanKey);
      });
    }
  }

  const updateGuarantor = (index: number, field: string, value: any) => {
    setGuarantors(prev =>
      prev.map((guarantor, i) =>
        i === index ? { ...guarantor, [field]: value } : guarantor
      )
    )
  }

  const addGuarantorDocument = (guarantorIndex: number, description: string, file: File) => {
    setGuarantors(prev =>
      prev.map((guarantor, i) => {
        if (i === guarantorIndex) {
          const documents = guarantor.documents || []
          return {
            ...guarantor,
            documents: [...documents, { description, file }]
          }
        }
        return guarantor
      })
    )
  }

  const removeGuarantorDocument = (guarantorIndex: number, documentIndex: number) => {
    setGuarantors(prev =>
      prev.map((guarantor, i) => {
        if (i === guarantorIndex) {
          const documents = guarantor.documents || []
          return {
            ...guarantor,
            documents: documents.filter((_, idx) => idx !== documentIndex)
          }
        }
        return guarantor
      })
    )
  }

  const updateGuarantorDocumentDescription = (guarantorIndex: number, documentIndex: number, description: string) => {
    setGuarantors(prev =>
      prev.map((guarantor, i) => {
        if (i === guarantorIndex) {
          const documents = guarantor.documents || []
          return {
            ...guarantor,
            documents: documents.map((doc, idx) =>
              idx === documentIndex ? { ...doc, description } : doc
            )
          }
        }
        return guarantor
      })
    )
  }
  const addAdditionalCollateralDocument = (description: string, file: File) => {
    setAdditionalCollateralDocuments(prev => [
      ...prev,
      { description, file }
    ])
  }

  const removeAdditionalCollateralDocument = (index: number) => {
    setAdditionalCollateralDocuments(prev => prev.filter((_, i) => i !== index))
  }

const getTotalUploadedDocsCount = useCallback(() => {
  const occupationCount = occupationDocuments.length;
  const loanCount = loanDocuments.length;
  const borrowerCount = borrowerDocuments.length;
  const collateralCount = collateralDocuments.length;
  const institutionCount = institutionDocuments.length;
  
  // Guarantor documents from FileUploadWithProgress
  const guarantorCloudCount = Object.values(guarantorUploadedDocs).reduce(
    (total, docs) => total + docs.length, 0
  );
  
  // Shareholder/board member documents from FileUploadWithProgress
  const memberCloudCount = Object.values(memberUploadedDocs).reduce(
    (total, docs) => total + docs.length, 0
  );
  
  return {
    occupationCloud: occupationCount,
    loanCloud: loanCount,
    borrowerCloud: borrowerCount,
    collateralCloud: collateralCount,
    institutionCloud: institutionCount,
    guarantorCloud: guarantorCloudCount,
    memberCloud: memberCloudCount,
    total: occupationCount + loanCount + borrowerCount + collateralCount + 
           institutionCount + guarantorCloudCount + memberCloudCount
  };
}, [occupationDocuments, loanDocuments, borrowerDocuments, collateralDocuments, 
    institutionDocuments, guarantorUploadedDocs, memberUploadedDocs]);

const getTotalDocumentCounts = useCallback(() => {
  const cloudDocs = getTotalUploadedDocsCount();

  const proofOfOwnershipCount = proofOfOwnershipUrls.length;
  const ownerIdentificationCount = ownerIdentificationUrls.length;
  const legalDocumentCount = legalDocumentUrls.length;
  const physicalEvidenceCount = physicalEvidenceUrls.length;
  const valuationReportCount = valuationReportUrls.length;
  const additionalCollateralCount = additionalCollateralDocUrls.length;
  const upiCount = upiDocumentUrl ? 1 : 0;

  // Per-guarantor structured doc counts (identification + CRB per guarantor)
  let guarantorIdentificationCount = 0;
  let guarantorCrbReportCount = 0;
  guarantors.forEach((_, i) => {
    const s = guarantorStructuredDocs[i] || {};
    if (s.identification?.url) guarantorIdentificationCount++;
    if (s.crbReport?.url) guarantorCrbReportCount++;
  });

  const institutionLegalCount = institutionLegalDocumentUrls.length +
                                cooperativeLegalDocumentUrls.length +
                                otherInstitutionLegalDocumentUrls.length;
  const institutionLicenseCount = institutionLicenseUrls.length +
                                  institutionTradingLicenseUrls.length +
                                  institutionRegistrationUrls.length;

  // Per-member structured doc counts (each member contributes its own slots)
  let shareholderCount = 0;
  let boardCount = 0;
  let rdbCount = 0;
  shareholderBoardMembers.forEach((m, i) => {
    const s = memberStructuredDocs[i] || {};
    if (m.type === 'shareholder') {
      if (s.identification?.url) shareholderCount++;
      if (s.crbReport?.url) shareholderCount++;
      if (s.proofOfShares?.url) shareholderCount++;
      if (s.shareholderResolution?.url) rdbCount++;
    } else {
      if (s.identification?.url) boardCount++;
      if (s.crbReport?.url) boardCount++;
      if (s.boardResolution?.url) boardCount++;
    }
    if (s.rdbFullInformation?.url) rdbCount++;
  });

  const spouseCount = marriageCertificateUrls.length +
                      spouseCrbReportUrls.length +
                      spouseIdentificationUrls.length;

  const collateralCategorized =
    proofOfOwnershipCount + ownerIdentificationCount + legalDocumentCount +
    physicalEvidenceCount + valuationReportCount + additionalCollateralCount;

  const institutionCategorized = institutionLegalCount + institutionLicenseCount;

  const shareholderBoardCategorized = shareholderCount + boardCount + rdbCount;

  const guarantorCategorized = guarantorIdentificationCount + guarantorCrbReportCount;

  return {
    ...cloudDocs,
    collateralCategorized,
    upiCount,
    guarantorCategorized,
    spouseCount,
    institutionCategorized,
    shareholderBoardCategorized,
    totalAll: cloudDocs.total + collateralCategorized + upiCount +
              guarantorCategorized + spouseCount + institutionCategorized +
              shareholderBoardCategorized,
  };
}, [
  getTotalUploadedDocsCount,
  proofOfOwnershipUrls, ownerIdentificationUrls, legalDocumentUrls,
  physicalEvidenceUrls, valuationReportUrls, additionalCollateralDocUrls,
  upiDocumentUrl,
  guarantors, guarantorStructuredDocs,
  institutionLegalDocumentUrls, cooperativeLegalDocumentUrls,
  otherInstitutionLegalDocumentUrls, institutionLicenseUrls,
  institutionTradingLicenseUrls, institutionRegistrationUrls,
  shareholderBoardMembers, memberStructuredDocs,
  marriageCertificateUrls, spouseCrbReportUrls, spouseIdentificationUrls,
]);

  const addShareholderBoardMember = (type: 'shareholder' | 'board_member' = 'shareholder') => {
    setShareholderBoardMembers(prev => [...prev, {
      type,
      firstName: '',
      lastName: '',
      nationalId: '',
      phone: '',
      email: '',
      position: type === 'board_member' ? '' : undefined,
      sharePercentage: type === 'shareholder' ? undefined : 0,
      additionalDocuments: [],
    }])
  }

  const removeShareholderBoardMember = (index: number) => {
    const oldLength = shareholderBoardMembers.length;
    setShareholderBoardMembers(prev => prev.filter((_, i) => i !== index))
    // Re-key per-member docs so indices stay aligned with the trimmed list
    setMemberUploadedDocs(prev => {
      const next: Record<number, UploadedDocument[]> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = parseInt(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });
    setMemberStructuredDocs(prev => {
      const next: Record<number, MemberStructuredDocs> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = parseInt(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });
    // Re-key localStorage drafts so each member's saved files stay with them.
    if (typeof window !== 'undefined') {
      const slots = ['identification', 'crbReport', 'proofOfShares', 'boardResolution', 'rdbFullInformation', 'shareholderResolution', 'docs'];
      // Shift down: for i in (index, oldLength), copy member-i-* → member-(i-1)-*
      for (let i = index + 1; i < oldLength; i++) {
        slots.forEach(slot => {
          const fromKey = `loan-app-draft:member-${i}-${slot}`;
          const toKey = `loan-app-draft:member-${i - 1}-${slot}`;
          const val = localStorage.getItem(fromKey);
          if (val !== null) {
            localStorage.setItem(toKey, val);
          } else {
            localStorage.removeItem(toKey);
          }
        });
      }
      // The previous highest index is now orphaned — clear it.
      const lastIdx = oldLength - 1;
      slots.forEach(slot => {
        localStorage.removeItem(`loan-app-draft:member-${lastIdx}-${slot}`);
      });
    }
  }

  const updateShareholderBoardMember = (index: number, field: string, value: any) => {
    setShareholderBoardMembers(prev =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    )
  }

  const addMemberDocument = (memberIndex: number, description: string, file: File) => {
    setShareholderBoardMembers(prev =>
      prev.map((member, i) => {
        if (i === memberIndex) {
          const additionalDocuments = member.additionalDocuments || []
          return {
            ...member,
            additionalDocuments: [...additionalDocuments, { description, file }]
          }
        }
        return member
      })
    )
  }

  const removeMemberDocument = (memberIndex: number, documentIndex: number) => {
    setShareholderBoardMembers(prev =>
      prev.map((member, i) => {
        if (i === memberIndex) {
          const additionalDocuments = member.additionalDocuments || []
          return {
            ...member,
            additionalDocuments: additionalDocuments.filter((_, idx) => idx !== documentIndex)
          }
        }
        return member
      })
    )
  }

  const updateMemberDocumentDescription = (memberIndex: number, documentIndex: number, description: string) => {
    setShareholderBoardMembers(prev =>
      prev.map((member, i) => {
        if (i === memberIndex) {
          const additionalDocuments = member.additionalDocuments || []
          return {
            ...member,
            additionalDocuments: additionalDocuments.map((doc, idx) =>
              idx === documentIndex ? { ...doc, description } : doc
            )
          }
        }
        return member
      })
    )
  }

  // Find the client (customer) account that belongs to a borrower. A borrower is
  // a REPEAT borrower (not merely returning) when they already hold a client
  // account — e.g. from a prior disbursed loan. The account's own `nationalId`
  // column can be null (it's linked to the borrower by `borrowerId`), so we match
  // by the authoritative profile-id link FIRST, then by identity on the account
  // row, its linked borrower, or any of its loans' borrowers. This is the single
  // rule used by BOTH the manual Search and invitation-draft recognition.
  const acctNorm = (s: any) => String(s || '').replace(/\s+/g, '').toLowerCase()
  const findClientAccountForBorrower = (opts: { profileId?: number | null; identifier?: string; isIndividual: boolean }) => {
    const { profileId, isIndividual } = opts
    const idN = acctNorm(opts.identifier)
    return clientAccounts.find((a: any) => {
      if (profileId != null && a?.borrowerId != null && a.borrowerId === profileId) return true
      if (idN && (isIndividual ? acctNorm(a?.nationalId) === idN : acctNorm(a?.tinNumber) === idN)) return true
      if (idN && (isIndividual
        ? acctNorm(a?.borrower?.nationalId) === idN
        : acctNorm(a?.borrower?.institutionProfile?.tinNumber) === idN)) return true
      const loans = a?.loansWithFullInfo || a?.loans || (a?.loan ? [a.loan] : [])
      return idN ? loans.some((l: any) => isIndividual
        ? acctNorm(l?.borrower?.nationalId) === idN
        : acctNorm(l?.borrower?.institutionProfile?.tinNumber) === idN) : false
    }) || null
  }

  // A client account row can be sparse (its `nationalId`/`borrowerNames` may be
  // null when it's linked to the borrower only by `borrowerId`). Enrich it from
  // the linked borrower / loan borrower / found profile so the REPEAT auto-fill
  // never blanks the borrower's identity when we matched by the id link.
  const enrichAccountForRepeat = (a: any, fallbackProfile?: any, identifier?: string) => {
    const lb = a?.loan?.borrower
      || (Array.isArray(a?.loansWithFullInfo) ? a.loansWithFullInfo[0]?.borrower : undefined)
      || a?.borrower || fallbackProfile || {}
    const names = a?.borrowerNames
      || [a?.borrower?.firstName, a?.borrower?.lastName].filter(Boolean).join(' ')
      || [lb?.firstName, lb?.lastName].filter(Boolean).join(' ')
      || [fallbackProfile?.firstName, fallbackProfile?.lastName].filter(Boolean).join(' ')
      || ''
    return {
      ...a,
      nationalId: a?.nationalId || a?.borrower?.nationalId || lb?.nationalId || fallbackProfile?.nationalId || identifier || '',
      borrowerNames: names,
      borrowerId: a?.borrowerId ?? fallbackProfile?.id ?? lb?.id ?? null,
      loan: a?.loan || { borrower: lb },
    }
  }

  // Borrower search handlers
  const searchAndAutoDetectBorrower = async () => {
    if (!searchBorrowerIdentifier.trim()) {
      toast.error('Please enter a National ID or TIN Number to search')
      return
    }

    setIsSearching(true)

    try {
      const isIndividual = formData.borrowerType === BorrowerType.INDIVIDUAL
      const borrowerProfilesResults = borrowerProfiles.find(profile => {
        if (isIndividual) {
          return profile.nationalId === searchBorrowerIdentifier
        } else {
          return profile.nationalId === searchBorrowerIdentifier ||
            profile.email?.includes(searchBorrowerIdentifier)
        }
      })
      // REPEAT wins over RETURNING: if the (found) borrower already holds a client
      // account, they are a repeat borrower — matched by the borrowerId link first
      // so a null account nationalId can't misclassify them as merely returning.
      const clientAccountsResults = findClientAccountForBorrower({
        profileId: borrowerProfilesResults?.id ?? null,
        identifier: searchBorrowerIdentifier,
        isIndividual,
      })

      let detectedRelationshipType: RelationshipType | null = null
      let detectedBorrowerData: any = null
      let detectedSource = ''

      if (clientAccountsResults) {
        detectedRelationshipType = RelationshipType.REPEAT_BORROWER
        detectedBorrowerData = enrichAccountForRepeat(clientAccountsResults, borrowerProfilesResults, searchBorrowerIdentifier)
        detectedSource = 'clientAccount'
        setClientAccountId(clientAccountsResults.id)
      } else if (borrowerProfilesResults) {
        detectedRelationshipType = RelationshipType.RETURNING_BORROWER
        detectedBorrowerData = borrowerProfilesResults
        detectedSource = 'borrowerProfile'
        setClientAccountId(null)
      }

      if (detectedRelationshipType && detectedBorrowerData) {
        toast.success(`Found ${detectedRelationshipType === RelationshipType.REPEAT_BORROWER ? 'repeat' : 'returning'} borrower`)
        // Canonical auto-fill path — shared with invitation-draft recognition.
        applyExistingBorrower(detectedBorrowerData, { relationshipType: detectedRelationshipType, source: detectedSource })
      } else {
        setSearchResults(null)
        setClientAccountId(null)
        setDisplayAccountInfo(null)
        setShouldDisplayAccountCard(false)
        toast.error('No existing borrower found with this identifier')
      }
    } catch (error) {
      toast.error('Error searching for borrower')
    } finally {
      setIsSearching(false)
    }
  }

  const populateFromExistingBorrower = (
    borrowerData: any,
    relationshipType?: RelationshipType,
    searchResultData?: any
  ) => {
    try {
      const currentRelationshipType = relationshipType || formData.relationshipWithNDFSP
      const borrowerType = formData.borrowerType
      const populatedFields: string[] = []

      const currentSearchResults = searchResultData || {
        data: borrowerData,
        type: currentRelationshipType,
        source: currentRelationshipType === RelationshipType.REPEAT_BORROWER
          ? 'clientAccount'
          : 'borrowerProfile'
      }

      if (currentRelationshipType === RelationshipType.REPEAT_BORROWER) {
        setDisplayAccountInfo({
          data: borrowerData,
          type: currentRelationshipType,
          source: currentRelationshipType === RelationshipType.REPEAT_BORROWER
            ? 'clientAccount'
            : 'borrowerProfile'
        })
        setShouldDisplayAccountCard(true)
      }

      if (currentRelationshipType === RelationshipType.REPEAT_BORROWER) {
        if (borrowerType === BorrowerType.INDIVIDUAL) {
          const nameParts = borrowerData.borrowerNames?.split(' ') || []
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''

          handleInputChange("firstName", firstName)
          handleInputChange("lastName", lastName)
          handleInputChange("nationalId", borrowerData.nationalId)

          if (borrowerData.borrowerId) {
            handleInputChange("sourceBorrowerId", borrowerData.borrowerId)
            setSourceBorrowerId(borrowerData.borrowerId)
          }

          if (borrowerData.id) {
            handleInputChange("clientAccountId", borrowerData.id)
            setClientAccountId(borrowerData.id)
          }

          const loanBorrower = borrowerData.loan?.borrower

          if (loanBorrower) {
            if (loanBorrower.dateOfBirth) {
              handleInputChange("dateOfBirth", loanBorrower.dateOfBirth)
              populatedFields.push('dateOfBirth')
            }
            if (loanBorrower.placeOfBirth) {
              handleInputChange("placeOfBirth", loanBorrower.placeOfBirth)
              populatedFields.push('placeOfBirth')
            }
            if (loanBorrower.gender) {
              handleInputChange("gender", loanBorrower.gender)
              populatedFields.push('gender')
            }
            if (loanBorrower.maritalStatus) {
              handleInputChange("maritalStatus", loanBorrower.maritalStatus)
              populatedFields.push('maritalStatus')
            }
            if (loanBorrower.email && !formData.email) {
              handleInputChange("email", loanBorrower.email)
              populatedFields.push('email')
            }
            if (loanBorrower.alternativePhone) {
              handleInputChange("alternativePhone", loanBorrower.alternativePhone)
              populatedFields.push('alternativePhone')
            }
            if (loanBorrower.primaryPhone) {
              handleInputChange("primaryPhone", loanBorrower.primaryPhone)
              populatedFields.push('primaryPhone')
            }
          }

          if (borrowerData.nationalIdDistrict) {
            handleInputChange("nationalIdDistrict", borrowerData.nationalIdDistrict)
            populatedFields.push('nationalIdDistrict')
          }
          if (borrowerData.nationalIdSector) {
            handleInputChange("nationalIdSector", borrowerData.nationalIdSector)
            populatedFields.push('nationalIdSector')
          }

          if (borrowerData.borrower?.nationalIdDistrict) {
            handleInputChange("nationalIdDistrict", borrowerData.borrower.nationalIdDistrict)
            if (!populatedFields.includes('nationalIdDistrict')) {
              populatedFields.push('nationalIdDistrict')
            }
          }
          if (borrowerData.borrower?.nationalIdSector) {
            handleInputChange("nationalIdSector", borrowerData.borrower.nationalIdSector)
            if (!populatedFields.includes('nationalIdSector')) {
              populatedFields.push('nationalIdSector')
            }
          }

          if (loanBorrower?.nationalIdDistrict) {
            handleInputChange("nationalIdDistrict", loanBorrower.nationalIdDistrict)
            if (!populatedFields.includes('nationalIdDistrict')) {
              populatedFields.push('nationalIdDistrict')
            }
          }
          if (loanBorrower?.nationalIdSector) {
            handleInputChange("nationalIdSector", loanBorrower.nationalIdSector)
            if (!populatedFields.includes('nationalIdSector')) {
              populatedFields.push('nationalIdSector')
            }
          }

          if (borrowerData.occupation) {
            handleInputChange("occupation", borrowerData.occupation)
            populatedFields.push('occupation')
          } else if (borrowerData.borrower?.occupation) {
            handleInputChange("occupation", borrowerData.borrower.occupation)
            populatedFields.push('occupation')
          } else if (borrowerData.profileInformation?.occupation) {
            handleInputChange("occupation", borrowerData.profileInformation.occupation)
            populatedFields.push('occupation')
          } else if (loanBorrower?.occupation) {
            handleInputChange("occupation", loanBorrower.occupation)
            populatedFields.push('occupation')
          }

          if (borrowerData.profileInformation?.spouseInfo) {
            const spouse = borrowerData.profileInformation.spouseInfo

            handleInputChange("maritalStatus", MaritalStatus.MARRIED)

            if (!formData.spouseInfo) {
              setFormData(prev => ({
                ...prev,
                spouseInfo: {
                  firstName: '',
                  lastName: '',
                  nationalId: '',
                  phone: '',
                  email: '',
                  occupation: ''
                }
              }))
            }

            if (spouse.firstName) handleSpouseInfoChange("firstName", spouse.firstName)
            if (spouse.lastName) handleSpouseInfoChange("lastName", spouse.lastName)
            if (spouse.nationalId) handleSpouseInfoChange("nationalId", spouse.nationalId)
            if (spouse.phone) handleSpouseInfoChange("phone", spouse.phone)
            if (spouse.email) handleSpouseInfoChange("email", spouse.email)
            if (spouse.occupation) handleSpouseInfoChange("occupation", spouse.occupation)

            populatedFields.push('spouseInfo.firstName', 'spouseInfo.lastName', 'spouseInfo.nationalId',
              'spouseInfo.phone', 'spouseInfo.email', 'spouseInfo.occupation')
          }

          const parentsInfo = borrowerData.borrower?.parentsInformation || loanBorrower?.parentsInformation
          if (parentsInfo) {
            if (parentsInfo.motherFullName) {
              handleInputChange("parentsInformation.motherFullName", parentsInfo.motherFullName)
              populatedFields.push('parentsInformation.motherFullName')
            }
            if (parentsInfo.motherDistrictOfBirth) {
              handleInputChange("parentsInformation.motherDistrictOfBirth", parentsInfo.motherDistrictOfBirth)
              populatedFields.push('parentsInformation.motherDistrictOfBirth')
            }
            if (parentsInfo.motherSectorOfBirth) {
              handleInputChange("parentsInformation.motherSectorOfBirth", parentsInfo.motherSectorOfBirth)
              populatedFields.push('parentsInformation.motherSectorOfBirth')
            }
            if (parentsInfo.fatherFullName) {
              handleInputChange("parentsInformation.fatherFullName", parentsInfo.fatherFullName)
              populatedFields.push('parentsInformation.fatherFullName')
            }
            if (parentsInfo.fatherDistrictOfBirth) {
              handleInputChange("parentsInformation.fatherDistrictOfBirth", parentsInfo.fatherDistrictOfBirth)
              populatedFields.push('parentsInformation.fatherDistrictOfBirth')
            }
            if (parentsInfo.fatherSectorOfBirth) {
              handleInputChange("parentsInformation.fatherSectorOfBirth", parentsInfo.fatherSectorOfBirth)
              populatedFields.push('parentsInformation.fatherSectorOfBirth')
            }
          }

          if (borrowerData.profileInformation) {
            const profile = borrowerData.profileInformation

            if (!populatedFields.includes('primaryPhone') && profile.phone) {
              handleInputChange("primaryPhone", profile.phone || '')
              populatedFields.push('primaryPhone')
            }

            if (!populatedFields.includes('email') && profile.email) {
              handleInputChange("email", profile.email || '')
              populatedFields.push('email')
            }

            if (!populatedFields.includes('gender') && profile.gender) {
              handleInputChange("gender", profile.gender || Gender.MALE)
              populatedFields.push('gender')
            }

            if (!populatedFields.includes('dateOfBirth') && profile.dateOfBirth) {
              handleInputChange("dateOfBirth", profile.dateOfBirth || '')
              populatedFields.push('dateOfBirth')
            }

            if (!populatedFields.includes('maritalStatus') && profile.maritalStatus) {
              handleInputChange("maritalStatus", profile.maritalStatus || MaritalStatus.SINGLE)
              populatedFields.push('maritalStatus')
            }

            if (!populatedFields.includes('placeOfBirth') && profile.placeOfBirth) {
              handleInputChange("placeOfBirth", profile.placeOfBirth || '')
              populatedFields.push('placeOfBirth')
            }

            const address = loanBorrower?.address || profile.address
            if (address) {
              handleAddressChange("province", address.province || '')
              handleAddressChange("district", address.district || '')
              handleAddressChange("sector", address.sector || '')
              handleAddressChange("cell", address.cell || '')
              handleAddressChange("village", address.village || '')
              populatedFields.push('address')
            }

            if (profile.incomeSources && Array.isArray(profile.incomeSources)) {
              const formattedSources = profile.incomeSources.map((source: any) => ({
                source: source.source,
                frequency: source.frequency,
                amount: source.amount,
                description: source.description || ''
              }))
              setIncomeSourcesList(formattedSources)
              populatedFields.push('incomeSources')
            }
          }

          if (borrowerData.loan) {
            if (borrowerData.loan.businessType) {
              handleInputChange("businessType", borrowerData.loan.businessType)
              populatedFields.push('businessType')
            }
            if (borrowerData.loan.businessStructure) {
              handleInputChange("businessStructure", borrowerData.loan.businessStructure)
              populatedFields.push('businessStructure')
            }
            if (borrowerData.loan.economicSector) {
              handleInputChange("economicSector", borrowerData.loan.economicSector)
              populatedFields.push('economicSector')
            }
          }

          if (borrowerData.alternativePhone && !populatedFields.includes('alternativePhone')) {
            handleInputChange("alternativePhone", borrowerData.alternativePhone)
            populatedFields.push('alternativePhone')
          }
        } else {
          handleInstitutionProfileChange("institutionName", borrowerData.institutionName || '')
          handleInstitutionProfileChange("tinNumber", borrowerData.tinNumber || '')
          handleInstitutionProfileChange("licenseNumber", borrowerData.licenseNumber || '')
          handleInstitutionProfileChange("registrationDate", borrowerData.registrationDate || '')

          if (borrowerData.licenseNumber) {
            handleInstitutionProfileChange("licenseNumber", borrowerData.licenseNumber)
          } else if (borrowerData.institutionInformation?.licenseNumber) {
            handleInstitutionProfileChange("licenseNumber", borrowerData.institutionInformation.licenseNumber)
          }

          if (borrowerData.registrationDate) {
            handleInstitutionProfileChange("registrationDate", borrowerData.registrationDate)
          } else if (borrowerData.institutionInformation?.registrationDate) {
            handleInstitutionProfileChange("registrationDate", borrowerData.institutionInformation.registrationDate)
          }

          if (borrowerData.institutionInformation) {
            const institutionInfo = borrowerData.institutionInformation
            handleInstitutionProfileChange("institutionType", institutionInfo.institutionType || InstitutionType.COMPANY)

            if (institutionInfo.address) {
              handleInstitutionProfileChange("address.street", institutionInfo.address.street || '')
            }

            if (institutionInfo.licenseNumber && !formData.institutionProfile?.licenseNumber) {
              handleInstitutionProfileChange("licenseNumber", institutionInfo.licenseNumber)
            }

            if (institutionInfo.registrationDate && !formData.institutionProfile?.registrationDate) {
              handleInstitutionProfileChange("registrationDate", institutionInfo.registrationDate)
            }

            if (institutionInfo.shareholderBoardMembers && Array.isArray(institutionInfo.shareholderBoardMembers)) {
              const formattedMembers = institutionInfo.shareholderBoardMembers.map((member: any) => ({
                type: member.type || 'shareholder',
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                middleName: member.middleName || '',
                nationalId: member.nationalId || '',
                phone: member.phone || '',
                email: member.email || '',
                position: member.position || '',
                sharePercentage: member.sharePercentage || 0,
                isAlsoGuarantor: member.isAlsoGuarantor || false,
                rdbFullInformation: member.rdbFullInformation || '',
                shareholderResolution: member.shareholderResolution || '',
                boardResolution: member.boardResolution || '',
                additionalDocuments: member.additionalDocuments || []
              }))
              setShareholderBoardMembers(formattedMembers)
            }
          }

          if (borrowerData.loan) {
            if (borrowerData.loan.businessType) {
              handleInputChange("businessType", borrowerData.loan.businessType)
            }
            if (borrowerData.loan.economicSector) {
              handleInputChange("economicSector", borrowerData.loan.economicSector)
            }
            if (borrowerData.loan.businessStructure) {
              handleInputChange("businessStructure", borrowerData.loan.businessStructure)
            }
            if (borrowerData.loan.institutionProfile?.shareholderBoardMembers && Array.isArray(borrowerData.loan.institutionProfile.shareholderBoardMembers)) {
              const formattedMembers = borrowerData.loan.institutionProfile.shareholderBoardMembers.map((member: any) => ({
                type: member.type || 'shareholder',
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                middleName: member.middleName || '',
                nationalId: member.nationalId || '',
                phone: member.phone || '',
                email: member.email || '',
                position: member.position || '',
                sharePercentage: member.sharePercentage || 0,
                isAlsoGuarantor: member.isAlsoGuarantor || false,
                rdbFullInformation: member.rdbFullInformation || '',
                shareholderResolution: member.shareholderResolution || '',
                boardResolution: member.boardResolution || '',
                additionalDocuments: member.additionalDocuments || []
              }))
              setShareholderBoardMembers(formattedMembers)
            }
          }

          if (borrowerData.profileRepresentative) {
            handleInstitutionProfileChange("contactPerson", borrowerData.profileRepresentative.name || '')
            handleInstitutionProfileChange("contactPhone", borrowerData.profileRepresentative.phone || '')
            handleInstitutionProfileChange("contactEmail", borrowerData.profileRepresentative.email || '')
          }

          populatedFields.push('institutionName', 'tinNumber', 'licenseNumber', 'registrationDate',
            'contactPerson', 'contactPhone', 'contactEmail', 'businessType', 'economicSector', 'businessStructure')
        }

        if (borrowerData.borrowerId) {
          setSourceBorrowerId(borrowerData.borrowerId)
        } else if (borrowerData.id) {
          setSourceBorrowerId(borrowerData.id)
        }
      } else if (currentRelationshipType === RelationshipType.RETURNING_BORROWER) {
        handleInputChange("firstName", borrowerData.firstName || '')
        handleInputChange("lastName", borrowerData.lastName || '')
        handleInputChange("middleName", borrowerData.middleName || '')
        handleInputChange("nationalId", borrowerData.nationalId || '')

        if (borrowerData.nationalIdDistrict) {
          handleInputChange("nationalIdDistrict", borrowerData.nationalIdDistrict)
        }
        if (borrowerData.nationalIdSector) {
          handleInputChange("nationalIdSector", borrowerData.nationalIdSector)
        }

        if (borrowerData.occupation) {
          handleInputChange("occupation", borrowerData.occupation)
        }

        handleInputChange("gender", borrowerData.gender || Gender.MALE)
        handleInputChange("dateOfBirth", borrowerData.dateOfBirth || '')
        handleInputChange("maritalStatus", borrowerData.maritalStatus || MaritalStatus.SINGLE)
        handleInputChange("placeOfBirth", borrowerData.placeOfBirth || '')
        handleInputChange("primaryPhone", borrowerData.primaryPhone || '')
        handleInputChange("email", borrowerData.email || '')
        handleInputChange("alternativePhone", borrowerData.alternativePhone || '')
        handleInputChange("relationshipWithNDFSP", RelationshipType.RETURNING_BORROWER)

        if (borrowerData.address) {
          const address = borrowerData.address
          handleAddressChange("province", address.province || '')
          handleAddressChange("district", address.district || '')
          handleAddressChange("sector", address.sector || '')
          handleAddressChange("cell", address.cell || '')
          handleAddressChange("village", address.village || '')
        }

        if (borrowerData.parentsInformation) {
          const parentsInfo = borrowerData.parentsInformation

          if (parentsInfo.motherFullName) {
            handleInputChange("parentsInformation.motherFullName", parentsInfo.motherFullName)
          }
          if (parentsInfo.motherDistrictOfBirth) {
            handleInputChange("parentsInformation.motherDistrictOfBirth", parentsInfo.motherDistrictOfBirth)
          }
          if (parentsInfo.motherSectorOfBirth) {
            handleInputChange("parentsInformation.motherSectorOfBirth", parentsInfo.motherSectorOfBirth)
          }
          if (parentsInfo.fatherFullName) {
            handleInputChange("parentsInformation.fatherFullName", parentsInfo.fatherFullName)
          }
          if (parentsInfo.fatherDistrictOfBirth) {
            handleInputChange("parentsInformation.fatherDistrictOfBirth", parentsInfo.fatherDistrictOfBirth)
          }
          if (parentsInfo.fatherSectorOfBirth) {
            handleInputChange("parentsInformation.fatherSectorOfBirth", parentsInfo.fatherSectorOfBirth)
          }

          populatedFields.push(
            'parentsInformation.motherFullName',
            'parentsInformation.motherDistrictOfBirth',
            'parentsInformation.motherSectorOfBirth',
            'parentsInformation.fatherFullName',
            'parentsInformation.fatherDistrictOfBirth',
            'parentsInformation.fatherSectorOfBirth'
          )
        }

        if (borrowerData.occupationSupportingDocuments && Array.isArray(borrowerData.occupationSupportingDocuments)) {
          const formattedDocs = borrowerData.occupationSupportingDocuments.map((doc: any, index: number) => ({
            id: `doc_${Date.now()}_${index}`,
            description: doc.description || '',
            fileName: doc.fileName || '',
            file: undefined
          }))
          setOccupationSupportingDocuments(formattedDocs)
        }

        if (borrowerData.loans && borrowerData.loans.length > 0) {
          const recentLoan = borrowerData.loans[0]

          if (recentLoan.businessType) {
            handleInputChange("businessType", recentLoan.businessType)
          }
          if (recentLoan.businessStructure) {
            handleInputChange("businessStructure", recentLoan.businessStructure)
          }
          if (recentLoan.economicSector) {
            handleInputChange("economicSector", recentLoan.economicSector)
          }
          if (recentLoan.purposeOfLoan) {
            handleInputChange("purposeOfLoan", recentLoan.purposeOfLoan)
          }
          // Don't override branch if auto-assigned from user login
          if (recentLoan.branchName && !autoAssignedBranch) {
            handleInputChange("branchName", recentLoan.branchName)
          }
          if (recentLoan.businessOfficer) {
            handleInputChange("businessOfficer", recentLoan.businessOfficer)
          }
          if (recentLoan.disbursedAmount) {
            handleInputChange("disbursedAmount", recentLoan.disbursedAmount)
          }
          if (recentLoan.preferredPaymentFrequency) {
            setPreferredPaymentFrequency(recentLoan.preferredPaymentFrequency)
            handleInputChange("preferredPaymentFrequency", recentLoan.preferredPaymentFrequency)
          }
          if (recentLoan.paymentPeriod) {
            setPaymentPeriod(recentLoan.paymentPeriod)
            handleInputChange("paymentPeriod", recentLoan.paymentPeriod)
          }
          if (recentLoan.customPaymentPeriod) {
            setCustomPaymentPeriod(recentLoan.customPaymentPeriod)
            handleInputChange("customPaymentPeriod", recentLoan.customPaymentPeriod)
          }

          if (recentLoan.incomeSources && Array.isArray(recentLoan.incomeSources)) {
            const formattedSources = recentLoan.incomeSources.map((source: any) => ({
              source: source.source || '',
              otherSource: source.description || '',
              frequency: source.frequency || IncomeFrequency.MONTHLY,
              amount: source.amount || 0
            }))
            setIncomeSourcesList(formattedSources)
          }

          if (recentLoan.collateralType) {
            handleInputChange("collateralType", recentLoan.collateralType)
          }
          if (recentLoan.collateralDescription) {
            handleInputChange("collateralDescription", recentLoan.collateralDescription)
          }
          if (recentLoan.upiNumber) {
            handleInputChange("upiNumber", recentLoan.upiNumber)
          }
          if (recentLoan.collateralValue) {
            handleInputChange("collateralValue", recentLoan.collateralValue)
          }
          if (recentLoan.valuedBy) {
            handleInputChange("valuedBy", recentLoan.valuedBy)
          }
          if (recentLoan.valuationDate) {
            handleInputChange("valuationDate", recentLoan.valuationDate)
          }

          if (recentLoan.notes) {
            handleInputChange("loanNotes", recentLoan.notes)
          }
          if (recentLoan.collateralNotes) {
            handleInputChange("collateralNotes", recentLoan.collateralNotes)
          }
          if (recentLoan.borrowerNotes) {
            handleInputChange("borrowerNotes", recentLoan.borrowerNotes)
          }

          if (recentLoan.spouseInfo) {
            const spouse = recentLoan.spouseInfo

            handleInputChange("maritalStatus", MaritalStatus.MARRIED)

            if (!formData.spouseInfo) {
              setFormData(prev => ({
                ...prev,
                spouseInfo: {
                  firstName: '',
                  lastName: '',
                  nationalId: '',
                  phone: '',
                  email: '',
                  occupation: ''
                }
              }))
            }

            if (spouse.firstName) handleSpouseInfoChange("firstName", spouse.firstName)
            if (spouse.lastName) handleSpouseInfoChange("lastName", spouse.lastName)
            if (spouse.nationalId) handleSpouseInfoChange("nationalId", spouse.nationalId)
            if (spouse.phone) handleSpouseInfoChange("phone", spouse.phone)
            if (spouse.email) handleSpouseInfoChange("email", spouse.email)
            if (spouse.occupation) handleSpouseInfoChange("occupation", spouse.occupation)

            populatedFields.push('spouseInfo.firstName', 'spouseInfo.lastName', 'spouseInfo.nationalId',
              'spouseInfo.phone', 'spouseInfo.email', 'spouseInfo.occupation')
          }

          if (borrowerData.borrowerType === BorrowerType.INSTITUTION && recentLoan.institutionProfile) {
            const institutionProfile = recentLoan.institutionProfile

            handleInstitutionProfileChange("institutionName", institutionProfile.institutionName || '')
            handleInstitutionProfileChange("institutionType", institutionProfile.institutionType || InstitutionType.COMPANY)
            handleInstitutionProfileChange("licenseNumber", institutionProfile.licenseNumber || '')
            handleInstitutionProfileChange("tinNumber", institutionProfile.tinNumber || '')
            handleInstitutionProfileChange("registrationDate", institutionProfile.registrationDate || '')
            handleInstitutionProfileChange("contactPerson", institutionProfile.contactPerson || '')
            handleInstitutionProfileChange("contactPhone", institutionProfile.contactPhone || '')
            handleInstitutionProfileChange("contactEmail", institutionProfile.contactEmail || '')

            if (institutionProfile.address?.street) {
              handleInstitutionProfileChange("address.street", institutionProfile.address.street)
            }

            if (institutionProfile.shareholderBoardMembers && Array.isArray(institutionProfile.shareholderBoardMembers)) {
              const formattedMembers = institutionProfile.shareholderBoardMembers.map((member: any, index: number) => ({
                type: member.type || 'shareholder',
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                middleName: member.middleName || '',
                nationalId: member.nationalId || '',
                phone: member.phone || '',
                email: member.email || '',
                position: member.position || '',
                sharePercentage: member.sharePercentage || 0,
                isAlsoGuarantor: member.isAlsoGuarantor || false,
                rdbFullInformation: member.rdbFullInformation || '',
                shareholderResolution: member.shareholderResolution || '',
                boardResolution: member.boardResolution || '',
                additionalDocuments: member.additionalDocuments || []
              }))
              setShareholderBoardMembers(formattedMembers)
            }
          }
        }

        populatedFields.push('firstName', 'lastName', 'middleName', 'nationalId',
          'nationalIdDistrict', 'nationalIdSector', 'occupation', 'gender', 'dateOfBirth',
          'maritalStatus', 'placeOfBirth', 'primaryPhone', 'email', 'alternativePhone',
          'address', 'businessType', 'businessStructure', 'economicSector', 'purposeOfLoan',
          'branchName', 'businessOfficer', 'disbursedAmount', 'collateralType', 'collateralDescription', 'upiNumber',
          'collateralValue', 'valuedBy', 'valuationDate')

        setSourceBorrowerId(borrowerData.id)
      }

      setIsAutoPopulated(true)
      setAutoPopulatedFields(populatedFields)
      setSearchResults(currentSearchResults)
      setSearchBorrowerIdentifier('')

      deferToast(() => toast.success('✅ Borrower information loaded successfully'))
    } catch (error) {
      deferToast(() => toast.error('Failed to auto-populate borrower information'))
    }
  }

  // Canonical "apply an existing borrower" path — the single source of truth for
  // recognizing + auto-filling an existing borrower. Used by BOTH the manual
  // "Search existing borrower" flow and invitation-draft recognition, so behaviour
  // is identical (relationship set, account card, sourceBorrowerId, isAutoPopulated
  // + field locks, all handled inside populateFromExistingBorrower).
  const applyExistingBorrower = (
    borrowerData: any,
    opts: { relationshipType: any; source: string }
  ) => {
    const { relationshipType, source } = opts
    const searchResultData = { data: borrowerData, type: relationshipType, source }
    if (relationshipType === RelationshipType.REPEAT_BORROWER) {
      setClientAccountId(borrowerData?.id ?? null)
      setDisplayAccountInfo({ data: borrowerData, type: relationshipType, source })
      setShouldDisplayAccountCard(true)
    } else {
      setClientAccountId(null)
      setDisplayAccountInfo(null)
      setShouldDisplayAccountCard(false)
    }
    handleInputChange("relationshipWithNDFSP", relationshipType)
    setSearchResults(searchResultData)
    populateFromExistingBorrower(borrowerData, relationshipType, searchResultData)
  }

  const clearAutoPopulatedData = () => {
    setIsAutoPopulated(false)
    setSourceBorrowerId(null)
    setClientAccountId(null)
    setAutoPopulatedFields([])
    setSearchResults(null)
    setShouldDisplayAccountCard(false)
    setDisplayAccountInfo(null)
    setSearchBorrowerIdentifier('')

    const resetFields = [
      'firstName', 'lastName', 'middleName', 'nationalId', 'gender',
      'dateOfBirth', 'primaryPhone', 'email', 'occupation'
    ]

    resetFields.forEach(field => {
      handleInputChange(field, '')
    })

    handleAddressChange("province", '')
    handleAddressChange("district", '')
    handleAddressChange("sector", '')
    handleAddressChange("cell", '')
    handleAddressChange("village", '')

    setIncomeSourcesList([])

    if (formData.borrowerType === BorrowerType.INSTITUTION) {
      handleInstitutionProfileChange("institutionName", '')
      handleInstitutionProfileChange("tinNumber", '')
      handleInstitutionProfileChange("contactPerson", '')
      handleInstitutionProfileChange("contactPhone", '')
      handleInstitutionProfileChange("contactEmail", '')
    }

    deferToast(() => toast.error('Auto-populated data cleared'))
  }


  const validateCurrentStep = useCallback((): boolean => {
    const errors = getStepErrors(currentStep);
    setValidationErrors(errors);
    const hasErrors = Object.keys(errors).length > 0;

    if (hasErrors) {
      setShowRequirementsPanel(true);
    } else {
      setShowRequirementsPanel(false);
    }

    return !hasErrors;
  }, [currentStep, getStepErrors]);

  const requirementGroups = useMemo(() => {
    return Object.entries(validationErrors).map(([field, message]) => {
      let title = "Personal Information";
      if (field.startsWith("institutionProfile")) title = "Institution Information";
      else if (field.startsWith("address")) title = "Address";
      else if (field.startsWith("spouseInfo")) title = "Spouse Information";
      else if (field === "incomeSources" || field.startsWith("incomeSource") || field.startsWith("incomeAmount"))
        title = "Income Sources";
      else if (field === "occupationSupportingDocuments") title = "Occupation Documents";
      else if (field.startsWith("guarantor") || field === "guarantors") title = "Guarantors";
      else if (field.startsWith("shareholderBoardMember") || field === "shareholderBoardMembers")
        title = "Shareholders / Board Members";
      else if (["purposeOfLoan", "branchName", "businessOfficer", "disbursedAmount",
        "preferredPaymentFrequency", "paymentPeriod", "customPaymentPeriod"].includes(field))
        title = "Loan Details";
      else if (["upiNumber", "upiFile", "collateralDescription"].includes(field))
        title = "Collateral";

      return {
        title,
        icon: (() => {
          if (title === "Address") return MapPin;
          if (title === "Loan Details") return DollarSign;
          if (title === "Collateral") return Shield;
          if (title === "Guarantors" || title === "Shareholders / Board Members") return UsersIcon;
          if (title === "Spouse Information") return Heart;
          return User;
        })(),
        items: [{ field, message, required: true }],
      };
    });
  }, [validationErrors]);


  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const scrollToField = (field: string) => {
    const element = document.querySelector(`[name="${field}"], [data-field="${field}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (element as HTMLElement).focus()
    }
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    dispatch(clearError());

    try {
      const relationshipType = formData.relationshipWithNDFSP || RelationshipType.NEW_BORROWER;

      const formattedIncomeSources = incomeSourcesList.map(source => {
        const finalSource = source.source === "other" && source.otherSource
          ? source.otherSource
          : source.source;

        return {
          source: finalSource,
          frequency: source.frequency,
          amount: Number(source.amount) || 0,
          description: source.otherSource || ''
        };
      });

      // Aggregate per-row pre-uploaded URLs into flat arrays + descriptions
      const guarantorUploadedDocUrls: UploadedDocument[] = [];
      const guarantorDocumentDescriptions: string[] = [];

      Object.values(guarantorUploadedDocs).forEach(docs => {
        docs.forEach(doc => {
          guarantorUploadedDocUrls.push(doc);
          guarantorDocumentDescriptions.push(doc.description || doc.fileName);
        });
      });

      const shareholderUploadedDocUrls: UploadedDocument[] = [];
      const boardMemberUploadedDocUrls: UploadedDocument[] = [];
      const shareholderAdditionalDocDescriptions: string[] = [];
      const boardMemberAdditionalDocDescriptions: string[] = [];

      Object.entries(memberUploadedDocs).forEach(([index, docs]) => {
        const member = shareholderBoardMembers[parseInt(index)];
        if (member) {
          docs.forEach(doc => {
            if (member.type === 'shareholder') {
              shareholderUploadedDocUrls.push(doc);
              shareholderAdditionalDocDescriptions.push(
                `${member.firstName} ${member.lastName}: ${doc.description || doc.fileName}`
              );
            } else {
              boardMemberUploadedDocUrls.push(doc);
              boardMemberAdditionalDocDescriptions.push(
                `${member.firstName} ${member.lastName}: ${doc.description || doc.fileName}`
              );
            }
          });
        }
      });

      const submitData: LoanApplicationRequest = {
        ...formData,
        relationshipWithNDFSP: relationshipType,
        ...(relationshipType === RelationshipType.RETURNING_BORROWER && sourceBorrowerId && {
          sourceBorrowerId: sourceBorrowerId || undefined
        }),
        ...(relationshipType === RelationshipType.REPEAT_BORROWER && {
          sourceBorrowerId: sourceBorrowerId || undefined,
          clientAccountId: clientAccountId || undefined
        }),
        ...(relationshipType === RelationshipType.NEW_BORROWER && {
          sourceBorrowerId: undefined,
          clientAccountId: undefined
        }),
        incomeSources: formattedIncomeSources,
        preferredPaymentFrequency: preferredPaymentFrequency as RepaymentFrequency,
        paymentPeriod: paymentPeriod || undefined,
        customPaymentPeriod: paymentPeriod === PaymentPeriod.CUSTOM ? customPaymentPeriod : undefined,
        guarantorDocumentDescriptions: guarantorDocumentDescriptions.length > 0
          ? guarantorDocumentDescriptions
          : undefined,
        shareholderAdditionalDocDescriptions: shareholderAdditionalDocDescriptions.length > 0
          ? shareholderAdditionalDocDescriptions
          : undefined,
        boardMemberAdditionalDocDescriptions: boardMemberAdditionalDocDescriptions.length > 0
          ? boardMemberAdditionalDocDescriptions
          : undefined,

        // ===== PRE-UPLOADED CLOUDINARY URLS (only path) =====
        occupationSupportingDocumentUrls: occupationDocuments,
        loanRelevantDocumentUrls: loanDocuments,
        borrowerDocumentUrls: borrowerDocuments,
        collateralDocumentUrls: collateralDocuments,
        institutionDocumentUrls: institutionDocuments,

        guarantorDocumentUrls: guarantorUploadedDocUrls,
        shareholderDocumentUrls: shareholderUploadedDocUrls,
        boardMemberDocumentUrls: boardMemberUploadedDocUrls,

        // Categorized pre-uploads
        proofOfOwnershipUrls,
        ownerIdentificationUrls,
        legalDocumentUrls,
        physicalEvidenceUrls,
        valuationReportUrls,
        additionalCollateralDocUrls,
        upiDocumentUrl: upiDocumentUrl ?? undefined,

        // NOTE: per-guarantor identification + CRB URLs are no longer sent
        // as global flat arrays — they're embedded on each guarantor below
        // (guarantors[i].documents) so each upload is unambiguously owned by
        // that guarantor. Backend service still parses these arrays as a
        // backward-compat fallback only when a guarantor object lacks them.

        // Spouse / witness — gated on marital status / context
        ...(formData.maritalStatus === MaritalStatus.MARRIED && {
          marriageCertificateUrls,
          spouseCrbReportUrls,
          spouseIdentificationUrls,
        }),
        witnessCrbReportUrls,
        witnessIdentificationUrls,

        ...(formData.borrowerType === BorrowerType.INSTITUTION && {
          institutionLegalDocumentUrls,
          cooperativeLegalDocumentUrls,
          otherInstitutionLegalDocumentUrls,
          institutionLicenseUrls,
          institutionTradingLicenseUrls,
          institutionRegistrationUrls,

          // NOTE: per-member URLs (identification / CRB / proof-of-shares /
          // board-resolution / RDB info / shareholder-resolution) are no
          // longer sent as global flat arrays — they're embedded on each
          // member below so a doc is unambiguously tied to its owner. The
          // backend service still parses these arrays as a backward-compat
          // fallback only when a member object lacks the corresponding url.

          shareholderBoardMembers: shareholderBoardMembers.map((member, idx) => {
            const struct = memberStructuredDocs[idx] || {};
            const documents: any = {};
            if (struct.identification?.url) documents.identificationUrl = struct.identification.url;
            if (struct.crbReport?.url) documents.crbReportUrl = struct.crbReport.url;
            if (member.type === 'shareholder' && struct.proofOfShares?.url) {
              documents.proofOfSharesUrl = struct.proofOfShares.url;
            }
            if (member.type === 'board_member' && struct.boardResolution?.url) {
              documents.boardResolutionUrl = struct.boardResolution.url;
            }

            const additionalDocs = (memberUploadedDocs[idx] || []).map(doc => ({
              description: doc.description || doc.fileName,
              fileUrl: doc.url,
              uploadedAt: doc.uploadedAt,
            }));

            return {
              type: member.type,
              firstName: member.firstName,
              lastName: member.lastName,
              middleName: member.middleName,
              nationalId: member.nationalId,
              phone: member.phone,
              email: member.email,
              position: member.position,
              sharePercentage: member.sharePercentage,
              isAlsoGuarantor: member.isAlsoGuarantor,
              documents: Object.keys(documents).length ? documents : undefined,
              rdbFullInformation: struct.rdbFullInformation?.url,
              shareholderResolution:
                member.type === 'shareholder' ? struct.shareholderResolution?.url : undefined,
              boardResolution:
                member.type === 'board_member' ? struct.boardResolution?.url : undefined,
              additionalDocuments: additionalDocs.length ? additionalDocs : undefined,
            };
          }),
        }),
        ...(guarantors.length > 0 && {
          guarantors: guarantors.map((guarantor, idx) => {
            const struct = guarantorStructuredDocs[idx] || {};
            const documents: any = {};
            if (struct.identification?.url) documents.identificationUrl = struct.identification.url;
            if (struct.crbReport?.url) documents.crbReportUrl = struct.crbReport.url;

            const additionalDocs = (guarantorUploadedDocs[idx] || []).map(doc => ({
              description: doc.description || doc.fileName,
              fileUrl: doc.url,
              uploadedAt: doc.uploadedAt,
            }));

            return {
              name: guarantor.name,
              phone: guarantor.phone,
              address: guarantor.address,
              nationalId: guarantor.nationalId,
              email: guarantor.email,
              guarantorType: guarantor.guarantorType,
              guaranteedAmount: guarantor.guaranteedAmount,
              documents: Object.keys(documents).length ? documents : undefined,
              additionalDocuments: additionalDocs.length ? additionalDocs : undefined,
            };
          })
        }),
        collateralLocation: formData.collateralLocation,
        collateralOwnerInfo: formData.collateralOwnerInfo,
        collateralOwners: formData.collateralOwners,
        realCollateralCategory: formData.realCollateralCategory,
        marketValue: formData.marketValue,
        insuranceValue: formData.insuranceValue,
        forcedSaleValue: formData.forcedSaleValue,
      };

      // ── Draft-vs-Loan separation (defensive) ──────────────────────────
      // The draft's UUID id and any cached loan-id-like fields must never
      // travel into the create-loan POST body. The backend generates a
      // brand-new loan id; the draft is a separate row in a separate table.
      const _sanitized: any = { ...submitData };
      for (const _k of ["id", "loanId", "loanID", "loan_id", "applicationId", "draftId"]) {
        if (_k in _sanitized) delete _sanitized[_k];
      }

      const createdLoan: any = await dispatch(createLoanApplication(_sanitized)).unwrap();

      const createdLoanIdLabel =
        createdLoan?.data?.loanId ||
        createdLoan?.data?.id ||
        createdLoan?.loanId ||
        "new loan";
      toast.success(
        draftId
          ? `Draft ${String(draftId).slice(0, 8)} submitted successfully as Loan ${createdLoanIdLabel}`
          : `Loan application submitted for review! (Loan ${createdLoanIdLabel})`
      );

      // Clean up the cross-session draft entry — the form has been promoted
      // to a real loan application, so it no longer belongs on the Drafts page.
      // Note: the draft and the loan have entirely separate IDs and live in
      // different tables. Deleting the draft never touches the new loan.
      try { if (draftId) await deleteDraft(draftId); } catch { /* ignore */ }

      resetAllState();
    } catch (error: any) {
      toast.error(error.message || "Failed to create loan application");
    } finally {
      setIsSubmitting(false);
    }
  };

const resetAllState = () => {
  // Clear all localStorage keys used by FileUploadWithProgress components
  const storageKeysToClear = [
    "loan-application-draft",
    "loan-guarantor-docs",
    "loan-member-docs",
    "loan-income-sources",
    "loan-occupation-docs",
    "loan-loan-docs",
    "loan-borrower-docs",
    "loan-collateral-docs",
    "loan-institution-docs",
    // Individual guarantor storage keys (dynamic)
    // We'll clear all keys matching the pattern
  ];

  // Clear all specific keys
  storageKeysToClear.forEach(key => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  });

  // Clear all dynamic guarantor storage keys (loan-guarantor-docs-0, loan-guarantor-docs-1, etc.)
  if (typeof window !== "undefined") {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("loan-guarantor-docs-") || 
          key.startsWith("loan-member-docs-") ||
          key.startsWith("loan-")) {
        localStorage.removeItem(key);
      }
    });
  }

  // Reset all form data
  setFormData({
    firstName: "",
    lastName: "",
    middleName: "",
    nationalId: "",
    gender: Gender.MALE,
    dateOfBirth: "",
    maritalStatus: MaritalStatus.SINGLE,
    placeOfBirth: "",
    primaryPhone: "",
    alternativePhone: "",
    occupationSupportingDocDescriptions: [],
    occupationSupportingDocuments: [],
    email: "",
    address: {
      country: "Rwanda",
      village: "",
      cell: "",
      sector: "",
      district: "",
      province: "",
    },
    occupation: "",
    monthlyIncome: undefined,
    incomeSource: "",
    relationshipWithNDFSP: RelationshipType.NEW_BORROWER,
    previousLoansPaidOnTime: 0, // new borrower ⇒ zero prior loans (see relationship watcher)
    borrowerNotes: "",
    purposeOfLoan: "",
    branchName: "",
    businessOfficer: "",
    disbursedAmount: 0,
    businessType: null,
    businessStructure: null,
    economicSector: null,
    loanNotes: "",
    borrowerType: BorrowerType.INDIVIDUAL,
    institutionProfile: undefined,
    spouseInfo: undefined,
    incomeSources: [],
    selectedIncomeSource: "",
    otherIncomeSource: "",
    incomeFrequency: undefined,
    incomeAmount: undefined,
    upiNumber: "",
    collateralType: CollateralType.IMMOVABLE,
    collateralDescription: "",
    collateralValue: undefined,
    guarantorName: "",
    guarantorPhone: "",
    guarantorAddress: "",
    valuationDate: "",
    valuedBy: "",
    collateralNotes: "",
    nationalIdDistrict: "",
    nationalIdSector: "",
    parentsInformation: {
      motherFullName: "",
      motherDistrictOfBirth: "",
      motherSectorOfBirth: "",
      fatherFullName: "",
      fatherDistrictOfBirth: "",
      fatherSectorOfBirth: "",
    },
    paymentFrequency: undefined,
    preferredPaymentFrequency: undefined,
    paymentPeriod: undefined,
    customPaymentPeriod: "",
    sourceBorrowerId: undefined,
  });

  // Reset occupation documents
  setOccupationSupportingDocuments([
    { id: '1', description: '', file: undefined, fileName: '' }
  ]);
  
  setPreferredPaymentFrequency('');
  
  // Reset guarantors
  setGuarantors([{
    name: '',
    phone: '',
    address: '',
    nationalId: '',
    email: '',
    guarantorType: 'individual',
    guaranteedAmount: undefined,
  }]);
  
  setIncomeSourcesList([]);
  setShareholderBoardMembers([]);
  setAdditionalCollateralDocuments([]);
  setPaymentPeriod('');
  setCustomPaymentPeriod('');
  setLoanRelevantDocuments([]);
  setLoanRelevantDocumentDescriptions([]);
  setInstitutionRelevantDocuments([
    { id: '1', description: '', file: undefined, fileName: '' }
  ]);
  setInstitutionRelevantDocumentDescriptions([]);
  setBorrowerDocumentDescriptions([]);

  // Reset all FileUploadWithProgress component states
  setOccupationDocuments([]);
  setLoanDocuments([]);
  setBorrowerDocuments([]);
  setGuarantorDocuments([]);
  setCollateralDocuments([]);
  setInstitutionDocuments([]);
  setShareholderDocuments([]);
  setBoardMemberDocuments([]);
  setGuarantorUploadedDocs({});
  setMemberUploadedDocs({});

  // Reset categorized pre-uploaded Cloudinary URL slots
  setProofOfOwnershipUrls([]);
  setOwnerIdentificationUrls([]);
  setLegalDocumentUrls([]);
  setPhysicalEvidenceUrls([]);
  setValuationReportUrls([]);
  setAdditionalCollateralDocUrls([]);
  setUpiDocumentUrl(null);

  setGuarantorStructuredDocs({});

  setInstitutionLegalDocumentUrls([]);
  setCooperativeLegalDocumentUrls([]);
  setOtherInstitutionLegalDocumentUrls([]);
  setInstitutionLicenseUrls([]);
  setInstitutionTradingLicenseUrls([]);
  setInstitutionRegistrationUrls([]);

  setMemberStructuredDocs({});

  setMarriageCertificateUrls([]);
  setSpouseCrbReportUrls([]);
  setSpouseIdentificationUrls([]);
  setWitnessCrbReportUrls([]);
  setWitnessIdentificationUrls([]);

  // Reset UI state
  setCurrentStep(1);
  setValidationErrors({});
  setLastSaved(null);
  setHasUnsavedChanges(false);
  setSearchBorrowerIdentifier('');
  setSearchResults(null);
  setIsAutoPopulated(false);
  setSourceBorrowerId(null);
  setClientAccountId(null);
  setAutoPopulatedFields([]);
  setShouldDisplayAccountCard(false);
  setDisplayAccountInfo(null);

  // Clear all localStorage keys (redundant but thorough)
  if (typeof window !== "undefined") {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("loan-") || key === "loan-application-draft")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  toast.success("All form data has been reset!");
};

  const TabNavigation = () => {
    const isInstitution = formData.borrowerType === BorrowerType.INSTITUTION

    const institutionTabs = [
      { id: 1, shortName: "Borrower", icon: User },
      { id: 2, shortName: "Address", icon: MapPin },
      { id: 3, shortName: "Loan", icon: DollarSign },
      { id: 4, shortName: "Collateral", icon: Shield },
      { id: 5, shortName: "Members", icon: Users },
      { id: 6, shortName: "Guarantor", icon: UsersIcon },
      { id: 7, shortName: "Review", icon: ClipboardList },
    ]

    const individualTabs = [
      { id: 1, shortName: "Borrower", icon: User },
      { id: 2, shortName: "Address", icon: MapPin },
      { id: 3, shortName: "Loan", icon: DollarSign },
      { id: 4, shortName: "Collateral", icon: Shield },
      { id: 5, shortName: "Guarantor", icon: UsersIcon },
      { id: 6, shortName: "Review", icon: ClipboardList },
    ]

    const tabs = isInstitution ? institutionTabs : individualTabs
    const totalTabs = tabs.length

    const handleTabClick = (step: number) => {
      const state = getTabState(step)
      // Allow navigation to anything except locked
      if (state !== 'locked') {
        setCurrentStep(step)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    const getTabStyle = (step: number): string => {
      const state = getTabState(step)
      switch (state) {
        case 'in-progress':
          return 'bg-[#5B7FA2] text-white shadow-sm cursor-default'
        case 'completed':
          return 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer'
        case 'failed':
          return 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer'
        case 'accessible':
          return 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-[#5B7FA2]/10 hover:border-[#5B7FA2]/40 hover:text-[#5B7FA2] cursor-pointer'
        case 'locked':
        default:
          return 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed opacity-60'
      }
    }

    const getStatusBadge = (step: number) => {
      const state = getTabState(step)
      switch (state) {
        case 'locked':
          return <Lock className="w-3 h-3 flex-shrink-0 opacity-50" />
        case 'in-progress':
          return <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
        case 'completed':
          return <CheckCircle className="w-3 h-3 flex-shrink-0 text-green-500" />
        case 'failed':
          return (
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold leading-none">
              !
            </span>
          )
        case 'accessible':
          return null // no badge — clean, inviting
        default:
          return null
      }
    }

    const getTooltip = (step: number): string => {
      const state = getTabState(step)
      switch (state) {
        case 'locked': {
          // Find which specific previous step is blocking
          for (let i = 1; i < step; i++) {
            if (!isStepComplete(i)) {
              return `Complete step ${i} first`
            }
          }
          return 'Complete previous steps first'
        }
        case 'failed':
          return 'This step has missing required fields — click to fix'
        case 'completed':
          return 'Completed — click to review or edit'
        case 'accessible':
          return 'All previous steps complete — click to jump here'
        case 'in-progress':
          return 'Current step'
        default:
          return ''
      }
    }

    return (
      <div className="flex items-center gap-2">
        {/* Scrollable tab strip */}
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const state = getTabState(tab.id)
              const isClickable = state !== 'locked' && state !== 'in-progress'
              const tooltip = getTooltip(tab.id)

              return (
                <div key={tab.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    disabled={state === 'locked'}
                    className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    text-xs font-medium transition-all duration-150 whitespace-nowrap
                    select-none
                    ${getTabStyle(tab.id)}
                  `}
                    aria-current={state === 'in-progress' ? 'step' : undefined}
                    aria-disabled={state === 'locked'}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden sm:inline">{tab.shortName}</span>
                    {getStatusBadge(tab.id)}
                  </button>

                  {/* Tooltip */}
                  {tooltip && state !== 'in-progress' && (
                    <div className={`
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                    px-2 py-1 rounded text-[10px] whitespace-nowrap
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                    ${state === 'locked'
                        ? 'bg-gray-800 text-white'
                        : state === 'failed'
                          ? 'bg-red-700 text-white'
                          : state === 'completed'
                            ? 'bg-green-700 text-white'
                            : 'bg-[#5B7FA2] text-white'
                      }
                  `}>
                      {tooltip}
                      <div className={`
                      absolute top-full left-1/2 -translate-x-1/2
                      border-4 border-transparent
                      ${state === 'locked' ? 'border-t-gray-800'
                          : state === 'failed' ? 'border-t-red-700'
                            : state === 'completed' ? 'border-t-green-700'
                              : 'border-t-[#5B7FA2]'}
                    `} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step counter */}
        <div className="flex-shrink-0 bg-gray-100 rounded-lg px-2.5 py-1">
          <span className="text-[11px] font-semibold text-gray-600">
            <span className="text-[#5B7FA2]">{currentStep}</span>/{totalTabs}
          </span>
        </div>
      </div>
    )
  }

  const AutoSaveNotification = ({ show, message }: { show: boolean; message: string }) => {
    if (!show) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-20 right-4 bg-green-50 border border-green-200 rounded-lg p-3 shadow-lg z-50 max-w-sm"
      >
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800">{message}</span>
        </div>
      </motion.div>
    )
  }

  const AccountNumberDisplayCard: React.FC<{
    searchResults: any
    isAutoPopulated: boolean
  }> = ({ searchResults, isAutoPopulated }) => {
    if (!searchResults || !searchResults.data) return null

    const accountNumber = searchResults.data?.accountNumber
    const borrowerType = searchResults.data?.borrowerType
    const relationshipType = searchResults.type

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-2 bg-gradient-to-r from-blue-50 to-green-50 border border-green-200 rounded-lg p-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {relationshipType === RelationshipType.REPEAT_BORROWER && accountNumber && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Client Account Number</p>
                <p className="text-lg font-mono font-bold text-green-700">{accountNumber}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Repeat borrower - using existing client account
                </p>
              </div>
            )}

            {borrowerType === 'institution' && searchResults.data?.tinNumber && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="text-xs text-gray-500 mb-1">TIN Number</p>
                <p className="text-sm font-mono font-medium">{searchResults.data.tinNumber}</p>
              </div>
            )}
          </div>

          {isAutoPopulated && (
            <div className="bg-green-100 rounded-full p-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          )}
        </div>
      </motion.div>
    )
  }


  const StepHeader = ({ icon: Icon, title, color = "blue" }: {
    icon: React.ElementType;
    title: string;
    color?: string
  }) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600",
      purple: "bg-purple-50 text-purple-600",
      orange: "bg-orange-50 text-orange-600",
      teal: "bg-teal-50 text-teal-600",
      indigo: "bg-indigo-50 text-indigo-600",
    }
    return (
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-400">Step {currentStep} of {totalSteps}</p>
        </div>
      </div>
    )
  }
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <StepHeader icon={User} title="Borrower Information" color="blue" />
            {/* Section 1: Borrower Type */}
            <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-5">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="flex-1 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Borrower Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.borrowerType}
                    onChange={(e) => handleInputChange("borrowerType", e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value={BorrowerType.INDIVIDUAL}>Individual Borrower</option>
                    <option value={BorrowerType.INSTITUTION}>Institution Borrower</option>
                  </select>
                </div>

                <div className="flex-1 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Check If Borrower Exists <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formData.borrowerType === BorrowerType.INDIVIDUAL
                        ? '(16-digit National ID)'
                        : '(TIN Number)'}
                    </span>
                  </label>

                  {/* Yes/No gate — default No. Toggling it drives the relationship
                      and enables/disables the identifier search below. */}
                  <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer mb-1">
                    <input
                      type="checkbox"
                      checked={borrowerExists}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setBorrowerExists(checked)
                        if (checked) {
                          // Existing borrower — assume Repeat; the search can refine
                          // it to Returning and auto-populate the profile.
                          handleInputChange("relationshipWithNDFSP", RelationshipType.REPEAT_BORROWER)
                        } else {
                          // No — reset to a clean New Borrower flow.
                          setSearchBorrowerIdentifier("")
                          setSearchResults(null)
                          if (isAutoPopulated) clearAutoPopulatedData()
                          handleInputChange("relationshipWithNDFSP", RelationshipType.NEW_BORROWER)
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Borrower already exists?{" "}
                      <span className={`font-semibold ${borrowerExists ? "text-green-600" : "text-gray-500"}`}>
                        {borrowerExists ? "Yes" : "No"}
                      </span>
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchBorrowerIdentifier}
                      onChange={(e) => setSearchBorrowerIdentifier(e.target.value)}
                      className={`w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!borrowerExists ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                      placeholder={
                        formData.borrowerType === BorrowerType.INDIVIDUAL
                          ? 'Enter 16-digit National ID'
                          : 'Enter TIN Number'
                      }
                      maxLength={formData.borrowerType === BorrowerType.INDIVIDUAL ? 16 : 20}
                      disabled={!borrowerExists || isSearching || isAutoPopulated}
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <button
                        type="button"
                        onClick={searchAndAutoDetectBorrower}
                        disabled={!borrowerExists || isSearching || !searchBorrowerIdentifier.trim() || isAutoPopulated}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${!borrowerExists || isSearching || !searchBorrowerIdentifier.trim() || isAutoPopulated
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                          }`}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          'Search'
                        )}
                      </button>
                    </div>
                  </div>
                  {!borrowerExists && (
                    <p className="text-xs text-gray-400 flex items-start">
                      <Info className="w-3 h-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Tick "Borrower already exists?" to search an existing borrower. Otherwise this is a New Borrower.</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Relationship Type */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="flex-1 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Relationship Type <span className="text-red-500">*</span>
                    {searchResults && (
                      <span className="text-xs text-green-600 ml-2 bg-green-50 px-2 py-0.5 rounded-full">
                        Auto-detected
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.relationshipWithNDFSP}
                    onChange={(e) => {
                      const value = e.target.value as RelationshipType
                      handleInputChange("relationshipWithNDFSP", value)
                      if (value !== RelationshipType.REPEAT_BORROWER &&
                        value !== RelationshipType.RETURNING_BORROWER) {
                        setSearchResults(null)
                        setSearchBorrowerIdentifier('')
                        if (isAutoPopulated) {
                          clearAutoPopulatedData()
                        }
                        setBorrowerExists(false) // keep the exists checkbox in sync
                      } else {
                        setBorrowerExists(true)
                      }
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value={RelationshipType.NEW_BORROWER}>New Borrower</option>
                    <option value={RelationshipType.REPEAT_BORROWER}>
                      Repeat Borrower
                    </option>
                    <option value={RelationshipType.RETURNING_BORROWER}>
                      Returning Borrower
                    </option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1 flex items-start">
                    <Info className="w-3 h-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                    <span>
                      {formData.relationshipWithNDFSP === RelationshipType.REPEAT_BORROWER &&
                        'You have an existing client account with active loan history'}
                      {formData.relationshipWithNDFSP === RelationshipType.RETURNING_BORROWER &&
                        'You have previously taken a loan with us'}
                      {formData.relationshipWithNDFSP === RelationshipType.NEW_BORROWER &&
                        'This is your first time applying for a loan'}
                    </span>
                  </p>
                </div>

                {formData.borrowerType === BorrowerType.INDIVIDUAL && (
                  <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Previous Loans Paid On Time
                      <Tooltip content="Number of previous loans successfully repaid">
                        <HelpCircle className="w-3 h-3 text-gray-400 ml-1 inline" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.previousLoansPaidOnTime !== undefined ? formData.previousLoansPaidOnTime : ""}
                      onChange={(e) => handleInputChange(
                        "previousLoansPaidOnTime",
                        e.target.value === "" ? undefined : Number.parseInt(e.target.value)
                      )}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${formData.relationshipWithNDFSP === RelationshipType.NEW_BORROWER ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-white"}`}
                      placeholder="Number of loans"
                      disabled={formData.relationshipWithNDFSP === RelationshipType.NEW_BORROWER}
                    />
                    {formData.relationshipWithNDFSP === RelationshipType.NEW_BORROWER && (
                      <p className="text-xs text-gray-400 flex items-start">
                        <Info className="w-3 h-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                        <span>Auto-set to 0 for new borrowers.</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Auto-population Status */}
              {isAutoPopulated && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-full mr-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          Borrower Information Auto-Populated
                        </p>
                        <p className="text-xs text-green-700">
                          Using existing {formData.relationshipWithNDFSP === RelationshipType.REPEAT_BORROWER
                            ? 'client account'
                            : 'borrower profile'}
                          {formData.relationshipWithNDFSP === RelationshipType.REPEAT_BORROWER &&
                            searchResults?.data?.accountNumber && (
                              <span className="ml-2 font-mono bg-green-200 px-2 py-0.5 rounded">
                                Account: {searchResults.data.accountNumber}
                              </span>
                            )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearAutoPopulatedData}
                      className="text-xs px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-colors"
                    >
                      Clear & Edit Manually
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Conditional rendering based on borrower type */}
            {formData.borrowerType === BorrowerType.INDIVIDUAL ? (
              /* Individual Borrower Form */
              <div className="space-y-6">
                {/* Personal Details */}
                <CollapsibleSection title="Personal Details" icon={User} defaultExpanded={true} completionPercentage={75}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shouldDisplayAccountCard && displayAccountInfo && displayAccountInfo.data && (
                      <AccountNumberDisplayCard
                        searchResults={displayAccountInfo}
                        isAutoPopulated={isAutoPopulated}
                      />
                    )}

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        data-field="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        onBlur={() => markFieldTouched('firstName')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('firstName') && getFieldError('firstName')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('firstName') && formData.firstName
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          } ${isAutoPopulated && autoPopulatedFields.includes('firstName') ? 'bg-gray-50' : 'bg-white'}`}
                        placeholder="Enter first name"
                        disabled={isAutoPopulated && autoPopulatedFields.includes('firstName')}
                        readOnly={isAutoPopulated && autoPopulatedFields.includes('firstName')}
                      />
                      <FieldValidationIndicator
                        isValid={!!formData.firstName}
                        isDirty={isFieldTouched('firstName')}
                        error={validationErrors.firstName}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        data-field="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        onBlur={() => markFieldTouched('lastName')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('lastName') && getFieldError('lastName')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('lastName') && formData.lastName
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          }`}
                        placeholder="Enter last name"
                      />
                      <FieldValidationIndicator
                        isValid={!!formData.lastName}
                        isDirty={isFieldTouched('lastName')}
                        error={validationErrors.lastName}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Middle Name
                        <Tooltip content="Optional middle name or initial">
                          <HelpCircle className="w-3 h-3 text-gray-400 ml-1 inline" />
                        </Tooltip>
                      </label>
                      <input
                        type="text"
                        value={formData.middleName || ""}
                        onChange={(e) => handleInputChange("middleName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        placeholder="Enter middle name (optional)"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        National ID <span className="text-red-500">*</span>
                      </label>
                      <NationalIdInput
                        value={formData.nationalId}
                        onChange={(value) => handleInputChange("nationalId", value)}
                        onBlur={() => markFieldTouched('nationalId')}
                        error={validationErrors.nationalId}
                        disabled={isAutoPopulated && autoPopulatedFields.includes('nationalId')}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Place of National ID Issuance - District <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nationalIdDistrict"
                        data-field="nationalIdDistrict"
                        value={formData.nationalIdDistrict || ""}
                        onChange={(e) => handleInputChange("nationalIdDistrict", e.target.value)}
                        onBlur={() => markFieldTouched('nationalIdDistrict')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('nationalIdDistrict') && getFieldError('nationalIdDistrict')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('nationalIdDistrict') && formData.nationalIdDistrict
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          } ${isAutoPopulated && autoPopulatedFields.includes('nationalIdDistrict') ? 'bg-gray-50' : 'bg-white'}`}
                        placeholder="Enter district where National ID was issued"
                        disabled={isAutoPopulated && autoPopulatedFields.includes('nationalIdDistrict')}
                      />
                      <FieldValidationIndicator
                        isValid={!!formData.nationalIdDistrict}
                        isDirty={isFieldTouched('nationalIdDistrict')}
                        error={validationErrors.nationalIdDistrict}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Place of National ID Issuance - Sector <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nationalIdSector"
                        data-field="nationalIdSector"
                        value={formData.nationalIdSector || ""}
                        onChange={(e) => handleInputChange("nationalIdSector", e.target.value)}
                        onBlur={() => markFieldTouched('nationalIdSector')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('nationalIdSector') && getFieldError('nationalIdSector')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('nationalIdSector') && formData.nationalIdSector
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          } ${isAutoPopulated && autoPopulatedFields.includes('nationalIdSector') ? 'bg-gray-50' : 'bg-white'}`}
                        placeholder="Enter sector where National ID was issued"
                        disabled={isAutoPopulated && autoPopulatedFields.includes('nationalIdSector')}
                      />
                      <FieldValidationIndicator
                        isValid={!!formData.nationalIdSector}
                        isDirty={isFieldTouched('nationalIdSector')}
                        error={validationErrors.nationalIdSector}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        data-field="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                        onBlur={() => markFieldTouched('dateOfBirth')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('dateOfBirth') && getFieldError('dateOfBirth')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('dateOfBirth') && formData.dateOfBirth
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          } ${isAutoPopulated && autoPopulatedFields.includes('dateOfBirth') ? 'bg-gray-50' : 'bg-white'}`}
                        disabled={isAutoPopulated && autoPopulatedFields.includes('dateOfBirth')}
                      />
                      <FieldValidationIndicator
                        isValid={!!formData.dateOfBirth}
                        isDirty={isFieldTouched('dateOfBirth')}
                        error={validationErrors.dateOfBirth}
                      />
             
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange("gender", e.target.value)}
                        className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isAutoPopulated && autoPopulatedFields.includes('gender') ? 'bg-gray-50' : 'bg-white border-gray-300 focus:ring-blue-500'
                          }`}
                        disabled={isAutoPopulated && autoPopulatedFields.includes('gender')}
                      >
                        <option value={Gender.MALE}>Male</option>
                        <option value={Gender.FEMALE}>Female</option>
                        <option value={Gender.OTHER}>Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Marital Status</label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) => handleMaritalStatusChange(e.target.value as MaritalStatus)}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      >
                        <option value={MaritalStatus.SINGLE}>Single</option>
                        <option value={MaritalStatus.MARRIED}>Married</option>
                        <option value={MaritalStatus.DIVORCED}>Divorced</option>
                        <option value={MaritalStatus.WIDOWED}>Widowed</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Place of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="placeOfBirth"
                        data-field="placeOfBirth"
                        value={formData.placeOfBirth || ""}
                        onChange={(e) => handleInputChange("placeOfBirth", e.target.value)}
                        onBlur={() => markFieldTouched('placeOfBirth')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('placeOfBirth') && getFieldError('placeOfBirth')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('placeOfBirth') && formData.placeOfBirth
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          }`}
                        placeholder="Enter place of birth"
                      />
                      <FieldValidationIndicator
                        isValid={!!formData.placeOfBirth}
                        isDirty={isFieldTouched('placeOfBirth')}
                        error={validationErrors.placeOfBirth}
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Parents Information */}
                <CollapsibleSection title="Parents Information" icon={Users} defaultExpanded={true}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Mother's Full Name</label>
                      <input
                        type="text"
                        value={formData.parentsInformation?.motherFullName || ""}
                        onChange={(e) => handleInputChange("parentsInformation.motherFullName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        placeholder="Enter mother's full name"
                      />
                    </div>

             

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Father's Full Name</label>
                      <input
                        type="text"
                        value={formData.parentsInformation?.fatherFullName || ""}
                        onChange={(e) => handleInputChange("parentsInformation.fatherFullName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        placeholder="Enter father's full name"
                      />
                    </div>

              
                  </div>
                </CollapsibleSection>

                {/* Contact Information */}
                <CollapsibleSection title="Contact Information" icon={Phone} defaultExpanded={true}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Primary Phone <span className="text-red-500">*</span>
                      </label>
                      <PhoneInput
                        defaultCountry="rw"
                        value={formData.primaryPhone}
                        onChange={(value) => handleInputChange("primaryPhone", value)}
                        onBlur={() => markFieldTouched('primaryPhone')}
                        inputClassName={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('primaryPhone') && getFieldError('primaryPhone')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('primaryPhone') && formData.primaryPhone
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          }`}
                        countrySelectorStyleProps={{
                          buttonClassName: "px-3 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-white",
                        }}
                      />
                      <FieldValidationIndicator
                        isValid={!!formData.primaryPhone}
                        isDirty={isFieldTouched('primaryPhone')}
                        error={validationErrors.primaryPhone}
                        hint="Enter phone number with country code"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Alternative Phone
                        <Tooltip content="Secondary contact number for emergencies">
                          <HelpCircle className="w-3 h-3 text-gray-400 ml-1 inline" />
                        </Tooltip>
                      </label>
                      <PhoneInput
                        defaultCountry="rw"
                        value={formData.alternativePhone || ""}
                        onChange={(value) => handleInputChange("alternativePhone", value)}
                        inputClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        countrySelectorStyleProps={{
                          buttonClassName: "px-3 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-white",
                        }}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Email Address
                        <Tooltip content="Email for loan notifications and updates">
                          <HelpCircle className="w-3 h-3 text-gray-400 ml-1 inline" />
                        </Tooltip>
                      </label>
                      <input
                        type="email"
                        name="email"
                        data-field="email"
                        value={formData.email || ""}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        onBlur={() => markFieldTouched('email')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('email') && (getFieldError('email') || (formData.email && !validateEmail(formData.email)))
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('email') && formData.email && validateEmail(formData.email)
                            ? 'border-green-300 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                          }`}
                        placeholder="your.email@example.com (optional)"
                      />
                      <FieldValidationIndicator
                        isValid={formData.email ? validateEmail(formData.email) : true}
                        isDirty={isFieldTouched('email') && !!formData.email}
                        error={validationErrors.email || (isFieldTouched('email') && formData.email && !validateEmail(formData.email) ? "Email format is invalid (example: user@example.com)" : undefined)}
                        hint="We'll send important updates to this email"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Spouse Information */}
                {formData.maritalStatus === MaritalStatus.MARRIED && (
                  <CollapsibleSection title="Spouse Information" icon={Heart} defaultExpanded={true}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Spouse First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="spouseInfo.firstName"
                          data-field="spouseInfo.firstName"
                          value={formData.spouseInfo?.firstName || ""}
                          onChange={(e) => handleSpouseInfoChange("firstName", e.target.value)}
                          onBlur={() => markFieldTouched('spouseInfo.firstName')}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('spouseInfo.firstName') && getFieldError('spouseInfo.firstName')
                            ? 'border-red-300 focus:ring-red-500'
                            : isFieldTouched('spouseInfo.firstName') && formData.spouseInfo?.firstName
                              ? 'border-green-300 focus:ring-green-500'
                              : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          placeholder="Enter spouse first name"
                        />
                        <FieldValidationIndicator
                          isValid={!!formData.spouseInfo?.firstName}
                          isDirty={isFieldTouched('spouseInfo.firstName')}
                          error={validationErrors["spouseInfo.firstName"]}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Spouse Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="spouseInfo.lastName"
                          data-field="spouseInfo.lastName"
                          value={formData.spouseInfo?.lastName || ""}
                          onChange={(e) => handleSpouseInfoChange("lastName", e.target.value)}
                          onBlur={() => markFieldTouched('spouseInfo.lastName')}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('spouseInfo.lastName') && getFieldError('spouseInfo.lastName')
                            ? 'border-red-300 focus:ring-red-500'
                            : isFieldTouched('spouseInfo.lastName') && formData.spouseInfo?.lastName
                              ? 'border-green-300 focus:ring-green-500'
                              : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          placeholder="Enter spouse last name"
                        />
                        <FieldValidationIndicator
                          isValid={!!formData.spouseInfo?.lastName}
                          isDirty={isFieldTouched('spouseInfo.lastName')}
                          error={validationErrors["spouseInfo.lastName"]}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Spouse National ID <span className="text-red-500">*</span>
                        </label>
                        <NationalIdInput
                          value={formData.spouseInfo?.nationalId || ""}
                          onChange={(value) => handleSpouseInfoChange("nationalId", value)}
                          onBlur={() => markFieldTouched('spouseInfo.nationalId')}
                          error={validationErrors["spouseInfo.nationalId"]}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Spouse Phone <span className="text-red-500">*</span>
                        </label>
                        <PhoneInput
                          defaultCountry="rw"
                          value={formData.spouseInfo?.phone || ""}
                          onChange={(value) => handleSpouseInfoChange("phone", value)}
                          onBlur={() => markFieldTouched('spouseInfo.phone')}
                          inputClassName={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('spouseInfo.phone') && getFieldError('spouseInfo.phone')
                            ? 'border-red-300 focus:ring-red-500'
                            : isFieldTouched('spouseInfo.phone') && formData.spouseInfo?.phone
                              ? 'border-green-300 focus:ring-green-500'
                              : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          countrySelectorStyleProps={{
                            buttonClassName: "px-3 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-white",
                          }}
                        />
                        <FieldValidationIndicator
                          isValid={!!formData.spouseInfo?.phone}
                          isDirty={isFieldTouched('spouseInfo.phone')}
                          error={validationErrors["spouseInfo.phone"]}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Spouse Email</label>
                        <input
                          type="email"
                          value={formData.spouseInfo?.email || ""}
                          onChange={(e) => handleSpouseInfoChange("email", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          placeholder="spouse.email@example.com"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Spouse Occupation</label>
                        <input
                          type="text"
                          value={formData.spouseInfo?.occupation || ""}
                          onChange={(e) => handleSpouseInfoChange("occupation", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          placeholder="Enter spouse occupation"
                        />
                      </div>
                    </div>

                    {/* Spouse Documents */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Spouse Documents</h4>
                      <div className="mb-3">
                        <FileUploadWithProgress
                          label="Spouse CRB Report"
                          documentTitle="Spouse CRB Report"
                          hint="Pre-uploaded to Cloudinary"
                          maxFiles={5}
                          multiple
                          showDescription={false}
                          storageKey="loan-app-draft:spouseCrbReportUrls"
                          onUploadComplete={(docs) => setSpouseCrbReportUrls(docs)}
                        />
                      </div>
                      <div className="mb-3">
                        <FileUploadWithProgress
                          label="Spouse Identification"
                          documentTitle="Spouse Identification"
                          hint="Pre-uploaded to Cloudinary"
                          maxFiles={5}
                          multiple
                          showDescription={false}
                          storageKey="loan-app-draft:spouseIdentificationUrls"
                          onUploadComplete={(docs) => setSpouseIdentificationUrls(docs)}
                        />
                      </div>
                      {formData.maritalStatus === MaritalStatus.MARRIED && (
                        <div className="mb-3">
                          <FileUploadWithProgress
                            label="Marriage Certificate"
                            documentTitle="Marriage Certificate"
                            hint="Pre-uploaded to Cloudinary"
                            maxFiles={5}
                            multiple
                            showDescription={false}
                            storageKey="loan-app-draft:marriageCertificateUrls"
                            onUploadComplete={(docs) => setMarriageCertificateUrls(docs)}
                          />
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}
                <CollapsibleSection title="Borrower Documents" icon={FolderOpen} defaultExpanded={true}>
                  <FileUploadWithProgress
                    onUploadComplete={setBorrowerDocuments}
                    maxFiles={10}
                    label="Borrower Documents"
                    hint="Upload ID, proof of address, etc. — type a name per file or it falls back to the file name"
                    storageKey="loan-borrower-docs"
                    showDescription
                  />
                </CollapsibleSection>
              </div>
            ) : (
              /* Institution Borrower Form */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Institution Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.institutionProfile?.institutionType || ""}
                      onChange={(e) => handleInstitutionProfileChange("institutionType", e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    >
                      <option value="">Select Institution Type</option>
                      <option value={InstitutionType.COMPANY}>Company</option>
                      <option value={InstitutionType.COOPERATIVE}>Cooperative</option>
                      <option value={InstitutionType.OTHER}>Other</option>
                    </select>
                  </div>

                  {formData.institutionProfile?.institutionType === InstitutionType.OTHER && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Specify Institution Type <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.institutionProfile?.otherInstitutionType || ""}
                        onChange={(e) => handleInstitutionProfileChange("otherInstitutionType", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        placeholder="Enter institution type"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Institution Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="institutionProfile.institutionName"
                      data-field="institutionProfile.institutionName"
                      value={formData.institutionProfile?.institutionName || ""}
                      onChange={(e) => handleInstitutionProfileChange("institutionName", e.target.value)}
                      onBlur={() => markFieldTouched('institutionProfile.institutionName')}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('institutionProfile.institutionName') && getFieldError('institutionProfile.institutionName')
                        ? 'border-red-300 focus:ring-red-500'
                        : isFieldTouched('institutionProfile.institutionName') && formData.institutionProfile?.institutionName
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="Enter institution name"
                    />
                    <FieldValidationIndicator
                      isValid={!!formData.institutionProfile?.institutionName}
                      isDirty={isFieldTouched('institutionProfile.institutionName')}
                      error={validationErrors["institutionProfile.institutionName"]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="institutionProfile.licenseNumber"
                      data-field="institutionProfile.licenseNumber"
                      value={formData.institutionProfile?.licenseNumber || ""}
                      onChange={(e) => handleInstitutionProfileChange("licenseNumber", e.target.value)}
                      onBlur={() => markFieldTouched('institutionProfile.licenseNumber')}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('institutionProfile.licenseNumber') && getFieldError('institutionProfile.licenseNumber')
                        ? 'border-red-300 focus:ring-red-500'
                        : isFieldTouched('institutionProfile.licenseNumber') && formData.institutionProfile?.licenseNumber
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-blue-500'
                        } ${isAutoPopulated && autoPopulatedFields.includes('licenseNumber') ? 'bg-gray-50' : 'bg-white'}`}
                      placeholder="Enter license number"
                      disabled={isAutoPopulated && autoPopulatedFields.includes('licenseNumber')}
                    />
                    <FieldValidationIndicator
                      isValid={!!formData.institutionProfile?.licenseNumber}
                      isDirty={isFieldTouched('institutionProfile.licenseNumber')}
                      error={validationErrors["institutionProfile.licenseNumber"]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Registration Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="institutionProfile.registrationDate"
                      data-field="institutionProfile.registrationDate"
                      value={formData.institutionProfile?.registrationDate || ""}
                      onChange={(e) => handleInstitutionProfileChange("registrationDate", e.target.value)}
                      onBlur={() => markFieldTouched('institutionProfile.registrationDate')}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('institutionProfile.registrationDate') && getFieldError('institutionProfile.registrationDate')
                        ? 'border-red-300 focus:ring-red-500'
                        : isFieldTouched('institutionProfile.registrationDate') && formData.institutionProfile?.registrationDate
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-blue-500'
                        } ${isAutoPopulated && autoPopulatedFields.includes('registrationDate') ? 'bg-gray-50' : 'bg-white'}`}
                      disabled={isAutoPopulated && autoPopulatedFields.includes('registrationDate')}
                    />
                    <FieldValidationIndicator
                      isValid={!!formData.institutionProfile?.registrationDate}
                      isDirty={isFieldTouched('institutionProfile.registrationDate')}
                      error={validationErrors["institutionProfile.registrationDate"]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      TIN Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="institutionProfile.tinNumber"
                      data-field="institutionProfile.tinNumber"
                      value={formData.institutionProfile?.tinNumber || ""}
                      onChange={(e) => handleInstitutionProfileChange("tinNumber", e.target.value)}
                      onBlur={() => markFieldTouched('institutionProfile.tinNumber')}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('institutionProfile.tinNumber') && getFieldError('institutionProfile.tinNumber')
                        ? 'border-red-300 focus:ring-red-500'
                        : isFieldTouched('institutionProfile.tinNumber') && formData.institutionProfile?.tinNumber
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="Enter TIN number"
                    />
                    <FieldValidationIndicator
                      isValid={!!formData.institutionProfile?.tinNumber}
                      isDirty={isFieldTouched('institutionProfile.tinNumber')}
                      error={validationErrors["institutionProfile.tinNumber"]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                    <input
                      type="text"
                      value={formData.institutionProfile?.contactPerson || ""}
                      onChange={(e) => handleInstitutionProfileChange("contactPerson", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      placeholder="Enter contact person name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                    <PhoneInput
                      defaultCountry="rw"
                      value={formData.institutionProfile?.contactPhone || ""}
                      onChange={(value) => handleInstitutionProfileChange("contactPhone", value)}
                      inputClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      countrySelectorStyleProps={{
                        buttonClassName: "px-3 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-white",
                      }}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                    <input
                      type="email"
                      value={formData.institutionProfile?.contactEmail || ""}
                      onChange={(e) => handleInstitutionProfileChange("contactEmail", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      placeholder="contact@institution.com"
                    />
                  </div>
                </div>

                {/* Institution Legal Documents */}
                <CollapsibleSection title="Institution Legal Documents" icon={FileText} defaultExpanded={true}>
                  {formData.institutionProfile?.institutionType === InstitutionType.COMPANY && (
                    <div className="mb-3">
                      <FileUploadWithProgress
                        label="RDB Registration Document"
                        documentTitle="RDB Registration Document"
                        hint="Pre-uploaded to Cloudinary"
                        maxFiles={5}
                        multiple
                        showDescription={false}
                        storageKey="loan-app-draft:institutionLegalDocumentUrls"
                        onUploadComplete={(docs) => setInstitutionLegalDocumentUrls(docs)}
                      />
                    </div>
                  )}
                  {formData.institutionProfile?.institutionType === InstitutionType.COOPERATIVE && (
                    <div className="mb-3">
                      <FileUploadWithProgress
                        label="RGB Cooperative Document"
                        documentTitle="RGB Cooperative Document"
                        hint="Pre-uploaded to Cloudinary"
                        maxFiles={5}
                        multiple
                        showDescription={false}
                        storageKey="loan-app-draft:cooperativeLegalDocumentUrls"
                        onUploadComplete={(docs) => setCooperativeLegalDocumentUrls(docs)}
                      />
                    </div>
                  )}
                  {formData.institutionProfile?.institutionType === InstitutionType.OTHER && (
                    <div className="mb-3">
                      <FileUploadWithProgress
                        label="RCA Registration Document"
                        documentTitle="RCA Registration Document"
                        hint="Pre-uploaded to Cloudinary"
                        maxFiles={5}
                        multiple
                        showDescription={false}
                        storageKey="loan-app-draft:otherInstitutionLegalDocumentUrls"
                        onUploadComplete={(docs) => setOtherInstitutionLegalDocumentUrls(docs)}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FileUploadWithProgress
                      label="Business License"
                      documentTitle="Business License"
                      hint="Pre-uploaded to Cloudinary"
                      maxFiles={5}
                      multiple
                      showDescription={false}
                      storageKey="loan-app-draft:institutionLicenseUrls"
                      onUploadComplete={(docs) => setInstitutionLicenseUrls(docs)}
                    />
                    <FileUploadWithProgress
                      label="Trading License"
                      documentTitle="Trading License"
                      hint="Pre-uploaded to Cloudinary"
                      maxFiles={5}
                      multiple
                      showDescription={false}
                      storageKey="loan-app-draft:institutionTradingLicenseUrls"
                      onUploadComplete={(docs) => setInstitutionTradingLicenseUrls(docs)}
                    />
                    <FileUploadWithProgress
                      label="Registration Certificate"
                      documentTitle="Registration Certificate"
                      hint="Pre-uploaded to Cloudinary"
                      maxFiles={5}
                      multiple
                      showDescription={false}
                      storageKey="loan-app-draft:institutionRegistrationUrls"
                      onUploadComplete={(docs) => setInstitutionRegistrationUrls(docs)}
                    />
                  </div>
                </CollapsibleSection>


                <CollapsibleSection title="Institution Documents" icon={FolderOpen} defaultExpanded={false}>
                  <FileUploadWithProgress
                    onUploadComplete={setInstitutionDocuments}
                    maxFiles={10}
                    label="Institution Documents"
                    hint="Upload institution registration documents, certificates, etc. — name each file or fall back to the filename"
                    storageKey="loan-institution-docs"
                    showDescription
                  />
                  {validationErrors.institutionRelevantDocuments && (
                    <p className="text-xs text-red-500 mt-2">{validationErrors.institutionRelevantDocuments}</p>
                  )}
                </CollapsibleSection>
              </div>
            )}
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <StepHeader
              icon={MapPin}
              title={formData.borrowerType === BorrowerType.INDIVIDUAL ? 'Address & Occupation' : 'Address & Business'}
              color="green"
            />

            {/* Step Progress Bar */}
            <StepProgressBar
              stepNumber={2}
              completedFields={
                (formData.address.province ? 1 : 0) +
                (formData.address.district ? 1 : 0) +
                (formData.address.sector ? 1 : 0) +
                (formData.borrowerType === BorrowerType.INDIVIDUAL ?
                  (incomeSourcesList.length > 0 ? 1 : 0) +
                  (occupationSupportingDocuments.some(d => d.description && d.file) ? 1 : 0) +
                  (preferredPaymentFrequency ? 1 : 0) : 0)
              }
              totalFields={formData.borrowerType === BorrowerType.INDIVIDUAL ? 6 : 3}
            />

            {/* Current Address */}
            <CollapsibleSection title="Current Address" icon={Home} defaultExpanded={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="address.province"
                    data-field="address.province"
                    value={formData.address.province || ""}
                    onChange={(e) => handleAddressChange("province", e.target.value)}
                    onBlur={() => markFieldTouched('address.province')}
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('address.province') && getFieldError('address.province')
                      ? 'border-red-300 focus:ring-red-500'
                      : isFieldTouched('address.province') && formData.address.province
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  >
                    <option value="">Select Province</option>
                    {provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                  <FieldValidationIndicator
                    isValid={!!formData.address.province}
                    isDirty={isFieldTouched('address.province')}
                    error={validationErrors["address.province"]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="address.district"
                    data-field="address.district"
                    value={formData.address.district || ""}
                    onChange={(e) => handleAddressChange("district", e.target.value)}
                    onBlur={() => markFieldTouched('address.district')}
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('address.district') && getFieldError('address.district')
                      ? 'border-red-300 focus:ring-red-500'
                      : isFieldTouched('address.district') && formData.address.district
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    disabled={!formData.address.province}
                  >
                    <option value="">Select District</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  <FieldValidationIndicator
                    isValid={!!formData.address.district}
                    isDirty={isFieldTouched('address.district')}
                    error={validationErrors["address.district"]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Sector <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="address.sector"
                    data-field="address.sector"
                    value={formData.address.sector || ""}
                    onChange={(e) => handleAddressChange("sector", e.target.value)}
                    onBlur={() => markFieldTouched('address.sector')}
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('address.sector') && getFieldError('address.sector')
                      ? 'border-red-300 focus:ring-red-500'
                      : isFieldTouched('address.sector') && formData.address.sector
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    disabled={!formData.address.district}
                  >
                    <option value="">Select Sector</option>
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                  <FieldValidationIndicator
                    isValid={!!formData.address.sector}
                    isDirty={isFieldTouched('address.sector')}
                    error={validationErrors["address.sector"]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Cell</label>
                  <select
                    value={formData.address.cell || ""}
                    onChange={(e) => handleAddressChange("cell", e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    disabled={!formData.address.sector}
                  >
                    <option value="">Select Cell</option>
                    {cells.map((cell) => (
                      <option key={cell} value={cell}>
                        {cell}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Village</label>
                  <select
                    value={formData.address.village || ""}
                    onChange={(e) => handleAddressChange("village", e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    disabled={!formData.address.cell}
                  >
                    <option value="">Select Village</option>
                    {villages.map((village) => (
                      <option key={village} value={village}>
                        {village}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CollapsibleSection>

            {/* Occupation/Business Details */}
            <CollapsibleSection
              title={formData.borrowerType === BorrowerType.INDIVIDUAL ? "Occupation & Business" : "Business Details"}
              icon={Briefcase}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.borrowerType === BorrowerType.INDIVIDUAL ? (
                  <>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Occupation</label>
                      <input
                        type="text"
                        value={formData.occupation || ""}
                        onChange={(e) => handleInputChange("occupation", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        placeholder="Enter occupation"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Economic Sector</label>
                      <select
                        value={formData.economicSector || ""}
                        onChange={(e) => handleInputChange("economicSector", e.target.value || null)}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      >
                        <option value="">Select Economic Sector (Optional)</option>
                        <option value={EconomicSector.AGRICULTURE_LIVESTOCK_FISHING}>
                          Agriculture, Livestock, Fishing
                        </option>
                        <option value={EconomicSector.PUBLIC_WORKS_CONSTRUCTION}>
                          Public Works, Construction
                        </option>
                        <option value={EconomicSector.COMMERCE_RESTAURANTS_HOTELS}>
                          Commerce, Restaurants, Hotels
                        </option>
                        <option value={EconomicSector.TRANSPORT_WAREHOUSES}>
                          Transport, Warehouses
                        </option>
                        <option value={EconomicSector.MANUFACTURING}>
                          Manufacturing
                        </option>
                        <option value={EconomicSector.SERVICES}>
                          Services
                        </option>
                        <option value={EconomicSector.TECHNOLOGY}>
                          Technology/IT
                        </option>
                        <option value={EconomicSector.HEALTHCARE}>
                          Healthcare
                        </option>
                        <option value={EconomicSector.EDUCATION}>
                          Education
                        </option>
                        <option value={EconomicSector.FINANCIAL_SERVICES}>
                          Financial Services
                        </option>
                        <option value={EconomicSector.OTHERS}>
                          Others
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <select
                        value={formData.businessType || ""}
                        onChange={(e) => handleInputChange("businessType", e.target.value || null)}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      >
                        <option value="">Select Business Type (Optional)</option>
                        <option value={BusinessType.MICRO}>Micro Business</option>
                        <option value={BusinessType.SMALL}>Small Business (SME)</option>
                        <option value={BusinessType.MEDIUM}>Medium Business (SME)</option>
                        <option value={BusinessType.LARGE}>Large Business</option>
                        <option value={BusinessType.PERSONAL_USE}>Personal Use</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Business Structure</label>
                      <select
                        value={formData.businessStructure || ""}
                        onChange={(e) => handleInputChange("businessStructure", e.target.value || null)}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      >
                        <option value="">Select Business Structure</option>
                        <option value={BusinessStructure.PUBLIC_COMPANY}>Public Company</option>
                        <option value={BusinessStructure.PRIVATE_COMPANY}>Private Company</option>
                        <option value={BusinessStructure.COOPERATIVE}>Cooperative</option>
                        <option value={BusinessStructure.PARTNERSHIP}>Partnership</option>
                        <option value={BusinessStructure.FOUNDATION}>Foundation</option>
                        <option value={BusinessStructure.SOLETRADER}>Sole Trader/Personal Enterprise</option>
                        <option value={BusinessStructure.SOCIALENTERPRISE}>Social Enterprise</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <select
                        value={formData.businessType || ""}
                        onChange={(e) => handleInputChange("businessType", e.target.value || null)}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      >
                        <option value="">Select Business Type</option>
                        <optgroup label="Business Size">
                          <option value={BusinessType.MICRO}>Micro Business</option>
                          <option value={BusinessType.SMALL}>Small Business (SME)</option>
                          <option value={BusinessType.MEDIUM}>Medium Business (SME)</option>
                          <option value={BusinessType.LARGE}>Large Business</option>
                          <option value={BusinessType.YOUTH_BUSINESS}>Youth Business</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Economic Sector</label>
                      <select
                        value={formData.economicSector || ""}
                        onChange={(e) => handleInputChange("economicSector", e.target.value || null)}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      >
                        <option value="">Select Economic Sector</option>
                        <option value={EconomicSector.AGRICULTURE_LIVESTOCK_FISHING}>
                          Agriculture, Livestock, Fishing
                        </option>
                        <option value={EconomicSector.PUBLIC_WORKS_CONSTRUCTION}>
                          Public Works, Construction
                        </option>
                        <option value={EconomicSector.COMMERCE_RESTAURANTS_HOTELS}>
                          Commerce, Restaurants, Hotels
                        </option>
                        <option value={EconomicSector.TRANSPORT_WAREHOUSES}>
                          Transport, Warehouses
                        </option>
                        <option value={EconomicSector.MANUFACTURING}>
                          Manufacturing
                        </option>
                        <option value={EconomicSector.SERVICES}>
                          Services
                        </option>
                        <option value={EconomicSector.TECHNOLOGY}>
                          Technology/IT
                        </option>
                        <option value={EconomicSector.HEALTHCARE}>
                          Healthcare
                        </option>
                        <option value={EconomicSector.EDUCATION}>
                          Education
                        </option>
                        <option value={EconomicSector.FINANCIAL_SERVICES}>
                          Financial Services
                        </option>
                        <option value={EconomicSector.OTHERS}>
                          Others
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Business Address Details</label>
                      <input
                        type="text"
                        value={formData.institutionProfile?.address?.street || ""}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            institutionProfile: {
                              ...prev.institutionProfile!,
                              address: {
                                ...prev.institutionProfile?.address,
                                street: e.target.value
                              }
                            }
                          }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                        placeholder="Enter street address"
                      />
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>

            {/* Income Sources - Individual only */}
            {formData.borrowerType === BorrowerType.INDIVIDUAL && (
              <CollapsibleSection title="Income Sources" icon={DollarSign} defaultExpanded={true}>
                <div className="space-y-4">
                  {incomeSourcesList.map((source, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Income Source {index + 1}</h4>
                        {incomeSourcesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIncomeSource(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Source Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={source.source}
                            onChange={(e) => updateIncomeSource(index, "source", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`incomeSource_${index}`) && getFieldError(`incomeSource_${index}`)
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                              }`}
                          >
                            <option value="">Select source</option>
                            {incomeSources.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <FieldValidationIndicator
                            isDirty={isFieldTouched(`incomeSource_${index}`)}
                            error={validationErrors[`incomeSource_${index}`]}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Amount ({currencyCode()}) <span className="text-red-500">*</span>
                          </label>
                          <MoneyInput
                            value={source.amount || ""}
                            onChange={(v) => updateIncomeSource(index, "amount", v ?? 0)}
                            onBlur={() => markFieldTouched(`incomeAmount_${index}`)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`incomeAmount_${index}`) && getFieldError(`incomeAmount_${index}`)
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                              }`}
                            placeholder="Enter amount"
                          />
                          <FieldValidationIndicator
                            isDirty={isFieldTouched(`incomeAmount_${index}`)}
                            error={validationErrors[`incomeAmount_${index}`]}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                          <select
                            value={source.frequency}
                            onChange={(e) => updateIncomeSource(index, "frequency", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                          >
                            <option value={IncomeFrequency.DAILY}>Daily</option>
                            <option value={IncomeFrequency.WEEKLY}>Weekly</option>
                            <option value={IncomeFrequency.MONTHLY}>Monthly</option>
                            <option value={IncomeFrequency.QUARTERLY}>Quarterly</option>
                            <option value={IncomeFrequency.ANNUALLY}>Annually</option>
                          </select>
                        </div>
                      </div>

                      {source.source === "other" && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Specify Other Income Source
                          </label>
                          <input
                            type="text"
                            value={source.otherSource || ""}
                            onChange={(e) => updateIncomeSource(index, "otherSource", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="Describe your income source"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  <button
                    type="button"
                    onClick={addIncomeSource}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Income Source
                  </button>

                  {validationErrors.incomeSources && (
                    <p className="text-xs text-red-500">{validationErrors.incomeSources}</p>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Payment Frequency
            <CollapsibleSection title="Payment Frequency" icon={Calendar} defaultExpanded={true}>
              <div className="space-y-4">

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Preferred Payment Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="preferredPaymentFrequency"
                    data-field="preferredPaymentFrequency"
                    value={preferredPaymentFrequency}
                    onChange={(e) => handlePreferredPaymentFrequencyChange(e.target.value)}
                    onBlur={() => markFieldTouched('preferredPaymentFrequency')}
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                      isFieldTouched('preferredPaymentFrequency') && getFieldError('preferredPaymentFrequency')
                        ? 'border-red-300 focus:ring-red-500'
                        : isFieldTouched('preferredPaymentFrequency') && preferredPaymentFrequency
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select payment frequency</option>
                    {paymentFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldValidationIndicator
                    isValid={!!preferredPaymentFrequency}
                    isDirty={isFieldTouched('preferredPaymentFrequency')}
                    error={validationErrors.preferredPaymentFrequency}
                  />
                </div>
              </div>
            </CollapsibleSection> */}

            {/* Occupation Supporting Documents */}
            {formData.borrowerType === BorrowerType.INDIVIDUAL && (
              <CollapsibleSection title="Occupation Supporting Documents" icon={FileCheck} defaultExpanded={true}>
                <FileUploadWithProgress
                  onUploadComplete={setOccupationDocuments}
                  maxFiles={10}
                  label="Upload Supporting Documents"
                  hint="Payslips, contracts, business registration… — name each file or fall back to the filename"
                  storageKey="loan-occupation-docs"
                  showDescription
                />
              </CollapsibleSection>
            )}
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <StepHeader icon={DollarSign} title="Loan Details" color="purple" />
              {/* AI advisory — suggests a sensible product/amount/term/rate for this
                  borrower from policy (BLS §1.1–1.2). Advisory only; you can edit
                  every field after applying, and submission is unchanged. */}
              <CopilotRecommendationButton
                kind="loan-application"
                context={{ borrowerId: (formData as any)?.borrowerId ?? sourceBorrowerId, note: formData?.purposeOfLoan }}
                label="AI Loan Advice"
                onApply={(s: any) => {
                  if (typeof s?.amount === "number" && s.amount > 0) handleInputChange("disbursedAmount", s.amount)
                  if (s?.purpose) handleInputChange("purposeOfLoan", String(s.purpose))
                  if (typeof s?.termMonths === "number" && s.termMonths > 0) handleInputChange("termInMonths", s.termMonths)
                }}
              />
            </div>

            {/* Step Progress Bar */}
            <StepProgressBar
              stepNumber={3}
              completedFields={
                (formData.purposeOfLoan ? 1 : 0) +
                (formData.branchName ? 1 : 0) +
                (formData.businessOfficer ? 1 : 0) +
                (formData.disbursedAmount > 0 ? 1 : 0) +
                (paymentPeriod ? 1 : 0)
              }
              totalFields={5}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <div className="relative" id="branch-dropdown-container">
                  <div className="relative">
                    <input
                      type="text"
                      name="branchName"
                      data-field="branchName"
                      value={formData.branchName}
                      readOnly={!!autoAssignedBranch}
                      disabled={!!autoAssignedBranch}
                      onChange={(e) => {
                        if (autoAssignedBranch) return
                        handleInputChange("branchName", e.target.value)
                        setSearchTerm(e.target.value)
                      }}
                      onFocus={() => { if (!autoAssignedBranch) setIsDropdownOpen(true) }}
                      onBlur={() => markFieldTouched('branchName')}
                      className={`w-full px-3 py-2 pl-10 pr-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                        !!autoAssignedBranch
                          ? 'bg-gray-50 cursor-not-allowed border-gray-200 text-gray-700'
                          : isFieldTouched('branchName') && getFieldError('branchName')
                          ? 'border-red-300 focus:ring-red-500'
                          : isFieldTouched('branchName') && formData.branchName
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder={autoAssignedBranch ? "Auto-filled from your login" : "Search or select branch"}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />

                    {formData.branchName && !autoAssignedBranch && (
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange("branchName", "")
                          setSearchTerm("")
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {autoAssignedBranch && (
                    <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Auto-filled from your login
                    </p>
                  )}

                  {!autoAssignedBranch && isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="Search branches..."
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="py-1">
                        {filteredBranches.length > 0 ? (
                          filteredBranches.map((branch: { title: string }, index: number) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                handleInputChange("branchName", branch.title)
                                setIsDropdownOpen(false)
                                setSearchTerm("")
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 flex items-center"
                            >
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm">{branch.title}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No branches found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <FieldValidationIndicator
                  isValid={!!formData.branchName}
                  isDirty={isFieldTouched('branchName')}
                  error={validationErrors.branchName}
                />
              </div>

              <div className="space-y-1" id="officer-dropdown-container">
                <label className="block text-sm font-medium text-gray-700">
                  Business Officer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="businessOfficer"
                    data-field="businessOfficer"
                    value={formData.businessOfficer}
                    onChange={(e) => {
                      handleInputChange("businessOfficer", e.target.value)
                      setOfficerSearchTerm(e.target.value)
                    }}
                    onFocus={() => setIsOfficerDropdownOpen(true)}
                    onBlur={() => markFieldTouched('businessOfficer')}
                    className={`w-full px-3 py-2 pl-10 pr-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('businessOfficer') && getFieldError('businessOfficer')
                      ? 'border-red-300 focus:ring-red-500'
                      : isFieldTouched('businessOfficer') && formData.businessOfficer
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    placeholder="Search or select business officer"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />

                  {formData.businessOfficer && (
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange("businessOfficer", "")
                        setOfficerSearchTerm("")
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {isOfficerDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            type="text"
                            value={officerSearchTerm}
                            onChange={(e) => setOfficerSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="Search users..."
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="py-1">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((u, index) => {
                            const displayName = (u.firstName && u.lastName)
                              ? `${u.firstName} ${u.lastName}`
                              : u.firstName || u.lastName || u.username
                            return (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  handleInputChange("businessOfficer", displayName)
                                  setIsOfficerDropdownOpen(false)
                                  setOfficerSearchTerm("")
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 flex items-center justify-between"
                              >
                                <div className="flex items-center">
                                  <User className="w-4 h-4 mr-2 text-gray-400" />
                                  <div>
                                    <span className="text-sm font-medium">{displayName}</span>
                                    <span className="text-xs text-gray-500 ml-2">({u.role?.replace(/_/g, ' ')})</span>
                                  </div>
                                </div>
                              </button>
                            )
                          })
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No users found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <FieldValidationIndicator
                  isValid={!!formData.businessOfficer}
                  isDirty={isFieldTouched('businessOfficer')}
                  error={validationErrors.businessOfficer}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Loan Amount ({currencyCode()}) <span className="text-red-500">*</span>
                </label>
                <MoneyInput
                  name="disbursedAmount"
                  data-field="disbursedAmount"
                  value={formData.disbursedAmount || ""}
                  onChange={(v) => handleInputChange("disbursedAmount", v ?? undefined)}
                  onBlur={() => markFieldTouched('disbursedAmount')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('disbursedAmount') && getFieldError('disbursedAmount')
                    ? 'border-red-300 focus:ring-red-500'
                    : isFieldTouched('disbursedAmount') && formData.disbursedAmount > 0
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  placeholder="Enter loan amount"
                />
                <FieldValidationIndicator
                  isValid={formData.disbursedAmount > 0}
                  isDirty={isFieldTouched('disbursedAmount')}
                  error={validationErrors.disbursedAmount}
                  hint={formData.disbursedAmount ? `${formatNumber(formData.disbursedAmount)} ${currencyCode()}` : ''}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Repayment Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={preferredPaymentFrequency}
                  onChange={(e) => handlePreferredPaymentFrequencyChange(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                >
                  <option value="">Select payment frequency</option>
                  {paymentFrequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Payment Period <span className="text-red-500">*</span>
                </label>
                <select
                  name="paymentPeriod"
                  data-field="paymentPeriod"
                  value={paymentPeriod}
                  onChange={(e) => {
                    const value = e.target.value as PaymentPeriod
                    setPaymentPeriod(value)
                    handleInputChange("paymentPeriod", value)
                    if (value !== PaymentPeriod.CUSTOM) {
                      setCustomPaymentPeriod('')
                      handleInputChange("customPaymentPeriod", '')
                    }
                  }}
                  onBlur={() => markFieldTouched('paymentPeriod')}
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('paymentPeriod') && getFieldError('paymentPeriod')
                    ? 'border-red-300 focus:ring-red-500'
                    : isFieldTouched('paymentPeriod') && paymentPeriod
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }`}
                >
                  <option value="">Select payment period</option>

                  <optgroup label="Salary/Short-term">
                    {paymentPeriodOptions
                      .filter(opt => opt.category === 'Salary/Short-term')
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Personal/SME">
                    {paymentPeriodOptions
                      .filter(opt => opt.category === 'Personal/SME')
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Car/Business">
                    {paymentPeriodOptions
                      .filter(opt => opt.category === 'Car/Business')
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Mortgage/Housing">
                    {paymentPeriodOptions
                      .filter(opt => opt.category === 'Mortgage/Housing')
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Other">
                    {paymentPeriodOptions
                      .filter(opt => opt.category === 'Other')
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <FieldValidationIndicator
                  isValid={!!paymentPeriod}
                  isDirty={isFieldTouched('paymentPeriod')}
                  error={validationErrors.paymentPeriod}
                />
              </div>

              {paymentPeriod === PaymentPeriod.CUSTOM && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Specify Custom Period <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customPaymentPeriod"
                    data-field="customPaymentPeriod"
                    value={customPaymentPeriod}
                    onChange={(e) => {
                      setCustomPaymentPeriod(e.target.value)
                      handleInputChange("customPaymentPeriod", e.target.value)
                    }}
                    onBlur={() => markFieldTouched('customPaymentPeriod')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('customPaymentPeriod') && getFieldError('customPaymentPeriod')
                      ? 'border-red-300 focus:ring-red-500'
                      : isFieldTouched('customPaymentPeriod') && customPaymentPeriod
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    placeholder="e.g., 5 years, 18 months"
                  />
                  <FieldValidationIndicator
                    isValid={!!customPaymentPeriod}
                    isDirty={isFieldTouched('customPaymentPeriod')}
                    error={validationErrors.customPaymentPeriod}
                  />
                </div>
              )}

              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Purpose of Loan <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="purposeOfLoan"
                  data-field="purposeOfLoan"
                  value={formData.purposeOfLoan || ""}
                  onChange={(e) => handleInputChange("purposeOfLoan", e.target.value)}
                  onBlur={() => markFieldTouched('purposeOfLoan')}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('purposeOfLoan') && getFieldError('purposeOfLoan')
                    ? 'border-red-300 focus:ring-red-500'
                    : isFieldTouched('purposeOfLoan') && formData.purposeOfLoan
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  placeholder="Describe the purpose of the loan in detail"
                />
                <FieldValidationIndicator
                  isValid={!!formData.purposeOfLoan}
                  isDirty={isFieldTouched('purposeOfLoan')}
                  error={validationErrors.purposeOfLoan}
                />
              </div>
            </div>

            <CollapsibleSection title="Loan Relevant Documents" icon={FileText} defaultExpanded={true}>
              <FileUploadWithProgress
                onUploadComplete={setLoanDocuments}
                maxFiles={10}
                label="Loan Supporting Documents"
                hint="Bank statements, business plans, collateral docs… — name each file or fall back to the filename"
                storageKey="loan-relevant-docs"
                showDescription
              />
            </CollapsibleSection>
          </motion.div>
        )

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <StepHeader icon={Shield} title="Collateral & Security" color="orange" />
            <StepProgressBar
              stepNumber={4}
              completedFields={
                (formData.collateralDescription ? 1 : 0) +
                (formData.collateralType === CollateralType.IMMOVABLE ?
                  (formData.upiNumber ? 1 : 0) + (upiDocumentUrl ? 1 : 0) : 0)
              }
              totalFields={formData.collateralType === CollateralType.IMMOVABLE ? 3 : 1}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Collateral Category</label>
                <select
                  value={formData.realCollateralCategory || ""}
                  onChange={(e) => {
                    const real = e.target.value
                    const meta = REAL_COLLATERAL_CATEGORIES.find((c) => c.value === real)
                    handleInputChange("realCollateralCategory", real)
                    // Keep the legacy collateralType in sync for back-compat/validation.
                    if (meta) {
                      handleInputChange(
                        "collateralType",
                        meta.group === "financial" ? CollateralType.FINANCIAL
                          : meta.group === "immovable" ? CollateralType.IMMOVABLE
                          : CollateralType.MOVABLE
                      )
                    }
                  }}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                >
                  <option value="">Select category…</option>
                  {(["financial", "immovable", "movable"] as const).map((g) => (
                    <optgroup key={g} label={GROUP_LABELS[g]}>
                      {REAL_COLLATERAL_CATEGORIES.filter((c) => c.group === g).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Collateral Value ({currencyCode()})</label>
                <MoneyInput
                  value={formData.collateralValue || ""}
                  onChange={(v) => handleInputChange("collateralValue", v ?? undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  placeholder="Enter collateral value"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">Collateral Description</label>
                <textarea
                  name="collateralDescription"
                  data-field="collateralDescription"
                  value={formData.collateralDescription || ""}
                  onChange={(e) => handleInputChange("collateralDescription", e.target.value)}
                  onBlur={() => markFieldTouched('collateralDescription')}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched('collateralDescription') && getFieldError('collateralDescription')
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  placeholder="Describe the collateral in detail"
                />
                <FieldValidationIndicator
                  isDirty={isFieldTouched('collateralDescription')}
                  error={validationErrors.collateralDescription}
                />
              </div>
            </div>

            {formData.collateralType === CollateralType.IMMOVABLE && (
              <div className="bg-blue-50/30 border border-blue-100 rounded-lg p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Home className="w-4 h-4 text-blue-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Immovable Property Details</h3>
                </div>

                <div className="space-y-4">
                  {/* UPI Number with Validation */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600">
                          UPI Number <span className="text-red-500">*</span>
                        </label>
                        {formData.upiNumber && validateUpiNumber(formData.upiNumber) && (
                          <span className="text-[10px] text-green-600 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                            Valid
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formData.upiNumber || ""}
                        onChange={(e) => handleInputChange("upiNumber", e.target.value.toUpperCase())}
                        onBlur={() => markFieldTouched('upiNumber')}
                        className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${isFieldTouched('upiNumber') && getFieldError('upiNumber')
                          ? 'border-red-300 focus:ring-red-500 bg-red-50/30'
                          : isFieldTouched('upiNumber') && formData.upiNumber && validateUpiNumber(formData.upiNumber)
                            ? 'border-green-300 focus:ring-green-500 bg-green-50/30'
                            : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        placeholder="e.g. RW1234567890"
                        maxLength={20}
                      />
                      {isFieldTouched('upiNumber') && validationErrors.upiNumber && (
                        <p className="text-[10px] text-red-500 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-0.5" />
                          {validationErrors.upiNumber}
                        </p>
                      )}
                    </div>

                    {/* Valuation Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Valuation Date</label>
                      <input
                        type="date"
                        value={formData.valuationDate || ""}
                        onChange={(e) => handleInputChange("valuationDate", e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* UPI Document Upload (pre-upload to Cloudinary) */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <FileUploadWithProgress
                      label="UPI Document"
                      documentTitle="UPI Document"
                      hint="Pre-uploaded to Cloudinary · Required"
                      maxFiles={1}
                      multiple={false}
                      showDescription={false}
                      storageKey="loan-app-draft:upiDocumentUrl"
                      onUploadComplete={(docs) => setUpiDocumentUrl(docs[0] ?? null)}
                    />
                    {validationErrors.upiFile && (
                      <p className="text-[10px] text-red-500 mt-1 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-0.5" />
                        {validationErrors.upiFile}
                      </p>
                    )}
                  </div>

                  {/* Valuation Details - Compact Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Market Value ({currencyCode()})</label>
                      <MoneyInput
                        value={formData.marketValue || ""}
                        onChange={(v) => handleInputChange("marketValue", v ?? undefined)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Insurance Value ({currencyCode()})</label>
                      <MoneyInput
                        value={formData.insuranceValue || ""}
                        onChange={(v) => handleInputChange("insuranceValue", v ?? undefined)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Forced Sale Value ({currencyCode()})</label>
                      <MoneyInput
                        value={formData.forcedSaleValue || ""}
                        onChange={(v) => handleInputChange("forcedSaleValue", v ?? undefined)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Valuer - Manual Input */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Valuer Name</label>
                      <input
                        type="text"
                        value={formData.valuedBy || ""}
                        onChange={(e) => handleInputChange("valuedBy", e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter valuator's full name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Location</label>
                      <input
                        type="text"
                        value={formData.collateralLocation || ""}
                        onChange={(e) => handleInputChange("collateralLocation", e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Kigali, Gasabo"
                      />
                    </div>
                  </div>

                  {/* Owner Information - Multi-owner editor (percentages total 100%) */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <CollateralOwnersEditor
                      owners={
                        Array.isArray(formData.collateralOwners) && formData.collateralOwners.length > 0
                          ? formData.collateralOwners
                          : [makeDefaultOwner({
                              name: formData.collateralOwnerInfo?.name || "",
                              nationalId: formData.collateralOwnerInfo?.nationalId || "",
                              phone: formData.collateralOwnerInfo?.phone || "",
                              address: formData.collateralOwnerInfo?.address || "",
                            })]
                      }
                      onChange={(owners) => {
                        // Mirror the primary owner into the legacy single ownerInfo
                        // so existing readers/submission keep working.
                        const primary = owners.find((o) => o.isPrimary) || owners[0] || null;
                        setFormData((prev) => ({
                          ...prev,
                          collateralOwners: owners,
                          collateralOwnerInfo: primary
                            ? { name: primary.name, nationalId: primary.nationalId || "", phone: primary.phone || "", address: primary.address || "" }
                            : prev.collateralOwnerInfo,
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Collateral Documents */}
            <CollapsibleSection title="Collateral Documents" icon={FolderOpen} defaultExpanded={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FileUploadWithProgress
                  label="Proof of Ownership"
                  documentTitle="Proof of Ownership"
                  hint="Pre-uploaded to Cloudinary"
                  maxFiles={5}
                  multiple
                  showDescription={false}
                  storageKey="loan-app-draft:proofOfOwnershipUrls"
                  onUploadComplete={(docs) => setProofOfOwnershipUrls(docs)}
                />
                <FileUploadWithProgress
                  label="Owner Identification"
                  documentTitle="Owner Identification"
                  hint="Pre-uploaded to Cloudinary"
                  maxFiles={5}
                  multiple
                  showDescription={false}
                  storageKey="loan-app-draft:ownerIdentificationUrls"
                  onUploadComplete={(docs) => setOwnerIdentificationUrls(docs)}
                />
                <FileUploadWithProgress
                  label="Legal Document"
                  documentTitle="Legal Document"
                  hint="Pre-uploaded to Cloudinary"
                  maxFiles={5}
                  multiple
                  showDescription={false}
                  storageKey="loan-app-draft:legalDocumentUrls"
                  onUploadComplete={(docs) => setLegalDocumentUrls(docs)}
                />
                <FileUploadWithProgress
                  label="Physical Evidence"
                  documentTitle="Physical Evidence"
                  hint="Pre-uploaded to Cloudinary"
                  maxFiles={5}
                  multiple
                  showDescription={false}
                  storageKey="loan-app-draft:physicalEvidenceUrls"
                  onUploadComplete={(docs) => setPhysicalEvidenceUrls(docs)}
                />
                <FileUploadWithProgress
                  label="Valuation Report"
                  documentTitle="Valuation Report"
                  hint="Pre-uploaded to Cloudinary"
                  maxFiles={5}
                  multiple
                  showDescription={false}
                  storageKey="loan-app-draft:valuationReportUrls"
                  onUploadComplete={(docs) => setValuationReportUrls(docs)}
                />
              </div>
            </CollapsibleSection>

            {/* Additional Collateral Documents */}
            <CollapsibleSection title="Additional Collateral Documents" icon={FolderOpen} defaultExpanded={true}>
              <FileUploadWithProgress
                onUploadComplete={setCollateralDocuments}
                maxFiles={10}
                label="Collateral Documents"
                hint="Additional collateral docs — name each file or fall back to the filename"
                storageKey="loan-collateral-docs"
                showDescription
              />

            </CollapsibleSection>
          </motion.div>
        )

      case 5:
        if (formData.borrowerType === BorrowerType.INSTITUTION) {
          // Institution: Shareholder & Board Members
          return (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <StepHeader icon={Users} title="Shareholder & Board Members" color="indigo" />
              <StepProgressBar
                stepNumber={5}
                completedFields={shareholderBoardMembers.length}
                totalFields={1}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Members List</h3>
                    <p className="text-sm text-gray-600">
                      {shareholderBoardMembers.length} member(s) added
                      {shareholderBoardMembers.length === 0 && " - At least one member is required"}
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => addShareholderBoardMember('shareholder')}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Shareholder
                    </button>
                    <button
                      type="button"
                      onClick={() => addShareholderBoardMember('board_member')}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Board Member
                    </button>
                  </div>
                </div>
              </div>

              {/* Per-member documents now live inside each shareholder /
                  board-member card so each upload is unambiguously tied to
                  the specific person it belongs to. */}

              {shareholderBoardMembers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No members added yet</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Add at least one shareholder or board member to continue. Shareholders require share percentage, board members require position.
                  </p>
                  <div className="flex space-x-4 justify-center">
                    <button
                      type="button"
                      onClick={() => addShareholderBoardMember('shareholder')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Shareholder
                    </button>
                    <button
                      type="button"
                      onClick={() => addShareholderBoardMember('board_member')}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Board Member
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {shareholderBoardMembers.map((member, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-3 ${member.type === 'shareholder' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                            {member.type === 'shareholder' ? (
                              <Users className={`w-5 h-5 ${member.type === 'shareholder' ? 'text-blue-600' : 'text-green-600'}`} />
                            ) : (
                              <Award className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800">
                              {member.type === 'shareholder' ? 'Shareholder' : 'Board Member'} {index + 1}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {member.type === 'shareholder' ? 'Equity stakeholder' : 'Governance representative'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeShareholderBoardMember(index)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name={`shareholderBoardMember_${index}_firstName`}
                            data-field={`shareholderBoardMember_${index}_firstName`}
                            value={member.firstName}
                            onChange={(e) => updateShareholderBoardMember(index, 'firstName', e.target.value)}
                            onBlur={() => markFieldTouched(`shareholderBoardMember_${index}_firstName`)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`shareholderBoardMember_${index}_firstName`) && getFieldError(`shareholderBoardMember_${index}_firstName`)
                              ? 'border-red-300 focus:ring-red-500'
                              : isFieldTouched(`shareholderBoardMember_${index}_firstName`) && member.firstName
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-300 focus:ring-blue-500'
                              }`}
                            placeholder="Enter first name"
                          />
                          <FieldValidationIndicator
                            isValid={!!member.firstName}
                            isDirty={isFieldTouched(`shareholderBoardMember_${index}_firstName`)}
                            error={validationErrors[`shareholderBoardMember_${index}_firstName`]}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name={`shareholderBoardMember_${index}_lastName`}
                            data-field={`shareholderBoardMember_${index}_lastName`}
                            value={member.lastName}
                            onChange={(e) => updateShareholderBoardMember(index, 'lastName', e.target.value)}
                            onBlur={() => markFieldTouched(`shareholderBoardMember_${index}_lastName`)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`shareholderBoardMember_${index}_lastName`) && getFieldError(`shareholderBoardMember_${index}_lastName`)
                              ? 'border-red-300 focus:ring-red-500'
                              : isFieldTouched(`shareholderBoardMember_${index}_lastName`) && member.lastName
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-300 focus:ring-blue-500'
                              }`}
                            placeholder="Enter last name"
                          />
                          <FieldValidationIndicator
                            isValid={!!member.lastName}
                            isDirty={isFieldTouched(`shareholderBoardMember_${index}_lastName`)}
                            error={validationErrors[`shareholderBoardMember_${index}_lastName`]}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                          <input
                            type="text"
                            value={member.middleName || ''}
                            onChange={(e) => updateShareholderBoardMember(index, 'middleName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="Enter middle name (optional)"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            National ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name={`shareholderBoardMember_${index}_nationalId`}
                            data-field={`shareholderBoardMember_${index}_nationalId`}
                            value={member.nationalId}
                            onChange={(e) => updateShareholderBoardMember(index, 'nationalId', e.target.value)}
                            onBlur={() => markFieldTouched(`shareholderBoardMember_${index}_nationalId`)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`shareholderBoardMember_${index}_nationalId`) && getFieldError(`shareholderBoardMember_${index}_nationalId`)
                              ? 'border-red-300 focus:ring-red-500'
                              : isFieldTouched(`shareholderBoardMember_${index}_nationalId`) && member.nationalId && validateNationalId(member.nationalId)
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-300 focus:ring-blue-500'
                              }`}
                            placeholder="16-digit National ID"
                            maxLength={16}
                          />
                          <FieldValidationIndicator
                            isValid={member.nationalId ? validateNationalId(member.nationalId) : false}
                            isDirty={isFieldTouched(`shareholderBoardMember_${index}_nationalId`)}
                            error={validationErrors[`shareholderBoardMember_${index}_nationalId`]}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <PhoneInput
                            defaultCountry="rw"
                            value={member.phone}
                            onChange={(value) => updateShareholderBoardMember(index, 'phone', value)}
                            onBlur={() => markFieldTouched(`shareholderBoardMember_${index}_phone`)}
                            inputClassName={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`shareholderBoardMember_${index}_phone`) && getFieldError(`shareholderBoardMember_${index}_phone`)
                              ? 'border-red-300 focus:ring-red-500'
                              : isFieldTouched(`shareholderBoardMember_${index}_phone`) && member.phone
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-300 focus:ring-blue-500'
                              }`}
                            countrySelectorStyleProps={{
                              buttonClassName: "px-3 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-white",
                            }}
                          />
                          <FieldValidationIndicator
                            isValid={!!member.phone}
                            isDirty={isFieldTouched(`shareholderBoardMember_${index}_phone`)}
                            error={validationErrors[`shareholderBoardMember_${index}_phone`]}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={member.email || ''}
                            onChange={(e) => updateShareholderBoardMember(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="email@example.com"
                          />
                        </div>

                        {member.type === 'board_member' && (
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Position <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name={`shareholderBoardMember_${index}_position`}
                              data-field={`shareholderBoardMember_${index}_position`}
                              value={member.position || ''}
                              onChange={(e) => updateShareholderBoardMember(index, 'position', e.target.value)}
                              onBlur={() => markFieldTouched(`shareholderBoardMember_${index}_position`)}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`shareholderBoardMember_${index}_position`) && getFieldError(`shareholderBoardMember_${index}_position`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`shareholderBoardMember_${index}_position`) && member.position
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              placeholder="e.g., Chairman, Director"
                            />
                            <FieldValidationIndicator
                              isValid={!!member.position}
                              isDirty={isFieldTouched(`shareholderBoardMember_${index}_position`)}
                              error={validationErrors[`shareholderBoardMember_${index}_position`]}
                            />
                          </div>
                        )}

                        {member.type === 'shareholder' && (
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Share Percentage (%) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              name={`shareholderBoardMember_${index}_sharePercentage`}
                              data-field={`shareholderBoardMember_${index}_sharePercentage`}
                              min="0"
                              max="100"
                              step="0.01"
                              value={member.sharePercentage || ''}
                              onChange={(e) => updateShareholderBoardMember(index, 'sharePercentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                              onBlur={() => markFieldTouched(`shareholderBoardMember_${index}_sharePercentage`)}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`shareholderBoardMember_${index}_sharePercentage`) && getFieldError(`shareholderBoardMember_${index}_sharePercentage`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`shareholderBoardMember_${index}_sharePercentage`) && member.sharePercentage && member.sharePercentage > 0
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              placeholder="e.g., 25.5"
                            />
                            <FieldValidationIndicator
                              isValid={member.sharePercentage ? member.sharePercentage > 0 && member.sharePercentage <= 100 : false}
                              isDirty={isFieldTouched(`shareholderBoardMember_${index}_sharePercentage`)}
                              error={validationErrors[`shareholderBoardMember_${index}_sharePercentage`]}
                            />
                          </div>
                        )}

                        <div className="md:col-span-2 space-y-1">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={member.isAlsoGuarantor || false}
                              onChange={(e) => updateShareholderBoardMember(index, 'isAlsoGuarantor', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {member.type === 'shareholder' ? 'Save this shareholder as a guarantor' : 'Save this board member as a guarantor'}
                            </span>
                          </label>
                          <p className="text-xs text-gray-500 ml-6">
                            When checked, this {member.type} will be automatically saved as a guarantor for this loan
                          </p>
                        </div>
                      </div>

                      {/* Member Documents — per-person, not generic.
                          Backend reads each from member.documents.* and
                          member.{rdbFullInformation,shareholderResolution,
                          boardResolution}, so the uploads here belong to
                          THIS specific member only. */}
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                        <h5 className="text-sm font-semibold text-gray-800">
                          Documents for {member.firstName || (member.type === 'shareholder' ? `Shareholder ${index + 1}` : `Board Member ${index + 1}`)} {member.lastName}
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FileUploadWithProgress
                            label={member.type === 'shareholder' ? 'Shareholder Identification' : 'Board Member Identification'}
                            documentTitle={`${member.firstName || (member.type === 'shareholder' ? 'Shareholder' : 'Board Member')} ${member.lastName} — Identification`.trim()}
                            hint="National ID / passport"
                            maxFiles={1}
                            multiple={false}
                            showDescription={false}
                            storageKey={`loan-app-draft:member-${index}-identification`}
                            onUploadComplete={(docs) =>
                              updateMemberStructuredDoc(index, 'identification', docs[0] ?? null)
                            }
                          />

                          <FileUploadWithProgress
                            label={member.type === 'shareholder' ? 'Shareholder CRB Report' : 'Board Member CRB Report'}
                            documentTitle={`${member.firstName || (member.type === 'shareholder' ? 'Shareholder' : 'Board Member')} ${member.lastName} — CRB Report`.trim()}
                            hint="Credit reference bureau report"
                            maxFiles={1}
                            multiple={false}
                            showDescription={false}
                            storageKey={`loan-app-draft:member-${index}-crbReport`}
                            onUploadComplete={(docs) =>
                              updateMemberStructuredDoc(index, 'crbReport', docs[0] ?? null)
                            }
                          />

                          {member.type === 'shareholder' && (
                            <>
                              <FileUploadWithProgress
                                label="Proof of Shares"
                                documentTitle={`${member.firstName || 'Shareholder'} ${member.lastName} — Proof of Shares`.trim()}
                                hint="Share certificate / equity proof"
                                maxFiles={1}
                                multiple={false}
                                showDescription={false}
                                storageKey={`loan-app-draft:member-${index}-proofOfShares`}
                                onUploadComplete={(docs) =>
                                  updateMemberStructuredDoc(index, 'proofOfShares', docs[0] ?? null)
                                }
                              />
                              <FileUploadWithProgress
                                label="Shareholder Resolution"
                                documentTitle={`${member.firstName || 'Shareholder'} ${member.lastName} — Shareholder Resolution`.trim()}
                                hint="Resolution authorising this loan"
                                maxFiles={1}
                                multiple={false}
                                showDescription={false}
                                storageKey={`loan-app-draft:member-${index}-shareholderResolution`}
                                onUploadComplete={(docs) =>
                                  updateMemberStructuredDoc(index, 'shareholderResolution', docs[0] ?? null)
                                }
                              />
                            </>
                          )}

                          {member.type === 'board_member' && (
                            <FileUploadWithProgress
                              label="Board Resolution"
                              documentTitle={`${member.firstName || 'Board Member'} ${member.lastName} — Board Resolution`.trim()}
                              hint="Board resolution document"
                              maxFiles={1}
                              multiple={false}
                              showDescription={false}
                              storageKey={`loan-app-draft:member-${index}-boardResolution`}
                              onUploadComplete={(docs) =>
                                updateMemberStructuredDoc(index, 'boardResolution', docs[0] ?? null)
                              }
                            />
                          )}

                          <FileUploadWithProgress
                            label="RDB Full Information"
                            documentTitle={`${member.firstName || (member.type === 'shareholder' ? 'Shareholder' : 'Board Member')} ${member.lastName} — RDB Full Information`.trim()}
                            hint="RDB profile printout (if applicable)"
                            maxFiles={1}
                            multiple={false}
                            showDescription={false}
                            storageKey={`loan-app-draft:member-${index}-rdbFullInformation`}
                            onUploadComplete={(docs) =>
                              updateMemberStructuredDoc(index, 'rdbFullInformation', docs[0] ?? null)
                            }
                          />
                        </div>

                        <FileUploadWithProgress
                          onUploadComplete={(docs) => updateMemberDocs(index, docs)}
                          maxFiles={10}
                          label="Additional Documents"
                          hint="Anything else relevant for this person — name each file or fall back to the filename"
                          storageKey={`loan-app-draft:member-${index}-docs`}
                          showDescription={true}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {validationErrors.shareholderBoardMembers && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {validationErrors.shareholderBoardMembers}
                  </p>
                </div>
              )}

              {/* Auto-Guarantor Display */}
              {shareholderBoardMembers.some(member => member.isAlsoGuarantor) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-5 mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Members Selected as Guarantors
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    The following members will be automatically added as guarantors:
                  </p>

                  <div className="space-y-3">
                    {shareholderBoardMembers
                      .filter(member => member.isAlsoGuarantor === true)
                      .map((member, index) => (
                        <div key={index} className="bg-white border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.type === 'shareholder' ? 'Shareholder' : 'Board Member'} •
                                {member.type === 'shareholder' && member.sharePercentage && ` ${member.sharePercentage}% shares`}
                                {member.type === 'board_member' && member.position && ` Position: ${member.position}`}
                              </p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {member.type === 'shareholder' ? 'Shareholder Guarantor' : 'Board Member Guarantor'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )
        } else {
          // Individual: Guarantor Section
          return (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <StepHeader icon={UsersIcon} title="Guarantor Information" color="teal" />


              {/* Step Progress Bar */}
              <StepProgressBar
                stepNumber={5}
                completedFields={guarantors.length + (formData.maritalStatus === MaritalStatus.MARRIED ? 1 : 0)}
                totalFields={1}
              />

              {/* Auto-Display Spouse for Married Individuals */}
              {formData.maritalStatus === MaritalStatus.MARRIED && formData.spouseInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Heart className="w-5 h-5 mr-2 text-blue-600" />
                    Automatic Guarantor (Spouse)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium">
                        {formData.spouseInfo.firstName} {formData.spouseInfo.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">National ID</p>
                      <p className="text-sm font-medium">{formData.spouseInfo.nationalId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium">{formData.spouseInfo.phone}</p>
                    </div>
                    {formData.spouseInfo.email && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium">{formData.spouseInfo.email}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-sm text-blue-700 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Spouse will be automatically added as guarantor
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Guarantors Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Additional Guarantors</h3>
                    <p className="text-sm text-gray-600">
                      {guarantors.length === 0
                        ? "Add at least one guarantor"
                        : `${guarantors.length} guarantor(s) added`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addGuarantor}
                    className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm hover:shadow"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Guarantor
                  </button>
                </div>

                {/* Per-guarantor documents (Identification + CRB Report)
                    now live inside each guarantor card so each upload is
                    unambiguously tied to the specific guarantor it
                    belongs to. */}

                {guarantors.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                      <UsersIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-4">No additional guarantors added yet</p>
                    <button
                      type="button"
                      onClick={addGuarantor}
                      className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Guarantor
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {guarantors.map((guarantor, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-teal-100 rounded-lg mr-3">
                              <UsersIcon className="w-5 h-5 text-teal-600" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-800">Guarantor {index + 1}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGuarantor(index)}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name={`guarantor_${index}_name`}
                              data-field={`guarantor_${index}_name`}
                              value={guarantor.name}
                              onChange={(e) => updateGuarantor(index, 'name', e.target.value)}
                              onBlur={() => markFieldTouched(`guarantor_${index}_name`)}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`guarantor_${index}_name`) && getFieldError(`guarantor_${index}_name`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`guarantor_${index}_name`) && guarantor.name
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              placeholder="Enter full name"
                            />
                            <FieldValidationIndicator
                              isValid={!!guarantor.name}
                              isDirty={isFieldTouched(`guarantor_${index}_name`)}
                              error={validationErrors[`guarantor_${index}_name`]}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              National ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name={`guarantor_${index}_nationalId`}
                              data-field={`guarantor_${index}_nationalId`}
                              value={guarantor.nationalId || ''}
                              onChange={(e) => updateGuarantor(index, 'nationalId', e.target.value)}
                              onBlur={() => markFieldTouched(`guarantor_${index}_nationalId`)}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`guarantor_${index}_nationalId`) && getFieldError(`guarantor_${index}_nationalId`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`guarantor_${index}_nationalId`) && guarantor.nationalId && validateNationalId(guarantor.nationalId)
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              placeholder="16-digit National ID"
                              maxLength={16}
                            />
                            <FieldValidationIndicator
                              isValid={guarantor.nationalId ? validateNationalId(guarantor.nationalId) : false}
                              isDirty={isFieldTouched(`guarantor_${index}_nationalId`)}
                              error={validationErrors[`guarantor_${index}_nationalId`]}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Phone <span className="text-red-500">*</span>
                            </label>
                            <PhoneInput
                              defaultCountry="rw"
                              value={guarantor.phone}
                              onChange={(value) => updateGuarantor(index, 'phone', value)}
                              onBlur={() => markFieldTouched(`guarantor_${index}_phone`)}
                              inputClassName={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`guarantor_${index}_phone`) && getFieldError(`guarantor_${index}_phone`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`guarantor_${index}_phone`) && guarantor.phone
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              countrySelectorStyleProps={{
                                buttonClassName: "px-3 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-white",
                              }}
                            />
                            <FieldValidationIndicator
                              isValid={!!guarantor.phone}
                              isDirty={isFieldTouched(`guarantor_${index}_phone`)}
                              error={validationErrors[`guarantor_${index}_phone`]}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                              type="email"
                              value={guarantor.email || ''}
                              onChange={(e) => updateGuarantor(index, 'email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                              placeholder="email@example.com"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Guarantor Type</label>
                            <select
                              value={guarantor.guarantorType || 'individual'}
                              onChange={(e) => updateGuarantor(index, 'guarantorType', e.target.value)}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            >
                              <option value="individual">Individual</option>
                              <option value="institution">Institution</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Guaranteed Amount ({currencyCode()})</label>
                            <MoneyInput
                              value={guarantor.guaranteedAmount || ''}
                              onChange={(v) => updateGuarantor(index, 'guaranteedAmount', v ?? undefined)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                              placeholder="Enter guaranteed amount"
                            />
                          </div>

                          <div className="md:col-span-2 space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                              value={guarantor.address || ''}
                              onChange={(e) => updateGuarantor(index, 'address', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                              placeholder="Enter guarantor address"
                            />
                          </div>
                        </div>

                        {/* Per-guarantor documents — backend reads each from
                            guarantor.documents.{identificationUrl,crbReportUrl}
                            and guarantor.additionalDocuments. */}
                        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                          <h5 className="text-sm font-semibold text-gray-800">
                            Documents for {guarantor.name || `Guarantor ${index + 1}`}
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FileUploadWithProgress
                              label="Guarantor National ID"
                              documentTitle={`${guarantor.name || `Guarantor ${index + 1}`} — National ID`}
                              hint="National ID / passport"
                              maxFiles={1}
                              multiple={false}
                              showDescription={false}
                              storageKey={`loan-app-draft:guarantor-${index}-identification`}
                              onUploadComplete={(docs) =>
                                updateGuarantorStructuredDoc(index, 'identification', docs[0] ?? null)
                              }
                            />
                            <FileUploadWithProgress
                              label="Guarantor CRB Report"
                              documentTitle={`${guarantor.name || `Guarantor ${index + 1}`} — CRB Report`}
                              hint="Credit reference bureau report"
                              maxFiles={1}
                              multiple={false}
                              showDescription={false}
                              storageKey={`loan-app-draft:guarantor-${index}-crbReport`}
                              onUploadComplete={(docs) =>
                                updateGuarantorStructuredDoc(index, 'crbReport', docs[0] ?? null)
                              }
                            />
                          </div>

                          <FileUploadWithProgress
                            onUploadComplete={(docs) => updateGuarantorDocs(index, docs)}
                            maxFiles={10}
                            label="Additional Guarantor Documents"
                            hint="Anything else relevant for this guarantor — name each file or fall back to the filename"
                            storageKey={`loan-app-draft:guarantor-${index}-docs`}
                            showDescription={true}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )
        }

      case 6:
        if (formData.borrowerType === BorrowerType.INSTITUTION) {
          // Institution: Guarantor Section (Step 6)
          return (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <StepHeader icon={UsersIcon} title="Guarantor Information" color="teal" />
              {/* Step Progress Bar */}
              <StepProgressBar
                stepNumber={6}
                completedFields={guarantors.length + (shareholderBoardMembers.filter(m => m.isAlsoGuarantor).length)}
                totalFields={1}
              />

              {/* Auto-Guarantor Display from Shareholders/Board Members */}
              {shareholderBoardMembers.some(member => member.isAlsoGuarantor) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                    Automatic Guarantors from Members
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    The following members will be automatically added as guarantors:
                  </p>

                  <div className="space-y-3">
                    {shareholderBoardMembers
                      .filter(member => member.isAlsoGuarantor === true)
                      .map((member, index) => (
                        <div key={index} className="bg-white border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.type === 'shareholder' ? 'Shareholder' : 'Board Member'} •
                                National ID: {member.nationalId} • Phone: {member.phone}
                              </p>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Auto-Guarantor
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Additional Guarantors Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Additional Guarantors</h3>
                    <p className="text-sm text-gray-600">
                      Add additional guarantors if needed (optional)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addGuarantor}
                    className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm hover:shadow"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Guarantor
                  </button>
                </div>

                {/* Per-guarantor documents (Identification + CRB Report)
                    now live inside each guarantor card so each upload is
                    unambiguously tied to the specific guarantor it
                    belongs to. */}

                {guarantors.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                      <UsersIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-2">No additional guarantors added yet</p>
                    <p className="text-xs text-gray-400 mb-4">
                      You already have {shareholderBoardMembers.filter(m => m.isAlsoGuarantor).length} auto-guarantors from members
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {guarantors.map((guarantor, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-teal-100 rounded-lg mr-3">
                              <UsersIcon className="w-5 h-5 text-teal-600" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-800">Additional Guarantor {index + 1}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGuarantor(index)}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name={`guarantor_${index}_name`}
                              data-field={`guarantor_${index}_name`}
                              value={guarantor.name}
                              onChange={(e) => updateGuarantor(index, 'name', e.target.value)}
                              onBlur={() => markFieldTouched(`guarantor_${index}_name`)}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`guarantor_${index}_name`) && getFieldError(`guarantor_${index}_name`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`guarantor_${index}_name`) && guarantor.name
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              placeholder="Enter full name"
                            />
                            <FieldValidationIndicator
                              isValid={!!guarantor.name}
                              isDirty={isFieldTouched(`guarantor_${index}_name`)}
                              error={validationErrors[`guarantor_${index}_name`]}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              National ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name={`guarantor_${index}_nationalId`}
                              data-field={`guarantor_${index}_nationalId`}
                              value={guarantor.nationalId || ''}
                              onChange={(e) => updateGuarantor(index, 'nationalId', e.target.value)}
                              onBlur={() => markFieldTouched(`guarantor_${index}_nationalId`)}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`guarantor_${index}_nationalId`) && getFieldError(`guarantor_${index}_nationalId`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`guarantor_${index}_nationalId`) && guarantor.nationalId && validateNationalId(guarantor.nationalId)
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              placeholder="16-digit National ID"
                              maxLength={16}
                            />
                            <FieldValidationIndicator
                              isValid={guarantor.nationalId ? validateNationalId(guarantor.nationalId) : false}
                              isDirty={isFieldTouched(`guarantor_${index}_nationalId`)}
                              error={validationErrors[`guarantor_${index}_nationalId`]}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Phone <span className="text-red-500">*</span>
                            </label>
                            <PhoneInput
                              defaultCountry="rw"
                              value={guarantor.phone}
                              onChange={(value) => updateGuarantor(index, 'phone', value)}
                              onBlur={() => markFieldTouched(`guarantor_${index}_phone`)}
                              inputClassName={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${isFieldTouched(`guarantor_${index}_phone`) && getFieldError(`guarantor_${index}_phone`)
                                ? 'border-red-300 focus:ring-red-500'
                                : isFieldTouched(`guarantor_${index}_phone`) && guarantor.phone
                                  ? 'border-green-300 focus:ring-green-500'
                                  : 'border-gray-300 focus:ring-blue-500'
                                }`}
                              countrySelectorStyleProps={{
                                buttonClassName: "px-3 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-white",
                              }}
                            />
                            <FieldValidationIndicator
                              isValid={!!guarantor.phone}
                              isDirty={isFieldTouched(`guarantor_${index}_phone`)}
                              error={validationErrors[`guarantor_${index}_phone`]}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                              type="email"
                              value={guarantor.email || ''}
                              onChange={(e) => updateGuarantor(index, 'email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                              placeholder="email@example.com"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Guarantor Type</label>
                            <select
                              value={guarantor.guarantorType || 'individual'}
                              onChange={(e) => updateGuarantor(index, 'guarantorType', e.target.value)}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            >
                              <option value="individual">Individual</option>
                              <option value="institution">Institution</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Guaranteed Amount ({currencyCode()})</label>
                            <MoneyInput
                              value={guarantor.guaranteedAmount || ''}
                              onChange={(v) => updateGuarantor(index, 'guaranteedAmount', v ?? undefined)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                              placeholder="Enter guaranteed amount"
                            />
                          </div>

                          <div className="md:col-span-2 space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                              value={guarantor.address || ''}
                              onChange={(e) => updateGuarantor(index, 'address', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                              placeholder="Enter guarantor address"
                            />
                          </div>
                        </div>

                        {/* Per-guarantor documents — backend reads each from
                            guarantor.documents.{identificationUrl,crbReportUrl}
                            and guarantor.additionalDocuments. */}
                        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                          <h5 className="text-sm font-semibold text-gray-800">
                            Documents for {guarantor.name || `Guarantor ${index + 1}`}
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FileUploadWithProgress
                              label="Guarantor National ID"
                              documentTitle={`${guarantor.name || `Guarantor ${index + 1}`} — National ID`}
                              hint="National ID / passport"
                              maxFiles={1}
                              multiple={false}
                              showDescription={false}
                              storageKey={`loan-app-draft:guarantor-${index}-identification`}
                              onUploadComplete={(docs) =>
                                updateGuarantorStructuredDoc(index, 'identification', docs[0] ?? null)
                              }
                            />
                            <FileUploadWithProgress
                              label="Guarantor CRB Report"
                              documentTitle={`${guarantor.name || `Guarantor ${index + 1}`} — CRB Report`}
                              hint="Credit reference bureau report"
                              maxFiles={1}
                              multiple={false}
                              showDescription={false}
                              storageKey={`loan-app-draft:guarantor-${index}-crbReport`}
                              onUploadComplete={(docs) =>
                                updateGuarantorStructuredDoc(index, 'crbReport', docs[0] ?? null)
                              }
                            />
                          </div>

                          <FileUploadWithProgress
                            onUploadComplete={(docs) => updateGuarantorDocs(index, docs)}
                            maxFiles={10}
                            label={`Additional Documents for ${guarantor.name || 'Guarantor ' + (index + 1)}`}
                            hint="Anything else relevant for this guarantor — name each file or fall back to the filename"
                            storageKey={`loan-app-draft:guarantor-inst-${index}-docs`}
                            showDescription={true}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Total Guarantors:</p>
                  <p className="text-lg font-bold text-teal-600">
                    {shareholderBoardMembers.filter(m => m.isAlsoGuarantor).length + guarantors.length}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-600">Auto-guarantors from members:</p>
                  <p className="text-sm font-medium">{shareholderBoardMembers.filter(m => m.isAlsoGuarantor).length}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-600">Additional guarantors:</p>
                  <p className="text-sm font-medium">{guarantors.length}</p>
                </div>
              </div>
            </motion.div>
          )
        } else {
    return (
      <motion.div
        key="step6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <StepHeader icon={CheckCircle} title="Review & Submit" color="green" />

        {/* Completion Meter - UPDATED to include all document types */}
        <CompletionMeter
          completedFields={
            (formData.firstName ? 1 : 0) +
            (formData.lastName ? 1 : 0) +
            (formData.nationalId ? 1 : 0) +
            (formData.dateOfBirth ? 1 : 0) +
            (formData.placeOfBirth ? 1 : 0) +
            (formData.primaryPhone ? 1 : 0) +
            (formData.nationalIdDistrict ? 1 : 0) +
            (formData.nationalIdSector ? 1 : 0) +
            (formData.address.province ? 1 : 0) +
            (formData.address.district ? 1 : 0) +
            (formData.address.sector ? 1 : 0) +
            (incomeSourcesList.length > 0 ? 1 : 0) +
            // Check both legacy AND cloud occupation documents
            ((occupationSupportingDocuments.some(d => d.description && d.file) || occupationDocuments.length > 0) ? 1 : 0) +
            (preferredPaymentFrequency ? 1 : 0) +
            (formData.purposeOfLoan ? 1 : 0) +
            (formData.branchName ? 1 : 0) +
            (formData.businessOfficer ? 1 : 0) +
            (formData.disbursedAmount > 0 ? 1 : 0) +
            (paymentPeriod ? 1 : 0) +
            // Check both spouse and additional guarantors
            ((guarantors.length > 0 || (formData.maritalStatus === MaritalStatus.MARRIED && formData.spouseInfo)) ? 1 : 0)
          }
          totalFields={20}
        />

        {/* Auto-save Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Save className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {hasUnsavedChanges ? "Saving changes..." : "All changes saved"}
              </span>
            </div>
            {lastSaved && (
              <span className="text-xs text-blue-600 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Personal Information Section - Keep existing */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Personal Information
              {formData.firstName && formData.lastName && formData.nationalId ? (
                <span className="ml-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete
                </span>
              ) : (
                <span className="ml-3 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Incomplete
                </span>
              )}
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-sm font-medium">
                  {formData.firstName} {formData.middleName || ''} {formData.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">National ID</p>
                <p className="text-sm font-mono font-medium">{formData.nationalId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date of Birth</p>
                <p className="text-sm font-medium">{formData.dateOfBirth || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Place of Birth</p>
                <p className="text-sm font-medium">{formData.placeOfBirth || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gender</p>
                <p className="text-sm font-medium capitalize">{formData.gender.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Marital Status</p>
                <p className="text-sm font-medium capitalize">{formData.maritalStatus.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ID Issuance</p>
                <p className="text-sm font-medium">
                  {formData.nationalIdDistrict && formData.nationalIdSector
                    ? `${formData.nationalIdDistrict}, ${formData.nationalIdSector}`
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Primary Phone</p>
                <p className="text-sm font-medium">{formData.primaryPhone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Alternative Phone</p>
                <p className="text-sm font-medium">{formData.alternativePhone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium">{formData.email || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Spouse Information - Keep existing */}
        {formData.maritalStatus === MaritalStatus.MARRIED && formData.spouseInfo && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-purple-600" />
                Spouse Information
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Spouse Name</p>
                  <p className="text-sm font-medium">
                    {formData.spouseInfo.firstName} {formData.spouseInfo.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Spouse National ID</p>
                  <p className="text-sm font-mono font-medium">{formData.spouseInfo.nationalId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Spouse Phone</p>
                  <p className="text-sm font-medium">{formData.spouseInfo.phone}</p>
                </div>
                {formData.spouseInfo.email && (
                  <div>
                    <p className="text-xs text-gray-500">Spouse Email</p>
                    <p className="text-sm font-medium">{formData.spouseInfo.email}</p>
                  </div>
                )}
                {formData.spouseInfo.occupation && (
                  <div>
                    <p className="text-xs text-gray-500">Spouse Occupation</p>
                    <p className="text-sm font-medium">{formData.spouseInfo.occupation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address Information - Keep existing */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-teal-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-green-600" />
              Address Information
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Province</p>
                <p className="text-sm font-medium">{formData.address.province || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">District</p>
                <p className="text-sm font-medium">{formData.address.district || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sector</p>
                <p className="text-sm font-medium">{formData.address.sector || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cell</p>
                <p className="text-sm font-medium">{formData.address.cell || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Village</p>
                <p className="text-sm font-medium">{formData.address.village || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Income Sources - Keep existing */}
        {incomeSourcesList.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-amber-600" />
                Income Sources
                <span className="ml-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {incomeSourcesList.length} source(s)
                </span>
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {incomeSourcesList.map((source, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Income Source {index + 1}</h4>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {source.frequency === IncomeFrequency.DAILY && 'Daily'}
                        {source.frequency === IncomeFrequency.WEEKLY && 'Weekly'}
                        {source.frequency === IncomeFrequency.MONTHLY && 'Monthly'}
                        {source.frequency === IncomeFrequency.QUARTERLY && 'Quarterly'}
                        {source.frequency === IncomeFrequency.ANNUALLY && 'Annually'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Source Type</p>
                        <p className="text-sm font-medium">
                          {incomeSources.find(s => s.value === source.source)?.label || source.otherSource || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-sm font-medium">{formatNumber(source.amount)} {currencyCode()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loan Details - Keep existing */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
              Loan Details
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500">Loan Amount</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatNumber(formData.disbursedAmount)} {currencyCode()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Purpose of Loan</p>
                <p className="text-sm font-medium">{formData.purposeOfLoan || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Branch Name</p>
                <p className="text-sm font-medium">{formData.branchName || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Business Officer</p>
                <p className="text-sm font-medium">{formData.businessOfficer || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Repayment Frequency</p>
                <p className="text-sm font-medium">
                  {preferredPaymentFrequency ?
                    paymentFrequencyOptions.find(opt => opt.value === preferredPaymentFrequency)?.label :
                    'Not specified'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Period</p>
                <p className="text-sm font-medium">
                  {paymentPeriod === PaymentPeriod.CUSTOM ?
                    `Custom: ${customPaymentPeriod}` :
                    paymentPeriod ?
                      paymentPeriodOptions.find(opt => opt.value === paymentPeriod)?.label :
                      'Not specified'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collateral Information - Keep existing */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-orange-600" />
              Collateral Information
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Collateral Type</p>
                <p className="text-sm font-medium capitalize">
                  {formData.collateralType?.replace(/_/g, ' ').toLowerCase() || 'Not specified'}
                </p>
              </div>
              {formData.collateralType === CollateralType.IMMOVABLE && formData.upiNumber && (
                <div>
                  <p className="text-xs text-gray-500">UPI Number</p>
                  <p className="text-sm font-mono font-medium">{formData.upiNumber}</p>
                </div>
              )}
              {formData.collateralValue && (
                <div>
                  <p className="text-xs text-gray-500">Collateral Value</p>
                  <p className="text-sm font-medium">{formatNumber(formData.collateralValue)} {currencyCode()}</p>
                </div>
              )}
              {formData.collateralDescription && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm font-medium">{formData.collateralDescription}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Guarantor Information - Keep existing */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <UsersIcon className="w-5 h-5 mr-2 text-teal-600" />
              Guarantor Information
              {guarantors.length > 0 || (formData.maritalStatus === MaritalStatus.MARRIED && formData.spouseInfo) ? (
                <span className="ml-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {guarantors.length + (formData.maritalStatus === MaritalStatus.MARRIED ? 1 : 0)} guarantor(s)
                </span>
              ) : (
                <span className="ml-3 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Required
                </span>
              )}
            </h3>
          </div>
          <div className="p-4">
            {formData.maritalStatus === MaritalStatus.MARRIED && formData.spouseInfo && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm font-medium text-green-600 mb-2 flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  Auto-Guarantor (Spouse)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Name:</span>
                    <span className="ml-1 font-medium">
                      {formData.spouseInfo.firstName} {formData.spouseInfo.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">National ID:</span>
                    <span className="ml-1 font-mono font-medium">{formData.spouseInfo.nationalId}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Phone:</span>
                    <span className="ml-1 font-medium">{formData.spouseInfo.phone}</span>
                  </div>
                </div>
              </div>
            )}

            {guarantors.length > 0 ? (
              <div className="space-y-4">
                {guarantors.map((guarantor, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Guarantor {index + 1}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500">Name:</span>
                        <span className="ml-1 font-medium">{guarantor.name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">National ID:</span>
                        <span className="ml-1 font-mono font-medium">{guarantor.nationalId}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Phone:</span>
                        <span className="ml-1 font-medium">{guarantor.phone}</span>
                      </div>
                      {guarantor.guaranteedAmount && (
                        <div>
                          <span className="text-xs text-gray-500">Guaranteed Amount:</span>
                          <span className="ml-1 font-medium">{formatNumber(guarantor.guaranteedAmount)} {currencyCode()}</span>
                        </div>
                      )}
                    </div>
                    {/* Display uploaded guarantor documents */}
                    {guarantorUploadedDocs[index]?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Uploaded Documents:</p>
                        <div className="flex flex-wrap gap-2">
                          {guarantorUploadedDocs[index].map((doc, docIdx) => (
                            <a
                              key={docIdx}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              {doc.description || doc.fileName}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !formData.spouseInfo && (
                <p className="text-sm text-gray-500 text-center py-4">No guarantors added</p>
              )
            )}
          </div>
        </div>

        {/* Documents Summary - COMPLETELY UPDATED to include all FileUploadWithProgress */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gray-600" />
              Documents Summary
            </h3>
          </div>
          <div className="p-4">
            {(() => {
              const counts = getTotalDocumentCounts();
              
              // Build rows for individual borrower
              const rows = [
                // Cloud uploads (FileUploadWithProgress)
                ...(counts.occupationCloud > 0 ? [{ label: "Occupation Documents (Cloud)", count: counts.occupationCloud, color: "blue" }] : []),
                ...(counts.loanCloud > 0 ? [{ label: "Loan Documents (Cloud)", count: counts.loanCloud, color: "indigo" }] : []),
                ...(counts.borrowerCloud > 0 ? [{ label: "Borrower Documents (Cloud)", count: counts.borrowerCloud, color: "purple" }] : []),
                ...(counts.collateralCloud > 0 ? [{ label: "Collateral Documents (Cloud)", count: counts.collateralCloud, color: "orange" }] : []),
                ...(counts.guarantorCloud > 0 ? [{ label: "Guarantor Documents (Cloud)", count: counts.guarantorCloud, color: "teal" }] : []),
                
                // Legacy uploads
                ...(counts.occupationLegacy > 0 ? [{ label: "Occupation Documents (Legacy)", count: counts.occupationLegacy, color: "blue" }] : []),
                ...(counts.loanLegacy > 0 ? [{ label: "Loan Documents (Legacy)", count: counts.loanLegacy, color: "indigo" }] : []),
                ...(counts.borrowerLegacy > 0 ? [{ label: "Borrower Documents (Legacy)", count: counts.borrowerLegacy, color: "purple" }] : []),
                ...(counts.collateralLegacy > 0 ? [{ label: "Collateral Documents (Legacy)", count: counts.collateralLegacy, color: "orange" }] : []),
                ...(counts.additionalCollateralLegacy > 0 ? [{ label: "Additional Collateral (Legacy)", count: counts.additionalCollateralLegacy, color: "yellow" }] : []),
                ...(counts.upiLegacy > 0 ? [{ label: "UPI Document", count: counts.upiLegacy, color: "amber" }] : []),
                ...(counts.guarantorLegacy > 0 ? [{ label: "Guarantor Documents (Legacy)", count: counts.guarantorLegacy, color: "teal" }] : []),
                ...(counts.spouseLegacy > 0 ? [{ label: "Spouse Documents", count: counts.spouseLegacy, color: "pink" }] : []),
              ].filter(r => r.count > 0);

              const colorMap: Record<string, string> = {
                blue: "bg-blue-50 text-blue-700",
                indigo: "bg-indigo-50 text-indigo-700",
                orange: "bg-orange-50 text-orange-700",
                amber: "bg-amber-50 text-amber-700",
                yellow: "bg-yellow-50 text-yellow-700",
                teal: "bg-teal-50 text-teal-700",
                cyan: "bg-cyan-50 text-cyan-700",
                purple: "bg-purple-50 text-purple-700",
                pink: "bg-pink-50 text-pink-700",
              };

              return (
                <div className="space-y-3">
                  {rows.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {rows.map((r) => (
                          <div key={r.label} className={`rounded-lg p-3 ${colorMap[r.color]}`}>
                            <p className="text-xs opacity-80 truncate">{r.label}</p>
                            <p className="text-lg font-bold">{r.count}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600 font-medium">Total Uploaded Files</span>
                        <span className="text-lg font-bold text-[#5B7FA2]">{counts.totalAll}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Final Checklist - Keep existing */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-green-600" />
            Final Checklist
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Personal information complete</span>
              {formData.firstName && formData.lastName && formData.nationalId ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Address verified</span>
              {formData.address.province && formData.address.district && formData.address.sector ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Income sources added</span>
              {incomeSourcesList.length > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Occupation documents uploaded</span>
              {(occupationSupportingDocuments.some(d => d.description && d.file) || occupationDocuments.length > 0) ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Loan details complete</span>
              {formData.purposeOfLoan && formData.disbursedAmount > 0 && paymentPeriod ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Collateral documented</span>
              {formData.collateralDescription ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Info className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Guarantor added</span>
              {guarantors.length > 0 || (formData.maritalStatus === MaritalStatus.MARRIED && formData.spouseInfo) ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-green-200">
            <p className="text-sm text-green-800 text-center">
              {guarantors.length > 0 || (formData.maritalStatus === MaritalStatus.MARRIED && formData.spouseInfo) ? (
                "✓ All required information provided. Ready to submit!"
              ) : (
                "⚠️ Please add at least one guarantor before submitting"
              )}
            </p>
          </div>
        </div>
      </motion.div>
    );
        }

      case 7:
        // Institution: Review Section (Step 7)
        return (
    <motion.div
      key="step7"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <StepHeader icon={CheckCircle} title="Review & Submit" color="green" />

      {/* Completion Meter - Updated for institution */}
      <CompletionMeter
        completedFields={
          (formData.institutionProfile?.institutionName ? 1 : 0) +
          (formData.institutionProfile?.licenseNumber ? 1 : 0) +
          (formData.institutionProfile?.tinNumber ? 1 : 0) +
          (formData.address.province ? 1 : 0) +
          (formData.address.district ? 1 : 0) +
          (formData.address.sector ? 1 : 0) +
          (formData.purposeOfLoan ? 1 : 0) +
          (formData.branchName ? 1 : 0) +
          (formData.businessOfficer ? 1 : 0) +
          (formData.disbursedAmount > 0 ? 1 : 0) +
          (paymentPeriod ? 1 : 0) +
          (shareholderBoardMembers.length > 0 ? 1 : 0) +
          ((guarantors.length > 0 || shareholderBoardMembers.some(m => m.isAlsoGuarantor)) ? 1 : 0)
        }
        totalFields={13}
      />

      {/* Auto-save Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Save className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              {hasUnsavedChanges ? "Saving changes..." : "All changes saved"}
            </span>
          </div>
          {lastSaved && (
            <span className="text-xs text-blue-600 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Institution Information - Keep existing */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-blue-600" />
            Institution Information
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Institution Name</p>
              <p className="text-sm font-medium">{formData.institutionProfile?.institutionName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Institution Type</p>
              <p className="text-sm font-medium capitalize">
                {formData.institutionProfile?.institutionType?.replace(/_/g, ' ').toLowerCase() || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">License Number</p>
              <p className="text-sm font-medium">{formData.institutionProfile?.licenseNumber || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">TIN Number</p>
              <p className="text-sm font-medium">{formData.institutionProfile?.tinNumber || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Registration Date</p>
              <p className="text-sm font-medium">{formData.institutionProfile?.registrationDate || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contact Person</p>
              <p className="text-sm font-medium">{formData.institutionProfile?.contactPerson || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contact Phone</p>
              <p className="text-sm font-medium">{formData.institutionProfile?.contactPhone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contact Email</p>
              <p className="text-sm font-medium">{formData.institutionProfile?.contactEmail || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information - Keep existing */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-green-600" />
            Address Information
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Province</p>
              <p className="text-sm font-medium">{formData.address.province || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">District</p>
              <p className="text-sm font-medium">{formData.address.district || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sector</p>
              <p className="text-sm font-medium">{formData.address.sector || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cell</p>
              <p className="text-sm font-medium">{formData.address.cell || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Village</p>
              <p className="text-sm font-medium">{formData.address.village || 'Not provided'}</p>
            </div>
            {formData.institutionProfile?.address?.street && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500">Street Address</p>
                <p className="text-sm font-medium">{formData.institutionProfile.address.street}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loan Details - Keep existing */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
            Loan Details
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500">Loan Amount</p>
              <p className="text-xl font-bold text-purple-600">
                {formatNumber(formData.disbursedAmount)} {currencyCode()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Purpose of Loan</p>
              <p className="text-sm font-medium">{formData.purposeOfLoan || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Branch Name</p>
              <p className="text-sm font-medium">{formData.branchName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Business Officer</p>
              <p className="text-sm font-medium">{formData.businessOfficer || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Period</p>
              <p className="text-sm font-medium">
                {paymentPeriod === PaymentPeriod.CUSTOM ?
                  `Custom: ${customPaymentPeriod}` :
                  paymentPeriod ?
                    paymentPeriodOptions.find(opt => opt.value === paymentPeriod)?.label :
                    'Not specified'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Collateral Information - Keep existing */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-orange-600" />
            Collateral Information
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Collateral Type</p>
              <p className="text-sm font-medium capitalize">
                {formData.collateralType.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
            {formData.collateralType === CollateralType.IMMOVABLE && formData.upiNumber && (
              <div>
                <p className="text-xs text-gray-500">UPI Number</p>
                <p className="text-sm font-mono font-medium">{formData.upiNumber}</p>
              </div>
            )}
            {formData.collateralValue && (
              <div>
                <p className="text-xs text-gray-500">Collateral Value</p>
                <p className="text-sm font-medium">{formatNumber(formData.collateralValue)} {currencyCode()}</p>
              </div>
            )}
            {formData.collateralDescription && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm font-medium">{formData.collateralDescription}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shareholder & Board Members - UPDATED to show cloud documents */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-600" />
            Shareholder & Board Members
          </h3>
        </div>
        <div className="p-4">
          {shareholderBoardMembers.length > 0 ? (
            <div className="space-y-4">
              {shareholderBoardMembers.map((member, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      {member.type === 'shareholder' ? 'Shareholder' : 'Board Member'} {index + 1}
                    </p>
                    {member.isAlsoGuarantor && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Also Guarantor
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-500">Name:</span>
                      <span className="ml-1 font-medium">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">National ID:</span>
                      <span className="ml-1 font-mono font-medium">{member.nationalId}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Phone:</span>
                      <span className="ml-1 font-medium">{member.phone}</span>
                    </div>
                    {member.type === 'shareholder' && member.sharePercentage && (
                      <div>
                        <span className="text-xs text-gray-500">Share %:</span>
                        <span className="ml-1 font-medium">{member.sharePercentage}%</span>
                      </div>
                    )}
                    {member.type === 'board_member' && member.position && (
                      <div>
                        <span className="text-xs text-gray-500">Position:</span>
                        <span className="ml-1 font-medium">{member.position}</span>
                      </div>
                    )}
                  </div>
                  {/* Display uploaded member documents */}
                  {memberUploadedDocs[index]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Uploaded Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {memberUploadedDocs[index].map((doc, docIdx) => (
                          <a
                            key={docIdx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            {doc.description || doc.fileName}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No members added</p>
          )}
        </div>
      </div>

      {/* Guarantor Information - UPDATED to show cloud documents */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <UsersIcon className="w-5 h-5 mr-2 text-teal-600" />
            Guarantor Information
          </h3>
        </div>
        <div className="p-4">
          {shareholderBoardMembers.filter(m => m.isAlsoGuarantor).length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm font-medium text-green-600 mb-2">Auto-Guarantors from Members</p>
              <div className="space-y-2">
                {shareholderBoardMembers.filter(m => m.isAlsoGuarantor).map((member, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{member.firstName} {member.lastName}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({member.type === 'shareholder' ? 'Shareholder' : 'Board Member'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guarantors.length > 0 ? (
            <div className="space-y-4">
              {guarantors.map((guarantor, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Additional Guarantor {index + 1}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-500">Name:</span>
                      <span className="ml-1 font-medium">{guarantor.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">National ID:</span>
                      <span className="ml-1 font-mono font-medium">{guarantor.nationalId}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Phone:</span>
                      <span className="ml-1 font-medium">{guarantor.phone}</span>
                    </div>
                  </div>
                  {/* Display uploaded guarantor documents */}
                  {guarantorUploadedDocs[index]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Uploaded Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {guarantorUploadedDocs[index].map((doc, docIdx) => (
                          <a
                            key={docIdx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            {doc.description || doc.fileName}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !shareholderBoardMembers.some(m => m.isAlsoGuarantor) && (
              <p className="text-sm text-gray-500 text-center py-4">No guarantors added</p>
            )
          )}
        </div>
      </div>

      {/* Documents Summary - COMPLETELY UPDATED for institution */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-600" />
            Documents Summary
          </h3>
        </div>
        <div className="p-4">
          {(() => {
            const counts = getTotalDocumentCounts();
            
            // Build rows for institution borrower
            const rows = [
              // Cloud uploads
              ...(counts.institutionCloud > 0 ? [{ label: "Institution Documents (Cloud)", count: counts.institutionCloud, color: "blue" }] : []),
              ...(counts.loanCloud > 0 ? [{ label: "Loan Documents (Cloud)", count: counts.loanCloud, color: "indigo" }] : []),
              ...(counts.collateralCloud > 0 ? [{ label: "Collateral Documents (Cloud)", count: counts.collateralCloud, color: "orange" }] : []),
              ...(counts.guarantorCloud > 0 ? [{ label: "Guarantor Documents (Cloud)", count: counts.guarantorCloud, color: "teal" }] : []),
              ...(counts.memberCloud > 0 ? [{ label: "Member Documents (Cloud)", count: counts.memberCloud, color: "purple" }] : []),
              
              // Legacy uploads
              ...(counts.institutionLegacy > 0 ? [{ label: "Institution Documents (Legacy)", count: counts.institutionLegacy, color: "blue" }] : []),
              ...(counts.loanLegacy > 0 ? [{ label: "Loan Documents (Legacy)", count: counts.loanLegacy, color: "indigo" }] : []),
              ...(counts.collateralLegacy > 0 ? [{ label: "Collateral Documents (Legacy)", count: counts.collateralLegacy, color: "orange" }] : []),
              ...(counts.additionalCollateralLegacy > 0 ? [{ label: "Additional Collateral (Legacy)", count: counts.additionalCollateralLegacy, color: "yellow" }] : []),
              ...(counts.upiLegacy > 0 ? [{ label: "UPI Document", count: counts.upiLegacy, color: "amber" }] : []),
              ...(counts.shareholderLegacy > 0 ? [{ label: "Shareholder Documents", count: counts.shareholderLegacy, color: "purple" }] : []),
              ...(counts.boardLegacy > 0 ? [{ label: "Board Member Documents", count: counts.boardLegacy, color: "violet" }] : []),
              ...(counts.memberAdditionalLegacy > 0 ? [{ label: "Member Additional Docs", count: counts.memberAdditionalLegacy, color: "fuchsia" }] : []),
            ].filter(r => r.count > 0);

            const colorMap: Record<string, string> = {
              blue: "bg-blue-50 text-blue-700",
              indigo: "bg-indigo-50 text-indigo-700",
              orange: "bg-orange-50 text-orange-700",
              amber: "bg-amber-50 text-amber-700",
              yellow: "bg-yellow-50 text-yellow-700",
              teal: "bg-teal-50 text-teal-700",
              cyan: "bg-cyan-50 text-cyan-700",
              purple: "bg-purple-50 text-purple-700",
              violet: "bg-violet-50 text-violet-700",
              fuchsia: "bg-fuchsia-50 text-fuchsia-700",
            };

            return (
              <div className="space-y-3">
                {rows.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {rows.map((r) => (
                        <div key={r.label} className={`rounded-lg p-3 ${colorMap[r.color]}`}>
                          <p className="text-xs opacity-80 truncate">{r.label}</p>
                          <p className="text-lg font-bold">{r.count}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600 font-medium">Total Uploaded Files</span>
                      <span className="text-lg font-bold text-[#5B7FA2]">{counts.totalAll}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Final Checklist - Keep existing */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <ClipboardList className="w-5 h-5 mr-2 text-green-600" />
          Final Checklist
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Institution information complete</span>
            {formData.institutionProfile?.institutionName && formData.institutionProfile?.licenseNumber && formData.institutionProfile?.tinNumber ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Address verified</span>
            {formData.address.province && formData.address.district && formData.address.sector ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Loan details complete</span>
            {formData.purposeOfLoan && formData.disbursedAmount > 0 && paymentPeriod ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Shareholder/Board members added</span>
            {shareholderBoardMembers.length > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Collateral documented</span>
            {formData.collateralDescription ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Info className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Guarantors (if applicable)</span>
            {guarantors.length > 0 || shareholderBoardMembers.some(m => m.isAlsoGuarantor) ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Info className="w-5 h-5 text-yellow-500" />
            )}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-green-200">
          <p className="text-sm text-green-800 text-center">
            {shareholderBoardMembers.length > 0 && formData.institutionProfile?.institutionName ? (
              "✓ All required information provided. Ready to submit!"
            ) : (
              "⚠️ Please ensure all required fields are completed before submitting"
            )}
          </p>
        </div>
      </div>
    </motion.div>
        )

      default:
        return null
    }
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Auto-save Notification */}
        <AutoSaveNotification show={!!autoSaveMessage} message={autoSaveMessage || ""} />


        <RequirementsPanel
          errors={validationErrors}
          groups={requirementGroups}
          onItemClick={scrollToField}
          isOpen={showRequirementsPanel}
          onClose={() => setShowRequirementsPanel(false)}
        />

        {/* Header */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4 sticky top-2 z-40"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Top Bar */}
          <div className="bg-[#5B7FA2] px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white flex-shrink-0" />
                <h2 className="text-sm font-semibold text-white">Loan Application</h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 bg-white/20 text-white text-[10px] rounded-full">
                  {formData.borrowerType === BorrowerType.INDIVIDUAL ? 'Individual' : 'Institution'}
                </span>
                {/* Clarifying badge: while the user is editing a draft we
                    surface its short id so it's obvious this is NOT a
                    created loan — drafts and loans are different tables
                    with different ids. */}
                {draftId && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-amber-300/30 text-white text-[10px] rounded-full border border-white/30"
                    title={`Draft id ${draftId}`}
                  >
                    Draft · {String(draftId).slice(0, 8)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Dynamic Loan Application PDF — always available at the top:
                    a printable blank form, and the filled PDF from the current state. */}
                <button
                  type="button"
                  onClick={() => setAppPdf('blank')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium transition-colors"
                  title="Download a clean printable Loan Application form"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Empty Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPdfApp(adaptWizardState(buildFullSnapshot())); setAppPdf('filled'); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-[#5B7FA2] hover:bg-white/90 text-[11px] font-semibold transition-colors shadow-sm"
                  title="Preview / download the Loan Application PDF for the current application"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Application PDF</span>
                </button>
                {hasUnsavedChanges ? (
                  <div className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 text-white/80 animate-spin" />
                    <span className="hidden sm:inline text-[10px] text-white/80">Saving...</span>
                  </div>
                ) : lastSaved ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-300" />
                    <span className="hidden sm:inline text-[10px] text-white/80">Saved</span>
                  </div>
                ) : null}
                <div className="bg-white/20 rounded px-2 py-0.5">
                  <span className="text-[10px] font-medium text-white">
                    {currentStep}/{totalSteps}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-3 py-2 bg-white">
            <TabNavigation />
          </div>

          {/* Thin Progress Bar */}
          <div className="h-0.5 bg-gray-100">
            <motion.div
              className="h-full bg-[#5B7FA2]"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </motion.div>
        )}

        {/* Main Form Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-8">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>

              <div className="flex items-center space-x-4">
                {hasUnsavedChanges && (
                  <span className="text-xs text-gray-500 flex items-center bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Saving draft...
                  </span>
                )}

                {currentStep < totalSteps ? (
                  <button
                    onClick={nextStep}
                    className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isLoading}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-base font-semibold"
                  >
                    {isSubmitting || isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing Application...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Submit Application
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
      {appPdf && (
        <LoanApplicationDocument
          mode={appPdf}
          app={appPdf === 'filled' ? pdfApp : undefined}
          organizationInfo={user?.organization}
          canArchive={false}
          onClose={() => { setAppPdf(null); setPdfApp(null); }}
        />
      )}
      <PreviewComponent />
    </div>
  )
}

const DocumentUploadComponent: React.FC<{
  title: string
  documents: Array<{ description: string; file?: File; fileUrl?: string }>
  onAddDocument: (description: string, file: File) => void
  onRemoveDocument: (index: number) => void
  onDescriptionChange: (index: number, description: string) => void
  maxFiles?: number
  icon?: React.ElementType
}> = ({
  title,
  documents,
  onAddDocument,
  onRemoveDocument,
  onDescriptionChange,
  maxFiles = 10,
  icon: Icon = FileText
}) => {
    const [newDescription, setNewDescription] = useState("")
    const [newFile, setNewFile] = useState<File | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        validateAndSetFile(file)
        if (newDescription.trim()) {
          setTimeout(() => handleAutoAdd(), 100)
        }
      }
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        validateAndSetFile(file)
        if (newDescription.trim()) {
          setTimeout(() => handleAutoAdd(), 100)
        }
      }
    }

    const validateAndSetFile = (file: File) => {
      const maxSize = 10 * 1024 * 1024
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/jpg"
      ]

      if (file.size > maxSize) {
        toast.error(`File exceeds 10MB limit`)
        return
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type. Accepted: PDF, DOC, DOCX, JPG, PNG`)
        return
      }

      setNewFile(file)
    }

    const handleAutoAdd = () => {
      if (newDescription.trim() && newFile && documents.length < maxFiles) {
        onAddDocument(newDescription.trim(), newFile)
        setNewDescription("")
        setNewFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }

    useEffect(() => {
      if (newDescription.trim() && newFile) {
        const timer = setTimeout(() => handleAutoAdd(), 300)
        return () => clearTimeout(timer)
      }
    }, [newDescription, newFile])

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${documents.length >= maxFiles ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
              }`}>
              {documents.length}/{maxFiles}
            </span>
          </div>
        </div>

        {/* Upload Form */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="grid md:grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Document description"
                maxLength={100}
              />
              <span className="absolute right-2 top-2 text-xs text-gray-400">
                {newDescription.length}/100
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                {newFile ? 'Change file' : 'Choose file'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />

              {newFile && (
                <button
                  type="button"
                  onClick={() => {
                    setNewFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {newFile && (
            <div className="mt-2 text-sm text-gray-600 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-500" />
              <span className="truncate">{newFile.name}</span>
              <span className="ml-2 text-xs text-gray-400">({formatFileSize(newFile.size)})</span>
            </div>
          )}

          {newDescription.trim() && newFile && documents.length < maxFiles && (
            <div className="mt-2 text-xs text-green-600 flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready to add - click "Add" or wait for auto-add
            </div>
          )}
        </div>

        {/* Documents List */}
        {documents.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={doc.description}
                      onChange={(e) => onDescriptionChange(index, e.target.value)}
                      className="w-full text-sm font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                      placeholder="Document description..."
                    />
                    {doc.file && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {doc.file.name} • {formatFileSize(doc.file.size)}
                      </p>
                    )}
                    {doc.fileUrl && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                        File uploaded
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveDocument(index)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg text-red-500 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Icon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No documents added yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first document above</p>
          </div>
        )}
      </div>
    )
  }


export default CompactLoanApplicationForm

// @ts-nocheck
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandSpinner } from "@/components/ui/TableLoader";
import { currencyCode , currencyLocale } from "@/lib/currency/format";
import {
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  ArrowRight,
  Clock,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Building2,
} from 'lucide-react';
import {
  listDrafts,
  deleteDraft,
  subscribe,
  draftBorrowerLabel,
  draftLoanAmount,
  DraftRecord,
} from '@/lib/draftLoanApplications';
import { useDocumentPreview } from '@/components/workflow/SmartDocumentPreview';

const PAGE_SIZE = 10;

const formatRelative = (iso: string): string => {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days} d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
};

const formatMoney = (n: number | null): string => {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
};

// ── Pretty-print helpers used by the Draft Details modal tables ─────────
const fmtVal = (v: any): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return new Intl.NumberFormat('en-US').format(v);
  return String(v);
};

const fmtCurrencyRWF = (v: any): string => {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(currencyLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtDate = (v: any): string => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(v);
  }
};

const titleize = (s: any): string => {
  if (!s) return '—';
  return String(s)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const composeAddress = (a: any): string => {
  if (!a || typeof a !== 'object') return '—';
  const parts = [a.village, a.cell, a.sector, a.district, a.province, a.country]
    .filter((x) => x && String(x).trim());
  return parts.length ? parts.join(', ') : '—';
};

// Renders a 4-column key/value row (Field | Value | Field | Value).
const Row: React.FC<{
  label1: string; value1: React.ReactNode;
  label2?: string; value2?: React.ReactNode;
}> = ({ label1, value1, label2, value2 }) => (
  <tr className="hover:bg-gray-50">
    <td className="px-3 py-2 text-gray-700 font-semibold w-1/4 align-top">{label1}</td>
    <td className="px-3 py-2 text-gray-900 align-top break-words">{value1 ?? '—'}</td>
    {label2 !== undefined ? (
      <>
        <td className="px-3 py-2 text-gray-700 font-semibold w-1/4 align-top">{label2}</td>
        <td className="px-3 py-2 text-gray-900 align-top break-words">{value2 ?? '—'}</td>
      </>
    ) : (
      <td className="px-3 py-2" colSpan={2} />
    )}
  </tr>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <tr className="bg-gray-100">
    <td colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
      {title}
    </td>
  </tr>
);

const SectionTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3">
    <table className="w-full text-xs">
      <tbody className="divide-y divide-gray-200">{children}</tbody>
    </table>
  </div>
);

// Compact summary chip for nested-list counts.
const CountChip: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium mr-1 mb-1">
    {label}: <span className="font-bold">{n}</span>
  </span>
);

// One previewable document. `url` is required; `description` is shown as
// the row label in the docs list; `category` groups rows in the UI.
interface DocItem {
  url: string;
  description: string;
  category: string;
}

// Counts every URL-bearing entry across a draft's document arrays — kept
// for the optional summary chip strip at the top of the docs section.
const countDocs = (arr: any): number => {
  if (!arr) return 0;
  if (typeof arr === 'string') return arr.trim() ? 1 : 0;
  if (Array.isArray(arr)) {
    return arr.reduce((acc: number, v: any) => acc + countDocs(v), 0);
  }
  if (typeof arr === 'object') {
    if (arr.url && String(arr.url).trim()) return 1;
    return Object.values(arr).reduce((acc: number, v: any) => acc + countDocs(v as any), 0);
  }
  return 0;
};

// Extract every URL-bearing entry under `node` into a flat list of DocItem.
// Handles four shapes the create page persists:
//   - "https://…"                                  → one doc
//   - ["https://…", "https://…"]                   → many docs
//   - { url: "https://…", description?: "…" }      → one doc
//   - [{ url, description, uploadedAt? }, …]       → many docs
//   - { someKey: <any of the above>, … }           → recursed
const collect = (node: any, category: string, base: string, out: DocItem[]) => {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    const s = node.trim();
    if (!s) return;
    const fileName = (() => {
      try { return decodeURIComponent(s.split('?')[0].split('#')[0].split('/').pop() || ''); }
      catch { return s.split('/').pop() || ''; }
    })();
    out.push({ url: s, description: base || fileName || 'Document', category });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => collect(v, category, base ? `${base} #${i + 1}` : `Item #${i + 1}`, out));
    return;
  }
  if (typeof node === 'object') {
    if (node.url && typeof node.url === 'string' && node.url.trim()) {
      const desc =
        (typeof node.description === 'string' && node.description.trim()) ||
        (typeof node.name === 'string' && node.name.trim()) ||
        (typeof node.title === 'string' && node.title.trim()) ||
        base ||
        (() => {
          try { return decodeURIComponent(String(node.url).split('?')[0].split('/').pop() || ''); }
          catch { return ''; }
        })() ||
        'Document';
      out.push({ url: String(node.url), description: desc, category });
      return;
    }
    Object.entries(node).forEach(([k, v]) => {
      const niceKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace(/_/g, ' ').trim();
      collect(v, category, base ? `${base} — ${niceKey}` : niceKey, out);
    });
  }
};

const collectAllDocs = (data: Record<string, any>): DocItem[] => {
  const groups: Array<[string, any, string]> = [
    ['Borrower', data?.borrowerDocuments, 'Borrower Document'],
    ['Occupation', data?.occupationDocuments, 'Occupation Document'],
    ['Loan', data?.loanDocuments, 'Loan Document'],
    ['Institution', data?.institutionDocuments, 'Institution Document'],
    ['Institution — Legal', data?.institutionLegalDocumentUrls, 'Institution Legal'],
    ['Institution — Cooperative Legal', data?.cooperativeLegalDocumentUrls, 'Cooperative Legal'],
    ['Institution — Other Legal', data?.otherInstitutionLegalDocumentUrls, 'Other Institution Legal'],
    ['Institution — License', data?.institutionLicenseUrls, 'Institution License'],
    ['Institution — Trading License', data?.institutionTradingLicenseUrls, 'Trading License'],
    ['Institution — Registration', data?.institutionRegistrationUrls, 'Registration Certificate'],
    ['Shareholders / Board (legacy)', data?.shareholderDocuments, 'Shareholder Document'],
    ['Shareholders / Board (legacy)', data?.boardMemberDocuments, 'Board Member Document'],
    ['Members — Per-Member', data?.memberStructuredDocs, 'Member Document'],
    ['Members — Additional', data?.memberUploadedDocs, 'Member Additional Document'],
    ['Guarantors (legacy)', data?.guarantorDocuments, 'Guarantor Document'],
    ['Guarantors — Per-Guarantor', data?.guarantorStructuredDocs, 'Guarantor Document'],
    ['Guarantors — Additional', data?.guarantorUploadedDocs, 'Guarantor Additional Document'],
    ['Collateral', data?.collateralDocuments, 'Collateral Document'],
    ['Collateral — Proof of Ownership', data?.proofOfOwnershipUrls, 'Proof of Ownership'],
    ['Collateral — Owner ID', data?.ownerIdentificationUrls, 'Owner Identification'],
    ['Collateral — Legal', data?.legalDocumentUrls, 'Legal Document'],
    ['Collateral — Physical Evidence', data?.physicalEvidenceUrls, 'Physical Evidence'],
    ['Collateral — Valuation Report', data?.valuationReportUrls, 'Valuation Report'],
    ['Collateral — Additional', data?.additionalCollateralDocUrls, 'Additional Collateral Document'],
    ['Collateral — UPI', data?.upiDocumentUrl, 'UPI Document'],
    ['Spouse — Marriage Certificate', data?.marriageCertificateUrls, 'Marriage Certificate'],
    ['Spouse — Identification', data?.spouseIdentificationUrls, 'Spouse Identification'],
    ['Spouse — CRB Report', data?.spouseCrbReportUrls, 'Spouse CRB Report'],
    ['Witness — Identification', data?.witnessIdentificationUrls, 'Witness Identification'],
    ['Witness — CRB Report', data?.witnessCrbReportUrls, 'Witness CRB Report'],
  ];
  const out: DocItem[] = [];
  groups.forEach(([cat, node, fallbackBase]) => collect(node, cat, fallbackBase, out));
  // De-dupe by URL (same file shouldn't appear twice even if pulled
  // through two different per-section keys).
  const seen = new Set<string>();
  return out.filter((d) => {
    if (seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });
};

const extFromUrl = (url: string): string => {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const last = clean.split('/').pop() || '';
    const dot = last.lastIndexOf('.');
    return dot < 0 ? '' : last.slice(dot + 1).toUpperCase();
  } catch {
    return '';
  }
};

const extColor = (ext: string): string => {
  const e = ext.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(e)) return 'bg-pink-50 text-pink-700 border-pink-200';
  if (e === 'pdf') return 'bg-red-50 text-red-700 border-red-200';
  if (['doc', 'docx', 'odt', 'rtf'].includes(e)) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(e)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['ppt', 'pptx', 'odp', 'key'].includes(e)) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(e)) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(e)) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

// Renders the structured list of every uploaded document tied to this
// draft, grouped by category. Each row exposes a "View" button that
// opens SmartDocumentPreview via the provided `onPreview` handler.
const DocumentsList: React.FC<{
  data: Record<string, any>;
  onPreview: (url: string, fileName?: string, fileType?: string) => void;
}> = ({ data, onPreview }) => {
  const docs = useMemo(() => collectAllDocs(data || {}), [data]);
  const grouped = useMemo(() => {
    const map = new Map<string, DocItem[]>();
    docs.forEach((d) => {
      const list = map.get(d.category) || [];
      list.push(d);
      map.set(d.category, list);
    });
    return Array.from(map.entries());
  }, [docs]);

  if (docs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-xs text-gray-500">
        No documents uploaded yet for this draft.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
        <span>Uploaded Documents ({docs.length})</span>
        <span className="text-[10px] font-normal text-gray-500 normal-case">Click View to preview inline</span>
      </div>
      <div className="divide-y divide-gray-200">
        {grouped.map(([category, list]) => (
          <div key={category}>
            <div className="bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              {category} <span className="text-gray-400 font-normal">({list.length})</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {list.map((d, i) => {
                  const ext = extFromUrl(d.url);
                  let fileName = '';
                  try { fileName = decodeURIComponent(d.url.split('?')[0].split('#')[0].split('/').pop() || ''); }
                  catch { fileName = d.url.split('/').pop() || ''; }
                  return (
                    <tr key={`${category}-${i}-${d.url}`} className="hover:bg-blue-50/40">
                      <td className="px-3 py-2 w-10 text-gray-400 text-[11px]">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 truncate max-w-[360px]" title={d.description}>
                          {d.description || 'Document'}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[360px]" title={fileName}>
                          {fileName || d.url}
                        </div>
                      </td>
                      <td className="px-3 py-2 w-20">
                        {ext ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${extColor(ext)}`}>{ext}</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 w-32 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onPreview(d.url, d.description || fileName, ext.toLowerCase())}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px]"
                            title="Preview"
                          >
                            <Eye className="w-3 h-3" /> View Draft
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

// Renders the full structured detail tables for a draft snapshot. Mirrors
// the style of the pendingLoan "View Details" modal — section headers +
// 2x (label/value) compact rows — so the user never sees raw JSON.
const DraftDetailsTables: React.FC<{
  data: Record<string, any>;
  onPreview: (url: string, fileName?: string, fileType?: string) => void;
}> = ({ data, onPreview }) => {
  const form: any = data?.formData || {};
  const isInstitution = (form?.borrowerType || data?.borrowerType) === 'institution';
  const inst: any = form?.institutionProfile || {};
  const spouse: any = form?.spouseInfo || {};
  const parents: any = form?.parentsInformation || {};
  const addr: any = form?.address || {};
  const incomeSourcesList: any[] = Array.isArray(data?.incomeSourcesList) ? data.incomeSourcesList : [];
  const guarantors: any[] = Array.isArray(data?.guarantors) ? data.guarantors : [];
  const members: any[] = Array.isArray(data?.shareholderBoardMembers) ? data.shareholderBoardMembers : [];

  return (
    <div className="space-y-3">
      {/* Basic */}
      <SectionTable>
        <SectionHeader title="Basic Information" />
        <Row
          label1="Borrower Type"
          value1={
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${isInstitution ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
              {isInstitution ? 'Institution' : 'Individual'}
            </span>
          }
          label2="Current Step"
          value2={fmtVal(data?.currentStep)}
        />
        <Row
          label1="Branch"
          value1={fmtVal(form.branchName)}
          label2="Business Officer"
          value2={fmtVal(form.businessOfficer)}
        />
        <Row
          label1="Purpose of Loan"
          value1={fmtVal(form.purposeOfLoan)}
          label2="Requested Amount"
          value2={<span className="font-semibold text-green-700">{fmtCurrencyRWF(form.disbursedAmount)}</span>}
        />
        <Row
          label1="Business Type"
          value1={titleize(form.businessType)}
          label2="Business Structure"
          value2={titleize(form.businessStructure)}
        />
        <Row
          label1="Economic Sector"
          value1={titleize(form.economicSector)}
          label2="Preferred Payment Frequency"
          value2={titleize(form.preferredPaymentFrequency)}
        />
        <Row
          label1="Payment Period"
          value1={fmtVal(form.paymentPeriod || data?.paymentPeriod)}
          label2="Custom Payment Period"
          value2={fmtVal(form.customPaymentPeriod || data?.customPaymentPeriod)}
        />
        {form.loanNotes ? (
          <tr className="hover:bg-gray-50">
            <td className="px-3 py-2 text-gray-700 font-semibold align-top">Loan Notes</td>
            <td className="px-3 py-2 text-gray-900" colSpan={3}>{form.loanNotes}</td>
          </tr>
        ) : null}
      </SectionTable>

      {/* Borrower / Institution */}
      {isInstitution ? (
        <SectionTable>
          <SectionHeader title="Institution Profile" />
          <Row label1="Institution Name" value1={fmtVal(inst.institutionName)} label2="Institution Type" value2={titleize(inst.institutionType)} />
          <Row label1="License Number" value1={fmtVal(inst.licenseNumber)} label2="TIN Number" value2={fmtVal(inst.tinNumber)} />
          <Row label1="Registration Date" value1={fmtDate(inst.registrationDate)} label2="Contact Person" value2={fmtVal(inst.contactPerson)} />
          <Row label1="Contact Phone" value1={fmtVal(inst.contactPhone)} label2="Contact Email" value2={fmtVal(inst.contactEmail || inst.email)} />
          <Row label1="Headquarter Address" value1={fmtVal(inst.headquarterAddress || inst.address)} label2="Website" value2={fmtVal(inst.website)} />
        </SectionTable>
      ) : (
        <>
          <SectionTable>
            <SectionHeader title="Borrower" />
            <Row label1="First Name" value1={fmtVal(form.firstName)} label2="Last Name" value2={fmtVal(form.lastName)} />
            <Row label1="Middle Name" value1={fmtVal(form.middleName)} label2="National ID" value2={fmtVal(form.nationalId)} />
            <Row label1="Gender" value1={titleize(form.gender)} label2="Date of Birth" value2={fmtDate(form.dateOfBirth)} />
            <Row label1="Marital Status" value1={titleize(form.maritalStatus)} label2="Place of Birth" value2={fmtVal(form.placeOfBirth)} />
            <Row label1="Primary Phone" value1={fmtVal(form.primaryPhone)} label2="Alternative Phone" value2={fmtVal(form.alternativePhone)} />
            <Row label1="Email" value1={fmtVal(form.email)} label2="Occupation" value2={fmtVal(form.occupation)} />
            <Row label1="Monthly Income" value1={fmtCurrencyRWF(form.monthlyIncome)} label2="Income Source" value2={fmtVal(form.incomeSource)} />
            <Row label1="Relationship with NDFSP" value1={titleize(form.relationshipWithNDFSP)} label2="Previous Loans Paid On Time" value2={fmtVal(form.previousLoansPaidOnTime)} />
            <Row label1="ID District" value1={fmtVal(form.nationalIdDistrict)} label2="ID Sector" value2={fmtVal(form.nationalIdSector)} />
            {form.borrowerNotes ? (
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-semibold align-top">Borrower Notes</td>
                <td className="px-3 py-2 text-gray-900" colSpan={3}>{form.borrowerNotes}</td>
              </tr>
            ) : null}
          </SectionTable>

          <SectionTable>
            <SectionHeader title="Address" />
            <Row label1="Country" value1={fmtVal(addr.country)} label2="Province" value2={fmtVal(addr.province)} />
            <Row label1="District" value1={fmtVal(addr.district)} label2="Sector" value2={fmtVal(addr.sector)} />
            <Row label1="Cell" value1={fmtVal(addr.cell)} label2="Village" value2={fmtVal(addr.village)} />
            <Row label1="Full Address" value1={composeAddress(addr)} />
          </SectionTable>

          {(parents.motherFullName || parents.fatherFullName) && (
            <SectionTable>
              <SectionHeader title="Parents Information" />
              <Row label1="Mother — Full Name" value1={fmtVal(parents.motherFullName)} label2="Father — Full Name" value2={fmtVal(parents.fatherFullName)} />
            </SectionTable>
          )}

          {spouse && (spouse.firstName || spouse.nationalId || spouse.fullName) ? (
            <SectionTable>
              <SectionHeader title="Spouse Information" />
              <Row label1="First Name" value1={fmtVal(spouse.firstName)} label2="Last Name" value2={fmtVal(spouse.lastName)} />
              <Row label1="National ID" value1={fmtVal(spouse.nationalId)} label2="Phone" value2={fmtVal(spouse.phone || spouse.primaryPhone)} />
              <Row label1="Date of Birth" value1={fmtDate(spouse.dateOfBirth)} label2="Occupation" value2={fmtVal(spouse.occupation)} />
              <Row label1="Monthly Income" value1={fmtCurrencyRWF(spouse.monthlyIncome)} label2="Relationship" value2={titleize(spouse.relationship)} />
            </SectionTable>
          ) : null}
        </>
      )}

      {/* Income Sources */}
      {incomeSourcesList.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
            Income Sources ({incomeSourcesList.length})
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Source</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Frequency</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {incomeSourcesList.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700">{i + 1}</td>
                  <td className="px-3 py-2 text-gray-900">{fmtVal(s.source || s.selectedIncomeSource || s.otherIncomeSource)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtCurrencyRWF(s.amount || s.incomeAmount)}</td>
                  <td className="px-3 py-2 text-gray-700">{titleize(s.frequency || s.incomeFrequency)}</td>
                  <td className="px-3 py-2 text-gray-500">{fmtVal(s.description || s.notes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shareholders / Board Members */}
      {members.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
            Shareholders / Board Members ({members.length})
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Role</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">National ID</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Shares %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((m: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${(m.role || m.memberType) === 'board_member'
                      ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                      {titleize(m.role || m.memberType)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900">{fmtVal(m.fullName || m.name)}</td>
                  <td className="px-3 py-2 text-gray-700">{fmtVal(m.nationalId)}</td>
                  <td className="px-3 py-2 text-gray-700">{fmtVal(m.phone || m.primaryPhone)}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{m.sharePercentage ?? m.sharesPercentage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Guarantors */}
      {guarantors.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
            Guarantors ({guarantors.length})
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">National ID</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Guaranteed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {guarantors.map((g: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium">
                      {titleize(g.guarantorType || 'individual')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900">{fmtVal(g.name || g.fullName)}</td>
                  <td className="px-3 py-2 text-gray-700">{fmtVal(g.nationalId)}</td>
                  <td className="px-3 py-2 text-gray-700">{fmtVal(g.phone || g.primaryPhone)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtCurrencyRWF(g.guaranteedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Collateral */}
      {(form.collateralType || form.collateralDescription || form.upiNumber || form.marketValue || form.collateralValue) && (
        <SectionTable>
          <SectionHeader title="Collateral" />
          <Row label1="Type" value1={titleize(form.collateralType)} label2="Owner Info" value2={fmtVal(form.collateralOwnerInfo)} />
          <Row label1="UPI Number" value1={fmtVal(form.upiNumber)} label2="Location" value2={fmtVal(form.collateralLocation)} />
          <Row label1="Market Value" value1={fmtCurrencyRWF(form.marketValue)} label2="Insurance Value" value2={fmtCurrencyRWF(form.insuranceValue)} />
          <Row label1="Forced Sale Value" value1={fmtCurrencyRWF(form.forcedSaleValue)} label2="Collateral Value" value2={fmtCurrencyRWF(form.collateralValue)} />
          <Row label1="Valuation Date" value1={fmtDate(form.valuationDate)} label2="Valued By" value2={fmtVal(form.valuedBy)} />
          {form.collateralDescription ? (
            <tr className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-700 font-semibold align-top">Description</td>
              <td className="px-3 py-2 text-gray-900" colSpan={3}>{form.collateralDescription}</td>
            </tr>
          ) : null}
          {form.collateralNotes ? (
            <tr className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-700 font-semibold align-top">Notes</td>
              <td className="px-3 py-2 text-gray-900" colSpan={3}>{form.collateralNotes}</td>
            </tr>
          ) : null}
        </SectionTable>
      )}

      {/* Documents — full list with View buttons */}
      <DocumentsList data={data} onPreview={onPreview} />
    </div>
  );
};

export default function DraftLoanApplicationsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewing, setViewing] = useState<DraftRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DraftRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { openPreview, PreviewComponent } = useDocumentPreview();

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await listDrafts();
      setDrafts(list);
    } catch {
      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribe(() => { refresh(); });
    return () => { unsub(); };
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter((d) => {
      const haystack = [
        d.id,
        draftBorrowerLabel(d),
        String(d.data?.borrowerType || ''),
        String(d.data?.loanPurpose || ''),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [drafts, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const handleContinue = (d: DraftRecord) => {
    router.push(`/dashboard/client/loanapplication/create?draftId=${encodeURIComponent(d.id)}`);
  };

  const handleDelete = async (d: DraftRecord) => {
    try {
      await deleteDraft(d.id);
    } catch {
      // ignore; refresh below will still reflect server state
    }
    setConfirmDelete(null);
    await refresh();
  };

  return (
    <div className="min-h-screen bg-white py-4">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-[#5B7FA2] p-2 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Loan Application Drafts</h1>
                <p className="text-xs text-gray-500">
                  Auto-saved on this browser. Drafts persist across logout/login on the same device.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/dashboard/client/loanapplication/create')}
                className="flex items-center px-3 py-2 bg-[#5B7FA2] text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Application
              </button>
              <button
                onClick={refresh}
                className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                title="Reload from local storage"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          {/* Status pills */}
          <div className="flex space-x-2 mb-3">
            <div className="flex items-center px-4 py-2 rounded-lg bg-[#5B7FA2] text-white text-sm font-medium">
              <Clock className="w-4 h-4 mr-2" />
              Drafts ({drafts.length})
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by draft id, Customer Name, purpose…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </motion.div>

        {/* Loading state — shown while fetching drafts (initial load OR
            manual refresh). Suppresses the empty-state flash that would
            otherwise appear before drafts arrive. */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center"
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <BrandSpinner size="lg" />
              <p className="text-sm text-gray-700 font-medium">Loading loan application drafts…</p>
              <p className="text-xs text-gray-500">Fetching the most recent autosaved progress from your account.</p>
            </div>
          </motion.div>
        )}

        {/* Empty state — only after the fetch settles with no results */}
        {!isLoading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-[#5B7FA2]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">No drafts yet</h3>
            <p className="text-xs text-gray-500 mb-4">
              When you start creating a loan application, this page saves your progress automatically.
            </p>
            <button
              onClick={() => router.push('/dashboard/client/loanapplication/create')}
              className="inline-flex items-center px-4 py-2 bg-[#5B7FA2] text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Start a new application
            </button>
          </motion.div>
        )}

        {/* Table */}
        {!isLoading && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Customer Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Requested Amount</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {pageRows.map((d, idx) => {
                      // Read from the snapshot the way the details modal does:
                      // formData lives at data.formData (current shape) with a
                      // flat fallback for older drafts saved before nesting.
                      const form: any = d.data?.formData || d.data || {};
                      const inst: any = form?.institutionProfile || {};
                      const isInstitution = (form?.borrowerType || d.data?.borrowerType) === 'institution';

                      // Borrower display — mirrors the modal's "First Name +
                      // Last Name" rendering. For institutions we use the
                      // institution name. Falls back to draftBorrowerLabel
                      // when neither path yields anything.
                      const fullName = `${form.firstName || ''} ${form.lastName || ''}`.trim();
                      const primaryName = isInstitution
                        ? (inst.institutionName || draftBorrowerLabel(d))
                        : (fullName || draftBorrowerLabel(d));
                      const sub = isInstitution
                        ? (inst.contactPerson || inst.institutionType || 'Institution')
                        : (form.nationalId
                          ? `NID: ${form.nationalId}`
                          : (form.primaryPhone || form.email || 'Individual'));
                      return (
                        <motion.tr
                          key={d.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 6 }}
                          className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors"
                        >
                          <td className="px-3 py-2">
                            <div className="w-7 h-7 bg-[#5B7FA2] rounded-lg flex items-center justify-center shadow-sm">
                              <span className="text-xs font-bold text-white">
                                {startIndex + idx + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200"
                                title="This is a draft — it has not been submitted as a loan application yet"
                              >
                                Draft — not submitted
                              </span>
                              {(d as any).source === 'borrower_invitation' && (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded border ${(d as any).borrowerCompletedAt ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}
                                  title={(d as any).borrowerCompletedAt ? 'The borrower completed their portion via an invitation link' : 'Created from a borrower invitation — awaiting the borrower'}
                                >
                                  {(d as any).borrowerCompletedAt ? 'From invitation · completed' : 'From invitation · pending'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isInstitution ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isInstitution ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate max-w-[220px]" title={primaryName}>
                                  {primaryName}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate max-w-[220px]" title={sub}>
                                  {sub}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${isInstitution ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                              {isInstitution ? 'Institution' : 'Individual'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-semibold text-green-700 text-sm">
                              {fmtCurrencyRWF(form.disbursedAmount ?? draftLoanAmount(d))}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleContinue(d)}
                                className="p-1.5 rounded transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                                title="Continue this draft"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setViewing(d)}
                                className="p-1.5 rounded transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                                title="View draft application" aria-label="View draft application"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(d)}
                                className="p-1.5 rounded transition-colors bg-red-50 text-red-600 hover:bg-red-100"
                                title="Delete draft"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold">{Math.min(startIndex + PAGE_SIZE, filtered.length)}</span> of{' '}
                    <span className="font-semibold">{filtered.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="p-1.5 border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-700">
                      Page {safePage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="p-1.5 border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* View modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setViewing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#5B7FA2] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-white" />
                  <div>
                    <h2 className="text-sm font-bold text-white leading-tight">Draft Details</h2>
                    <p className="text-[11px] text-white/80 font-mono">{viewing.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
   
   
                </div>
                <DraftDetailsTables data={viewing.data || {}} onPreview={openPreview} />
              </div>
              <div className="border-t border-gray-200 px-4 py-2 flex justify-end gap-2">
                <button
                  onClick={() => setViewing(null)}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => { const d = viewing; setViewing(null); handleContinue(d); }}
                  className="px-3 py-1.5 text-xs rounded bg-[#5B7FA2] text-white hover:bg-blue-700 flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Delete this draft?</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Draft <span className="font-mono">{confirmDelete.id}</span> will be permanently
                    removed from this browser. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart document preview portal — opened from any "View" button
          inside the Draft Details modal. */}
      <PreviewComponent />
    </div>
  );
}


