/**
 * The canonical certificate module.
 *
 * CERT-CONS-001 §7.1. Everything that displays, previews, downloads or shares a
 * certificate imports from here. There is one design, one data contract, one
 * download flow and one error vocabulary behind these exports.
 */

export { CertificateSheet, CERTIFICATE_ASPECT_RATIO } from "./certificate-sheet"
export type { CertificateSheetProps } from "./certificate-sheet"

export { CertificateModal } from "./certificate-modal"
export type { CertificateModalProps } from "./certificate-modal"

export { CertificateActions } from "./certificate-actions"
export type { CertificateActionsProps } from "./certificate-actions"

// There is deliberately no shared "certificate card". The listing rows on
// /dashboard/learner/certificates carry course metadata — level, language,
// duration, instructor, thumbnail — that a certificate-shaped card would drop,
// and they render a *summary tile*, not a certificate document, so they are not
// a duplicate design. Consolidation applies to the document and the actions.

export {
  CertificateApiError,
  describeCertificateError,
  downloadCertificate,
  issueCertificate,
  useCertificate,
  useCertificateDocument,
  useMyCertificates,
} from "./use-certificate"
export type { MyCertificatesPage } from "./use-certificate"

export {
  formatCertificateDate,
  formatCertificateScore,
} from "./types"
export type {
  CanonicalCertificate,
  CertificateDownloadGrant,
  CertificateErrorCode,
  CertificateStatus,
} from "./types"
