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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Lock,
  Shield,
  Users,
  AlertTriangle,
  Settings,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Monitor,
  Smartphone,
  Globe,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";

const P = "#5b4e96";

interface SecuritySettings {
  require_2fa: boolean;
  session_timeout: number;
  max_login_attempts: number;
  password_complexity: string;
}

interface Institution {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url: string | null;
  is_active: boolean;
  member_count: number;
  security_settings: SecuritySettings;
  admin_emails: string[];
}

interface Session {
  id: string;
  system: string;
  ip_address: string;
  device_info: string | null;
  last_activity: string | null;
  expires_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface PlatformStats {
  active_sessions: number;
  bwenge_plus_sessions: number;
  ongera_sessions: number;
  users_with_2fa: number;
  total_active_users: number;
  two_fa_adoption_rate: string;
  suspicious_logins_24h: number;
}

export default function AccessControlPage() {
  const { user } = useAppSelector((s: any) => s.bwengeAuth);
  const token = typeof window !== "undefined" ? localStorage.getItem("bwengeplus_token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"institutions" | "sessions">("institutions");
  const [instSearch, setInstSearch] = useState("");
  const [sesSearch, setSesSearch] = useState("");
  const [sesSystem, setSesSystem] = useState("all");
  const [instPage, setInstPage] = useState(1);
  const [sesPage, setSesPage] = useState(1);
  const [instTotal, setInstTotal] = useState(0);
  const [sesTotal, setSesTotal] = useState(0);
  const [sesLoading, setSesLoading] = useState(false);

  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [editSettings, setEditSettings] = useState<SecuritySettings>({
    require_2fa: false,
    session_timeout: 60,
    max_login_attempts: 5,
    password_complexity: "medium",
  });
  const [saving, setSaving] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(instPage), limit: "20" });
      if (instSearch) params.set("search", instSearch);

