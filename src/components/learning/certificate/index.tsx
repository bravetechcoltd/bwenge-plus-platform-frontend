/**
 * ============================================================================
 * Compatibility shim — the Learning Space certificate module
 * ============================================================================
 *
 * CERT-CONS-001 §7.3.
 *
 * This directory used to hold a complete second certificate implementation:
 * a 1489 × 1053 pixel canvas laid out in absolutely positioned HTML
 * (`certificate-artwork.tsx`), its stylesheet and geometry
 * (`certificate-design.ts`), its vector frame and corner art
 * (`certificate-decorations.tsx`), its seal and marks
 * (`certificate-emblems.tsx`), and a print path that serialised the live DOM
 * into a popup window. 1,345 lines in all.
 *
 * All of it is gone, for two reasons.
 *
 *  1. It could not be reproduced server-side — pdfkit cannot execute CSS —
 *     which is why the backend hand-drew a *different* certificate for the
 *     PDF, and why the two drifted apart completely (C-02, C-03).
 *
 *  2. Its scaling was broken. `transform: scale(calc(100cqw / 1489))` passes a
 *     length where `scale()` requires a number, so browsers dropped the
 *     declaration and the canvas rendered at 1:1 inside a clipped viewport —
 *     the reported bug (C-01).
 *
 * The design itself was not discarded: its canvas, palette, coordinates, font
 * sizes and letter-spacing were transcribed into
 * `src/services/certificate/certificateGeometry.ts` in the backend, and its
 * frame, seal and marks into `certificateDocument.ts`, which emits them as SVG.
 * That SVG is what the preview shows and what the PDF is built from.
 *
 * These re-exports exist so that any import of the old path still resolves.
 * Prefer `@/components/certificate` directly.
 */

export {
  CertificateModal,
  CertificateSheet,
  CertificateActions,
  useCertificate,
  useCertificateDocument,
  downloadCertificate,
  describeCertificateError,
} from "@/components/certificate"

export type {
  CanonicalCertificate,
  CertificateStatus,
} from "@/components/certificate"
