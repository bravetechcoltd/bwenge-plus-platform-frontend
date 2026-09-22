"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { learningApi } from "@/lib/learning/api"

/**
 * ============================================================================
 * useAssessmentCamera — AS-CAM-001 §3
 * ============================================================================
 *
 * Camera capture for a monitored attempt: permission, preview, recording,
 * chunking, buffering, upload, recovery.
 *
 * ── What it is not ─────────────────────────────────────────────────────────
 *
 * It has no authority over the assessment. It cannot end an attempt, submit
 * one, alter a timer or touch an answer. Every failure here degrades to "no
 * footage" and the assessment continues exactly as it would have (rules 11,
 * 12). The only thing it can do to the attempt is *report* — through the
 * existing integrity queue, never its own.
 *
 * ── Why chunks, and why they land in IndexedDB first ───────────────────────
 *
 * Ten-second chunks, each uploaded on its own signed request. A crash costs
 * at most ten seconds instead of the whole session, and the upload cost is
 * spread across the attempt rather than landing as one enormous transfer at
 * the moment the learner most wants to be finished.
 *
 * ── Why the recorder restarts instead of using a timeslice ─────────────────
 *
 * This used to be one MediaRecorder started with a 10s timeslice. That is the
 * obvious reading of the API and it is wrong for this design: a timesliced
 * recorder writes the container header into the *first* blob only, and every
 * blob after it is a continuation fragment that is not a file. Such a fragment
 * is not independently uploadable — storage rejects it as not-a-video — and
 * not independently playable, which is what the review player needs, since it
 * plays chunks as a playlist of separate sources.
 *
 * Measured, the timeslice version behaved like this: chunk 0 accepted, every
 * later chunk refused with HTTP 400, retried five times, then dropped. Ten
 * seconds of footage per attempt and silence after it.
 *
 * So each chunk is its own short recording: start, run for CHUNK_MS, stop,
 * assemble the complete file, start the next. Every chunk is then a valid
 * standalone WebM. The cost is a sub-frame gap at each boundary, visible to a
 * reviewer as a seam, which is preferable to footage that cannot be stored.
 *
 * Chunks are written to IndexedDB *before* upload and deleted only once
 * storage has confirmed. That ordering is the whole recovery story: an
 * interrupted attempt reopens with its unsent chunks still on disk, and a
 * learner who loses connectivity for ten minutes loses nothing.
 *
 * ── What the browser will not do ───────────────────────────────────────────
 *
 * Recording stops when a mobile browser suspends the tab; permission can be
 * revoked mid-stream; iOS Safari cannot record in a background tab at all.
 * None of that is worked around here, because none of it can be. It is
 * detected, reported, and left visible to the reviewer as a gap.
 */

const CHUNK_MS = 10_000
const MAX_BUFFER_BYTES = 200 * 1024 * 1024
const DB_NAME = "bwenge-assessment-recording"
const STORE = "chunks"
const MAX_UPLOAD_ATTEMPTS = 5

/**
 * What one upload attempt resolved to.
 *
 * The distinction that matters is retry vs refused: a transient failure is
 * worth another try, a storage budget refusal is the same answer every time
 * and retrying it wastes the uplink an assessment is using for answers.
 */
type UploadOutcome = "ok" | "retry" | "refused"

export type CameraState =
  | "idle"
  | "checking"
  | "ready"
  | "denied"
  | "unavailable"
  | "unsupported"
  | "recording"
  | "interrupted"
  | "stopped"

export interface CameraEventReport {
  type:
    | "CAMERA_DENIED"
    | "CAMERA_UNAVAILABLE"
    | "CAMERA_REVOKED"
    | "CAMERA_STREAM_ENDED"
    | "CAMERA_RESTORED"
    | "RECORDING_STARTED"
    | "RECORDING_UNSUPPORTED"
    | "RECORDING_UPLOAD_FAILED"
    | "RECORDING_QUOTA_BLOCKED"
    | "RECORDING_BUFFER_OVERFLOW"
  meta?: Record<string, unknown>
}

interface PendingChunk {
  id: string
  attemptId: string
  index: number
  blob: Blob
  elapsedMs: number
  bytes: number
  attempts: number
}

