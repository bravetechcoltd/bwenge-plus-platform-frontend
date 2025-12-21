// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  getAllCoursesWithFullInfo,
  getCourseCategories,
  publishCourse,
  unpublishCourse,
} from "@/lib/features/courses/course-slice";
import {
  getMOOCOverview,
} from "@/lib/features/courses/course-slice";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Globe,
  BookOpen,
  Users,
  Star,
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
  Download,
  ChevronUp,
  ChevronDown,
  Award,
  BarChart2,
  ArrowUpRight,
  X,
} from "lucide-react";

// Safe number parser
const num = (v: any): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const p = parseFloat(v); return isNaN(p) ? 0 : p; }
  return 0;
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-800",
  INTERMEDIATE: "bg-amber-100 text-amber-800",
  ADVANCED: "bg-orange-100 text-orange-800",
  EXPERT: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-700",
};

// Mini bar chart using divs
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 text-right truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

export default function MOOCOverviewPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { courses, pagination, isLoading, error } = useAppSelector((state) => state.courses);

  const [overview, setOverview] = useState<any>(null);
  const [levelDistribution, setLevelDistribution] = useState<any[]>([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: "", level: "" });
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
      if (filters.status) params.append("status", filters.status);
      if (filters.level) params.append("level", filters.level);
      if (searchQuery) params.append("search", searchQuery);

      const res = await api.get(`/courses/admin/mooc-overview?${params.toString()}`);
      if (res.data.success) {
        setOverview(res.data.data.overview);
        setLevelDistribution(res.data.data.level_distribution || []);
        setEnrollmentTrend(res.data.data.enrollment_trend || []);
        setTopCourses(res.data.data.top_courses || []);
        // Also set paginated courses
        dispatch({ type: "courses/getAllWithFullInfo/fulfilled", payload: {
          courses: res.data.data.courses,
          pagination: res.data.data.pagination,
          filters_applied: {}
        }});
      }
    } catch (err: any) {
      toast.error("Failed to load MOOC overview");
    } finally {
      setOverviewLoading(false);
    }
  }, [dispatch, filters, searchQuery, sortBy, sortDir]);

  useEffect(() => { fetchOverview(); }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(field);
      setSortDir("DESC");
    }
  };

  const handleSearch = () => fetchOverview(1);

  const handlePublish = async (courseId: string) => {
    try {
      await dispatch(publishCourse(courseId)).unwrap();
      toast.success("Course published!");
      fetchOverview(pagination.page);
    } catch (e: any) { toast.error(e || "Failed to publish"); }
  };

  const handleUnpublish = async (courseId: string) => {
    try {
      await dispatch(unpublishCourse(courseId)).unwrap();
      toast.success("Course unpublished!");
      fetchOverview(pagination.page);
    } catch (e: any) { toast.error(e || "Failed to unpublish"); }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortBy === field ? (
      sortDir === "ASC" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : <ChevronDown className="w-3 h-3 opacity-30" />;

  const maxLevelCount = Math.max(...levelDistribution.map(l => l.count), 1);
  const maxTrend = Math.max(...enrollmentTrend.map(t => t.count), 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">MOOC Overview</h1>
            </div>
            <p className="text-gray-500 text-sm ml-13">
              System-wide Massive Open Online Courses management
            </p>
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
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              Create MOOC
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {overviewLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">Total MOOCs</span>
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Globe className="w-4.5 h-4.5 text-blue-600" />
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
                <span className="text-sm text-gray-500 font-medium">Total Enrollments</span>
                <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{num(overview.total_enrollments).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-2">Across all MOOC courses</p>
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

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">Avg Duration</span>
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5 text-teal-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {Math.ceil(num(overview.avg_duration_minutes) / 60)}
                <span className="text-base font-normal text-gray-500 ml-1">hrs</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">Average course length</p>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Level Distribution */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Level Distribution
              </h3>
              <span className="text-xs text-gray-400">{levelDistribution.reduce((s, l) => s + l.count, 0)} courses</span>
            </div>
            <div className="space-y-3">
              {levelDistribution.length > 0 ? levelDistribution.map(l => (
                <MiniBar
                  key={l.level}
                  label={l.level}
                  value={l.count}
                  max={maxLevelCount}
                  color={
                    l.level === "BEGINNER" ? "bg-emerald-400" :
                    l.level === "INTERMEDIATE" ? "bg-amber-400" :
                    l.level === "ADVANCED" ? "bg-orange-400" : "bg-red-400"
                  }
                />
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
              )}
            </div>
          </div>

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
        </div>

        {/* Top Courses */}
        {topCourses.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              Top MOOC Courses by Enrollment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topCourses.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/dashboard/system-admin/courses/${c.id}`)}
                  className="group cursor-pointer border border-gray-100 rounded-lg p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} className="w-8 h-8 rounded object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{c.title}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    <span>{num(c.enrollment_count).toLocaleString()}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 ml-1" />
                    <span>{num(c.average_rating).toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSearch()}
                placeholder="Search MOOC courses..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg text-sm flex items-center gap-2 transition-colors ${showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 hover:bg-gray-50"}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                <select
                  value={filters.level}
                  onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <button
                  onClick={() => { setFilters({ status: "", level: "" }); setSearchQuery(""); fetchOverview(1); }}
                  className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
                <button
                  onClick={() => fetchOverview(1)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Courses Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              All MOOC Courses
              <span className="ml-2 text-sm text-gray-400 font-normal">
                ({num(pagination.total).toLocaleString()} total)
              </span>
            </h3>
          </div>

          {isLoading || overviewLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-gray-500 text-sm">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No MOOC courses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-72">
                      Course
                    </th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center justify-center gap-1">Status <SortIcon field="status" /></div>
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Level</th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("enrollment_count")}
                    >
                      <div className="flex items-center justify-center gap-1">Enrollments <SortIcon field="enrollment_count" /></div>
                    </th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("average_rating")}
                    >
                      <div className="flex items-center justify-center gap-1">Rating <SortIcon field="average_rating" /></div>
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Lessons</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {course.instructor ? `${course.instructor.first_name} ${course.instructor.last_name}` : "No instructor"}
                              {course.language && ` • ${course.language}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[course.status] || "bg-gray-100 text-gray-700"}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-700"}`}>
                          {course.level}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-semibold text-gray-800">{num(course.enrollment_count).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="font-semibold text-gray-800">{num(course.average_rating).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                          <PlayCircle className="w-3.5 h-3.5 text-teal-500" />
                          <span>{num(course.total_lessons)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-md transition-colors"
                            title="Edit"
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
                          ) : course.status === "PUBLISHED" ? (
                            <button
                              onClick={() => handleUnpublish(course.id)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
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
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} –{" "}
              {Math.min(pagination.page * pagination.limit, num(pagination.total))} of{" "}
              {num(pagination.total).toLocaleString()} courses
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchOverview(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => fetchOverview(pg)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${pagination.page === pg ? "bg-blue-600 text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => fetchOverview(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
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