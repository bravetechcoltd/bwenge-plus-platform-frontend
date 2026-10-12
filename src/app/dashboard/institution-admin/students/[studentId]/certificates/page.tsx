"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Award,
  BadgeCheck,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  Hash,
  ShieldAlert,
  Target,
} from "lucide-react"
import {
  fetchStudentCertificates,
  formatDate,
  formatPercent,
  type StudentCertificate,
} from "@/lib/students/institution-student-api"
import {
  EmptyState,
  LoadFailed,
  StudentListSkeleton,
  ToneBadge,
  useStudentResource,
} from "@/components/institution-admin/student-detail/shared"

/**
 * "Certificates" (ISTU-001).
 *
 * The second dead menu item. Each card is one `certificates` row: its number,
 * its verification code, the score it was issued on and whether it is still
 * valid.
 *
 * The verification code is the reason this page is useful rather than
 * decorative. /verify-certificate/<code> is the public check an employer runs,
 * and an administrator fielding "is this real?" needs the code to hand — so it
 * is shown in full, copyable, next to a link that runs the check.
 */

export default function StudentCertificatesPage() {
  const { data, isLoading, error, reload } = useStudentResource<
    StudentCertificate[]
  >((institutionId, studentId, token) =>
    fetchStudentCertificates(institutionId, studentId, token)
  )

  if (isLoading) return <StudentListSkeleton rows={2} />
  if (error) return <LoadFailed message={error} onRetry={reload} />

  const certificates = data ?? []

  if (certificates.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No certificates yet"
        description="A certificate appears here once this student completes one of your institution's courses and meets its passing score."
      />
    )
  }

  const valid = certificates.filter((certificate) => certificate.is_valid)
  const elsewhere = certificates.filter(
    (certificate) => !certificate.belongs_to_institution
  )

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted-foreground">
        {certificates.length} certificate
        {certificates.length === 1 ? "" : "s"} · {valid.length} currently valid
        {elsewhere.length > 0
          ? ` · ${elsewhere.length} earned outside your institution`
          : ""}
      </p>

      {/*
        ISTU-002. Said once, at the top, rather than leaving an administrator
        to wonder why a course they do not recognise is on the list.

        This page used to filter to the institution's own courses, which meant
        a student the table credited with a certificate had an empty page —
        the table counts every certificate a learner holds, and the one in
        question was for a MOOC with no institution attached.
      */}
      {elsewhere.length > 0 ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground ring-1 ring-inset ring-border/60">
          This list covers everything this learner has earned on the platform,
          not only your courses, so it matches the count on the students table.
          Certificates from elsewhere are marked.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {certificates.map((certificate) => (
          <CertificateCard key={certificate.id} certificate={certificate} />
        ))}
      </div>
    </div>
  )
}

function CertificateCard({
  certificate,
}: {
  certificate: StudentCertificate
}) {
  const [copied, setCopied] = useState<"number" | "code" | null>(null)

  const copy = async (value: string, which: "number" | "code") => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      toast.success(
        which === "code" ? "Verification code copied" : "Certificate number copied"
      )
      setTimeout(() => setCopied(null), 1600)
    } catch {
      // Clipboard access is denied in some browsers and over plain HTTP. Say
      // so rather than appearing to succeed — the code is on screen to read.
      toast.error("Could not copy. Select the code and copy it manually.")
    }
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md",
        !certificate.is_valid && "opacity-90"
      )}
    >
      <div
        className={cn(
          "h-1.5 w-full",
          certificate.is_valid
            ? "bg-gradient-to-r from-success via-success/70 to-primary"
            : "bg-muted"
        )}
      />

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div
              className={cn(
                "shrink-0 rounded-xl p-2.5 ring-1 ring-inset",
                certificate.is_valid
                  ? "bg-success/10 text-success ring-success/20"
                  : "bg-muted text-muted-foreground ring-border"
              )}
            >
              <Award className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-foreground">
                {certificate.course?.title ?? "Course no longer available"}
              </h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {certificate.course?.instructor_name
                  ? `Taught by ${certificate.course.instructor_name}`
                  : "Instructor not recorded"}
              </p>
              {certificate.belongs_to_institution ? null : (
                <ToneBadge tone="muted" className="mt-1.5">
                  Earned outside your institution
                </ToneBadge>
              )}
            </div>
          </div>

          {certificate.is_valid ? (
            <ToneBadge tone="success">
              <BadgeCheck className="h-3 w-3" />
              Valid
            </ToneBadge>
          ) : certificate.is_expired ? (
            <ToneBadge tone="warning">
              <ShieldAlert className="h-3 w-3" />
              Expired
            </ToneBadge>
          ) : (
            <ToneBadge tone="danger">
              <ShieldAlert className="h-3 w-3" />
              Revoked
            </ToneBadge>
          )}
        </div>

        {/* ── The record ────────────────────────────────────────────────── */}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
          <div className="rounded-lg bg-muted/40 p-2.5">
            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Issued
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {formatDate(certificate.issue_date)}
            </dd>
          </div>

          <div className="rounded-lg bg-muted/40 p-2.5">
            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Target className="h-3 w-3" />
              Final score
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {/* Some courses certify on completion rather than on a score,
                  so this is genuinely absent rather than zero. */}
              {formatPercent(certificate.final_score, "Not scored")}
            </dd>
          </div>
        </dl>

        {/* ── Identifiers ───────────────────────────────────────────────── */}
        <div className="mt-3 space-y-2">
          <IdentifierRow
            icon={Hash}
            label="Certificate number"
            value={certificate.certificate_number}
            copied={copied === "number"}
            onCopy={() => copy(certificate.certificate_number, "number")}
          />
          <IdentifierRow
            icon={BadgeCheck}
            label="Verification code"
            value={certificate.verification_code}
            copied={copied === "code"}
            onCopy={() => copy(certificate.verification_code, "code")}
            emphasised
          />
        </div>

        {certificate.expires_at ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {certificate.is_expired ? "Expired" : "Expires"}{" "}
            {formatDate(certificate.expires_at)}
          </p>
        ) : null}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="h-8">
            {/* The route's parameter is named `id` but has always held the
                verification code — this is the public check. */}
            <Link
              href={`/verify-certificate/${certificate.verification_code}`}
              target="_blank"
            >
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
              Verify
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>

          {certificate.certificate_url ? (
            <Button variant="outline" size="sm" asChild className="h-8">
              <a
                href={certificate.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Open document
              </a>
            </Button>
          ) : null}

          {certificate.course ? (
            <Button variant="ghost" size="sm" asChild className="h-8">
              <Link
                href={`/dashboard/institution-admin/courses/${certificate.course.id}`}
              >
                Open course
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function IdentifierRow({
  icon: Icon,
  label,
  value,
  copied,
  onCopy,
  emphasised = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  emphasised?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 ring-1 ring-inset",
        emphasised
          ? "bg-primary/5 ring-primary/20"
          : "bg-background ring-border/60"
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          emphasised ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate font-mono text-[12px] font-semibold text-foreground">
          {value}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopy}
        className="h-7 w-7 shrink-0 p-0"
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}
