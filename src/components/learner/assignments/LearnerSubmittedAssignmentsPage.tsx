"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { richTextToPlain } from "@/components/ui/rich-text";
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
    } | null;
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
  

  /*
   * LSA-001. The session, from whichever store holds it.
   *
   * This read the `bwengeAuth` slice alone. `loading` starts true and the
   * effect below only fetches `if (user?.id)`, so a session that had been
   * restored into the AuthProvider context but not back into Redux left the
   * spinner turning for ever with no request ever sent. The same shape that
   * froze the institution students list, and the reason `useAuth()` now falls
   * back to Redux rather than the other way round.
   */
  const reduxUser = useAppSelector((state) => state.bwengeAuth.user);
  const { user: contextUser } = useAuth();
  const { user: sessionUser, status: sessionStatus } = useSession();
  const user = reduxUser ?? contextUser ?? sessionUser;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /* Thumbnails whose URL failed, so the card falls back to the placeholder
     rather than painting the course title where the picture should be. */
  const [brokenThumbnails, setBrokenThumbnails] = useState<Set<string>>(
    new Set()
  );
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
    // Wait only while the session is genuinely unresolved. Leaving `loading`
    // true on a resolved "nobody is signed in" is the spinner that never
    // stopped.
    if (sessionStatus === "initializing") return;

    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchSubmittedAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, sessionStatus]);

  /**
   * LSA-001. One request.
   *
   * ── What this used to do ────────────────────────────────────────────────
   *
   * `GET /answers/user/:id` returns one row per *answer* — per question, per
   * attempt. This then walked that list and, for every row, awaited two more
   * requests in sequence: `GET /assessments/:id` and `GET /courses/:id`.
   *
   * A learner with twenty-four attempts of ten questions has 240 answer rows,
   * so opening this page fired up to 480 HTTP requests strictly one after
   * another. That is the "infinite loading indicator": it was not stuck, it
   * was working through a serial waterfall that would take minutes.
   *
   * ── Why none of it was needed ───────────────────────────────────────────
   *
   * `AnswerController.getUserAllAnswers` already does this work server-side.
   * It groups the answers by (assessment, attempt), resolves each assessment
   * with `relations: ["course", "course.instructor"]`, totals the points,
   * derives the status, sorts newest-first and returns a `summary` block with
   * the counts and averages this page's tiles want.
   *
   * The response was shaped exactly like the interface above and the page
   * discarded it to rebuild it one fetch at a time. So: take what the server
   * sent.
   */
  const fetchSubmittedAssignments = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem("bwengeplus_token");

      const answersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/answers/user/${user?.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!answersResponse.ok) {
        // The server's own message, where it sent one. "Failed to fetch
        // answers" told a learner nothing they could act on.
        let message = `Could not load your submissions (${answersResponse.status}).`;
        try {
          const body = await answersResponse.json();
          if (body?.message) message = body.message;
        } catch {
          // Not JSON. The status line above is what we have.
        }
        throw new Error(message);
      }

      const answersData = await answersResponse.json();
      const submissions: SubmittedAssignment[] = Array.isArray(answersData.data)
        ? answersData.data
        : [];

      setSubmittedAssignments(submissions);

      /*
       * The summary, as sent. Falls back to counting locally when an older
       * build of the API omits it, so the tiles work either way.
       */
      const summary = answersData.summary;
      setStats(
        summary
          ? {
              total_submitted: Number(summary.total) || submissions.length,
              pending_grading: Number(summary.pending_grading) || 0,
              graded: Number(summary.graded) || 0,
              auto_graded: Number(summary.auto_graded) || 0,
              average_score: Number(summary.average_score) || 0,
              pass_rate: Number(summary.pass_rate) || 0,
              by_course: byCourse(submissions),
            }
          : calculateSubmittedStats(submissions)
      );
    } catch (error: any) {
      const message =
        error?.message || "Something went wrong loading your submissions.";
      setLoadError(message);
      setSubmittedAssignments([]);
      setStats(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /** Submissions grouped by course, for the course filter. */
  const byCourse = (submissions: SubmittedAssignment[]) => {
    const counts = new Map<string, { title: string; count: number }>();
    submissions.forEach((submission) => {
      const id = submission.course?.id || "unknown";
      const existing = counts.get(id);
      counts.set(id, {
        title: submission.course?.title || "Unknown course",
        count: (existing?.count ?? 0) + 1,
      });
    });
    return Array.from(counts.entries()).map(([course_id, value]) => ({
      course_id,
      course_title: value.title,
      count: value.count,
    }));
  };

  /*
   * The 480-request client-side rebuild that used to live here is gone
   * (LSA-001). `AnswerController.getUserAllAnswers` already groups, joins
   * and totals everything it was reconstructing, so the fetch above just
   * takes the response.
   */

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
    /*
     * LRN-003. /courses/:id/assessments/:id/results was never a route in
     * this app, so this 404'd every time. The Learning Space is where the
     * result actually lives: the runner loads the recorded attempt and
     * renders it with the release policy and integrity panel applied.
     */
    window.location.href = `/courses/${assignment.course.id}/learn?assessment=${assignment.assessment_id}`;
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
          <Badge className="bg-warning/15 text-warning border-warning/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending Grading
          </Badge>
        );
      case "GRADED":
        return (
          <Badge className="bg-success/15 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Graded
          </Badge>
        );
      case "AUTO_GRADED":
        return (
          <Badge className="bg-primary/15 text-primary border-primary/30">
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
        <Badge className="bg-success/15 text-success border-success/30">
          Passed: {percentage.toFixed(1)}%
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-destructive/15 text-destructive border-destructive/30">
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

  /*
   * LSA-001. A skeleton that mirrors the page, not a spinner on an empty
   * screen — and one that is only ever shown while something is genuinely in
   * flight. The full-height `Loader2` this replaces is what the report saw,
   * turning indefinitely because the fetch had never been started.
   */
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <div className="space-y-2">
          <div className="h-6 w-56 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      </div>
    );
  }

  const tiles = stats
    ? [
        {
          label: "Submitted",
          value: stats.total_submitted,
          icon: FileText,
          tone: "text-primary bg-primary/10",
        },
        {
          label: "Awaiting marking",
          value: stats.pending_grading,
          icon: Clock,
          tone: "text-warning bg-warning/10",
        },
        {
          label: "Average score",
          /* Guarded: `average_score` arrives from the API, and a Postgres
             numeric reaches JSON as a string — `.toFixed` on one of those is
             the `average_rating?.toFixed is not a function` failure again. */
          value:
            stats.graded + stats.auto_graded > 0
              ? `${(Number(stats.average_score) || 0).toFixed(1)}%`
              : "—",
          icon: TrendingUp,
          tone: "text-success bg-success/10",
        },
        {
          label: "Pass rate",
          value:
            stats.graded + stats.auto_graded > 0
              ? `${(Number(stats.pass_rate) || 0).toFixed(1)}%`
              : "—",
          icon: Award,
          tone: "text-primary bg-primary/10",
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            Submitted Assignments
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Track the status of your submitted assignments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 self-start"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* ── A failed load, said out loud ────────────────────────────────── */}
      {loadError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="rounded-full bg-destructive/10 p-2.5">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Could not load your submissions
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Figures ─────────────────────────────────────────────────────── */}
      {tiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3"
            >
              <div className={cn("shrink-0 rounded-lg p-2", tile.tone)}>
                <tile.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {tile.label}
                </p>
                <p className="text-xl font-bold leading-tight text-foreground">
                  {tile.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search submitted assignments"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="h-9 w-full text-[13px] sm:w-48">
            <BookOpen className="mr-2 h-3.5 w-3.5" />
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
          <SelectTrigger className="h-9 w-full text-[13px] sm:w-40">
            <Filter className="mr-2 h-3.5 w-3.5" />
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
          <SelectTrigger className="h-9 w-full text-[13px] sm:w-40">
            <Filter className="mr-2 h-3.5 w-3.5" />
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
        <Card className="border-dashed border-border/70 bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="rounded-full bg-background p-3 shadow-sm ring-1 ring-border/60">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="max-w-sm">
              <p className="font-semibold text-foreground">
                No submitted assignments
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm
                  ? "No assignments match your search."
                  : "You haven't submitted any assignments yet."}
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/dashboard/learner/assignments/pending">
                View pending assignments
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden border-border/60 transition-shadow hover:shadow-md">
              {/* Thumbnail */}
              <div className="relative h-24 bg-muted">
                {assignment.course.thumbnail_url &&
                !brokenThumbnails.has(assignment.id) ? (
                  <img
                    src={assignment.course.thumbnail_url}
                    /* Empty: decorative. A non-empty alt is what paints the
                       course title into the frame when the URL fails. */
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() =>
                      setBrokenThumbnails((previous) => {
                        const next = new Set(previous);
                        next.add(assignment.id);
                        return next;
                      })
                    }
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/5">
                    <BookOpen className="h-5 w-5 text-primary/40" />
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
                <CardTitle className="line-clamp-1 text-[14px]">{assignment.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-[12px] leading-5">
                  {/* Authored in the rich text editor, so the stored value is
                      HTML. Rendered raw it reads "<p><span style=…", which is
                      the same defect LPG-001 fixed on the progress page. */}
                  {richTextToPlain(assignment.description) ||
                    "No description provided"}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2 space-y-3">
                {/* Course Info */}
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground line-clamp-1">{assignment.course.title}</span>
                </div>

                {/* Submission Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted/50 rounded-lg text-center">
                    <div className="font-semibold">{safeFormatDate(assignment.submitted_at, "MMM d")}</div>
                    <div className="text-muted-foreground">Submitted</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg text-center">
                    <div className="font-semibold">{assignment.attempt_number}/{assignment.total_attempts}</div>
                    <div className="text-muted-foreground">Attempt</div>
                  </div>
                </div>

                {/* Score if available */}
                {assignment.percentage !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Score</span>
                      <span className="font-bold">
                        {(Number(assignment.percentage) || 0).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={assignment.percentage} className="h-2" />
                  </div>
                )}

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
        <DialogContent size="lg">
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
                  <p className="text-sm text-muted-foreground">{selectedAssignment.course.title}</p>
                </div>
                {getStatusBadge(selectedAssignment.status)}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-semibold">{safeFormatDate(selectedAssignment.submitted_at, "MMM d, yyyy")}</div>
                  <div className="text-xs text-muted-foreground">Submitted</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-semibold">{selectedAssignment.attempt_number}</div>
                  <div className="text-xs text-muted-foreground">Attempt</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-semibold">{selectedAssignment.answers_count}/{selectedAssignment.questions_count}</div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-semibold">{selectedAssignment.total_points}</div>
                  <div className="text-xs text-muted-foreground">Total Points</div>
                </div>
              </div>

              {/* Score Section */}
              {selectedAssignment.percentage !== undefined && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Your Score</h4>
                    <Badge className={selectedAssignment.passed ? "bg-success/100" : "bg-destructive/100"}>
                      {selectedAssignment.passed ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-primary">
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
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm">{selectedAssignment.feedback}</p>
                    {selectedAssignment.graded_at && (
                      <p className="text-xs text-muted-foreground mt-2">
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