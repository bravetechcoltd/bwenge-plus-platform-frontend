"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  Clock,
  TrendingUp,
  CheckCircle,
  Target,
  Award,
  PlayCircle,
  BarChart3,
  Calendar,
  Filter,
  Search,
  Download,
  RefreshCw,
  ChevronRight,
  Star,
  Users,
  Globe,
  Building2,
  GraduationCap,
  Trophy,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProgressCourse {
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
  progress: {
    percentage: number;
    completed_lessons: number;
    total_lessons: number;
    time_spent_minutes: number;
    last_accessed: string | null;
    started_at: string;
    estimated_completion: string | null;
  };
  modules: {
    id: string;
    title: string;
    progress: number;
    lessons: {
      id: string;
      title: string;
      completed: boolean;
      duration_minutes: number;
    }[];
  }[];
  statistics: {
    quizzes_taken: number;
    quizzes_passed: number;
    average_score: number;
    assignments_submitted: number;
    discussions_participated: number;
  };
}

interface ProgressStats {
  total_courses: number;
  active_courses: number;
  completed_courses: number;
  overall_progress: number;
  total_time_spent_hours: number;
  lessons_completed: number;
  quizzes_passed: number;
  streak_days: number;
  weekly_activity: {
    day: string;
    minutes: number;
  }[];
  level_distribution: {
    level: string;
    count: number;
  }[];
  category_breakdown: {
    category: string;
    count: number;
  }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function LearnerProgressPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [progressCourses, setProgressCourses] = useState<ProgressCourse[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("progress");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProgressData();
    }
  }, [user]);

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch user's in-progress enrollments
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
            status: "ACTIVE",
            include_course_details: true,
            include_progress_details: true,
            limit: 100,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Transform and enhance progress data
        const transformed = await Promise.all(
          data.data.map(async (enrollment: any) => {
            // ✅ FIX: Use the correct endpoint for progress
            const progressResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/progress/course/${enrollment.course.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            
            let progressData: any = { progress: {} };
            if (progressResponse.ok) {
              progressData = await progressResponse.json();
            }

            // ✅ FIX: Extract modules from progress response
            const modulesFromProgress = progressData.progress?.modules || [];

            // Calculate module progress using data from backend
            const modulesWithProgress = enrollment.course.modules?.map((module: any) => {
              // Find matching module from progress data
              const moduleProgress = modulesFromProgress.find(
                (m: any) => m.id === module.id
              ) || { lessons: [] };
              
              // Map lessons with completion status
              const lessonsWithProgress = module.lessons?.map((lesson: any) => {
                const lessonProgress = moduleProgress.lessons?.find(
                  (l: any) => l.id === lesson.id
                );
                
                return {
                  ...lesson,
                  completed: lessonProgress?.completed || false,
                  progress_percentage: lessonProgress?.progress_percentage || 0,
                };
              }) || [];

              const completedCount = lessonsWithProgress.filter((l: any) => l.completed).length;
              const moduleProgressPercentage = lessonsWithProgress.length > 0
                ? (completedCount / lessonsWithProgress.length) * 100
                : 0;

              return {
                id: module.id,
                title: module.title,
                progress: moduleProgressPercentage,
                lessons: lessonsWithProgress,
              };
            }) || [];

            // Calculate estimated completion date
            const estimatedCompletion = enrollment.progress_percentage > 0
              ? calculateEstimatedCompletion(
                  enrollment.enrolled_at,
                  enrollment.progress_percentage,
                  enrollment.total_time_spent_minutes
                )
              : null;

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
              progress: {
                percentage: enrollment.progress_percentage,
                completed_lessons: enrollment.completed_lessons,
                total_lessons: enrollment.course.total_lessons || 0,
                time_spent_minutes: enrollment.total_time_spent_minutes || 0,
                last_accessed: enrollment.last_accessed,
                started_at: enrollment.enrolled_at,
                estimated_completion: estimatedCompletion,
              },
              modules: modulesWithProgress,
              statistics: {
                quizzes_taken: 0,
                quizzes_passed: 0,
                average_score: 0,
                assignments_submitted: 0,
                discussions_participated: 0,
              },
            };
          })
        );

        setProgressCourses(transformed);
        
        // Calculate overall statistics
        const stats = calculateProgressStats(transformed, data.data);
        setStats(stats);
      }
    } catch (error) {
      console.error("Error fetching progress data:", error);
      toast.error("Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedCompletion = (
    startDate: string,
    progress: number,
    timeSpent: number
  ): string | null => {
    if (progress === 0) return null;
    
    const start = new Date(startDate).getTime();
    const now = new Date().getTime();
    const daysElapsed = (now - start) / (1000 * 60 * 60 * 24);
    
    if (daysElapsed === 0) return null;
    
    const progressPerDay = progress / daysElapsed;
    const remainingProgress = 100 - progress;
    const estimatedDaysRemaining = remainingProgress / progressPerDay;
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(estimatedDaysRemaining));
    
    return estimatedDate.toISOString();
  };

  const calculateProgressStats = (
    courses: ProgressCourse[],
    enrollments: any[]
  ): ProgressStats => {
    const totalCourses = courses.length;
    const totalTimeSpent = courses.reduce(
      (sum, c) => sum + c.progress.time_spent_minutes,
      0
    );
    
    const lessonsCompleted = courses.reduce(
      (sum, c) => sum + c.progress.completed_lessons,
      0
    );

    // Weekly activity (last 7 days)
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = format(date, "EEE");
      
      // This would ideally come from a real activity log
      weeklyActivity.push({
        day: dayName,
        minutes: Math.floor(Math.random() * 60) + 30, // Mock data
      });
    }

    // Level distribution
    const levelCounts: Record<string, number> = {};
    courses.forEach(c => {
      levelCounts[c.level] = (levelCounts[c.level] || 0) + 1;
    });
    const levelDistribution = Object.entries(levelCounts).map(([level, count]) => ({
      level,
      count,
    }));

    // Category breakdown (mock for now)
    const categoryBreakdown = [
      { category: "Programming", count: 4 },
      { category: "Data Science", count: 3 },
      { category: "Business", count: 2 },
      { category: "Design", count: 1 },
    ];

    return {
      total_courses: totalCourses,
      active_courses: totalCourses,
      completed_courses: enrollments.filter(e => e.status === "COMPLETED").length,
      overall_progress: totalCourses > 0
        ? courses.reduce((sum, c) => sum + c.progress.percentage, 0) / totalCourses
        : 0,
      total_time_spent_hours: Math.round(totalTimeSpent / 60),
      lessons_completed: lessonsCompleted,
      quizzes_passed: 0,
      streak_days: 7,
      weekly_activity: weeklyActivity,
      level_distribution: levelDistribution,
      category_breakdown: categoryBreakdown,
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProgressData();
    setRefreshing(false);
    toast.success("Progress data refreshed");
  };

  const handleExportProgress = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/progress/export?user_id=${user?.id}&format=csv`,
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
        a.download = `my_progress_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast.success("Progress exported successfully");
      } else {
        toast.error("Failed to export progress");
      }
    } catch (error) {
      console.error("Error exporting progress:", error);
      toast.error("Failed to export progress");
    }
  };

  // ✅ FIX: Safe date formatting function
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Never";
    
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return "Invalid date";
      return format(date, "MMM d");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const filteredCourses = progressCourses
    .filter(course => 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "progress":
          return b.progress.percentage - a.progress.percentage;
        case "recent":
          // ✅ FIX: Handle null last_accessed
          const aTime = a.progress.last_accessed ? new Date(a.progress.last_accessed).getTime() : 0;
          const bTime = b.progress.last_accessed ? new Date(b.progress.last_accessed).getTime() : 0;
          return bTime - aTime;
        case "name":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Learning Progress
          </h1>
          <p className="text-gray-600">
            Track your progress across all courses
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
          <Button variant="outline" size="sm" onClick={handleExportProgress}>
            <Download className="w-4 h-4 mr-2" />
            Export
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
                  <p className="text-sm text-gray-500">Overall Progress</p>
                  <p className="text-3xl font-bold">{Math.round(stats.overall_progress)}%</p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.completed_courses} of {stats.total_courses} completed
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Time Spent</p>
                  <p className="text-3xl font-bold">{stats.total_time_spent_hours}h</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.lessons_completed} lessons completed
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Courses</p>
                  <p className="text-3xl font-bold">{stats.active_courses}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {stats.streak_days} day streak
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Achievements</p>
                  <p className="text-3xl font-bold">{stats.quizzes_passed}</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    quizzes passed
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>
              Time spent learning over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.weekly_activity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#0088FE">
                    {(stats?.weekly_activity || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Courses by Level</CardTitle>
            <CardDescription>
              Distribution of your courses by difficulty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.level_distribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="level"
                  >
                    {(stats?.level_distribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progress">Progress (High to Low)</SelectItem>
            <SelectItem value="recent">Recently Active</SelectItem>
            <SelectItem value="name">Course Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress Cards */}
      <div className="space-y-4">
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Courses in Progress
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "No courses match your search criteria"
                  : "You haven't started any courses yet"}
              </p>
              <Button asChild>
                <Link href="/dashboard/learner/browse/all">
                  Browse Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Course Thumbnail */}
                <div className="md:w-48 h-32 md:h-auto relative">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <Badge
                    className={`absolute top-2 left-2 ${getLevelColor(course.level)} text-white`}
                  >
                    <span className="flex items-center gap-1">
                      {getLevelIcon(course.level)}
                      {course.level}
                    </span>
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2"
                  >
                    {course.course_type}
                  </Badge>
                </div>

                {/* Course Details */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {course.instructor.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(course.progress.time_spent_minutes)} spent
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {/* ✅ FIX: Use safe date formatting function */}
                          Last: {formatDate(course.progress.last_accessed)}
                        </span>
                      </div>
                    </div>

                    {/* Continue Button */}
                    <Button asChild>
                      <Link href={`/courses/${course.id}/learn`}>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Continue
                      </Link>
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Overall Progress</span>
                      <span className="text-primary font-bold">
                        {course.progress.percentage}%
                      </span>
                    </div>
                    <Progress value={course.progress.percentage} className="h-2" />
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {course.progress.completed_lessons} of {course.progress.total_lessons} lessons
                      </span>
                      {course.progress.estimated_completion && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Est. completion: {formatDate(course.progress.estimated_completion)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Module Progress */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.modules.slice(0, 4).map((module) => (
                      <div key={module.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate">
                            {module.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(module.progress)}%
                          </span>
                        </div>
                        <Progress value={module.progress} className="h-1" />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-400">
                            {module.lessons.filter(l => l.completed).length}/{module.lessons.length} lessons
                          </span>
                          {module.progress < 100 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              asChild
                            >
                              <Link href={`/courses/${course.id}/learn?module=${module.id}`}>
                                Continue
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {course.modules.length > 4 && (
                      <Button
                        variant="link"
                        className="text-xs"
                        asChild
                      >
                        <Link href={`/courses/${course.id}`}>
                          View all {course.modules.length} modules
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}