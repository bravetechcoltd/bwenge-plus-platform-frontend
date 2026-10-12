"use client";

import { useMemo, useState, useEffect } from "react";
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
import { richTextToPlain } from "@/components/ui/rich-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  BookOpen,
  Clock,
  TrendingUp,
  CheckCircle2,
  Target,
  PlayCircle,
  Calendar,
  Filter,
  Search,
  Download,
  RefreshCw,
  ChevronRight,
  User as UserIcon,
  Layers,
  Trophy,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import { instructorName } from "@/lib/instructor";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * My Learning Progress (LPG-001)
 * ============================================================================
 *
 * ── What was wrong ────────────────────────────────────────────────────────
 *
 * 1. Course descriptions are authored in `RichTextEditor` and stored as HTML.
 *    This page rendered `{course.description}` straight into a text node, so
 *    a learner read the markup:
 *
 *      <p><span style="color: rgb(45, 52, 60);">Compact&nbsp;SUV…
 *
 *    `RichText` and `richTextToPlain()` already exist for exactly this — the
 *    project hit it when module and assessment descriptions became rich text
 *    — and this page simply never used them. `richTextToPlain` is the right
 *    one of the two here: the excerpt is clamped to two lines, where block
 *    formatting cannot render anyway, and it normalises the `&nbsp;` that
 *    `contenteditable` puts between every word (an unbreakable run that would
 *    otherwise push a horizontal scrollbar onto the card).
 *
 * 2. Every card showed its title twice. The second one was the thumbnail's
 *    `alt` text: the images are failing to load, so the browser painted the
 *    alt string where the picture should be. A failed image now falls back to
 *    the placeholder instead.
 *
 * 3. "3 of 0 lessons", "1 of 0 lessons", "0 of 0 lessons". The denominator
 *    read `enrollment.course.total_lessons`, which that endpoint does not
 *    return, so it was always `|| 0` while the numerator was real. The counts
 *    now come from the same canonical roll-up the module rows use, which does
 *    have them — the course with four modules of three lessons reported
 *    "0 of 0" and is really 0 of 12.
 *
 * 4. The module rows read "1/1 lessons" beside "50%", because the percentage
 *    comes from the roll-up (lessons *and* assessments) while the fraction
 *    counted lessons alone. Both sides of that row now come from the roll-up,
 *    so the fraction and the percentage can no longer contradict each other.
 *
 * 5. Three things on this page were invented: the Weekly Activity chart was
 *    `Math.floor(Math.random() * 60) + 30` per day, the "7 day streak" was the
 *    literal `7`, and the Achievements tile counted a `quizzes_passed` that is
 *    hard-coded to 0. A chart of random numbers is worse than no chart, so
 *    they are gone rather than restyled.
 *
 * ── Layout ────────────────────────────────────────────────────────────────
 *
 * The card was a 6-unit-padded two-column block per course with a 256px chart
 * above the list. It is now a compact row: 4 real figures, one optional chart,
 * and per-course rows at `p-4` with a 13px/12px type ratio and the module grid
 * capped at four. Nothing here derives a percentage.
 */

interface ProgressModule {
  id: string;
  title: string;
  progress: number;
  state?: string;
  /** From the canonical roll-up: lessons *and* assessments. */
  completed_steps?: number;
  total_steps?: number;
  lessons: {
    id: string;
    title: string;
    completed: boolean;
    duration_minutes: number;
  }[];
}

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
  } | null;
  progress: {
    percentage: number;
    completed_lessons: number;
    total_lessons: number;
    time_spent_minutes: number;
    last_accessed: string | null;
    started_at: string;
    estimated_completion: string | null;
  };
  modules: ProgressModule[];
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
  level_distribution: {
    level: string;
    count: number;
  }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

/**
 * The step counts for a course, from the roll-up the module rows use.
 *
 * Returns `null` when the course has no modules at all, so the card can say
 * so instead of printing "0 of 0" — which is how an unauthored course and a
 * course not yet started used to look identical.
 */
