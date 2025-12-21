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
  Award,
  MoreVertical,
  Download,
  Globe,
  Building2,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// Helper function to safely parse numbers from API
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
  const { courses, categories, isLoading, pagination, filters, error } = useAppSelector(
    (state) => state.courses
  );
  const { user } = useAppSelector((state) => state.bwengeAuth);

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Local filter states
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
    setLocalFilters({
      course_type: "",
      status: "",
      level: "",
      category_id: "",
    });
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
          case "publish":
            return dispatch(publishCourse(id)).unwrap();
          case "unpublish":
            return dispatch(unpublishCourse(id)).unwrap();
          case "delete":
            return dispatch(deleteCourse(id)).unwrap();
          default:
            return Promise.resolve();
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
    const styles = {
      PUBLISHED: "bg-green-100 text-green-800",
      DRAFT: "bg-yellow-100 text-yellow-800",
      ARCHIVED: "bg-gray-100 text-gray-800",
    };
    return styles[status as keyof typeof styles] || styles.DRAFT;
  };

  const getTypeBadge = (type: string) => {
    return type === "MOOC"
      ? "bg-blue-100 text-blue-800"
      : "bg-purple-100 text-purple-800";
  };

  const getLevelBadge = (level: string) => {
    const styles = {
      BEGINNER: "bg-green-100 text-green-700",
      INTERMEDIATE: "bg-yellow-100 text-yellow-700",
      ADVANCED: "bg-orange-100 text-orange-700",
      EXPERT: "bg-red-100 text-red-700",
    };
    return styles[level as keyof typeof styles] || styles.BEGINNER;
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Courses</h1>
            <p className="text-gray-600 mt-2">
              Manage all courses across the platform
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/system-admin/courses/create")}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Course
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {pagination.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {courses.filter((c) => c.status === "PUBLISHED").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Drafts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {courses.filter((c) => c.status === "DRAFT").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {courses.reduce((sum, c) => sum + parseNumber(c.enrollment_count), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search courses by title, description, or tags..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            <button
              onClick={() => fetchCourses(pagination.page)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Type
                </label>
                <select
                  value={localFilters.course_type}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, course_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="MOOC">MOOC</option>
                  <option value="SPOC">SPOC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={localFilters.status}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  value={localFilters.level}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, level: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={localFilters.category_id}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, category_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4 flex gap-3 justify-end">
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear Filters
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedCourses.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-blue-800 font-medium">
                {selectedCourses.length} course(s) selected
              </span>
              <button
                onClick={() => handleBulkAction("publish")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction("unpublish")}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
              >
                Unpublish
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
            <button
              onClick={() => setSelectedCourses([])}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Courses Table - Compact & Organized */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No courses found</p>
              <button
                onClick={() => router.push("/dashboard/courses/create")}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Course
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedCourses.length === courses.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-80">
                      Course
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                      Type
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                      Status
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                      Level
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">
                      Stats
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                      Rating
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => toggleSelectCourse(course.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                      </td>
                      
                      {/* Course Info - Compact */}
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
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate mb-0.5" title={course.title}>
                              {course.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
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
                      
                      {/* Type Badge */}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getTypeBadge(
                            course.course_type
                          )}`}
                        >
                          {course.course_type}
                        </span>
                      </td>
                      
                      {/* Status Badge */}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(
                            course.status
                          )}`}
                        >
                          {course.status}
                        </span>
                      </td>
                      
                      {/* Level Badge */}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getLevelBadge(
                            course.level
                          )}`}
                        >
                          {course.level}
                        </span>
                      </td>
                      
                      {/* Stats - Horizontal Layout */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-3 text-[11px] text-gray-600">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span className="font-medium">{parseNumber(course.enrollment_count)}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <PlayCircle className="w-3 h-3 text-green-500" />
                            <span className="font-medium">{parseNumber(course.total_lessons)}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-purple-500" />
                            <span className="font-medium">{Math.ceil(parseNumber(course.duration_minutes) / 60)}h</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Rating - Compact */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                          <span className="text-xs font-semibold text-gray-900">
                            {parseNumber(course.average_rating).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            ({parseNumber(course.total_reviews)})
                          </span>
                        </div>
                      </td>
                      
                      {/* Actions - Compact */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View Course"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                            title="Edit Course"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {course.status === "DRAFT" ? (
                            <button
                              onClick={() => handlePublish(course.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                              title="Publish"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpublish(course.id)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
                              title="Unpublish"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleClone(course.id)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                            title="Clone"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, parseNumber(pagination.total))} of{" "}
              {parseNumber(pagination.total)} courses
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCourses(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchCourses(i + 1)}
                  className={`px-4 py-2 rounded-lg ${
                    pagination.page === i + 1
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => fetchCourses(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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