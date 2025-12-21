// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Plus, Search, Edit2, Trash2, Shield, RefreshCw,
  AlertTriangle, ChevronDown, ChevronRight, Lock, Loader2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const P = "#5b4e96";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SYSTEM_ADMIN:      { bg: "#fef2f2", text: "#dc2626" },
  INSTITUTION_ADMIN: { bg: "#faf5ff", text: "#7c3aed" },
  CONTENT_CREATOR:   { bg: "#eff6ff", text: "#2563eb" },
  INSTRUCTOR:        { bg: "#f0fdf4", text: "#16a34a" },
  LEARNER:           { bg: "#f8fafc", text: "#475569" },
};

const PERMISSION_GROUPS = [
  {
    group: "User Management",
    permissions: [
      { key: "users.view",   label: "View Users" },
      { key: "users.create", label: "Create Users" },
      { key: "users.edit",   label: "Edit Users" },
      { key: "users.delete", label: "Delete Users" },
    ],
  },
  {
    group: "Institution Management",
    permissions: [
      { key: "institutions.view",   label: "View Institutions" },
      { key: "institutions.create", label: "Create Institutions" },
      { key: "institutions.edit",   label: "Edit Institutions" },
      { key: "institutions.delete", label: "Delete Institutions" },
    ],
  },
  {
    group: "Course Management",
    permissions: [
      { key: "courses.view",    label: "View Courses" },
      { key: "courses.create",  label: "Create Courses" },
      { key: "courses.edit",    label: "Edit Courses" },
      { key: "courses.publish", label: "Publish Courses" },
      { key: "courses.delete",  label: "Delete Courses" },
    ],
  },
  {
    group: "Analytics & Reports",
    permissions: [
      { key: "analytics.view",   label: "View Analytics" },
      { key: "analytics.export", label: "Export Reports" },
    ],
  },
  {
    group: "System Settings",
    permissions: [
      { key: "settings.view", label: "View Settings" },
      { key: "settings.edit", label: "Edit Settings" },
    ],
  },
];

