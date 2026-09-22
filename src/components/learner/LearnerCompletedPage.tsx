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
  Link2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CertificateModal,
  useCertificate,
} from "@/components/certificate";
import { BwengeCourseCard3D } from "@/components/course/bwenge-course-card-3d";
import { instructorName, resolveInstructor } from "@/lib/instructor"

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
  } | null;
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

  // The certificate the dialog is showing, fetched by id. Null while no
  // course is selected, or when the enrollment carries no certificate.
  const { certificate: canonicalCertificate } = useCertificate(
    selectedCertificate?.completion.certificate_id ?? null
  );

  // Download, share and copy-link all moved into <CertificateActions>.
  //
  // The download here rasterised the on-screen preview with html2canvas and
  // wrapped the bitmap in a jsPDF page sized in *pixels* — a fifth rendering
  // of the certificate, at whatever the device pixel ratio happened to be,
  // on no recognisable paper size, with no selectable text (C-05, C-06).
  // Share and copy built their URLs from the fabricated certificate id
  // above (C-12).

  const filteredCourses = completedCourses
    .filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           instructorName(course.instructor).toLowerCase().includes(searchTerm.toLowerCase());
      
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
              instructor={resolveInstructor(course.instructor)}
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

      {/*
        The certificate preview.

        This was a *fifth* certificate design — a yellow gradient panel with
        a lucide GraduationCap and a double border — printing the session
        user's name rather than the record's (C-09), a raw score (C-10), and
        a "Verify at:" line built from a fabricated id (C-12). None of it
        resembled the document the learner actually downloads (C-02).

        It is the shared modal now. Share, copy-link and download come with
        it, so no capability is lost.
      */}
      <CertificateModal
        certificate={canonicalCertificate}
        open={showCertificateDialog}
        onOpenChange={setShowCertificateDialog}
        title="Course certificate"
      />
    </div>
  );
}