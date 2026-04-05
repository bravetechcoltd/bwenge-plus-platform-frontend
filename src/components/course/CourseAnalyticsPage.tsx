"use client";

import { useState, useEffect } from "react";
import { useRealtimeEvents } from "@/hooks/use-realtime";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
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
} from "recharts";

interface CourseAnalytics {
  course_id: string;
  course_title: string;
  course_type: "MOOC" | "SPOC";
  status: string;
  created_at: string;
  published_at: string | null;
  
  enrollment_stats: {
    total_enrollments: number;
    active_enrollments: number;
    completed_enrollments: number;
    dropped_enrollments: number;
    pending_enrollments: number;
    completion_rate: number;
    retention_rate: number;
  };
  
  progress_stats: {
    average_progress: number;
    median_progress: number;
    students_completed: number;
    students_in_progress: number;
    students_not_started: number;
    average_completion_days: number;
    lesson_completion_rate: number;
  };
  
  engagement_stats: {
    average_time_spent_minutes: number;
    total_time_spent_hours: number;
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
    average_sessions_per_user: number;
  };
  
  assessment_stats: {
    average_score: number;
    pass_rate: number;
    total_assessments_taken: number;
    assessments_passed: number;
    assessments_failed: number;
    average_attempts: number;
  };
  
  rating_stats: {
    average_rating: number;
    total_reviews: number;
    rating_distribution: {
      stars: number;
      count: number;
    }[];
  };
  
  content_stats: {
    total_modules: number;
    total_lessons: number;
    total_videos: number;
    total_quizzes: number;
    total_resources: number;
    total_duration_minutes: number;
  };
  
  daily_enrollments: {
    date: string;
    count: number;
  }[];
  
