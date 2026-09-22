"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { RequireAccess } from "@/components/auth/require-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Users,
  Calendar,
  Award,
  Clock,
  Globe,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Loader2,
  UserPlus,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DeleteCourseDialog,
  type DeleteMode,
} from "@/components/courses/delete-course-dialog";
import { courseDeletionApi, summariseBulk } from "@/lib/courses/deletion-api";

interface InstitutionCourse {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  course_type: string;
  status: string;
  enrollment_count: number;
  average_rating: number;
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string;
  } | null;
  created_at: string;
  updated_at: string;
}

function InstitutionCoursesPageBody() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const institutionId = params.institutionId as string;

  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // The role test that used to gate this fetch was the same wrong predicate as
  // the guard above it (A-06 #2), so the two administrators finding A-08 names
  // would have reached the page and then watched it stay empty forever.
  // `RequireAccess` has already decided; this only needs the request.
  useEffect(() => {
    if (institutionId && token) {
      fetchInstitutionCourses();
    }
  }, [institutionId, token]);

  const fetchInstitutionCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/institution/${institutionId}/owned`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setCourses(data.data.courses);
        // Clear selection when fetching new data
        setSelectedCourses([]);
      } else {
        toast.error(data.message || "Failed to fetch courses");
      }
    } catch (error) {
      toast.error("Failed to fetch institution courses");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FIXED: Use PATCH for publish/unpublish ====================
  const handlePublish = async (courseId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/publish`,
        {
          method: "PATCH", // Changed from POST to PATCH
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Course published successfully!");
        fetchInstitutionCourses();
      } else {
        toast.error(data.message || "Failed to publish course");
      }
    } catch (error) {
      toast.error("Failed to publish course");
    }
  };

  const handleUnpublish = async (courseId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/unpublish`,
        {
          method: "PATCH", // Changed from POST to PATCH
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Course unpublished successfully!");
        fetchInstitutionCourses();
      } else {
        toast.error(data.message || "Failed to unpublish course");
      }
    } catch (error) {
      toast.error("Failed to unpublish course");
    }
  };

  /**
   * A bulk action waiting to be confirmed.
   *
   * `skipped` is how many of the selection the action does not apply to —
   * drafts in an unpublish, published courses in a publish — which the native
   * confirm explained in a sentence nobody could style, read twice, or copy.
   */
  const [bulkAction, setBulkAction] = useState<
    | { kind: "publish" | "unpublish" | "delete"; count: number; skipped: number; ids: string[] }
    | null
  >(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // ==================== FIXED: Bulk operations with PATCH ====================
  const handleBulkPublish = async () => {
    // Get only draft courses from selection
    const draftCourses = selectedCourses.filter(id => {
      const course = courses.find(c => c.id === id);
      return course?.status === "DRAFT";
    });

    if (draftCourses.length === 0) {
      toast.error("No draft courses selected to publish");
      return;
    }

    const skipped = selectedCourses.length - draftCourses.length;
    setBulkAction({
      kind: "publish",
      count: draftCourses.length,
      skipped,
      ids: draftCourses,
    });
  };

  /** Runs after the confirmation dialog, not before it. */
  const runBulkPublish = async (draftCourses: string[]) => {
    try {
      const promises = draftCourses.map(courseId =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/publish`, {
          method: "PATCH", // Changed from POST to PATCH
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        toast.success(`${successCount} courses published successfully!`);
        // Keep only non-draft courses selected (if any)
        const nonDraftSelected = selectedCourses.filter(id => {
          const course = courses.find(c => c.id === id);
          return course?.status !== "DRAFT";
        });
        setSelectedCourses(nonDraftSelected);
        fetchInstitutionCourses();
      } else {
        toast.error("Failed to publish courses");
      }
    } catch (error) {
      toast.error("Failed to publish courses");
    }
  };

  const handleBulkUnpublish = async () => {
    // Get only published courses from selection
    const publishedCourses = selectedCourses.filter(id => {
      const course = courses.find(c => c.id === id);
      return course?.status === "PUBLISHED";
    });

    if (publishedCourses.length === 0) {
      toast.error("No published courses selected to unpublish");
      return;
    }

    const skipped = selectedCourses.length - publishedCourses.length;
    setBulkAction({
      kind: "unpublish",
      count: publishedCourses.length,
      skipped,
      ids: publishedCourses,
    });
  };

  const runBulkUnpublish = async (publishedCourses: string[]) => {
    try {
      const promises = publishedCourses.map(courseId =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/unpublish`, {
          method: "PATCH", // Changed from POST to PATCH
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        toast.success(`${successCount} courses unpublished successfully!`);
        // Keep only non-published courses selected (if any)
        const nonPublishedSelected = selectedCourses.filter(id => {
          const course = courses.find(c => c.id === id);
          return course?.status !== "PUBLISHED";
        });
        setSelectedCourses(nonPublishedSelected);
        fetchInstitutionCourses();
      } else {
        toast.error("Failed to unpublish courses");
      }
    } catch (error) {
      toast.error("Failed to unpublish courses");
    }
  };

  /*
   * Opens the dialog rather than doing the work.
   *
   * The native confirm this replaced said "this action cannot be undone" over
   * an endpoint that archived the course, so the sentence was false and the
   * administrator had no way to tell. The dialog offers both, and says which
   * is which.
   */
  const handleDelete = (course: { id: string; title: string }) => {
    setDeleteTarget(course);
  };

  const runDelete = async (courseId: string, mode: DeleteMode) => {
    await courseDeletionApi.remove(courseId, mode === "permanent");
    toast.success(
      mode === "permanent" ? "Course permanently deleted" : "Course archived"
    );
    fetchInstitutionCourses();
  };

  const handleBulkDelete = async () => {
    if (selectedCourses.length === 0) {
      toast.error("Please select courses to delete");
      return;
    }

    setBulkAction({
      kind: "delete",
      count: selectedCourses.length,
      skipped: 0,
      ids: [...selectedCourses],
    });
  };

  const runBulkDelete = async (ids: string[], permanent: boolean) => {
    try {
      /*
       * Reported per course rather than as one number.
       *
       * This counted successes and said nothing about the rest, so a
       * selection where two of six were refused still read as a success. A
       * refusal names the course it applies to.
       */
      const results = await Promise.all(
        ids.map(async (courseId) => {
          const title = courses.find((c: any) => c.id === courseId)?.title ?? "a course";
          try {
            await courseDeletionApi.remove(courseId, permanent);
            return { ok: true, title };
          } catch (e) {
            return { ok: false, title, error: e instanceof Error ? e.message : undefined };
          }
        })
      );

      const summary = summariseBulk(results, permanent ? "deleted" : "archived");
      if (summary.succeeded > 0) {
        // react-hot-toast has no `warning`; a partial result is reported as
        // an error so it is not mistaken for a clean run.
        if (summary.failed > 0) toast.error(summary.message);
        else toast.success(summary.message);
        setSelectedCourses([]);
        fetchInstitutionCourses();
      } else {
        toast.error(summary.message);
      }
    } catch (error) {
      toast.error("Failed to delete courses");
    }
  };

  const toggleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(filteredCourses.map(c => c.id));
    }
  };

  const toggleSelectCourse = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Get counts for bulk actions
  const selectedDraftCount = selectedCourses.filter(id => {
    const course = courses.find(c => c.id === id);
    return course?.status === "DRAFT";
  }).length;

  const selectedPublishedCount = selectedCourses.filter(id => {
    const course = courses.find(c => c.id === id);
    return course?.status === "PUBLISHED";
  }).length;

  const filteredCourses = courses.filter(course => {
    // Search filter
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  const getCourseTypeIcon = (type: string) => {
    return type === "MOOC" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Institution Courses</h1>
          <p className="text-muted-foreground">
            Manage all courses created for your institution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInstitutionCourses}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses/assign-instructors`)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Instructors
          </Button>

          <Button
            onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses/create`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-card"
              >
                <option value="all">All Status</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCourses.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-primary font-medium">
              {selectedCourses.length} course(s) selected
            </span>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleBulkPublish}
                disabled={selectedDraftCount === 0}
                className={selectedDraftCount > 0 
                  ? "bg-success hover:bg-success text-white" 
                  : "bg-secondary text-muted-foreground cursor-not-allowed"}
                title={selectedDraftCount === 0 ? "No draft courses selected" : `Publish ${selectedDraftCount} draft course(s)`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Publish {selectedDraftCount > 0 && `(${selectedDraftCount})`}
              </Button>
              
              <Button
                size="sm"
                onClick={handleBulkUnpublish}
                disabled={selectedPublishedCount === 0}
                className={selectedPublishedCount > 0
                  ? "bg-warning hover:bg-yellow-700 text-white"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"}
                title={selectedPublishedCount === 0 ? "No published courses selected" : `Unpublish ${selectedPublishedCount} published course(s)`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Unpublish {selectedPublishedCount > 0 && `(${selectedPublishedCount})`}
              </Button>
              
              <Button
                size="sm"
                onClick={handleBulkDelete}
                className="bg-destructive hover:bg-destructive text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All ({selectedCourses.length})
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCourses([])}
            className="text-primary hover:text-primary"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-[#0158B7]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.status === "PUBLISHED").length}
                </p>
              </div>
              <Globe className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">
                  {courses.reduce((sum, course) => sum + course.enrollment_count, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SPOC Courses</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.course_type === "SPOC").length}
                </p>
              </div>
              <Lock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Institution Courses</CardTitle>
          <CardDescription>
            {filteredCourses.length} courses found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#0158B7]" />
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="overflow-hidden border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedCourses.length === filteredCourses.length && filteredCourses.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-[#0158B7] border-border rounded focus:ring-[#0158B7]"
                      />
                    </TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id} className={selectedCourses.includes(course.id) ? "bg-primary/10/50" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => toggleSelectCourse(course.id)}
                          className="w-4 h-4 text-[#0158B7] border-border rounded focus:ring-[#0158B7]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {course.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground" title={course.title}>
                              {course.title.length > 30
                                ? `${course.title.substring(0, 30)}...`
                                : course.title}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getCourseTypeIcon(course.course_type)}
                          <span className="text-sm">{course.course_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {course.instructor?.profile_picture_url ? (
                            <img
                              src={course.instructor.profile_picture_url}
                              alt={course.instructor.first_name}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                              <Users className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-sm">
                            {course.instructor?.first_name} {course.instructor?.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{course.enrollment_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(course.status)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(course.created_at), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Course
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/institution-admin/courses/${course.id}`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Course
                            </DropdownMenuItem>
                            
                            {course.status === "DRAFT" ? (
                              <DropdownMenuItem onClick={() => handlePublish(course.id)}>
                                <CheckCircle className="w-4 h-4 mr-2 text-success" />
                                Publish Course
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUnpublish(course.id)}>
                                <XCircle className="w-4 h-4 mr-2 text-warning" />
                                Unpublish Course
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete({ id: course.id, title: course.title })}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Courses Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Try a different search term" : "Create your first course for this institution"}
              </p>
              <Button onClick={() => router.push(`/dashboard/institution-admin/${institutionId}/courses/create`)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Course
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
        Confirmations, as dialogs rather than as native `confirm()`.

        The six calls these replaced blocked the browser, could not be styled
        or read twice, and in the delete case stated something that was not
        true of the endpoint behind them.
      */}
      <ConfirmDialog
        open={!!bulkAction && bulkAction.kind !== "delete"}
        onOpenChange={(open) => !open && setBulkAction(null)}
        pending={bulkBusy}
        title={
          bulkAction?.kind === "publish"
            ? `Publish ${bulkAction.count} course${bulkAction.count === 1 ? "" : "s"}?`
            : `Unpublish ${bulkAction?.count ?? 0} course${(bulkAction?.count ?? 0) === 1 ? "" : "s"}?`
        }
        confirmLabel={bulkAction?.kind === "publish" ? "Publish" : "Unpublish"}
        description={
          bulkAction && (
            <span className="space-y-2">
              <span className="block">
                {bulkAction.kind === "publish"
                  ? "They become visible to learners straight away."
                  : "They are hidden from learners. Enrolments and progress are kept."}
              </span>
              {bulkAction.skipped > 0 && (
                <span className="block font-medium text-foreground">
                  {bulkAction.skipped} of the selected course
                  {bulkAction.skipped === 1 ? " is" : "s are"} already{" "}
                  {bulkAction.kind === "publish" ? "published" : "drafts"} and will be left
                  alone.
                </span>
              )}
            </span>
          )
        }
        onConfirm={async () => {
          if (!bulkAction) return;
          setBulkBusy(true);
          try {
            if (bulkAction.kind === "publish") await runBulkPublish(bulkAction.ids);
            else await runBulkUnpublish(bulkAction.ids);
            setBulkAction(null);
          } finally {
            setBulkBusy(false);
          }
        }}
      />

      {/*
        Bulk delete archives rather than destroys.

        Permanent removal of several courses at once, each with its own
        enrolments and issued certificates, is not something to offer behind a
        single confirmation — the per-course dialog states what goes with each
        one, and that is where it belongs.
      */}
      <ConfirmDialog
        open={bulkAction?.kind === "delete"}
        onOpenChange={(open) => !open && setBulkAction(null)}
        destructive
        pending={bulkBusy}
        confirmLabel="Archive them"
        title={`Archive ${bulkAction?.count ?? 0} course${(bulkAction?.count ?? 0) === 1 ? "" : "s"}?`}
        description={
          <span className="space-y-2">
            <span className="block">
              They are hidden from learners and kept in the database, with their enrolments,
              progress and certificates intact.
            </span>
            <span className="block">
              To remove a course and everything attached to it, delete it on its own — that
              dialog lists what would go with it first.
            </span>
          </span>
        }
        onConfirm={async () => {
          if (!bulkAction) return;
          setBulkBusy(true);
          try {
            await runBulkDelete(bulkAction.ids, false);
            setBulkAction(null);
          } finally {
            setBulkBusy(false);
          }
        }}
      />

      <DeleteCourseDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        courseId={deleteTarget?.id ?? null}
        courseTitle={deleteTarget?.title ?? ""}
        onConfirm={async (mode) => {
          if (!deleteTarget) return;
          await runDelete(deleteTarget.id, mode);
        }}
      />
    </div>
  );
}
/**
 * AXM-CONS-001 §8.1 — findings A-02, A-06 #2, A-07, A-08.
 *
 * The guard removed from the body of this page checked the role and nothing
 * else:
 *
 *     if (!user || user.bwenge_role !== "INSTITUTION_ADMIN")
 *
 * which was wrong in both directions at once. It denied a SYSTEM_ADMIN and an
 * administrator recorded only in the institution_members table (A-08), and it
 * never looked at institutionId at all — so an administrator of institution A
 * who opened institution B's URL rendered B's full page shell, header, filters
 * and actions included, with only an empty table and a vanishing toast to
 * explain why (A-07). The backend refused the data; the page never said so.
 *
 * The page body below is unchanged.
 */
export default function InstitutionCoursesPage() {
  const params = useParams();
  const institutionId = params.institutionId as string;

  return (
    <RequireAccess institutionId={institutionId} capability="manage-courses">
      <InstitutionCoursesPageBody />
    </RequireAccess>
  );
}
