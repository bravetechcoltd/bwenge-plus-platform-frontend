"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppSelector } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Clock,
  Users,
  BookOpen,
  Building2,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const P = "#5b4e96";

interface HealthData {
  overall_status: string;
  checked_at: string;
  server: {
    uptime_seconds: number;
    uptime_human: string;
    node_version: string;
    platform: string;
    arch: string;
  };
  memory: {
    heap_used_mb: string;
    heap_total_mb: string;
    rss_mb: string;
    system_total_mb: string;
    system_free_mb: string;
    system_used_pct: string;
  };
  cpu: {
    load_1m: string;
    load_5m: string;
    load_15m: string;
    cpu_count: number;
  };
  database: {
    status: string;
    response_ms: number;
    total_users: number;
    active_users: number;
    total_institutions: number;
    total_courses: number;
    total_enrollments: number;
  };
  sessions: {
    active: number;
    expired_pending_cleanup: number;
  };
  activity: {
    logs_last_24h: number;
    logs_last_1h: number;
    error_logs_24h: number;
    error_rate_pct: string;
    hourly_trend: { hour: string | null; count: number }[];
  };
  services: {
    name: string;
    status: string;
    response_ms: number;
    message: string;
  }[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
    healthy: { icon: CheckCircle, color: "#10b981", bg: "#dcfce7", label: "Healthy" },
    idle: { icon: CheckCircle, color: "#6b7280", bg: "#f1f5f9", label: "Idle" },
    degraded: { icon: AlertTriangle, color: "#f59e0b", bg: "#fef3c7", label: "Degraded" },
    critical: { icon: XCircle, color: "#ef4444", bg: "#fee2e2", label: "Critical" },
  };
  const s = map[status] || map["degraded"];
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <Icon size={11} />
      {s.label}
    </span>
  );
}

function GaugeBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

const REFRESH_SECONDS = 30;

