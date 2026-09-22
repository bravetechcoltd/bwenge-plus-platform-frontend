"use client"

import { useState, useCallback, useRef } from "react"
import Cookies from "js-cookie"

/**
 * ============================================================================
 * Document upload (CD-001 §4)
 * ============================================================================
 *
 * Uploads a file to Cloudinary through the API, reporting real progress.
 *
 * Adapted from the proven implementation in `/docs/hitcodes.tsx`. The shape of
 * the result and the XHR-based progress are kept because they work; the auth
 * and endpoint are this project's.
 *
 * ── Why XMLHttpRequest ─────────────────────────────────────────────────────
 *
 * `fetch` cannot report upload progress — it resolves when the response
 * arrives, with nothing in between. For a course video that is several
 * minutes of silence, which reads as a hung page. XHR exposes
 * `upload.onprogress`, so this is one of the few places where the older API is
 * the right one.
 */

export interface UploadedDocument {
  url: string
  /**
   * Cloudinary's identifier for the stored file.
   *
   * Carried through the draft so that reopening and re-saving a draft
   * recognises a file it has already uploaded, rather than sending it again
   * and leaving duplicates behind.
   */
  publicId: string
  fileName: string
  fileSize: number
  fileType: string
  uploadedAt: string
  description?: string
}

export interface UploadProgress {
  fileName: string
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  url?: string
  error?: string
  description?: string
}

function authToken(): string | undefined {
  return Cookies.get("bwenge_token") || undefined
}

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const abortControllers = useRef<Map<string, XMLHttpRequest>>(new Map())

  const updateProgress = useCallback((fileName: string, updates: Partial<UploadProgress>) => {
    setUploadProgress((prev) => {
      const existing = prev.find((p) => p.fileName === fileName)
      if (!existing) {
        return [...prev, { fileName, progress: 0, status: "pending", ...updates }]
      }
      return prev.map((p) => (p.fileName === fileName ? { ...p, ...updates } : p))
    })
  }, [])

  const uploadSingle = useCallback(
    async (file: File, description?: string): Promise<UploadedDocument | null> => {
      const formData = new FormData()
      // Matches the field the API's multer handler expects.
      formData.append("document", file)

      updateProgress(file.name, { fileName: file.name, progress: 0, status: "uploading" })

      try {
        const xhr = new XMLHttpRequest()
        abortControllers.current.set(file.name, xhr)

        const result = await new Promise<UploadedDocument>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              updateProgress(file.name, {
                progress: Math.round((event.loaded / event.total) * 100),
              })
            }
          })

          xhr.addEventListener("load", () => {
            // 2xx, not 200 exactly: a 201 is a success too, and treating it as
            // a failure would strand an upload that actually worked.
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText)
                if (response.success && response.data) {
                  resolve({ ...response.data, description })
                } else {
                  reject(new Error(response.message || "Upload failed"))
                }
              } catch {
                reject(new Error("The server returned an unreadable response"))
              }
            } else {
              let message = `Upload failed (${xhr.status})`
              try {
                const body = JSON.parse(xhr.responseText)
                if (body?.message) message = body.message
              } catch {
                // Keep the status-code message.
              }
              reject(new Error(message))
            }
          })

          xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))

          xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL}/upload/document`)
          const token = authToken()
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
          xhr.send(formData)
        })

        updateProgress(file.name, { status: "success", progress: 100, url: result.url })
        setUploadedDocuments((prev) => [...prev, result])
        abortControllers.current.delete(file.name)
        return result
      } catch (error: any) {
        updateProgress(file.name, { status: "error", error: error?.message ?? "Upload failed" })
        abortControllers.current.delete(file.name)
        return null
      }
    },
    [updateProgress]
  )

  const uploadMultiple = useCallback(
    async (files: File[], descriptions?: string[]): Promise<UploadedDocument[]> => {
      setIsUploading(true)
      setUploadProgress(
        files.map((file, i) => ({
          fileName: file.name,
          progress: 0,
          status: "pending" as const,
          description: descriptions?.[i],
        }))
      )

      const results: UploadedDocument[] = []
      // Sequential on purpose: a course can carry several large videos, and
      // uploading them at once starves each other's bandwidth and makes every
      // progress bar crawl.
      for (let i = 0; i < files.length; i++) {
        const result = await uploadSingle(files[i], descriptions?.[i])
        if (result) results.push(result)
      }

      setIsUploading(false)
      return results
    },
    [uploadSingle]
  )

  /** Stops an upload in flight. The partial file is discarded by Cloudinary. */
  const cancelUpload = useCallback((fileName: string) => {
    const xhr = abortControllers.current.get(fileName)
    if (xhr) {
      xhr.abort()
      abortControllers.current.delete(fileName)
    }
  }, [])

  const retryUpload = useCallback(
    async (file: File, description?: string) => {
      updateProgress(file.name, { status: "pending", progress: 0, error: undefined })
      return uploadSingle(file, description)
    },
    [uploadSingle, updateProgress]
  )

  const clearProgress = useCallback(() => setUploadProgress([]), [])

  return {
    isUploading,
    uploadProgress,
    uploadedDocuments,
    uploadSingle,
    uploadMultiple,
    cancelUpload,
    retryUpload,
    clearProgress,
  }
}
