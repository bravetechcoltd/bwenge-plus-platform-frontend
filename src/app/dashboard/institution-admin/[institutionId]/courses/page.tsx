"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
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
  };
  created_at: string;
  updated_at: string;
}

export default function InstitutionCoursesPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const institutionId = params.institutionId as string;

  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  useEffect(() => {
    if (institutionId && user?.bwenge_role === "INSTITUTION_ADMIN") {
      fetchInstitutionCourses();
    }
  }, [institutionId, user]);

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
      console.error("Failed to fetch courses:", error);
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
      console.error("Failed to publish course:", error);
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
      console.error("Failed to unpublish course:", error);
      toast.error("Failed to unpublish course");
    }
  };

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

    // Show warning if some selected courses are not draft
    if (draftCourses.length < selectedCourses.length) {
      const publishedCount = selectedCourses.length - draftCourses.length;
      if (!confirm(`${publishedCount} selected course(s) are already published and will be skipped. Continue publishing ${draftCourses.length} draft course(s)?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to publish ${draftCourses.length} course(s)?`)) return;
    }

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
      console.error("Failed to bulk publish courses:", error);
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

    // Show warning if some selected courses are not published
    if (publishedCourses.length < selectedCourses.length) {
      const draftCount = selectedCourses.length - publishedCourses.length;
      if (!confirm(`${draftCount} selected course(s) are drafts and will be skipped. Continue unpublishing ${publishedCourses.length} published course(s)?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to unpublish ${publishedCourses.length} course(s)?`)) return;
    }

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
      console.error("Failed to bulk unpublish courses:", error);
      toast.error("Failed to unpublish courses");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Course deleted successfully!");
        fetchInstitutionCourses();
      } else {
        toast.error(data.message || "Failed to delete course");
      }
    } catch (error) {
      console.error("Failed to delete course:", error);
      toast.error("Failed to delete course");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCourses.length === 0) {
      toast.error("Please select courses to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedCourses.length} courses? This action cannot be undone.`)) return;

    try {
      const promises = selectedCourses.map(courseId =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        toast.success(`${successCount} courses deleted successfully!`);
        setSelectedCourses([]);
        fetchInstitutionCourses();
      } else {
        toast.error("Failed to delete courses");
      }
    } catch (error) {
      console.error("Failed to bulk delete courses:", error);
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
        return "bg-green-100 text-green-800";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCourseTypeIcon = (type: string) => {
    return type === "MOOC" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />;
  };

  if (!user || user.bwenge_role !== "INSTITUTION_ADMIN") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-6">
              You need to be an institution administrator to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Institution Courses</h1>
          <p className="text-gray-600">
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search courses by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-blue-800 font-medium">
              {selectedCourses.length} course(s) selected
            </span>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleBulkPublish}
                disabled={selectedDraftCount === 0}
                className={selectedDraftCount > 0 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"}
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
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"}
                title={selectedPublishedCount === 0 ? "No published courses selected" : `Unpublish ${selectedPublishedCount} published course(s)`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Unpublish {selectedPublishedCount > 0 && `(${selectedPublishedCount})`}
              </Button>
              
              <Button
                size="sm"
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
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
            className="text-blue-600 hover:text-blue-800"
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
                <p className="text-sm text-gray-500">Total Courses</p>
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
                <p className="text-sm text-gray-500">Published</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.status === "PUBLISHED").length}
                </p>
              </div>
              <Globe className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold">
                  {courses.reduce((sum, course) => sum + course.enrollment_count, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">SPOC Courses</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.course_type === "SPOC").length}
                </p>
              </div>
              <Lock className="w-8 h-8 text-orange-500" />
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
                        className="w-4 h-4 text-[#0158B7] border-gray-300 rounded focus:ring-[#0158B7]"
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
                    <TableRow key={course.id} className={selectedCourses.includes(course.id) ? "bg-blue-50/50" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => toggleSelectCourse(course.id)}
                          className="w-4 h-4 text-[#0158B7] border-gray-300 rounded focus:ring-[#0158B7]"
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
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900" title={course.title}>
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
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                          <span className="text-sm">
                            {course.instructor?.first_name} {course.instructor?.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{course.enrollment_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(course.status)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
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
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                Publish Course
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUnpublish(course.id)}>
                                <XCircle className="w-4 h-4 mr-2 text-yellow-600" />
                                Unpublish Course
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(course.id)}
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
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Courses Found
              </h3>
              <p className="text-gray-500 mb-4">
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
    </div>
  );
}