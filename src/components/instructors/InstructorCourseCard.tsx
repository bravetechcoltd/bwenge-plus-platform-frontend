"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Users,
  Star,
  Target,
  MoreVertical,
  Eye,
  BarChart3,
  Edit,
  Download,
  Archive,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { InstructorCourse } from "@/lib/features/instructor/instructorSlice";
import { useRouter } from "next/navigation";

interface InstructorCourseCardProps {
  course: InstructorCourse;
  view: "grid" | "list";
  onViewStudents: (courseId: string) => void;
  onViewAnalytics: (courseId: string) => void;
  onEditCourse?: (courseId: string) => void;
  onPublish?: (courseId: string) => void;
  onUnpublish?: (courseId: string) => void;
}

export function InstructorCourseCard({
  course,
  view,
  onViewStudents,
  onViewAnalytics,
  onEditCourse,
  onPublish,
  onUnpublish,
}: InstructorCourseCardProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-success/15 text-success";
      case "DRAFT":
        return "bg-warning/15 text-warning";
      case "ARCHIVED":
        return "bg-muted text-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getCourseTypeColor = (type: string) => {
    switch (type) {
      case "MOOC":
        return "bg-primary/15 text-primary";
      case "SPOC":
        return "bg-primary/15 text-primary";
      default:
        return "bg-muted text-foreground";
    }
  };

  const handleCourseClick = () => {
    router.push(`/courses/${course.id}`);
  };

  // ── Publish / Unpublish button (shared between grid & list) ──────────────
  const PublishToggleButton = ({ stopProp = false }: { stopProp?: boolean }) => {
    if (course.status === "DRAFT" && onPublish) {
      return (
        <Button
          variant="ghost"
          size="sm"
          title="Publish Course"
          className="text-success hover:text-success hover:bg-success/10"
          onClick={(e) => {
            if (stopProp) e.stopPropagation();
            onPublish(course.id);
          }}
        >
          <CheckCircle className="h-4 w-4" />
          <span className="ml-1 text-xs hidden sm:inline">Publish</span>
        </Button>
      );
    }

    if (course.status === "PUBLISHED" && onUnpublish) {
      return (
        <Button
          variant="ghost"
          size="sm"
          title="Unpublish Course"
          className="text-warning hover:text-warning hover:bg-warning/10"
          onClick={(e) => {
            if (stopProp) e.stopPropagation();
            onUnpublish(course.id);
          }}
        >
          <XCircle className="h-4 w-4" />
          <span className="ml-1 text-xs hidden sm:inline">Unpublish</span>
        </Button>
      );
    }

    return null;
  };

  // ── GRID VIEW ────────────────────────────────────────────────────────────
  if (view === "grid") {
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <div onClick={handleCourseClick}>
          {/* Thumbnail */}
          <div className="relative h-48 overflow-hidden rounded-t-lg">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-primary" />
              </div>
            )}

            <Badge className={`absolute top-3 right-3 ${getStatusColor(course.status)}`}>
              {course.status}
            </Badge>
            <Badge className={`absolute top-3 left-3 ${getCourseTypeColor(course.course_type)}`}>
              {course.course_type}
            </Badge>
            {!course.instructor_role.is_primary && (
              <Badge className="absolute bottom-3 left-3 bg-primary/15 text-primary">
                Additional Instructor
              </Badge>
            )}
          </div>

          <CardHeader className="pb-2">
            <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {course.short_description || course.description}
            </p>
            {course.institution && (
              <div className="flex items-center gap-2 mt-2">
                {course.institution.logo_url && (
                  <img
                    src={course.institution.logo_url}
                    alt={course.institution.name}
                    className="h-5 w-5 rounded object-cover"
                  />
                )}
                <span className="text-xs text-muted-foreground">{course.institution.name}</span>
              </div>
            )}
          </CardHeader>
        </div>

        <CardContent className="pb-2">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold">{course.statistics?.enrollments.total || 0}</span>
              </div>
              <div className="text-xs text-muted-foreground">Students</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3 w-3 text-warning" />
                <span className="font-semibold">
                  {course.statistics?.ratings.average.toFixed(1) || "0.0"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-success" />
                <span className="font-semibold">
                  {course.statistics?.progress.average_completion.toFixed(0) || 0}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="h-3 w-3 text-primary" />
                <span className="font-semibold">
                  {course.statistics?.content.modules_count || 0}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Modules</div>
            </div>
          </div>

          {course.statistics?.progress.average_completion ? (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Average Progress</span>
                <span className="text-xs font-medium">
                  {course.statistics.progress.average_completion.toFixed(1)}%
                </span>
              </div>
              <Progress value={course.statistics.progress.average_completion} className="h-2" />
            </div>
          ) : null}
        </CardContent>

        <Separator />

        <CardFooter className="p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 flex-wrap">
              {/* ✅ Publish / Unpublish */}
              <PublishToggleButton stopProp />

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewStudents(course.id);
                }}
              >
                <Users className="h-4 w-4 mr-1" />
                Students
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAnalytics(course.id);
                }}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCourseClick}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Course Page
                </DropdownMenuItem>
                {course.instructor_role.permissions.can_edit_course_content && onEditCourse && (
                  <DropdownMenuItem onClick={() => onEditCourse(course.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Content
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download Reports
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Archive className="h-4 w-4 mr-2" />
                  {course.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <tr className="border-b hover:bg-muted/50">
      {/* Course info */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-secondary flex-shrink-0 overflow-hidden">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-foreground">{course.title}</div>
            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
              {course.short_description || course.description.substring(0, 60)}...
            </div>
            {!course.instructor_role.is_primary && (
              <Badge variant="outline" className="mt-1 text-xs">
                Additional Instructor
              </Badge>
            )}
          </div>
        </div>
      </td>

      {/* Institution */}
      <td className="p-4">
        {course.institution ? (
          <div className="flex items-center gap-2">
            {course.institution.logo_url && (
              <img
                src={course.institution.logo_url}
                alt={course.institution.name}
                className="h-6 w-6 rounded object-cover"
              />
            )}
            <span className="text-sm text-muted-foreground">{course.institution.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>

      {/* Students */}
      <td className="p-4">
        <div className="text-sm font-medium">{course.statistics?.enrollments.total || 0}</div>
      </td>

      {/* Rating */}
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">
            {course.statistics?.ratings.average.toFixed(1) || "0.0"}
          </span>
          <span className="text-xs text-muted-foreground">
            ({course.statistics?.ratings.total_reviews || 0})
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="p-4">
        <Badge className={getStatusColor(course.status)}>{course.status}</Badge>
      </td>

      {/* Actions */}
      <td className="p-4">
        <div className="flex items-center gap-1">
          {/* ✅ Publish / Unpublish */}
          <PublishToggleButton />

          <Button variant="ghost" size="sm" onClick={() => onViewStudents(course.id)} title="View Students">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onViewAnalytics(course.id)} title="View Analytics">
            <BarChart3 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCourseClick}>
                <Eye className="h-4 w-4 mr-2" />
                View Course
              </DropdownMenuItem>
              {course.instructor_role.permissions.can_edit_course_content && onEditCourse && (
                <DropdownMenuItem onClick={() => onEditCourse(course.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Content
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download Reports
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Archive className="h-4 w-4 mr-2" />
                {course.status === "ARCHIVED" ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}