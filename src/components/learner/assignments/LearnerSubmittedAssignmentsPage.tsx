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
  Clock,
  AlertCircle,
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
  Mail,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Progress } from "../../ui/progress";

interface SubmittedAssignment {
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
  attempt_number: number;
  total_attempts: number;
  answers_count: number;
  questions_count: number;
  total_points: number;
  status: "PENDING_GRADING" | "GRADED" | "AUTO_GRADED";
  score?: number;
  percentage?: number;
  passed?: boolean;
  feedback?: string;
  graded_at?: string;
  graded_by?: string;
}

interface SubmittedStats {
  total_submitted: number;
  pending_grading: number;
  graded: number;
  auto_graded: number;
  average_score: number;
  pass_rate: number;
  by_course: {
    course_id: string;
    course_title: string;
    count: number;
  }[];
}

export default function LearnerSubmittedAssignmentsPage() {
  

  const { user } = useAppSelector((state) => state.bwengeAuth);
  const [loading, setLoading] = useState(true);
  const [submittedAssignments, setSubmittedAssignments] = useState<SubmittedAssignment[]>([]);
  const [stats, setStats] = useState<SubmittedStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<SubmittedAssignment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);


  useEffect(() => {
    if (user?.id) {
      fetchSubmittedAssignments();
    }
  }, [user]);

  const fetchSubmittedAssignments = async () => {
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

      // Group by assessment to get unique submissions
      const submissionMap = new Map();

      for (const answer of answers) {
        const key = `${answer.assessment_id}-${answer.attempt_number}`;
        
        if (!submissionMap.has(key) || new Date(answer.created_at) > new Date(submissionMap.get(key).submitted_at)) {
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
          let courseId = answer.course_id;
          
          if (assessmentResponse.ok) {
            const data = await assessmentResponse.json();
            assessmentData = data.data;
            // Get course_id from assessment if not in answer
            if (!courseId && assessmentData?.course_id) {
              courseId = assessmentData.course_id;
            }
            // Also check in nested course object
            if (!courseId && assessmentData?.course?.id) {
              courseId = assessmentData.course.id;
            }
          }

          // Fetch course details only if we have a valid course_id
          let courseData = null;
          if (courseId) {
            const courseResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (courseResponse.ok) {
              const data = await courseResponse.json();
              courseData = data.data;
            }
          } else if (assessmentData?.course) {
            // Use course data from assessment if available
            courseData = assessmentData.course;
          }

          // Determine status
          let status: "PENDING_GRADING" | "GRADED" | "AUTO_GRADED" = "PENDING_GRADING";
          
          // Check if this is a quiz (auto-graded)
          const isQuiz = assessmentData?.type === "QUIZ";
          
          if (isQuiz) {
            status = "AUTO_GRADED";
          } else if (answer.is_graded) {
            status = "GRADED";
          }

          submissionMap.set(key, {
            id: key,
            assessment_id: answer.assessment_id,
            title: assessmentData?.title || "Unknown Assessment",
            description: assessmentData?.description || "",
            course: {
              id: courseId || "unknown",
              title: courseData?.title || "Unknown Course",
              thumbnail_url: courseData?.thumbnail_url || null,
              instructor: {
                id: courseData?.instructor?.id || courseData?.instructor_id || "",
                name: courseData?.instructor
                  ? `${courseData.instructor.first_name || ""} ${courseData.instructor.last_name || ""}`.trim() || "Unknown Instructor"
                  : "Unknown Instructor",
              },
            },
            submitted_at: answer.created_at || answer.submitted_at || new Date().toISOString(),
            attempt_number: answer.attempt_number || 1,
            total_attempts: assessmentData?.max_attempts || 3,
            answers_count: 1,
            questions_count: assessmentData?.questions?.length || 0,
            total_points: assessmentData?.questions?.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 0,
            status,
            score: answer.points_earned,
            percentage: answer.percentage,
            passed: answer.passed,
            feedback: answer.feedback,
            graded_at: answer.graded_at,
            graded_by: answer.graded_by_user_id,
          });
        }
      }

      const submissions = Array.from(submissionMap.values()) as SubmittedAssignment[];
      setSubmittedAssignments(submissions);
      
      // Calculate statistics
      const stats = calculateSubmittedStats(submissions);
      setStats(stats);
    } catch (error) {
      console.error("Error fetching submitted assignments:", error);
      toast.error("Failed to load submitted assignments");
    } finally {
      setLoading(false);
    }
  };

  const calculateSubmittedStats = (submissions: SubmittedAssignment[]): SubmittedStats => {
    const pendingGrading = submissions.filter(s => s.status === "PENDING_GRADING").length;
    const graded = submissions.filter(s => s.status === "GRADED").length;
    const autoGraded = submissions.filter(s => s.status === "AUTO_GRADED").length;

    const gradedSubmissions = submissions.filter(s => s.percentage !== undefined);
    const averageScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / gradedSubmissions.length
      : 0;

    const passedCount = gradedSubmissions.filter(s => s.passed).length;
    const passRate = gradedSubmissions.length > 0 ? (passedCount / gradedSubmissions.length) * 100 : 0;

    // Group by course
    const courseMap = new Map();
    submissions.forEach(s => {
      const count = courseMap.get(s.course.id) || 0;
      courseMap.set(s.course.id, {
        course_id: s.course.id,
        course_title: s.course.title,
        count: count + 1,
      });
    });
    const byCourse = Array.from(courseMap.values());

    return {
      total_submitted: submissions.length,
      pending_grading: pendingGrading,
      graded,
      auto_graded: autoGraded,
      average_score: averageScore,
      pass_rate: passRate,
      by_course: byCourse,
    };
  };

  const handleViewDetails = (assignment: SubmittedAssignment) => {
    setSelectedAssignment(assignment);
    setShowDetailsDialog(true);
  };

  const handleViewResults = (assignment: SubmittedAssignment) => {
    window.location.href = `/courses/${assignment.course.id}/assessments/${assignment.assessment_id}/results?attempt=${assignment.attempt_number}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubmittedAssignments();
    setRefreshing(false);
    toast.success("Submitted assignments refreshed");
  };

  const filteredAssignments = submittedAssignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.course.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCourse = filterCourse === "all" || assignment.course.id === filterCourse;
      
      const matchesStatus = filterStatus === "all" || assignment.status === filterStatus;
      
      return matchesSearch && matchesCourse && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        case "course":
          return a.course.title.localeCompare(b.course.title);
        case "title":
          return a.title.localeCompare(b.title);
        case "score":
          return (b.percentage || 0) - (a.percentage || 0);
        default:
          return 0;
      }
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_GRADING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Grading
          </Badge>
        );
      case "GRADED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Graded
          </Badge>
        );
      case "AUTO_GRADED":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Award className="w-3 h-3 mr-1" />
            Auto-graded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreBadge = (percentage: number | undefined, passed: boolean | undefined) => {
    if (percentage === undefined) return null;
    
    if (passed) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Passed: {percentage.toFixed(1)}%
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Failed: {percentage.toFixed(1)}%
        </Badge>
      );
    }
  };

  const safeFormatDate = (dateString: string | undefined, formatStr: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, formatStr);
    } catch (error) {
      return "N/A";
    }
  };

  const uniqueCourses = [...new Map(
    submittedAssignments.map(a => [a.course.id, { id: a.course.id, title: a.course.title }])
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Submitted Assignments
          </h1>
          <p className="text-gray-600">
            Track the status of your submitted assignments
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
                  <p className="text-sm text-gray-500">Total Submitted</p>
                  <p className="text-3xl font-bold">{stats.total_submitted}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Grading</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending_grading}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-3xl font-bold text-green-600">{stats.average_score.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pass Rate</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.pass_rate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-purple-600" />
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
            placeholder="Search submitted assignments..."
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING_GRADING">Pending Grading</SelectItem>
            <SelectItem value="GRADED">Graded</SelectItem>
            <SelectItem value="AUTO_GRADED">Auto-graded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="course">Course</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="score">Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submitted Assignments List */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Submitted Assignments
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? "No assignments match your search criteria"
                : "You haven't submitted any assignments yet."}
            </p>
            <Button asChild>
              <Link href="/dashboard/learner/assignments/pending">
                View Pending Assignments
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
                  {getStatusBadge(assignment.status)}
                </div>
                {assignment.percentage !== undefined && (
                  <div className="absolute bottom-2 right-2">
                    {getScoreBadge(assignment.percentage, assignment.passed)}
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-base line-clamp-1">{assignment.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {assignment.description || "No description provided"}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2 space-y-3">
                {/* Course Info */}
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 line-clamp-1">{assignment.course.title}</span>
                </div>

                {/* Submission Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <div className="font-semibold">{safeFormatDate(assignment.submitted_at, "MMM d")}</div>
                    <div className="text-gray-500">Submitted</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <div className="font-semibold">{assignment.attempt_number}/{assignment.total_attempts}</div>
                    <div className="text-gray-500">Attempt</div>
                  </div>
                </div>

                {/* Score if available */}
                {assignment.percentage !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Score</span>
                      <span className="font-bold">{assignment.percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={assignment.percentage} className="h-2" />
                  </div>
                )}

                {/* Feedback Preview */}
                {assignment.feedback && (
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-blue-700 italic line-clamp-2">
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
                  onClick={() => handleViewDetails(assignment)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Details
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewResults(assignment)}
                  disabled={assignment.status === "PENDING_GRADING"}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Results
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              Detailed information about your submission
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedAssignment.title}</h3>
                  <p className="text-sm text-gray-500">{selectedAssignment.course.title}</p>
                </div>
                {getStatusBadge(selectedAssignment.status)}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-semibold">{safeFormatDate(selectedAssignment.submitted_at, "MMM d, yyyy")}</div>
                  <div className="text-xs text-gray-500">Submitted</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-semibold">{selectedAssignment.attempt_number}</div>
                  <div className="text-xs text-gray-500">Attempt</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-semibold">{selectedAssignment.answers_count}/{selectedAssignment.questions_count}</div>
                  <div className="text-xs text-gray-500">Questions</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-semibold">{selectedAssignment.total_points}</div>
                  <div className="text-xs text-gray-500">Total Points</div>
                </div>
              </div>

              {/* Score Section */}
              {selectedAssignment.percentage !== undefined && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Your Score</h4>
                    <Badge className={selectedAssignment.passed ? "bg-green-500" : "bg-red-500"}>
                      {selectedAssignment.passed ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-blue-600">
                      {selectedAssignment.percentage.toFixed(1)}%
                    </div>
                    <div className="flex-1">
                      <Progress value={selectedAssignment.percentage} className="h-3" />
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Section */}
              {selectedAssignment.feedback && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Instructor Feedback</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm">{selectedAssignment.feedback}</p>
                    {selectedAssignment.graded_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Graded on {safeFormatDate(selectedAssignment.graded_at, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleViewResults(selectedAssignment)}
                  disabled={selectedAssignment.status === "PENDING_GRADING"}
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