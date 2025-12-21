"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  GraduationCap, Search, MoreVertical, Trash2, Eye, RefreshCw,
  Building2, Loader2, ChevronLeft, ChevronRight, BookOpen,
  CheckCircle2, XCircle, Filter, TrendingUp, Clock, Award,
  Download, BarChart3,
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
import { Progress } from "@/components/ui/progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const PAGE_SIZE = 15;

interface StudentMember {
  member_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  enrolled_courses?: number;
  completed_courses?: number;
  avg_progress?: number;
  total_learning_hours?: number;
  certificates_earned?: number;
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
  };
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading, token: reduxToken } = useAppSelector(
    (state) => state.bwengeAuth
  );

  const urlInstitutionId = searchParams.get("institution");
  const institutionId = urlInstitutionId || authUser?.primary_institution_id || undefined;

  const [students, setStudents] = useState<StudentMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [stats, setStats] = useState({
    total: 0, active: 0, total_enrollments: 0,
    avg_completion: 0, total_hours: 0, certificates: 0,
  });

  const [viewStudent, setViewStudent] = useState<StudentMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StudentMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getToken = useCallback(() => reduxToken || Cookies.get("bwenge_token") || "", [reduxToken]);

  const hasAccess = !authLoading && authUser?.is_institution_member &&
    institutionId &&
    (authUser?.institution_ids ?? []).includes(institutionId) &&
    authUser?.institution_role === "ADMIN";

  const fetchStudents = useCallback(async () => {
    if (!institutionId || !hasAccess) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ role: "MEMBER" });
      if (statusFilter !== "ALL") params.set("is_active", statusFilter === "ACTIVE" ? "true" : "false");
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`${API_URL}/institutions/${institutionId}/members?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        const list: StudentMember[] = data.data?.members || data.data || [];
        setStudents(list);
        setTotalCount(data.data?.total || list.length);
        setTotalPages(Math.ceil((data.data?.total || list.length) / PAGE_SIZE));
        setStats({
          total: data.data?.total || list.length,
          active: list.filter(s => s.is_active).length,
          total_enrollments: list.reduce((a, s) => a + (s.enrolled_courses || 0), 0),
          avg_completion: list.length > 0
            ? Math.round(list.reduce((a, s) => a + (s.avg_progress || 0), 0) / list.length)
            : 0,
          total_hours: list.reduce((a, s) => a + (s.total_learning_hours || 0), 0),
          certificates: list.reduce((a, s) => a + (s.certificates_earned || 0), 0),
        });
      } else {
        toast.error(data.message || "Failed to load students");
      }
    } catch {
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, hasAccess, statusFilter, search, page, getToken]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

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
        toast.success("Student removed successfully!");
        setRemoveTarget(null);
        fetchStudents();
      } else {
        toast.error(data.message || "Failed to remove student");
      }
    } catch {
      toast.error("Failed to remove student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Enrolled Courses", "Completed", "Avg Progress", "Hours", "Certificates", "Status"];
    const rows = students.map(s => [
      `${s.user.first_name} ${s.user.last_name}`,
      s.user.email,
      s.enrolled_courses ?? 0,
      s.completed_courses ?? 0,
      `${s.avg_progress ?? 0}%`,
      s.total_learning_hours ?? 0,
      s.certificates_earned ?? 0,
      s.is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `students-${institutionId}.csv`; a.click();
    URL.revokeObjectURL(url);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-amber-600" /> Students
          </h1>
          <p className="text-gray-500 mt-1">Track and manage your institution's learners</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStudents} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href={`/dashboard/institution-admin/users/invite${institutionId ? `?institution=${institutionId}` : ""}`}>
              Invite Students
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, icon: GraduationCap, color: "text-amber-600 bg-amber-50" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "Enrollments", value: stats.total_enrollments, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
          { label: "Avg Progress", value: `${stats.avg_completion}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
          { label: "Learning Hours", value: stats.total_hours, icon: Clock, color: "text-indigo-600 bg-indigo-50" },
          { label: "Certificates", value: stats.certificates, icon: Award, color: "text-rose-600 bg-rose-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
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
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search students..." value={search}
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
            <p className="text-sm text-gray-500">{totalCount} students</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : students.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No students found</p>
              <p className="text-sm text-gray-400 mt-1">Invite students to join your institution.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="pl-6">Student</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Certificates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => (
                      <TableRow key={student.member_id} className="hover:bg-gray-50">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={student.user.profile_picture_url} />
                              <AvatarFallback className="text-xs font-semibold bg-amber-50 text-amber-700">
                                {student.user.first_name?.[0]}{student.user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{student.user.first_name} {student.user.last_name}</p>
                              <p className="text-xs text-gray-500">{student.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {student.enrolled_courses ?? 0} enrolled
                            </Badge>
                            {(student.completed_courses ?? 0) > 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                {student.completed_courses} done
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24 space-y-1">
                            <Progress value={student.avg_progress ?? 0} className="h-2" />
                            <p className="text-xs text-gray-500">{student.avg_progress ?? 0}%</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{student.total_learning_hours ?? 0}h
                          </span>
                        </TableCell>
                        <TableCell>
                          {(student.certificates_earned ?? 0) > 0 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              <Award className="w-3 h-3 mr-1" />{student.certificates_earned}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.is_active
                            ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {student.user.last_login ? new Date(student.user.last_login).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setViewStudent(student)}>
                                <Eye className="w-4 h-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => setRemoveTarget(student)}>
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
                <p className="text-sm text-gray-500">Page {page} of {totalPages} · {totalCount} students</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Student Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Student Profile</DialogTitle></DialogHeader>
          {viewStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={viewStudent.user.profile_picture_url} />
                  <AvatarFallback className="text-lg bg-amber-50 text-amber-700">
                    {viewStudent.user.first_name?.[0]}{viewStudent.user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{viewStudent.user.first_name} {viewStudent.user.last_name}</h3>
                  <p className="text-sm text-gray-500">{viewStudent.user.email}</p>
                  <Badge className="bg-amber-100 text-amber-700 mt-1 text-xs">Student</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Enrolled Courses", String(viewStudent.enrolled_courses ?? 0)],
                  ["Completed", String(viewStudent.completed_courses ?? 0)],
                  ["Avg Progress", `${viewStudent.avg_progress ?? 0}%`],
                  ["Learning Hours", `${viewStudent.total_learning_hours ?? 0}h`],
                  ["Certificates", String(viewStudent.certificates_earned ?? 0)],
                  ["Country", viewStudent.user.country || "—"],
                  ["Joined", new Date(viewStudent.joined_at).toLocaleDateString()],
                  ["Last Login", viewStudent.user.last_login ? new Date(viewStudent.user.last_login).toLocaleDateString() : "Never"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <Label className="text-gray-400 text-xs">{label}</Label>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Overall Progress</Label>
                <Progress value={viewStudent.avg_progress ?? 0} className="h-3" />
                <p className="text-xs text-gray-500 mt-1">{viewStudent.avg_progress ?? 0}% average completion</p>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewStudent(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>Remove <strong>{removeTarget?.user.first_name} {removeTarget?.user.last_name}</strong> from the institution?</DialogDescription>
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