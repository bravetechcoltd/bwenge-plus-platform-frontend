// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/store";
import api from "@/lib/api";
import {
  ClipboardList, Search, CheckCircle, XCircle, Clock,
  RefreshCw, ChevronLeft, ChevronRight, Mail, Phone,
  Globe, Calendar, Eye, X, AlertCircle, Loader2, Filter,
  GraduationCap, Linkedin, FileText, User,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ApplicationStatus = "pending" | "approved" | "rejected";

interface Application {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  country?: string;
  application_status: ApplicationStatus;
  applied_at: string | null;
  rejection_reason?: string | null;
  is_active: boolean;
  profile?: {
    linkedin_url?: string;
    institution_name?: string;
  } | null;
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_ICONS: Record<ApplicationStatus, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function ApplicationsPage() {
  const { token } = useSelector((state: RootState) => state.bwengeAuth);

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await api.get("/auth/admin/applications", { params });
      if (res.data.success) {
        setApplications(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (app: Application) => {
    setActionLoading(app.id);
    try {
      await api.post("/auth/admin/approve-user", { userId: app.id });
      toast.success(`${app.first_name} ${app.last_name}'s application approved!`);
      fetchApplications();
      if (selectedApp?.id === app.id) setSelectedApp(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await api.post("/auth/admin/reject-user", {
        userId: rejectTarget.id,
        reason: rejectReason.trim() || undefined,
      });
      toast.success(`${rejectTarget.first_name}'s application rejected.`);
      setShowRejectModal(false);
      setRejectReason("");
      setRejectTarget(null);
      fetchApplications();
      if (selectedApp?.id === rejectTarget.id) setSelectedApp(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (app: Application) => {
    setRejectTarget(app);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const filteredApps = applications.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.first_name?.toLowerCase().includes(q) ||
      a.last_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.country?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            User Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and manage BwengePlus membership applications
          </p>
        </div>
        <button onClick={fetchApplications} disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(["pending", "approved", "rejected"] as ApplicationStatus[]).map(s => {
          const Icon = STATUS_ICONS[s]
          return (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                statusFilter === s ? STATUS_COLORS[s] + " border-current" : "bg-card border-border text-muted-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <div className="text-xs font-medium capitalize">{s}</div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email, country…"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-card"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
          className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-card"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Applicant</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Applied</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => {
                  const StatusIcon = STATUS_ICONS[app.application_status] || Clock;
                  return (
                    <tr key={app.id} className="border-b border-border hover:bg-muted/50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {app.first_name?.[0]}{app.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{app.first_name} {app.last_name}</p>
                            <p className="text-xs text-muted-foreground">{app.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {app.phone_number && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />{app.phone_number}
                            </div>
                          )}
                          {app.country && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Globe className="w-3 h-3" />{app.country}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[app.application_status] || "bg-muted text-muted-foreground"}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{app.application_status}</span>
                        </span>
                        {app.rejection_reason && (
                          <p className="text-xs text-destructive mt-0.5 max-w-[140px] truncate" title={app.rejection_reason}>
                            {app.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setSelectedApp(app)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {app.application_status === "pending" && (
                            <>
                              <button onClick={() => handleApprove(app)}
                                disabled={actionLoading === app.id}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                {actionLoading === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => openRejectModal(app)}
                                disabled={actionLoading === app.id}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {selectedApp.first_name?.[0]}{selectedApp.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{selectedApp.first_name} {selectedApp.last_name}</h3>
                      <p className="text-xs text-muted-foreground">{selectedApp.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedApp(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 text-sm">
                  {[
                    { icon: Mail, label: "Email", value: selectedApp.email },
                    { icon: Phone, label: "Phone", value: selectedApp.phone_number },
                    { icon: Globe, label: "Country", value: selectedApp.country },
                    { icon: Calendar, label: "Applied", value: selectedApp.applied_at ? new Date(selectedApp.applied_at).toLocaleString() : null },
                    { icon: Linkedin, label: "LinkedIn", value: selectedApp.profile?.linkedin_url, isLink: true },
                    { icon: GraduationCap, label: "Institution", value: selectedApp.profile?.institution_name },
                  ].filter(r => r.value).map(({ icon: Icon, label, value, isLink }) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        {isLink ? (
                          <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">{value}</a>
                        ) : (
                          <p className="text-muted-foreground text-xs">{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedApp.rejection_reason && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-xs text-destructive font-semibold mb-1">Rejection Reason</p>
                    <p className="text-xs text-destructive">{selectedApp.rejection_reason}</p>
                  </div>
                )}

                {selectedApp.application_status === "pending" && (
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => handleApprove(selectedApp)}
                      disabled={actionLoading === selectedApp.id}
                      className="flex-1 bg-success text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-success transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading === selectedApp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve
                    </button>
                    <button onClick={() => openRejectModal(selectedApp)}
                      className="flex-1 bg-destructive text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-destructive transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {showRejectModal && rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Reject Application</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Rejecting {rejectTarget.first_name} {rejectTarget.last_name}'s application
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Reason for rejection (optional)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Provide a reason that will be sent to the applicant..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}
                    className="flex-1 border border-border text-muted-foreground py-2 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button onClick={handleRejectConfirm}
                    disabled={actionLoading === rejectTarget.id}
                    className="flex-1 bg-destructive text-white py-2 rounded-xl text-sm font-semibold hover:bg-destructive transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading === rejectTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Confirm Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
