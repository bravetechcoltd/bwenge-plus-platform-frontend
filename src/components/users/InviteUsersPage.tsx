"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  UserPlus, Mail, Copy, Check, RefreshCw, Building2, Loader2,
  Send, Trash2, Clock, CheckCircle2, XCircle, LinkIcon,
  Users, UserCog, Users2, GraduationCap, Crown, MoreVertical,
  PlusCircle, AlertCircle, ChevronDown, ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  invited_by?: string;
  invited_by_name?: string;
  created_at: string;
  expires_at?: string;
  message?: string;
}

interface InviteFormEntry {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  message: string;
}

const ROLE_OPTIONS = [
  { value: "MEMBER", label: "Member / Student", icon: GraduationCap, description: "Access courses and learning materials", color: "text-gray-600 bg-gray-50 border-gray-200" },
  { value: "INSTRUCTOR", label: "Instructor", icon: UserCog, description: "Create and teach courses", color: "text-green-600 bg-green-50 border-green-200" },
  { value: "ADMIN", label: "Administrator", icon: Crown, description: "Full institution management access", color: "text-purple-600 bg-purple-50 border-purple-200" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "ACCEPTED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Accepted</Badge>;
    case "EXPIRED": return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    case "CANCELLED": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    default: return null;
  }
};

const getRoleColor = (role: string) =>
  ROLE_OPTIONS.find(r => r.value === role)?.color || "text-gray-600 bg-gray-50 border-gray-200";

