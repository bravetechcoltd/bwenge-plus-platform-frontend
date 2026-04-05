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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  AlertCircle,
  Calendar,
  BookOpen,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  FileText,
  AlertTriangle,
  Award,
  Users,
  Target,
  TrendingUp,
  AlertOctagon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface PendingAssignment {
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
  due_date: string | null;
  available_from: string;
  available_until: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  attempts_used: number;
  questions_count: number;
  total_points: number;
  status: "PENDING" | "OVERDUE" | "IN_PROGRESS";
  last_attempt_id?: string;
  estimated_time_minutes: number;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  submission_status?: {
    started_at?: string;
    time_spent_minutes: number;
    answers_submitted: number;
  };
}

interface PendingStats {
  total_pending: number;
  overdue: number;
  due_this_week: number;
  in_progress: number;
  average_score: number;
  by_course: {
    course_id: string;
    course_title: string;
    count: number;
  }[];
}

export default function LearnerPendingAssignmentsPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [stats, setStats] = useState<PendingStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("due_date");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PendingAssignment | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchPendingAssignments();
    }
  }, [user]);

  const fetchPendingAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Fetch user's enrollments first to get course IDs
      const enrollmentsResponse = await fetch(
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
          }),
        }
      );

      if (!enrollmentsResponse.ok) {
        throw new Error("Failed to fetch enrollments");
      }

      const enrollmentsData = await enrollmentsResponse.json();
      const enrollments = enrollmentsData.data || [];

      // For each enrollment, fetch pending assessments
      const pendingPromises = enrollments.map(async (enrollment: any) => {
        const courseId = enrollment.course.id;
        
        // Fetch assessments for this course
        const assessmentsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/assessments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!assessmentsResponse.ok) return [];

        const assessmentsData = await assessmentsResponse.json();
        const assessments = assessmentsData.data || [];

        // For each assessment, check if user has pending attempts
        const pendingAssessmentPromises = assessments.map(async (assessment: any) => {
          // Fetch user's attempts for this assessment
          const attemptsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/answers/user/${user?.id}/assessment/${assessment.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          let attempts = [];
          let latestAnswer = null;
          
          if (attemptsResponse.ok) {
            const attemptsData = await attemptsResponse.json();
            attempts = attemptsData.data?.answers || [];
            
            // Find the latest answer for this assessment
            const assessmentAnswers = attempts.filter(
              (a: any) => a.assessment_id === assessment.id
            );
            if (assessmentAnswers.length > 0) {
              latestAnswer = assessmentAnswers.sort(
                (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
            }
          }

          // Determine status
          let status: "PENDING" | "OVERDUE" | "IN_PROGRESS" = "PENDING";
          
          if (latestAnswer && !latestAnswer.is_final_submission) {
            status = "IN_PROGRESS";
          } else if (assessment.due_date && new Date(assessment.due_date) < new Date()) {
            status = "OVERDUE";
          }

          // Only return if it's pending or in progress
          if (status === "PENDING" || status === "IN_PROGRESS") {
            return {
              id: `${courseId}-${assessment.id}`,
              assessment_id: assessment.id,
              title: assessment.title,
              description: assessment.description || "No description provided",
              course: {
                id: courseId,
                title: enrollment.course.title,
                thumbnail_url: enrollment.course.thumbnail_url,
                instructor: {
                  id: enrollment.course.instructor?.id,
                  name: enrollment.course.instructor
                    ? `${enrollment.course.instructor.first_name} ${enrollment.course.instructor.last_name}`
                    : "Unknown Instructor",
                },
              },
              due_date: assessment.due_date,
              available_from: assessment.available_from || enrollment.enrolled_at,
              available_until: assessment.available_until,
              time_limit_minutes: assessment.time_limit_minutes,
              max_attempts: assessment.max_attempts || 3,
              attempts_used: attempts.length,
              questions_count: assessment.questions?.length || 0,
              total_points: assessment.questions?.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 0,
              status,
              last_attempt_id: latestAnswer?.id,
              estimated_time_minutes: assessment.estimated_time_minutes || 30,
              difficulty: assessment.difficulty || "INTERMEDIATE",
              submission_status: latestAnswer ? {
                started_at: latestAnswer.created_at,
                time_spent_minutes: latestAnswer.time_spent_seconds ? Math.round(latestAnswer.time_spent_seconds / 60) : 0,
                answers_submitted: latestAnswer.answers ? Object.keys(latestAnswer.answers).length : 0,
              } : undefined,
            };
          }
          return null;
        });

        const pendingAssessments = await Promise.all(pendingAssessmentPromises);
        return pendingAssessments.filter(a => a !== null);
      });

      const pendingResults = await Promise.all(pendingPromises);
      const allPending = pendingResults.flat() as PendingAssignment[];

      setPendingAssignments(allPending);
      
      // Calculate statistics
      const stats = calculatePendingStats(allPending, enrollments);
      setStats(stats);
    } catch (error) {
      toast.error("Failed to load pending assignments");
    } finally {
      setLoading(false);
    }
  };

  const calculatePendingStats = (
    assignments: PendingAssignment[],
    enrollments: any[]
  ): PendingStats => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const overdue = assignments.filter(a => a.status === "OVERDUE").length;
    const dueThisWeek = assignments.filter(
      a => a.due_date && new Date(a.due_date) <= weekFromNow && new Date(a.due_date) >= now
    ).length;
    const inProgress = assignments.filter(a => a.status === "IN_PROGRESS").length;

    // Group by course
    const courseMap = new Map();
    assignments.forEach(a => {
      const count = courseMap.get(a.course.id) || 0;
      courseMap.set(a.course.id, {
        course_id: a.course.id,
        course_title: a.course.title,
        count: count + 1,
      });
    });
    const byCourse = Array.from(courseMap.values());

    return {
      total_pending: assignments.length,
      overdue,
      due_this_week: dueThisWeek,
      in_progress: inProgress,
      average_score: 0, // Would come from graded assignments
      by_course: byCourse,
    };
  };

  const handleStartAssignment = (assignment: PendingAssignment) => {
    setSelectedAssignment(assignment);
    setShowStartDialog(true);
  };

  const confirmStartAssignment = () => {
    if (!selectedAssignment) return;
    
    // Navigate to the assignment page
    window.location.href = `/courses/${selectedAssignment.course.id}/assessments/${selectedAssignment.assessment_id}`;
    setShowStartDialog(false);
  };

  const handleContinueAssignment = (assignment: PendingAssignment) => {
    window.location.href = `/courses/${assignment.course.id}/assessments/${assignment.assessment_id}?attempt=${assignment.last_attempt_id}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPendingAssignments();
    setRefreshing(false);
    toast.success("Pending assignments refreshed");
  };

  const filteredAssignments = pendingAssignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.course.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCourse = filterCourse === "all" || assignment.course.id === filterCourse;
      
      const matchesStatus = filterStatus === "all" || assignment.status === filterStatus;
      
      return matchesSearch && matchesCourse && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "due_date":
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "course":
          return a.course.title.localeCompare(b.course.title);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const getStatusBadge = (status: string, dueDate: string | null) => {
    switch (status) {
      case "OVERDUE":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-primary/15 text-primary border-primary/30">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        if (dueDate) {
          const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 2) {
            return (
              <Badge className="bg-warning/15 text-warning border-warning/30">
                <AlertOctagon className="w-3 h-3 mr-1" />
                Due Soon
              </Badge>
            );
          }
        }
        return (
          <Badge variant="outline">
            Pending
          </Badge>
        );
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-success/15 text-success";
      case "INTERMEDIATE":
        return "bg-primary/15 text-primary";
      case "ADVANCED":
        return "bg-warning/15 text-warning";
      case "EXPERT":
        return "bg-destructive/15 text-destructive";
      default:
        return "bg-muted text-foreground";
    }
  };

  const formatTimeLeft = (dueDate: string | null) => {
    if (!dueDate) return "No due date";
    
    const due = new Date(dueDate);
    const now = new Date();
    
    if (due < now) return "Overdue";
    
    return formatDistanceToNow(due, { addSuffix: true });
  };

  const uniqueCourses = [...new Map(
    pendingAssignments.map(a => [a.course.id, { id: a.course.id, title: a.course.title }])
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
            Pending Assignments
          </h1>
          <p className="text-muted-foreground">
            Track and complete your pending assignments
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
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                  <p className="text-3xl font-bold">{stats.total_pending}</p>
                </div>
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Due This Week</p>
                  <p className="text-3xl font-bold text-warning">{stats.due_this_week}</p>
                </div>
                <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-primary">{stats.in_progress}</p>
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
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-3xl font-bold text-destructive">{stats.overdue}</p>
                </div>
                <div className="w-12 h-12 bg-destructive/15 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
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
            placeholder="Search assignments..."
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
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="course">Course</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pending Assignments List */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No Pending Assignments
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "No assignments match your search criteria"
                : "You have no pending assignments. Great job!"}
            </p>
            <Button asChild>
              <Link href="/dashboard/learner/learning/courses">
                View Your Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Course Thumbnail */}
                <div className="md:w-48 h-32 md:h-auto relative">
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
                  <Badge
                    className={`absolute top-2 left-2 ${getDifficultyColor(assignment.difficulty)}`}
                  >
                    {assignment.difficulty}
                  </Badge>
                </div>

                {/* Assignment Details */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(assignment.status, assignment.due_date)}
                        {assignment.due_date && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatTimeLeft(assignment.due_date)}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {assignment.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {assignment.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {assignment.course.title}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {assignment.course.instructor.name}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col items-end gap-2">
                      {assignment.status === "IN_PROGRESS" ? (
                        <Button
                          onClick={() => handleContinueAssignment(assignment)}
                          className="bg-primary hover:bg-primary"
                        >
                          Continue
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleStartAssignment(assignment)}
                          disabled={assignment.status === "OVERDUE"}
                        >
                          Start Assignment
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      {assignment.attempts_used > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Attempt {assignment.attempts_used}/{assignment.max_attempts}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for In Progress */}
                  {assignment.status === "IN_PROGRESS" && assignment.submission_status && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {assignment.submission_status.answers_submitted}/{assignment.questions_count} questions
                        </span>
                      </div>
                      <Progress
                        value={(assignment.submission_status.answers_submitted / assignment.questions_count) * 100}
                        className="h-2"
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Time spent: {assignment.submission_status.time_spent_minutes} min
                        </span>
                        {assignment.time_limit_minutes && (
                          <span>
                            Time limit: {assignment.time_limit_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assignment Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-semibold text-foreground">
                        {assignment.questions_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Questions</div>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-semibold text-foreground">
                        {assignment.total_points}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Points</div>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-semibold text-foreground">
                        {assignment.estimated_time_minutes} min
                      </div>
                      <div className="text-xs text-muted-foreground">Est. Time</div>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-semibold text-foreground">
                        {assignment.max_attempts - assignment.attempts_used}
                      </div>
                      <div className="text-xs text-muted-foreground">Attempts Left</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Start Assignment Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Assignment</DialogTitle>
            <DialogDescription>
              You're about to start this assignment. Please review the details below.
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4 py-4">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-2">{selectedAssignment.title}</h4>
                <p className="text-sm text-primary mb-2">{selectedAssignment.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Course:</span> {selectedAssignment.course.title}
                  </div>
                  <div>
                    <span className="font-medium">Questions:</span> {selectedAssignment.questions_count}
                  </div>
                  <div>
                    <span className="font-medium">Time Limit:</span>{" "}
                    {selectedAssignment.time_limit_minutes
                      ? `${selectedAssignment.time_limit_minutes} minutes`
                      : "No limit"}
                  </div>
                  <div>
                    <span className="font-medium">Attempts:</span>{" "}
                    {selectedAssignment.attempts_used}/{selectedAssignment.max_attempts} used
                  </div>
                </div>
              </div>

              {selectedAssignment.time_limit_minutes && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                  <p className="text-xs text-warning flex items-start">
                    <Clock className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>
                      This assignment has a time limit of {selectedAssignment.time_limit_minutes} minutes.
                      The timer will start once you begin.
                    </span>
                  </p>
                </div>
              )}

              {selectedAssignment.attempts_used > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                  <p className="text-xs text-warning flex items-start">
                    <AlertTriangle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>
                      You have {selectedAssignment.max_attempts - selectedAssignment.attempts_used} attempt(s) remaining.
                      Your previous score will be replaced if you submit again.
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStartDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStartAssignment}
              className="bg-primary hover:bg-primary"
            >
              Start Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}