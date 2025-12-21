"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  getPublicCoursesForAssignment,
  assignCourseToInstitution,
  getCourseCategories,
  PublicCourseForAssignment,
} from "@/lib/features/courses/course-slice";
import { fetchInstitutions } from "@/lib/features/institutions/institutionSlice";
import {
  BookOpen,
  Search,
  Filter,
  Eye,
  Building2,
  RefreshCw,
  CheckCircle,
  Clock,
  Users,
  Star,
  PlayCircle,
  Globe,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

const parseNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export default function AssignPublicCoursesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    publicCoursesForAssignment,
    publicCoursesPagination,
    isLoadingPublicCourses,
    categories,
  } = useAppSelector((state) => state.courses);
  const { institutions, isLoading: isLoadingInstitutions } = useAppSelector(
    (state) => state.institutions
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<PublicCourseForAssignment | null>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [localFilters, setLocalFilters] = useState({
    course_type: "",
    status: "",
  });

  useEffect(() => {
    dispatch(getCourseCategories({ active_only: true }));
    dispatch(fetchInstitutions({ is_active: true }));
    fetchCourses();
  }, [dispatch]);

  const fetchCourses = (page = 1) => {
    dispatch(
      getPublicCoursesForAssignment({
        page,
        limit: publicCoursesPagination.limit,
        ...localFilters,
        search: searchQuery,
      })
    );
  };

  const handleSearch = () => {
    fetchCourses(1);
  };

  const handleApplyFilters = () => {
    fetchCourses(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({ course_type: "", status: "" });
    setSearchQuery("");
    fetchCourses(1);
  };

  const handleAssignClick = (course: PublicCourseForAssignment) => {
    setSelectedCourse(course);
    setSelectedInstitutionId("");
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedCourse || !selectedInstitutionId) {
      toast.error("Please select an institution");
      return;
    }

    setIsAssigning(true);
    try {
      await dispatch(
        assignCourseToInstitution({
          courseId: selectedCourse.id,
          institutionId: selectedInstitutionId,
        })
      ).unwrap();

      toast.success(
        `Course "${selectedCourse.title}" assigned to institution successfully!`
      );
      setShowAssignModal(false);
      setSelectedCourse(null);
      setSelectedInstitutionId("");
      fetchCourses(publicCoursesPagination.page);
    } catch (error: any) {
      toast.error(error || "Failed to assign course");
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PUBLISHED: "bg-green-100 text-green-700",
      DRAFT: "bg-yellow-100 text-yellow-700",
      ARCHIVED: "bg-gray-100 text-gray-700",
    };
    return styles[status] || styles.DRAFT;
  };

  const getTypeBadge = (type: string) =>
    type === "MOOC"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";

  const selectClass =
    "w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  const selectedInstitution = institutions.find(
    (i) => i.id === selectedInstitutionId
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Assign Public Courses to Institutions
              </h1>
              <p className="text-gray-500 mt-2">
                Select public courses and assign them to institutions. These courses will become institution courses.
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/system-admin/courses")}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              <X className="w-4 h-4" />
              Back to Courses
            </button>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: "Available Public Courses",
              value: publicCoursesPagination.total,
              icon: BookOpen,
              iconClass: "text-blue-600",
              iconBg: "bg-blue-100",
            },
            {
              label: "Published",
              value: publicCoursesForAssignment.filter((c) => c.status === "PUBLISHED").length,
              icon: CheckCircle,
              iconClass: "text-green-600",
              iconBg: "bg-green-100",
            },
            {
              label: "Drafts",
              value: publicCoursesForAssignment.filter((c) => c.status === "DRAFT").length,
              icon: Clock,
              iconClass: "text-yellow-600",
              iconBg: "bg-yellow-100",
            },
            {
              label: "Active Institutions",
              value: institutions.filter((i) => i.is_active).length,
              icon: Building2,
              iconClass: "text-purple-600",
              iconBg: "bg-purple-100",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 ${s.iconBg} rounded-lg flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 ${s.iconClass}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search courses by title, description, or tags..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            <button
              onClick={() => fetchCourses(publicCoursesPagination.page)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Type
                </label>
                <select
                  value={localFilters.course_type}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, course_type: e.target.value })
                  }
                  className={selectClass}
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
                  className={selectClass}
                >
                  <option value="">All Statuses</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
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

        {/* Courses Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoadingPublicCourses ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
              <p className="mt-4 text-gray-500">Loading public courses...</p>
            </div>
          ) : publicCoursesForAssignment.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No public courses available</p>
              <p className="text-gray-400 text-sm mt-2">
                All public courses have been assigned to institutions.
              </p>
              <button
                onClick={() => router.push("/dashboard/system-admin/courses/create")}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create New Course
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-80">
                      Course
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {publicCoursesForAssignment.map((course) => (
                    <tr key={course.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {course.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate" title={course.title}>
                              {course.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span className="inline-flex items-center gap-1">
                                <Globe className="w-3 h-3 text-green-600" />
                                Public Course
                              </span>
                              {course.course_category && (
                                <span>• {course.course_category.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeBadge(
                            course.course_type
                          )}`}
                        >
                          {course.course_type}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(
                            course.status
                          )}`}
                        >
                          {course.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span className="font-medium">
                              {parseNumber(course.enrollment_count)}
                            </span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center gap-1">
                            <PlayCircle className="w-3 h-3 text-green-500" />
                            <span className="font-medium">
                              {parseNumber(course.total_lessons)}
                            </span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className="font-medium">
                              {Math.ceil(parseNumber(course.duration_minutes) / 60)}h
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                          <span className="text-sm font-semibold text-gray-700">
                            {parseNumber(course.average_rating).toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({parseNumber(course.total_reviews)})
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAssignClick(course)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
                        >
                          <Building2 className="w-4 h-4" />
                          Assign to Institution
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {publicCoursesPagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(publicCoursesPagination.page - 1) * publicCoursesPagination.limit + 1} to{" "}
              {Math.min(
                publicCoursesPagination.page * publicCoursesPagination.limit,
                publicCoursesPagination.total
              )}{" "}
              of {publicCoursesPagination.total} courses
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCourses(publicCoursesPagination.page - 1)}
                disabled={publicCoursesPagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(publicCoursesPagination.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchCourses(i + 1)}
                  className={`px-4 py-2 rounded-lg ${
                    publicCoursesPagination.page === i + 1
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => fetchCourses(publicCoursesPagination.page + 1)}
                disabled={publicCoursesPagination.page === publicCoursesPagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Assign Course to Institution</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Course Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Course to Assign</p>
                <div className="flex items-center gap-3">
                  {selectedCourse.thumbnail_url ? (
                    <img
                      src={selectedCourse.thumbnail_url}
                      alt={selectedCourse.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{selectedCourse.title}</p>
                    <p className="text-sm text-gray-500">{selectedCourse.course_type}</p>
                  </div>
                </div>
              </div>

              {/* Institution Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Institution <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedInstitutionId}
                  onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  className={selectClass}
                  disabled={isLoadingInstitutions}
                >
                  <option value="">Choose an institution...</option>
                  {institutions
                    .filter((i) => i.is_active)
                    .map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.type})
                      </option>
                    ))}
                </select>
                {selectedInstitutionId && selectedInstitution && (
                  <p className="text-xs text-gray-500 mt-1">
                    Assigning to: {selectedInstitution.name}
                  </p>
                )}
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    Once assigned, this course will become an institution course and will count toward 
                    the institution's course statistics. The course will no longer appear as a public course.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                disabled={isAssigning}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={!selectedInstitutionId || isAssigning}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Confirm Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}