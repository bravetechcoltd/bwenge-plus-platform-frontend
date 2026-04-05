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
  PUBLISHED: "bg-success/15 text-success",
  DRAFT: "bg-warning/15 text-warning",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-success/15 text-emerald-800",
  INTERMEDIATE: "bg-warning/15 text-warning",
  ADVANCED: "bg-warning/15 text-warning",
  EXPERT: "bg-destructive/15 text-destructive",
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
        isSelected ? "border-primary/50 bg-primary/10 shadow-sm" : "border-border bg-card hover:border-primary/30"
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
          <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{institution.institution_name}</p>
          <p className="text-xs text-muted-foreground">{institution.course_count} courses</p>
        </div>
        {isSelected && <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card rounded-lg p-2 border border-border text-center">
          <p className="text-xs text-muted-foreground">Published</p>
          <p className="text-sm font-bold text-success">{institution.published_count}</p>
        </div>
        <div className="bg-card rounded-lg p-2 border border-border text-center">
          <p className="text-xs text-muted-foreground">Enrollments</p>
          <p className="text-sm font-bold text-primary">{num(institution.total_enrollments).toLocaleString()}</p>
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
    <div className="min-h-screen bg-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">SPOC Overview</h1>
            </div>
            <p className="text-muted-foreground text-sm">Small Private Online Courses management across all institutions</p>
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
              <Lock className="w-4 h-4" />
              Create SPOC
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {overviewLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-5 shadow-sm border border-border animate-pulse">
                <div className="h-4 bg-secondary rounded w-24 mb-3" />
                <div className="h-8 bg-secondary rounded w-16" />
              </div>
            ))}
          </div>
        ) : overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Total SPOCs</span>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Lock className="w-4.5 h-4.5 text-primary" />
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
                <span className="text-sm text-muted-foreground font-medium">Institutions</span>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{overview.institution_count}</p>
              <p className="text-xs text-muted-foreground mt-2">With SPOC courses</p>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Total Enrollments</span>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{num(overview.total_enrollments).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Across all SPOC courses</p>
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
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Institution Rankings */}
          <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-warning" />
                Top Institutions
              </h3>
              {selectedInstitution && (
                <button
                  onClick={() => { setSelectedInstitution(""); fetchOverview(1); }}
                  className="text-xs text-muted-foreground hover:text-muted-foreground flex items-center gap-1"
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
                    selectedInstitution === inst.institution_id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  {inst.institution_logo ? (
                    <img src={inst.institution_logo} className="w-7 h-7 rounded object-cover" alt="" />
                  ) : (
                    <div className="w-7 h-7 bg-primary/15 rounded flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{inst.institution_name}</p>
                    <p className="text-xs text-muted-foreground">{inst.course_count} courses · {num(inst.total_enrollments)} enrolled</p>
                  </div>
                  <span className="text-xs font-bold text-primary flex-shrink-0">{inst.published_count} pub</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No institutions found</p>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === "Enter" && fetchOverview(1)}
                placeholder="Search SPOC courses or institution name..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-primary/50"
              />
            </div>
            <button
              onClick={() => fetchOverview(1)}
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
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3">
              <div className="w-40">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
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
                  className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted/50"
                >
                  <X className="w-3.5 h-3.5" /> Clear All
                </button>
                <button
                  onClick={() => fetchOverview(1)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {selectedInstitution && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtering by:</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/15 text-primary rounded-full text-xs font-medium">
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
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              SPOC Courses
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                ({coursePagination.total.toLocaleString()} total)
              </span>
            </h3>
          </div>

          {overviewLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary/40 border-t-transparent" />
              <p className="mt-3 text-muted-foreground text-sm">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No SPOC courses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-64">Course</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-44">Institution</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Level</th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("enrollment_count")}
                    >
                      <div className="flex items-center justify-center gap-1">Enrolled <SortIcon field="enrollment_count" /></div>
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Features</th>
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
                              <Lock className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
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
                              <div className="w-6 h-6 bg-primary/15 rounded flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px]">{course.institution.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[course.status] || "bg-muted text-muted-foreground"}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[course.level] || "bg-muted text-muted-foreground"}`}>
                          {course.level}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="text-sm">
                          <span className="font-semibold text-foreground">{num(course.enrollment_count)}</span>
                          {course.max_enrollments && (
                            <span className="text-xs text-muted-foreground"> / {course.max_enrollments}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {course.requires_approval && (
                            <span title="Requires approval" className="inline-flex items-center px-1.5 py-0.5 bg-warning/15 text-warning rounded text-xs">
                              <Shield className="w-3 h-3" />
                            </span>
                          )}
                          {course.is_certificate_available && (
                            <span title="Certificate" className="inline-flex items-center px-1.5 py-0.5 bg-warning/15 text-warning rounded text-xs">
                              <Award className="w-3 h-3" />
                            </span>
                          )}
                          {course.is_institution_wide && (
                            <span title="Institution-wide" className="inline-flex items-center px-1.5 py-0.5 bg-primary/15 text-primary rounded text-xs">
                              <Building2 className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-md"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/system-admin/courses/${course.id}`)}
                            className="p-1.5 text-muted-foreground hover:bg-muted/50 rounded-md"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {course.status === "DRAFT" ? (
                            <button
                              onClick={() => handlePublish(course.id)}
                              className="p-1.5 text-success hover:bg-success/10 rounded-md"
                              title="Publish"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : course.status === "PUBLISHED" ? (
                            <button
                              onClick={() => handleUnpublish(course.id)}
                              className="p-1.5 text-warning hover:bg-warning/10 rounded-md"
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
            <p className="text-sm text-muted-foreground">
              Showing {(coursePagination.page - 1) * coursePagination.limit + 1} –{" "}
              {Math.min(coursePagination.page * coursePagination.limit, coursePagination.total)} of{" "}
              {coursePagination.total.toLocaleString()} courses
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchOverview(coursePagination.page - 1)}
                disabled={coursePagination.page === 1}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {[...Array(Math.min(coursePagination.totalPages, 5))].map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => fetchOverview(pg)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${coursePagination.page === pg ? "bg-primary text-white" : "border border-border hover:bg-muted/50"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => fetchOverview(coursePagination.page + 1)}
                disabled={coursePagination.page === coursePagination.totalPages}
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