const ALL_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  user_count: number;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export default function ManageRolesPage() {
  const { user } = useAppSelector((s: any) => s.bwengeAuth);

  const [roles, setRoles]       = useState<Role[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showEdit, setShowEdit]         = useState(false);
  const [showCreate, setShowCreate]     = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [expanded, setExpanded]         = useState<string[]>(PERMISSION_GROUPS.map(g => g.group));

  const [form, setForm] = useState({
    name: "", display_name: "", description: "", permissions: [] as string[],
  });

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/system-admin/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.data?.roles || []);
      } else {
        toast.error("Failed to load roles");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // Client-side filter — no re-fetch
  const filtered = useMemo(() =>
    roles.filter(r =>
      !search ||
      r.display_name.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase())
    ), [roles, search]
  );

  const togglePerm = (key: string) =>
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter(k => k !== key)
        : [...p.permissions, key],
    }));

  const toggleGroup = (group: string) => {
    const keys = PERMISSION_GROUPS.find(g => g.group === group)?.permissions.map(p => p.key) || [];
    const allOn = keys.every(k => form.permissions.includes(k));
    setForm(p => ({
      ...p,
      permissions: allOn
        ? p.permissions.filter(k => !keys.includes(k))
        : [...new Set([...p.permissions, ...keys])],
    }));
  };

  const toggleExpand = (group: string) =>
    setExpanded(p => p.includes(group) ? p.filter(g => g !== group) : [...p, group]);

  const openEdit = (role: Role) => {
    setSelectedRole(role);
    setForm({ name: role.name, display_name: role.display_name, description: role.description || "", permissions: [...role.permissions] });
    setShowEdit(true);
  };

  const openCreate = () => {
    setSelectedRole(null);
    setForm({ name: "", display_name: "", description: "", permissions: [] });
    setShowCreate(true);
  };

  const saveRole = async (isCreate: boolean) => {
    if (!form.name.trim() || !form.display_name.trim()) {
      toast.error("Name and display name are required");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const url = isCreate
        ? `${process.env.NEXT_PUBLIC_API_URL}/system-admin/roles`
        : `${process.env.NEXT_PUBLIC_API_URL}/system-admin/roles/${selectedRole?.id}`;
      const res = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(isCreate ? "Role created" : "Role updated");
        await fetchRoles();
        setShowEdit(false);
        setShowCreate(false);
      } else {
        toast.error(data.message || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/system-admin/roles/${selectedRole.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Role deleted");
        setRoles(p => p.filter(r => r.id !== selectedRole.id));
        setShowDelete(false);
      } else {
        toast.error(data.message || "Cannot delete");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const pct = (perms: string[]) => ALL_KEYS.length ? Math.round((perms.length / ALL_KEYS.length) * 100) : 0;
  const color = (name: string) => ROLE_COLORS[name] || { bg: "#f8fafc", text: "#475569" };
  const dialogOpen = showEdit || showCreate;

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform roles and permission sets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRoles} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" onClick={openCreate} style={{ backgroundColor: P }} className="text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-1.5" />New Role
          </Button>
        </div>
      </div>

      {/* Role summary tiles — purely from fetched data */}
      {!loading && roles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {roles.map(role => {
            const c = color(role.name);
            return (
              <button key={role.id} onClick={() => openEdit(role)}
                className="bg-white rounded-xl border text-left p-4 hover:shadow-md transition-all group"
                style={{ borderColor: `${c.text}25` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: c.text }}>
                    {role.display_name}
                  </span>
                  {role.is_system_role && <Lock className="w-3 h-3 text-gray-300 shrink-0" />}
                </div>
                <p className="text-2xl font-black text-gray-900">{(role.user_count || 0).toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">users</p>
                <div className="h-1 bg-gray-100 rounded-full mt-2.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct(role.permissions)}%`, backgroundColor: c.text }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{pct(role.permissions)}% permissions</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">All Roles ({filtered.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." className="pl-9 w-52" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["Role", "Type", "Permissions", "Users", "Updated", ""].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  {search ? `No results for "${search}"` : "No roles found"}
                </td></tr>
              ) : filtered.map(role => {
                const c = color(role.name);
                return (
                  <tr key={role.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.bg }}>
                          <Shield className="w-3.5 h-3.5" style={{ color: c.text }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{role.display_name}</p>
                          <p className="text-xs text-gray-400 max-w-[220px] truncate">{role.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: role.is_system_role ? "#fef3c7" : "#f0fdf4", color: role.is_system_role ? "#92400e" : "#166534" }}>
                        {role.is_system_role ? "System" : "Custom"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-600">{role.permissions.length}/{ALL_KEYS.length}</span>
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct(role.permissions)}%`, backgroundColor: c.text }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-gray-600">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {(role.user_count || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-gray-400">
                      {new Date(role.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(role)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {!role.is_system_role && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                            onClick={() => { setSelectedRole(role); setShowDelete(true); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Edit / Create — WIDE dialog ───────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setShowEdit(false); setShowCreate(false); } }}>
        <DialogContent className="!max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showCreate ? "Create New Role" : `Edit: ${selectedRole?.display_name}`}</DialogTitle>
            <DialogDescription>
              {showCreate ? "Define a new role and assign permissions." : "Update role details and permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">

            {/* Left — details */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Internal Key</label>
                <Input value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value.toUpperCase().replace(/ /g, "_") }))}
                  disabled={selectedRole?.is_system_role}
                  placeholder="ROLE_NAME" className="font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Display Name</label>
                <Input value={form.display_name}
                  onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder="Display Name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                <Input value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief role description" />
              </div>

              {/* Stats block */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Permission Coverage</span>
                  <span className="text-xs font-bold text-gray-700">{form.permissions.length}/{ALL_KEYS.length}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round((form.permissions.length / ALL_KEYS.length) * 100)}%`, backgroundColor: P }} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setForm(p => ({ ...p, permissions: [...ALL_KEYS] }))}
                    className="text-xs font-semibold text-violet-600 hover:underline">Select all</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setForm(p => ({ ...p, permissions: [] }))}
                    className="text-xs font-semibold text-gray-400 hover:underline">Clear all</button>
                </div>
              </div>

              {selectedRole && (
                <div className="flex items-center gap-2 text-sm text-gray-500 rounded-xl border border-gray-100 px-4 py-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span><strong className="text-gray-800">{(selectedRole.user_count || 0).toLocaleString()}</strong> users assigned</span>
                </div>
              )}
            </div>

            {/* Right — permissions */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Permissions</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {PERMISSION_GROUPS.map(group => {
                  const keys = group.permissions.map(p => p.key);
                  const allOn = keys.every(k => form.permissions.includes(k));
                  const someOn = keys.some(k => form.permissions.includes(k));
                  const isExpanded = expanded.includes(group.group);

                  return (
                    <div key={group.group} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/60 cursor-pointer select-none"
                        onClick={() => toggleExpand(group.group)}>
                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={allOn} onCheckedChange={() => toggleGroup(group.group)}
                            onClick={e => e.stopPropagation()}
                            className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600" />
                          <span className="text-sm font-semibold text-gray-700"
                            onClick={() => toggleExpand(group.group)}>{group.group}</span>
                          {someOn && !allOn && (
                            <span className="text-[10px] text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded">partial</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pointer-events-none">
                          <span className="text-xs text-gray-400">{keys.filter(k => form.permissions.includes(k)).length}/{keys.length}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-0.5 p-2 bg-white">
                          {group.permissions.map(perm => (
                            <label key={perm.key} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                              <Checkbox checked={form.permissions.includes(perm.key)}
                                onCheckedChange={() => togglePerm(perm.key)}
                                className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600" />
                              <span className="text-sm text-gray-600 select-none">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => { setShowEdit(false); setShowCreate(false); }}>Cancel</Button>
            <Button onClick={() => saveRole(showCreate)} disabled={saving}
              style={{ backgroundColor: P }} className="text-white hover:opacity-90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {showCreate ? "Create Role" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />Delete Role
            </DialogTitle>
            <DialogDescription>
              Delete <strong>{selectedRole?.display_name}</strong>? This cannot be undone.
              {(selectedRole?.user_count || 0) > 0 && (
                <span className="block mt-1 text-amber-600 font-medium">
                  {selectedRole.user_count} users currently have this role.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteRole} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}