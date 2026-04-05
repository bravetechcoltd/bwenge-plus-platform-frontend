// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Shield, Search, Trash2, Eye, RefreshCw,
  MoreVertical, Building2, Users, CheckCircle,
  XCircle, UserPlus, Loader2,
  AlertTriangle, ArrowUpRight, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { toast } from "sonner";

const P    = "#5b4e96";
const OK   = "#10b981";
const BLUE = "#3b82f6";
const AMB  = "#f59e0b";

interface InstitutionAdmin {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  profile_picture_url?: string;
  institution_id: string;
  institution_name: string;
  institution_type: string;
  institution_logo?: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  stats: {
    total_members: number;
    total_courses: number;
    total_enrollments: number;
    active_members: number;
  };
}

interface AdminStats {
  total_admins: number;
  active_admins: number;
  institutions_managed: number;
  avg_members_per_admin: number;
}

export default function InstitutionAdminsPage() {
  const { user } = useAppSelector((s: any) => s.bwengeAuth);

  const [admins, setAdmins]             = useState<InstitutionAdmin[]>([]);
  const [stats, setStats]               = useState<AdminStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode]         = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const itemsPerPage = 20;

  const [selectedAdmin, setSelectedAdmin]       = useState<InstitutionAdmin | null>(null);
  const [showDetailModal, setShowDetailModal]   = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [deleting, setDeleting]                 = useState(false);

  const [assignForm, setAssignForm] = useState({ user_id: "", institution_id: "" });
  const [assigning, setAssigning]   = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/institution-admins?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setAdmins(data.data?.admins || []);
        setStats(data.data?.stats || null);
        setTotalPages(data.data?.pagination?.totalPages || 1);
        setTotal(data.data?.pagination?.total || 0);
      } else {
        toast.error("Failed to load institution admins");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const fetchInstitutions = useCallback(async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/system-admin/institutions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInstitutions(data.data?.institutions || []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);
  useEffect(() => { fetchInstitutions(); }, [fetchInstitutions]);

  // ── client-side filter from already-fetched data ──────────────────────────
  const filteredAdmins = useMemo(() =>
    admins.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !q || `${a.first_name} ${a.last_name} ${a.email} ${a.institution_name}`.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? a.is_active : !a.is_active);
      return matchSearch && matchStatus;
    }),
    [admins, search, statusFilter]
  );

  // ── helpers ────────────────────────────────────────────────────────────────
  const getInitials = (fn: string, ln: string) => `${fn?.[0] || ""}${ln?.[0] || ""}`;

  const getTypeColor = (type: string) => ({
    UNIVERSITY:      { bg: "#eff6ff", text: "#2563eb" },
    GOVERNMENT:      { bg: "#f0fdf4", text: "#16a34a" },
    PRIVATE_COMPANY: { bg: "#fffbeb", text: "#92400e" },
    NGO:             { bg: "#faf5ff", text: "#7c3aed" },
  }[type] || { bg: "#f8fafc", text: "#475569" });

  const formatDate = (d?: string) => d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Never";

  // ── actions ────────────────────────────────────────────────────────────────
  const toggleStatus = async (admin: InstitutionAdmin) => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/system-admin/institution-admins/${admin.user_id}/toggle-status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_active: !a.is_active } : a));
      toast.success(`Admin ${admin.is_active ? "deactivated" : "activated"}`);
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const removeAdmin = async () => {
    if (!selectedAdmin) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/institution-admins/${selectedAdmin.user_id}?institution_id=${selectedAdmin.institution_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setAdmins(prev => prev.filter(a => a.id !== selectedAdmin.id));
        toast.success("Admin removed");
        setShowDeleteDialog(false);
      } else {
        toast.error("Failed to remove admin");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  const assignAdmin = async () => {
    if (!assignForm.user_id || !assignForm.institution_id) {
      toast.error("Please fill all fields");
      return;
    }
    setAssigning(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/system-admin/institution-admins/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(assignForm)
      });
      if (res.ok) {
        toast.success("Admin assigned");
        fetchAdmins();
        setShowAssignDialog(false);
        setAssignForm({ user_id: "", institution_id: "" });
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to assign admin");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAssigning(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Institution Admins</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage institution administrators across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAdmins} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAssignDialog(true)} style={{ backgroundColor: P }} className="text-white hover:opacity-90">
            <UserPlus className="w-4 h-4 mr-1.5" />Assign Admin
          </Button>
        </div>
      </div>

      {/* KPI cards — from fetched stats only */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Admins",  value: stats.total_admins,           color: P    },
            { label: "Active",        value: stats.active_admins,           color: OK   },
            { label: "Institutions",  value: stats.institutions_managed,    color: BLUE },
            { label: "Avg Members",   value: stats.avg_members_per_admin,   color: AMB  },
          ].map((m, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="h-[3px]" style={{ backgroundColor: m.color }} />
              <div className="p-4">
                <p className="text-xs font-semibold text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-black text-foreground mt-0.5">{(m.value ?? 0).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search admins..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 w-60"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{filteredAdmins.length} results</span>
            </div>
            <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="grid">Grid</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50/50">
                    {["Admin", "Institution", "Status", "Members", "Courses", "Enrollments", "Last Login", ""].map((h, i) => (
                      <th key={i} className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground ${i > 2 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredAdmins.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      {search || statusFilter !== "all" ? "No results matching filters" : "No institution admins found"}
                    </td></tr>
                  ) : filteredAdmins.map(admin => {
                    const tc = getTypeColor(admin.institution_type);
                    return (
                      <tr key={admin.id} className="border-b border-border hover:bg-muted/50/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={admin.profile_picture_url} />
                              <AvatarFallback className="text-xs bg-primary/15 text-primary font-bold">
                                {getInitials(admin.first_name, admin.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{admin.first_name} {admin.last_name}</p>
                              <p className="text-xs text-muted-foreground">{admin.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {admin.institution_logo
                              ? <img src={admin.institution_logo} alt="" className="w-6 h-6 rounded object-cover" />
                              : <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: tc.bg }}>
                                  <Building2 className="w-3 h-3" style={{ color: tc.text }} />
                                </div>
                            }
                            <div>
                              <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">{admin.institution_name}</p>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: tc.bg, color: tc.text }}>
                                {admin.institution_type?.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${admin.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {admin.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm font-semibold text-muted-foreground">{admin.stats?.total_members ?? 0}</td>
                        <td className="px-5 py-3.5 text-right text-sm text-muted-foreground">{admin.stats?.total_courses ?? 0}</td>
                        <td className="px-5 py-3.5 text-right text-sm text-muted-foreground">{admin.stats?.total_enrollments ?? 0}</td>
                        <td className="px-5 py-3.5 text-right text-xs text-muted-foreground">{formatDate(admin.last_login)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => { setSelectedAdmin(admin); setShowDetailModal(true); }}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setSelectedAdmin(admin); setShowDetailModal(true); }}>
                                  <Eye className="w-4 h-4 mr-2" />View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleStatus(admin)}>
                                  {admin.is_active
                                    ? <XCircle className="w-4 h-4 mr-2 text-destructive" />
                                    : <CheckCircle className="w-4 h-4 mr-2 text-success" />}
                                  {admin.is_active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive"
                                  onClick={() => { setSelectedAdmin(admin); setShowDeleteDialog(true); }}>
                                  <Trash2 className="w-4 h-4 mr-2" />Remove Admin
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)
                : filteredAdmins.map(admin => {
                  const tc = getTypeColor(admin.institution_type);
                  return (
                    <div key={admin.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-11 h-11">
                            <AvatarImage src={admin.profile_picture_url} />
                            <AvatarFallback className="bg-primary/15 text-primary font-bold">
                              {getInitials(admin.first_name, admin.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-sm text-foreground">{admin.first_name} {admin.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{admin.email}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${admin.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: tc.bg }}>
                          <Building2 className="w-3 h-3" style={{ color: tc.text }} />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground truncate">{admin.institution_name}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: tc.bg, color: tc.text }}>
                          {admin.institution_type?.replace("_", " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { label: "Members",     value: admin.stats?.total_members ?? 0 },
                          { label: "Courses",     value: admin.stats?.total_courses ?? 0 },
                          { label: "Enrollments", value: admin.stats?.total_enrollments ?? 0 },
                        ].map((s, i) => (
                          <div key={i} className="text-center bg-muted/50 rounded-lg py-2">
                            <p className="text-base font-black text-foreground">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs"
                          onClick={() => { setSelectedAdmin(admin); setShowDetailModal(true); }}>
                          <Eye className="w-3 h-3 mr-1" />View
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs text-destructive hover:text-destructive"
                          onClick={() => { setSelectedAdmin(admin); setShowDeleteDialog(true); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">{((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, total)} of {total}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                  <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" className="h-8 w-8 p-0"
                    style={currentPage === p ? { backgroundColor: P } : {}}
                    onClick={() => setCurrentPage(p)}>{p}</Button>
                ))}
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Admin Details</DialogTitle>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedAdmin.profile_picture_url} />
                  <AvatarFallback className="text-lg bg-primary/15 text-primary font-bold">
                    {getInitials(selectedAdmin.first_name, selectedAdmin.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-black text-foreground">{selectedAdmin.first_name} {selectedAdmin.last_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                  {selectedAdmin.phone_number && <p className="text-xs text-muted-foreground">{selectedAdmin.phone_number}</p>}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${selectedAdmin.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {selectedAdmin.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Institution</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" style={{ color: P }} />
                  <span className="font-bold text-foreground">{selectedAdmin.institution_name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{selectedAdmin.institution_type?.replace("_", " ")}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Members",    value: selectedAdmin.stats?.total_members ?? 0 },
                  { label: "Active Members",   value: selectedAdmin.stats?.active_members ?? 0 },
                  { label: "Total Courses",    value: selectedAdmin.stats?.total_courses ?? 0 },
                  { label: "Total Enrollments",value: selectedAdmin.stats?.total_enrollments ?? 0 },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ backgroundColor: `${P}0d` }}>
                    <p className="text-xs text-muted-foreground font-semibold mb-0.5">{s.label}</p>
                    <p className="text-xl font-black" style={{ color: P }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><span className="font-semibold">Joined: </span>{formatDate(selectedAdmin.date_joined)}</div>
                <div><span className="font-semibold">Last Login: </span>{formatDate(selectedAdmin.last_login)}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
            {selectedAdmin && (
              <Link href={`/dashboard/system-admin/institutions/${selectedAdmin.institution_id}`}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                style={{ backgroundColor: P }}>
                <ArrowUpRight className="w-4 h-4" />View Institution
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Institution Admin</DialogTitle>
            <DialogDescription>Assign an existing user as institution administrator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">User ID</label>
              <Input placeholder="Enter user ID" value={assignForm.user_id}
                onChange={e => setAssignForm(prev => ({ ...prev, user_id: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institution</label>
              <Select value={assignForm.institution_id} onValueChange={v => setAssignForm(prev => ({ ...prev, institution_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                  {institutions.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No institutions loaded</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={assignAdmin} disabled={assigning} style={{ backgroundColor: P }} className="text-white hover:opacity-90">
              {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <UserPlus className="w-4 h-4 mr-1.5" />Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />Remove Admin
            </DialogTitle>
            <DialogDescription>
              Remove <strong>{selectedAdmin?.first_name} {selectedAdmin?.last_name}</strong> as admin of{" "}
              <strong>{selectedAdmin?.institution_name}</strong>? Their account will remain but admin privileges will be revoked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={removeAdmin} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}