export default function InviteUsersPage() {
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading, token: reduxToken } = useAppSelector(
    (state) => state.bwengeAuth
  );

  const urlInstitutionId = searchParams.get("institution");
  const institutionId = urlInstitutionId || authUser?.primary_institution_id || undefined;

  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single invite form
  const [singleForm, setSingleForm] = useState<InviteFormEntry>({
    email: "", first_name: "", last_name: "", role: "MEMBER", message: "",
  });

  // Multi invite (multiple emails)
  const [multiEmails, setMultiEmails] = useState("");
  const [multiRole, setMultiRole] = useState("MEMBER");
  const [multiMessage, setMultiMessage] = useState("");

  // Invite link
  const [inviteLinks, setInviteLinks] = useState<{ [role: string]: string }>({});
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Cancel invite
  const [cancelTarget, setCancelTarget] = useState<PendingInvitation | null>(null);

  const getToken = useCallback(() => reduxToken || Cookies.get("bwenge_token") || "", [reduxToken]);

  const hasAccess = !authLoading && authUser?.is_institution_member &&
    institutionId &&
    (authUser?.institution_ids ?? []).includes(institutionId) &&
    authUser?.institution_role === "ADMIN";

  const fetchInvitations = useCallback(async () => {
    if (!institutionId || !hasAccess) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invitations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setPendingInvites(data.data?.invitations || data.data || []);
      }
    } catch {
      // silently fail if invitations endpoint doesn't exist yet
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, hasAccess, getToken]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  const handleSingleInvite = async () => {
    if (!singleForm.email || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(singleForm),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success(`Invitation sent to ${singleForm.email}!`);
        setSingleForm({ email: "", first_name: "", last_name: "", role: "MEMBER", message: "" });
        fetchInvitations();
      } else {
        toast.error(data.message || "Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMultiInvite = async () => {
    if (!multiEmails.trim() || !institutionId) return;
    const emails = multiEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes("@"));

    if (emails.length === 0) {
      toast.error("Please enter valid email addresses");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invite/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ emails, role: multiRole, message: multiMessage }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success(`${emails.length} invitation(s) sent!`);
        setMultiEmails("");
        setMultiMessage("");
        fetchInvitations();
      } else {
        toast.error(data.message || "Failed to send invitations");
      }
    } catch {
      toast.error("Failed to send invitations");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateInviteLink = async (role: string) => {
    if (!institutionId) return;
    setGeneratingLink(role);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        const link = data.data?.link || data.data?.invite_link || data.link || "";
        setInviteLinks(prev => ({ ...prev, [role]: link }));
        toast.success("Invite link generated!");
      } else {
        toast.error(data.message || "Failed to generate invite link");
      }
    } catch {
      toast.error("Failed to generate invite link");
    } finally {
      setGeneratingLink(null);
    }
  };

  const copyLink = async (link: string, role: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(role);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCancelInvite = async () => {
    if (!cancelTarget || !institutionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invitations/${cancelTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("Invitation cancelled.");
        setCancelTarget(null);
        fetchInvitations();
      } else {
        toast.error(data.message || "Failed to cancel invitation");
      }
    } catch {
      toast.error("Failed to cancel invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendInvite = async (invite: PendingInvitation) => {
    if (!institutionId) return;
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}/invitations/${invite.id}/resend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success(`Invitation resent to ${invite.email}`);
      } else {
        toast.error(data.message || "Failed to resend invitation");
      }
    } catch {
      toast.error("Failed to resend invitation");
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

  const pendingCount = pendingInvites.filter(i => i.status === "PENDING").length;
  const acceptedCount = pendingInvites.filter(i => i.status === "ACCEPTED").length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-primary" /> Invite Users
          </h1>
          <p className="text-gray-500 mt-1">Invite new members to join your institution</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: pendingInvites.length, icon: Mail, color: "text-primary bg-primary/10" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "Accepted", value: acceptedCount, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "Expired", value: pendingInvites.filter(i => i.status === "EXPIRED").length, icon: XCircle, color: "text-gray-500 bg-gray-50" },
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="single">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="single"><Mail className="w-4 h-4 mr-2" />Single Invite</TabsTrigger>
          <TabsTrigger value="multi"><Users className="w-4 h-4 mr-2" />Bulk Email</TabsTrigger>
          <TabsTrigger value="link"><LinkIcon className="w-4 h-4 mr-2" />Invite Link</TabsTrigger>
        </TabsList>

        {/* Single Invite */}
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invite Individual User</CardTitle>
              <CardDescription>Send a personalized invitation email to one user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={singleForm.first_name}
                    onChange={e => setSingleForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input
                    value={singleForm.last_name}
                    onChange={e => setSingleForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email Address <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  value={singleForm.email}
                  onChange={e => setSingleForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ROLE_OPTIONS.map(({ value, label, icon: Icon, description, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSingleForm(f => ({ ...f, role: value }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        singleForm.role === value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Personal Message (Optional)</Label>
                <Textarea
                  value={singleForm.message}
                  onChange={e => setSingleForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Add a personal welcome message to include in the invitation email..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSingleInvite}
                  disabled={isSubmitting || !singleForm.email || !singleForm.first_name}
                  className="min-w-32"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Email Invite */}
        <TabsContent value="multi">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulk Email Invitations</CardTitle>
              <CardDescription>Invite multiple users at once by entering their email addresses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>How it works</AlertTitle>
                <AlertDescription>
                  Enter email addresses separated by commas, semicolons, or new lines. All users will receive the same role and invitation message.
                </AlertDescription>
              </Alert>
              <div className="space-y-1.5">
                <Label>Email Addresses <span className="text-red-500">*</span></Label>
                <Textarea
                  value={multiEmails}
                  onChange={e => setMultiEmails(e.target.value)}
                  placeholder={"alice@example.com\nbob@company.org\ncharlie@school.edu"}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  {multiEmails.split(/[\n,;]+/).filter(e => e.trim() && e.includes("@")).length} valid email(s) detected
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Role for All</Label>
                <Select value={multiRole} onValueChange={setMultiRole}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Message (Optional)</Label>
                <Textarea
                  value={multiMessage}
                  onChange={e => setMultiMessage(e.target.value)}
                  placeholder="Optional message to include in all invitations..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleMultiInvite}
                  disabled={isSubmitting || !multiEmails.trim()}
                  className="min-w-40"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send All Invitations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invite Links */}
        <TabsContent value="link">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shareable Invite Links</CardTitle>
              <CardDescription>
                Generate a link that allows anyone to join your institution with a specific role. Links can be shared via any channel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ROLE_OPTIONS.map(({ value, label, icon: Icon, description, color }) => (
                <div key={value} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border bg-gray-50">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                    {inviteLinks[value] && (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          readOnly
                          value={inviteLinks[value]}
                          className="text-xs h-7 font-mono bg-white"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inviteLinks[value] ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(inviteLinks[value], value)}
                      >
                        {copiedLink === value ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                        {copiedLink === value ? "Copied!" : "Copy"}
                      </Button>
                    ) : null}
                    <Button
                      variant={inviteLinks[value] ? "ghost" : "default"}
                      size="sm"
                      onClick={() => generateInviteLink(value)}
                      disabled={generatingLink === value}
                    >
                      {generatingLink === value ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-1" />}
                      {inviteLinks[value] ? "Regenerate" : "Generate Link"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Invitation History</CardTitle>
              <CardDescription>Track all sent invitations and their current status.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {pendingCount} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : pendingInvites.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No invitations sent yet</p>
              <p className="text-sm text-gray-400 mt-1">Sent invitations will appear here for tracking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="pl-6">Recipient</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map(invite => (
                    <TableRow key={invite.id} className="hover:bg-gray-50">
                      <TableCell className="pl-6">
                        <div>
                          <p className="font-semibold text-sm">{invite.email}</p>
                          {invite.invited_by_name && (
                            <p className="text-xs text-gray-500">Invited by {invite.invited_by_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getRoleColor(invite.role)} text-xs`}>
                          {invite.role.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(invite.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {invite.status === "PENDING" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => resendInvite(invite)}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Resend
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => setCancelTarget(invite)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Invitation</DialogTitle>
            <DialogDescription>
              Cancel the invitation sent to <strong>{cancelTarget?.email}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep</Button>
            <Button variant="destructive" onClick={handleCancelInvite} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Cancel Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}