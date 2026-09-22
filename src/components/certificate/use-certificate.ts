"use client"

/**
 * ============================================================================
 * Certificate data access
 * ============================================================================
 *
 * CERT-CONS-001 §6.3, §7.1. One place that talks to the certificate API, so
 * there is one download flow, one error vocabulary and one set of SWR keys.
 *
 * The download flow is the important part. Four entry points existed and three
 * of them built `…/pdf/download?download=true` and attached no token at all —
 * `download` is a Content-Disposition flag, not an authorization mode — so
 * every download outside the Learning Space returned `INVALID_TOKEN` (C-19,
 * C-20). One of them read the auth token out of localStorage first and then
 * never used it, and toasted "Certificate download started" regardless of the
 * outcome (C-32).
 */

import useSWR, { type KeyedMutator } from "swr"
import Cookies from "js-cookie"
import type {
  CanonicalCertificate,
  CertificateDownloadGrant,
  CertificateErrorCode,
} from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL

export class CertificateApiError extends Error {
  readonly status: number
  readonly code: CertificateErrorCode

  constructor(status: number, code: CertificateErrorCode, message: string) {
    super(message)
    this.name = "CertificateApiError"
    this.status = status
    this.code = code
  }
}

/**
 * Both storage locations are written at login — the cookie by the auth slice
 * and the mirror in localStorage by `use-auth` — and different parts of the
 * product read different ones. Reading both here means this module works
 * wherever it is mounted.
 */
function authToken(): string | undefined {
  const cookie = Cookies.get("bwenge_token")
  if (cookie) return cookie
  try {
    return localStorage.getItem("bwengeplus_token") || undefined
  } catch {
    return undefined
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = authToken()

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    })
  } catch {
    throw new CertificateApiError(
      0,
      "NETWORK_ERROR",
      "You appear to be offline. Please try again."
    )
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new CertificateApiError(
      response.status,
      payload?.code || "REQUEST_FAILED",
      payload?.message || "Something went wrong. Please try again."
    )
  }

  return (payload?.data !== undefined ? payload.data : payload) as T
}

// ── Reads ───────────────────────────────────────────────────────────────────

/** One certificate, by id. */
export function useCertificate(certificateId: string | null | undefined): {
  certificate: CanonicalCertificate | null
  isLoading: boolean
  error: CertificateApiError | undefined
  refresh: KeyedMutator<CanonicalCertificate | null>
} {
  const { data, error, isLoading, mutate } = useSWR<CanonicalCertificate | null>(
    certificateId ? ["certificate", certificateId] : null,
    async () => {
      const record = await request<any>(`/certificates/${certificateId}`)
      return (record?.canonical as CanonicalCertificate) ?? null
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  return {
    certificate: data ?? null,
    isLoading,
    error: error as CertificateApiError | undefined,
    refresh: mutate,
  }
}

export interface MyCertificatesPage {
  certificates: Array<Record<string, any> & { canonical: CanonicalCertificate }>
  user: { id: string; name: string; email: string; certificates_earned: number }
  statistics: {
    total_certificates: number
    valid_certificates: number
    current_page_count: number
  }
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

/** The authenticated learner's certificates. */
export function useMyCertificates(page = 1, limit = 12) {
  const { data, error, isLoading, mutate } = useSWR<MyCertificatesPage>(
    ["my-certificates", page, limit],
    () =>
      request<MyCertificatesPage>(
        `/certificates/user/my-certificates?page=${page}&limit=${limit}`
      ),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  return {
    data: data ?? null,
    isLoading,
    error: error as CertificateApiError | undefined,
    refresh: mutate,
  }
}

/**
 * The canonical certificate document, as SVG.
 *
 * Fetched rather than pointed at with an `<img src>`, because the document is a
 * private resource behind the normal Authorization header (§6.4) and because
 * inlining it keeps the certificate's text selectable and searchable.
 */
export function useCertificateDocument(
  certificateId: string | null | undefined
) {
  const { data, error, isLoading, mutate } = useSWR<string>(
    certificateId ? ["certificate-document", certificateId] : null,
    async () => {
      const token = authToken()
      const response = await fetch(
        `${API_BASE}/certificates/${certificateId}/document.svg`,
        {
          credentials: "include",
          headers: {
            Accept: "image/svg+xml",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new CertificateApiError(
          response.status,
          payload?.code || "DOCUMENT_FAILED",
          payload?.message || "We couldn't load your certificate."
        )
      }

      return response.text()
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  return {
    svg: data ?? null,
    isLoading,
    error: error as CertificateApiError | undefined,
    refresh: mutate,
  }
}

// ── Writes ──────────────────────────────────────────────────────────────────

/** Issues the certificate for a completed course. */
export async function issueCertificate(
  courseId: string
): Promise<CanonicalCertificate | null> {
  const payload = await request<any>(`/certificates/issue`, {
    method: "POST",
    body: JSON.stringify({ course_id: courseId }),
  })
  return (payload?.canonical as CanonicalCertificate) ?? null
}

/**
 * Downloads the certificate PDF.
 *
 * Two steps, always:
 *
 *   1. mint — authenticated, so the Authorization header applies;
 *   2. redeem — a plain navigation; the signed URL carries the grant.
 *
 * An expired grant is retried once, because the only cause is the ten-minute
 * TTL elapsing between opening the certificate and clicking Download, and a
 * fresh grant costs one request.
 */
export async function downloadCertificate(
  certificateId: string,
  attempt = 0
): Promise<void> {
  try {
    const grant = await request<CertificateDownloadGrant>(
      `/certificates/${certificateId}/download-token`
    )

    // `download=true` selects `Content-Disposition: attachment`. It is a
    // presentation flag and grants nothing; the token is what authorizes.
    const opened = window.open(
      `${grant.url}&download=true`,
      "_blank",
      "noopener,noreferrer"
    )

    if (!opened) {
      throw new CertificateApiError(
        0,
        "POPUP_BLOCKED",
        "Allow pop-ups for this site to download your certificate."
      )
    }
  } catch (error) {
    if (
      attempt === 0 &&
      error instanceof CertificateApiError &&
      error.code === "LINK_EXPIRED"
    ) {
      return downloadCertificate(certificateId, 1)
    }
    throw error
  }
}

/** Human-readable message for a certificate failure. */
export function describeCertificateError(error: unknown): string {
  if (!(error instanceof CertificateApiError)) {
    return "Something went wrong. Please try again."
  }

  switch (error.code) {
    case "LINK_EXPIRED":
      return "That download link expired. Please try again."
    case "CERTIFICATE_REVOKED":
      return "This certificate has been revoked."
    case "FORBIDDEN":
    case "NOT_FOUND":
      return "This certificate is not available."
    case "CERTIFICATES_DISABLED":
      return "This course does not award a certificate."
    case "NOT_ELIGIBLE_FOR_CERTIFICATE":
      return "Complete every lesson and assessment to earn your certificate."
    case "NETWORK_ERROR":
      return "You appear to be offline. Please try again."
    case "POPUP_BLOCKED":
    default:
      return error.message
  }
}
