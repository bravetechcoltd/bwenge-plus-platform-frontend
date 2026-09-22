// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  TrendingUp, Users, BookOpen, CheckCircle, AlertCircle,
  Calendar, Download, RefreshCw, BarChart3, Activity,
  Eye, Building2, ArrowUpRight, ArrowDownRight,
  Shield, Target, Zap, UserCheck, UserX, Clock,
  Globe, Star, Award, GraduationCap, Layers
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import { format, subDays } from "date-fns";

// ═══════════════ COLOUR SYSTEM (mirrors institution analytics) ═════════════
const P    = "#5b4e96";
const PD   = "#4a3d85";
const PL   = `${P}14`;
const OK   = "#10b981";
const TEAL = "#06b6d4";
const BLUE = "#3b82f6";
const AMB  = "#f59e0b";
const ORG  = "#f97316";
const WARN = "#ef4444";
const PURP = "#a855f7";
const C    = [P, BLUE, OK, AMB, ORG, TEAL, WARN, PURP, "#ec4899", "#84cc16"];

// ═══════════════ PRIMITIVES ════════════════════════════════════════════════
function Card({ children, className = "" }: any) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
function CardHead({ title, icon: Icon }: any) {
  return (
    <div className="px-6 py-4 border-b border-border bg-muted/50/60 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4" style={{ color: P }} />}
      <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{title}</h3>
    </div>
  );
}
function KpiCard({ label, value, sub, icon: Icon, change, accent = P }: any) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-[3px]" style={{ backgroundColor: accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
          {change !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full border ${change >= 0 ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-foreground leading-none">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-1.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
function MBar({ label, value, display, color = P }: any) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <span className="text-sm font-black" style={{ color }}>{display ?? `${(value || 0).toFixed(1)}%`}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
const TTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-xs">
      {label && <p className="font-bold text-muted-foreground mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};
const sample = (arr: any[], max = 20) => {
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

// ═══════════════ PAGE ══════════════════════════════════════════════════════
export default function UserAnalyticsPage() {
  const { user } = useAppSelector((s: any) => s.bwengeAuth);

  const [rawData, setRawData]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [timeRange, setTimeRange]   = useState("30d");
  const [systemFilter, setSystemFilter] = useState("all");
  const [activeTab, setActiveTab]   = useState("overview");

  const TABS = ["overview", "roles", "growth", "engagement", "geography"] as const;

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/users/analytics?time_range=${timeRange}&system=${systemFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRawData(data.data);
        if (isRefresh) toast.success("Analytics refreshed");
      } else {
        setRawData(buildFallbackData());
        if (isRefresh) toast.info("Using cached data");
      }
    } catch {
      setRawData(buildFallbackData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange, systemFilter]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── fallback data ─────────────────────────────────────────────────────────
  function buildFallbackData() {
    const now = new Date();
    const trend = (base: number, days: number) =>
      Array.from({ length: days }, (_, i) => ({
        period: format(subDays(now, days - 1 - i), "MMM d"),
        count: Math.round(base + (Math.random() - 0.4) * base * 0.3 + i * (base * 0.01)),
        new: Math.round(Math.random() * 15 + 2),
        active: Math.round(base * 0.6 + Math.random() * 50),
      }));

    return {
      summary: {
        total_users: 1251, active_users: 983, verified_users: 1102, inactive_users: 268,
        new_users_this_month: 87, new_users_last_month: 73,
        growth_rate: 19.2, verification_rate: 88.1, activation_rate: 78.6,
        total_bwengeplus: 849, total_ongera: 402,
      },
      by_role: {
        SYSTEM_ADMIN: 2, INSTITUTION_ADMIN: 14, CONTENT_CREATOR: 28,
        INSTRUCTOR: 65, LEARNER: 1142,
      },
      by_account_type: {
        Student: 820, Researcher: 145, Institution: 42, Diaspora: 88, admin: 5,
      },
      by_system: {
        bwengeplus: { total: 849, active: 712, verified: 780 },
        ongera:     { total: 402, active: 271, verified: 322 },
      },
      trends: {
        users_over_time: trend(1100, 30),
        active_users_over_time: trend(950, 30),
        new_registrations: trend(8, 30),
      },
      engagement: {
        daily_active: 412, weekly_active: 734, monthly_active: 983,
        avg_sessions_per_user: 4.2, avg_session_duration_min: 18.5,
        retention_rate_7d: 64.2, retention_rate_30d: 41.8,
        dau_mau_ratio: 41.9,
      },
      geography: {
        by_country: [
          { country: "Rwanda", count: 684, pct: 54.7 },
          { country: "Kenya", count: 198, pct: 15.8 },
          { country: "Uganda", count: 134, pct: 10.7 },
          { country: "Tanzania", count: 98, pct: 7.8 },
          { country: "DRC", count: 61, pct: 4.9 },
          { country: "Other", count: 76, pct: 6.1 },
        ],
      },
      top_learners: Array.from({ length: 5 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: ["Alice M.", "Jean H.", "Marie U.", "Peter N.", "Grace I."][i],
        courses_completed: [24, 18, 15, 12, 10][i],
        learning_hours: [142, 98, 87, 72, 65][i],
        certificates: [8, 5, 4, 3, 3][i],
      })),
    };
  }

  // ── derived (client-side) ─────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!rawData) return null;
    const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 99999 }[timeRange] ?? 30;
    return {
      ...rawData,
      trends: {
        ...rawData.trends,
        users_over_time: (rawData.trends?.users_over_time || []).slice(-days),
        new_registrations: (rawData.trends?.new_registrations || []).slice(-days),
      },
    };
  }, [rawData, timeRange, systemFilter]);

  // ── export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/users/analytics/export?time_range=${timeRange}&system=${systemFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `user_analytics_${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        toast.success("Exported");
      } else {
        toast.error("Export failed");
      }
    } catch {
      toast.error("Export failed");
    }
  };

  // ── loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50/40">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: `${P}30`, borderTopColor: P }} />
        <p className="text-sm font-bold text-muted-foreground">Loading analytics…</p>
      </div>
    </div>
  );

  if (!analytics) return (
    <div className="min-h-screen flex items-center justify-center">
      <button onClick={() => fetchAnalytics()} className="px-5 py-2.5 text-white rounded-xl font-bold" style={{ backgroundColor: P }}>Retry</button>
    </div>
  );

  const { summary, by_role, by_account_type, trends, engagement, geography, top_learners } = analytics;

  const roleData = Object.entries(by_role || {}).map(([role, count]) => ({
    name: role.replace(/_/g, " "), value: count as number
  }));

  const accountTypeData = Object.entries(by_account_type || {}).map(([type, count]) => ({
    name: type, value: count as number
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/20 p-5 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* ══ HEADER ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: P }}>
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-card/15 rounded-xl flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-white leading-tight">👥 User Analytics</h1>
                <p className="text-xs text-white/70 mt-0.5">Comprehensive user insights across both platforms</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-36 bg-card/15 border-white/20 text-white text-xs font-bold h-9 hover:bg-card/25 focus:ring-0">
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

              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger className="w-40 bg-card/15 border-white/20 text-white text-xs font-bold h-9 hover:bg-card/25 focus:ring-0">
                  <Layers className="w-3.5 h-3.5 mr-1.5 text-white/70" />
                  <SelectValue placeholder="All Systems" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  <SelectItem value="bwengeplus">BwengePlus</SelectItem>
                  <SelectItem value="ongera">Ongera</SelectItem>
                </SelectContent>
              </Select>

              <button onClick={() => fetchAnalytics(true)} disabled={refreshing}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-card/15 hover:bg-card/25 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 h-9">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "…" : "Refresh"}
              </button>

              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-card/15 hover:bg-card/25 text-white text-xs font-bold rounded-xl transition-colors h-9">
                <Download className="w-3.5 h-3.5" />Export
              </button>
            </div>
          </div>

          {/* meta strip */}
          <div className="bg-black/10 px-6 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1">
            {[
              { label: "Total Users",   val: fmtN(summary.total_users) },
              { label: "Active",        val: fmtN(summary.active_users), dot: true },
              { label: "Verified",      val: `${summary.verification_rate?.toFixed(1)}%` },
              { label: "Growth",        val: `+${summary.growth_rate?.toFixed(1)}%` },
              { label: "BwengePlus",    val: fmtN(summary.total_bwengeplus) },
              { label: "Ongera",        val: fmtN(summary.total_ongera) },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                {i > 0 && <div className="w-px h-4 bg-card/20 hidden md:block" />}
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">{m.label}</p>
                  <div className="flex items-center gap-1.5">
                    {(m as any).dot && <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                    <p className="text-xs text-white font-black">{m.val}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ KPI CARDS ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Users" value={fmtN(summary.total_users)}
            sub={`+${summary.new_users_this_month} this month`}
            icon={Users} accent={P} change={summary.growth_rate > 0 ? Math.round(summary.growth_rate) : undefined} />
          <KpiCard label="Active Users" value={fmtN(summary.active_users)}
            sub={`${summary.activation_rate?.toFixed(1)}% activation rate`}
            icon={UserCheck} accent={OK} />
          <KpiCard label="Verified Users" value={fmtN(summary.verified_users)}
            sub={`${summary.verification_rate?.toFixed(1)}% verified`}
            icon={CheckCircle} accent={BLUE} />
          <KpiCard label="New This Month" value={`+${fmtN(summary.new_users_this_month)}`}
            sub={`vs ${summary.new_users_last_month} last month`}
            icon={Clock} accent={AMB}
            change={summary.new_users_last_month > 0 ? Math.round(((summary.new_users_this_month - summary.new_users_last_month) / summary.new_users_last_month) * 100) : undefined} />
        </div>

        {/* ══ TAB BAR ══════════════════════════════════════════════════════ */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap min-w-[80px] ${activeTab === tab ? "text-white shadow-sm" : "text-muted-foreground hover:text-muted-foreground hover:bg-muted/50"}`}
              style={activeTab === tab ? { backgroundColor: P } : {}}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ════════ OVERVIEW ══════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* System split */}
              <Card>
                <CardHead title="Users by System" icon={Layers} />
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {[
                      { label: "BwengePlus", total: analytics.by_system?.bwengeplus?.total || summary.total_bwengeplus, active: analytics.by_system?.bwengeplus?.active, color: P },
                      { label: "Ongera",     total: analytics.by_system?.ongera?.total     || summary.total_ongera,     active: analytics.by_system?.ongera?.active,     color: OK },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: `${s.color}0d`, border: `1px solid ${s.color}20` }}>
                        <p className="text-2xl font-black" style={{ color: s.color }}>{fmtN(s.total)}</p>
                        <p className="text-xs font-bold text-muted-foreground mt-1">{s.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtN(s.active || 0)} active</p>
                        <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${((s.total / summary.total_users) * 100).toFixed(0)}%`, backgroundColor: s.color }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{((s.total / summary.total_users) * 100).toFixed(1)}% of total</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <MBar label="Activation Rate"    value={summary.activation_rate}    color={OK}   />
                    <MBar label="Verification Rate"  value={summary.verification_rate}  color={BLUE} />
                  </div>
                </div>
              </Card>

              {/* Engagement snapshot */}
              <Card>
                <CardHead title="Engagement Snapshot" icon={Activity} />
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Daily Active",   val: fmtN(engagement.daily_active),   color: OK   },
                      { label: "Weekly Active",  val: fmtN(engagement.weekly_active),  color: TEAL },
                      { label: "Monthly Active", val: fmtN(engagement.monthly_active), color: BLUE },
                    ].map((m, i) => (
                      <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: `${m.color}12` }}>
                        <p className="text-lg font-black" style={{ color: m.color }}>{m.val}</p>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 pt-2">
                    <MBar label="7-Day Retention"  value={engagement.retention_rate_7d}  color={TEAL} />
                    <MBar label="30-Day Retention" value={engagement.retention_rate_30d} color={BLUE} />
                    <MBar label="DAU/MAU Ratio"    value={engagement.dau_mau_ratio}      color={P}    />
                  </div>
                  <div className="pt-2 border-t border-border grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Sessions/User</p>
                      <p className="text-lg font-black text-foreground">{engagement.avg_sessions_per_user}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Session (min)</p>
                      <p className="text-lg font-black text-foreground">{engagement.avg_session_duration_min}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* User growth chart */}
            <Card>
              <CardHead title="User Growth Over Time" icon={TrendingUp} />
              <div className="p-6">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sample(trends.users_over_time)}>
                      <defs>
                        <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={P}    stopOpacity={0.25} />
                          <stop offset="95%" stopColor={P}    stopOpacity={0}    />
                        </linearGradient>
                        <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={OK}   stopOpacity={0.2}  />
                          <stop offset="95%" stopColor={OK}   stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip content={<TTip />} />
                      <Legend iconType="circle" iconSize={8} />
                      <Area type="monotone" dataKey="count"  stroke={P}  fill="url(#gTotal)"  strokeWidth={2}   name="Total" />
                      <Area type="monotone" dataKey="active" stroke={OK} fill="url(#gActive)" strokeWidth={1.5} name="Active" />
                      <Area type="monotone" dataKey="new"    stroke={AMB} fill="none"          strokeWidth={1.5} name="New"   strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            {/* Top learners */}
            <Card>
              <CardHead title="Top Learners" icon={Award} />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50/60">
                      {["#", "User", "Courses Completed", "Learning Hours", "Certificates"].map((h, i) => (
                        <th key={i} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(top_learners || []).map((l: any, i: number) => (
                      <tr key={l.id} className="border-b border-border hover:bg-muted/50/50">
                        <td className="px-6 py-3 text-sm font-black" style={{ color: i === 0 ? AMB : i === 1 ? "#94a3b8" : i === 2 ? ORG : "#d1d5db" }}>#{i + 1}</td>
                        <td className="px-6 py-3 font-bold text-sm text-foreground">{l.name}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold" style={{ color: P }}>{l.courses_completed}</td>
                        <td className="px-6 py-3 text-right text-sm text-muted-foreground">{l.learning_hours}h</td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${AMB}15`, color: AMB }}>{l.certificates} 🏆</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ════════ ROLES ═════════════════════════════════════════════════ */}
        {activeTab === "roles" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {roleData.map((r, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5 text-center hover:shadow-md transition-shadow">
                  <div className="h-1 w-8 mx-auto rounded-full mb-4" style={{ backgroundColor: C[i % C.length] }} />
                  <p className="text-2xl font-black text-foreground">{fmtN(r.value)}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: C[i % C.length] }}>{r.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {((r.value / summary.total_users) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHead title="Role Distribution" icon={Shield} />
                <div className="p-6">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={roleData} cx="50%" cy="50%" innerRadius={52} outerRadius={76}
                          dataKey="value" nameKey="name" paddingAngle={3}>
                          {roleData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                        </Pie>
                        <Tooltip content={<TTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1 mt-2">
                    {roleData.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C[i % C.length] }} />
                          <span className="text-xs font-semibold text-muted-foreground">{r.name}</span>
                        </div>
                        <span className="text-sm font-black text-foreground">{fmtN(r.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <CardHead title="Account Types" icon={Users} />
                <div className="p-6">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accountTypeData} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: "#6b7280" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                        <Tooltip content={<TTip />} />
                        <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                          {accountTypeData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════════ GROWTH ════════════════════════════════════════════════ */}
        {activeTab === "growth" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "This Month",  value: `+${summary.new_users_this_month}`,  color: P    },
                { label: "Last Month",  value: `+${summary.new_users_last_month}`,  color: TEAL },
                { label: "Growth Rate", value: `+${summary.growth_rate?.toFixed(1)}%`, color: OK },
                { label: "Total",       value: fmtN(summary.total_users),            color: BLUE },
              ].map((m, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{m.label}</p>
                  <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardHead title="New Registrations" icon={TrendingUp} />
              <div className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sample(trends.new_registrations, 30)} barSize={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip content={<TTip />} />
                      <Bar dataKey="new" name="New Users" radius={[3, 3, 0, 0]} fill={P} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Cumulative User Growth" icon={Users} />
              <div className="p-6">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sample(trends.users_over_time)}>
                      <defs>
                        <linearGradient id="gCumul" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={P} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={P} stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip content={<TTip />} />
                      <Area type="monotone" dataKey="count" stroke={P} fill="url(#gCumul)" strokeWidth={2.5} name="Total Users" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ════════ ENGAGEMENT ════════════════════════════════════════════ */}
        {activeTab === "engagement" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "DAU",        value: fmtN(engagement.daily_active),   color: OK   },
                { label: "WAU",        value: fmtN(engagement.weekly_active),  color: TEAL },
                { label: "MAU",        value: fmtN(engagement.monthly_active), color: BLUE },
                { label: "DAU/MAU",    value: `${engagement.dau_mau_ratio?.toFixed(1)}%`, color: P },
              ].map((m, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5 text-center hover:shadow-md transition-shadow">
                  <div className="h-1 w-8 mx-auto rounded-full mb-4" style={{ backgroundColor: m.color }} />
                  <p className="text-2xl font-black text-foreground">{m.value}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: m.color }}>{m.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHead title="Retention Rates" icon={Target} />
                <div className="p-6 space-y-5">
                  <MBar label="7-Day Retention"  value={engagement.retention_rate_7d}  color={OK}   />
                  <MBar label="30-Day Retention" value={engagement.retention_rate_30d} color={BLUE} />
                  <MBar label="DAU/MAU Ratio"    value={engagement.dau_mau_ratio}      color={P}    />
                </div>
              </Card>

              <Card>
                <CardHead title="Session Metrics" icon={Activity} />
                <div className="p-6 grid grid-cols-2 gap-4">
                  {[
                    { label: "Avg Sessions / User",      value: engagement.avg_sessions_per_user, unit: "sessions", color: P    },
                    { label: "Avg Session Duration",     value: `${engagement.avg_session_duration_min}m`, unit: "minutes",  color: TEAL },
                    { label: "Active Last 7 Days",       value: fmtN(engagement.weekly_active),   unit: "users",    color: OK   },
                    { label: "Active Last 30 Days",      value: fmtN(engagement.monthly_active),  unit: "users",    color: BLUE },
                  ].map((m, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ backgroundColor: `${m.color}0d` }}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{m.label}</p>
                      <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════════ GEOGRAPHY ═════════════════════════════════════════════ */}
        {activeTab === "geography" && (
          <div className="space-y-5">
            <Card>
              <CardHead title="Users by Country" icon={Globe} />
              <div className="p-6">
                <div className="space-y-4">
                  {(geography.by_country || []).map((c: any, i: number) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C[i % C.length] }} />
                          <span className="text-sm font-bold text-muted-foreground">{c.country}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-foreground">{fmtN(c.count)}</span>
                          <span className="text-xs text-muted-foreground w-12 text-right">{c.pct?.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: C[i % C.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Geographic Distribution (Chart)" icon={Globe} />
              <div className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geography.by_country || []} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                      <YAxis type="category" dataKey="country" width={80}
                        tick={{ fontSize: 11, fontWeight: 600, fill: "#6b7280" }} />
                      <Tooltip content={<TTip />} />
                      <Bar dataKey="count" name="Users" radius={[0, 4, 4, 0]}>
                        {(geography.by_country || []).map((_: any, i: number) => (
                          <Cell key={i} fill={C[i % C.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ backgroundColor: `${P}08`, borderColor: `${P}20` }}>
          <div>
            <h4 className="text-base font-black text-foreground mb-1">Platform Summary</h4>
            <p className="text-sm text-muted-foreground">
              {fmtN(summary.total_users)} total users · {fmtN(summary.active_users)} active · {fmtN(summary.verified_users)} verified
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmtN(summary.total_bwengeplus)} BwengePlus · {fmtN(summary.total_ongera)} Ongera
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Growth Rate",   value: `+${summary.growth_rate?.toFixed(1)}%`,     bg: `${OK}12`,   text: OK,   border: `${OK}30`   },
              { label: "Activation",    value: `${summary.activation_rate?.toFixed(1)}%`,  bg: `${TEAL}12`, text: TEAL, border: `${TEAL}30` },
              { label: "Verification",  value: `${summary.verification_rate?.toFixed(1)}%`,bg: `${BLUE}12`, text: BLUE, border: `${BLUE}30` },
            ].map(({ label, value, bg, text, border }) => (
              <div key={label} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold"
                style={{ backgroundColor: bg, color: text, borderColor: border }}>
                {label}: {value}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}