"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Award,
  Download,
  Eye,
  Share2,
  Search,
  Filter,
  Calendar,
  BookOpen,
  Loader2,
  Trophy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  GraduationCap,
  Clock,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"

interface Certificate {
  id: string
  certificate_number: string
  verification_code: string
  issue_date: string
  final_score: string | number
  is_valid: boolean
  expires_at: string | null
  certificate_url: string
  course: {
    id: string
    title: string
    description: string
    thumbnail_url: string | null
    level: string
    duration_minutes: number
    language: string
    category: string | null
    tags: string[]
    instructor: {
      id: string
      name: string
      profile_picture_url: string | null
    } | null
    institution: {
      id: string
      name: string
      logo_url: string | null
    } | null
  }
  status: string
  shareable_links: {
    public_verification: string
    api_verification: string
  }
}

interface CertificateData {
  certificates: Certificate[]
  user: {
    id: string
    name: string
    email: string
    certificates_earned: number
  }
  statistics: {
    total_certificates: number
    valid_certificates: number
    current_page_count: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function MyCertificatesPage() {
  const router = useRouter()
  const { token, user } = useAuth()
  const [certificatesData, setCertificatesData] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) {
      router.push("/login")
      return
    }

    fetchCertificates(currentPage)
  }, [token, user, router, currentPage])

  const fetchCertificates = async (page: number) => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken) return

    try {
      setLoading(true)
      console.log("📜 [fetchCertificates] Fetching certificates...")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/user/my-certificates?page=${page}&limit=20`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log("✅ [fetchCertificates] Certificates loaded:", result)

        if (result.success && result.data) {
          setCertificatesData(result.data)
        }
      } else {
        throw new Error("Failed to fetch certificates")
      }
    } catch (error) {
      console.error("❌ [fetchCertificates] Error:", error)
      toast({
        title: "Error",
        description: "Failed to load certificates. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (certificateId: string) => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken) return

    try {
      const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/certificates/${certificateId}/pdf/download?download=true`
      window.open(pdfUrl, "_blank")

      toast({
        title: "Download Started",
        description: "Your certificate PDF is being downloaded.",
      })
    } catch (error) {
      console.error("❌ [handleDownloadPDF] Error:", error)
      toast({
        title: "Error",
        description: "Failed to download certificate.",
        variant: "destructive",
      })
    }
  }

  const handleViewCertificate = (certificateId: string) => {
    router.push(`/certificates/${certificateId}`)
  }

  const handleShare = (verificationUrl: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Certificate Verification",
        url: verificationUrl,
      })
    } else {
      navigator.clipboard.writeText(verificationUrl)
      toast({
        title: "Link Copied",
        description: "Verification link copied to clipboard",
      })
    }
  }

  const filteredCertificates = certificatesData?.certificates.filter((cert) => {
    const matchesSearch =
      cert.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "valid" && cert.status === "VALID") ||
      (filterStatus === "expired" && cert.status === "EXPIRED") ||
      (filterStatus === "revoked" && cert.status === "REVOKED")

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading certificates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Certificates</h1>
              <p className="text-muted-foreground">
                View and manage all your earned certificates
              </p>
            </div>
          </div>

          {/* Statistics Cards */}
          {certificatesData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Certificates</p>
                      <p className="text-3xl font-bold text-primary">
                        {certificatesData.statistics.total_certificates}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valid Certificates</p>
                      <p className="text-3xl font-bold text-green-600">
                        {certificatesData.statistics.valid_certificates}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {certificatesData.certificates.length > 0
                          ? Math.round(
                              certificatesData.certificates.reduce(
                                (sum, cert) => sum + Number(cert.final_score),
                                0
                              ) / certificatesData.certificates.length
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by course name or certificate number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full md:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="valid">Valid</TabsTrigger>
                  <TabsTrigger value="expired">Expired</TabsTrigger>
                  <TabsTrigger value="revoked">Revoked</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Grid */}
        {filteredCertificates && filteredCertificates.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCertificates.map((certificate) => (
              <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            certificate.status === "VALID"
                              ? "default"
                              : certificate.status === "EXPIRED"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {certificate.status}
                        </Badge>
                        <Badge variant="outline">{certificate.course.level}</Badge>
                      </div>
                      <CardTitle className="text-lg line-clamp-2">
                        {certificate.course.title}
                      </CardTitle>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white">
                        <Award className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Course Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(certificate.issue_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(certificate.course.duration_minutes / 60)}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      <span className="font-semibold text-primary">
                        {certificate.final_score}%
                      </span>
                    </div>
                  </div>

                  {/* Instructor/Institution */}
                  {(certificate.course.instructor || certificate.course.institution) && (
                    <div className="flex items-center gap-2 text-sm">
                      {certificate.course.instructor && (
                        <span className="text-muted-foreground">
                          by {certificate.course.instructor.name}
                        </span>
                      )}
                      {certificate.course.institution && (
                        <span className="text-muted-foreground">
                          • {certificate.course.institution.name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Certificate Number */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Certificate Number</p>
                    <p className="font-mono text-sm truncate">{certificate.certificate_number}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleViewCertificate(certificate.id)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(certificate.id)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(certificate.shareable_links.public_verification)}
                      className="w-full"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(certificate.shareable_links.public_verification, "_blank")}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Verify
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Award className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Certificates Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filterStatus !== "all"
                  ? "No certificates match your search or filter criteria."
                  : "You haven't earned any certificates yet. Complete a course to earn your first certificate!"}
              </p>
              <Button onClick={() => router.push("/courses")}>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {certificatesData && certificatesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {certificatesData.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === certificatesData.pagination.totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}