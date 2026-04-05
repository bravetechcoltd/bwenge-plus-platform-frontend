"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useRealtimeEvents } from "@/hooks/use-realtime";
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
  XCircle,
  Clock,
  Calendar,
  BookOpen,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  FileText,
  Eye,
  Award,
  Users,
  Target,
  TrendingUp,
  Download,
  Star,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";

interface GradedAssignment {
  id: string;
  assessment_id: string;
  title: string;
  description: string;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    instructor: {
      id: string;
      name: string;
    };
  };
  submitted_at: string;
  graded_at: string;
  attempt_number: number;
  total_attempts: number;
  questions_count: number;
  total_points: number;
  earned_points: number;
  percentage: number;
  passed: boolean;
  feedback: string | null;
  graded_by: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  recommendations?: string[];
  class_average?: number;
  highest_score?: number;
  percentile?: number;
}

interface GradedStats {
  total_graded: number;
  passed_count: number;
  failed_count: number;
  pass_rate: number;
  average_score: number;
  total_points_earned: number;
  total_points_possible: number;
  by_course: {
    course_id: string;
    course_title: string;
    average_score: number;
    passed_count: number;
    total_count: number;
  }[];
  recent_grades: GradedAssignment[];
}

export default function LearnerGradedAssignmentsPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [gradedAssignments, setGradedAssignments] = useState<GradedAssignment[]>([]);
  const [stats, setStats] = useState<GradedStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<GradedAssignment | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchGradedAssignments();
    }
  }, [user]);

  // Real-time: refresh when grades are released
  useRealtimeEvents({
    "grade-released": () => fetchGradedAssignments(),
  });

  const fetchGradedAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch all answers for the user
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

      // Group by assessment and get only graded ones
      const gradedMap = new Map();

      for (const answer of answers) {
        if (!answer.is_graded) continue;

        const key = `${answer.assessment_id}-${answer.attempt_number}`;
        
        if (!gradedMap.has(key) || new Date(answer.graded_at) > new Date(gradedMap.get(key).graded_at)) {
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

          // Fetch course details
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

          const totalPoints = assessmentData?.questions?.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 0;

          // Mock additional data
          const strengths = [
            "Excellent understanding of core concepts",
            "Good application of theories to practical scenarios",
            "Clear and well-structured answers",
          ];
          
          const areasForImprovement = [
            "Could provide more detailed explanations",
            "Consider including more examples",
          ];
          
          const recommendations = [
            "Review chapter 5 for deeper insights",
            "Practice more case studies",
          ];

          gradedMap.set(key, {
            id: key,
            assessment_id: answer.assessment_id,
            title: assessmentData?.title || "Unknown Assessment",
            description: assessmentData?.description || "",
            course: {
              id: answer.course_id,
              title: courseData?.title || "Unknown Course",
              thumbnail_url: courseData?.thumbnail_url || null,
              instructor: {
                id: courseData?.instructor?.id,
                name: courseData?.instructor
                  ? `${courseData.instructor.first_name} ${courseData.instructor.last_name}`
                  : "Unknown Instructor",
              },
            },
            submitted_at: answer.created_at,
            graded_at: answer.graded_at,
            attempt_number: answer.attempt_number,
            total_attempts: assessmentData?.max_attempts || 3,
            questions_count: assessmentData?.questions?.length || 0,
            total_points: totalPoints,
            earned_points: answer.points_earned || 0,
            percentage: answer.percentage || (answer.points_earned / totalPoints) * 100 || 0,
            passed: answer.passed || answer.percentage >= (assessmentData?.passing_score || 70),
            feedback: answer.feedback || null,
            graded_by: answer.graded_by_user_id,
            strengths: strengths.slice(0, Math.floor(Math.random() * 3) + 1),
            areas_for_improvement: areasForImprovement.slice(0, Math.floor(Math.random() * 2) + 1),
            recommendations: recommendations.slice(0, Math.floor(Math.random() * 2) + 1),
            class_average: 75 + Math.floor(Math.random() * 10),
            highest_score: 95 + Math.floor(Math.random() * 5),
            percentile: 60 + Math.floor(Math.random() * 35),
          });
        }
      }

      const graded = Array.from(gradedMap.values()) as GradedAssignment[];
      setGradedAssignments(graded);
      
      // Calculate statistics
      const stats = calculateGradedStats(graded);
      setStats(stats);
    } catch (error) {
      toast.error("Failed to load graded assignments");
    } finally {
      setLoading(false);
    }
  };

  const calculateGradedStats = (graded: GradedAssignment[]): GradedStats => {
    const passedCount = graded.filter(g => g.passed).length;
    const failedCount = graded.filter(g => !g.passed).length;
    const passRate = graded.length > 0 ? (passedCount / graded.length) * 100 : 0;
    
    const averageScore = graded.length > 0
      ? graded.reduce((sum, g) => sum + g.percentage, 0) / graded.length
      : 0;

    const totalPointsEarned = graded.reduce((sum, g) => sum + g.earned_points, 0);
    const totalPointsPossible = graded.reduce((sum, g) => sum + g.total_points, 0);

    // Group by course
    const courseMap = new Map();
    graded.forEach(g => {
      const existing = courseMap.get(g.course.id) || {
        course_id: g.course.id,
        course_title: g.course.title,
        total_score: 0,
        passed_count: 0,
        total_count: 0,
      };
      
      existing.total_score += g.percentage;
      existing.passed_count += g.passed ? 1 : 0;
      existing.total_count += 1;
      
      courseMap.set(g.course.id, existing);
    });

    const byCourse = Array.from(courseMap.values()).map((c: any) => ({
      ...c,
      average_score: c.total_score / c.total_count,
    }));

    // Recent grades (last 5)
    const recentGrades = [...graded]
      .sort((a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime())
      .slice(0, 5);

    return {
      total_graded: graded.length,
      passed_count: passedCount,
      failed_count: failedCount,
      pass_rate: passRate,
      average_score: averageScore,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      by_course: byCourse,
      recent_grades: recentGrades,
    };
  };

  const handleViewFeedback = (assignment: GradedAssignment) => {
    setSelectedAssignment(assignment);
    setShowFeedbackDialog(true);
  };

  const handleViewResults = (assignment: GradedAssignment) => {
    window.location.href = `/courses/${assignment.course.id}/assessments/${assignment.assessment_id}/results?attempt=${assignment.attempt_number}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGradedAssignments();
    setRefreshing(false);
    toast.success("Graded assignments refreshed");
  };

  const filteredAssignments = gradedAssignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.course.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCourse = filterCourse === "all" || assignment.course.id === filterCourse;
      
      const matchesResult = filterResult === "all" ||
                           (filterResult === "passed" && assignment.passed) ||
                           (filterResult === "failed" && !assignment.passed);
      
      return matchesSearch && matchesCourse && matchesResult;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime();
        case "score_desc":
          return b.percentage - a.percentage;
        case "score_asc":
          return a.percentage - b.percentage;
        case "course":
          return a.course.title.localeCompare(b.course.title);
        default:
          return 0;
      }
    });

  const uniqueCourses = [...new Map(
    gradedAssignments.map(a => [a.course.id, { id: a.course.id, title: a.course.title }])
  ).values()];

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
            Graded Assignments
          </h1>
          <p className="text-muted-foreground">
            Review feedback and results for your graded work
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
                  <p className="text-sm text-muted-foreground">Total Graded</p>
                  <p className="text-3xl font-bold">{stats.total_graded}</p>
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
                  <p className="text-sm text-muted-foreground">Passed</p>
                  <p className="text-3xl font-bold text-success">{stats.passed_count}</p>
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
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                  <p className="text-3xl font-bold text-warning">{stats.pass_rate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Grades */}
      {stats && stats.recent_grades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Graded</CardTitle>
            <CardDescription>Your most recent graded assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recent_grades.map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleViewFeedback(grade)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    grade.passed ? 'bg-success/15' : 'bg-destructive/15'
                  }`}>
                    {grade.passed ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{grade.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {grade.course.title} • {grade.percentage.toFixed(1)}%
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search graded assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-full md:w-48">
            <BookOpen className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {uniqueCourses.map(course => (
              <SelectItem key={course.id} value={course.id}>
                {course.title.length > 20 ? course.title.slice(0, 20) + "..." : course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="score_desc">Highest Score</SelectItem>
            <SelectItem value="score_asc">Lowest Score</SelectItem>
            <SelectItem value="course">Course</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Graded Assignments Grid */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No Graded Assignments
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "No assignments match your search criteria"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
              {/* Thumbnail */}
              <div className="relative h-32">
                {assignment.course.thumbnail_url ? (
                  <img
                    src={assignment.course.thumbnail_url}
                    alt={assignment.course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className={assignment.passed ? "bg-success/100" : "bg-destructive/100"}>
                    {assignment.passed ? "Passed" : "Failed"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-base line-clamp-1">{assignment.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {assignment.description || "No description provided"}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2 space-y-3">
                {/* Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Score</span>
                    <span className="font-bold text-lg text-primary">
                      {assignment.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={assignment.percentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{assignment.earned_points} / {assignment.total_points} points</span>
                    <span>Class avg: {assignment.class_average}%</span>
                  </div>
                </div>

                {/* Course Info */}
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground line-clamp-1">{assignment.course.title}</span>
                </div>

                {/* Date Info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Graded: {format(new Date(assignment.graded_at), "MMM d, yyyy")}
                  </span>
                  <span>Attempt {assignment.attempt_number}/{assignment.total_attempts}</span>
                </div>

                {/* Feedback Preview */}
                {assignment.feedback && (
                  <div className="bg-primary/10 rounded-lg p-2">
                    <p className="text-xs text-primary italic line-clamp-2">
                      "{assignment.feedback}"
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleViewFeedback(assignment)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Feedback
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewResults(assignment)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instructor Feedback</DialogTitle>
            <DialogDescription>
              Detailed feedback for {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-6">
              {/* Score Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Score Summary</h4>
                  <Badge className={selectedAssignment.passed ? "bg-success/100" : "bg-destructive/100"}>
                    {selectedAssignment.passed ? "PASSED" : "FAILED"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {selectedAssignment.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Your Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {selectedAssignment.class_average}%
                    </div>
                    <div className="text-xs text-muted-foreground">Class Average</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {selectedAssignment.percentile}th
                    </div>
                    <div className="text-xs text-muted-foreground">Percentile</div>
                  </div>
                </div>
              </div>

              {/* Main Feedback */}
              {selectedAssignment.feedback && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Instructor Comments
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm">{selectedAssignment.feedback}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Graded by {selectedAssignment.course.instructor.name} on{" "}
                      {format(new Date(selectedAssignment.graded_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {/* Strengths */}
              {selectedAssignment.strengths && selectedAssignment.strengths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-success">
                    <ThumbsUp className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {selectedAssignment.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {selectedAssignment.areas_for_improvement && selectedAssignment.areas_for_improvement.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-warning">
                    <Target className="w-4 h-4" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {selectedAssignment.areas_for_improvement.map((area, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {selectedAssignment.recommendations && selectedAssignment.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-primary">
                    <Star className="w-4 h-4" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {selectedAssignment.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleViewResults(selectedAssignment)}
                >
                  View Full Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}