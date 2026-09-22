"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { learningApi, LearningApiError, type MediaHandle } from "@/lib/learning/api"

/**
 * ============================================================================
 * useMediaGrant — exchanges a media handle for a short-lived URL
 * ============================================================================
 *
 * Lesson media no longer arrives as a permanent public URL. The API returns an
 * opaque `media_id`, and this hook trades it for a signed URL that expires in
 * 15 minutes.
 *
 * Two consequences the UI has to handle, and does:
 *   • the URL must be re-fetched before it expires, or a long video will stall
 *     mid-playback — so it self-refreshes at 80% of the grant's lifetime
 *   • external embeds (YouTube/Vimeo) cannot be signed and are passed straight
 *     through
 */

interface MediaGrantState {
  url: string | null
  isExternal: boolean
  isLoading: boolean
  error: LearningApiError | null
  expiresAt: Date | null
}

/** Refresh at 80% of the grant's life so playback never hits a dead URL. */
const REFRESH_RATIO = 0.8

export function useMediaGrant(handle: MediaHandle | null | undefined) {
  const [state, setState] = useState<MediaGrantState>({
    url: null,
    isExternal: false,
    isLoading: false,
    error: null,
    expiresAt: null,
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleIdRef = useRef<string | null>(null)

  const fetchGrant = useCallback(async (mediaHandle: MediaHandle) => {
    // External embeds are already public and cannot be signed.
    if (mediaHandle.is_external && mediaHandle.external_url) {
      setState({
        url: mediaHandle.external_url,
        isExternal: true,
        isLoading: false,
        error: null,
        expiresAt: null,
      })
      return
    }

    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const grant = await learningApi.getMediaUrl(mediaHandle.media_id)

      // A late response for a handle we've navigated away from must not win.
      if (handleIdRef.current !== mediaHandle.media_id) return

      const expiresAt = new Date(grant.expires_at)
      setState({
        url: grant.url,
        isExternal: grant.is_external,
        isLoading: false,
        error: null,
        expiresAt,
      })

      const lifetimeMs = expiresAt.getTime() - Date.now()
      if (lifetimeMs > 0) {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(
          () => void fetchGrant(mediaHandle),
          Math.max(30_000, lifetimeMs * REFRESH_RATIO)
        )
      }
    } catch (err) {
      if (handleIdRef.current !== mediaHandle.media_id) return
      setState({
        url: null,
        isExternal: false,
        isLoading: false,
        error:
          err instanceof LearningApiError
            ? err
            : new LearningApiError(0, "MEDIA_FAILED", "This media could not be loaded."),
        expiresAt: null,
      })
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!handle) {
      handleIdRef.current = null
      setState({
        url: null,
        isExternal: false,
        isLoading: false,
        error: null,
        expiresAt: null,
      })
      return
    }

    handleIdRef.current = handle.media_id
    void fetchGrant(handle)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // Keyed on media_id: a new handle object for the same asset must not
  // re-trigger a grant fetch mid-playback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle?.media_id, fetchGrant])

  const retry = useCallback(() => {
    if (handle) void fetchGrant(handle)
  }, [handle, fetchGrant])

  return { ...state, retry }
}

/**
 * Resolves a downloadable URL on demand.
 *
 * Materials are not pre-granted: a lesson with twenty attachments would
 * otherwise mint twenty URLs nobody opens. The grant is fetched at click time.
 */
export function useMediaDownload() {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const open = useCallback(async (mediaHandle: MediaHandle) => {
    if (mediaHandle.is_external && mediaHandle.external_url) {
      window.open(mediaHandle.external_url, "_blank", "noopener,noreferrer")
      return
    }

    setPendingId(mediaHandle.media_id)
    try {
      const grant = await learningApi.getMediaUrl(mediaHandle.media_id)
      window.open(grant.url, "_blank", "noopener,noreferrer")
    } finally {
      setPendingId(null)
    }
  }, [])

  return { open, pendingId }
}
