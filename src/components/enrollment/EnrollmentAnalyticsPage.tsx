// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useRealtimeEvents } from "@/hooks/use-realtime";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Badge
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths, subYears } from "date-fns";
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
} from "recharts";

interface EnrollmentStats {
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  dropped_enrollments: number;
  pending_enrollments: number;
  conversion_rate: number;
  average_completion_time: number;
  total_students: number;
  students_with_multiple_enrollments: number;
  enrollment_growth: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  by_course: {
    course_id: string;
    course_title: string;
    course_type: string;
    enrollment_count: number;
    completion_count: number;
    completion_rate: number;
    average_progress: number;
  }[];
  by_month: {
    month: string;
    enrollments: number;
    completions: number;
  }[];
  by_status: {
    status: string;
    count: number;
  }[];
  by_course_type: {
    type: string;
    count: number;
  }[];
  top_courses: {
    course_id: string;
    course_title: string;
    enrollment_count: number;
  }[];
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82CA9D", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"
];

export default function EnrollmentAnalyticsPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  const institutionId = user?.primary_institution_id;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EnrollmentStats | null>(null);
  const [dateRange, setDateRange] = useState("30d");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [courses, setCourses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (institutionId) {
      fetchAnalytics();
      fetchCourses();
    }
  }, [institutionId, dateRange]);

  // Real-time enrollment analytics updates
  useRealtimeEvents({
    "enrollment-approved": () => fetchAnalytics(),
    "enrollment-rejected": () => fetchAnalytics(),
    "enrollment-count-updated": () => fetchAnalytics(),
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Determine date range
      let startDate = new Date();
      switch (dateRange) {
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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/analytics/institution/${institutionId}?` +
        `start_date=${startDate.toISOString()}&` +
        `course_id=${selectedCourse !== 'all' ? selectedCourse : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      } else {
        toast.error("Failed to load analytics");
      }
    } catch (error) {
      toast.error("Failed to load enrollment analytics");
    } finally {
      setLoading(false);
    }
  };

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
      }
    } catch (error) {
    }
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
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/analytics/export?institution_id=${institutionId}&format=csv`,
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
        a.download = `enrollment_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              No Analytics Data
            </h2>
            <p className="text-muted-foreground mb-6">
              There is no enrollment data available for your institution yet.
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
            Enrollment Analytics
          </h1>
          <p className="text-muted-foreground">
            Track and analyze enrollment trends across your institution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
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
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
                <p className="text-3xl font-bold">{formatNumber(stats.total_enrollments)}</p>
                <p className="text-xs text-success mt-1">
                  ↑ {formatPercent(stats.enrollment_growth?.monthly || 0)} monthly
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
                <p className="text-sm text-muted-foreground">Active Enrollments</p>
                <p className="text-3xl font-bold">{formatNumber(stats.active_enrollments)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPercent(stats.active_enrollments / stats.total_enrollments)} of total
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
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{formatNumber(stats.completed_enrollments)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPercent(stats.completed_enrollments / stats.total_enrollments)} completion
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-3xl font-bold">{formatNumber(stats.pending_enrollments)}</p>
                <p className="text-xs text-warning mt-1">
                  Requires action
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Enrollment Trend</CardTitle>
            <CardDescription>
              Daily enrollment and completion activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.by_month || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="enrollments" 
                    stroke="#0088FE" 
                    fill="#0088FE" 
                    fillOpacity={0.3}
                    name="Enrollments"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completions" 
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

        {/* Enrollment by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Status Distribution</CardTitle>
            <CardDescription>
              Current status of all enrollments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.by_status || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                  >
                    {(stats.by_status || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Course Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Course Type Distribution</CardTitle>
            <CardDescription>
              Enrollment by course type (MOOC vs SPOC)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_course_type || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {(stats.by_course_type || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(stats.conversion_rate || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requests → Active Enrollments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.average_completion_time || 0)} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From enrollment to completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Multi-Course Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.students_with_multiple_enrollments || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent((stats.students_with_multiple_enrollments || 0) / (stats.total_students || 1))} of students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Courses by Enrollment</CardTitle>
          <CardDescription>
            Courses with the highest enrollment numbers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Enrollments</TableHead>
                  <TableHead className="text-right">Completions</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                  <TableHead className="text-right">Avg Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.by_course?.slice(0, 10).map((course) => (
                  <TableRow key={course.course_id}>
                    <TableCell className="font-medium">
                      {course.course_title}
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.course_type === "MOOC" ? "default" : "secondary"}>
                        {course.course_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(course.enrollment_count)}</TableCell>
                    <TableCell className="text-right">{formatNumber(course.completion_count)}</TableCell>
                    <TableCell className="text-right">
                      {formatPercent(course.completion_rate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {course.average_progress.toFixed(1)}%
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

function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full">{children}</table>;
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b">{children}</tr>;
}

function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-left font-medium text-muted-foreground ${className}`}>{children}</th>;
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}