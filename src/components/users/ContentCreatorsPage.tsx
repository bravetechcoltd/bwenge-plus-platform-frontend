"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  Users2, Search, MoreVertical, Trash2, Eye, RefreshCw,
  Building2, Loader2, ChevronLeft, ChevronRight, UserPlus,
  BookOpen, CheckCircle2, XCircle, Filter, Send, ArrowUpCircle,
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

interface ContentCreatorMember {
  member_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  courses_count?: number;
  published_courses?: number;
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

export default function ContentCreatorsPage() {
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading, token: reduxToken } = useAppSelector(
    (state) => state.bwengeAuth
  );

  const urlInstitutionId = searchParams.get("institution");
  const institutionId = urlInstitutionId || authUser?.primary_institution_id || undefined;

  const [creators, setCreators] = useState<ContentCreatorMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [stats, setStats] = useState({ total: 0, active: 0, total_courses: 0, published: 0 });

  const [viewCreator, setViewCreator] = useState<ContentCreatorMember | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ContentCreatorMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [promoteEmail, setPromoteEmail] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", first_name: "", last_name: "", message: "" });

  const getToken = useCallback(() => reduxToken || Cookies.get("bwenge_token") || "", [reduxToken]);

  const hasAccess = !authLoading && authUser?.is_institution_member &&
    institutionId &&
    (authUser?.institution_ids ?? []).includes(institutionId) &&
    authUser?.institution_role === "ADMIN";

  const fetchCreators = useCallback(async () => {
    if (!institutionId || !hasAccess) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ role: "CONTENT_CREATOR" });
      if (statusFilter !== "ALL") params.set("is_active", statusFilter === "ACTIVE" ? "true" : "false");
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`${API_URL}/institutions/${institutionId}/members?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        const list: ContentCreatorMember[] = data.data?.members || data.data || [];
        setCreators(list);
        setTotalCount(data.data?.total || list.length);
        setTotalPages(Math.ceil((data.data?.total || list.length) / PAGE_SIZE));
        setStats({
          total: data.data?.total || list.length,
          active: list.filter(c => c.is_active).length,
          total_courses: list.reduce((a, c) => a + (c.courses_count || 0), 0),
          published: list.reduce((a, c) => a + (c.published_courses || 0), 0),
        });
      } else {
        toast.error(data.message || "Failed to load content creators");
      }
    } catch {
      toast.error("Failed to load content creators");
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, hasAccess, statusFilter, search, page, getToken]);

  useEffect(() => { fetchCreators(); }, [fetchCreators]);

  const handlePromote = async () => {
    if (!promoteEmail || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/members/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: promoteEmail, role: "CONTENT_CREATOR" }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("User promoted to Content Creator!");
        setPromoteOpen(false);
        setPromoteEmail("");
        fetchCreators();
      } else {
        toast.error(data.message || "Failed to promote user");
      }
    } catch {
      toast.error("Failed to promote user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...inviteForm, role: "CONTENT_CREATOR" }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success(`Invitation sent to ${inviteForm.email}`);
        setInviteOpen(false);
        setInviteForm({ email: "", first_name: "", last_name: "", message: "" });
        fetchCreators();
      } else {
        toast.error(data.message || "Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
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
        toast.success("Content creator removed!");
        setRemoveTarget(null);
        fetchCreators();
      } else {
        toast.error(data.message || "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users2 className="w-7 h-7 text-primary" /> Content Creators
          </h1>
          <p className="text-muted-foreground mt-1">Manage content creators who build course materials</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCreators} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPromoteOpen(true)}>
            <ArrowUpCircle className="w-4 h-4 mr-2" /> Promote Member
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Invite Creator
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Creators", value: stats.total, icon: Users2, color: "text-primary bg-primary/10" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-success bg-success/10" },
          { label: "Courses Created", value: stats.total_courses, icon: BookOpen, color: "text-primary bg-primary/10" },
          { label: "Published", value: stats.published, icon: CheckCircle2, color: "text-warning bg-warning/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search content creators..." value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{totalCount} content creators</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : creators.length === 0 ? (
            <div className="text-center py-16">
              <Users2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No content creators yet</p>
              <p className="text-sm text-muted-foreground mt-1">Promote existing members or invite new content creators.</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" onClick={() => setPromoteOpen(true)}>
                  <ArrowUpCircle className="w-4 h-4 mr-2" /> Promote Member
                </Button>
                <Button onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Invite Creator
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Content Creator</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creators.map(creator => (
                      <TableRow key={creator.member_id} className="hover:bg-muted/50">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={creator.user.profile_picture_url} />
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {creator.user.first_name?.[0]}{creator.user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{creator.user.first_name} {creator.user.last_name}</p>
                              <p className="text-xs text-muted-foreground">{creator.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            <BookOpen className="w-3 h-3 mr-1" />{creator.courses_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            {creator.published_courses ?? 0} published
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {creator.is_active
                            ? <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {creator.user.last_login ? new Date(creator.user.last_login).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(creator.joined_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setViewCreator(creator)}>
                                <Eye className="w-4 h-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setRemoveTarget(creator)}>
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
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {totalCount} total</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewCreator} onOpenChange={() => setViewCreator(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Content Creator Profile</DialogTitle></DialogHeader>
          {viewCreator && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={viewCreator.user.profile_picture_url} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {viewCreator.user.first_name?.[0]}{viewCreator.user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{viewCreator.user.first_name} {viewCreator.user.last_name}</h3>
                  <p className="text-sm text-muted-foreground">{viewCreator.user.email}</p>
                  <Badge className="bg-primary/15 text-primary mt-1 text-xs">Content Creator</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Courses Created", String(viewCreator.courses_count ?? 0)],
                  ["Published", String(viewCreator.published_courses ?? 0)],
                  ["Country", viewCreator.user.country || "—"],
                  ["Joined", new Date(viewCreator.joined_at).toLocaleDateString()],
                  ["Last Login", viewCreator.user.last_login ? new Date(viewCreator.user.last_login).toLocaleDateString() : "Never"],
                  ["Status", viewCreator.is_active ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <Label className="text-muted-foreground text-xs">{label}</Label>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {viewCreator.user.bio && (
                <div>
                  <Label className="text-muted-foreground text-xs">Bio</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">{viewCreator.user.bio}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewCreator(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Promote to Content Creator</DialogTitle>
            <DialogDescription>Change an existing member's role to Content Creator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Member Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={promoteEmail} onChange={e => setPromoteEmail(e.target.value)} placeholder="member@example.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>Cancel</Button>
            <Button onClick={handlePromote} disabled={isSubmitting || !promoteEmail}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Content Creator</DialogTitle>
            <DialogDescription>Send an invitation to a new content creator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={inviteForm.first_name} onChange={e => setInviteForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Jane" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={inviteForm.last_name} onChange={e => setInviteForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="creator@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Personal Message</Label>
              <Textarea value={inviteForm.message} onChange={e => setInviteForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="Optional personal message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={isSubmitting || !inviteForm.email || !inviteForm.first_name}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Content Creator</DialogTitle>
            <DialogDescription>Remove <strong>{removeTarget?.user.first_name} {removeTarget?.user.last_name}</strong> as a content creator?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}