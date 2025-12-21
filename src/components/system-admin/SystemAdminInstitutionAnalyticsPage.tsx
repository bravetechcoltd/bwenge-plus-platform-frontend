// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp, Users, BookOpen, CheckCircle, AlertCircle,
  Calendar, Download, RefreshCw, BarChart3, Activity,
  Eye, Building2, ArrowUpRight, ArrowDownRight,
  GraduationCap, Shield, Target, Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, subDays, subYears } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ═══════════════════════════════════════════
//  COLOUR SYSTEM
// ═══════════════════════════════════════════
const P    = "#5b4e96";   // primary violet
const PD   = "#4a3d85";   // primary dark
const PL   = `${P}14`;    // primary tint bg

// Status / semantic colours — vivid, clearly distinct
const OK   = "#10b981";   // emerald   → active / success
const TEAL = "#06b6d4";   // cyan      → info / members
const BLUE = "#3b82f6";   // blue      → courses / mooc
const AMB  = "#f59e0b";   // amber     → draft / medium / warning
const ORG  = "#f97316";   // orange    → spoc / watching
const WARN = "#ef4444";   // red       → error / high-risk / inactive
const PURP = "#a855f7";   // purple    → NGO / returning

// Ordered chart palette — maximum contrast between adjacent slices
const C = [P, BLUE, OK, AMB, ORG, TEAL, WARN, PURP, "#ec4899", "#84cc16"];

// Institution-type colours — each type has a clear identity
const TYPE_C: Record<string, string> = {
  UNIVERSITY:      BLUE,
  GOVERNMENT:      OK,
  PRIVATE_COMPANY: AMB,
  NGO:             PURP,
};

