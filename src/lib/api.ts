import axios from "axios"
import Cookies from "js-cookie"
import { toast } from "sonner"
import { ApiError, kindForStatus, REQUEST_TIMEOUT_MS } from "./api/api-error"

/**
 * Base URL resolution (AXM-CONS-001 finding C-09).
 *
 * This client read `NEXT_PUBLIC_API_BASE_URL` and defaulted to
 * `http://localhost:3001/api`, while every `fetch` call in the application
 * read `NEXT_PUBLIC_API_URL`. A deployment that set only the second — which is
 * the one the pages use — left every axios call, including the session
 * validation and the pending-enrolment count in the dashboard chrome, pointed
 * at the viewer's own machine. Same class of defect as CERT-CONS-001 RC-1.
 *
 * Both variables are still honoured, in the order that makes a
 * single-variable deployment correct rather than silently local.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  const shared = process.env.NEXT_PUBLIC_API_URL?.trim()
  const chosen = explicit || shared || "http://localhost:3001/api"
  return chosen.replace(/\/+$/, "")
}

const API_BASE_URL = resolveBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
})

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("bwenge_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

/**
 * One redirect per expired session.
 *
 * The 401 branch below used to be commented out, so an expired token produced
 * a generic toast and left the user on a page that would never load (E-08).
 * Restoring it needs a guard: a dashboard fires several requests at once, and
 * without this every one of them would push `/login`.
 */
let redirectingToLogin = false

function signOutAndReturnToLogin() {
  if (redirectingToLogin) return
  if (typeof window === "undefined") return

  const path = window.location.pathname + window.location.search
  // `/login` and the other unauthenticated routes must not bounce off
  // themselves, and there is nothing to come back to from them.
  if (/^\/(login|register|verify-email|forgot-password|reset-password|sso)/.test(path)) {
    return
  }

  redirectingToLogin = true

  Cookies.remove("bwenge_token")
  Cookies.remove("bwenge_user")

  toast.error("Your session has ended. Please sign in again.")

  // The destination is preserved so signing back in returns the user to the
  // page they asked for, rather than dropping them on a dashboard (§13).
  window.location.href = `/login?next=${encodeURIComponent(path)}`
}

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      toast.error("Request timeout. The server is taking too long to respond.")
      return Promise.reject(
        new ApiError({
          message: "The request took too long to complete.",
          kind: "timeout",
          requestUrl: error.config?.url ?? null,
        })
      )
    }

    if (error.response) {
      const { status, data } = error.response

      if (status === 401) {
        signOutAndReturnToLogin()
      } else if (status === 403) {
        toast.error(data?.message || "You do not have permission to perform this action.")
      } else if (status === 404) {
        toast.error(data?.message || "Resource not found.")
      } else if (status === 400) {
        toast.error(data?.message || "Bad request.")
      } else if (status === 409) {
        toast.error(data?.message || "Conflict occurred.")
      } else if (status === 429) {
        toast.error(data?.message || "Too many requests. Please wait a moment and try again.")
      } else if (status >= 500) {
        toast.error(data?.message || "Something went wrong on our end. Please try again.")
      } else {
        toast.error(data?.message || "An unexpected error occurred.")
      }

      // Rejected as an ApiError so an axios caller can branch on `kind` the
      // same way an SWR caller does. `message` is unchanged, so existing
      // `catch` blocks that read it keep working.
      return Promise.reject(
        new ApiError({
          message: data?.message || `Request failed (${status}).`,
          status,
          code: data?.code ?? null,
          kind: kindForStatus(status),
          requestUrl: error.config?.url ?? null,
          body: data,
        })
      )
    }

    if (error.request) {
      toast.error("No response from server. Please check your connection.")
      return Promise.reject(
        new ApiError({
          message: "We could not reach the server. Check your connection.",
          kind: "network",
          requestUrl: error.config?.url ?? null,
        })
      )
    }

    toast.error("Request failed. Please try again.")
    return Promise.reject(ApiError.fromThrown(error, error.config?.url))
  },
)

export default api
