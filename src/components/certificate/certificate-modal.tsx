"use client"

/**
 * ============================================================================
 * CertificateModal — the one certificate dialog
 * ============================================================================
 *
 * CERT-CONS-001 §5.2. The dialog adapts to the document, not the other way
 * round. The reference sized it `max-h-[92vh] max-w-5xl` with nothing relating
 * its width to the sheet's 1.414 : 1 ratio, so even a correctly scaled
 * certificate could end up taller than the dialog and scroll (C-31).
 *
 * ── The width expression ────────────────────────────────────────────────────
 *
 *     w-[min(96vw,calc((92vh-11rem)*1.4141))]
 *
 * `92vh − 11rem` is the vertical space left for the sheet once the header, the
 * footer and the padding have taken theirs (49 + 57 + 48 px, with headroom).
 * Multiplying by the aspect ratio gives the widest sheet that still fits *by
 * height*; `min()` then caps it by viewport width. The result is that the whole
 * certificate is visible at every size, with no scrolling in either axis:
 *
 *   1920 × 1080 → 1156 × 818      1280 × 720 → 688 × 487
 *   1440 ×  900 →  922 × 652       390 × 844 → 374 × 264 (96vw binds)
 *
 * `max-w-none` and the `sm:` override are needed because `DialogContent` ships
 * `max-w-[calc(100%-2rem)] sm:max-w-lg`, which would otherwise clamp the sheet
 * to 32rem on any screen wider than 640px.
 */

import { AlertCircle, Award } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CanonicalCertificate } from "./types"
import { formatCertificateDate, formatCertificateScore } from "./types"
import { CertificateSheet } from "./certificate-sheet"
import { CertificateActions } from "./certificate-actions"

export interface CertificateModalProps {
  certificate: CanonicalCertificate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Overrides the default "Your certificate" heading. */
  title?: string
}

const SHEET_WIDTH =
  "w-[min(96vw,calc((92vh-11rem)*1.4141))] max-w-none sm:max-w-[min(96vw,calc((92vh-11rem)*1.4141))]"

function StatusBadge({ status }: { status: CanonicalCertificate["status"] }) {
  if (status === "VALID") return null

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        status === "REVOKED"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-warning/30 bg-warning/10 text-warning"
      )}
    >
      <AlertCircle className="h-3 w-3" />
      {status === "REVOKED" ? "Revoked" : "Expired"}
    </Badge>
  )
}

export function CertificateModal({
  certificate,
  open,
  onOpenChange,
  title = "Your certificate",
}: CertificateModalProps) {
  if (!certificate) return null

  const score = formatCertificateScore(certificate.final_score)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          SHEET_WIDTH,
          // `flex` replaces DialogContent's default `grid`, so the sheet region
          // can take the remaining height and the footer stays pinned.
          "flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary" />
            {title}
            <StatusBadge status={certificate.status} />
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-mono">{certificate.certificate_number}</span>
            {" · Issued "}
            {formatCertificateDate(certificate.issue_date)}
            {score ? ` · Final score ${score}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* The sheet takes whatever height is left. `min-h-0` is what allows a
            flex child to shrink below its content height — without it the
            footer would be pushed off the bottom of the dialog. */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-3 sm:p-5">
          <CertificateSheet
            certificateId={certificate.id}
            label={`Certificate of completion awarded to ${certificate.recipient.full_name} for ${certificate.course.title}`}
          />
        </div>

        <div className="shrink-0 border-t bg-background px-5 py-3">
          <CertificateActions certificate={certificate} size="sm" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
