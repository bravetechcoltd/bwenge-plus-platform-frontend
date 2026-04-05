
// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  UserCog, Search, MoreVertical, Trash2, Eye, RefreshCw,
  Building2, Loader2, ChevronLeft, ChevronRight, UserPlus,
  BookOpen, Star, CheckCircle2, XCircle, Mail, Phone,
  Download, Filter, Send, TrendingUp, Calendar, X,
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
import { AnimatePresence, motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const PAGE_SIZE = 15;

interface InstructorCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  enrollment_count: number;
  completion_rate: string;
  average_rating: number;
  is_primary_instructor: boolean;
  source: string;
}

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
    city?: string;
    enrolled_courses_count?: number;
    completed_courses_count?: number;
    total_learning_hours?: number;
    certificates_earned?: number;
    courses_count?: number;
    courses?: InstructorCourse[];
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
        
        // Process instructors to ensure courses_count is properly set from backend
        const processedList = list.map(instructor => ({
          ...instructor,
          // Use courses_count from user object if available, otherwise calculate from courses array
          courses_count: instructor.user?.courses_count ?? instructor.user?.courses?.length ?? 0,
          average_rating: instructor.user?.courses?.reduce((sum, course) => sum + (course.average_rating || 0), 0) / 
            (instructor.user?.courses?.length || 1) || 0,
        }));
        
        setInstructors(processedList);
        setTotalCount(data.data?.total || list.length);
        setTotalPages(Math.ceil((data.data?.total || list.length) / PAGE_SIZE));
        
        // Calculate stats from processed instructors
        const totalCourses = processedList.reduce((sum, i) => sum + (i.courses_count || 0), 0);
        const avgRating = processedList.length > 0
          ? +(processedList.reduce((sum, i) => sum + (i.average_rating || 0), 0) / processedList.length).toFixed(1)
          : 0;
          
        setStats({
          total: data.data?.total || list.length,
          active: processedList.filter(i => i.is_active).length,
          total_courses: totalCourses,
          avg_rating: avgRating,
        });
      } else {
        toast.error(data.message || "Failed to load instructors");
      }
    } catch (error) {
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
            <UserCog className="w-7 h-7 text-success" /> Instructors
          </h1>
          <p className="text-muted-foreground mt-1">Manage and invite instructors for your institution</p>
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
          { label: "Total Instructors", value: stats.total, icon: UserCog, color: "text-success bg-success/10" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-primary bg-primary/10" },
          { label: "Total Courses", value: stats.total_courses, icon: BookOpen, color: "text-primary bg-primary/10" },
          { label: "Avg Rating", value: stats.avg_rating > 0 ? `${stats.avg_rating} ★` : "—", icon: Star, color: "text-warning bg-warning/10" },
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
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
            <p className="text-sm text-muted-foreground">{totalCount} instructors</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : instructors.length === 0 ? (
            <div className="text-center py-16">
              <UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No instructors found</p>
              <p className="text-sm text-muted-foreground mt-1">Invite instructors to start creating courses.</p>
              <Button className="mt-4" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Invite Instructor
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Instructor</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-center">Courses</TableHead>
                      <TableHead className="text-center">Rating</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map(inst => (
                      <TableRow key={inst.member_id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={inst.user.profile_picture_url} />
                              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-green-500 to-green-700 text-white">
                                {inst.user.first_name?.[0]}{inst.user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{inst.user.first_name} {inst.user.last_name}</p>
                              <p className="text-xs text-muted-foreground">{inst.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {inst.user.phone_number && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />{inst.user.phone_number}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />{inst.user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-3 py-1">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {inst.courses_count ?? inst.user?.courses_count ?? inst.user?.courses?.length ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {inst.average_rating && inst.average_rating > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-4 h-4 text-warning fill-amber-500" />
                              <span className="text-sm font-medium text-warning">{inst.average_rating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No ratings</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {inst.is_active
                            ? <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs px-2 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs px-2 py-0.5"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {new Date(inst.joined_at).toLocaleDateString()}
                          </div>
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
                              <DropdownMenuItem onClick={() => setViewInstructor(inst)}>
                                <Eye className="w-4 h-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/institution-admin/${institutionId}/courses?instructor=${inst.user.id}`}>
                                  <BookOpen className="w-4 h-4 mr-2" /> View Courses ({inst.courses_count ?? 0})
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setRemoveTarget(inst)}>
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
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {totalCount} instructors</p>
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

      {/* View Instructor Modal */}
      <AnimatePresence>
        {viewInstructor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setViewInstructor(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-card/20 rounded-xl flex items-center justify-center overflow-hidden">
                    {viewInstructor.user.profile_picture_url ? (
                      <img
                        src={viewInstructor.user.profile_picture_url}
                        alt={viewInstructor.user.first_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {viewInstructor.user.first_name?.[0]}
                        {viewInstructor.user.last_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">
                      {viewInstructor.user.first_name} {viewInstructor.user.last_name}
                    </h2>
                    <p className="text-xs text-white/80">{viewInstructor.user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewInstructor(null)}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-card/15 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Identity */}
                <div className="mb-4">
                  <div className="bg-success/10 px-3 py-1.5 rounded-t-lg">
                    <span className="text-xs font-bold text-success uppercase tracking-wider">Identity</span>
                  </div>
                  <div className="bg-card border border-border rounded-b-lg px-3 py-2 divide-y divide-gray-100">
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Full Name</span>
                      <span className="text-xs font-semibold text-foreground">
                        {viewInstructor.user.first_name} {viewInstructor.user.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Username</span>
                      <span className="text-xs font-semibold text-foreground">
                        @{viewInstructor.user.username || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Email</span>
                      <span className="text-xs font-semibold text-foreground">{viewInstructor.user.email}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Phone</span>
                      <span className="text-xs font-semibold text-foreground">
                        {viewInstructor.user.phone_number || "—"}
                      </span>
                    </div>
                    {(viewInstructor.user.country || viewInstructor.user.city) && (
                      <div className="flex justify-between py-2">
                        <span className="text-xs text-muted-foreground font-medium">Location</span>
                        <span className="text-xs font-semibold text-foreground">
                          {[viewInstructor.user.city, viewInstructor.user.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Institution Membership */}
                <div className="mb-4">
                  <div className="bg-success/10 px-3 py-1.5 rounded-t-lg">
                    <span className="text-xs font-bold text-success uppercase tracking-wider">Institution Membership</span>
                  </div>
                  <div className="bg-card border border-border rounded-b-lg px-3 py-2 divide-y divide-gray-100">
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Institution Role</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success`}>
                        Instructor
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Membership Status</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${viewInstructor.is_active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                        {viewInstructor.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Courses Created</span>
                      <span className="text-xs font-semibold text-foreground">
                        {viewInstructor.courses_count ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Joined</span>
                      <span className="text-xs font-semibold text-foreground">
                        {new Date(viewInstructor.joined_at).toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="mb-4">
                  <div className="bg-success/10 px-3 py-1.5 rounded-t-lg">
                    <span className="text-xs font-bold text-success uppercase tracking-wider">Account Details</span>
                  </div>
                  <div className="bg-card border border-border rounded-b-lg px-3 py-2 divide-y divide-gray-100">
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Account Type</span>
                      <span className="text-xs font-semibold text-foreground capitalize">
                        {viewInstructor.user.account_type?.replace(/_/g, " ").toLowerCase() || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Platform Role</span>
                      <span className="text-xs font-semibold text-foreground capitalize">
                        {viewInstructor.user.bwenge_role?.replace(/_/g, " ").toLowerCase() || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Verified</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${viewInstructor.user.is_verified ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                        {viewInstructor.user.is_verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Account Status</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${viewInstructor.user.is_active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                        {viewInstructor.user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Date Joined Platform</span>
                      <span className="text-xs font-semibold text-foreground">
                        {viewInstructor.user.date_joined
                          ? new Date(viewInstructor.user.date_joined).toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">Last Login</span>
                      <span className="text-xs font-semibold text-foreground">
                        {viewInstructor.user.last_login
                          ? new Date(viewInstructor.user.last_login).toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })
                          : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Courses */}
                {viewInstructor.user?.courses && viewInstructor.user.courses.length > 0 && (
                  <div className="mb-4">
                    <div className="bg-success/10 px-3 py-1.5 rounded-t-lg">
                      <span className="text-xs font-bold text-success uppercase tracking-wider">Courses ({viewInstructor.user.courses.length})</span>
                    </div>
                    <div className="bg-card border border-border rounded-b-lg px-3 py-2">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {viewInstructor.user.courses.slice(0, 3).map((course) => (
                          <div key={course.id} className="flex items-center justify-between py-1">
                            <span className="text-xs font-medium text-foreground truncate flex-1 mr-2">{course.title}</span>
                            <Badge variant="outline" className="text-xs bg-success/10 text-success">
                              {course.status === "PUBLISHED" ? "Published" : course.status}
                            </Badge>
                          </div>
                        ))}
                        {viewInstructor.user.courses.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{viewInstructor.user.courses.length - 3} more courses
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bio */}
                {viewInstructor.user.bio && (
                  <div className="mb-4">
                    <div className="bg-success/10 px-3 py-1.5 rounded-t-lg">
                      <span className="text-xs font-bold text-success uppercase tracking-wider">Bio</span>
                    </div>
                    <div className="bg-card border border-border rounded-b-lg px-3 py-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">{viewInstructor.user.bio}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 bg-muted/50 border-t border-border px-5 py-3 flex items-center justify-end">
                <button
                  onClick={() => setViewInstructor(null)}
                  className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <Label htmlFor="i-first">First Name <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="i-email">Email Address <span className="text-destructive">*</span></Label>
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