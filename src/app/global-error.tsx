"use client"

import { useEffect } from "react"

/**
 * The last resort (AXM-CONS-001 F13, finding E-01).
 *
 * A crash inside the root layout happens above every provider, so this file
 * cannot use the theme, the session, or `ErrorState` — none of them are
 * mounted. It ships its own document and its own styles, and deliberately
 * repeats the shared design's shape rather than importing it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global error]", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "32rem",
            width: "100%",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#64748b",
              margin: "0 0 1.5rem",
            }}
          >
            The application could not recover on its own. Reloading usually fixes it.
          </p>
          <button
            onClick={reset}
            style={{
              appearance: "none",
              border: "none",
              borderRadius: "0.5rem",
              background: "#0f172a",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              padding: "0.625rem 1.25rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