export default function SystemHealthPage() {
  const { user } = useAppSelector((s: any) => s.bwengeAuth);
  const token = typeof window !== "undefined" ? localStorage.getItem("bwengeplus_token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/system-admin/security/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setHealth(data.data);
        setCountdown(REFRESH_SECONDS);
      } else {
        toast.error(data.message || "Failed to load health data");
      }
    } catch {
      toast.error("Network error fetching system health");
    } finally {
      setLoading(false);
    }
  }, [token, API]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh countdown
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchHealth();
          return REFRESH_SECONDS;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchHealth]);

  const handleCleanup = async () => {
    if (!token) return;
    setCleaning(true);
    try {
      const res = await fetch(`${API}/system-admin/security/health/cleanup-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Cleanup complete");
        fetchHealth();
      } else {
        toast.error(data.message || "Cleanup failed");
      }
    } catch {
      toast.error("Network error during cleanup");
    } finally {
      setCleaning(false);
    }
  };

  const formatTrendHour = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const trendData =
    health?.activity.hourly_trend.map((t) => ({
      time: formatTrendHour(t.hour),
      events: t.count,
    })) ?? [];

  const statusBanner = {
    healthy: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", msg: "All systems operational" },
    degraded: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", msg: "Some systems degraded" },
    critical: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", msg: "Critical issues detected" },
  }[health?.overall_status ?? "healthy"] ?? {
    bg: "#f9fafb", border: "#e5e7eb", text: "#374151", msg: "Checking…",
  };

  const memPct = health ? Number(health.memory.system_used_pct) : 0;
  const heapPct = health
    ? (Number(health.memory.heap_used_mb) / Number(health.memory.heap_total_mb)) * 100
    : 0;

  const cpuLoad1 = health ? Number(health.cpu.load_1m) : 0;
  const cpuMax = health ? health.cpu.cpu_count : 4;
  const cpuPct = Math.min(100, (cpuLoad1 / cpuMax) * 100);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time server metrics · Auto-refreshes every {REFRESH_SECONDS}s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-500">
            <Clock size={13} />
            Refreshing in <span className="font-mono font-bold text-gray-700 w-5 text-right">{countdown}</span>s
          </div>
          <Button
            onClick={fetchHealth}
            style={{ backgroundColor: P }}
            className="text-white hover:opacity-90 flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {loading ? (
        <Skeleton className="h-14 w-full rounded-2xl" />
      ) : (
        <div
          className="rounded-2xl border px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: statusBanner.bg, borderColor: statusBanner.border }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: statusBanner.text }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: statusBanner.text }}>
                {statusBanner.msg}
              </p>
              <p className="text-xs opacity-70 mt-0.5" style={{ color: statusBanner.text }}>
                Last checked: {health ? new Date(health.checked_at).toLocaleTimeString() : "—"}
              </p>
            </div>
          </div>
          <StatusBadge status={health?.overall_status ?? "healthy"} />
        </div>
      )}

      {/* Top Row: Server + Memory + CPU */}
      <div className="grid grid-cols-3 gap-4">
        {/* Server Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: P }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P}15` }}>
                <Server size={15} style={{ color: P }} />
              </div>
              <p className="text-sm font-semibold text-gray-800">Server</p>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Uptime</span>
                  <span className="text-xs font-semibold text-gray-800 font-mono">
                    {health?.server.uptime_human}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Node.js</span>
                  <span className="text-xs font-mono text-gray-700">{health?.server.node_version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Platform</span>
                  <span className="text-xs text-gray-700 capitalize">{health?.server.platform}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Architecture</span>
                  <span className="text-xs text-gray-700">{health?.server.arch}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Memory */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: memPct > 80 ? "#ef4444" : memPct > 60 ? "#f59e0b" : "#10b981" }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                <HardDrive size={15} className="text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Memory</p>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <GaugeBar
                  value={Number(health?.memory.system_used_pct ?? 0)}
                  max={100}
                  color={memPct > 80 ? "#ef4444" : memPct > 60 ? "#f59e0b" : "#10b981"}
                  label={`System RAM — ${health?.memory.system_free_mb}MB free of ${health?.memory.system_total_mb}MB`}
                />
                <GaugeBar
                  value={Number(health?.memory.heap_used_mb ?? 0)}
                  max={Number(health?.memory.heap_total_mb ?? 1)}
                  color="#3b82f6"
                  label={`Heap — ${health?.memory.heap_used_mb}MB / ${health?.memory.heap_total_mb}MB`}
                />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-gray-500">RSS</span>
                  <span className="text-xs font-mono text-gray-700">{health?.memory.rss_mb} MB</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CPU */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: cpuPct > 80 ? "#ef4444" : cpuPct > 60 ? "#f59e0b" : "#06b6d4" }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-50">
                <Cpu size={15} className="text-cyan-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800">CPU</p>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <GaugeBar value={cpuLoad1} max={cpuMax} color="#06b6d4" label={`Load (1m) — ${health?.cpu.load_1m}`} />
                <div className="grid grid-cols-2 gap-x-4 pt-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">5m avg</span>
                    <span className="text-xs font-mono text-gray-700">{health?.cpu.load_5m}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">15m avg</span>
                    <span className="text-xs font-mono text-gray-700">{health?.cpu.load_15m}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">CPU cores</span>
                  <span className="text-xs font-semibold text-gray-700">{health?.cpu.cpu_count}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Database + Services */}
      <div className="grid grid-cols-2 gap-4">
        {/* Database */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: health?.database.status === "healthy" ? "#10b981" : "#ef4444" }} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50">
                  <Database size={15} className="text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-gray-800">Database</p>
              </div>
              {loading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <div className="flex items-center gap-2">
                  <StatusBadge status={health?.database.status ?? "healthy"} />
                  <span className="text-xs font-mono text-gray-500">{health?.database.response_ms}ms</span>
                </div>
              )}
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Users", value: health?.database.total_users, icon: Users, color: P },
                  { label: "Active Users", value: health?.database.active_users, icon: Users, color: "#10b981" },
                  { label: "Institutions", value: health?.database.total_institutions, icon: Building2, color: "#3b82f6" },
                  { label: "Courses", value: health?.database.total_courses, icon: BookOpen, color: "#f59e0b" },
                  { label: "Enrollments", value: health?.database.total_enrollments, icon: Activity, color: "#06b6d4" },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <stat.icon size={11} style={{ color: stat.color }} />
                      <p className="text-[10px] text-gray-500 font-medium">{stat.label}</p>
                    </div>
                    <p className="text-lg font-black text-gray-800">
                      {stat.value?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: "#8b5cf6" }} />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50">
                <Zap size={15} className="text-violet-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Services</p>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {health?.services.map((svc) => (
                  <div
                    key={svc.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{svc.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{svc.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {svc.response_ms > 0 && (
                        <span className="text-xs font-mono text-gray-400">{svc.response_ms}ms</span>
                      )}
                      <StatusBadge status={svc.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Trend Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-[3px]" style={{ backgroundColor: "#f59e0b" }} />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
                <BarChart3 size={15} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Activity Trend</p>
                <p className="text-xs text-gray-400">Hourly events — last 24 hours</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span className="text-xs text-gray-500">Events/hour</span>
              </div>
              {!loading && health && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-gray-600">24h: <strong>{health.activity.logs_last_24h.toLocaleString()}</strong></span>
                  <span className="text-gray-600">1h: <strong>{health.activity.logs_last_1h}</strong></span>
                  <span className={Number(health.activity.error_rate_pct) > 5 ? "text-red-500" : "text-gray-600"}>
                    Errors: <strong>{health.activity.error_rate_pct}%</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-44 w-full" />
          ) : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  labelFormatter={(label) => `${label}`}
                  formatter={(value: number | undefined) => [`${value ?? 0} events`, "Activity"]}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#activityGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#f59e0b" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
              No activity data for the last 24 hours
            </div>
          )}
        </div>
      </div>

      {/* Sessions Cleanup Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-[3px]" style={{ backgroundColor: "#ef4444" }} />
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Activity size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Session Cleanup</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? "Loading…" : (
                  <>
                    <span className="font-semibold text-gray-700">{health?.sessions.active.toLocaleString()}</span> active ·{" "}
                    <span className={`font-semibold ${(health?.sessions.expired_pending_cleanup ?? 0) > 0 ? "text-red-500" : "text-gray-700"}`}>
                      {health?.sessions.expired_pending_cleanup.toLocaleString()}
                    </span> expired pending cleanup
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={handleCleanup}
            disabled={cleaning || loading || (health?.sessions.expired_pending_cleanup ?? 0) === 0}
            variant="outline"
            className="flex items-center gap-2 text-sm border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 size={14} />
            {cleaning ? "Cleaning up…" : "Clean Expired Sessions"}
          </Button>
        </div>
      </div>
    </div>
  );
}