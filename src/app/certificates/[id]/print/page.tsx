"use client"

/**
 * ============================================================================
 * /certificates/[id]/print — print view
 * ============================================================================
 *
 * CERT-CONS-001 §10.3, C-28. This route did not exist: the Print button on
 * /dashboard/learner/certificates opened it and got a 404.
 *
 * The page is the certificate and nothing else. On screen it sits on a plain
 * ground with a single "Print" control; when printed, the control disappears
 * and the sheet fills an A4 landscape page edge to edge.
 *
 * `print-color-adjust: exact` is carried over verbatim from the reference
 * design's stylesheet — without it the navy and the gold print as pale grey,
 * which the original implementation had already discovered.
 */

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Printer } from "lucide-react"
import {
  CertificateSheet,
  describeCertificateError,
  useCertificate,
} from "@/components/certificate"

const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }

@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }

  .cert-print-chrome { display: none !important; }

  .cert-print-page {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    min-height: 0 !important;
  }

  /* The sheet is the page. Its own aspect ratio matches A4 landscape to
     within 0.0004, so no letterboxing is needed. */
  .cert-print-sheet {
    width: 297mm !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .cert-print-sheet svg { width: 100% !important; height: auto !important; }

  /* Colour-critical: without this the navy and gold print as pale grey. */
  .cert-print-sheet, .cert-print-sheet * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`

export default function CertificatePrintPage() {
  const params = useParams()
  const certificateId = params?.id as string

  const { certificate, isLoading, error } = useCertificate(certificateId)

  useEffect(() => {
    if (certificate) {
      document.title = `Certificate — ${certificate.course.title}`
    }
  }, [certificate])

  return (
    <div className="cert-print-page min-h-screen bg-muted/30 p-4 sm:p-8">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="mx-auto w-full max-w-5xl">
        {isLoading ? (
          <Skeleton
            className="w-full rounded-md"
            style={{ aspectRatio: "1489 / 1053" }}
          />
        ) : error || !certificate ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-background p-10 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Certificate not available</p>
            <p className="text-sm text-muted-foreground">
              {error
                ? describeCertificateError(error)
                : "This certificate does not exist, or you don't have permission to view it."}
            </p>
          </div>
        ) : (
          <>
            <div className="cert-print-chrome mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {certificate.recipient.full_name} · {certificate.course.title}
              </p>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>

            <CertificateSheet
              certificateId={certificate.id}
              className="cert-print-sheet"
              label={`Certificate of completion awarded to ${certificate.recipient.full_name} for ${certificate.course.title}`}
            />
          </>
        )}
      </div>
    </div>
  )
}
