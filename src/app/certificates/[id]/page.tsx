"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Trophy, Award, Download, Share2, CheckCircle, Calendar, 
  User, BookOpen, Building, Loader2, AlertCircle, ArrowLeft,
  Shield, ExternalLink
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"

interface CertificateData {
  id: string
  certificate_number: string
  verification_code: string
  issue_date: string
  final_score: number
  is_valid: boolean
  expires_at: string | null
  certificate_url: string
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
    thumbnail_url: string | null
    level: string
    duration_minutes: number
    language: string
  }
  instructor: {
    id: string
    name: string
    email: string
  } | null
  institution: {
    id: string
    name: string
    logo_url: string | null
  } | null
  verification_details: {
    verification_url: string
    api_verification_url: string
    qr_code_url: string
  }
  status: string
}

export default function CertificatePage() {
  const params = useParams()
  const router = useRouter()
  const { token, user } = useAuth()
  const certificateId = params?.id as string

  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (certificateId) {
      fetchCertificate()
    }
  }, [certificateId])

  const fetchCertificate = async () => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken) {
      setError("Please login to view this certificate")
      setLoading(false)
      return
    }

    try {
      console.log("📜 [fetchCertificate] Fetching certificate:", certificateId)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/${certificateId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch certificate")
      }

      const result = await response.json()

      if (result.success && result.data) {
        setCertificate(result.data)
        console.log("✅ [fetchCertificate] Certificate loaded:", result.data)
      } else {
        throw new Error(result.message || "Certificate not found")
      }
    } catch (err: any) {
      console.error("❌ [fetchCertificate] Error:", err)
      setError(err.message || "Failed to load certificate")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!certificate) return

    setDownloading(true)

    try {
      console.log("📥 [handleDownloadPDF] Downloading certificate PDF...")

      // Open PDF in new tab
      const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/certificates/${certificate.id}/pdf/download?download=true`
      window.open(pdfUrl, "_blank")

      toast({
        title: "Download Started",
        description: "Your certificate PDF is being downloaded.",
      })
    } catch (error) {
      console.error("❌ [handleDownloadPDF] Error:", error)
      toast({
        title: "Error",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleViewPDF = () => {
    if (!certificate) return

    const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/certificates/${certificate.id}/pdf/download`
    window.open(pdfUrl, "_blank")
  }

  const handleShare = () => {
    if (!certificate) return

    const shareUrl = certificate.certificate_url
    
    if (navigator.share) {
      navigator.share({
        title: `Certificate - ${certificate.course.title}`,
        text: `Check out my certificate for completing ${certificate.course.title}!`,
        url: shareUrl,
      })
    } else {
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link Copied",
        description: "Certificate link copied to clipboard",
      })
    }
  }

  const handleVerify = () => {
    if (!certificate) return
    // ✅ Navigate to verification page with verification code
    router.push(`/certificates/verify/${certificate.verification_code}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading certificate...</p>
        </div>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-xl font-bold mb-2">Certificate Not Found</h2>
              <p className="text-muted-foreground">{error || "This certificate does not exist or you don't have permission to view it."}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Main Certificate Card */}
        <Card className="max-w-5xl mx-auto shadow-2xl">
          <CardContent className="p-0">
            {/* Status Banner */}
            <div className={`px-6 py-3 ${
              certificate.status === "VALID" 
                ? "bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800" 
                : certificate.status === "EXPIRED"
                ? "bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800"
                : "bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {certificate.status === "VALID" && (
                    <>
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-900 dark:text-green-100">
                        Valid Certificate
                      </span>
                    </>
                  )}
                  {certificate.status === "EXPIRED" && (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-yellow-900 dark:text-yellow-100">
                        Certificate Expired
                      </span>
                    </>
                  )}
                  {certificate.status === "REVOKED" && (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-900 dark:text-red-100">
                        Certificate Revoked
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVerify}
                  className="text-primary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Verify Certificate
                </Button>
              </div>
            </div>

            {/* Certificate Display */}
            <div className="p-12">
              {/* Trophy Icon */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mb-4">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-primary mb-2">
                  Certificate of Completion
                </h1>
                <p className="text-muted-foreground">
                  This certifies that
                </p>
              </div>

              {/* Student Name */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  {certificate.user.profile_picture_url && (
                    <img
                      src={certificate.user.profile_picture_url}
                      alt={`${certificate.user.first_name} ${certificate.user.last_name}`}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <h2 className="text-3xl font-bold">
                    {certificate.user.first_name} {certificate.user.last_name}
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  has successfully completed
                </p>
              </div>

              {/* Course Info */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold text-primary mb-4">
                  {certificate.course.title}
                </h3>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Badge variant="secondary" className="text-sm">
                    {certificate.course.level}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {certificate.course.language}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {Math.floor(certificate.course.duration_minutes / 60)}h {certificate.course.duration_minutes % 60}m
                  </Badge>
                </div>
              </div>

              {/* Score and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
                <Card className="bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-3xl font-bold text-primary">
                      {certificate.final_score}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Final Score
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-semibold">
                      {new Date(certificate.issue_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Date Issued
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-8" />

              {/* Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-8">
                {certificate.instructor && (
                  <div className="text-center">
                    <div className="border-t-2 border-foreground/20 pt-2 mb-2">
                      <p className="font-semibold">{certificate.instructor.name}</p>
                      <p className="text-sm text-muted-foreground">Course Instructor</p>
                    </div>
                  </div>
                )}

                {certificate.institution && (
                  <div className="text-center">
                    <div className="border-t-2 border-foreground/20 pt-2 mb-2">
                      <p className="font-semibold">{certificate.institution.name}</p>
                      <p className="text-sm text-muted-foreground">Issuing Institution</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Certificate Details */}
              <div className="bg-muted/50 rounded-lg p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  Certificate Number: <span className="font-mono font-medium">{certificate.certificate_number}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Verification Code: <span className="font-mono font-medium">{certificate.verification_code}</span>
                </p>
                {certificate.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(certificate.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t p-6">
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={handleViewPDF}
                  className="flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  View PDF
                </Button>

                <Button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download PDF
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>

                <Button
                  onClick={handleVerify}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Verify
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="max-w-5xl mx-auto mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">About This Certificate</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Recipient
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {certificate.user.first_name} {certificate.user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{certificate.user.email}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Course
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {certificate.course.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {certificate.course.description}
                  </p>
                </div>

                {certificate.institution && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Institution
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {certificate.institution.name}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Status
                  </h4>
                  <Badge
                    variant={certificate.status === "VALID" ? "default" : "destructive"}
                  >
                    {certificate.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}