// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  publishCourse,
  unpublishCourse,
} from "@/lib/features/courses/course-slice";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Lock,
  BookOpen,
  Users,
  Star,
  Building2,
  TrendingUp,
  CheckCircle,
  Clock,
  Archive,
  PlayCircle,
  Eye,
  Edit,
  RefreshCw,
  Search,
  Filter,
  Award,
  BarChart2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Shield,
  Key,
} from "lucide-react";

const num = (v: any): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const p = parseFloat(v); return isNaN(p) ? 0 : p; }
  return 0;
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-700",
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-800",
  INTERMEDIATE: "bg-amber-100 text-amber-800",
  ADVANCED: "bg-orange-100 text-orange-800",
  EXPERT: "bg-red-100 text-red-800",
};

function InstitutionCard({
  institution,
  onClick,
  isSelected,
}: {
  institution: any;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer border rounded-xl p-4 transition-all hover:shadow-md ${
        isSelected ? "border-purple-400 bg-purple-50 shadow-sm" : "border-gray-200 bg-white hover:border-purple-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {institution.institution_logo ? (
          <img
            src={institution.institution_logo}
            className="w-10 h-10 rounded-lg object-cover"
            alt={institution.institution_name}
          />
        ) : (
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{institution.institution_name}</p>
          <p className="text-xs text-gray-400">{institution.course_count} courses</p>
        </div>
        {isSelected && <ChevronRight className="w-4 h-4 text-purple-500 flex-shrink-0" />}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-2 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Published</p>
          <p className="text-sm font-bold text-green-700">{institution.published_count}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Enrollments</p>
          <p className="text-sm font-bold text-purple-700">{num(institution.total_enrollments).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function SPOCOverviewPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { pagination } = useAppSelector((state) => state.courses);

  const [overview, setOverview] = useState<any>(null);
  const [institutionBreakdown, setInstitutionBreakdown] = useState<any[]>([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [coursePagination, setCoursePagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");

  const fetchOverview = useCallback(async (page = 1) => {
    setOverviewLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "20");
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);
      if (statusFilter) params.append("status", statusFilter);
      if (selectedInstitution) params.append("institution_id", selectedInstitution);
      if (searchQuery) params.append("search", searchQuery);

      const res = await api.get(`/courses/admin/spoc-overview?${params.toString()}`);
      if (res.data.success) {
        setOverview(res.data.data.overview);
        setInstitutionBreakdown(res.data.data.institution_breakdown || []);
        setEnrollmentTrend(res.data.data.enrollment_trend || []);
        setCourses(res.data.data.courses || []);
        setCoursePagination(res.data.data.pagination);
      }
    } catch (err: any) {
      toast.error("Failed to load SPOC overview");
    } finally {
      setOverviewLoading(false);
    }
  }, [statusFilter, selectedInstitution, searchQuery, sortBy, sortDir]);

  useEffect(() => { fetchOverview(); }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(prev => prev === "ASC" ? "DESC" : "ASC");
    else { setSortBy(field); setSortDir("DESC"); }
  };

  const handlePublish = async (courseId: string) => {
    try {
      await dispatch(publishCourse(courseId)).unwrap();
      toast.success("Course published!"); fetchOverview(coursePagination.page);
    } catch (e: any) { toast.error(e || "Failed"); }
  };

  const handleUnpublish = async (courseId: string) => {
    try {
      await dispatch(unpublishCourse(courseId)).unwrap();
      toast.success("Course unpublished!"); fetchOverview(coursePagination.page);
    } catch (e: any) { toast.error(e || "Failed"); }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortBy === field ? (
      sortDir === "ASC" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : <ChevronDown className="w-3 h-3 opacity-30" />;

  const maxTrend = Math.max(...enrollmentTrend.map(t => t.count), 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">SPOC Overview</h1>
            </div>
            <p className="text-gray-500 text-sm">Small Private Online Courses management across all institutions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchOverview(1)}
              className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => router.push("/dashboard/system-admin/courses/create")}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Lock className="w-4 h-4" />
              Create SPOC
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {overviewLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">Total SPOCs</span>
                <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Lock className="w-4.5 h-4.5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{overview.total.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {overview.published} published
                </span>
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  {overview.draft} draft
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">Institutions</span>
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{overview.institution_count}</p>
              <p className="text-xs text-gray-400 mt-2">With SPOC courses</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">Total Enrollments</span>
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-teal-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{num(overview.total_enrollments).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-2">Across all SPOC courses</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">Avg Rating</span>
                <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Star className="w-4.5 h-4.5 text-yellow-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{overview.avg_rating}</p>
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${s <= Math.round(parseFloat(overview.avg_rating)) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enrollment Trend */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Enrollment Trend (6 months)
              </h3>
            </div>
            <div className="space-y-2">
              {enrollmentTrend.length > 0 ? enrollmentTrend.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {new Date(t.month).toLocaleDateString("en", { month: "short", year: "2-digit" })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-purple-400"
                      style={{ width: `${maxTrend > 0 ? Math.round((t.count / maxTrend) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{t.count}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No enrollment data yet</p>
              )}
            </div>
          </div>

          {/* Institution Rankings */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />
                Top Institutions
              </h3>
              {selectedInstitution && (
                <button
                  onClick={() => { setSelectedInstitution(""); fetchOverview(1); }}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {institutionBreakdown.length > 0 ? institutionBreakdown.map((inst, i) => (
                <div
                  key={inst.institution_id}
                  onClick={() => {
                    setSelectedInstitution(inst.institution_id === selectedInstitution ? "" : inst.institution_id);
                  }}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedInstitution === inst.institution_id ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  {inst.institution_logo ? (
                    <img src={inst.institution_logo} className="w-7 h-7 rounded object-cover" alt="" />
                  ) : (
                    <div className="w-7 h-7 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{inst.institution_name}</p>
                    <p className="text-xs text-gray-400">{inst.course_count} courses · {num(inst.total_enrollments)} enrolled</p>
                  </div>
                  <span className="text-xs font-bold text-purple-600 flex-shrink-0">{inst.published_count} pub</span>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No institutions found</p>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === "Enter" && fetchOverview(1)}
                placeholder="Search SPOC courses or institution name..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <button
              onClick={() => fetchOverview(1)}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg text-sm flex items-center gap-2 transition-colors ${showFilters ? "bg-purple-50 border-purple-300 text-purple-700" : "border-gray-300 hover:bg-gray-50"}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
              <div className="w-40">
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => { setStatusFilter(""); setSearchQuery(""); setSelectedInstitution(""); fetchOverview(1); }}
                  className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <X className="w-3.5 h-3.5" /> Clear All
                </button>
                <button
                  onClick={() => fetchOverview(1)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {selectedInstitution && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Filtering by:</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <Building2 className="w-3 h-3" />
                {institutionBreakdown.find(i => i.institution_id === selectedInstitution)?.institution_name || "Institution"}
                <button onClick={() => { setSelectedInstitution(""); fetchOverview(1); }}>
                  <X className="w-3 h-3 ml-1" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Courses Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              SPOC Courses
              <span className="ml-2 text-sm text-gray-400 font-normal">
                ({coursePagination.total.toLocaleString()} total)
              </span>
            </h3>
          </div>

          {overviewLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent" />
              <p className="mt-3 text-gray-500 text-sm">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No SPOC courses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-64">Course</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-44">Institution</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Level</th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("enrollment_count")}
                    >
                      <div className="flex items-center justify-center gap-1">Enrolled <SortIcon field="enrollment_count" /></div>
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Features</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Lock className="w-4 h-4 text-purple-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {course.instructor ? `${course.instructor.first_name} ${course.instructor.last_name}` : "No instructor"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {course.institution ? (
                          <div className="flex items-center gap-2">
                            {course.institution.logo_url ? (
                              <img src={course.institution.logo_url} className="w-6 h-6 rounded object-cover" alt="" />
                            ) : (
                              <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-3 h-3 text-purple-500" />
                              </div>
                            )}
                            <span className="text-xs text-gray-700 font-medium truncate max-w-[120px]">{course.institution.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[course.status] || "bg-gray-100 text-gray-700"}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-700"}`}>
                          {course.level}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="text-sm">
                          <span className="font-semibold text-gray-800">{num(course.enrollment_count)}</span>
                          {course.max_enrollments && (
                            <span className="text-xs text-gray-400"> / {course.max_enrollments}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {course.requires_approval && (
                            <span title="Requires approval" className="inline-flex items-center px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-xs">
                              <Shield className="w-3 h-3" />
                            </span>
                          )}
                          {course.is_certificate_available && (
                            <span title="Certificate" className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-xs">
                              <Award className="w-3 h-3" />
                            </span>
                          )}
                          {course.is_institution_wide && (
                            <span title="Institution-wide" className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                              <Building2 className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-md"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {course.status === "DRAFT" ? (
                            <button
                              onClick={() => handlePublish(course.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
                              title="Publish"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : course.status === "PUBLISHED" ? (
                            <button
                              onClick={() => handleUnpublish(course.id)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-md"
                              title="Unpublish"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
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
        {coursePagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(coursePagination.page - 1) * coursePagination.limit + 1} –{" "}
              {Math.min(coursePagination.page * coursePagination.limit, coursePagination.total)} of{" "}
              {coursePagination.total.toLocaleString()} courses
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchOverview(coursePagination.page - 1)}
                disabled={coursePagination.page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {[...Array(Math.min(coursePagination.totalPages, 5))].map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => fetchOverview(pg)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${coursePagination.page === pg ? "bg-purple-600 text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => fetchOverview(coursePagination.page + 1)}
                disabled={coursePagination.page === coursePagination.totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}