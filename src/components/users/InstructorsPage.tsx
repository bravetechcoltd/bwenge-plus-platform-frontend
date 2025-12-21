"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  UserCog, Search, MoreVertical, Trash2, Eye, RefreshCw,
  Building2, Loader2, ChevronLeft, ChevronRight, UserPlus,
  BookOpen, Star, CheckCircle2, XCircle, Mail, Phone,
  Download, Filter, Send,
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const PAGE_SIZE = 15;

interface InstructorMember {
  member_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  courses_count?: number;
  average_rating?: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    profile_picture_url?: string;
    bio?: string;
    account_type: string;
    is_verified: boolean;
    is_active: boolean;
    date_joined: string;
    last_login?: string;
    country?: string;
  };
}

export default function InstructorsPage() {
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading, token: reduxToken } = useAppSelector(
    (state) => state.bwengeAuth
  );

  const urlInstitutionId = searchParams.get("institution");
  const institutionId = urlInstitutionId || authUser?.primary_institution_id || undefined;

  const [instructors, setInstructors] = useState<InstructorMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, total_courses: 0, avg_rating: 0 });

  // Dialogs
  const [viewInstructor, setViewInstructor] = useState<InstructorMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<InstructorMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: "", first_name: "", last_name: "", phone: "", message: "",
  });

  // Promote from existing form
  const [promoteEmail, setPromoteEmail] = useState("");

  const getToken = useCallback(() => reduxToken || Cookies.get("bwenge_token") || "", [reduxToken]);

  const hasAccess = !authLoading && authUser?.is_institution_member &&
    institutionId &&
    (authUser?.institution_ids ?? []).includes(institutionId) &&
    authUser?.institution_role === "ADMIN";

  const fetchInstructors = useCallback(async () => {
    if (!institutionId || !hasAccess) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ role: "INSTRUCTOR" });
      if (statusFilter !== "ALL") params.set("is_active", statusFilter === "ACTIVE" ? "true" : "false");
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`${API_URL}/institutions/${institutionId}/members?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        const list: InstructorMember[] = data.data?.members || data.data || [];
        setInstructors(list);
        setTotalCount(data.data?.total || list.length);
        setTotalPages(Math.ceil((data.data?.total || list.length) / PAGE_SIZE));
        setStats({
          total: data.data?.total || list.length,
          active: list.filter(i => i.is_active).length,
          total_courses: list.reduce((a, i) => a + (i.courses_count || 0), 0),
          avg_rating: list.length > 0
            ? +(list.reduce((a, i) => a + (i.average_rating || 0), 0) / list.length).toFixed(1)
            : 0,
        });
      } else {
        toast.error(data.message || "Failed to load instructors");
      }
    } catch {
      toast.error("Failed to load instructors");
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, hasAccess, statusFilter, search, page, getToken]);

  useEffect(() => { fetchInstructors(); }, [fetchInstructors]);

  const handleInviteInstructor = async () => {
    if (!inviteForm.email || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...inviteForm, role: "INSTRUCTOR" }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success(`Invitation sent to ${inviteForm.email}`);
        setInviteOpen(false);
        setInviteForm({ email: "", first_name: "", last_name: "", phone: "", message: "" });
        fetchInstructors();
      } else {
        toast.error(data.message || "Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromoteToInstructor = async () => {
    if (!promoteEmail || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/members/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: promoteEmail, role: "INSTRUCTOR" }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("User promoted to Instructor!");
        setPromoteOpen(false);
        setPromoteEmail("");
        fetchInstructors();
      } else {
        toast.error(data.message || "Failed to promote user");
      }
    } catch {
      toast.error("Failed to promote user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/members/${removeTarget.user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("Instructor removed successfully!");
        setRemoveTarget(null);
        fetchInstructors();
      } else {
        toast.error(data.message || "Failed to remove instructor");
      }
    } catch {
      toast.error("Failed to remove instructor");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !authUser) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!authLoading && !hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-8 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">You don't have admin access to this institution.</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-7 h-7 text-green-600" /> Instructors
          </h1>
          <p className="text-gray-500 mt-1">Manage and invite instructors for your institution</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchInstructors} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPromoteOpen(true)}>
            <UserCog className="w-4 h-4 mr-2" /> Promote Existing
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Invite Instructor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Instructors", value: stats.total, icon: UserCog, color: "text-green-600 bg-green-50" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-blue-600 bg-blue-50" },
          { label: "Total Courses", value: stats.total_courses, icon: BookOpen, color: "text-purple-600 bg-purple-50" },
          { label: "Avg Rating", value: stats.avg_rating > 0 ? `${stats.avg_rating} ★` : "—", icon: Star, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search instructors..." value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-500">{totalCount} instructors</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : instructors.length === 0 ? (
            <div className="text-center py-16">
              <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No instructors found</p>
              <p className="text-sm text-gray-400 mt-1">Invite instructors to start creating courses.</p>
              <Button className="mt-4" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Invite Instructor
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="pl-6">Instructor</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map(inst => (
                      <TableRow key={inst.member_id} className="hover:bg-gray-50">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={inst.user.profile_picture_url} />
                              <AvatarFallback className="text-xs font-semibold bg-green-50 text-green-700">
                                {inst.user.first_name?.[0]}{inst.user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{inst.user.first_name} {inst.user.last_name}</p>
                              <p className="text-xs text-gray-500">{inst.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{inst.user.email}
                            </span>
                            {inst.user.phone_number && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />{inst.user.phone_number}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <BookOpen className="w-3 h-3 mr-1" />{inst.courses_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inst.average_rating
                            ? <span className="text-sm font-medium text-amber-600">★ {inst.average_rating.toFixed(1)}</span>
                            : <span className="text-xs text-gray-400">No ratings</span>
                          }
                        </TableCell>
                        <TableCell>
                          {inst.is_active
                            ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{new Date(inst.joined_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setViewInstructor(inst)}>
                                <Eye className="w-4 h-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/institution-admin/${institutionId}/courses?instructor=${inst.user.id}`}>
                                  <BookOpen className="w-4 h-4 mr-2" /> View Courses
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => setRemoveTarget(inst)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-gray-500">Page {page} of {totalPages} · {totalCount} instructors</p>
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

      {/* View Instructor Dialog */}
      <Dialog open={!!viewInstructor} onOpenChange={() => setViewInstructor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Instructor Profile</DialogTitle></DialogHeader>
          {viewInstructor && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={viewInstructor.user.profile_picture_url} />
                  <AvatarFallback className="text-lg bg-green-50 text-green-700">
                    {viewInstructor.user.first_name?.[0]}{viewInstructor.user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{viewInstructor.user.first_name} {viewInstructor.user.last_name}</h3>
                  <p className="text-sm text-gray-500">{viewInstructor.user.email}</p>
                  <Badge className="bg-green-100 text-green-700 mt-1 text-xs">Instructor</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Phone", viewInstructor.user.phone_number || "—"],
                  ["Country", viewInstructor.user.country || "—"],
                  ["Courses", String(viewInstructor.courses_count ?? 0)],
                  ["Rating", viewInstructor.average_rating ? `★ ${viewInstructor.average_rating.toFixed(1)}` : "—"],
                  ["Joined", new Date(viewInstructor.joined_at).toLocaleDateString()],
                  ["Status", viewInstructor.is_active ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <Label className="text-gray-400 text-xs">{label}</Label>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {viewInstructor.user.bio && (
                <div>
                  <Label className="text-gray-400 text-xs">Bio</Label>
                  <p className="text-sm text-gray-700 mt-0.5">{viewInstructor.user.bio}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewInstructor(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Instructor Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Instructor</DialogTitle>
            <DialogDescription>Send an invitation to a new instructor to join your institution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="i-first">First Name <span className="text-red-500">*</span></Label>
                <Input id="i-first" value={inviteForm.first_name}
                  onChange={e => setInviteForm(f => ({ ...f, first_name: e.target.value }))} placeholder="John" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-last">Last Name</Label>
                <Input id="i-last" value={inviteForm.last_name}
                  onChange={e => setInviteForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-email">Email Address <span className="text-red-500">*</span></Label>
              <Input id="i-email" type="email" value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="instructor@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-phone">Phone (Optional)</Label>
              <Input id="i-phone" type="tel" value={inviteForm.phone}
                onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))} placeholder="+250 xxx xxx xxx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-msg">Personal Message (Optional)</Label>
              <Textarea id="i-msg" value={inviteForm.message}
                onChange={e => setInviteForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Add a personal message to your invitation..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInviteInstructor} disabled={isSubmitting || !inviteForm.email || !inviteForm.first_name}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Promote to Instructor</DialogTitle>
            <DialogDescription>Change an existing member's role to Instructor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Member Email</Label>
            <Input type="email" value={promoteEmail} onChange={e => setPromoteEmail(e.target.value)}
              placeholder="member@example.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>Cancel</Button>
            <Button onClick={handlePromoteToInstructor} disabled={isSubmitting || !promoteEmail}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCog className="w-4 h-4 mr-2" />}
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Instructor</DialogTitle>
            <DialogDescription>
              Remove <strong>{removeTarget?.user.first_name} {removeTarget?.user.last_name}</strong> as an instructor? They will lose instructor privileges.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}