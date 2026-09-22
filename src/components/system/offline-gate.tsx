"use client"

import * as React from "react"
import { mutate } from "swr"
import { RefreshCw, Wifi, WifiOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { useApiHealth } from "@/lib/api/use-api-health"
import { StatusScreen } from "./status-screen"

/**
 * The global connectivity gate (AXM-CONS-001 §7).
 *
 * A banner was not enough. When the connection drops, every page underneath is
 * showing stale or empty data and the user has no idea why — and the audit's
 * whole complaint (E-10) was that an outage was being reported as "Course not
 * found", an empty list, or nothing at all. This is the one place the
 * application says "you are offline", and it says it at full size.
 *
 * Three properties matter:
 *
 *   **It confirms before it shows.** A single failed request does not open the
 *   gate. `useApiHealth` distinguishes `navigator.onLine === false` (the
 *   browser is offline) from a failed `/api/health` (the API is unreachable),
 *   and only a confirmed loss opens it. Otherwise a slow endpoint or one 500
 *   would blank the app.
 *
 *   **Children stay mounted.** The overlay sits above the tree rather than
 *   replacing it, so form state, scroll position and the route survive the
 *   outage. Nothing is lost and nothing needs re-navigating afterwards — §7's
 *   "preserve the intended route context".
 *
 *   **It recovers by itself.** A countdown retries on a backoff, the browser's
 *   own `online` event short-circuits the wait, and when connectivity returns
 *   every SWR key is revalidated so the pages underneath fill themselves in.
 *   No reload, so no reload loop — §7's explicit warning.
 */

const BACKOFF_SECONDS = [8, 15, 30] as const

export function OfflineGate({ children }: { children?: React.ReactNode }) {
  const { health, isDown, recheck } = useApiHealth()
  const [checking, setChecking] = React.useState(false)
  const [countdown, setCountdown] = React.useState(0)

  const attempt = React.useRef(0)
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const wasDown = React.useRef(false)

  const clearTimer = React.useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  const retryNow = React.useCallback(async () => {
    clearTimer()
    setCountdown(0)
    setChecking(true)
    try {
      await recheck()
    } finally {
      setChecking(false)
    }
  }, [clearTimer, recheck])

  // Auto-retry on a backoff while the gate is open.
  React.useEffect(() => {
    if (!isDown) {
      clearTimer()
      attempt.current = 0
      setCountdown(0)
      return
    }

    const delay = BACKOFF_SECONDS[Math.min(attempt.current, BACKOFF_SECONDS.length - 1)]
    setCountdown(delay)
    clearTimer()

    timer.current = setInterval(() => {
      setCountdown((remaining) => {
        if (remaining > 1) return remaining - 1
        clearTimer()
        attempt.current = Math.min(attempt.current + 1, BACKOFF_SECONDS.length - 1)
        void retryNow()
        return 0
      })
    }, 1000)

    return clearTimer
  }, [isDown, clearTimer, retryNow])

  // On recovery, refill the pages that failed while it was down.
  React.useEffect(() => {
    if (isDown) {
      wasDown.current = true
      return
    }
    if (wasDown.current && health === "online") {
      wasDown.current = false
      void mutate(() => true, undefined, { revalidate: true })
    }
  }, [isDown, health])

  // Body scroll lock while the gate is open, so the page behind cannot be
  // scrolled by a message the user cannot act on.
  React.useEffect(() => {
    if (!isDown || typeof document === "undefined") return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isDown])

  const offline = health === "offline"

  return (
    <>
      {children}
      {isDown && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
          aria-label={offline ? "You are offline" : "Server unreachable"}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/95 backdrop-blur-sm"
        >
          <StatusScreen
            layout="inline"
            icon={WifiOff}
            code={offline ? "OFFLINE" : "UNREACHABLE"}
            tone="danger"
            title={offline ? "You are offline" : "We cannot reach the server"}
            message={
              offline
                ? "Check your internet connection. Your work is safe — we will reconnect automatically as soon as your connection returns."
                : "Your connection looks fine, but the server is not responding. We will keep trying."
            }
            className="max-w-md p-4 sm:p-6"
            actions={[
              {
                label: checking ? "Checking…" : "Try again now",
                onClick: () => void retryNow(),
                icon: RefreshCw,
                disabled: checking,
              },
            ]}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {checking ? (
                <>
                  <RefreshCw
                    className="h-3.5 w-3.5 animate-spin text-primary motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Reconnecting…
                </>
              ) : (
                <>
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                  Retrying in {countdown}s
                </>
              )}
            </div>
          </StatusScreen>
        </div>
      )}
    </>
  )
}

/**
 * The compact form, for cases where a full gate is too much — kept so a page
 * can show connection state inline without inventing its own.
 */
export function OfflineNotice({ className }: { className?: string }) {
  const { health, isDown, recheck } = useApiHealth()
  if (!isDown) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border px-4 py-2 text-center text-xs font-medium",
        "border-destructive/30 bg-destructive/10 text-destructive",
        className
      )}
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        {health === "offline"
          ? "You are offline."
          : "We cannot reach the server right now."}
      </span>
      <button
        type="button"
        onClick={() => void recheck()}
        className="underline underline-offset-2 hover:no-underline"
      >
        Check again
      </button>
    </div>
  )
}
