"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Award,
  Download,
  Share2,
  Eye,
  Search,
  Filter,
  Calendar,
  BookOpen,
  Trophy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  GraduationCap,
  Clock,
  Star,
  Target,
  Crown,
  Sparkles,
  Mail,
  Linkedin,
  Twitter,
  Facebook,
  Copy,
  Check,
  Printer,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Certificate {
  id: string;
  certificate_number: string;
  verification_code: string;
  issue_date: string;
  final_score: number;
  is_valid: boolean;
  expires_at: string | null;
  certificate_url: string;
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string | null;
    level: string;
    duration_minutes: number;
    language: string;
    category: string | null;
    tags: string[];
    instructor: {
      id: string;
      name: string;
      profile_picture_url: string | null;
    } | null;
    institution: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  };
  status: string;
  shareable_links: {
    public_verification: string;
    api_verification: string;
  };
}

interface CertificateData {
  certificates: Certificate[];
  user: {
    id: string;
    name: string;
    email: string;
    certificates_earned: number;
  };
  statistics: {
    total_certificates: number;
    valid_certificates: number;
    current_page_count: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function MyCertificatesPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [certificatesData, setCertificatesData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCertificates(currentPage);
    }
  }, [user, currentPage]);

  const fetchCertificates = async (page: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/user/my-certificates?page=${page}&limit=12`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          setCertificatesData(result.data);
        }
      } else {
        throw new Error("Failed to fetch certificates");
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCertificates(currentPage);
    setRefreshing(false);
    toast.success("Certificates refreshed");
  };

  const handleViewCertificate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateDialog(true);
  };

  const handleDownloadPDF = async (certificateId: string) => {
    setDownloadingId(certificateId);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/certificates/${certificateId}/pdf/download?download=true`;
      
      // Create a link and click it to download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Certificate download started");
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast.error("Failed to download certificate");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShareCertificate = async (certificate: Certificate, platform: string) => {
    const url = certificate.shareable_links.public_verification;
    const text = `I've earned a certificate for completing "${certificate.course.title}" on BwengePlus! 🎓`;
    
    let shareUrl = '';
    switch (platform) {
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent('My Course Certificate')}&body=${encodeURIComponent(text + '\n\n' + url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = (certificate: Certificate) => {
    navigator.clipboard.writeText(certificate.shareable_links.public_verification);
    toast.success("Certificate link copied to clipboard");
  };

  const handlePrintCertificate = (certificate: Certificate) => {
    window.open(`/certificates/${certificate.id}/print`, '_blank');
  };

  const handleVerifyCertificate = (certificate: Certificate) => {
    window.open(certificate.shareable_links.public_verification, '_blank');
  };

  const filteredCertificates = certificatesData?.certificates.filter((cert) => {
    const matchesSearch = 
      cert.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.course.instructor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.course.institution?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" || 
      (filterStatus === "valid" && cert.status === "VALID") ||
      (filterStatus === "expired" && cert.status === "EXPIRED") ||
      (filterStatus === "revoked" && cert.status === "REVOKED");
    
    const matchesYear = 
      filterYear === "all" || 
      new Date(cert.issue_date).getFullYear().toString() === filterYear;
    
    return matchesSearch && matchesStatus && matchesYear;
  }) || [];

  const sortedCertificates = [...filteredCertificates].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
      case "oldest":
        return new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime();
      case "title":
        return a.course.title.localeCompare(b.course.title);
      case "score_desc":
        return b.final_score - a.final_score;
      case "score_asc":
        return a.final_score - b.final_score;
      default:
        return 0;
    }
  });

  const years = certificatesData?.certificates
    ? [...new Set(certificatesData.certificates.map(c => new Date(c.issue_date).getFullYear().toString()))].sort().reverse()
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALID":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Valid
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return <Target className="w-4 h-4" />;
      case "INTERMEDIATE":
        return <Trophy className="w-4 h-4" />;
      case "ADVANCED":
      case "EXPERT":
        return <Crown className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return "bg-green-500";
      case "INTERMEDIATE":
        return "bg-blue-500";
      case "ADVANCED":
      case "EXPERT":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading && !certificatesData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Certificates
          </h1>
          <p className="text-gray-600">
            View and manage all your earned certificates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <Loader2 className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {certificatesData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Certificates</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {certificatesData.statistics.total_certificates}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Valid Certificates</p>
                  <p className="text-3xl font-bold text-green-600">
                    {certificatesData.statistics.valid_certificates}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {certificatesData.certificates.length > 0
                      ? Math.round(
                          certificatesData.certificates.reduce(
                            (sum, cert) => sum + cert.final_score,
                            0
                          ) / certificatesData.certificates.length
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Courses Completed</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {certificatesData.statistics.total_certificates}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by course, certificate number, instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-full md:w-40">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="title">Course Title</SelectItem>
            <SelectItem value="score_desc">Highest Score</SelectItem>
            <SelectItem value="score_asc">Lowest Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certificates Grid */}
      {sortedCertificates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Award className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Certificates Found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterStatus !== "all" || filterYear !== "all"
                ? "No certificates match your search or filter criteria."
                : "You haven't earned any certificates yet. Complete a course to earn your first certificate!"}
            </p>
            <Button asChild>
              <Link href="/dashboard/learner/browse/all">
                Browse Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCertificates.map((certificate) => (
            <Card key={certificate.id} className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 group">
              {/* Header with gradient */}
              <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute top-2 right-2">
                  {getStatusBadge(certificate.status)}
                </div>
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-white/90 text-gray-800">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(certificate.issue_date), "MMM d, yyyy")}
                  </Badge>
                </div>
                <div className="absolute bottom-2 right-2">
                  <Badge className={`${getLevelColor(certificate.course.level)} text-white`}>
                    <span className="flex items-center gap-1">
                      {getLevelIcon(certificate.course.level)}
                      {certificate.course.level}
                    </span>
                  </Badge>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Trophy className="w-12 h-12 text-yellow-300 opacity-80" />
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                  {certificate.course.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {certificate.course.description || "Certificate of Completion"}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2 space-y-3">
                {/* Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Final Score</span>
                  <span className="text-lg font-bold text-primary">
                    {certificate.final_score}%
                  </span>
                </div>

                {/* Course Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 p-2 bg-gray-50 rounded">
                    <BookOpen className="w-3 h-3 text-blue-500" />
                    <span className="truncate">{certificate.course.language}</span>
                  </div>
                  <div className="flex items-center gap-1 p-2 bg-gray-50 rounded">
                    <Clock className="w-3 h-3 text-purple-500" />
                    <span>{formatTime(certificate.course.duration_minutes)}</span>
                  </div>
                </div>

                {/* Instructor */}
                {certificate.course.instructor && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      {certificate.course.instructor.profile_picture_url ? (
                        <img
                          src={certificate.course.instructor.profile_picture_url}
                          alt={certificate.course.instructor.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <GraduationCap className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                    <span className="text-gray-600 truncate">
                      {certificate.course.instructor.name}
                    </span>
                  </div>
                )}

                {/* Certificate Number (truncated) */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Certificate #</p>
                  <p className="text-xs font-mono truncate">
                    {certificate.certificate_number}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleViewCertificate(certificate)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownloadPDF(certificate.id)}
                  disabled={downloadingId === certificate.id}
                >
                  {downloadingId === certificate.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-10 p-0"
                  onClick={() => handleCopyLink(certificate)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {certificatesData && certificatesData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {certificatesData.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === certificatesData.pagination.totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Certificate Detail Dialog */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Certificate Details
            </DialogTitle>
            <DialogDescription>
              View and manage your certificate
            </DialogDescription>
          </DialogHeader>

          {selectedCertificate && (
            <div className="space-y-6">
              {/* Certificate Preview */}
              <div className="border-4 border-double border-yellow-400 p-6 bg-gradient-to-br from-yellow-50 to-white rounded-lg text-center">
                <div className="mb-4">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Certificate of Completion
                </h2>
                
                <p className="text-gray-600 mb-4">
                  This is to certify that
                </p>
                
                <p className="text-xl font-bold text-blue-600 mb-4">
                  {user?.first_name} {user?.last_name}
                </p>
                
                <p className="text-gray-600 mb-2">
                  has successfully completed the course
                </p>
                
                <p className="text-lg font-bold text-gray-900 mb-4">
                  {selectedCertificate.course.title}
                </p>
                
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Final Score</p>
                    <p className="text-lg font-bold text-primary">
                      {selectedCertificate.final_score}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Issue Date</p>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedCertificate.issue_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                
                {selectedCertificate.course.institution && (
                  <p className="text-sm text-gray-600 mb-2">
                    Issued by {selectedCertificate.course.institution.name}
                  </p>
                )}
                
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs text-gray-400 mb-1">
                    Certificate #: {selectedCertificate.certificate_number}
                  </p>
                  <p className="text-xs text-gray-400">
                    Verification Code: {selectedCertificate.verification_code}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    onClick={() => handleDownloadPDF(selectedCertificate.id)}
                    disabled={downloadingId === selectedCertificate.id}
                    className="w-full"
                  >
                    {downloadingId === selectedCertificate.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    PDF
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePrintCertificate(selectedCertificate)}
                    className="w-full"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(selectedCertificate)}
                    className="w-full"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy Link
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleVerifyCertificate(selectedCertificate)}
                    className="w-full"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Verify
                  </Button>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2 text-center">
                    Share your achievement
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareCertificate(selectedCertificate, 'linkedin')}
                    >
                      <Linkedin className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareCertificate(selectedCertificate, 'twitter')}
                    >
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareCertificate(selectedCertificate, 'facebook')}
                    >
                      <Facebook className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareCertificate(selectedCertificate, 'email')}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Verification Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  Verification Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Certificate Number:</span>
                    <span className="font-mono">{selectedCertificate.certificate_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verification Code:</span>
                    <span className="font-mono">{selectedCertificate.verification_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(selectedCertificate.status)}
                  </div>
                  {selectedCertificate.expires_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span>{format(new Date(selectedCertificate.expires_at), "MMMM d, yyyy")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verification Link:</span>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-xs"
                      onClick={() => window.open(selectedCertificate.shareable_links.public_verification, '_blank')}
                    >
                      Open <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCertificateDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}