/* ══════════════════════════════════════════════════════════════════════════
   Capability detection
   ══════════════════════════════════════════════════════════════════════════ */

export function cameraCapabilities(): {
  secureContext: boolean
  getUserMedia: boolean
  mediaRecorder: boolean
  indexedDB: boolean
  /** iOS Safari cannot record from a backgrounded tab; footage would be silently holed. */
  iosSafari: boolean
  supported: boolean
  reason: string | null
} {
  if (typeof window === "undefined") {
    return {
      secureContext: false,
      getUserMedia: false,
      mediaRecorder: false,
      indexedDB: false,
      iosSafari: false,
      supported: false,
      reason: "not-a-browser",
    }
  }

  const secureContext = window.isSecureContext === true
  const getUserMedia = !!navigator.mediaDevices?.getUserMedia
  const mediaRecorder = typeof (window as any).MediaRecorder === "function"
  const indexedDB = !!window.indexedDB

  const ua = navigator.userAgent
  const iosSafari =
    /iP(hone|ad|od)/.test(ua) ||
    // iPadOS 13+ reports as Macintosh but exposes touch.
    (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1)

  const reason = !secureContext
    ? "insecure-context"
    : !getUserMedia
      ? "no-getusermedia"
      : !mediaRecorder
        ? "no-mediarecorder"
        : iosSafari
          ? "ios-background-suspension"
          : null

  return {
    secureContext,
    getUserMedia,
    mediaRecorder,
    indexedDB,
    iosSafari,
    supported: reason === null,
    reason,
  }
}

/** The first container the browser admits. Order is quality, then reach. */
function pickMimeType(): string {
  if (typeof (window as any).MediaRecorder !== "function") return "video/webm"
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ]
  for (const type of candidates) {
    try {
      if ((window as any).MediaRecorder.isTypeSupported?.(type)) return type
    } catch {
      // Safari has thrown here historically rather than returning false.
    }
  }
  return "video/webm"
}

/* ══════════════════════════════════════════════════════════════════════════
   IndexedDB buffer
   ══════════════════════════════════════════════════════════════════════════ */

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) return resolve(null)
    let request: IDBOpenDBRequest
    try {
      request = window.indexedDB.open(DB_NAME, 1)
    } catch {
      return resolve(null)
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("attemptId", "attemptId", { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    // Private browsing, disabled site data, or a quota refusal. The recording
    // proceeds without a durable buffer rather than failing outright.
    request.onerror = () => resolve(null)
  })
}

async function dbPut(chunk: PendingChunk): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(chunk)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
    tx.onabort = () => resolve()
  })
  db.close()
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
    tx.onabort = () => resolve()
  })
  db.close()
}

async function dbListFor(attemptId: string): Promise<PendingChunk[]> {
  const db = await openDb()
  if (!db) return []
  const out = await new Promise<PendingChunk[]>((resolve) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () =>
      resolve((req.result || []).filter((c: PendingChunk) => c.attemptId === attemptId))
    req.onerror = () => resolve([])
  })
  db.close()
  return out.sort((a, b) => a.index - b.index)
}

/* ══════════════════════════════════════════════════════════════════════════
   Hook
   ══════════════════════════════════════════════════════════════════════════ */

export interface UseAssessmentCameraOptions {
  /** Null until an attempt exists. Nothing records without one. */
  attemptId: string | null
  /** True only when the resolved policy says `camera_mode: "RECORD"`. */
  enabled: boolean
  /** Wall-clock start of the attempt, for the shared `elapsed_ms` anchor. */
  startedAt: number | null
  /** Routed into the existing integrity queue — never a second pipeline. */
  onEvent: (event: CameraEventReport) => void
}

export interface UseAssessmentCameraResult {
  state: CameraState
  capabilities: ReturnType<typeof cameraCapabilities>
  /** Live preview source for the pre-check. Null once the check is done. */
  previewStream: MediaStream | null
  error: string | null
  pendingChunks: number
  uploadedChunks: number
  bufferedBytes: number
  /** Ask for permission and prove a frame can actually be captured. */
  requestAccess: () => Promise<boolean>
  releasePreview: () => void
  startRecording: () => Promise<boolean>
  stopRecording: () => Promise<{ chunks: number; durationMs: number }>
}

