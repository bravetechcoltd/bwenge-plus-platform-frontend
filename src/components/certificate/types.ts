/**
 * ============================================================================
 * Canonical certificate contract (frontend mirror)
 * ============================================================================
 *
 * CERT-CONS-001 §3.3. This mirrors the backend's `CanonicalCertificate`
 * exactly. Every certificate surface in the product reads this shape and
 * nothing else — no session-derived recipient, no locally formatted score, no
 * URL assembled from an environment variable, and no value the browser
 * invented.
 *
 * Keep in step with `src/services/certificate/certificateSerializer.ts` in the
 * backend.
 */

export type CertificateStatus = "VALID" | "EXPIRED" | "REVOKED"

export interface CanonicalCertificate {
  id: string
  /** What a learner quotes. */
  certificate_number: string
  /** The public lookup key. */
  verification_code: string
  status: CertificateStatus

  issue_date: string
  expires_at: string | null

  /** null when the course has no graded activity. Never invented. */
  final_score: number | null
  passing_score: number

  recipient: {
    id: string
    full_name: string
  }

  course: {
    id: string
    title: string
    summary: string | null
  }

  instructor: { name: string; role: string }
  director: { name: string; role: string }

  institution: {
    id: string
    name: string
    logo_url: string | null
  } | null

  links: {
    verification_url: string
    certificate_url: string
    /** Absent on the public verification payload — the document is private. */
    document_url?: string
  }
}

/** The grant returned by `GET /certificates/:id/download-token`. */
export interface CertificateDownloadGrant {
  token: string
  expires_in: number
  url: string
}

/** The error codes the certificate UI branches on (plan Appendix B). */
export type CertificateErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "MISSING_TOKEN"
  | "INVALID_TOKEN"
  | "LINK_EXPIRED"
  | "CERTIFICATE_REVOKED"
  | "CERTIFICATES_DISABLED"
  | "NOT_ELIGIBLE_FOR_CERTIFICATE"
  | "BELOW_PASSING_SCORE"
  | "NOT_ENROLLED"
  | "DOCUMENT_FAILED"
  | "PDF_FAILED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | (string & {})

/**
 * The score, formatted the one way it is formatted everywhere.
 *
 * `final_score` reaches the browser as a `numeric` — a *string* — from
 * Postgres. It used to be rendered raw in two places ("100.00%"), rounded in a
 * third ("100%") and typed as a `number` in a fourth interface that was simply
 * untrue at runtime (C-10). The serializer parses it once; this formats it
 * once.
 */
export function formatCertificateScore(
  score: number | null | undefined
): string | null {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    return null
  }
  return `${Math.round(Number(score))}%`
}

/** The issue date, formatted the one way it is formatted everywhere. */
export function formatCertificateDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
