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
  Download,
  Filter,
  Search,
  RefreshCw,
  Award,
  TrendingUp,
  BookOpen,
  Calendar,
  ChevronRight,
  Star,
  Target,
  Trophy,
  Crown,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
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

interface GradeSummary {
  course_id: string;
  course_title: string;
  course_thumbnail: string | null;
  assignments: {
    id: string;
    title: string;
    score: number;
    total_points: number;
    percentage: number;
    submitted_at: string;
    graded_at: string;
    weight: number;
  }[];
  total_score: number;
  total_possible: number;
  overall_percentage: number;
  letter_grade?: string;
  gpa_points?: number;
}

interface GradeStats {
  overall_gpa: number;
  total_credits: number;
  total_assignments: number;
  graded_assignments: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  by_course: {
    course_id: string;
    course_title: string;
    average_score: number;
    letter_grade: string;
  }[];
  grade_distribution: {
    grade: string;
    count: number;
    color: string;
  }[];
  progress_over_time: {
    month: string;
    average: number;
  }[];
}

const GRADE_COLORS = {
  'A': '#4CAF50',
  'B': '#8BC34A',
  'C': '#FFC107',
  'D': '#FF9800',
  'F': '#F44336',
};

export default function LearnerGradesPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("course");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchGrades();
    }
  }, [user]);

  // Real-time: refresh grades when new grades are released
  useRealtimeEvents({
    "grade-released": () => fetchGrades(),
    "progress-updated": () => fetchGrades(),
  });

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch all graded answers for the user
      const answersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/answers/user/${user?.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!answersResponse.ok) {
        throw new Error("Failed to fetch answers");
      }

      const answersData = await answersResponse.json();
      const answers = answersData.data || [];

      // Group by course and assessment
      const courseMap = new Map();

      for (const answer of answers) {
        if (!answer.is_graded && answer.assessment_type !== "QUIZ") continue;

        // Fetch course details if not already fetched
        if (!courseMap.has(answer.course_id)) {
          const courseResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/courses/${answer.course_id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          let courseData = null;
          if (courseResponse.ok) {
            const data = await courseResponse.json();
            courseData = data.data;
          }

          courseMap.set(answer.course_id, {
            course_id: answer.course_id,
            course_title: courseData?.title || "Unknown Course",
            course_thumbnail: courseData?.thumbnail_url || null,
            assignments: [],
            total_score: 0,
            total_possible: 0,
            overall_percentage: 0,
          });
        }

        // Fetch assessment details
        const assessmentResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/assessments/${answer.assessment_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let assessmentData = null;
        if (assessmentResponse.ok) {
          const data = await assessmentResponse.json();
          assessmentData = data.data;
        }

        const totalPoints = assessmentData?.questions?.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 0;
        const percentage = answer.percentage || (answer.points_earned / totalPoints) * 100 || 0;

        const course = courseMap.get(answer.course_id);
        
        // Check if this assignment already exists
        const existingIndex = course.assignments.findIndex(
          (a: any) => a.id === answer.assessment_id && a.attempt === answer.attempt_number
        );

        const assignmentData = {
          id: answer.assessment_id,
          title: assessmentData?.title || "Unknown Assignment",
          score: answer.points_earned || 0,
          total_points: totalPoints,
          percentage,
          submitted_at: answer.created_at,
          graded_at: answer.graded_at || answer.updated_at,
          weight: 1, // Default weight
          attempt: answer.attempt_number,
        };

        if (existingIndex >= 0) {
          // Update if this is a later attempt
          if (new Date(answer.graded_at) > new Date(course.assignments[existingIndex].graded_at)) {
            // Subtract old values
            course.total_score -= course.assignments[existingIndex].score;
            course.total_possible -= course.assignments[existingIndex].total_points;
            
            // Add new values
            course.total_score += assignmentData.score;
            course.total_possible += assignmentData.total_points;
            
            course.assignments[existingIndex] = assignmentData;
          }
        } else {
          course.assignments.push(assignmentData);
          course.total_score += assignmentData.score;
          course.total_possible += assignmentData.total_points;
        }
      }

      // Calculate overall percentages and letter grades
      const gradesArray: GradeSummary[] = [];
      courseMap.forEach((course: any) => {
        course.overall_percentage = course.total_possible > 0
          ? (course.total_score / course.total_possible) * 100
          : 0;
        
        // Sort assignments by date
        course.assignments.sort((a: any, b: any) => 
          new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime()
        );

        // Calculate letter grade
        const letterGrade = calculateLetterGrade(course.overall_percentage);
        course.letter_grade = letterGrade.grade;
        course.gpa_points = letterGrade.gpa;

        gradesArray.push(course);
      });

      setGrades(gradesArray);
      
      // Calculate statistics
      const stats = calculateGradeStats(gradesArray);
      setStats(stats);
    } catch (error) {
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

  const calculateLetterGrade = (percentage: number): { grade: string; gpa: number } => {
    if (percentage >= 90) return { grade: 'A', gpa: 4.0 };
    if (percentage >= 80) return { grade: 'B', gpa: 3.0 };
    if (percentage >= 70) return { grade: 'C', gpa: 2.0 };
    if (percentage >= 60) return { grade: 'D', gpa: 1.0 };
    return { grade: 'F', gpa: 0.0 };
  };

  const calculateGradeStats = (grades: GradeSummary[]): GradeStats => {
    const totalAssignments = grades.reduce((sum, g) => sum + g.assignments.length, 0);
    const gradedAssignments = grades.reduce(
      (sum, g) => sum + g.assignments.filter(a => a.graded_at).length,
      0
    );

    const allPercentages = grades.flatMap(g => g.assignments.map(a => a.percentage));
    const averageScore = allPercentages.length > 0
      ? allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length
      : 0;
    const highestScore = allPercentages.length > 0 ? Math.max(...allPercentages) : 0;
    const lowestScore = allPercentages.length > 0 ? Math.min(...allPercentages) : 0;

    // Calculate GPA
    const totalGpaPoints = grades.reduce((sum, g) => sum + (g.gpa_points || 0), 0);
    const overallGpa = grades.length > 0 ? totalGpaPoints / grades.length : 0;

    // By course averages
    const byCourse = grades.map(g => ({
      course_id: g.course_id,
      course_title: g.course_title,
      average_score: g.overall_percentage,
      letter_grade: g.letter_grade || 'N/A',
    }));

    // Grade distribution
    const distribution = {
      'A': 0,
      'B': 0,
      'C': 0,
      'D': 0,
      'F': 0,
    };
    
    grades.forEach(g => {
      if (g.letter_grade) {
        distribution[g.letter_grade as keyof typeof distribution]++;
      }
    });

    const gradeDistribution = Object.entries(distribution).map(([grade, count]) => ({
      grade,
      count,
      color: GRADE_COLORS[grade as keyof typeof GRADE_COLORS],
    })).filter(d => d.count > 0);

    // Progress over time (mock data)
    const progressOverTime = [
      { month: 'Jan', average: 75 },
      { month: 'Feb', average: 78 },
      { month: 'Mar', average: 82 },
      { month: 'Apr', average: 79 },
      { month: 'May', average: 85 },
      { month: 'Jun', average: 88 },
    ];

    return {
      overall_gpa: overallGpa,
      total_credits: grades.length * 3, // Assuming 3 credits per course
      total_assignments: totalAssignments,
      graded_assignments: gradedAssignments,
      average_score: averageScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      by_course: byCourse,
      grade_distribution: gradeDistribution,
      progress_over_time: progressOverTime,
    };
  };

  const handleExportGrades = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/grades/export?user_id=${user?.id}&format=csv`,
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
        a.download = `my_grades_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast.success("Grades exported successfully");
      } else {
        toast.error("Failed to export grades");
      }
    } catch (error) {
      toast.error("Failed to export grades");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGrades();
    setRefreshing(false);
    toast.success("Grades refreshed");
  };

  const filteredGrades = grades
    .filter(grade => {
      const matchesSearch = grade.course_title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "course":
          return a.course_title.localeCompare(b.course_title);
        case "score_desc":
          return b.overall_percentage - a.overall_percentage;
        case "score_asc":
          return a.overall_percentage - b.overall_percentage;
        case "grade":
          return (a.letter_grade || '').localeCompare(b.letter_grade || '');
        default:
          return 0;
      }
    });

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
            My Grades
          </h1>
          <p className="text-muted-foreground">
            Track your academic performance across all courses
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
          <Button variant="outline" size="sm" onClick={handleExportGrades}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* GPA and Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall GPA</p>
                  <p className="text-3xl font-bold">{stats.overall_gpa.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-3xl font-bold text-primary">{stats.average_score.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Assignments</p>
                  <p className="text-3xl font-bold">{stats.graded_assignments}/{stats.total_assignments}</p>
                </div>
                <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                  <p className="text-3xl font-bold">{stats.total_credits}</p>
                </div>
                <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        {stats && stats.grade_distribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Breakdown of your grades by letter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.grade_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="grade"
                    >
                      {stats.grade_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Over Time */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>Your average scores by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.progress_over_time}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#8884d8"
                      name="Average Score %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
            <SelectItem value="course">Course Name</SelectItem>
            <SelectItem value="score_desc">Highest Score</SelectItem>
            <SelectItem value="score_asc">Lowest Score</SelectItem>
            <SelectItem value="grade">Letter Grade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Course Grades */}
      {filteredGrades.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No Grades Available
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "No courses match your search criteria"
                : "You don't have any graded assignments yet."}
            </p>
            <Button asChild>
              <Link href="/dashboard/learner/assignments/submitted">
                View Submitted Assignments
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredGrades.map((courseGrade) => (
            <Card key={courseGrade.course_id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {courseGrade.course_thumbnail ? (
                      <img
                        src={courseGrade.course_thumbnail}
                        alt={courseGrade.course_title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl">{courseGrade.course_title}</CardTitle>
                      <CardDescription>
                        {courseGrade.assignments.length} assignments • Overall: {courseGrade.overall_percentage.toFixed(1)}%
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {courseGrade.letter_grade}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      GPA: {courseGrade.gpa_points?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Graded On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseGrade.assignments.map((assignment) => (
                      <TableRow key={`${assignment.id}-${assignment.attempt}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Attempt {assignment.attempt}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {assignment.score} / {assignment.total_points}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${assignment.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {assignment.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(assignment.graded_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <Link href={`/courses/${courseGrade.course_id}/assessments/${assignment.id}/results?attempt=${assignment.attempt}`}>
                              View Details
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>

              <CardFooter className="bg-muted/50 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Course Average:</span> {courseGrade.overall_percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Letter Grade:</span> {courseGrade.letter_grade}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}