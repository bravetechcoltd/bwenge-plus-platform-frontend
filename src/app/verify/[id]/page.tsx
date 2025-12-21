"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  Loader2,
  Award,
  Calendar,
  User,
  BookOpen,
  ArrowLeft,
  Building,
  GraduationCap,
  Shield,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface CertificateVerificationData {
  success: boolean
  valid: boolean
  message: string
  data?: {
    certificate: {
      id: string
      certificate_number: string
      verification_code: string
      issue_date: string
      final_score: string | number
      is_valid: boolean
      expires_at: string | null
      certificate_url: string
    }
    user: {
      id: string
      first_name: string
      last_name: string
      email: string
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
    instructor: {
      id: string
      name: string
      email: string
    } | null
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

export default function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [verification, setVerification] = useState<CertificateVerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        console.log("🔍 [verifyCertificate] Verifying code:", code)

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/certificates/verify/${code}`)

        const data = await response.json()
        console.log("📊 [verifyCertificate] Response:", data)

        if (response.ok && data.success) {
          setVerification(data)
        } else {
          setError(data.message || "Certificate verification failed")
          setVerification(data)
        }
      } catch (err: any) {
        console.error("❌ [verifyCertificate] Error:", err)
        setError("Failed to verify certificate. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      verifyCertificate()
    }
  }, [code])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Verification code copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleViewCertificate = () => {
    if (verification?.data?.certificate?.id) {
      router.push(`/certificates/${verification.data.certificate.id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="text-center py-12">
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <Loader2 className="w-20 h-20 animate-spin text-primary" />
                <Shield className="w-10 h-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary/50" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Verifying Certificate</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we validate the certificate authenticity...
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secure verification in progress</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isValid = verification?.valid && verification?.data
  const certData = verification?.data

  return (
    <div className={`min-h-screen ${
      isValid
        ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-950 dark:via-green-950/20 dark:to-gray-950"
        : "bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-950 dark:via-red-950/20 dark:to-gray-950"
    } flex items-center justify-center p-4`}>
      <div className="max-w-4xl w-full space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Main Verification Card */}
        <Card className="border-2 shadow-2xl">
          <CardHeader className="text-center pb-6 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex justify-center mb-4">
              {isValid ? (
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-14 h-14 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                    <XCircle className="w-14 h-14 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
            <CardTitle className="text-3xl font-bold">
              {isValid ? "✓ Certificate Verified" : "✗ Verification Failed"}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {isValid
                ? "This certificate has been successfully verified and is authentic"
                : error || "This certificate could not be verified"}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {isValid && certData ? (
              <>
                {/* Status Banner */}
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Valid Certificate
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        This certificate has been verified against our records and is authentic. All details
                        below have been confirmed as accurate.
                      </p>
                    </div>
                    <Badge className="bg-green-600 text-white">
                      Verified
                    </Badge>
                  </div>
                </div>

                {/* Certificate Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Certificate Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Information */}
                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {certData.user.profile_picture_url ? (
                              <img
                                src={certData.user.profile_picture_url}
                                alt={`${certData.user.first_name} ${certData.user.last_name}`}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Recipient</p>
                            <p className="font-semibold truncate">
                              {certData.user.first_name} {certData.user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {certData.user.email}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Course Information */}
                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Course</p>
                            <p className="font-semibold line-clamp-2">
                              {certData.course.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {certData.course.level}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {certData.course.language}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Score */}
                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Final Score</p>
                            <p className="text-3xl font-bold text-primary">
                              {certData.certificate.final_score}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Issue Date */}
                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Date Issued</p>
                            <p className="font-semibold">
                              {new Date(certData.certificate.issue_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                            {certData.certificate.expires_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Expires: {new Date(certData.certificate.expires_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Instructor & Institution */}
                  {(certData.instructor || certData.institution) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certData.instructor && (
                        <Card className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-1">Instructor</p>
                                <p className="font-medium truncate">{certData.instructor.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {certData.instructor.email}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {certData.institution && (
                        <Card className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {certData.institution.logo_url ? (
                                  <img
                                    src={certData.institution.logo_url}
                                    alt={certData.institution.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Building className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-1">Issued By</p>
                                <p className="font-medium truncate">{certData.institution.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {certData.institution.type}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Certificate Numbers */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Verification Information
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Certificate Number</p>
                          <p className="font-mono text-sm font-medium truncate">
                            {certData.certificate.certificate_number}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(certData.certificate.certificate_number)
                            toast({ title: "Copied!", description: "Certificate number copied" })
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Verification Code</p>
                          <p className="font-mono text-sm font-medium truncate">
                            {certData.certificate.verification_code}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyCode}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Verified At</p>
                          <p className="text-sm font-medium">
                            {new Date(certData.verification_details.verified_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Just Now
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button onClick={handleViewCertificate} className="flex-1 min-w-[200px]">
                    <Award className="w-4 h-4 mr-2" />
                    View Full Certificate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(certData.certificate.certificate_url, "_blank")}
                    className="flex-1 min-w-[200px]"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Certificate Link
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Invalid Certificate */}
                <div className="p-6 bg-red-50 dark:bg-red-950/30 rounded-lg border-2 border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        Certificate Not Valid
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                        {verification?.message || error || "This certificate could not be verified. The verification code may be incorrect, the certificate may have been revoked, or it may have expired."}
                      </p>
                      <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
                        <p className="font-medium">Possible reasons:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>The verification code is incorrect or incomplete</li>
                          <li>The certificate has been revoked by the issuing institution</li>
                          <li>The certificate has expired</li>
                          <li>The certificate does not exist in our system</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Code Display */}
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-2">Verification Code Attempted:</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="font-mono text-sm bg-background px-3 py-2 rounded border flex-1 truncate">
                      {code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCode}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Help Section */}
                <div className="text-center space-y-3 pt-4">
                  <p className="text-sm font-medium">Need Help?</p>
                  <p className="text-sm text-muted-foreground">
                    If you believe this is an error, please contact the institution that issued the
                    certificate or check that you have the correct verification code.
                  </p>
                  <Button variant="outline" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to Home
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Security Notice</p>
                <p className="text-xs text-muted-foreground">
                  This verification page uses secure protocols to validate certificate authenticity. All
                  verification data is encrypted and checked against our official records. If you have any
                  questions about this certificate's validity, please contact the issuing institution directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}