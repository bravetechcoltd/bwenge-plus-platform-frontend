"use client"

/* eslint-disable @next/next/no-img-element */

/**
 * ============================================================================
 * CertificateVerification — the public verification view
 * ============================================================================
 *
 * CERT-CONS-001 §7.3, C-29. Three routes served this page and there were three
 * copies of it: `/verify/[id]` and `/verify-certificate/[id]` were
 * byte-identical, and `/certificates/verify/[code]` was a diverged fork
 * carrying a request timeout and proper handling of a 200 response with
 * `valid: false` that the other two lacked — and the canonical link printed on
 * every certificate pointed at one of the *unfixed* copies.
 *
 * This is that fork's implementation, kept whole. All three routes now render
 * it, so the fixes reach every entry point and there is one page to maintain.
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 *
 * The learner's and the instructor's email addresses. This endpoint is public
 * and the verification code is printed on the certificate and encoded in its QR
 * code, so anyone the learner ever shows it to could read their email (C-23).
 * A verifier needs the name, the course, the dates and the status; they do not
 * need contact details.
 *
 * The certificate *document* is also absent, and that is not an oversight: it
 * is a private resource behind the normal authorization rules (§6.4). A public
 * verifier confirms the facts; they do not get the artefact.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Building,
  Check,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  Loader2,
  Shield,
  User,
  XCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  formatCertificateDate,
  formatCertificateScore,
  type CanonicalCertificate,
} from "./types"

interface VerificationResponse {
  success: boolean
  valid: boolean
  message: string
  canonical?: CanonicalCertificate
  data?: {
    certificate: {
      id: string
      certificate_number: string
      verification_code: string
      issue_date: string
      final_score: string | number | null
      is_valid: boolean
      expires_at: string | null
      certificate_url: string
    }
    user: {
      id: string
      first_name: string
      last_name: string
      /**
       * The display name, normalised server-side by `formatRecipientName`.
       * This page used to compose one from the two columns beside it, which is
       * how the certificate could read "Ambroise Muhayimana" while the
       * verification card next to it read "Ambroise MUHAYIMANA" (CERT §2).
       */
      full_name?: string | null
      profile_picture_url: string | null
    }
    course: {
      id: string
      title: string
      description: string
      level: string
      duration_minutes: number
      language: string
      is_certificate_available: boolean
    }
    instructor: { id: string; name: string } | null
    institution: {
      id: string
      name: string
      type: string
      logo_url: string | null
    } | null
    verification_details: {
      verified_at: string
      verification_method: string
      verification_url: string
    }
  }
}

