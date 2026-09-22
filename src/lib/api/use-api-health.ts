"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { timeoutSignal } from "./api-error"

/**
 * Connectivity, told apart (AXM-CONS-001 F8, finding E-10).
 *
 * Nothing in the application distinguished "this browser is offline" from
 * "the API is down". Both surfaced as an empty list, a vanishing toast, or —
 * on a course page — "Course not found". They need different words, because
 * they need different actions from the user.
 *
 * `navigator.onLine` answers the first. `GET /api/health` answers the second,
 * and is deliberately trivial on the server: it does not touch the database,
 * so a database outage is still reported through the failing endpoint's own
 * 5xx rather than being misread here as a network failure.
 */

export type ApiHealth = "unknown" | "online" | "offline" | "unreachable"

const API = process.env.NEXT_PUBLIC_API_URL
const HEALTH_URL = API ? `${API.replace(/\/+$/, "")}/health` : null

/** Backoff while down; a slow, cheap heartbeat while up. */
const PROBE_WHEN_DOWN_MS = 5_000
const PROBE_WHEN_UP_MS = 60_000

export function useApiHealth() {
  const [health, setHealth] = useState<ApiHealth>("unknown")
  const [lastChecked, setLastChecked] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)

  const probe = useCallback(async (): Promise<ApiHealth> => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "offline"
    }
    if (!HEALTH_URL) return "unknown"

    const { signal, clear } = timeoutSignal(6_000)
    try {
      const res = await fetch(HEALTH_URL, { signal, cache: "no-store" })
      return res.ok ? "online" : "unreachable"
    } catch {
      // A rejected fetch from an online browser means the API did not answer.
      return typeof navigator !== "undefined" && navigator.onLine === false
        ? "offline"
        : "unreachable"
    } finally {
      clear()
    }
  }, [])

  const check = useCallback(async () => {
    const result = await probe()
    if (!mounted.current) return result
    setHealth(result)
    setLastChecked(Date.now())
    return result
  }, [probe])

  useEffect(() => {
    mounted.current = true

    const schedule = (state: ApiHealth) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(
        run,
        state === "online" || state === "unknown" ? PROBE_WHEN_UP_MS : PROBE_WHEN_DOWN_MS
      )
    }

    const run = async () => {
      const result = await check()
      if (mounted.current) schedule(result)
    }

    void run()

    // The browser's own events are faster and cheaper than any poll.
    const onOnline = () => void run()
    const onOffline = () => mounted.current && setHealth("offline")

    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)

    return () => {
      mounted.current = false
      if (timer.current) clearTimeout(timer.current)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [check])

  return {
    health,
    lastChecked,
    isDown: health === "offline" || health === "unreachable",
    recheck: check,
  }
}
