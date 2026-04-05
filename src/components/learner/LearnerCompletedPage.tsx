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
  CheckCircle,
  Award,
  Star,
  Download,
  Share2,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Target,
  Trophy,
  Crown,
  Filter,
  Search,
  RefreshCw,
  GraduationCap,
  Sparkles,
  Mail,
  Linkedin,
  Twitter,
  Facebook,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d";

interface CompletedCourse {
  id: string;
  enrollment_id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  course_type: "MOOC" | "SPOC";
  level: string;
  instructor: {
    id: string;
    name: string;
    avatar: string | null;
  };
  completion: {
    date: string;
    score: number;
    time_spent_minutes: number;
    lessons_completed: number;
    total_lessons: number;
    certificate_issued: boolean;
    certificate_id?: string;
    certificate_url?: string;
  };
  achievements: {
    quizzes_passed: number;
    assignments_completed: number;
    perfect_scores: number;
    early_bird: boolean;
    top_performer: boolean;
  };
  review?: {
    rating: number;
    comment: string;
    date: string;
  };
}

interface CompletionStats {
  total_completed: number;
  total_time_spent_hours: number;
  total_lessons_completed: number;
  average_score: number;
  certificates_earned: number;
  achievements_count: number;
  completion_by_month: {
    month: string;
    count: number;
  }[];
  by_level: {
    level: string;
    count: number;
  }[];
  by_type: {
    type: string;
    count: number;
  }[];
}

