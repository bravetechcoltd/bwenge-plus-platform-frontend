"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  getAllCoursesWithFullInfo,
  getCourseCategories,
  publishCourse,
  unpublishCourse,
  deleteCourse,
  cloneCourse,
  setFilters,
  clearFilters,
  Course,
} from "@/lib/features/courses/course-slice";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Star,
  PlayCircle,
  Globe,
  Building2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const parseNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export default function AllCoursesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { courses, categories, isLoading, pagination, filters } = useAppSelector(
    (state) => state.courses
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const [localFilters, setLocalFilters] = useState({
    course_type: filters.course_type || "",
    status: filters.status || "",
    level: filters.level || "",
    category_id: filters.category_id || "",
  });

  useEffect(() => {
    dispatch(getCourseCategories({ active_only: true, include_subcategories: false }));
    fetchCourses();
  }, [dispatch]);

  const fetchCourses = (page = 1) => {
    dispatch(
      getAllCoursesWithFullInfo({
        page,
        limit: pagination.limit,
        ...filters,
        search: searchQuery,
      })
    );
  };

  const handleSearch = () => {
    dispatch(setFilters({ search: searchQuery }));
    fetchCourses(1);
  };

  const handleApplyFilters = () => {
    dispatch(setFilters(localFilters));
    fetchCourses(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({ course_type: "", status: "", level: "", category_id: "" });
    setSearchQuery("");
    dispatch(clearFilters());
    fetchCourses(1);
  };

  const handlePublish = async (courseId: string) => {
    try {
      await dispatch(publishCourse(courseId)).unwrap();
      toast.success("Course published successfully!");
      fetchCourses(pagination.page);
    } catch (error: any) {
      toast.error(error || "Failed to publish course");
    }
  };

  const handleUnpublish = async (courseId: string) => {
    try {
      await dispatch(unpublishCourse(courseId)).unwrap();
      toast.success("Course unpublished successfully!");
      fetchCourses(pagination.page);
    } catch (error: any) {
      toast.error(error || "Failed to unpublish course");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      await dispatch(deleteCourse(courseId)).unwrap();
      toast.success("Course deleted successfully!");
      fetchCourses(pagination.page);
    } catch (error: any) {
      toast.error(error || "Failed to delete course");
    }
  };

  const handleClone = async (courseId: string) => {
    try {
      const cloned = await dispatch(cloneCourse(courseId)).unwrap();
      toast.success("Course cloned successfully!");
      router.push(`/dashboard/courses/${cloned.id}/edit`);
    } catch (error: any) {
      toast.error(error || "Failed to clone course");
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCourses.length === 0) {
      toast.error("Please select courses first");
      return;
    }
    if (!confirm(`Are you sure you want to ${action} ${selectedCourses.length} courses?`)) return;
    try {
      const promises = selectedCourses.map((id) => {
        switch (action) {
          case "publish": return dispatch(publishCourse(id)).unwrap();
          case "unpublish": return dispatch(unpublishCourse(id)).unwrap();
          case "delete": return dispatch(deleteCourse(id)).unwrap();
          default: return Promise.resolve();
        }
      });
      await Promise.all(promises);
      toast.success(`${selectedCourses.length} courses ${action}ed successfully!`);
      setSelectedCourses([]);
      fetchCourses(pagination.page);
    } catch (error: any) {
      toast.error(error || `Failed to ${action} courses`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PUBLISHED: "bg-success/10 text-success",
      DRAFT: "bg-warning/10 text-warning-foreground",
      ARCHIVED: "bg-muted text-muted-foreground",
    };
    return styles[status] || styles.DRAFT;
  };

  const getTypeBadge = (type: string) =>
    type === "MOOC"
      ? "bg-primary/10 text-primary"
      : "bg-primary/20 text-primary";

  const getLevelBadge = (level: string) => {
    const styles: Record<string, string> = {
      BEGINNER: "bg-success/10 text-success",
      INTERMEDIATE: "bg-warning/10 text-warning-foreground",
      ADVANCED: "bg-warning/20 text-warning-foreground",
      EXPERT: "bg-destructive/10 text-destructive",
    };
    return styles[level] || styles.BEGINNER;
  };

  const toggleSelectCourse = (id: string) => {
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map((c) => c.id));
    }
  };

  const selectClass = "w-full px-4 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none";

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Courses</h1>
            <p className="text-muted-foreground mt-2">Manage all courses across the platform</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/system-admin/courses/create")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Course
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: "Total Courses",
              value: pagination.total,
              icon: BookOpen,
              iconClass: "text-primary",
              iconBg: "bg-primary/10",
            },
            {
              label: "Published",
              value: courses.filter((c) => c.status === "PUBLISHED").length,
              icon: CheckCircle,
              iconClass: "text-success",
              iconBg: "bg-success/10",
            },
            {
              label: "Drafts",
              value: courses.filter((c) => c.status === "DRAFT").length,
              icon: Clock,
              iconClass: "text-warning-foreground",
              iconBg: "bg-warning/10",
            },
            {
              label: "Total Enrollments",
              value: courses.reduce((sum, c) => sum + parseNumber(c.enrollment_count), 0),
              icon: Users,
              iconClass: "text-primary",
              iconBg: "bg-primary/10",
            },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 ${s.iconBg} rounded-lg flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 ${s.iconClass}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search courses by title, description, or tags..."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-foreground"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            <button
              onClick={() => fetchCourses(pagination.page)}
              className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Course Type</label>
                <select
                  value={localFilters.course_type}
                  onChange={(e) => setLocalFilters({ ...localFilters, course_type: e.target.value })}
                  className={selectClass}
                >
                  <option value="">All Types</option>
                  <option value="MOOC">MOOC</option>
                  <option value="SPOC">SPOC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={localFilters.status}
                  onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
                  className={selectClass}
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Level</label>
                <select
                  value={localFilters.level}
                  onChange={(e) => setLocalFilters({ ...localFilters, level: e.target.value })}
                  className={selectClass}
                >
                  <option value="">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={localFilters.category_id}
                  onChange={(e) => setLocalFilters({ ...localFilters, category_id: e.target.value })}
                  className={selectClass}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4 flex gap-3 justify-end">
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 border border-border rounded-lg hover:bg-muted text-foreground"
                >
                  Clear Filters
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedCourses.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-primary font-medium">{selectedCourses.length} course(s) selected</span>
              <button
                onClick={() => handleBulkAction("publish")}
                className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 text-sm"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction("unpublish")}
                className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 text-sm"
              >
                Unpublish
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-sm"
              >
                Delete
              </button>
            </div>
            <button
              onClick={() => setSelectedCourses([])}
              className="text-primary hover:text-primary/80"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Courses Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
              <p className="mt-4 text-muted-foreground">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No courses found</p>
              <button
                onClick={() => router.push("/dashboard/courses/create")}
                className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create Your First Course
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedCourses.length === courses.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-primary border-border rounded"
                      />
                    </th>
                    {["Course", "Type", "Status", "Level", "Stats", "Rating", "Actions"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${i === 0 ? "text-left w-80" : "text-center"} ${h === "Actions" ? "w-40" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => toggleSelectCourse(course.id)}
                          className="w-4 h-4 accent-primary border-border rounded"
                        />
                      </td>

                      {/* Course Info */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {course.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              loading="lazy"
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate mb-0.5" title={course.title}>
                              {course.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {course.course_type === "SPOC" && course.institution ? (
                                <span className="inline-flex items-center gap-1 truncate">
                                  <Building2 className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{course.institution.name}</span>
                                </span>
                              ) : course.course_type === "MOOC" && course.is_public ? (
                                <span className="inline-flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  Public
                                </span>
                              ) : null}
                              {course.course_category && (
                                <span className="truncate">• {course.course_category.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getTypeBadge(course.course_type)}`}>
                          {course.course_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(course.status)}`}>
                          {course.status}
                        </span>
                      </td>

                      {/* Level */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getLevelBadge(course.level)}`}>
                          {course.level}
                        </span>
                      </td>

                      {/* Stats */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Users className="w-3 h-3 text-primary" />
                            <span className="font-medium">{parseNumber(course.enrollment_count)}</span>
                          </div>
                          <span className="text-border">•</span>
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <PlayCircle className="w-3 h-3 text-success" />
                            <span className="font-medium">{parseNumber(course.total_lessons)}</span>
                          </div>
                          <span className="text-border">•</span>
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-primary" />
                            <span className="font-medium">{Math.ceil(parseNumber(course.duration_minutes) / 60)}h</span>
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 text-warning fill-current" />
                          <span className="text-xs font-semibold text-foreground">
                            {parseNumber(course.average_rating).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({parseNumber(course.total_reviews)})
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="View Course"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                            title="Edit Course"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {course.status === "DRAFT" ? (
                            <button
                              onClick={() => handlePublish(course.id)}
                              className="p-1.5 text-success hover:bg-success/10 rounded-md transition-colors"
                              title="Publish"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpublish(course.id)}
                              className="p-1.5 text-warning-foreground hover:bg-warning/10 rounded-md transition-colors"
                              title="Unpublish"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleClone(course.id)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Clone"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, parseNumber(pagination.total))} of{" "}
              {parseNumber(pagination.total)} courses
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCourses(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchCourses(i + 1)}
                  className={`px-4 py-2 rounded-lg ${
                    pagination.page === i + 1
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => fetchCourses(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