export function CertificateVerification({ code }: { code: string }) {
  const router = useRouter()
  const [verification, setVerification] = useState<VerificationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function verifyCertificate() {
      try {
        // A timeout, so a hung request shows an error rather than spinning
        // forever. This is one of the fixes the other two copies never got.
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/certificates/verify/${code}`,
          {
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
          }
        )

        clearTimeout(timeoutId)

        const data = await response.json()

        if (response.ok) {
          if (data.success && data.valid) {
            setVerification(data)
            setError(null)
          } else {
            // A 200 that says the certificate is not valid is a real answer,
            // not a transport failure.
            setError(data.message || "Certificate is not valid")
            setVerification(data)
          }
        } else {
          setError(data.message || "Certificate not found")
          setVerification({
            success: false,
            valid: false,
            message: data.message || "Certificate not found",
            data: undefined,
          })
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          setError("Verification timed out. Please check your connection and try again.")
        } else {
          setError(
            "Failed to verify certificate. Please check the verification code and try again."
          )
        }

        setVerification({
          success: false,
          valid: false,
          message: error || "Verification failed",
          data: undefined,
        })
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      verifyCertificate()
    } else {
      setLoading(false)
      setError("No verification code provided")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast({ title: "Copied!", description: "Verification code copied to clipboard" })
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="py-12 text-center">
            <div className="relative mx-auto mb-4 h-20 w-20">
              <Loader2 className="h-20 w-20 animate-spin text-primary" />
              <Shield className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-primary/50" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Verifying certificate</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we validate the certificate&apos;s authenticity…
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isValid = Boolean(verification?.valid && verification?.data)
  const certData = verification?.data
  const canonical = verification?.canonical

  // The score comes from the canonical record where the endpoint supplies it,
  // and is formatted the one way it is formatted everywhere. It is omitted
  // entirely when the course had nothing graded (C-10, AC-10).
  const score = formatCertificateScore(
    canonical?.final_score ??
      (certData?.certificate.final_score === null ||
      certData?.certificate.final_score === undefined
        ? null
        : Number(certData.certificate.final_score))
  )

  const certificateLink =
    canonical?.links.certificate_url ?? certData?.certificate.certificate_url

  return (
    <div
      className={`min-h-screen ${
        isValid
          ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-950 dark:via-green-950/20 dark:to-gray-950"
          : "bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-950 dark:via-red-950/20 dark:to-gray-950"
      } flex items-center justify-center p-4`}
    >
      <div className="w-full max-w-4xl space-y-4">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Button>

        <Card className="border-2 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full shadow-lg ${
                    isValid
                      ? "bg-gradient-to-br from-green-400 to-green-600"
                      : "bg-gradient-to-br from-red-400 to-red-600"
                  }`}
                >
                  {isValid ? (
                    <CheckCircle className="h-14 w-14 text-white" />
                  ) : (
                    <XCircle className="h-14 w-14 text-white" />
                  )}
                </div>
                <div
                  className={`absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full ${
                    isValid ? "bg-success" : "bg-destructive"
                  }`}
                >
                  {isValid ? (
                    <Shield className="h-5 w-5 text-white" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              {isValid ? "Certificate verified" : "Verification failed"}
            </CardTitle>
            <p className="mt-2 text-muted-foreground">
              {isValid
                ? "This certificate has been successfully verified and is authentic"
                : error || "This certificate could not be verified"}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {isValid && certData ? (
              <>
                <div className="rounded-lg border-2 border-success/30 bg-success/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                      <Shield className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold text-success">Valid certificate</h3>
                      <p className="text-sm text-success">
                        This certificate has been verified against our records and is
                        authentic. All details below have been confirmed as accurate.
                      </p>
                    </div>
                    <Badge className="bg-success text-white">Verified</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Award className="h-5 w-5 text-primary" />
                    Certificate details
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0">
                            {certData.user.profile_picture_url ? (
                              <img
                                src={certData.user.profile_picture_url}
                                alt=""
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-6 w-6 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="mb-1 text-xs text-muted-foreground">Recipient</p>
                            {/* Name only. This page is public. */}
                            <p className="truncate font-semibold">
                              {canonical?.recipient.full_name ??
                                certData.user.full_name ??
                                [certData.user.first_name, certData.user.last_name]
                                  .filter(Boolean)
                                  .join(" ")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                            <BookOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="mb-1 text-xs text-muted-foreground">Course</p>
                            <p className="line-clamp-2 font-semibold">
                              {certData.course.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {certData.course.level ? (
                                <Badge variant="secondary" className="text-xs">
                                  {certData.course.level}
                                </Badge>
                              ) : null}
                              {certData.course.language ? (
                                <Badge variant="secondary" className="text-xs">
                                  {certData.course.language}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="mb-1 text-xs text-muted-foreground">
                              {score ? "Final score" : "Achievement"}
                            </p>
                            {score ? (
                              <p className="text-3xl font-bold text-primary">{score}</p>
                            ) : (
                              <p className="text-sm font-medium">
                                Completed every required lesson and assessment
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/15">
                            <Clock className="h-6 w-6 text-warning" />
                          </div>
                          <div className="flex-1">
                            <p className="mb-1 text-xs text-muted-foreground">Date issued</p>
                            <p className="font-semibold">
                              {formatCertificateDate(certData.certificate.issue_date)}
                            </p>
                            {certData.certificate.expires_at ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Expires{" "}
                                {formatCertificateDate(certData.certificate.expires_at)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {certData.instructor || certData.institution ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {certData.instructor ? (
                        <Card className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="mb-1 text-xs text-muted-foreground">
                                  Instructor
                                </p>
                                {/* Name only — see the module note on C-23. */}
                                <p className="truncate font-medium">
                                  {certData.instructor.name}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : null}

                      {certData.institution ? (
                        <Card className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="shrink-0">
                                {certData.institution.logo_url ? (
                                  <img
                                    src={certData.institution.logo_url}
                                    alt=""
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <Building className="h-5 w-5 text-primary" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="mb-1 text-xs text-muted-foreground">
                                  Issued by
                                </p>
                                <p className="truncate font-medium">
                                  {certData.institution.name}
                                </p>
                                {certData.institution.type ? (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {certData.institution.type}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Shield className="h-4 w-4 text-primary" />
                    Verification information
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-lg border bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs text-muted-foreground">
                            Certificate number
                          </p>
                          <p className="truncate font-mono text-sm font-medium">
                            {certData.certificate.certificate_number}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              certData.certificate.certificate_number
                            )
                            toast({
                              title: "Copied!",
                              description: "Certificate number copied",
                            })
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs text-muted-foreground">
                            Verification code
                          </p>
                          <p className="truncate font-mono text-sm font-medium">
                            {certData.certificate.verification_code}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                          {copied ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs text-muted-foreground">Verified at</p>
                          <p className="text-sm font-medium">
                            {new Date(
                              certData.verification_details.verified_at
                            ).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-success/30 bg-success/10 text-success"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          Just now
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The certificate link is computed by the API from the live
                    origin. It used to be a frozen column, and three of the five
                    live rows pointed at localhost — so this button sent an
                    employer to a machine that was not theirs (C-11). */}
                {certificateLink ? (
                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button
                      onClick={() => router.push(`/certificates/${certData.certificate.id}`)}
                      className="min-w-[200px] flex-1"
                    >
                      <Award className="mr-2 h-4 w-4" />
                      View full certificate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(certificateLink, "_blank", "noopener,noreferrer")
                      }
                      className="min-w-[200px] flex-1"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open certificate link
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="rounded-lg border-2 border-destructive/30 bg-destructive/10 p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                      <XCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-2 font-semibold text-destructive">
                        Certificate not valid
                      </h3>
                      <p className="mb-4 text-sm text-destructive">
                        {verification?.message ||
                          error ||
                          "This certificate could not be verified. The verification code may be incorrect, the certificate may have been revoked, or it may have expired."}
                      </p>
                      <div className="space-y-2 text-sm text-destructive">
                        <p className="font-medium">Possible reasons:</p>
                        <ul className="ml-2 list-inside list-disc space-y-1">
                          <li>The verification code is incorrect or incomplete</li>
                          <li>
                            The certificate has been revoked by the issuing institution
                          </li>
                          <li>The certificate has expired</li>
                          <li>The certificate does not exist in our system</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Verification code attempted:
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="flex-1 truncate rounded border bg-background px-3 py-2 font-mono text-sm">
                      {code}
                    </code>
                    <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 text-center">
                  <p className="text-sm font-medium">Need help?</p>
                  <p className="text-sm text-muted-foreground">
                    If you believe this is an error, please contact the institution that
                    issued the certificate, or check that you have the correct
                    verification code.
                  </p>
                  <Button variant="outline" onClick={() => router.push("/")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Return to home
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium">Security notice</p>
                <p className="text-xs text-muted-foreground">
                  This verification page checks the certificate against our official
                  records over a secure connection. If you have any questions about this
                  certificate&apos;s validity, please contact the issuing institution
                  directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
