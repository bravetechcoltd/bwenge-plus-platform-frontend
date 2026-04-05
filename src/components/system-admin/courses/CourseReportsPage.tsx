"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  BookOpen,
  Users,
  Globe,
  Lock,
  CheckCircle,
  Clock,
  Archive,
  Star,
  BarChart2,
  Award,
  Building2,
  Calendar,
  PlayCircle,
  Target,
  Activity,
} from "lucide-react";

const num = (v: any): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const p = parseFloat(v); return isNaN(p) ? 0 : p; }
  return 0;
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-primary/10 text-primary",
    purple: "bg-primary/10 text-primary",
    green: "bg-success/10 text-success",
    yellow: "bg-warning/10 text-warning",
    teal: "bg-primary/10 text-primary",
    red: "bg-destructive/10 text-destructive",
    orange: "bg-warning/10 text-warning",
    gray: "bg-muted/50 text-muted-foreground",
  };

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CourseReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [groupBy, setGroupBy] = useState("month");
  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "enrollments" | "categories">("overview");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate, group_by: groupBy });
      const res = await api.get(`/courses/admin/reports?${params.toString()}`);
      if (res.data.success) setData(res.data.data);
      else toast.error(res.data.message || "Failed to load reports");
    } catch (err: any) {
      toast.error("Failed to load course reports");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => { fetchReports(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate, export: "true" });
      const res = await api.get(`/courses/admin/reports?${params.toString()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `course_reports_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report exported successfully!");
    } catch (err: any) {
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const maxCourseCount = Math.max(...(data?.courses_over_time?.map((t: any) => t.count) || [1]), 1);
  const maxEnrollCount = Math.max(...(data?.enrollments_over_time?.map((t: any) => t.count) || [1]), 1);
  const maxTopEnrollment = Math.max(...(data?.top_courses?.map((c: any) => c.enrollment_count) || [1]), 1);
  const maxCatCount = Math.max(...(data?.category_breakdown?.map((c: any) => c.total_enrollments) || [1]), 1);

  return (
    <div className="min-h-screen bg-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Course Reports</h1>
            </div>
            <p className="text-muted-foreground text-sm">Platform-wide course analytics and performance insights</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReports}
              className="p-2.5 border border-border rounded-lg hover:bg-muted/50"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary text-sm font-medium shadow-sm disabled:opacity-70"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Date Range & Filters */}
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Group By</label>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            <button
              onClick={fetchReports}
              className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary text-sm font-medium"
            >
              Apply
            </button>
            {/* Quick ranges */}
            <div className="flex gap-2 ml-auto">
              {[
                { label: "30d", months: 0, days: 30 },
                { label: "3m", months: 3, days: 0 },
                { label: "6m", months: 6, days: 0 },
                { label: "1yr", months: 12, days: 0 },
              ].map(r => (
                <button
                  key={r.label}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    if (r.months) start.setMonth(start.getMonth() - r.months);
                    else start.setDate(start.getDate() - r.days);
                    setStartDate(start.toISOString().split("T")[0]);
                    setEndDate(end.toISOString().split("T")[0]);
                  }}
                  className="px-3 py-2 border border-border rounded-lg text-xs hover:bg-primary/10 hover:border-teal-300 transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-card rounded-xl p-16 shadow-sm border border-border text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading reports...</p>
          </div>
        ) : data ? (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-1 bg-card rounded-xl shadow-sm border border-border p-1">
              {[
                { id: "overview", label: "Overview", icon: BarChart2 },
                { id: "courses", label: "Courses", icon: BookOpen },
                { id: "enrollments", label: "Enrollments", icon: Users },
                { id: "categories", label: "Categories", icon: Target },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ============ OVERVIEW TAB ============ */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Platform Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Courses" value={data.platform_stats.total_courses} sub={`${data.platform_stats.total_mooc} MOOC + ${data.platform_stats.total_spoc} SPOC`} icon={BookOpen} color="blue" />
                  <StatCard label="Published" value={data.platform_stats.published} sub={`${data.platform_stats.draft} drafts · ${data.platform_stats.archived} archived`} icon={CheckCircle} color="green" />
                  <StatCard label="Total Enrollments" value={data.enrollment_stats.total} sub={`${data.enrollment_stats.completed} completed`} icon={Users} color="purple" />
                  <StatCard label="Institutions" value={data.platform_stats.institutions_with_courses} sub="with active courses" icon={Building2} color="teal" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Avg Rating" value={data.platform_stats.avg_rating} sub="Platform average" icon={Star} color="yellow" />
                  <StatCard label="Total Lessons" value={data.platform_stats.total_lessons} sub="Across all courses" icon={PlayCircle} color="blue" />
                  <StatCard label="Total Hours" value={data.platform_stats.total_duration_hours} sub="Of course content" icon={Clock} color="orange" />
                  <StatCard label="Active Enrollments" value={data.enrollment_stats.active} sub={`${data.enrollment_stats.avg_progress}% avg progress`} icon={Activity} color="green" />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Courses over time */}
                  <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      New Courses Over Time
                    </h3>
                    <div className="space-y-2">
                      {data.courses_over_time.slice(-8).map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 text-right">
                            {new Date(t.period).toLocaleDateString("en", { month: "short", year: "2-digit" })}
                          </span>
                          <div className="flex-1 flex gap-1">
                            <div className="flex-1 bg-muted rounded h-2 relative">
                              <div
                                className="h-2 rounded bg-primary"
                                style={{ width: `${maxCourseCount > 0 ? Math.round((t.mooc_count / maxCourseCount) * 100) : 0}%` }}
                              />
                            </div>
                            <div className="flex-1 bg-muted rounded h-2 relative">
                              <div
                                className="h-2 rounded bg-primary"
                                style={{ width: `${maxCourseCount > 0 ? Math.round((t.spoc_count / maxCourseCount) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground w-6 text-right">{t.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-3 h-1.5 rounded bg-primary inline-block" /> MOOC
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-3 h-1.5 rounded bg-primary inline-block" /> SPOC
                      </span>
                    </div>
                  </div>

                  {/* Enrollments over time */}
                  <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Enrollment Trend
                    </h3>
                    <div className="space-y-2">
                      {data.enrollments_over_time.slice(-8).map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 text-right">
                            {new Date(t.period).toLocaleDateString("en", { month: "short", year: "2-digit" })}
                          </span>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${maxEnrollCount > 0 ? Math.round((t.count / maxEnrollCount) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Level Breakdown */}
                <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Course Level Distribution
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.level_breakdown.map((l: any) => {
                      const colors: Record<string, string> = {
                        BEGINNER: "from-emerald-400 to-emerald-500",
                        INTERMEDIATE: "from-amber-400 to-amber-500",
                        ADVANCED: "from-orange-400 to-orange-500",
                        EXPERT: "from-red-400 to-red-500",
                      };
                      return (
                        <div key={l.level} className={`rounded-xl p-4 bg-gradient-to-br ${colors[l.level] || "from-gray-400 to-gray-500"} text-white`}>
                          <p className="text-xs font-medium opacity-80">{l.level}</p>
                          <p className="text-2xl font-bold mt-1">{l.count}</p>
                          <p className="text-xs opacity-70 mt-1">{num(l.enrollments).toLocaleString()} enrolled</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============ COURSES TAB ============ */}
            {activeTab === "courses" && (
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Top Courses by Enrollment</h3>
                  <span className="text-xs text-muted-foreground">{data.top_courses.length} courses</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-72">Course</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Level</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrollments</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.top_courses.map((course: any, i: number) => (
                        <tr key={course.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-foreground truncate max-w-64">{course.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {course.instructor_name || "N/A"}
                                {course.institution_name && ` · ${course.institution_name}`}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${course.course_type === "MOOC" ? "bg-primary/15 text-primary" : "bg-primary/15 text-primary"}`}>
                              {course.course_type === "MOOC" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              {course.course_type}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              course.status === "PUBLISHED" ? "bg-success/15 text-success" :
                              course.status === "DRAFT" ? "bg-warning/15 text-warning" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {course.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs text-muted-foreground">{course.level}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground w-12 text-right">{num(course.enrollment_count).toLocaleString()}</span>
                              <ProgressBar value={course.enrollment_count} max={maxTopEnrollment} color="bg-teal-400" />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3.5 h-3.5 text-warning fill-yellow-400" />
                              <span className="text-sm font-semibold">{num(course.average_rating).toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium text-muted-foreground">{course.total_lessons}</span> lessons ·{" "}
                              <span className="font-medium text-muted-foreground">{Math.ceil(num(course.duration_minutes) / 60)}</span>h
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============ ENROLLMENTS TAB ============ */}
            {activeTab === "enrollments" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard label="Total Enrollments" value={data.enrollment_stats.total} icon={Users} color="purple" />
                  <StatCard label="Active Enrollments" value={data.enrollment_stats.active} sub={`${Math.round((data.enrollment_stats.active / Math.max(data.enrollment_stats.total, 1)) * 100)}% of total`} icon={Activity} color="green" />
                  <StatCard label="Completed" value={data.enrollment_stats.completed} sub={`${Math.round((data.enrollment_stats.completed / Math.max(data.enrollment_stats.total, 1)) * 100)}% completion rate`} icon={Award} color="teal" />
                  <StatCard label="Dropped" value={data.enrollment_stats.dropped} icon={Archive} color="red" />
                  <StatCard label="Avg Progress" value={`${data.enrollment_stats.avg_progress}%`} icon={Target} color="blue" />
                  <StatCard label="Avg Time Spent" value={`${Math.round(data.enrollment_stats.avg_time_spent_minutes / 60)}h`} sub={`${data.enrollment_stats.avg_time_spent_minutes}m per learner`} icon={Clock} color="orange" />
                </div>

                {/* Enrollment Status Breakdown */}
                <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
                  <h3 className="font-semibold text-foreground mb-4">Enrollment Status Breakdown</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Active", value: data.enrollment_stats.active, color: "bg-success" },
                      { label: "Completed", value: data.enrollment_stats.completed, color: "bg-teal-400" },
                      { label: "Dropped", value: data.enrollment_stats.dropped, color: "bg-destructive" },
                    ].map(s => {
                      const pct = Math.round((s.value / Math.max(data.enrollment_stats.total, 1)) * 100);
                      return (
                        <div key={s.label} className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground w-20">{s.label}</span>
                          <div className="flex-1 bg-muted rounded-full h-3">
                            <div className={`h-3 rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground w-12 text-right">{s.value.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Enrollment trend chart */}
                <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    New Enrollments Over Time
                  </h3>
                  <div className="space-y-2">
                    {data.enrollments_over_time.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {new Date(t.period).toLocaleDateString("en", { month: "short", year: "2-digit", day: groupBy === "day" ? "numeric" : undefined })}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full bg-primary"
                            style={{ width: `${maxEnrollCount > 0 ? Math.round((t.count / maxEnrollCount) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============ CATEGORIES TAB ============ */}
            {activeTab === "categories" && (
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Category Performance</h3>
                </div>
                <div className="p-5 space-y-4">
                  {data.category_breakdown.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No category data available</p>
                  ) : data.category_breakdown.map((cat: any) => (
                    <div key={cat.category_name} className="flex items-center gap-4">
                      <div className="w-36 text-sm text-muted-foreground font-medium truncate">{cat.category_name}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted rounded-full h-3">
                            <div
                              className="h-3 rounded-full bg-teal-400"
                              style={{ width: `${maxCatCount > 0 ? Math.round((cat.total_enrollments / maxCatCount) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right w-32">
                        <p className="text-sm font-bold text-foreground">{num(cat.total_enrollments).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{cat.course_count} courses</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}