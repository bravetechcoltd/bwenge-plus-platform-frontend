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
        return "bg-green-100 text-green-800";
      case "DRAFT":
        return "bg-amber-100 text-amber-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCourseTypeColor = (type: string) => {
    switch (type) {
      case "MOOC":
        return "bg-blue-100 text-blue-800";
      case "SPOC":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
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
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
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
                <BookOpen className="h-16 w-16 text-blue-300" />
              </div>
            )}

            <Badge className={`absolute top-3 right-3 ${getStatusColor(course.status)}`}>
              {course.status}
            </Badge>
            <Badge className={`absolute top-3 left-3 ${getCourseTypeColor(course.course_type)}`}>
              {course.course_type}
            </Badge>
            {!course.instructor_role.is_primary && (
              <Badge className="absolute bottom-3 left-3 bg-cyan-100 text-cyan-800">
                Additional Instructor
              </Badge>
            )}
          </div>

          <CardHeader className="pb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2">{course.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">
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
                <span className="text-xs text-gray-500">{course.institution.name}</span>
              </div>
            )}
          </CardHeader>
        </div>

        <CardContent className="pb-2">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-gray-400" />
                <span className="font-semibold">{course.statistics?.enrollments.total || 0}</span>
              </div>
              <div className="text-xs text-gray-500">Students</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3 w-3 text-amber-400" />
                <span className="font-semibold">
                  {course.statistics?.ratings.average.toFixed(1) || "0.0"}
                </span>
              </div>
              <div className="text-xs text-gray-500">Rating</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-green-400" />
                <span className="font-semibold">
                  {course.statistics?.progress.average_completion.toFixed(0) || 0}%
                </span>
              </div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="h-3 w-3 text-blue-400" />
                <span className="font-semibold">
                  {course.statistics?.content.modules_count || 0}
                </span>
              </div>
              <div className="text-xs text-gray-500">Modules</div>
            </div>
          </div>

          {course.statistics?.progress.average_completion ? (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Average Progress</span>
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
                <DropdownMenuItem className="text-red-600">
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
    <tr className="border-b hover:bg-gray-50">
      {/* Course info */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-gray-200 flex-shrink-0 overflow-hidden">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                <BookOpen className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{course.title}</div>
            <div className="text-sm text-gray-500 truncate max-w-[200px]">
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
            <span className="text-sm text-gray-700">{course.institution.name}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">—</span>
        )}
      </td>

      {/* Students */}
      <td className="p-4">
        <div className="text-sm font-medium">{course.statistics?.enrollments.total || 0}</div>
      </td>

      {/* Rating */}
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium">
            {course.statistics?.ratings.average.toFixed(1) || "0.0"}
          </span>
          <span className="text-xs text-gray-500">
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
              <DropdownMenuItem className="text-red-600">
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