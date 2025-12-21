"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Shield,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Flag,
  Eye,
  Clock,
  BookOpen,
  PlayCircle,
  Award,
  Building2,
  User,
  ChevronRight,
  X,
  AlertTriangle,
  Globe,
  Lock,
  Filter,
  Layers,
  Calendar,
  Tag,
  FileText,
  Star,
  Users,
} from "lucide-react";

interface ModerationCourse {
  id: string;
  title: string;
  description: string;
  type: "MOOC" | "SPOC";
  status: string;
  level: string;
  category: string;
  thumbnail_url?: string;
  total_modules: number;
  total_lessons: number;
  total_duration: number;
  has_certificate: boolean;
  tags: string[];
  requirements: string[];
  created_at: string;
  updated_at: string;
  instructor?: { id: string; name: string; email: string; avatar?: string };
  institution?: { id: string; name: string; logo?: string };
  _count?: { enrollments: number };
  average_rating?: number;
}

interface ModerationData {
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  courses: ModerationCourse[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const num = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-700",
  INTERMEDIATE: "bg-amber-100 text-amber-700",
  ADVANCED: "bg-orange-100 text-orange-700",
  EXPERT: "bg-red-100 text-red-700",
};

type Tab = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ALL";

export default function ContentModerationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ModerationData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Detail drawer
  const [selectedCourse, setSelectedCourse] = useState<ModerationCourse | null>(null);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    type: "approve" | "reject" | "flag" | null;
    courseId: string | null;
    reason: string;
    processing: boolean;
  }>({ type: null, courseId: null, reason: "", processing: false });

  const fetchData = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          status: activeTab,
          page: pg,
          limit: 10,
        };
        if (search) params.search = search;
        if (typeFilter !== "ALL") params.type = typeFilter;

        const res = await api.get("/courses/admin/moderation", { params });
        setData(res.data.data);
        setPage(pg);
      } catch {
        toast.error("Failed to load moderation queue");
      } finally {
        setLoading(false);
      }
    },
    [activeTab, search, typeFilter]
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const openAction = (type: "approve" | "reject" | "flag", courseId: string) => {
    setActionDialog({ type, courseId, reason: "", processing: false });
    setSelectedCourse(null);
  };

  const closeAction = () =>
    setActionDialog({ type: null, courseId: null, reason: "", processing: false });

  const submitAction = async () => {
    if (!actionDialog.type || !actionDialog.courseId) return;
    if ((actionDialog.type === "reject" || actionDialog.type === "flag") && !actionDialog.reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setActionDialog((p) => ({ ...p, processing: true }));
    try {
      const endpoint = `/courses/admin/moderation/${actionDialog.courseId}/${actionDialog.type}`;
      const body =
        actionDialog.type === "approve"
          ? {}
          : { [actionDialog.type === "flag" ? "flag_reason" : "rejection_reason"]: actionDialog.reason };
      await api.patch(endpoint, body);
      const msgs: Record<string, string> = {
        approve: "Course approved and published!",
        reject: "Course rejected.",
        flag: "Course flagged for re-review.",
      };
      toast.success(msgs[actionDialog.type]);
      closeAction();
      fetchData(1);
    } catch {
      toast.error("Action failed. Please try again.");
      setActionDialog((p) => ({ ...p, processing: false }));
    }
  };

  const TABS: { key: Tab; label: string; color: string }[] = [
    { key: "PENDING_REVIEW", label: "Pending Review", color: "amber" },
    { key: "APPROVED", label: "Approved", color: "green" },
    { key: "REJECTED", label: "Rejected", color: "red" },
    { key: "ALL", label: "All", color: "gray" },
  ];

  const tabCountKey: Record<Tab, keyof ModerationData["stats"]> = {
    PENDING_REVIEW: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    ALL: "total",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
              <p className="text-sm text-gray-500">Review and moderate course submissions</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(page)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Pending Review",
                value: data.stats.pending,
                icon: Clock,
                bg: "bg-amber-50",
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                pulse: data.stats.pending > 0,
              },
              {
                label: "Approved",
                value: data.stats.approved,
                icon: CheckCircle,
                bg: "bg-green-50",
                iconBg: "bg-green-100",
                iconColor: "text-green-600",
                pulse: false,
              },
              {
                label: "Rejected",
                value: data.stats.rejected,
                icon: XCircle,
                bg: "bg-red-50",
                iconBg: "bg-red-100",
                iconColor: "text-red-600",
                pulse: false,
              },
              {
                label: "Total",
                value: data.stats.total,
                icon: Layers,
                bg: "bg-blue-50",
                iconBg: "bg-blue-100",
                iconColor: "text-blue-600",
                pulse: false,
              },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white`}>
                <div className="flex items-center justify-between">
                  <div className={`p-2 ${s.iconBg} rounded-lg relative`}>
                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                    {s.pulse && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {/* Tabs */}
          <div className="border-b border-gray-100 px-6">
            <div className="flex gap-6">
              {TABS.map((tab) => {
                const count = data?.stats[tabCountKey[tab.key]] ?? 0;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setPage(1);
                    }}
                    className={`relative py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                      active
                        ? "text-red-600 border-b-2 border-red-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded-full font-semibold ${
                          active ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {["ALL", "MOOC", "SPOC"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    typeFilter === t
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Course List */}
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
              </div>
            ) : !data?.courses.length ? (
              <div className="text-center py-16">
                <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No courses in this queue</p>
                <p className="text-sm text-gray-400">
                  {activeTab === "PENDING_REVIEW"
                    ? "All caught up! No courses awaiting review."
                    : "No courses match the current filters."}
                </p>
              </div>
            ) : (
              data.courses.map((course) => (
                <div
                  key={course.id}
                  className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors"
                >
                  {/* Status Bar */}
                  <div
                    className={`h-1 ${
                      activeTab === "PENDING_REVIEW"
                        ? "bg-amber-400"
                        : activeTab === "APPROVED"
                        ? "bg-green-400"
                        : activeTab === "REJECTED"
                        ? "bg-red-400"
                        : course.status === "PUBLISHED"
                        ? "bg-green-400"
                        : course.status === "DRAFT"
                        ? "bg-amber-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <div className="p-4 flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-28 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                course.type === "MOOC"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {course.type === "MOOC" ? (
                                <Globe className="w-3 h-3" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                              {course.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {course.level}
                            </span>
                            {course.category && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                {course.category}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                            {course.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {course.description}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setSelectedCourse(course)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(activeTab === "PENDING_REVIEW" ||
                            (activeTab === "ALL" && course.status === "DRAFT")) && (
                            <>
                              <button
                                onClick={() => openAction("approve", course.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => openAction("reject", course.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                          {(activeTab === "APPROVED" ||
                            (activeTab === "ALL" && course.status === "PUBLISHED")) && (
                            <button
                              onClick={() => openAction("flag", course.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              Flag
                            </button>
                          )}
                          {(activeTab === "REJECTED" ||
                            (activeTab === "ALL" && course.status === "ARCHIVED")) && (
                            <button
                              onClick={() => openAction("approve", course.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve & Publish
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Layers className="w-3.5 h-3.5" />
                          {course.total_modules} modules
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <PlayCircle className="w-3.5 h-3.5" />
                          {course.total_lessons} lessons
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.round(num(course.total_duration) / 60)}h
                        </div>
                        {course.has_certificate && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <Award className="w-3.5 h-3.5" />
                            Certificate
                          </div>
                        )}
                        {course.instructor && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3.5 h-3.5" />
                            {course.instructor.name}
                          </div>
                        )}
                        {course.institution && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="w-3.5 h-3.5" />
                            {course.institution.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="px-6 pb-5 flex items-center justify-between border-t border-gray-50 pt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, data.pagination.total)} of{" "}
                {data.pagination.total} courses
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => fetchData(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {[...Array(Math.min(data.pagination.totalPages, 7))].map((_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => fetchData(pg)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        page === pg
                          ? "bg-red-600 text-white"
                          : "border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchData(page + 1)}
                  disabled={page === data.pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedCourse(null)}
          />
          <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-900">Course Details</span>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Thumbnail */}
            <div className="h-48 bg-gray-100 overflow-hidden">
              {selectedCourse.thumbnail_url ? (
                <img
                  src={selectedCourse.thumbnail_url}
                  alt={selectedCourse.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-gray-200" />
                </div>
              )}
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Title & Badges */}
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                      selectedCourse.type === "MOOC"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {selectedCourse.type === "MOOC" ? (
                      <Globe className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    {selectedCourse.type}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      STATUS_COLORS[selectedCourse.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedCourse.status}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      LEVEL_COLORS[selectedCourse.level] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedCourse.level}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCourse.title}</h2>
                <p className="text-sm text-gray-600 mt-2">{selectedCourse.description}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Layers, label: "Modules", value: selectedCourse.total_modules },
                  { icon: PlayCircle, label: "Lessons", value: selectedCourse.total_lessons },
                  {
                    icon: Clock,
                    label: "Duration",
                    value: `${Math.round(num(selectedCourse.total_duration) / 60)}h`,
                  },
                  {
                    icon: Users,
                    label: "Enrolled",
                    value: num(selectedCourse._count?.enrollments),
                  },
                  {
                    icon: Star,
                    label: "Rating",
                    value: num(selectedCourse.average_rating).toFixed(1),
                  },
                  { icon: Award, label: "Certificate", value: selectedCourse.has_certificate ? "Yes" : "No" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <s.icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-sm font-semibold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Instructor */}
              {selectedCourse.instructor && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Instructor
                  </p>
                  <div className="flex items-center gap-3">
                    {selectedCourse.instructor.avatar ? (
                      <img
                        src={selectedCourse.instructor.avatar}
                        className="w-10 h-10 rounded-full object-cover"
                        alt={selectedCourse.instructor.name}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {selectedCourse.instructor.name}
                      </p>
                      <p className="text-xs text-gray-500">{selectedCourse.instructor.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Institution */}
              {selectedCourse.institution && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Institution
                  </p>
                  <div className="flex items-center gap-3">
                    {selectedCourse.institution.logo ? (
                      <img
                        src={selectedCourse.institution.logo}
                        className="w-10 h-10 rounded-lg object-contain"
                        alt={selectedCourse.institution.name}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                    )}
                    <p className="font-medium text-gray-900 text-sm">
                      {selectedCourse.institution.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Category & Tags */}
              <div>
                {selectedCourse.category && (
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Category:{" "}
                      <span className="font-medium text-gray-900">{selectedCourse.category}</span>
                    </span>
                  </div>
                )}
                {selectedCourse.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCourse.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Requirements */}
              {selectedCourse.requirements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Requirements
                  </p>
                  <ul className="space-y-1">
                    {selectedCourse.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  Created:{" "}
                  {new Date(selectedCourse.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  Updated:{" "}
                  {new Date(selectedCourse.updated_at).toLocaleDateString()}
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => router.push(`/dashboard/system-admin/courses/${selectedCourse.id}`)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Full View
                </button>
                {(activeTab === "PENDING_REVIEW" ||
                  (activeTab === "ALL" && selectedCourse.status === "DRAFT")) && (
                  <>
                    <button
                      onClick={() => openAction("approve", selectedCourse.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openAction("reject", selectedCourse.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                {(activeTab === "APPROVED" ||
                  (activeTab === "ALL" && selectedCourse.status === "PUBLISHED")) && (
                  <button
                    onClick={() => openAction("flag", selectedCourse.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    Flag for Re-review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog */}
      {actionDialog.type && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeAction}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div
              className={`flex items-center gap-3 mb-4 ${
                actionDialog.type === "approve"
                  ? "text-green-700"
                  : actionDialog.type === "reject"
                  ? "text-red-700"
                  : "text-amber-700"
              }`}
            >
              {actionDialog.type === "approve" ? (
                <CheckCircle className="w-6 h-6" />
              ) : actionDialog.type === "reject" ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <Flag className="w-6 h-6" />
              )}
              <h3 className="text-lg font-semibold">
                {actionDialog.type === "approve"
                  ? "Approve Course"
                  : actionDialog.type === "reject"
                  ? "Reject Course"
                  : "Flag for Re-review"}
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {actionDialog.type === "approve"
                ? "This will publish the course and make it available to learners."
                : actionDialog.type === "reject"
                ? "This will archive the course. Please provide a reason."
                : "This will unpublish the course for re-review. Please provide a reason."}
            </p>

            {(actionDialog.type === "reject" || actionDialog.type === "flag") && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionDialog.reason}
                  onChange={(e) =>
                    setActionDialog((p) => ({ ...p, reason: e.target.value }))
                  }
                  placeholder={
                    actionDialog.type === "reject"
                      ? "Explain why this course is being rejected..."
                      : "Explain why this course needs re-review..."
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            )}

            {actionDialog.type === "approve" && (
              <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  The course will be immediately visible to all eligible learners upon approval.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeAction}
                disabled={actionDialog.processing}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={actionDialog.processing}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-70 ${
                  actionDialog.type === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : actionDialog.type === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {actionDialog.processing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : actionDialog.type === "approve" ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve & Publish
                  </>
                ) : actionDialog.type === "reject" ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Reject Course
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Flag Course
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}