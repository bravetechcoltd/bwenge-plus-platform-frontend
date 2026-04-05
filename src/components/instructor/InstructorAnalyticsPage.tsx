// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Award,
  Target,
  Star,
  FileText,
  Video,
  MessageSquare,
  ThumbsUp,
  TrendingDown,
  GraduationCap,
  Sparkles,
  Globe,
  Lock,
  Filter,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, subDays, subMonths, subYears, formatDistance } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Scatter,
} from "recharts";

// ==================== TYPES ====================

interface InstructorAnalytics {
  overview: {
    total_courses: number;
    published_courses: number;
    draft_courses: number;
    archived_courses: number;
    total_students: number;
    active_students: number;
    completed_students: number;
    average_completion_rate: number;
    total_enrollments: number;
    total_revenue?: number;
  };
  
  performance: {
    average_rating: number;
    total_reviews: number;
    rating_distribution: {
      stars: number;
      count: number;
    }[];
    top_rated_courses: {
      id: string;
      title: string;
      average_rating: number;
      total_reviews: number;
    }[];
  };
  
  engagement: {
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
    average_time_spent_minutes: number;
    total_time_spent_hours: number;
    lessons_completed: number;
    assessments_completed: number;
    engagement_trend: {
      date: string;
      active_users: number;
      lessons_completed: number;
    }[];
  };
  
  progress: {
    students_by_status: {
      status: string;
      count: number;
    }[];
    completion_distribution: {
      range: string;
      count: number;
    }[];
    average_progress_by_course: {
      course_id: string;
      course_title: string;
      average_progress: number;
      student_count: number;
    }[];
  };
  
  content: {
    total_modules: number;
    total_lessons: number;
    total_videos: number;
    total_assessments: number;
    total_quizzes: number;
    total_resources: number;
    content_by_type: {
      type: string;
      count: number;
    }[];
    popular_content: {
      id: string;
      title: string;
      type: string;
      views: number;
      completions: number;
    }[];
  };
  
  trends: {
    enrollments_over_time: {
      period: string;
      count: number;
    }[];
    completions_over_time: {
      period: string;
      count: number;
    }[];
    revenue_over_time?: {
      period: string;
      amount: number;
    }[];
    growth_rates: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  };
  
  students: {
    top_students: {
      id: string;
      name: string;
      email: string;
      courses_enrolled: number;
      courses_completed: number;
      average_score: number;
      total_time_spent_minutes: number;
      last_active: string;
    }[];
    at_risk_students: {
      id: string;
      name: string;
      email: string;
      course_title: string;
      progress_percentage: number;
      days_inactive: number;
      risk_level: "low" | "medium" | "high";
    }[];
    student_demographics?: {
      country?: string;
      count: number;
    }[];
  };
  
  courses: {
    by_type: {
      type: string;
      count: number;
      students: number;
    }[];
    by_level: {
      level: string;
      count: number;
      students: number;
    }[];
    by_status: {
      status: string;
      count: number;
    }[];
  };
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82CA9D", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#F9D56E", "#F38181", "#A8E6CF", "#FFD3B6", "#D4A5A5"
];

const STATUS_COLORS = {
  ACTIVE: "#4CAF50",
  COMPLETED: "#2196F3",
  DROPPED: "#F44336",
  PENDING: "#FF9800",
  EXPIRED: "#9E9E9E",
};