      const res = await fetch(`${API}/system-admin/security/access?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setInstitutions(data.data.institutions);
        setPlatformStats(data.data.platform_stats);
        setSessions(data.data.recent_sessions);
        setInstTotal(data.data.pagination.total);
      } else {
        toast.error(data.message || "Failed to load access control data");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [token, API, instPage, instSearch]);

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    setSesLoading(true);
    try {
      const params = new URLSearchParams({ page: String(sesPage), limit: "30" });
      if (sesSearch) params.set("search", sesSearch);
      if (sesSystem !== "all") params.set("system", sesSystem);

      const res = await fetch(`${API}/system-admin/security/sessions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.data.sessions);
        setSesTotal(data.data.pagination.total);
      }
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setSesLoading(false);
    }
  }, [token, API, sesPage, sesSearch, sesSystem]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === "sessions") fetchSessions();
  }, [tab, fetchSessions]);

  const openEditDialog = (inst: Institution) => {
    setEditingInst(inst);
    setEditSettings({ ...inst.security_settings });
  };

  const handleSaveSettings = async () => {
    if (!editingInst || !token) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API}/system-admin/security/access/institutions/${editingInst.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ security: editSettings }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Security settings updated");
        setEditingInst(null);
        fetchData();
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!token) return;
    setTerminatingId(sessionId);
    try {
      const res = await fetch(`${API}/system-admin/security/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Session terminated");
        setSessions((s) => s.filter((x) => x.id !== sessionId));
      } else {
        toast.error(data.message || "Failed to terminate session");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTerminatingId(null);
    }
  };

  const handleTerminateAllUserSessions = async (userId: string, email: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/system-admin/security/sessions/user/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`All sessions for ${email} terminated`);
        fetchSessions();
      } else {
        toast.error(data.message || "Failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return <Monitor size={13} />;
    const d = deviceInfo.toLowerCase();
    if (d.includes("mobile") || d.includes("android") || d.includes("iphone"))
      return <Smartphone size={13} />;
    return <Monitor size={13} />;
  };

  const statCards = platformStats
    ? [
        {
          label: "Active Sessions",
          value: platformStats.active_sessions,
          color: P,
          icon: Globe,
          sub: `${platformStats.bwenge_plus_sessions} Bwenge+ · ${platformStats.ongera_sessions} Ongera`,
        },
        {
          label: "2FA Adoption",
          value: `${platformStats.two_fa_adoption_rate}%`,
          color: "#10b981",
          icon: Shield,
          sub: `${platformStats.users_with_2fa} of ${platformStats.total_active_users} users`,
        },
        {
          label: "Suspicious Logins",
          value: platformStats.suspicious_logins_24h,
          color: platformStats.suspicious_logins_24h > 0 ? "#ef4444" : "#6b7280",
          icon: AlertTriangle,
          sub: "Last 24 hours",
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Institution security policies · Session management
          </p>
        </div>
        <Button
          onClick={fetchData}
          style={{ backgroundColor: P }}
          className="text-white hover:opacity-90 flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          : statCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="h-[3px]" style={{ backgroundColor: card.color }} />
                <div className="p-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">{card.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(["institutions", "sessions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3.5 text-sm font-medium transition-colors capitalize relative ${
                tab === t ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "institutions" ? "Institutions" : "Active Sessions"}
              {tab === t && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: P }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Institutions Tab */}
        {tab === "institutions" && (
          <div>
            <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search institutions…"
                  value={instSearch}
                  onChange={(e) => { setInstSearch(e.target.value); setInstPage(1); }}
                  onKeyDown={(e) => e.key === "Enter" && fetchData()}
                  className="pl-9 text-sm h-8"
                />
              </div>
              <Button onClick={fetchData} variant="outline" className="text-sm h-8 px-3">
                Search
              </Button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Institution</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">2FA</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Session Timeout</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Max Attempts</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Password Policy</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : institutions.map((inst) => (
                      <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                              {inst.logo_url ? (
                                <img src={inst.logo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-gray-500">
                                  {inst.name[0]}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{inst.name}</p>
                              <p className="text-[10px] text-gray-400">{inst.type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {inst.security_settings.require_2fa ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle size={12} /> Required
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <XCircle size={12} /> Optional
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-gray-700">
                            {inst.security_settings.session_timeout}m
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-gray-700">
                            {inst.security_settings.max_login_attempts}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                            style={{
                              backgroundColor:
                                inst.security_settings.password_complexity === "high"
                                  ? "#dcfce7"
                                  : inst.security_settings.password_complexity === "medium"
                                  ? "#fef3c7"
                                  : "#fee2e2",
                              color:
                                inst.security_settings.password_complexity === "high"
                                  ? "#16a34a"
                                  : inst.security_settings.password_complexity === "medium"
                                  ? "#d97706"
                                  : "#dc2626",
                            }}
                          >
                            {inst.security_settings.password_complexity}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-gray-600">{inst.member_count}</span>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openEditDialog(inst)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Settings size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                {!loading && institutions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No institutions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {instTotal > 20 && (
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-500">{instTotal} institutions total</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInstPage((p) => Math.max(1, p - 1))}
                    disabled={instPage === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-gray-600 px-2">Page {instPage}</span>
                  <button
                    onClick={() => setInstPage((p) => p + 1)}
                    disabled={instPage * 20 >= instTotal}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {tab === "sessions" && (
          <div>
            <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by email or IP…"
                  value={sesSearch}
                  onChange={(e) => { setSesSearch(e.target.value); setSesPage(1); }}
                  onKeyDown={(e) => e.key === "Enter" && fetchSessions()}
                  className="pl-9 text-sm h-8"
                />
              </div>
              <Select value={sesSystem} onValueChange={(v) => { setSesSystem(v); setSesPage(1); }}>
                <SelectTrigger className="w-36 text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All systems</SelectItem>
                  <SelectItem value="bwengeplus">Bwenge+</SelectItem>
                  <SelectItem value="ongera">Ongera</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchSessions} variant="outline" className="text-sm h-8 px-3">
                Search
              </Button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">System</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {sesLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : sessions.map((session) => (
                      <tr key={session.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                        <td className="px-5 py-3">
                          {session.user ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[9px]" style={{ backgroundColor: `${P}20`, color: P }}>
                                  {session.user.first_name?.[0]}{session.user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-medium text-gray-800">
                                  {session.user.first_name} {session.user.last_name}
                                </p>
                                <p className="text-[10px] text-gray-400">{session.user.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor:
                                session.system === "bwengeplus" ? "#ede9fe" : "#e0f2fe",
                              color: session.system === "bwengeplus" ? "#7c3aed" : "#0369a1",
                            }}
                          >
                            {session.system === "bwengeplus" ? "Bwenge+" : "Ongera"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-gray-600">
                            {session.ip_address || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            {getDeviceIcon(session.device_info)}
                            <span className="text-xs truncate max-w-[120px]">
                              {session.device_info || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-gray-500">{formatTime(session.last_activity)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-gray-500">{formatTime(session.expires_at)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTerminateSession(session.id)}
                              disabled={terminatingId === session.id}
                              title="Terminate this session"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                            >
                              <LogOut size={13} />
                            </button>
                            {session.user && (
                              <button
                                onClick={() =>
                                  handleTerminateAllUserSessions(session.user!.id, session.user!.email)
                                }
                                title="Terminate all sessions for this user"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                {!sesLoading && sessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No active sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {sesTotal > 30 && (
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-500">{sesTotal} sessions total</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSesPage((p) => Math.max(1, p - 1))}
                    disabled={sesPage === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs px-2">Page {sesPage}</span>
                  <button
                    onClick={() => setSesPage((p) => p + 1)}
                    disabled={sesPage * 30 >= sesTotal}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Security Settings Dialog */}
      <Dialog open={!!editingInst} onOpenChange={() => setEditingInst(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings size={16} style={{ color: P }} />
              Security Settings
            </DialogTitle>
            <DialogDescription>
              {editingInst?.name} — update institution security policy
            </DialogDescription>
          </DialogHeader>

          {editingInst && (
            <div className="space-y-5 py-2">
              {/* 2FA Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Require Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500 mt-0.5">All members must set up 2FA to access the platform</p>
                </div>
                <button
                  onClick={() => setEditSettings((s) => ({ ...s, require_2fa: !s.require_2fa }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                    editSettings.require_2fa ? "" : "bg-gray-200"
                  }`}
                  style={editSettings.require_2fa ? { backgroundColor: P } : {}}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 mt-0.5 ${
                      editSettings.require_2fa ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Session Timeout */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">Session Timeout (minutes)</label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={editSettings.session_timeout}
                  onChange={(e) =>
                    setEditSettings((s) => ({ ...s, session_timeout: Number(e.target.value) }))
                  }
                  className="text-sm"
                />
                <p className="text-xs text-gray-400">
                  Idle sessions will expire after this period (5–1440 min)
                </p>
              </div>

              {/* Max Login Attempts */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">Max Login Attempts</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={editSettings.max_login_attempts}
                  onChange={(e) =>
                    setEditSettings((s) => ({ ...s, max_login_attempts: Number(e.target.value) }))
                  }
                  className="text-sm"
                />
                <p className="text-xs text-gray-400">Account will be locked after this many failed logins</p>
              </div>

              {/* Password Complexity */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">Password Complexity</label>
                <Select
                  value={editSettings.password_complexity}
                  onValueChange={(v) =>
                    setEditSettings((s) => ({ ...s, password_complexity: v }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — 6+ characters</SelectItem>
                    <SelectItem value="medium">Medium — 8+ chars, mixed case</SelectItem>
                    <SelectItem value="high">High — 12+ chars, numbers & symbols</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInst(null)} className="text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              style={{ backgroundColor: P }}
              className="text-white hover:opacity-90 text-sm"
            >
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}