// ═══════════════════════════════════════════
//  PRIMITIVES
// ═══════════════════════════════════════════
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHead({ title, icon: Icon }: { title: string; icon?: any }) {
  return (
    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4" style={{ color: P }} />}
      <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{title}</h3>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, change, accent = P }: {
  label: string; value: string | number; sub?: string; icon: any; change?: number; accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-[3px] w-full" style={{ backgroundColor: accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
          {change !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full border ${
              change >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-500 mt-1.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MBar({ label, value, display, color = P }: { label: string; value: number; display?: string; color?: string }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-gray-600">{label}</span>
        <span className="text-sm font-black" style={{ color }}>{display ?? `${(value || 0).toFixed(1)}%`}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const TTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-xs">
      {label && <p className="font-bold text-gray-700 mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-800">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const sample = <T,>(arr: T[], max = 20): T[] => {
  if (!arr?.length) return [];
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % step === 0);
};

const fmtN = (n: number) => new Intl.NumberFormat().format(n || 0);
const fmtK = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n || 0);

// ═══════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════
export default function SystemAdminInstitutionAnalyticsPage() {
  const { user } = useAppSelector((s: any) => s.bwengeAuth);

  const [rawAnalytics, setRawAnalytics] = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  // purely client-side filters — no re-fetch
  const [timeRange, setTimeRange]   = useState("30d");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab]   = useState("overview");
  const [selInst, setSelInst]       = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  // ── fetch ONCE (widest window, all types) ─────────────────────────────
  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const start = new Date(0).toISOString();
      const end   = new Date().toISOString();
      const res   = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/institutions/analytics?` +
        `start_date=${start}&end_date=${end}&type=all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRawAnalytics(data.data);
        if (isRefresh) toast.success("Analytics refreshed");
      } else {
        toast.error("Failed to load analytics");
      }
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (user?.id) fetchAnalytics(); }, [user]);

  // ── CLIENT-SIDE derived analytics ────────────────────────────────────
  const analytics = useMemo(() => {
    if (!rawAnalytics) return null;

    // time range → how many tail data-points to keep in trends
    const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 99999 }[timeRange] ?? 30;
    const sliceTrend = (arr: any[]) => (arr || []).slice(-days);

    // type filter → restrict institution lists
    const byType = (arr: any[]) =>
      typeFilter === "all" ? (arr || []) : (arr || []).filter((i: any) => i.type === typeFilter);

    const filteredTop = byType(rawAnalytics.top_institutions);
    const filteredPerf = byType(rawAnalytics.institution_performance);

    // re-derive summary when a type filter is active
    const summary = typeFilter === "all"
      ? rawAnalytics.summary
      : {
          ...rawAnalytics.summary,
          total_institutions:    filteredTop.length,
          active_institutions:   filteredTop.length,
          inactive_institutions: 0,
          total_members:      filteredTop.reduce((s: number, i: any) => s + (i.members || 0), 0),
          total_courses:      filteredTop.reduce((s: number, i: any) => s + (i.courses || 0), 0),
          total_enrollments:  filteredTop.reduce((s: number, i: any) => s + (i.enrollments || 0), 0),
        };

    return {
      ...rawAnalytics,
      summary,
      top_institutions:        filteredTop,
      institution_performance: filteredPerf,
      trends: {
        ...rawAnalytics.trends,
        institutions_over_time: sliceTrend(rawAnalytics.trends?.institutions_over_time),
        members_over_time:      sliceTrend(rawAnalytics.trends?.members_over_time),
        courses_over_time:      sliceTrend(rawAnalytics.trends?.courses_over_time),
        enrollments_over_time:  sliceTrend(rawAnalytics.trends?.enrollments_over_time),
      },
    };
  }, [rawAnalytics, timeRange, typeFilter]);

  // ── export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res   = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/institutions/analytics/export?` +
        `time_range=${timeRange}&type=${typeFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `institutions_${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        toast.success("Exported");
      } else toast.error("Export failed");
    } catch { toast.error("Export failed"); }
  };

  const riskBadge = (r: string) => {
    const cfg: any = {
      high:   { bg: "#fee2e2", c: WARN, label: "High Risk"   },
      medium: { bg: "#fff7ed", c: ORG,  label: "Medium Risk" },
      low:    { bg: "#fefce8", c: AMB,  label: "Low Risk"    },
    };
    const { bg, c, label } = cfg[r] || cfg.low;
    return (
      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
        style={{ backgroundColor: bg, color: c }}>{label}</span>
    );
  };

  // ── loading / empty ───────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50/40">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: `${P}30`, borderTopColor: P }} />
        <p className="text-sm font-bold text-gray-600">Loading analytics…</p>
      </div>
    </div>
  );

  if (!analytics) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50/40">
      <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: PL }}>
          <BarChart3 className="w-7 h-7" style={{ color: P }} />
        </div>
        <p className="text-lg font-black text-gray-800 mb-1">No Analytics Data</p>
        <button onClick={() => fetchAnalytics()}
          className="mt-4 px-5 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-opacity"
          style={{ backgroundColor: P }}>Retry</button>
      </div>
    </div>
  );

  const {
    summary, institutions_by_type, institutions_by_size,
    top_institutions, institution_performance, trends,
    engagement_metrics, content_metrics, member_metrics,
    risk_metrics, comparative_analysis,
  } = analytics;

  const TABS = ["overview", "institutions", "members", "courses", "trends", "risk"] as const;
  const roleLabels = ["Members", "Content Creators", "Instructors", "Admins"];
  const membersByRole = (member_metrics.members_by_role || [])
    .map((r: any, i: number) => ({ role: r.role || roleLabels[i] || `Role ${i + 1}`, count: r.count }))
    .filter((r: any) => r.count > 0);
  const iByType = (institutions_by_type || []).filter((t: any) => t.count > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/20 p-5 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* ══ HEADER ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: P }}>
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-white leading-tight">🏛 Institution Analytics</h1>
                <p className="text-xs text-white/70 mt-0.5">Comprehensive insights across all institutions</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* time range — CLIENT-SIDE, no API call */}
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-36 bg-white/15 border-white/20 text-white text-xs font-bold h-9 hover:bg-white/25 focus:ring-0">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-white/70" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              {/* type filter — CLIENT-SIDE */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44 bg-white/15 border-white/20 text-white text-xs font-bold h-9 hover:bg-white/25 focus:ring-0">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-white/70" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="UNIVERSITY">Universities</SelectItem>
                  <SelectItem value="GOVERNMENT">Government</SelectItem>
                  <SelectItem value="PRIVATE_COMPANY">Private Companies</SelectItem>
                  <SelectItem value="NGO">NGOs</SelectItem>
                </SelectContent>
              </Select>

              <button onClick={() => fetchAnalytics(true)} disabled={refreshing}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 h-9">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "…" : "Refresh"}
              </button>

              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl transition-colors h-9">
                <Download className="w-3.5 h-3.5" />Export
              </button>
            </div>
          </div>

          {/* meta strip */}
          <div className="bg-black/10 px-6 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1">
            {[
              { label: "Institutions", val: fmtN(summary.total_institutions) },
              { label: "Active",       val: String(summary.active_institutions), dot: true },
              { label: "Range",        val: ({ "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "1y": "Last year", "all": "All time" })[timeRange] ?? timeRange },
              { label: "Filter",       val: typeFilter === "all" ? "All Types" : typeFilter.replace("_", " ") },
              { label: "Completion",   val: `${summary.average_completion_rate?.toFixed(1)}%` },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                {i > 0 && <div className="w-px h-4 bg-white/20 hidden md:block" />}
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">{m.label}</p>
                  <div className="flex items-center gap-1.5">
                    {(m as any).dot && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                    <p className="text-xs text-white font-black">{m.val}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ KPI CARDS ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Institutions"
            value={fmtN(summary.total_institutions)}
            sub={`${summary.active_institutions} active · ${summary.inactive_institutions} inactive`}
            icon={Building2} accent={P}
            change={summary.growth_rate > 0 ? summary.growth_rate : undefined} />
          <KpiCard label="Total Members"
            value={fmtK(summary.total_members)}
            sub={`+${fmtN(summary.members_added_this_month)} this month`}
            icon={Users} accent={TEAL} />
          <KpiCard label="Total Courses"
            value={fmtN(summary.total_courses)}
            sub={`+${summary.courses_published_this_month} published`}
            icon={BookOpen} accent={BLUE} />
          <KpiCard label="Total Enrollments"
            value={fmtK(summary.total_enrollments)}
            sub={`Avg completion: ${summary.average_completion_rate?.toFixed(1)}%`}
            icon={GraduationCap} accent={AMB} />
        </div>

        {/* ══ TAB BAR ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap min-w-[80px] ${
                activeTab === tab ? "text-white shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
              style={activeTab === tab ? { backgroundColor: P } : {}}>
              {tab === "risk" ? "⚠ Risk" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ════════════ OVERVIEW ══════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Type donut */}
              <Card>
                <CardHead title="Institutions by Type" icon={Building2} />
                <div className="p-6">
                  {iByType.length > 0 ? (
                    <>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={iByType} cx="50%" cy="50%"
                              innerRadius={52} outerRadius={76}
                              dataKey="count" nameKey="type" paddingAngle={3}>
                              {iByType.map((item: any, i: number) => (
                                <Cell key={i} fill={TYPE_C[item.type] || C[i % C.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<TTip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-3">
                        {iByType.map((item: any, i: number) => {
                          const col = TYPE_C[item.type] || C[i % C.length];
                          return (
                            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col }} />
                                <span className="text-xs font-semibold text-gray-600 truncate">{item.type.replace("_", " ")}</span>
                              </div>
                              <span className="text-sm font-black text-gray-800 ml-2">{item.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-12">No data for selected filter</p>
                  )}
                </div>
              </Card>

              {/* Engagement */}
              <Card>
                <CardHead title="Engagement & Platform Health" icon={Activity} />
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Daily Active",   val: fmtN(engagement_metrics.daily_active_members),   color: OK   },
                      { label: "Weekly Active",  val: fmtN(engagement_metrics.weekly_active_members),  color: TEAL },
                      { label: "Monthly Active", val: fmtN(engagement_metrics.monthly_active_members), color: BLUE },
                    ].map((m, i) => (
                      <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: `${m.color}12` }}>
                        <p className="text-lg font-black" style={{ color: m.color }}>{m.val}</p>
                        <p className="text-xs text-gray-500 font-semibold mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <MBar label="Member Engagement Rate" value={engagement_metrics.member_engagement_rate} color={TEAL} />
                    <MBar label="Course Engagement Rate" value={engagement_metrics.course_engagement_rate} color={BLUE} />
                    <MBar label="Avg Completion Rate"    value={summary.average_completion_rate}           color={OK}   />
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Total time spent</span>
                    <span className="font-black text-gray-700">{engagement_metrics.total_time_spent_hours?.toFixed(1)}h</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Size distribution */}
            <Card>
              <CardHead title="Institution Size Distribution" icon={BarChart3} />
              <div className="p-6">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={institutions_by_size} barSize={44}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="size" tick={{ fontSize: 11, fontWeight: 600, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip content={<TTip />} />
                      <Bar dataKey="count" name="Institutions" radius={[6, 6, 0, 0]}>
                        {(institutions_by_size || []).map((_: any, i: number) => (
                          <Cell key={i} fill={[P, BLUE, TEAL, OK][i % 4]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            {/* Comparatives */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Avg Members / Institution", value: fmtN(comparative_analysis.average_members_per_institution),  icon: Users,        color: TEAL },
                { label: "Avg Courses / Institution",  value: comparative_analysis.average_courses_per_institution,         icon: BookOpen,     color: BLUE },
                { label: "Avg Enrollments / Course",   value: comparative_analysis.average_enrollments_per_course,          icon: GraduationCap,color: AMB  },
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${m.color}14` }}>
                    <m.icon className="w-4 h-4" style={{ color: m.color }} />
                  </div>
                  <p className="text-2xl font-black text-gray-900">{m.value}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Top / bottom performer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparative_analysis.top_performing_institution && (
                <div className="rounded-2xl border p-5" style={{ backgroundColor: `${OK}0d`, borderColor: `${OK}30` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4" style={{ color: OK }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: OK }}>Top Performer</span>
                  </div>
                  <p className="font-black text-gray-900">{comparative_analysis.top_performing_institution.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Score: <span className="font-bold text-gray-700">{comparative_analysis.top_performing_institution.score?.toFixed(0)}</span>
                  </p>
                </div>
              )}
              {comparative_analysis.bottom_performing_institution && (
                <div className="rounded-2xl border p-5" style={{ backgroundColor: `${WARN}0d`, borderColor: `${WARN}30` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" style={{ color: WARN }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: WARN }}>Needs Attention</span>
                  </div>
                  <p className="font-black text-gray-900">{comparative_analysis.bottom_performing_institution.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Score: <span className="font-bold text-gray-700">{comparative_analysis.bottom_performing_institution.score?.toFixed(0)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ INSTITUTIONS ══════════════════════════════════════ */}
        {activeTab === "institutions" && (
          <div className="space-y-5">
            <Card>
              <CardHead title="Top Institutions" icon={Building2} />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Institution", "Type", "Members", "Courses", "Enrollments", "Completion", "Growth", ""].map((h, i) => (
                        <th key={i} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {top_institutions.length === 0
                      ? <tr><td colSpan={8} className="text-center py-8 text-sm text-gray-400">No institutions match this filter</td></tr>
                      : top_institutions.map((inst: any) => (
                        <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {inst.logo_url
                                ? <img src={inst.logo_url} alt={inst.name} className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                                : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: PL }}>
                                    <Building2 className="w-4 h-4" style={{ color: P }} />
                                  </div>
                              }
                              <span className="text-sm font-bold text-gray-800 max-w-[180px] truncate">{inst.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: `${TYPE_C[inst.type] || P}18`, color: TYPE_C[inst.type] || P }}>
                              {inst.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">{fmtN(inst.members)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{inst.courses}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{fmtK(inst.enrollments)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold"
                              style={{ color: inst.completion_rate >= 70 ? OK : inst.completion_rate >= 40 ? AMB : inst.completion_rate > 0 ? ORG : "#9ca3af" }}>
                              {inst.completion_rate?.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold" style={{ color: inst.growth >= 0 ? OK : WARN }}>
                              {inst.growth >= 0 ? "+" : ""}{inst.growth?.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => { setSelInst(inst); setShowDialog(true); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHead title="Completion Rate Breakdown" icon={Target} />
              <div className="p-6 space-y-4">
                {institution_performance.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-4">No data for this filter</p>
                  : institution_performance.map((inst: any) => {
                      const barColor = inst.completion_rate >= 70 ? OK : inst.completion_rate >= 40 ? AMB : inst.completion_rate > 0 ? ORG : "#d1d5db";
                      return (
                        <div key={inst.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700 truncate max-w-[260px]">{inst.name}</span>
                            <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0 ml-3">
                              <span>{inst.members}m · {inst.courses}c</span>
                              <span className="font-black" style={{ color: barColor }}>{inst.completion_rate?.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(inst.completion_rate, 100)}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </Card>
          </div>
        )}

        {/* ════════════ MEMBERS ═══════════════════════════════════════════ */}
        {activeTab === "members" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard label="Active Members"
                value={fmtN(member_metrics.active_members)}
                sub={`${((member_metrics.active_members / Math.max(member_metrics.total_members, 1)) * 100).toFixed(1)}% of total`}
                icon={CheckCircle} accent={OK} />
              <KpiCard label="New This Month"
                value={`+${fmtN(member_metrics.new_members_this_month)}`}
                sub="Added this month"
                icon={Users} accent={TEAL} />
              <KpiCard label="Returning Members"
                value={fmtN(member_metrics.returning_members)}
                sub={`${((member_metrics.returning_members / Math.max(member_metrics.active_members, 1)) * 100).toFixed(1)}% of active`}
                icon={TrendingUp} accent={PURP} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHead title="Members by Role" icon={Shield} />
                <div className="p-6">
                  {membersByRole.length > 0 ? (
                    <>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={membersByRole} cx="50%" cy="50%"
                              innerRadius={45} outerRadius={68}
                              dataKey="count" nameKey="role" paddingAngle={3}>
                              {membersByRole.map((_: any, i: number) => (
                                <Cell key={i} fill={C[i % C.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<TTip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1 mt-3">
                        {membersByRole.map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C[i % C.length] }} />
                              <span className="text-xs font-semibold text-gray-600">{r.role}</span>
                            </div>
                            <span className="text-sm font-black text-gray-800">{fmtN(r.count)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No role data</p>
                  )}
                </div>
              </Card>

              <Card>
                <CardHead title="Members by Institution" icon={Building2} />
                <div className="p-6">
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical"
                        data={member_metrics.members_by_institution.slice(0, 8)} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                        <YAxis type="category" dataKey="institution_name" width={140}
                          tick={{ fontSize: 10, fontWeight: 600, fill: "#6b7280" }}
                          tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + "…" : v} />
                        <Tooltip content={<TTip />} />
                        <Bar dataKey="count" name="Members" radius={[0, 4, 4, 0]}>
                          {member_metrics.members_by_institution.slice(0, 8).map((_: any, i: number) => (
                            <Cell key={i} fill={i === 0 ? P : `${P}${(["cc","99","77","66","55","44","33"])[i-1]||"33"}`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════════════ COURSES ═══════════════════════════════════════════ */}
        {activeTab === "courses" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Published", value: content_metrics.published_courses, color: OK   },
                { label: "Draft",     value: content_metrics.draft_courses,      color: AMB  },
                { label: "MOOC",      value: content_metrics.mooc_courses,       color: BLUE },
                { label: "SPOC",      value: content_metrics.spoc_courses,       color: PURP },
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-md transition-shadow">
                  <div className="h-1 w-10 mx-auto rounded-full mb-4" style={{ backgroundColor: m.color }} />
                  <p className="text-3xl font-black text-gray-900">{m.value}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: m.color }}>{m.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHead title="Course Status" icon={BookOpen} />
                <div className="p-6">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Published", value: content_metrics.published_courses },
                            { name: "Draft",     value: content_metrics.draft_courses     },
                            { name: "Archived",  value: content_metrics.archived_courses  },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                          dataKey="value" paddingAngle={3}>
                          <Cell fill={OK}        />
                          <Cell fill={AMB}       />
                          <Cell fill="#94a3b8"   />
                        </Pie>
                        <Tooltip content={<TTip />} />
                        <Legend iconType="circle" iconSize={9} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHead title="Content Details" icon={Activity} />
                <div className="p-6 space-y-3">
                  {[
                    { label: "Total Lessons",      value: fmtN(content_metrics.total_lessons),                     color: TEAL },
                    { label: "Total Modules",      value: fmtN(content_metrics.total_modules),                     color: BLUE },
                    { label: "Avg Duration (min)", value: content_metrics.average_course_duration?.toFixed(0),     color: AMB  },
                    { label: "With Certificates",  value: fmtN(content_metrics.courses_with_certificates),         color: OK   },
                    { label: "Archived",           value: fmtN(content_metrics.archived_courses),                  color: "#94a3b8" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-500 font-semibold">{m.label}</span>
                      <span className="text-sm font-black" style={{ color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════════════ TRENDS ════════════════════════════════════════════ */}
        {activeTab === "trends" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Daily",   v: trends.growth_rates?.daily   ?? 0 },
                { label: "Weekly",  v: trends.growth_rates?.weekly  ?? 0 },
                { label: "Monthly", v: trends.growth_rates?.monthly ?? 0 },
                { label: "Yearly",  v: trends.growth_rates?.yearly  ?? 0 },
              ].map((g, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{g.label} Growth</p>
                  <p className="text-2xl font-black" style={{ color: g.v >= 0 ? OK : WARN }}>
                    {g.v >= 0 ? "+" : ""}{g.v?.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            <Card>
              <CardHead title="Institution Growth Over Time" icon={TrendingUp} />
              <div className="p-6">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sample(trends.institutions_over_time)}>
                      <defs>
                        <linearGradient id="gTTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={P}    stopOpacity={0.25} />
                          <stop offset="95%" stopColor={P}    stopOpacity={0}    />
                        </linearGradient>
                        <linearGradient id="gTActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={TEAL} stopOpacity={0.2}  />
                          <stop offset="95%" stopColor={TEAL} stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip content={<TTip />} />
                      <Legend iconType="circle" iconSize={8} />
                      <Area type="monotone" dataKey="count"  stroke={P}    fill="url(#gTTotal)"  strokeWidth={2}   name="Total"  />
                      <Area type="monotone" dataKey="active" stroke={TEAL} fill="url(#gTActive)" strokeWidth={1.5} name="Active" />
                      <Area type="monotone" dataKey="new"    stroke={OK}   fill="none"           strokeWidth={1.5} name="New"    strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHead title="Member Growth" icon={Users} />
                <div className="p-6">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sample(trends.members_over_time)}>
                        <defs>
                          <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={TEAL} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={TEAL} stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                        <Tooltip content={<TTip />} />
                        <Area type="monotone" dataKey="count" stroke={TEAL} fill="url(#gMem)" strokeWidth={2.5} name="Members" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHead title="Course Growth" icon={BookOpen} />
                <div className="p-6">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sample(trends.courses_over_time)}>
                        <defs>
                          <linearGradient id="gCrs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={BLUE} stopOpacity={0.22} />
                            <stop offset="95%" stopColor={BLUE} stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                        <Tooltip content={<TTip />} />
                        <Legend iconType="circle" iconSize={8} />
                        <Area type="monotone" dataKey="count" stroke={BLUE} fill="url(#gCrs)" strokeWidth={2}   name="Total" />
                        <Area type="monotone" dataKey="mooc"  stroke={AMB}  fill="none"        strokeWidth={1.5} name="MOOC" />
                        <Area type="monotone" dataKey="spoc"  stroke={PURP} fill="none"        strokeWidth={1.5} name="SPOC" strokeDasharray="4 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <CardHead title="Enrollment Trend" icon={GraduationCap} />
              <div className="p-6">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sample(trends.enrollments_over_time)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip content={<TTip />} />
                      <Line type="monotone" dataKey="count" stroke={AMB} strokeWidth={2.5} dot={false} name="Enrollments" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ════════════ RISK ═══════════════════════════════════════════════ */}
        {activeTab === "risk" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Low Engagement", value: risk_metrics.institutions_with_low_engagement, color: WARN, bg: "#fff1f1", border: "#fecaca" },
                { label: "High Dropout",   value: risk_metrics.institutions_with_high_dropout,   color: ORG,  bg: "#fff7ed", border: "#fdba74" },
                { label: "Low Ratings",    value: risk_metrics.institutions_with_low_ratings,    color: AMB,  bg: "#fffbeb", border: "#fde68a" },
                { label: "Inactive",       value: risk_metrics.inactive_institutions,            color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
              ].map((m, i) => (
                <div key={i} className="rounded-2xl border p-5"
                  style={{ backgroundColor: m.value > 0 ? m.bg : "#f0fdf4", borderColor: m.value > 0 ? m.border : "#bbf7d0" }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-2"
                    style={{ color: m.value > 0 ? m.color : OK }}>{m.label}</p>
                  <p className="text-3xl font-black"
                    style={{ color: m.value > 0 ? m.color : OK }}>{m.value}</p>
                  <p className="text-xs font-semibold mt-1 text-gray-400">institutions</p>
                </div>
              ))}
            </div>

            <Card>
              <CardHead title="At-Risk Institutions" icon={AlertCircle} />
              <div className="p-6 space-y-3">
                {!risk_metrics.at_risk_institutions?.length
                  ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: OK }} />
                      <p className="text-sm font-bold text-gray-600">No at-risk institutions</p>
                    </div>
                  )
                  : risk_metrics.at_risk_institutions.map((inst: any) => (
                    <div key={inst.id}
                      className="flex items-start justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800 text-sm">{inst.name}</p>
                          {riskBadge(inst.risk_level)}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span>{inst.members} members</span>·
                          <span>{inst.courses} courses</span>·
                          <span>{inst.engagement_rate?.toFixed(1)}% engagement</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {inst.risk_factors.map((f: string, i: number) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md font-semibold capitalize"
                              style={{ backgroundColor: PL, color: P }}>{f}</span>
                          ))}
                        </div>
                      </div>
                      <Link href={`/dashboard/system-admin/institutions/${inst.id}`}
                        className="ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors">
                        <Eye className="w-3.5 h-3.5" />Review
                      </Link>
                    </div>
                  ))
                }
              </div>
            </Card>
          </div>
        )}

        {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ backgroundColor: `${P}08`, borderColor: `${P}20` }}>
          <div>
            <h4 className="text-base font-black text-gray-800 mb-1">Platform Summary</h4>
            <p className="text-sm text-gray-500">
              {summary.total_institutions} institutions · {fmtN(summary.total_members)} members · {fmtN(summary.total_courses)} courses
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {summary.active_institutions} active · {summary.average_completion_rate?.toFixed(1)}% avg completion
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Avg Completion", value: `${summary.average_completion_rate?.toFixed(1)}%`, bg: `${OK}12`,   text: OK,   border: `${OK}30`   },
              { label: "Growth Rate",    value: `${summary.growth_rate?.toFixed(1)}%`,              bg: `${TEAL}12`, text: TEAL, border: `${TEAL}30` },
              { label: "Avg Rating",     value: summary.average_rating?.toFixed(1) ?? "—",          bg: `${AMB}12`,  text: AMB,  border: `${AMB}30`  },
            ].map(({ label, value, bg, text, border }) => (
              <div key={label} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold"
                style={{ backgroundColor: bg, color: text, borderColor: border }}>
                {label}: {value}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ══ DETAIL DIALOG ════════════════════════════════════════════════ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Institution Details</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">Performance snapshot</DialogDescription>
          </DialogHeader>
          {selInst && (
            <div className="space-y-5 mt-1">
              <div className="flex items-center gap-4">
                {selInst.logo_url
                  ? <img src={selInst.logo_url} alt={selInst.name} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                  : <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: PL }}>
                      <Building2 className="w-7 h-7" style={{ color: P }} />
                    </div>
                }
                <div>
                  <h3 className="text-base font-black text-gray-900">{selInst.name}</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block"
                    style={{ backgroundColor: PL, color: P }}>
                    {selInst.type?.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Members",     value: fmtN(selInst.members)     },
                  { label: "Courses",     value: selInst.courses            },
                  { label: "Enrollments", value: fmtK(selInst.enrollments) },
                  { label: "Avg Rating",  value: selInst.average_rating?.toFixed(1) ?? "—" },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl p-3.5" style={{ backgroundColor: PL }}>
                    <p className="text-xs text-gray-500 font-semibold mb-0.5">{m.label}</p>
                    <p className="text-xl font-black" style={{ color: P }}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Performance</p>
                <MBar label="Completion Rate" value={selInst.completion_rate ?? 0} />
                <MBar label="Growth"
                  value={Math.min(selInst.growth * 5, 100)}
                  display={`${selInst.growth >= 0 ? "+" : ""}${selInst.growth?.toFixed(1)}%`} />
              </div>

              <p className="text-xs text-gray-400">
                Created: {format(new Date(selInst.created_at), "MMMM d, yyyy")}
              </p>
            </div>
          )}
          <DialogFooter className="mt-2">
            <button onClick={() => setShowDialog(false)}
              className="px-4 py-2 text-sm font-bold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              Close
            </button>
            <Link href={`/dashboard/system-admin/institutions/${selInst?.id}`}
              className="px-4 py-2 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
              style={{ backgroundColor: P }}>
              <Eye className="w-4 h-4" />Full Details
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}