export default function InstructorAnalyticsPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<InstructorAnalytics | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [courses, setCourses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user?.id) {
      fetchInstructorCourses();
      fetchAnalytics();
    }
  }, [user, selectedTimeRange, selectedCourse]);

  const fetchInstructorCourses = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/courses?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data?.courses || []);
      }
    } catch (error) {
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Determine date range
      let startDate = new Date();
      switch (selectedTimeRange) {
        case "7d":
          startDate = subDays(new Date(), 7);
          break;
        case "30d":
          startDate = subDays(new Date(), 30);
          break;
        case "90d":
          startDate = subDays(new Date(), 90);
          break;
        case "1y":
          startDate = subYears(new Date(), 1);
          break;
        default:
          startDate = subDays(new Date(), 30);
      }

      // Fetch instructor analytics from multiple endpoints
      const [
        coursesResponse,
        studentsResponse,
        enrollmentsResponse,
        assessmentsResponse,
        reviewsResponse
      ] = await Promise.all([
        // Get instructor's courses with statistics
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/instructor/courses?include_stats=true&limit=100`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        
        // Get all students across instructor's courses
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/instructor/students?limit=1000`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        
        // Get enrollment analytics
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/enrollments/analytics/instructor?` +
          `start_date=${startDate.toISOString()}` +
          (selectedCourse !== "all" ? `&course_id=${selectedCourse}` : ""),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        
        // Get assessment statistics
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/instructor/assessments/stats` +
          (selectedCourse !== "all" ? `?course_id=${selectedCourse}` : ""),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        
        // Get course reviews
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/instructor/reviews` +
          (selectedCourse !== "all" ? `?course_id=${selectedCourse}` : ""),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      ]);

      const [
        coursesData,
        studentsData,
        enrollmentsData,
        assessmentsData,
        reviewsData
      ] = await Promise.all([
        coursesResponse.json(),
        studentsResponse.json(),
        enrollmentsResponse.json(),
        assessmentsResponse.json(),
        reviewsResponse.json()
      ]);

      // Process and combine data
      const analytics = processAnalyticsData(
        coursesData,
        studentsData,
        enrollmentsData,
        assessmentsData,
        reviewsData,
        selectedTimeRange
      );

      setAnalytics(analytics);
    } catch (error) {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (
    coursesData: any,
    studentsData: any,
    enrollmentsData: any,
    assessmentsData: any,
    reviewsData: any,
    timeRange: string
  ): InstructorAnalytics => {
    const courses = coursesData.data?.courses || [];
    const students = studentsData.students || [];
    const enrollments = enrollmentsData.data?.enrollments || [];
    const assessments = assessmentsData.data || {};
    const reviews = Array.isArray(reviewsData.data) ? reviewsData.data : (reviewsData.data?.reviews || []);

    // Calculate overview metrics
    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c: any) => c.status === "PUBLISHED").length;
    const draftCourses = courses.filter((c: any) => c.status === "DRAFT").length;
    const archivedCourses = courses.filter((c: any) => c.status === "ARCHIVED").length;

    // Student metrics
    const totalStudents = students.length;
    const activeStudents = students.filter((s: any) => 
      s.enrollment?.status === "ACTIVE"
    ).length;
    const completedStudents = students.filter((s: any) => 
      s.enrollment?.status === "COMPLETED"
    ).length;

    // Calculate average completion rate
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter((e: any) => 
      e.status === "COMPLETED"
    ).length;
    const averageCompletionRate = totalEnrollments > 0 
      ? (completedEnrollments / totalEnrollments) * 100 
      : 0;

    // Rating metrics
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
      : 0;

    // Rating distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: reviews.filter((r: any) => Math.floor(r.rating) === stars).length,
    }));

    // Top rated courses
    const topRatedCourses = courses
      .filter((c: any) => c.average_rating > 0)
      .sort((a: any, b: any) => b.average_rating - a.average_rating)
      .slice(0, 5)
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        average_rating: c.average_rating,
        total_reviews: c.total_reviews || 0,
      }));

    // Students by status
    const studentsByStatus = [
      { status: "ACTIVE", count: activeStudents },
      { status: "COMPLETED", count: completedStudents },
      { status: "DROPPED", count: students.filter((s: any) => s.enrollment?.status === "DROPPED").length },
      { status: "PENDING", count: students.filter((s: any) => s.enrollment?.status === "PENDING").length },
    ].filter(item => item.count > 0);

    // Completion distribution
    const completionRanges = [
      { range: "0-20%", min: 0, max: 20 },
      { range: "21-40%", min: 21, max: 40 },
      { range: "41-60%", min: 41, max: 60 },
      { range: "61-80%", min: 61, max: 80 },
      { range: "81-100%", min: 81, max: 100 },
    ];

    const completionDistribution = completionRanges.map(range => ({
      range: range.range,
      count: students.filter((s: any) => {
        const progress = s.progress?.completion_percentage || 0;
        return progress >= range.min && progress <= range.max;
      }).length,
    }));

    // Average progress by course
    const averageProgressByCourse = courses.map((course: any) => {
      const courseEnrollments = enrollments.filter((e: any) => e.course_id === course.id);
      const avgProgress = courseEnrollments.length > 0
        ? courseEnrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / courseEnrollments.length
        : 0;
      return {
        course_id: course.id,
        course_title: course.title,
        average_progress: avgProgress,
        student_count: courseEnrollments.length,
      };
    }).filter((c: any) => c.student_count > 0);

    // Content metrics
    const totalModules = courses.reduce((sum: number, c: any) => sum + (c.modules?.length || 0), 0);
    const totalLessons = courses.reduce((sum: number, c: any) => sum + (c.total_lessons || 0), 0);
    const totalVideos = courses.reduce((sum: number, c: any) => 
      sum + (c.lessons?.filter((l: any) => l.type === "VIDEO").length || 0), 0
    );
    const totalAssessments = assessments.total || 0;
    const totalQuizzes = assessments.quizzes || 0;

    // Content by type
    const contentByType = [
      { type: "Videos", count: totalVideos },
      { type: "Quizzes", count: totalQuizzes },
      { type: "Assignments", count: assessments.assignments || 0 },
      { type: "Resources", count: courses.reduce((sum: number, c: any) => 
        sum + (c.resources?.length || 0), 0
      ) },
    ].filter(item => item.count > 0);

    // Popular content
    const popularContent = courses
      .flatMap((course: any) => (course.lessons || []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        views: lesson.views || 0,
        completions: lesson.completions || 0,
      })))
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 5);

    // Generate trends data
    const periods = generateTimePeriods(timeRange);
    const enrollmentsOverTime = periods.map(period => ({
      period,
      count: enrollments.filter((e: any) => 
        format(new Date(e.enrolled_at), "yyyy-MM-dd") === period
      ).length,
    }));

    const completionsOverTime = periods.map(period => ({
      period,
      count: enrollments.filter((e: any) => 
        e.status === "COMPLETED" && 
        format(new Date(e.completion_date || e.updated_at), "yyyy-MM-dd") === period
      ).length,
    }));

    // Engagement trend
    const engagementTrend = periods.slice(-30).map(period => ({
      date: period,
      active_users: students.filter((s: any) => 
        s.enrollment?.last_accessed &&
        format(new Date(s.enrollment.last_accessed), "yyyy-MM-dd") === period
      ).length,
      lessons_completed: 0, // Would need lesson completion tracking
    }));

    // Top students
    const topStudents = students
      .sort((a: any, b: any) => (b.progress?.completion_percentage || 0) - (a.progress?.completion_percentage || 0))
      .slice(0, 5)
      .map((s: any) => ({
        id: s.student?.id || s.id,
        name: `${s.student?.first_name || s.first_name} ${s.student?.last_name || s.last_name}`,
        email: s.student?.email || s.email,
        courses_enrolled: s.courses?.length || 1,
        courses_completed: s.enrollment?.status === "COMPLETED" ? 1 : 0,
        average_score: s.progress?.average_score || 0,
        total_time_spent_minutes: s.details?.time_metrics?.total_time_spent_minutes || 0,
        last_active: s.enrollment?.last_accessed,
      }));

    // At-risk students
    const atRiskStudents = students
      .filter((s: any) => {
        const lastActive = s.enrollment?.last_accessed;
        if (!lastActive) return false;
        const daysInactive = Math.floor(
          (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
        );
        const progress = s.progress?.completion_percentage || 0;
        return daysInactive > 7 && progress < 50;
      })
      .slice(0, 5)
      .map((s: any) => {
        const lastActive = s.enrollment?.last_accessed;
        const daysInactive = lastActive
          ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const progress = s.progress?.completion_percentage || 0;
        
        let riskLevel: "low" | "medium" | "high" = "low";
        if (daysInactive > 14 || progress < 20) riskLevel = "high";
        else if (daysInactive > 7 || progress < 40) riskLevel = "medium";

        return {
          id: s.student?.id || s.id,
          name: `${s.student?.first_name || s.first_name} ${s.student?.last_name || s.last_name}`,
          email: s.student?.email || s.email,
          course_title: s.course?.title || "Unknown Course",
          progress_percentage: progress,
          days_inactive: daysInactive,
          risk_level: riskLevel,
        };
      });

    // Courses by type, level, status
    const coursesByType = [
      { type: "MOOC", count: courses.filter((c: any) => c.course_type === "MOOC").length, students: 0 },
      { type: "SPOC", count: courses.filter((c: any) => c.course_type === "SPOC").length, students: 0 },
    ].filter(item => item.count > 0);

    const coursesByLevel = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map(level => ({
      level,
      count: courses.filter((c: any) => c.level === level).length,
      students: 0,
    })).filter(item => item.count > 0);

    const coursesByStatus = [
      { status: "PUBLISHED", count: publishedCourses },
      { status: "DRAFT", count: draftCourses },
      { status: "ARCHIVED", count: archivedCourses },
    ].filter(item => item.count > 0);

    // Calculate growth rates
    const growthRates = calculateGrowthRates(enrollmentsOverTime);

    return {
      overview: {
        total_courses: totalCourses,
        published_courses: publishedCourses,
        draft_courses: draftCourses,
        archived_courses: archivedCourses,
        total_students: totalStudents,
        active_students: activeStudents,
        completed_students: completedStudents,
        average_completion_rate: averageCompletionRate,
        total_enrollments: totalEnrollments,
      },
      performance: {
        average_rating: averageRating,
        total_reviews: totalReviews,
        rating_distribution: ratingDistribution,
        top_rated_courses: topRatedCourses,
      },
      engagement: {
        daily_active_users: students.filter((s: any) => {
          const lastActive = s.enrollment?.last_accessed;
          return lastActive && new Date(lastActive) >= subDays(new Date(), 1);
        }).length,
        weekly_active_users: students.filter((s: any) => {
          const lastActive = s.enrollment?.last_accessed;
          return lastActive && new Date(lastActive) >= subDays(new Date(), 7);
        }).length,
        monthly_active_users: students.filter((s: any) => {
          const lastActive = s.enrollment?.last_accessed;
          return lastActive && new Date(lastActive) >= subDays(new Date(), 30);
        }).length,
        average_time_spent_minutes: students.reduce((sum: number, s: any) => 
          sum + (s.details?.time_metrics?.total_time_spent_minutes || 0), 0
        ) / (students.length || 1),
        total_time_spent_hours: students.reduce((sum: number, s: any) => 
          sum + (s.details?.time_metrics?.total_time_spent_minutes || 0), 0
        ) / 60,
        lessons_completed: 0,
        assessments_completed: assessments.completed || 0,
        engagement_trend: engagementTrend,
      },
      progress: {
        students_by_status: studentsByStatus,
        completion_distribution: completionDistribution,
        average_progress_by_course: averageProgressByCourse,
      },
      content: {
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_videos: totalVideos,
        total_assessments: totalAssessments,
        total_quizzes: totalQuizzes,
        total_resources: 0,
        content_by_type: contentByType,
        popular_content: popularContent,
      },
      trends: {
        enrollments_over_time: enrollmentsOverTime,
        completions_over_time: completionsOverTime,
        growth_rates: growthRates,
      },
      students: {
        top_students: topStudents,
        at_risk_students: atRiskStudents,
      },
      courses: {
        by_type: coursesByType,
        by_level: coursesByLevel,
        by_status: coursesByStatus,
      },
    };
  };

  const generateTimePeriods = (timeRange: string): string[] => {
    const periods: string[] = [];
    const today = new Date();
    let days: number;

    switch (timeRange) {
      case "7d":
        days = 7;
        break;
      case "30d":
        days = 30;
        break;
      case "90d":
        days = 90;
        break;
      case "1y":
        days = 365;
        break;
      default:
        days = 30;
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      periods.push(format(date, "yyyy-MM-dd"));
    }

    return periods;
  };

  const calculateGrowthRates = (enrollments: any[]) => {
    if (enrollments.length < 2) {
      return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
    }

    const recent = enrollments.slice(-7).reduce((sum, e) => sum + e.count, 0);
    const previous = enrollments.slice(-14, -7).reduce((sum, e) => sum + e.count, 0);
    
    const recent30 = enrollments.slice(-30).reduce((sum, e) => sum + e.count, 0);
    const previous30 = enrollments.slice(-60, -30).reduce((sum, e) => sum + e.count, 0);

    return {
      daily: enrollments.length > 1 ? (enrollments[enrollments.length - 1].count - enrollments[enrollments.length - 2].count) / (enrollments[enrollments.length - 2].count || 1) : 0,
      weekly: previous > 0 ? (recent - previous) / previous : recent > 0 ? 1 : 0,
      monthly: previous30 > 0 ? (recent30 - previous30) / previous30 : recent30 > 0 ? 1 : 0,
      yearly: 0, // Would need year-over-year comparison
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success("Analytics refreshed");
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/instructor/analytics/export?` +
        `time_range=${selectedTimeRange}` +
        (selectedCourse !== "all" ? `&course_id=${selectedCourse}` : ""),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `instructor_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast.success("Analytics exported successfully");
      } else {
        toast.error("Failed to export analytics");
      }
    } catch (error) {
      toast.error("Failed to export analytics");
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatPercent = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return <Badge className="bg-destructive/15 text-destructive">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-warning/15 text-warning">Medium Risk</Badge>;
      case "low":
        return <Badge className="bg-warning/15 text-warning">Low Risk</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              No Analytics Data
            </h2>
            <p className="text-muted-foreground mb-6">
              There is no analytics data available for your courses yet.
            </p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Instructor Analytics
          </h1>
          <p className="text-muted-foreground">
            Track your teaching performance and student engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <BookOpen className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title.length > 25
                    ? course.title.slice(0, 25) + "..."
                    : course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold">{formatNumber(analytics.overview.total_students)}</p>
                <p className="text-xs text-success mt-1">
                  ↑ {formatPercent(analytics.trends.growth_rates.monthly)} monthly
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-3xl font-bold">{formatNumber(analytics.overview.active_students)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((analytics.overview.active_students / analytics.overview.total_students) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Completion</p>
                <p className="text-3xl font-bold">{analytics.overview.average_completion_rate.toFixed(1)}%</p>
                <p className="text-xs text-primary mt-1">
                  {analytics.overview.completed_students} completed
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-3xl font-bold">{analytics.performance.average_rating.toFixed(1)}</p>
                <p className="text-xs text-warning mt-1">
                  {analytics.performance.total_reviews} reviews
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Course Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.total_courses}</div>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-success/15 text-success">
                    {analytics.overview.published_courses} Published
                  </Badge>
                  <Badge className="bg-warning/15 text-warning">
                    {analytics.overview.draft_courses} Draft
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Course Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.courses.by_type.map((item) => (
                    <div key={item.type} className="flex justify-between text-sm">
                      <span>{item.type}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Course Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.courses.by_level.map((item) => (
                    <div key={item.level} className="flex justify-between text-sm">
                      <span className="capitalize">{item.level.toLowerCase()}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Progress Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Distribution</CardTitle>
              <CardDescription>
                Breakdown of students by their current progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.progress.completion_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8">
                      {analytics.progress.completion_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Rated Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Top Rated Courses</CardTitle>
              <CardDescription>
                Your highest-rated courses based on student reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.performance.top_rated_courses.map((course, index) => (
                  <div key={course.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(course.average_rating)
                                    ? "fill-yellow-400 text-warning"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span>({course.total_reviews} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-primary/15 text-primary">
                      {course.average_rating.toFixed(1)} ★
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          {/* Student Status Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Students by Status</CardTitle>
                <CardDescription>
                  Distribution of students across enrollment statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.progress.students_by_status}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                      >
                        {analytics.progress.students_by_status.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Progress by Course</CardTitle>
                <CardDescription>
                  Student progress across your courses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={analytics.progress.average_progress_by_course.slice(0, 5)}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="course_title" width={100} />
                      <Tooltip />
                      <Bar dataKey="average_progress" fill="#8884d8">
                        {analytics.progress.average_progress_by_course.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Students */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Students</CardTitle>
              <CardDescription>
                Students with the highest progress and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Student</th>
                      <th className="text-left p-3 text-sm font-medium">Courses</th>
                      <th className="text-left p-3 text-sm font-medium">Completed</th>
                      <th className="text-left p-3 text-sm font-medium">Avg Score</th>
                      <th className="text-left p-3 text-sm font-medium">Time Spent</th>
                      <th className="text-left p-3 text-sm font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.students.top_students.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </td>
                        <td className="p-3">{student.courses_enrolled}</td>
                        <td className="p-3">{student.courses_completed}</td>
                        <td className="p-3">
                          <Badge className="bg-success/15 text-success">
                            {student.average_score.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-3">{formatTime(student.total_time_spent_minutes)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDistance(new Date(student.last_active), new Date(), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* At-Risk Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                At-Risk Students
              </CardTitle>
              <CardDescription>
                Students who need attention due to low engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.students.at_risk_students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        {getRiskBadge(student.risk_level)}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Course:</span>{" "}
                          <span className="font-medium">{student.course_title}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Progress:</span>{" "}
                          <span className="font-medium">{student.progress_percentage}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Inactive:</span>{" "}
                          <span className="font-medium">{student.days_inactive} days</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/instructor/messages?student=${student.id}`}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.engagement.daily_active_users}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((analytics.engagement.daily_active_users / analytics.overview.active_students) * 100).toFixed(1)}% of active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.engagement.weekly_active_users}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.engagement.monthly_active_users}</div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trend</CardTitle>
              <CardDescription>
                Daily active users over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.engagement.engagement_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="active_users"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      name="Active Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Time Spent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Average Time Spent</CardTitle>
                <CardDescription>
                  Per student across all courses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatTime(analytics.engagement.average_time_spent_minutes)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total: {formatTime(analytics.engagement.total_time_spent_hours * 60)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completed Items</CardTitle>
                <CardDescription>
                  Lessons and assessments completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{analytics.engagement.lessons_completed}</div>
                    <p className="text-sm text-muted-foreground">Lessons</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{analytics.engagement.assessments_completed}</div>
                    <p className="text-sm text-muted-foreground">Assessments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          {/* Content Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{analytics.content.total_modules}</div>
                <p className="text-sm text-muted-foreground">Modules</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{analytics.content.total_lessons}</div>
                <p className="text-sm text-muted-foreground">Lessons</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{analytics.content.total_videos}</div>
                <p className="text-sm text-muted-foreground">Videos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{analytics.content.total_assessments}</div>
                <p className="text-sm text-muted-foreground">Assessments</p>
              </CardContent>
            </Card>
          </div>

          {/* Content by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Content Distribution</CardTitle>
              <CardDescription>
                Breakdown of content by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.content.content_by_type}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                    >
                      {analytics.content.content_by_type.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Popular Content */}
          <Card>
            <CardHeader>
              <CardTitle>Most Viewed Content</CardTitle>
              <CardDescription>
                Lessons and materials with highest engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.content.popular_content.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.type === "VIDEO" ? (
                        <Video className="w-4 h-4 text-primary" />
                      ) : item.type === "QUIZ" ? (
                        <FileText className="w-4 h-4 text-success" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <Eye className="w-4 h-4 inline mr-1" />
                        {item.views}
                      </span>
                      <span className="text-sm">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        {item.completions}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Rating Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
              <CardDescription>
                How students rate your courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.performance.rating_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stars" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8">
                      {analytics.performance.rating_distribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.stars >= 4 ? "#4CAF50" : entry.stars >= 3 ? "#FFC107" : "#F44336"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Completion vs Enrollment */}
          <Card>
            <CardHeader>
              <CardTitle>Course Performance</CardTitle>
              <CardDescription>
                Enrollment vs completion rates by course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.progress.average_progress_by_course.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="course_title" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="student_count" fill="#8884d8" name="Students" />
                    <Line yAxisId="right" type="monotone" dataKey="average_progress" stroke="#ff7300" name="Avg Progress %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Enrollment Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Trend</CardTitle>
              <CardDescription>
                New enrollments over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trends.enrollments_over_time}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0088FE"
                      fill="#0088FE"
                      fillOpacity={0.3}
                      name="Enrollments"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Completion Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Completion Trend</CardTitle>
              <CardDescription>
                Course completions over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trends.completions_over_time}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#00C49F"
                      fill="#00C49F"
                      fillOpacity={0.3}
                      name="Completions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Growth Rates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.daily >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {analytics.trends.growth_rates.daily >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.daily * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.weekly >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {analytics.trends.growth_rates.weekly >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.weekly * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.monthly >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {analytics.trends.growth_rates.monthly >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.monthly * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Yearly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.yearly >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {analytics.trends.growth_rates.yearly >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.yearly * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}