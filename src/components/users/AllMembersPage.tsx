"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  Users, Search, Filter, MoreVertical, Trash2, Eye,
  RefreshCw, UserCog, Shield, CheckCircle2, XCircle,
  Building2, Loader2, ChevronLeft, ChevronRight,
  UserCheck, UserX, Download, SlidersHorizontal,
  GraduationCap, Users2, Crown,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const PAGE_SIZE = 15;

enum InstitutionMemberRole {
  ADMIN = "ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  MEMBER = "MEMBER",
}

interface MemberUser {
  id: string;
  email: string;
  username?: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_picture_url?: string;
  bio?: string;
  account_type: string;
  bwenge_role: string;
  is_verified: boolean;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  country?: string;
  city?: string;
}

interface Member {
  member_id: string;
  role: InstitutionMemberRole;
  is_active: boolean;
  joined_at: string;
  additional_permissions?: any;
  user: MemberUser;
}

interface Stats {
  total: number;
  active: number;
  admins: number;
  instructors: number;
  content_creators: number;
  members: number;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN": return "bg-primary/15 text-primary border-primary/30";
    case "CONTENT_CREATOR": return "bg-primary/15 text-primary border-primary/30";
    case "INSTRUCTOR": return "bg-success/15 text-success border-success/30";
    case "MEMBER": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case "ADMIN": return <Crown className="w-3 h-3 mr-1" />;
    case "INSTRUCTOR": return <UserCog className="w-3 h-3 mr-1" />;
    case "CONTENT_CREATOR": return <Users2 className="w-3 h-3 mr-1" />;
    default: return <GraduationCap className="w-3 h-3 mr-1" />;
  }
};