  top_students: {
    user_id: string;
    user_name: string;
    user_email: string;
    progress_percentage: number;
    time_spent_minutes: number;
    score: number;
  }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
const safeNum = (val: any): number => {
  const n = Number(val ?? 0);
  return isNaN(n) ? 0 : n;
};
const safeFixed = (val: any, d = 1): string => safeNum(val).toFixed(d);

interface CourseAnalyticsPageProps {
  courseId?: string;
}

export default function CourseAnalyticsPage({ courseId }: CourseAnalyticsPageProps = {}) {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  const institutionId = user?.primary_institution_id;

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(courseId || "");
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (courseId) {
      setSelectedCourse(courseId);
    } else if (institutionId) {
      fetchCourses();
    }
  }, [institutionId, courseId]);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseAnalytics();
    }
  }, [selectedCourse]);

  // Real-time: refresh analytics on enrollment or review changes
  useRealtimeEvents({
    "new-review": () => fetchCourseAnalytics(),
    "review-updated": () => fetchCourseAnalytics(),
    "enrollment-count-updated": () => fetchCourseAnalytics(),
    "progress-updated": () => fetchCourseAnalytics(),
  });

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/institution/${institutionId}/owned`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data?.courses || []);
        if (data.data?.courses?.length > 0) {
          setSelectedCourse(data.data.courses[0].id);
        }
      }
    } catch (error) {
      toast.error("Failed to load courses");
    }
  };

  const fetchCourseAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${selectedCourse}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      } else {
        toast.error("Failed to load course analytics");
      }
    } catch (error) {
      toast.error("Failed to load course analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCourseAnalytics();
    setRefreshing(false);
    toast.success("Analytics refreshed");
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${selectedCourse}/analytics/export`,
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
        a.download = `course_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast.success("Analytics exported successfully");
      } else {
        toast.error("Failed to export analytics");
      }
    } catch (error) {
      toast.error("Failed to export analytics");
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatPercent = (num: number) => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics && courses.length > 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              Select a Course
            </h2>
            <p className="text-muted-foreground mb-6">
              Choose a course from the dropdown to view its analytics
            </p>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-64 mx-auto">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
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
            <p className="text-muted-foreground">
              There is no analytics data available for this course yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Course Analytics
          </h1>
          <p className="text-muted-foreground">
            Detailed performance metrics for your courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64">
              <BookOpen className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title.length > 30
                    ? course.title.slice(0, 30) + "..."
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

      {/* Course Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{analytics.course_title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={analytics.course_type === "MOOC" ? "default" : "secondary"}>
                  {analytics.course_type}
                </Badge>
                <Badge variant="outline">
                  {analytics.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Created: {format(new Date(analytics.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <div className="text-center">
                <p className="text-2xl font-bold">{formatNumber(analytics.enrollment_stats.total_enrollments)}</p>
                <p className="text-xs text-muted-foreground">Total Enrollments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{formatPercent(analytics.enrollment_stats.completion_rate)}</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{safeFixed(analytics.rating_stats.average_rating)}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Active Enrollments</p>
                <p className="text-3xl font-bold">{formatNumber(analytics.enrollment_stats.active_enrollments)}</p>
                <p className="text-xs text-success mt-1">
                  {formatPercent(analytics.enrollment_stats.active_enrollments / analytics.enrollment_stats.total_enrollments)} active
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
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-3xl font-bold">{safeFixed(analytics.progress_stats.average_progress)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Median: {safeFixed(analytics.progress_stats.median_progress)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Avg Time Spent</p>
                <p className="text-3xl font-bold">{formatHours(analytics.engagement_stats.average_time_spent_minutes)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {formatHours(analytics.engagement_stats.total_time_spent_hours * 60)}
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
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-3xl font-bold">{formatPercent(analytics.assessment_stats.pass_rate)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.assessment_stats.assessments_passed} passed
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Enrollments Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Enrollments</CardTitle>
            <CardDescription>
              Enrollment activity over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.daily_enrollments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#0088FE" 
                    name="Enrollments"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>
              Breakdown of course ratings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.rating_stats.rating_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stars" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {analytics.rating_stats.rating_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Enrollment Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Enrollment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Active</span>
                <span className="font-semibold">{formatNumber(analytics.enrollment_stats.active_enrollments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completed</span>
                <span className="font-semibold">{formatNumber(analytics.enrollment_stats.completed_enrollments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Dropped</span>
                <span className="font-semibold">{formatNumber(analytics.enrollment_stats.dropped_enrollments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending</span>
                <span className="font-semibold">{formatNumber(analytics.enrollment_stats.pending_enrollments)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Retention Rate</span>
                  <span className="font-semibold">{formatPercent(analytics.enrollment_stats.retention_rate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Student Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Completed</span>
                <span className="font-semibold">{formatNumber(analytics.progress_stats.students_completed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">In Progress</span>
                <span className="font-semibold">{formatNumber(analytics.progress_stats.students_in_progress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Not Started</span>
                <span className="font-semibold">{formatNumber(analytics.progress_stats.students_not_started)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Avg Completion Days</span>
                  <span className="font-semibold">{safeFixed(analytics.progress_stats.average_completion_days)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Lesson Completion</span>
                  <span className="font-semibold">{formatPercent(analytics.progress_stats.lesson_completion_rate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Assessment Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Average Score</span>
                <span className="font-semibold">{safeFixed(analytics.assessment_stats.average_score)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Passed</span>
                <span className="font-semibold">{formatNumber(analytics.assessment_stats.assessments_passed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Failed</span>
                <span className="font-semibold">{formatNumber(analytics.assessment_stats.assessments_failed)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Avg Attempts</span>
                  <span className="font-semibold">{safeFixed(analytics.assessment_stats.average_attempts)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Course Content</CardTitle>
          <CardDescription>
            Overview of course structure and materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.content_stats.total_modules}</div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.content_stats.total_lessons}</div>
              <div className="text-sm text-muted-foreground">Lessons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.content_stats.total_videos}</div>
              <div className="text-sm text-muted-foreground">Videos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.content_stats.total_quizzes}</div>
              <div className="text-sm text-muted-foreground">Quizzes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.content_stats.total_resources}</div>
              <div className="text-sm text-muted-foreground">Resources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatHours(analytics.content_stats.total_duration_minutes)}</div>
              <div className="text-sm text-muted-foreground">Total Duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Students</CardTitle>
          <CardDescription>
            Students with the highest progress and scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.top_students.map((student) => (
                  <TableRow key={student.user_id}>
                    <TableCell className="max-w-[200px]">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{student.user_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${student.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm">{student.progress_percentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatHours(student.time_spent_minutes)}</TableCell>
                    <TableCell>
                      <Badge className="bg-success/15 text-success">
                        {safeFixed(student.score)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}