"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Users,
  Activity,
  AlertTriangle,
  X,
} from "lucide-react";

const P = "#5b4e96";

const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  CREATE: { bg: "#dcfce7", text: "#16a34a", label: "Create" },
  UPDATE: { bg: "#dbeafe", text: "#1d4ed8", label: "Update" },
  DELETE: { bg: "#fee2e2", text: "#dc2626", label: "Delete" },
  LOGIN: { bg: "#f0fdf4", text: "#15803d", label: "Login" },
  LOGOUT: { bg: "#f1f5f9", text: "#64748b", label: "Logout" },
  FAILED: { bg: "#fef3c7", text: "#d97706", label: "Failed" },
  ERROR: { bg: "#fee2e2", text: "#dc2626", label: "Error" },
  TERMINATE: { bg: "#fce7f3", text: "#be185d", label: "Terminate" },
  CLEANUP: { bg: "#ede9fe", text: "#7c3aed", label: "Cleanup" },
};

function getActionStyle(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) =>
    action.toUpperCase().includes(k)
  );
  return key
    ? ACTION_COLORS[key]
    : { bg: "#f1f5f9", text: "#475569", label: action };
}

interface AuditLog {
  id: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  details: string | null;
  createdAt: string;
  userId: string | null;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    bwenge_role: string;
  } | null;
}

interface Stats {
  total_logs: number;
  last_24h: number;
  unique_actors_24h: number;
  action_distribution: { action: string; count: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const { user } = useAppSelector((s: any) => s.bwengeAuth);
  const token = typeof window !== "undefined" ? localStorage.getItem("bwengeplus_token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
      if (targetTypeFilter && targetTypeFilter !== "all") params.set("targetType", targetTypeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`${API}/system-admin/security/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      } else {
        toast.error(data.message || "Failed to load audit logs");
      }
    } catch {
      toast.error("Network error while loading audit logs");
    } finally {
      setLoading(false);
    }
  }, [token, API, page, search, actionFilter, targetTypeFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
      if (targetTypeFilter && targetTypeFilter !== "all") params.set("targetType", targetTypeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`${API}/system-admin/security/audit/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit logs exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearch("");
    setActionFilter("all");
    setTargetTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const errorRate =
    stats && stats.total_logs > 0
      ? (
          (stats.action_distribution
            .filter((a) => a.action.toLowerCase().includes("error") || a.action.toLowerCase().includes("fail"))
            .reduce((sum, a) => sum + a.count, 0) /
            stats.total_logs) *
          100
        ).toFixed(1)
      : "0";

  const kpiCards = [
    {
      label: "Total Logs",
      value: stats?.total_logs?.toLocaleString() ?? "—",
      icon: FileText,
      color: P,
      sub: "All time",
    },
    {
      label: "Last 24 Hours",
      value: stats?.last_24h?.toLocaleString() ?? "—",
      icon: Clock,
      color: "#3b82f6",
      sub: "Recent activity",
    },
    {
      label: "Unique Actors",
      value: stats?.unique_actors_24h?.toLocaleString() ?? "—",
      icon: Users,
      color: "#10b981",
      sub: "Active in 24h",
    },
    {
      label: "Error Rate",
      value: `${errorRate}%`,
      icon: AlertTriangle,
      color: Number(errorRate) > 5 ? "#ef4444" : "#f59e0b",
      sub: "Errors & failures",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-muted/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform-wide activity trail — every action recorded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              autoRefresh
                ? "bg-success/15 text-success"
                : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
            {autoRefresh ? "Live" : "Auto-refresh"}
          </button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            className="flex items-center gap-2 text-sm"
          >
            <Download size={14} />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Button
            onClick={fetchLogs}
            style={{ backgroundColor: P }}
            className="text-white hover:opacity-90 flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            <div className="h-[3px]" style={{ backgroundColor: card.color }} />
            <div className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                {loading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-black text-foreground mt-0.5">{card.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}18` }}
              >
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 text-sm"
            />
          </div>

          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44 text-sm">
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {stats?.action_distribution.slice(0, 15).map((a) => (
                <SelectItem key={a.action} value={a.action}>
                  {a.action} ({a.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 text-sm">
              <SelectValue placeholder="Target type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All targets</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="institution">Institution</SelectItem>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="enrollment">Enrollment</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <Button onClick={handleSearch} style={{ backgroundColor: P }} className="text-white hover:opacity-90 text-sm px-4">
            Search
          </Button>

          {(search || actionFilter !== "all" || targetTypeFilter !== "all" || startDate || endDate) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            {loading ? "Loading…" : `${pagination.total.toLocaleString()} entries`}
          </p>
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages || 1}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actor
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Target
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Details
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : logs.map((log) => {
                    const style = getActionStyle(log.action);
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-border hover:bg-muted/50/40 transition-colors"
                      >
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatTime(log.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: style.bg, color: style.text }}
                          >
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {log.user ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={log.user.profile_picture_url || ""} />
                                <AvatarFallback className="text-[9px]" style={{ backgroundColor: `${P}20`, color: P }}>
                                  {log.user.first_name?.[0]}{log.user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                {log.user.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">system</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {log.targetType ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-muted-foreground capitalize">
                                {log.targetType}
                              </span>
                              {log.targetId && (
                                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[100px]">
                                  {log.targetId.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 max-w-[200px]">
                          {log.details ? (
                            <span className="text-xs text-muted-foreground truncate block">
                              {log.details.slice(0, 60)}
                              {log.details.length > 60 ? "…" : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No audit logs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    style={p === page ? { backgroundColor: P } : {}}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={16} style={{ color: P }} />
              Log Detail
            </DialogTitle>
            <DialogDescription>
              Full audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Action</p>
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: getActionStyle(selectedLog.action).bg, color: getActionStyle(selectedLog.action).text }}
                  >
                    {selectedLog.action.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Timestamp</p>
                  <p className="text-sm font-mono text-foreground">{formatTime(selectedLog.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Target Type</p>
                  <p className="text-sm text-foreground capitalize">{selectedLog.targetType || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Target ID</p>
                  <p className="text-sm font-mono text-muted-foreground break-all">{selectedLog.targetId || "—"}</p>
                </div>
              </div>

              {selectedLog.user && (
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Actor</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedLog.user.profile_picture_url || ""} />
                      <AvatarFallback style={{ backgroundColor: `${P}20`, color: P }} className="text-xs">
                        {selectedLog.user.first_name?.[0]}{selectedLog.user.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedLog.user.first_name} {selectedLog.user.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedLog.user.email}</p>
                    </div>
                    <span className="ml-auto text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                      {selectedLog.user.bwenge_role}
                    </span>
                  </div>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Details</p>
                  <pre className="p-3 bg-card text-muted-foreground rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.details!), null, 2);
                      } catch {
                        return selectedLog.details;
                      }
                    })()}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Log ID</p>
                <p className="text-xs font-mono text-muted-foreground">{selectedLog.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}