export default function AllMembersPage() {
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading, token: reduxToken } = useAppSelector(
    (state) => state.bwengeAuth
  );

  const urlInstitutionId = searchParams.get("institution");
  const institutionId = urlInstitutionId || authUser?.primary_institution_id || undefined;

  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, admins: 0, instructors: 0, content_creators: 0, members: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialogs
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [changeRoleMember, setChangeRoleMember] = useState<Member | null>(null);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getToken = useCallback(() => reduxToken || Cookies.get("bwenge_token") || "", [reduxToken]);

  const hasAccess = !authLoading && authUser?.is_institution_member &&
    institutionId &&
    (authUser?.institution_ids ?? []).includes(institutionId) &&
    authUser?.institution_role === "ADMIN";

  const fetchMembers = useCallback(async () => {
    if (!institutionId || !hasAccess) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("is_active", statusFilter === "ACTIVE" ? "true" : "false");
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(
        `${API_URL}/institutions/${institutionId}/members?${params.toString()}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (data.success) {
        const membersData: Member[] = data.data?.members || data.data || [];
        setMembers(membersData);
        setTotalCount(data.data?.total || membersData.length);
        setTotalPages(Math.ceil((data.data?.total || membersData.length) / PAGE_SIZE));

        // Calculate stats from data
        const all: Member[] = data.data?.all_members || membersData;
        setStats({
          total: data.data?.total || membersData.length,
          active: all.filter(m => m.is_active).length || data.data?.stats?.active || 0,
          admins: all.filter(m => m.role === "ADMIN").length || data.data?.stats?.admins || 0,
          instructors: all.filter(m => m.role === "INSTRUCTOR").length || data.data?.stats?.instructors || 0,
          content_creators: all.filter(m => m.role === "CONTENT_CREATOR").length || data.data?.stats?.content_creators || 0,
          members: all.filter(m => m.role === "MEMBER").length || data.data?.stats?.members || 0,
        });
      } else {
        toast.error(data.message || "Failed to load members");
      }
    } catch (err) {
      toast.error("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, hasAccess, roleFilter, statusFilter, search, page, getToken]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async () => {
    if (!changeRoleMember || !newRole || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/institutions/${institutionId}/members/${changeRoleMember.user.id}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ role: newRole }),
        }
      );
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("Role updated successfully!");
        setChangeRoleMember(null);
        setNewRole("");
        fetchMembers();
      } else {
        toast.error(data.message || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/institutions/${institutionId}/members/${removeMember.user.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("Member removed successfully!");
        setRemoveMember(null);
        fetchMembers();
      } else {
        toast.error(data.message || "Failed to remove member");
      }
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status", "Joined"];
    const rows = members.map(m => [
      `${m.user.first_name} ${m.user.last_name}`,
      m.user.email,
      m.role,
      m.is_active ? "Active" : "Inactive",
      new Date(m.joined_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${institutionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading && !authUser) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!authLoading && !hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-8 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You don't have admin access to this institution.</p>
          <Button asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> All Members
          </h1>
          <p className="text-muted-foreground mt-1">Manage everyone in your institution</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMembers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href={`/dashboard/institution-admin/users/invite${institutionId ? `?institution=${institutionId}` : ""}`}>
              Invite Member
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-primary bg-primary/10" },
          { label: "Active", value: stats.active, icon: UserCheck, color: "text-success bg-success/10" },
          { label: "Admins", value: stats.admins, icon: Crown, color: "text-primary bg-primary/10" },
          { label: "Instructors", value: stats.instructors, icon: UserCog, color: "text-success bg-success/10" },
          { label: "Creators", value: stats.content_creators, icon: Users2, color: "text-primary bg-primary/10" },
          { label: "Learners", value: stats.members, icon: GraduationCap, color: "text-muted-foreground bg-muted/50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  <SelectItem value="CONTENT_CREATOR">Content Creator</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{totalCount} members found</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No members found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or invite new members.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map(member => (
                      <TableRow key={member.member_id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={member.user.profile_picture_url} alt={member.user.first_name} />
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {member.user.first_name?.[0]}{member.user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{member.user.first_name} {member.user.last_name}</p>
                              <p className="text-xs text-muted-foreground">{member.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getRoleColor(member.role)} flex items-center w-fit text-xs font-medium`}>
                            {getRoleIcon(member.role)}{member.role.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.is_active
                            ? <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{member.user.country || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.user.last_login ? new Date(member.user.last_login).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setViewMember(member)}>
                                <Eye className="w-4 h-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setChangeRoleMember(member); setNewRole(member.role); }}>
                                <UserCog className="w-4 h-4 mr-2" /> Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setRemoveMember(member)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {totalCount} total members</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Member Dialog */}
      <Dialog open={!!viewMember} onOpenChange={() => setViewMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Member Profile</DialogTitle></DialogHeader>
          {viewMember && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={viewMember.user.profile_picture_url} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {viewMember.user.first_name?.[0]}{viewMember.user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{viewMember.user.first_name} {viewMember.user.last_name}</h3>
                  <p className="text-sm text-muted-foreground">{viewMember.user.email}</p>
                  <Badge className={`${getRoleColor(viewMember.role)} mt-1 text-xs`}>{viewMember.role}</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Phone", viewMember.user.phone_number || "—"],
                  ["Country", viewMember.user.country || "—"],
                  ["City", viewMember.user.city || "—"],
                  ["Verified", viewMember.user.is_verified ? "Yes" : "No"],
                  ["Account Type", viewMember.user.account_type || "—"],
                  ["Joined", new Date(viewMember.joined_at).toLocaleDateString()],
                  ["Last Login", viewMember.user.last_login ? new Date(viewMember.user.last_login).toLocaleDateString() : "Never"],
                  ["Status", viewMember.is_active ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <Label className="text-muted-foreground text-xs">{label}</Label>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {viewMember.user.bio && (
                <div>
                  <Label className="text-muted-foreground text-xs">Bio</Label>
                  <p className="text-sm mt-0.5 text-muted-foreground">{viewMember.user.bio}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMember(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={!!changeRoleMember} onOpenChange={() => setChangeRoleMember(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Update the role for {changeRoleMember?.user.first_name} {changeRoleMember?.user.last_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label>Select New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="CONTENT_CREATOR">Content Creator</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleMember(null)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={isSubmitting || !newRole}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removeMember?.user.first_name} {removeMember?.user.last_name}</strong> from the institution? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMember(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}