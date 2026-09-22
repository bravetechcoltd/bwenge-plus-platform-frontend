"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Loader2,
  Lock,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { learningApi, LearningApiError } from "@/lib/learning/api"
import {
  CertificateModal,
  describeCertificateError,
  downloadCertificate,
  formatCertificateDate,
  formatCertificateScore,
  type CanonicalCertificate,
} from "@/components/certificate"
import { ProgressRing } from "@/components/gamification/progress-ring"

/**
 * ============================================================================
 * CourseCompletion
 * ============================================================================
 *
 * The final step: summary, certificate, download.
 *
 * The security-relevant change is what is *not* sent. The previous version
 * posted `final_score` to `/certificates/issue`, computed from client-side
 * stats — so the score printed on the certificate was whatever the browser
 * said it was. The server now recomputes both eligibility and score at issue
 * time and ignores any client value.
 *
 * The PDF download is also no longer a bare, guessable URL: the component
 * requests a short-lived signed token first.
 *
 * CERT-CONS-001: the certificate itself is now `<CertificateModal>`, the one
 * dialog the whole product uses. Two things changed here as a result.
 *
 * The modal used to show roughly a third of the sheet, because the certificate
 * scaled itself with `transform: scale(calc(100cqw / 1489))` — an invalid
 * value that browsers drop, leaving a 1489px canvas inside a clipped viewport
 * (C-01). And it used to carry *two* download buttons producing two different
 * documents: this card's, which fetched the backend's hand-drawn pdfkit
 * design, and the certificate component's own, which printed the on-screen
 * one (C-04). There is one document and one button now.
 */

interface CourseSummary {
  total_steps: number
  completed_steps: number
  percent: number
  total_lessons: number
  completed_lessons: number
  total_assessments: number
  completed_assessments: number
  average_score: number
  total_time_spent_minutes: number
  is_course_complete: boolean
}

export default function CourseCompletion({
  courseId,
  courseTitle,
  summary,
  allStepsCompleted,
}: {
  courseId: string
  courseTitle: string
  summary: CourseSummary
  allStepsCompleted: boolean
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [issuing, setIssuing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // `canonical` is the certificate; the legacy keys beside it are retained by
  // the API for older consumers but nothing here reads them. In particular the
  // legacy `course.instructor` and `course.institution` are uuid *strings*,
  // which is what made this component print "Course Instructor" and "Bwenge+"
  // on every certificate it rendered (C-07).
  const {
    data: certificate,
    isLoading: checking,
    mutate: refreshCertificate,
  } = useSWR<CanonicalCertificate | null>(
    allStepsCompleted && user?.id ? ["certificate", courseId, user.id] : null,
    async () => {
      try {
        const result = await learningApi.checkCertificate(user!.id, courseId)
        return (result?.canonical as CanonicalCertificate) ?? null
      } catch (err) {
        // "No certificate yet" is the normal case, not an error.
        if (err instanceof LearningApiError && err.status === 404) return null
        throw err
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const handleIssue = useCallback(async () => {
    setIssuing(true)
    try {
      // No `final_score` — the server computes it (see class doc).
      const issued = await learningApi.issueCertificate(courseId)
      // The issue response already carries the canonical record. Writing it
      // straight into the cache means the modal opens with the certificate in
      // hand instead of flashing a loading state while a second request runs.
      await refreshCertificate(
        (issued?.canonical as CanonicalCertificate) ?? undefined,
        { revalidate: !issued?.canonical }
      )

      toast({
        title: "Certificate issued",
        description: "Your certificate is ready to view and download.",
      })

      if (issued) setPreviewOpen(true)
    } catch (err) {
      const apiError = err as LearningApiError
      toast({
        title:
          apiError?.code === "NOT_ELIGIBLE_FOR_CERTIFICATE"
            ? "Not eligible yet"
            : "Couldn't issue certificate",
        description: apiError?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIssuing(false)
    }
  }, [courseId, refreshCertificate, toast])

  const handleDownload = useCallback(async () => {
    if (!certificate?.id) return
    setDownloading(true)
    try {
      // Mint a short-lived grant, then hand the browser the signed URL. This
      // is the one download flow, shared with every other entry point.
      await downloadCertificate(certificate.id)
    } catch (err) {
      toast({
        title: "Couldn't prepare the download",
        description: describeCertificateError(err),
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }, [certificate, toast])

  const hours = Math.floor(summary.total_time_spent_minutes / 60)
  const minutes = summary.total_time_spent_minutes % 60

  // ── Certificate signatories and description ──────────────────────────────
  // Deleted, not moved. Sixty lines here derived the instructor, the director
  // and the course summary in the browser — reading `course.instructor
  // .first_name` off a uuid string, and `institution.director_name` off a
  // column that has never existed — so every certificate this component
  // rendered printed "Course Instructor", "Program Director" and "Bwenge+"
  // regardless of who actually taught or issued the course (C-07, C-08).
  //
  // The backend serializer resolves all three from the real relations, and the
  // document renders what it resolves. There is nothing left to derive here.

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Card className="shadow-none">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:text-left">
          <div className="shrink-0">
            <ProgressRing progress={summary.percent} size={88} strokeWidth={7} />
          </div>

          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {allStepsCompleted ? (
                <Badge className="gap-1 bg-success/15 text-success hover:bg-success/20">
                  <Trophy className="h-3 w-3" />
                  Course complete
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  In progress
                </Badge>
              )}
            </div>

            <h1 className="text-xl font-semibold leading-snug text-foreground">
              {allStepsCompleted
                ? "Congratulations — you finished the course"
                : "Keep going"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{courseTitle}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Lessons"
          value={`${summary.completed_lessons}/${summary.total_lessons}`}
        />
        <StatCard
          label="Assessments"
          value={`${summary.completed_assessments}/${summary.total_assessments}`}
        />
        <StatCard
          label="Average score"
          value={summary.average_score > 0 ? `${summary.average_score}%` : "—"}
        />
        <StatCard
          label="Time spent"
          value={hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
        />
      </div>

      {/* ── Certificate ─────────────────────────────────────────────────── */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary" />
            Certificate
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!allStepsCompleted ? (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Certificate locked
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pass every lesson and assessment to earn your certificate.{" "}
                  <span className="tabular-nums">
                    {summary.completed_steps} of {summary.total_steps}
                  </span>{" "}
                  steps complete.
                </p>
              </div>
            </div>
          ) : checking ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your certificate…
            </div>
          ) : certificate ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-success">
                    Your certificate is ready
                  </p>
                  <p className="mt-1 text-sm text-foreground/80">
                    Certificate no.{" "}
                    <span className="font-mono text-xs">
                      {certificate.certificate_number}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Issued {formatCertificateDate(certificate.issue_date)}
                    {formatCertificateScore(certificate.final_score)
                      ? ` · Final score ${formatCertificateScore(certificate.final_score)}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPreviewOpen(true)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  View certificate
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="gap-2"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Anyone can verify this certificate at{" "}
                <span className="font-mono break-all">
                  {certificate.links.verification_url.replace(/^https?:\/\//, "")}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You've earned a certificate for this course. Generate it to view,
                download and share it.
              </p>
              <Button onClick={handleIssue} disabled={issuing} className="gap-2">
                {issuing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Award className="h-4 w-4" />
                )}
                Generate certificate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Preview ─────────────────────────────────────────────────────── */}
      {/* The recipient's name comes from the record, not from `useAuth()`.
          Course staff opening a learner's certificate must see the learner's
          name on it, not their own (C-09). */}
      <CertificateModal
        certificate={certificate ?? null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card px-3 py-3 text-center")}>
      <div className="text-lg font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