function stepTotals(
  course: ProgressCourse
): { completed: number; total: number } | null {
  if (!course.modules || course.modules.length === 0) return null;

  const totals = course.modules.reduce(
    (acc, module) => {
      const total = Number(
        module.total_steps ?? module.lessons?.length ?? 0
      );
      const completed = Number(
        module.completed_steps ??
          (module.lessons || []).filter((lesson) => lesson.completed).length
      );
      return {
        completed: acc.completed + (Number.isFinite(completed) ? completed : 0),
        total: acc.total + (Number.isFinite(total) ? total : 0),
      };
    },
    { completed: 0, total: 0 }
  );

  return totals.total > 0 ? totals : null;
}

export default function LearnerProgressPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);

  const [loading, setLoading] = useState(true);
  const [progressCourses, setProgressCourses] = useState<ProgressCourse[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("progress");
  const [refreshing, setRefreshing] = useState(false);
  /* Thumbnails that failed to load, so the card can fall back rather than
     paint the `alt` text where the picture should be. */
  const [brokenThumbnails, setBrokenThumbnails] = useState<Set<string>>(
    new Set()
  );

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

            // Module progress comes straight from the API's canonical L3
            // roll-up (LP-CONS-001 §3.5). This used to recompute it here as
            // `completed lessons ÷ lessons in module`, ignoring assessments,
            // quizzes and the module final — so a module with one lesson and
            // one final read 100% on this page and 50% in the Learning Space
            // (G-06). Nothing on this screen derives a percentage any more.
            const modulesWithProgress = (progressData.progress?.modules || []).map(
              (module: any) => ({
                id: module.id,
                title: module.title,
                progress: module.progress,
                state: module.state,
                completed_steps: module.completed_steps,
                total_steps: module.total_steps,
                lessons: (module.lessons || []).map((lesson: any) => ({
                  ...lesson,
                  completed: lesson.completed === true,
                  progress_percentage: lesson.progress_percentage ?? 0,
                })),
              })
            );

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

  /**
   * The four figures at the top.
   *
   * `weekly_activity`, `streak_days` and `category_breakdown` were here and
   * are gone (LPG-001 §5): the first was `Math.random()` per day, the second
   * the literal 7, the third a hard-coded list of four categories that no
   * element ever rendered. Everything below is read from the enrollments.
   */
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

    // Level distribution
    const levelCounts: Record<string, number> = {};
    courses.forEach(c => {
      if (!c.level) return;
      levelCounts[c.level] = (levelCounts[c.level] || 0) + 1;
    });
    const levelDistribution = Object.entries(levelCounts).map(([level, count]) => ({
      level,
      count,
    }));

    return {
      total_courses: totalCourses,
      active_courses: totalCourses,
      completed_courses: enrollments.filter(e => e.status === "COMPLETED").length,
      overall_progress: totalCourses > 0
        ? courses.reduce((sum, c) => sum + c.progress.percentage, 0) / totalCourses
        : 0,
      total_time_spent_hours: Math.round(totalTimeSpent / 60),
      lessons_completed: lessonsCompleted,
      level_distribution: levelDistribution,
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
      return "Invalid date";
    }
  };

  /*
   * Descriptions, as text (LPG-001 §1).
   *
   * Memoised by course id: `richTextToPlain` runs a chain of replacements
   * over what can be several kilobytes of editor output, and re-running it on
   * every keystroke in the search box would be wasteful.
   */
  const excerpts = useMemo(() => {
    const map = new Map<string, string>();
    progressCourses.forEach((course) => {
      map.set(course.id, richTextToPlain(course.description));
    });
    return map;
  }, [progressCourses]);

  const filteredCourses = progressCourses
    .filter(course =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructorName(course.instructor).toLowerCase().includes(searchTerm.toLowerCase())
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
        return <Target className="w-3 h-3" />;
      case "INTERMEDIATE":
        return <Trophy className="w-3 h-3" />;
      case "ADVANCED":
      case "EXPERT":
        return <Crown className="w-3 h-3" />;
      default:
        return <Target className="w-3 h-3" />;
    }
  };

  /*
   * Level colours.
   *
   * These were `bg-success/100`, `bg-primary/100` and `bg-muted/500` — an
   * opacity of 100 is a no-op and `bg-muted/500` is not a class at all, so
   * two of the four badges were unstyled. Real tokens, and the text colour
   * travels with the background rather than being a fixed white.
   */
  const levelClasses = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return "bg-success text-success-foreground";
      case "INTERMEDIATE":
        return "bg-primary text-primary-foreground";
      case "ADVANCED":
      case "EXPERT":
        return "bg-foreground text-background";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatTime = (minutes: number): string => {
    const total = Math.round(Number(minutes) || 0);
    if (total <= 0) return "0m";
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tiles = stats
    ? [
        {
          label: "Overall progress",
          value: `${Math.round(stats.overall_progress)}%`,
          hint: `${stats.completed_courses} of ${stats.total_courses} completed`,
          icon: TrendingUp,
          tone: "text-primary bg-primary/10",
        },
        {
          label: "Active courses",
          value: stats.active_courses,
          hint: "in progress now",
          icon: BookOpen,
          tone: "text-primary bg-primary/10",
        },
        {
          label: "Lessons completed",
          value: stats.lessons_completed,
          hint: "across all courses",
          icon: CheckCircle2,
          tone: "text-success bg-success/10",
        },
        {
          label: "Time on task",
          value: `${stats.total_time_spent_hours}h`,
          hint: "tracked by the player",
          icon: Clock,
          tone: "text-warning bg-warning/10",
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            My Learning Progress
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Track your progress across all courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleExportProgress}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

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
                <p className="truncate text-[11px] text-muted-foreground">
                  {tile.hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Courses by level ────────────────────────────────────────────── */}
      {stats && stats.level_distribution.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Courses by level</CardTitle>
            <CardDescription className="text-[12px]">
              How your active courses are distributed by difficulty
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {/* 160px, not 256px: four slices do not need a quarter of the
                viewport, and the Weekly Activity chart that sat beside this
                one was generating its numbers with Math.random(). */}
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.level_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={58}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="level"
                  >
                    {stats.level_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses or instructors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 w-full text-[13px] sm:w-48">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progress">Progress (high to low)</SelectItem>
            <SelectItem value="recent">Recently active</SelectItem>
            <SelectItem value="name">Course name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Courses ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredCourses.length === 0 ? (
          <Card className="border-dashed border-border/70 bg-muted/20">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="rounded-full bg-background p-3 shadow-sm ring-1 ring-border/60">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="max-w-sm">
                <p className="font-semibold text-foreground">
                  No courses in progress
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm
                    ? "No courses match your search."
                    : "You haven't started any courses yet."}
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href="/dashboard/learner/browse/all">Browse courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredCourses.map((course) => {
            const excerpt = excerpts.get(course.id) ?? "";
            const steps = stepTotals(course);
            const complete = course.progress.percentage >= 100;
            const showThumbnail =
              !!course.thumbnail_url && !brokenThumbnails.has(course.id);

            return (
              <Card
                key={course.id}
                className="overflow-hidden border-border/60 transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row">
                    {/* ── Thumbnail ─────────────────────────────────────── */}
                    <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-muted md:h-24 md:w-40">
                      {showThumbnail ? (
                        <img
                          src={course.thumbnail_url as string}
                          /* Empty, deliberately: the image is decorative — the
                             title is the <h3> below — and a non-empty alt is
                             what printed every title twice while these URLs
                             were failing to load. */
                          alt=""
                          className="h-full w-full object-cover"
                          onError={() =>
                            setBrokenThumbnails((previous) => {
                              const next = new Set(previous);
                              next.add(course.id);
                              return next;
                            })
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/5">
                          <BookOpen className="h-5 w-5 text-primary/40" />
                        </div>
                      )}
                    </div>

                    {/* ── Body ──────────────────────────────────────────── */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-[15px] font-semibold text-foreground">
                              {course.title}
                            </h3>
                            {course.level ? (
                              <Badge
                                className={cn(
                                  "h-5 gap-1 border-transparent px-1.5 text-[10px] font-semibold",
                                  levelClasses(course.level)
                                )}
                              >
                                {getLevelIcon(course.level)}
                                {course.level}
                              </Badge>
                            ) : null}
                            {course.course_type ? (
                              <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-semibold"
                              >
                                {course.course_type}
                              </Badge>
                            ) : null}
                          </div>

                          {/* The description, as text (LPG-001 §1). */}
                          {excerpt ? (
                            <p
                              className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-muted-foreground"
                              title={excerpt}
                            >
                              {excerpt}
                            </p>
                          ) : null}

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {instructorName(course.instructor)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(course.progress.time_spent_minutes)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(course.progress.last_accessed)}
                            </span>
                          </div>
                        </div>

                        <Button size="sm" className="h-8 shrink-0" asChild>
                          <Link href={`/courses/${course.id}/learn`}>
                            <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                            Continue
                          </Link>
                        </Button>
                      </div>

                      {/* ── Overall progress ──────────────────────────── */}
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-[12px]">
                          <span className="font-medium text-muted-foreground">
                            {/* Counts from the roll-up, not the absent
                                `course.total_lessons` that made this read
                                "3 of 0 lessons" (LPG-001 §3). */}
                            {steps
                              ? `${steps.completed} of ${steps.total} steps completed`
                              : "No content published yet"}
                          </span>
                          <span
                            className={cn(
                              "font-bold",
                              complete ? "text-success" : "text-foreground"
                            )}
                          >
                            {Math.round(course.progress.percentage)}%
                          </span>
                        </div>
                        <Progress
                          value={course.progress.percentage}
                          className="h-1.5"
                        />
                        {course.progress.estimated_completion ? (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Target className="h-3 w-3" />
                            Estimated completion{" "}
                            {formatDate(course.progress.estimated_completion)}
                          </p>
                        ) : null}
                      </div>

                      {/* ── Modules ───────────────────────────────────── */}
                      {course.modules.length > 0 ? (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {course.modules.slice(0, 4).map((module) => {
                            const moduleTotal = Number(
                              module.total_steps ?? module.lessons?.length ?? 0
                            );
                            const moduleDone = Number(
                              module.completed_steps ??
                                (module.lessons || []).filter((l) => l.completed)
                                  .length
                            );
                            const modulePercent = Math.round(
                              Number(module.progress) || 0
                            );

                            return (
                              <div
                                key={module.id}
                                className="rounded-lg bg-muted/40 p-2.5 ring-1 ring-inset ring-border/50"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground"
                                    title={module.title}
                                  >
                                    {module.title}
                                  </span>
                                  <span
                                    className={cn(
                                      "shrink-0 text-[11px] font-bold",
                                      modulePercent >= 100
                                        ? "text-success"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    {modulePercent}%
                                  </span>
                                </div>

                                <div className="mt-1.5">
                                  <Progress
                                    value={modulePercent}
                                    className="h-1"
                                  />
                                </div>

                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                  {/* Both sides of this row come from the
                                      roll-up now, so "1/1" can no longer sit
                                      beside "50%" (LPG-001 §4). */}
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Layers className="h-3 w-3" />
                                    {moduleDone}/{moduleTotal} steps
                                  </span>
                                  {modulePercent < 100 ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 shrink-0 px-1.5 text-[11px]"
                                      asChild
                                    >
                                      <Link
                                        href={`/courses/${course.id}/learn?module=${module.id}`}
                                      >
                                        Continue
                                        <ChevronRight className="ml-0.5 h-3 w-3" />
                                      </Link>
                                    </Button>
                                  ) : (
                                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Done
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {course.modules.length > 4 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 justify-start text-[12px] text-muted-foreground sm:col-span-2"
                              asChild
                            >
                              <Link href={`/courses/${course.id}`}>
                                View all {course.modules.length} modules
                                <ChevronRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