export function useAssessmentCamera({
  attemptId,
  enabled,
  startedAt,
  onEvent,
}: UseAssessmentCameraOptions): UseAssessmentCameraResult {
  const [state, setState] = useState<CameraState>("idle")
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingChunks, setPendingChunks] = useState(0)
  const [uploadedChunks, setUploadedChunks] = useState(0)
  const [bufferedBytes, setBufferedBytes] = useState(0)

  const capabilities = useRef(cameraCapabilities()).current

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunkIndexRef = useRef(0)
  // Drives the segment loop. Cleared before the final stop so the recorder's
  // own onstop does not helpfully start one more segment on the way out.
  const recordingRef = useRef(false)
  // Latches for the life of the attempt. Storage refused this recording, and
  // nothing that happens later in the session makes it worth asking again.
  const quotaBlockedRef = useRef(false)
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queueRef = useRef<PendingChunk[]>([])
  const drainingRef = useRef(false)
  const startedAtRef = useRef<number | null>(startedAt)
  startedAtRef.current = startedAt

  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const attemptIdRef = useRef<string | null>(attemptId)
  attemptIdRef.current = attemptId

  const syncCounters = useCallback(() => {
    setPendingChunks(queueRef.current.length)
    setBufferedBytes(queueRef.current.reduce((sum, c) => sum + c.bytes, 0))
  }, [])

  // ── Upload ──────────────────────────────────────────────────────────────

  /**
   * Sends one chunk to storage and tells the server it arrived.
   *
   * Two steps, in this order, because the ledger must never claim a chunk the
   * storage does not have: registering first would make a failed PUT look like
   * a complete recording, and completeness is what the reviewer is told.
   */
  const uploadChunk = useCallback(async (chunk: PendingChunk): Promise<UploadOutcome> => {
    const id = attemptIdRef.current
    if (!id) return "retry"

    try {
      const grant = await learningApi.grantRecordingChunk(
        id,
        chunk.index,
        chunk.blob.type || "video/webm"
      )

      // A signed multipart POST, not a bare PUT: Cloudinary authenticates the
      // upload from the signature the server generated over this exact
      // public_id. Every signed field must be sent back unchanged — altering
      // one invalidates the signature, which is what stops a ticket for one
      // attempt being replayed against another.
      const form = new FormData()
      for (const [key, value] of Object.entries(grant.upload_fields ?? {})) {
        form.append(key, value)
      }
      form.append("file", chunk.blob)

      const put = await fetch(grant.upload_url, { method: "POST", body: form })
      if (!put.ok) throw new Error(`storage responded ${put.status}`)

      await learningApi.registerRecordingChunk(id, {
        chunk_index: chunk.index,
        storage_key: grant.storage_key,
        bytes: chunk.bytes,
        elapsed_ms: chunk.elapsedMs,
        duration_ms: CHUNK_MS,
      })

      await dbDelete(chunk.id)
      setUploadedChunks((n) => n + 1)
      return "ok"
    } catch (error: any) {
      // A storage budget refusal is not a bad minute on the network — it is
      // an answer that will be the same for the rest of this assessment.
      // Retrying it every ten seconds would spend the learner's uplink and
      // fill their disk with footage that has nowhere to go.
      //
      // QUOTA_UNKNOWN is excluded deliberately: it means the server could
      // not reach the provider, which is exactly the kind of thing that
      // resolves on its own, so it stays retryable.
      if (error?.code === "QUOTA_EXHAUSTED" || error?.code === "QUOTA_CEILING") {
        return "refused"
      }
      return "retry"
    }
  }, [])

  /**
   * Drains the queue oldest-first.
   *
   * Serial rather than parallel on purpose: a learner's uplink is the scarce
   * resource during an assessment, and saturating it would compete with the
   * autosave that protects their answers. Footage is worth less than answers.
   */
  const drain = useCallback(async () => {
    if (drainingRef.current) return
    drainingRef.current = true
    try {
      while (queueRef.current.length > 0) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) break

        const chunk = queueRef.current[0]
        const outcome = await uploadChunk(chunk)

        if (outcome === "ok") {
          queueRef.current.shift()
          syncCounters()
          continue
        }

        if (outcome === "refused") {
          // Recording is over for this attempt. The buffer is cleared rather
          // than kept: these bytes can never reach storage, and leaving up to
          // 200 MB of undeliverable video on a learner's machine to protect
          // footage nobody will ever be able to watch is the wrong trade.
          //
          // Reported before anything is discarded, so the reviewer sees a
          // declared gap. An attempt with no footage and no explanation is
          // indistinguishable from a covered camera, and that difference is
          // the difference between a technical note and an accusation.
          onEventRef.current({
            type: "RECORDING_QUOTA_BLOCKED",
            meta: { chunk_index: chunk.index, buffered_chunks: queueRef.current.length },
          })

          quotaBlockedRef.current = true
          for (const buffered of queueRef.current) {
            await dbDelete(buffered.id).catch(() => undefined)
          }
          queueRef.current = []
          syncCounters()

          // Stops the camera and the segment loop. The assessment is not
          // touched — the learner keeps answering, the timer keeps running,
          // and submission is reached without ever coming back through here.
          recordingRef.current = false
          if (segmentTimerRef.current) {
            clearTimeout(segmentTimerRef.current)
            segmentTimerRef.current = null
          }
          try {
            recorderRef.current?.stop()
          } catch {
            /* already inactive */
          }
          recorderRef.current = null
          streamRef.current?.getTracks().forEach((t) => t.stop())
          streamRef.current = null
          setPreviewStream(null)
          setState("unavailable")
          break
        }

        chunk.attempts += 1
        if (chunk.attempts === 1) {
          // Reported once per chunk, not per retry: a flapping connection would
          // otherwise fill the timeline with the same fact.
          onEventRef.current({
            type: "RECORDING_UPLOAD_FAILED",
            meta: { chunk_index: chunk.index },
          })
        }

        if (chunk.attempts >= MAX_UPLOAD_ATTEMPTS) {
          // Left on disk deliberately. Re-entry drains it, and abandoning it
          // here would turn a bad five minutes into permanently lost footage.
          queueRef.current.shift()
          queueRef.current.push(chunk)
          chunk.attempts = 0
          syncCounters()
          break
        }

        await new Promise((r) => setTimeout(r, Math.min(30_000, 2 ** chunk.attempts * 1000)))
      }
    } finally {
      drainingRef.current = false
    }
  }, [uploadChunk, syncCounters])

  const enqueue = useCallback(
    async (blob: Blob, index: number, elapsedMs: number) => {
      const id = attemptIdRef.current
      if (!id) return

      const chunk: PendingChunk = {
        id: `${id}:${index}`,
        attemptId: id,
        index,
        blob,
        elapsedMs,
        bytes: blob.size,
        attempts: 0,
      }

      queueRef.current.push(chunk)
      await dbPut(chunk)

      // ── Buffer ceiling ────────────────────────────────────────────────
      //
      // The *oldest unsent* chunk goes first. Keeping the newest is
      // deliberate: a reviewer looking at an incident watches the footage
      // around it, and an incident is far more likely to be recent than to sit
      // at the very start of a session nobody could upload.
      let total = queueRef.current.reduce((sum, c) => sum + c.bytes, 0)
      let dropped = 0
      while (total > MAX_BUFFER_BYTES && queueRef.current.length > 1) {
        const victim = queueRef.current.shift()!
        total -= victim.bytes
        dropped++
        void dbDelete(victim.id)
      }
      if (dropped > 0) {
        onEventRef.current({
          type: "RECORDING_BUFFER_OVERFLOW",
          meta: { dropped_chunks: dropped },
        })
      }

      syncCounters()
      void drain()
    },
    [drain, syncCounters]
  )

  // ── Permission and preview ──────────────────────────────────────────────

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (!enabled) return true

    if (!capabilities.supported) {
      setState(capabilities.reason === "no-mediarecorder" ? "unsupported" : "unavailable")
      setError(
        capabilities.reason === "insecure-context"
          ? "A camera can only be used over a secure connection."
          : capabilities.reason === "ios-background-suspension"
            ? "This browser stops recording whenever you switch away, so the footage would be incomplete."
            : "This browser can't record video."
      )
      onEventRef.current({
        type:
          capabilities.reason === "no-getusermedia" || capabilities.reason === "insecure-context"
            ? "CAMERA_UNAVAILABLE"
            : "RECORDING_UNSUPPORTED",
        meta: { reason: capabilities.reason },
      })
      return false
    }

    setState("checking")
    setError(null)

    try {
      // Video only. Audio is never requested — capturing a household that
      // never consented adds nothing a reviewer uses (rule 16).
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
        audio: false,
      })

      const track = stream.getVideoTracks()[0]
      if (!track) {
        stream.getTracks().forEach((t) => t.stop())
        setState("unavailable")
        setError("No camera was found on this device.")
        onEventRef.current({ type: "CAMERA_UNAVAILABLE", meta: { reason: "no-track" } })
        return false
      }

      streamRef.current = stream
      setPreviewStream(stream)
      setState("ready")
      return true
    } catch (err: any) {
      const name = String(err?.name || "")
      const denied = name === "NotAllowedError" || name === "SecurityError"
      const missing = name === "NotFoundError" || name === "OverconstrainedError"

      setState(denied ? "denied" : missing ? "unavailable" : "unavailable")
      setError(
        denied
          ? "Camera access was blocked. You can allow it in your browser's address bar."
          : missing
            ? "No camera was found on this device."
            : "The camera could not be started."
      )
      onEventRef.current({
        type: denied ? "CAMERA_DENIED" : "CAMERA_UNAVAILABLE",
        meta: { error: name },
      })
      return false
    }
  }, [enabled, capabilities])

  const releasePreview = useCallback(() => {
    setPreviewStream(null)
  }, [])

  // ── Recording ───────────────────────────────────────────────────────────

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!enabled || !attemptIdRef.current) return true
    // Refused once is refused for the attempt. Without this, anything that
    // restarts recording — a permission change, a re-entry — would turn the
    // camera back on to produce chunks storage has already said it will not
    // take.
    if (quotaBlockedRef.current) return false
    if (!streamRef.current) {
      const ok = await requestAccess()
      if (!ok) return false
    }
    const stream = streamRef.current
    if (!stream) return false

    try {
      const mimeType = pickMimeType()

      // A track ending is the camera going away — unplugged, taken by another
      // application, or permission withdrawn. Reported, never fatal.
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setState("interrupted")
          onEventRef.current({ type: "CAMERA_STREAM_ENDED" })
        }
      })

      // One complete recording per chunk. The segment's own onstop assembles
      // the file, hands it to the buffer, and starts the next segment for as
      // long as recording is still wanted.
      const runSegment = () => {
        if (!recordingRef.current) return
        const live = streamRef.current
        if (!live || live.getVideoTracks().every((t) => t.readyState === "ended")) {
          return
        }

        let recorder: MediaRecorder
        try {
          recorder = new MediaRecorder(live, { mimeType, videoBitsPerSecond: 400_000 })
        } catch {
          recordingRef.current = false
          setState("interrupted")
          onEventRef.current({
            type: "RECORDING_UNSUPPORTED",
            meta: { reason: "segment-start-failed" },
          })
          return
        }

        const parts: Blob[] = []
        const segmentStartedAt = Date.now()

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) parts.push(event.data)
        }

        recorder.onstop = () => {
          if (segmentTimerRef.current) {
            clearTimeout(segmentTimerRef.current)
            segmentTimerRef.current = null
          }
          // Assembled from every blob this segment produced, so the result
          // carries the header its first blob wrote and is a complete file.
          if (parts.length > 0) {
            const blob = new Blob(parts, { type: mimeType })
            if (blob.size > 0) {
              const index = chunkIndexRef.current++
              const anchor = startedAtRef.current ?? segmentStartedAt
              void enqueue(blob, index, Math.max(0, segmentStartedAt - anchor))
            }
          }
          if (recordingRef.current) runSegment()
        }

        try {
          // No timeslice: this recorder produces one segment and is discarded.
          recorder.start()
        } catch {
          recordingRef.current = false
          setState("interrupted")
          onEventRef.current({
            type: "RECORDING_UNSUPPORTED",
            meta: { reason: "segment-start-failed" },
          })
          return
        }
        recorderRef.current = recorder

        segmentTimerRef.current = setTimeout(() => {
          segmentTimerRef.current = null
          try {
            if (recorder.state !== "inactive") recorder.stop()
          } catch {
            /* already gone; onstop will not fire and the loop ends here */
          }
        }, CHUNK_MS)
      }

      recordingRef.current = true
      runSegment()
      if (!recordingRef.current) return false

      setState("recording")
      onEventRef.current({ type: "RECORDING_STARTED", meta: { mime_type: mimeType } })
      return true
    } catch {
      recordingRef.current = false
      setState("unsupported")
      onEventRef.current({ type: "RECORDING_UNSUPPORTED", meta: { reason: "start-failed" } })
      return false
    }
  }, [enabled, requestAccess, enqueue])

  const stopRecording = useCallback(async (): Promise<{
    chunks: number
    durationMs: number
  }> => {
    const recorder = recorderRef.current
    const anchor = startedAtRef.current

    // Cleared first: the segment loop restarts itself from onstop, and this is
    // what tells it not to.
    recordingRef.current = false
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current)
      segmentTimerRef.current = null
    }

    if (recorder && recorder.state !== "inactive") {
      // The in-flight segment is still wanted — it is the last seconds of the
      // attempt, the stretch a reviewer is most likely to care about. Waiting
      // for onstop lets the segment's own handler assemble and buffer it.
      await new Promise<void>((resolve) => {
        const previous = recorder.onstop
        recorder.onstop = (event) => {
          try {
            previous?.call(recorder, event)
          } finally {
            resolve()
          }
        }
        try {
          recorder.stop()
        } catch {
          resolve()
        }
      })
    }
    recorderRef.current = null

    // Read after the final segment has been buffered, so a stop that lands
    // mid-segment still counts the chunk it just produced.
    const produced = chunkIndexRef.current

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setPreviewStream(null)
    setState("stopped")

    // One last drain so a chunk produced in the final seconds is not stranded.
    await drain()

    return {
      chunks: produced,
      durationMs: anchor ? Math.max(0, Date.now() - anchor) : produced * CHUNK_MS,
    }
  }, [drain])

  // ── Recovery ────────────────────────────────────────────────────────────
  //
  // Chunks written before a reload or crash are still on disk. Reopening the
  // attempt picks them up and continues indexing after them, so re-entry does
  // not overwrite footage from before the interruption.
  useEffect(() => {
    if (!enabled || !attemptId) return
    let cancelled = false

    void (async () => {
      const pending = await dbListFor(attemptId)
      if (cancelled || pending.length === 0) return
      queueRef.current = [...pending, ...queueRef.current]
      chunkIndexRef.current = Math.max(
        chunkIndexRef.current,
        pending[pending.length - 1].index + 1
      )
      syncCounters()
      void drain()
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, attemptId, drain, syncCounters])

  // Reconnecting is the moment a stalled queue can move again.
  useEffect(() => {
    if (!enabled) return
    const onOnline = () => void drain()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [enabled, drain])

  // Permission can be withdrawn from browser UI without touching the page.
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.permissions) return
    let status: PermissionStatus | null = null
    let cancelled = false

    void (async () => {
      try {
        status = await navigator.permissions.query({ name: "camera" as PermissionName })
        if (cancelled || !status) return
        status.onchange = () => {
          if (status?.state === "denied") {
            setState("interrupted")
            onEventRef.current({ type: "CAMERA_REVOKED" })
          } else if (status?.state === "granted" && recorderRef.current) {
            onEventRef.current({ type: "CAMERA_RESTORED" })
          }
        }
      } catch {
        // Firefox has not implemented the camera permission name. Absence of
        // the observer is not an error; `track.onended` still covers the case
        // that matters.
      }
    })()

    return () => {
      cancelled = true
      if (status) status.onchange = null
    }
  }, [enabled])

  // Never leave a camera light on behind us.
  useEffect(() => {
    return () => {
      recordingRef.current = false
      if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current)
      try {
        recorderRef.current?.stop()
      } catch {
        /* already inactive */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return {
    state,
    capabilities,
    previewStream,
    error,
    pendingChunks,
    uploadedChunks,
    bufferedBytes,
    requestAccess,
    releasePreview,
    startRecording,
    stopRecording,
  }
}