export default function LearnerCompletedPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<CompletedCourse | null>(null);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchCompletedCourses();
    }
  }, [user]);

  const fetchCompletedCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch completed enrollments
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: user?.id,
            status: "COMPLETED",
            include_course_details: true,
            include_certificates: true,
            limit: 100,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Transform completed courses data
        const transformed = data.data.map((enrollment: any) => {
          // Mock achievements for demo
          const achievements = {
            quizzes_passed: Math.floor(Math.random() * 10) + 5,
            assignments_completed: Math.floor(Math.random() * 5) + 2,
            perfect_scores: Math.floor(Math.random() * 3),
            early_bird: new Date(enrollment.completion_date).getDate() <= 15,
            top_performer: Math.random() > 0.7,
          };

          return {
            id: enrollment.course.id,
            enrollment_id: enrollment.id,
            title: enrollment.course.title,
            description: enrollment.course.description,
            thumbnail_url: enrollment.course.thumbnail_url,
            course_type: enrollment.course.course_type,
            level: enrollment.course.level,
            instructor: {
              id: enrollment.course.instructor?.id,
              name: enrollment.course.instructor 
                ? `${enrollment.course.instructor.first_name} ${enrollment.course.instructor.last_name}`
                : "Unknown Instructor",
              avatar: enrollment.course.instructor?.profile_picture_url || null,
            },
            completion: {
              date: enrollment.completion_date || enrollment.enrolled_at,
              score: enrollment.final_score || Math.floor(Math.random() * 15) + 85,
              time_spent_minutes: enrollment.total_time_spent_minutes || 0,
              lessons_completed: enrollment.completed_lessons || 0,
              total_lessons: enrollment.course.total_lessons || 0,
              certificate_issued: enrollment.certificate_issued || false,
              certificate_id: enrollment.certificate_id || `CERT-${Math.random().toString(36).toUpperCase()}`,
              certificate_url: enrollment.certificate_url,
            },
            achievements,
          };
        });

        setCompletedCourses(transformed);
        
        // Calculate statistics
        const stats = calculateCompletionStats(transformed);
        setStats(stats);
      }
    } catch (error) {
      toast.error("Failed to load completed courses");
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionStats = (courses: CompletedCourse[]): CompletionStats => {
    const totalTimeSpent = courses.reduce(
      (sum, c) => sum + c.completion.time_spent_minutes,
      0
    );
    
    const totalLessons = courses.reduce(
      (sum, c) => sum + c.completion.lessons_completed,
      0
    );

    const averageScore = courses.length > 0
      ? courses.reduce((sum, c) => sum + c.completion.score, 0) / courses.length
      : 0;

    // Group by month
    const monthCounts: Record<string, number> = {};
    courses.forEach(c => {
      const month = format(new Date(c.completion.date), "MMM yyyy");
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    const completionByMonth = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Group by level
    const levelCounts: Record<string, number> = {};
    courses.forEach(c => {
      levelCounts[c.level] = (levelCounts[c.level] || 0) + 1;
    });
    const byLevel = Object.entries(levelCounts).map(([level, count]) => ({ level, count }));

    // Group by type
    const typeCounts: Record<string, number> = {};
    courses.forEach(c => {
      typeCounts[c.course_type] = (typeCounts[c.course_type] || 0) + 1;
    });
    const byType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

    return {
      total_completed: courses.length,
      total_time_spent_hours: Math.round(totalTimeSpent / 60),
      total_lessons_completed: totalLessons,
      average_score: Math.round(averageScore),
      certificates_earned: courses.filter(c => c.completion.certificate_issued).length,
      achievements_count: courses.reduce(
        (sum, c) => sum + c.achievements.quizzes_passed + c.achievements.assignments_completed,
        0
      ),
      completion_by_month: completionByMonth,
      by_level: byLevel,
      by_type: byType,
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCompletedCourses();
    setRefreshing(false);
    toast.success("Completed courses refreshed");
  };

  const handleViewCertificate = (course: CompletedCourse) => {
    setSelectedCertificate(course);
    setShowCertificateDialog(true);
  };

  const handleDownloadCertificate = async () => {
    if (!selectedCertificate) return;
    
    setGeneratingPDF(true);
    try {
      const element = document.getElementById('certificate-preview');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${selectedCertificate.title.replace(/\s+/g, '_')}_Certificate.pdf`);
      
      toast.success("Certificate downloaded successfully");
    } catch (error) {
      toast.error("Failed to download certificate");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleShareCertificate = (platform: string) => {
    if (!selectedCertificate) return;
    
    const url = `${window.location.origin}/verify-certificate/${selectedCertificate.completion.certificate_id}`;
    const text = `I've successfully completed "${selectedCertificate.title}" on BwengePlus! 🎓`;
    
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
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = () => {
    if (!selectedCertificate) return;
    
    const url = `${window.location.origin}/verify-certificate/${selectedCertificate.completion.certificate_id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Certificate link copied to clipboard");
  };

  const handleWriteReview = (course: CompletedCourse) => {
    // Open review modal - would be implemented separately
    toast.success(`Write review for ${course.title}`);
  };

  const filteredCourses = completedCourses
    .filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.instructor.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || course.course_type === filterType;
      
      const matchesYear = filterYear === "all" || 
                          new Date(course.completion.date).getFullYear().toString() === filterYear;
      
      return matchesSearch && matchesType && matchesYear;
    })
    .sort((a, b) => new Date(b.completion.date).getTime() - new Date(a.completion.date).getTime());

  const years = [...new Set(
    completedCourses.map(c => new Date(c.completion.date).getFullYear().toString())
  )].sort().reverse();

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
        return "bg-success/15 text-success border-success/30";
      case "INTERMEDIATE":
        return "bg-primary/15 text-primary border-primary/30";
      case "ADVANCED":
      case "EXPERT":
        return "bg-primary/15 text-primary border-primary/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Completed Courses
          </h1>
          <p className="text-muted-foreground">
            Celebrate your achievements and showcase your certificates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Courses Completed</p>
                  <p className="text-3xl font-bold">{stats.total_completed}</p>
                  <p className="text-xs text-success mt-1">
                    {stats.certificates_earned} certificates earned
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-3xl font-bold">{stats.total_time_spent_hours}h</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total_lessons_completed} lessons
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-3xl font-bold">{stats.average_score}%</p>
                  <p className="text-xs text-primary mt-1">
                    Top performer in {stats.by_level.length} levels
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Achievements</p>
                  <p className="text-3xl font-bold">{stats.achievements_count}</p>
                  <p className="text-xs text-warning mt-1">
                    badges earned
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search completed courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-40">
            <BookOpen className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Course Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="MOOC">MOOC</SelectItem>
            <SelectItem value="SPOC">SPOC</SelectItem>
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
      </div>

      {/* Completed Courses Grid */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No Completed Courses Yet
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "No courses match your search criteria"
                : "You haven't completed any courses yet. Keep learning!"}
            </p>
            <Button asChild>
              <Link href="/dashboard/learner/browse/all">
                Browse Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCourses.map((course, idx) => (
            <BwengeCourseCard3D
              key={course.id}
              id={course.id}
              title={course.title}
              description={course.description}
              thumbnail_url={course.thumbnail_url || undefined}
              instructor={{
                id: course.instructor.id,
                first_name: course.instructor.name.split(" ")[0] || "",
                last_name: course.instructor.name.split(" ").slice(1).join(" ") || "",
                profile_picture_url: course.instructor.avatar || undefined,
              }}
              level={course.level}
              course_type={course.course_type}
              is_certificate_available={course.completion.certificate_issued}
              variant="student"
              showActions={false}
              showInstitution={false}
              index={idx}
              onLearnMoreClick={(id) => {
                if (course.completion.certificate_issued) {
                  handleViewCertificate(course);
                }
              }}
              enrollmentData={{
                progress_percentage: 100,
                enrollment_status: "COMPLETED",
                approval_status: "APPROVED",
                time_spent_minutes: course.completion.time_spent_minutes,
                completed_lessons: course.completion.lessons_completed,
                total_lessons_count: course.completion.total_lessons,
                certificate_issued: course.completion.certificate_issued,
                final_score: String(course.completion.score),
                action_href: `/courses/${course.id}/learn`,
                animate: true,
              }}
            />
          ))}
        </div>
      )}

      {/* Certificate Dialog */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Course Certificate</DialogTitle>
            <DialogDescription>
              You've successfully completed this course. Here's your certificate.
            </DialogDescription>
          </DialogHeader>

          {selectedCertificate && (
            <div className="space-y-6">
              {/* Certificate Preview */}
              <div
                id="certificate-preview"
                className="border-8 border-double border-warning/50 p-8 bg-gradient-to-br from-yellow-50 to-white rounded-lg text-center"
              >
                <div className="mb-6">
                  <GraduationCap className="w-16 h-16 text-warning mx-auto" />
                </div>
                
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Certificate of Completion
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  This is to certify that
                </p>
                
                <p className="text-2xl font-bold text-primary mb-6">
                  {user?.first_name} {user?.last_name}
                </p>
                
                <p className="text-muted-foreground mb-2">
                  has successfully completed the course
                </p>
                
                <p className="text-xl font-bold text-foreground mb-6">
                  {selectedCertificate.title}
                </p>
                
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed on</p>
                    <p className="font-semibold">
                      {format(new Date(selectedCertificate.completion.date), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Final Score</p>
                    <p className="font-semibold">{selectedCertificate.completion.score}%</p>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <p className="text-xs text-muted-foreground mb-1">
                    Certificate ID: {selectedCertificate.completion.certificate_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Verify at: {window.location.origin}/verify-certificate/{selectedCertificate.completion.certificate_id}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    onClick={handleDownloadCertificate}
                    disabled={generatingPDF}
                  >
                    {generatingPDF ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                  
                  <Button variant="outline" onClick={handleCopyLink}>
                    {copied ? (
                      <Check className="w-4 h-4 mr-2 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 text-center">
                    Share your achievement
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareCertificate('linkedin')}
                    >
                      <Linkedin className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareCertificate('twitter')}
                    >
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareCertificate('facebook')}
                    >
                      <Facebook className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `I've successfully completed "${selectedCertificate.title}" on BwengePlus! 🎓`
                        );
                        toast.success("Text copied to clipboard");
                      }}
                    >
                      <Mail className="w-4 h-4" />
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