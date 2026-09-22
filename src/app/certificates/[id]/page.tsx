"use client"

/**
 * ============================================================================
 * /certificates/[id] — certificate details
 * ============================================================================
 *
 * CERT-CONS-001 §7.2. The page keeps everything it had: the status banner, the
 * recipient / course / institution / status panels, the certificate and
 * verification numbers, and the download, share and verify actions.
 *
 * What it no longer has is its own certificate. Roughly 200 lines here drew a
 * *fourth* design — a gradient trophy medallion, blue and purple, stat cards
 * for the score and date, hand-built signature rules — which resembled neither
 * the Learning Space preview nor the downloaded PDF (C-02). It now renders
 * `<CertificateSheet>`: the same document, from the same endpoint, that the PDF
 * is built from.
 *
 * The download is the shared flow too. Both PDF buttons here built
 * `…/pdf/download?download=true` and attached no token, so both returned
 * `INVALID_TOKEN` (C-19).
 */

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Building,
  CheckCircle,
  ExternalLink,
  Shield,
  User,
} from "lucide-react"
import {
  CertificateActions,
  CertificateSheet,
  describeCertificateError,
  formatCertificateDate,
  formatCertificateScore,
  useCertificate,
  type CanonicalCertificate,
} from "@/components/certificate"

function StatusBanner({ status }: { status: CanonicalCertificate["status"] }) {
  const config = {
    VALID: {
      className: "bg-success/10 dark:bg-success/20 border-b border-success/30",
      icon: <Shield className="w-5 h-5 text-success" />,
      label: "Valid certificate",
      text: "text-success",
    },
    EXPIRED: {
      className: "bg-warning/10 dark:bg-yellow-950 border-b border-warning/30",
      icon: <AlertCircle className="w-5 h-5 text-warning" />,
      label: "Certificate expired",
      text: "text-warning",
    },
    REVOKED: {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border-b border-destructive/30",
      icon: <AlertCircle className="w-5 h-5 text-destructive" />,
      label: "Certificate revoked",
      text: "text-destructive",
    },
  }[status]

  return (
    <div className={`px-6 py-3 ${config.className}`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <span className={`font-medium ${config.text}`}>{config.label}</span>
      </div>
    </div>
  )
}

function InfoPanel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  )
}

export default function CertificatePage() {
  const params = useParams()
  const router = useRouter()
  const certificateId = params?.id as string

  const { certificate, isLoading, error } = useCertificate(certificateId)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
          <Skeleton className="h-9 w-24" />
          <Skeleton
            className="w-full rounded-lg"
            style={{ aspectRatio: "1489 / 1053" }}
          />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <div>
              <h2 className="mb-2 text-xl font-bold">Certificate not available</h2>
              {/* The refusal reads the same whether the certificate is missing
                  or simply is not yours, so ids cannot be enumerated (AC-17). */}
              <p className="text-muted-foreground">
                {error
                  ? describeCertificateError(error)
                  : "This certificate does not exist, or you don't have permission to view it."}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
              <Button onClick={() => router.back()} variant="outline">
                Go back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const score = formatCertificateScore(certificate.final_score)

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <StatusBanner status={certificate.status} />

            {/* The certificate itself — the canonical document, nothing else. */}
            <div className="bg-muted/30 p-4 sm:p-8">
              <CertificateSheet
                certificateId={certificate.id}
                label={`Certificate of completion awarded to ${certificate.recipient.full_name} for ${certificate.course.title}`}
              />
            </div>

            <div className="border-t p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CertificateActions certificate={certificate} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-primary"
                  onClick={() =>
                    window.open(
                      certificate.links.verification_url,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  Verify certificate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">About this certificate</h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InfoPanel icon={<User className="h-4 w-4" />} title="Recipient">
                {/* From the record, never the session — course staff opening a
                    learner's certificate must see the learner (C-09). */}
                <p className="text-sm text-muted-foreground">
                  {certificate.recipient.full_name}
                </p>
              </InfoPanel>

              <InfoPanel icon={<BookOpen className="h-4 w-4" />} title="Course">
                <p className="text-sm text-muted-foreground">
                  {certificate.course.title}
                </p>
                {certificate.course.summary ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {certificate.course.summary}
                  </p>
                ) : null}
              </InfoPanel>

              {certificate.institution ? (
                <InfoPanel icon={<Building className="h-4 w-4" />} title="Institution">
                  <p className="text-sm text-muted-foreground">
                    {certificate.institution.name}
                  </p>
                </InfoPanel>
              ) : null}

              <InfoPanel icon={<CheckCircle className="h-4 w-4" />} title="Status">
                <Badge
                  variant={certificate.status === "VALID" ? "default" : "destructive"}
                >
                  {certificate.status}
                </Badge>
              </InfoPanel>

              <InfoPanel icon={<Award className="h-4 w-4" />} title="Achievement">
                {/* Omitted, not zeroed, when the course has no graded activity
                    — the certificate never states a score it does not hold. */}
                <p className="text-sm text-muted-foreground">
                  {score
                    ? `Final score ${score} (pass mark ${certificate.passing_score}%)`
                    : "Completed every required lesson and assessment"}
                </p>
              </InfoPanel>

              <InfoPanel icon={<Shield className="h-4 w-4" />} title="Identifiers">
                <p className="text-xs text-muted-foreground">
                  Certificate number:{" "}
                  <span className="font-mono font-medium">
                    {certificate.certificate_number}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Verification code:{" "}
                  <span className="break-all font-mono font-medium">
                    {certificate.verification_code}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Issued {formatCertificateDate(certificate.issue_date)}
                  {certificate.expires_at
                    ? ` · Expires ${formatCertificateDate(certificate.expires_at)}`
                    : ""}
                </p>
              </InfoPanel>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
