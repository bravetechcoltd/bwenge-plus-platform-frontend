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
  BEGINNER: "bg-success/15 text-emerald-800",
  INTERMEDIATE: "bg-warning/15 text-warning",
  ADVANCED: "bg-warning/15 text-warning",
  EXPERT: "bg-destructive/15 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-success/15 text-success",
  DRAFT: "bg-warning/15 text-warning",
  ARCHIVED: "bg-muted text-muted-foreground",
};

// Mini bar chart using divs
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 text-right truncate">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{value}</span>
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
    <div className="min-h-screen bg-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">MOOC Overview</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-13">
              System-wide Massive Open Online Courses management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchOverview(1)}
              className="p-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => router.push("/dashboard/system-admin/courses/create")}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary transition-colors text-sm font-medium shadow-sm"
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
              <div key={i} className="bg-card rounded-xl p-5 shadow-sm border border-border animate-pulse">
                <div className="h-4 bg-secondary rounded w-20 mb-3" />
                <div className="h-8 bg-secondary rounded w-16" />
              </div>
            ))}
          </div>
        ) : overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Total MOOCs</span>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Globe className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{overview.total.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
                  {overview.published} published
                </span>
                <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">
                  {overview.draft} draft
                </span>
              </div>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Total Enrollments</span>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{num(overview.total_enrollments).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Across all MOOC courses</p>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Avg Rating</span>
                <div className="w-9 h-9 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Star className="w-4.5 h-4.5 text-warning" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{overview.avg_rating}</p>
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${s <= Math.round(parseFloat(overview.avg_rating)) ? "text-warning fill-yellow-400" : "text-foreground"}`}
                  />
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Avg Duration</span>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {Math.ceil(num(overview.avg_duration_minutes) / 60)}
                <span className="text-base font-normal text-muted-foreground ml-1">hrs</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">Average course length</p>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Level Distribution */}
          <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Level Distribution
              </h3>
              <span className="text-xs text-muted-foreground">{levelDistribution.reduce((s, l) => s + l.count, 0)} courses</span>
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
                    l.level === "ADVANCED" ? "bg-orange-400" : "bg-destructive"
                  }
                />
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Enrollment Trend */}
          <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Enrollment Trend (6 months)
              </h3>
            </div>
            <div className="space-y-2">
              {enrollmentTrend.length > 0 ? enrollmentTrend.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {new Date(t.month).toLocaleDateString("en", { month: "short", year: "2-digit" })}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${maxTrend > 0 ? Math.round((t.count / maxTrend) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{t.count}</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No enrollment data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Courses */}
        {topCourses.length > 0 && (
          <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-warning" />
              Top MOOC Courses by Enrollment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topCourses.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/dashboard/system-admin/courses/${c.id}`)}
                  className="group cursor-pointer border border-border rounded-lg p-3 hover:border-primary/30 hover:bg-primary/10/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} className="w-8 h-8 rounded object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 bg-primary/15 rounded flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground line-clamp-2 mb-1">{c.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{num(c.enrollment_count).toLocaleString()}</span>
                    <Star className="w-3 h-3 text-warning fill-yellow-400 ml-1" />
                    <span>{num(c.average_rating).toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSearch()}
                placeholder="Search MOOC courses..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-primary"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary text-sm font-medium"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg text-sm flex items-center gap-2 transition-colors ${showFilters ? "bg-primary/10 border-primary/40 text-primary" : "border-border hover:bg-muted/50"}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Level</label>
                <select
                  value={filters.level}
                  onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                  className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted/50"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
                <button
                  onClick={() => fetchOverview(1)}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Courses Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              All MOOC Courses
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                ({num(pagination.total).toLocaleString()} total)
              </span>
            </h3>
          </div>

          {isLoading || overviewLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-muted-foreground text-sm">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No MOOC courses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-72">
                      Course
                    </th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center justify-center gap-1">Status <SortIcon field="status" /></div>
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Level</th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("enrollment_count")}
                    >
                      <div className="flex items-center justify-center gap-1">Enrollments <SortIcon field="enrollment_count" /></div>
                    </th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("average_rating")}
                    >
                      <div className="flex items-center justify-center gap-1">Rating <SortIcon field="average_rating" /></div>
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Lessons</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-primary/10/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {course.instructor ? `${course.instructor.first_name} ${course.instructor.last_name}` : "No instructor"}
                              {course.language && ` • ${course.language}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[course.status] || "bg-muted text-muted-foreground"}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[course.level] || "bg-muted text-muted-foreground"}`}>
                          {course.level}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          <span className="font-semibold text-foreground">{num(course.enrollment_count).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Star className="w-3.5 h-3.5 text-warning fill-yellow-400" />
                          <span className="font-semibold text-foreground">{num(course.average_rating).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <PlayCircle className="w-3.5 h-3.5 text-primary" />
                          <span>{num(course.total_lessons)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
                            title="Edit"
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
                          ) : course.status === "PUBLISHED" ? (
                            <button
                              onClick={() => handleUnpublish(course.id)}
                              className="p-1.5 text-warning hover:bg-warning/10 rounded-md transition-colors"
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
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} –{" "}
              {Math.min(pagination.page * pagination.limit, num(pagination.total))} of{" "}
              {num(pagination.total).toLocaleString()} courses
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchOverview(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => fetchOverview(pg)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${pagination.page === pg ? "bg-primary text-white" : "border border-border hover:bg-muted/50"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => fetchOverview(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
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