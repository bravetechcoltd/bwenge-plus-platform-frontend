// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  fetchInstitutionById,
  clearError,
  replaceInstitutionAdmin,
  activateInstitution,
  deactivateInstitution,
} from "@/lib/features/institutions/institutionSlice";
import {
  Building2,
  Users,
  BookOpen,
  FolderTree,
  Calendar,
  Mail,
  Phone,
  User,
  Globe,
  Settings,
  Power,
  PowerOff,
  Edit,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserCog,
  Shield,
  CheckCircle2,
  XCircle,
  FileText,
  Award,
  Clock,
  ChevronRight,
  X,
  Maximize2,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Download,
  Info,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ReplaceAdminModal from "@/components/institutions/ReplaceAdminModal";
import DeactivateInstitutionModal from "@/components/institutions/DeactivateInstitutionModal";

export default function InstitutionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { selectedInstitution, isLoading, error } = useAppSelector(
    (state) => state.institutions
  );

  const [showReplaceAdminModal, setShowReplaceAdminModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "settings">("overview");
  const [showLogoPreview, setShowLogoPreview] = useState(false);
  const [logoDetails, setLogoDetails] = useState<any>(null);

  const institutionId = params.id as string;

  useEffect(() => {
    if (institutionId) {
      dispatch(fetchInstitutionById(institutionId));
    }
  }, [institutionId, dispatch]);

  useEffect(() => {
    if (selectedInstitution?.logo_url) {
      analyzeLogoUrl(selectedInstitution.logo_url);
    }
  }, [selectedInstitution]);

  const analyzeLogoUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const details = {
        url: url,
        domain: urlObj.hostname,
        path: urlObj.pathname,
        filename: urlObj.pathname.split('/').pop() || 'logo',
        extension: urlObj.pathname.split('.').pop()?.toUpperCase() || 'Unknown',
        size: 'Unknown',
        dimensions: 'Unknown',
        uploadedAt: 'Unknown',
        isCloudinary: urlObj.hostname.includes('cloudinary'),
        isSecure: urlObj.protocol === 'https:',
      };
      setLogoDetails(details);
    } catch (error) {
      setLogoDetails({
        url: url,
        domain: 'Invalid URL',
        path: url,
        filename: 'logo',
        extension: 'Unknown',
        size: 'Unknown',
        dimensions: 'Unknown',
        uploadedAt: 'Unknown',
        isCloudinary: false,
        isSecure: false,
      });
    }
  };

  const handleRefresh = () => {
    dispatch(fetchInstitutionById(institutionId));
  };

  const handleToggleStatus = async () => {
    if (!selectedInstitution) return;

    if (selectedInstitution.is_active) {
      setShowDeactivateModal(true);
    } else {
      try {
        await dispatch(activateInstitution(selectedInstitution.id)).unwrap();
        toast.success("Institution activated successfully!");
        handleRefresh();
      } catch (error: any) {
        toast.error(error || "Failed to activate institution");
      }
    }
  };

  const handleReplaceAdmin = () => {
    setShowReplaceAdminModal(true);
  };

  const handleLogoClick = () => {
    if (selectedInstitution?.logo_url) {
      setShowLogoPreview(true);
    }
  };

  // FIXED: Improved copyToClipboard function
  const copyToClipboard = async (text: string) => {
    try {
      // Try using the modern Clipboard API first
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers or when Clipboard API is not available
      try {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        // Execute copy command
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success("Copied to clipboard!");
        } else {
          throw new Error('Copy command failed');
        }
      } catch (fallbackErr) {
        console.error('Failed to copy text:', fallbackErr);
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "UNIVERSITY":
        return "bg-blue-100 text-blue-700";
      case "GOVERNMENT":
        return "bg-green-100 text-green-700";
      case "PRIVATE_COMPANY":
        return "bg-purple-100 text-purple-700";
      case "NGO":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading && !selectedInstitution) {
    return (
      <div className="min-h-screen bg-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!selectedInstitution && !isLoading) {
    return (
      <div className="min-h-screen bg-primary/5 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Institution Not Found</h2>
            <p className="text-gray-500 mb-6">
              The institution you're looking for doesn't exist or you don't have access.
            </p>
            <Link
              href="/dashboard/system-admin/institutions"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Institutions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary/5 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/dashboard/system-admin/institutions"
            className="inline-flex items-center text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Institutions
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative group">
                {selectedInstitution?.logo_url ? (
                  <>
                    <img
                      src={selectedInstitution.logo_url}
                      alt={selectedInstitution.name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={handleLogoClick}
                    />
                    <button
                      onClick={handleLogoClick}
                      className="absolute -top-1 -right-1 p-1 bg-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-primary/90"
                      title="Zoom & View Details"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div 
                    className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                    onClick={handleLogoClick}
                  >
                    <Building2 className="w-8 h-8 text-white" />
                    <div className="absolute -top-1 -right-1 p-1 bg-gray-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Maximize2 className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedInstitution?.name}
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(
                      selectedInstitution?.type || ""
                    )}`}
                  >
                    {getTypeLabel(selectedInstitution?.type || "")}
                  </span>
                  {selectedInstitution?.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      <XCircle className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() =>
                  router.push(
                    `/dashboard/system-admin/institutions/create?id=${selectedInstitution?.id}`
                  )
                }
                className="flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Institution
              </button>
              <button
                onClick={handleToggleStatus}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                  selectedInstitution?.is_active
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {selectedInstitution?.is_active ? (
                  <>
                    <PowerOff className="w-4 h-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center"
          >
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm text-red-800">{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center">
                <Building2 className="w-4 h-4 mr-2" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "members"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center">
                <Users className="w-4 h-4 mr-2" />
                Members ({selectedInstitution?.members?.length || 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Institution Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Basic Info */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Building2 className="w-5 h-5 mr-2 text-primary" />
                          Institution Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </label>
                            <p className="text-gray-700 mt-1">
                              {selectedInstitution?.description || "No description provided"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Slug
                              </label>
                              <div className="flex items-center mt-1">
                                <Globe className="w-4 h-4 text-gray-400 mr-2" />
                                <p className="text-gray-700 font-mono">
                                  {selectedInstitution?.slug}
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created Date
                              </label>
                              <div className="flex items-center mt-1">
                                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                <p className="text-gray-700">
                                  {formatDate(selectedInstitution?.created_at || "")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="bg-primary/5 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Award className="w-5 h-5 mr-2 text-primary" />
                          Statistics
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              {selectedInstitution?.memberCount || 0}
                            </p>
                            <p className="text-xs text-gray-500">Total Members</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                              <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              {selectedInstitution?.courseCount || 0}
                            </p>
                            <p className="text-xs text-gray-500">Courses</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                              <FolderTree className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              {selectedInstitution?.categoryCount || 0}
                            </p>
                            <p className="text-xs text-gray-500">Categories</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Admin Info */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-primary" />
                            Administrator
                          </h3>
                          <button
                            onClick={handleReplaceAdmin}
                            className="text-xs text-primary hover:text-primary/80 flex items-center"
                          >
                            <UserCog className="w-3 h-3 mr-1" />
                            Replace
                          </button>
                        </div>

                        {selectedInstitution?.admin ? (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              {selectedInstitution.admin.user.profile_picture_url ? (
                                <img
                                  src={selectedInstitution.admin.user.profile_picture_url}
                                  alt={selectedInstitution.admin.user.first_name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-primary" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {selectedInstitution.admin.user.first_name}{" "}
                                  {selectedInstitution.admin.user.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  @{selectedInstitution.admin.user.username}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-gray-700">
                                  {selectedInstitution.admin.user.email}
                                </span>
                              </div>
                              {selectedInstitution.admin.user.phone_number && (
                                <div className="flex items-center text-sm">
                                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-gray-700">
                                    {selectedInstitution.admin.user.phone_number}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center text-sm">
                                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-gray-700">
                                  Joined{" "}
                                  {formatDate(selectedInstitution.admin.joined_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">No administrator assigned</p>
                          </div>
                        )}
                      </div>

                      {/* Status Card */}
                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Status Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Active Status:</span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedInstitution?.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {selectedInstitution?.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Last Updated:</span>
                            <span className="text-sm text-gray-900">
                              {formatDate(selectedInstitution?.updated_at || "")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Institution ID:</span>
                            <span className="text-sm text-gray-900 font-mono">
                              {selectedInstitution?.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "members" && (
                <motion.div
                  key="members"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Institution Members
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedInstitution?.members?.length || 0} total members
                      </p>
                    </div>
                    <button className="flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">
                      <User className="w-4 h-4 mr-2" />
                      Add Member
                    </button>
                  </div>

                  {selectedInstitution?.members && selectedInstitution.members.length > 0 ? (
                    <div className="overflow-hidden border border-gray-200 rounded-xl">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Member
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Joined Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedInstitution.members.map((member) => (
                            <tr key={member.member_id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  {member.user.profile_picture_url ? (
                                    <img
                                      src={member.user.profile_picture_url}
                                      alt={member.user.first_name}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-900">
                                      {member.user.first_name} {member.user.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {member.user.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    member.role === "ADMIN"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {member.role}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {member.is_active ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-500">
                                {new Date(member.joined_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4">
                                <button className="text-primary hover:text-primary/80 text-sm">
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">
                        No Members Found
                      </h4>
                      <p className="text-gray-500 mb-4">
                        This institution doesn't have any members yet.
                      </p>
                      <button className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                        <User className="w-4 h-4 mr-2" />
                        Add First Member
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Institution Settings
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Settings Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-primary" />
                        Course Settings
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Allow Public Courses
                            </p>
                            <p className="text-xs text-gray-500">
                              Make courses publicly accessible
                            </p>
                          </div>
                          <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                            <div
                              className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                                selectedInstitution?.settings?.allow_public_courses
                                  ? "bg-primary left-7"
                                  : "bg-gray-400 left-1"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Require SPOC Approval
                            </p>
                            <p className="text-xs text-gray-500">
                              Approve SPOC course enrollments
                            </p>
                          </div>
                          <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                            <div
                              className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                                selectedInstitution?.settings?.require_approval_for_spoc
                                  ? "bg-primary left-7"
                                  : "bg-gray-400 left-1"
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Maximum Instructors
                          </label>
                          <div className="mt-2">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-lg font-semibold text-primary">
                                {selectedInstitution?.settings?.max_instructors || 10}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Maximum number of instructors allowed
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* System Information */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">
                        System Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Institution ID:</span>
                          <span className="text-sm font-mono text-gray-900">
                            {selectedInstitution?.id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Created:</span>
                          <span className="text-sm text-gray-900">
                            {formatDate(selectedInstitution?.created_at || "")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Updated:</span>
                          <span className="text-sm text-gray-900">
                            {formatDate(selectedInstitution?.updated_at || "")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">API Endpoint:</span>
                          <span className="text-sm font-mono text-primary">
                            /api/institutions/{selectedInstitution?.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
                    <h4 className="text-md font-semibold text-red-800 mb-4">
                      Danger Zone
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700">
                            {selectedInstitution?.is_active ? "Deactivate" : "Activate"} Institution
                          </p>
                          <p className="text-xs text-red-600">
                            {selectedInstitution?.is_active
                              ? "This will disable the institution and all associated courses."
                              : "Activate the institution to make it accessible."}
                          </p>
                        </div>
                        <button
                          onClick={handleToggleStatus}
                          className={`px-4 py-2 rounded-lg font-medium text-sm ${
                            selectedInstitution?.is_active
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {selectedInstitution?.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700">
                            Delete Institution
                          </p>
                          <p className="text-xs text-red-600">
                            This action cannot be undone. All data will be permanently deleted.
                          </p>
                        </div>
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium text-sm cursor-not-allowed"
                        >
                          Delete (Disabled)
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Logo Preview Modal */}
      <AnimatePresence>
        {showLogoPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-primary px-6 py-4 border-b border-primary/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Institution Logo Details</h2>
                      <p className="text-sm text-primary-100">{selectedInstitution?.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLogoPreview(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Logo Preview */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-primary" />
                        Logo Preview
                      </h3>
                      
                      <div className="flex flex-col items-center">
                        {selectedInstitution?.logo_url ? (
                          <>
                            <div className="relative group mb-4">
                              <img
                                src={selectedInstitution.logo_url}
                                alt={`${selectedInstitution.name} Logo`}
                                className="w-64 h-64 object-contain rounded-lg border-2 border-gray-200 shadow-lg"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <span className="text-white font-medium">Click to open in new tab</span>
                              </div>
                              <a
                                href={selectedInstitution.logo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 cursor-zoom-in"
                              />
                            </div>
                            
                            <div className="flex gap-3">
                              <a
                                href={selectedInstitution.logo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open in New Tab
                              </a>
                              <button
                                onClick={() => copyToClipboard(selectedInstitution.logo_url)}
                                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy URL
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Building2 className="w-16 h-16 text-primary" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-700 mb-2">
                              No Logo Available
                            </h4>
                            <p className="text-gray-500">
                              This institution doesn't have a logo yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    {selectedInstitution?.logo_url && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                          <Info className="w-4 h-4 mr-2" />
                          Quick Actions
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedInstitution.logo_url;
                              link.download = `${selectedInstitution.slug}-logo.${logoDetails?.extension?.toLowerCase() || 'png'}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success("Download started!");
                            }}
                            className="flex items-center justify-center px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </button>
                          <button
                            onClick={() => {
                              const img = new Image();
                              img.src = selectedInstitution.logo_url;
                              const win = window.open('');
                              win?.document.write(img.outerHTML);
                              win?.document.close();
                            }}
                            className="flex items-center justify-center px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Source
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Logo Details */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Info className="w-5 h-5 mr-2 text-primary" />
                        Logo Information
                      </h3>
                      
                      <div className="space-y-4">
                        {logoDetails ? (
                          <>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  URL
                                </label>
                                <div className="flex items-center mt-1">
                                  <input
                                    type="text"
                                    value={logoDetails.url}
                                    readOnly
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-l-lg bg-gray-50 font-mono truncate"
                                  />
                                  <button
                                    onClick={() => copyToClipboard(logoDetails.url)}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-r-lg hover:bg-gray-300 transition-colors border border-l-0 border-gray-300"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Domain
                                  </label>
                                  <p className="text-sm text-gray-700 mt-1 font-mono">
                                    {logoDetails.domain}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    File Type
                                  </label>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {logoDetails.extension}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  File Name
                                </label>
                                <p className="text-sm text-gray-700 mt-1 font-mono">
                                  {logoDetails.filename}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Security
                                  </label>
                                  <div className="mt-1">
                                    {logoDetails.isSecure ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        HTTPS Secure
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Not Secure
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Hosting
                                  </label>
                                  <div className="mt-1">
                                    {logoDetails.isCloudinary ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                        Cloudinary
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                        External Host
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  Technical Details
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Path:</span>
                                    <p className="text-gray-700 font-mono text-xs truncate" title={logoDetails.path}>
                                      {logoDetails.path}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Status:</span>
                                    <p className="text-gray-700">
                                      {logoDetails.isSecure ? 'Valid & Secure' : 'Check Security'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Info className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500">No logo information available</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logo Management */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        Logo Management
                      </h4>
                      <div className="space-y-3">
                        <p className="text-sm text-amber-700">
                          To update or change the institution logo, please edit the institution details.
                        </p>
                        <button
                          onClick={() => {
                            setShowLogoPreview(false);
                            router.push(`/dashboard/system-admin/institutions/create?id=${selectedInstitution?.id}`);
                          }}
                          className="w-full flex items-center justify-center px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Institution to Update Logo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showReplaceAdminModal && selectedInstitution && (
        <ReplaceAdminModal
          institution={selectedInstitution}
          currentAdmin={selectedInstitution.admin}
          onClose={() => {
            setShowReplaceAdminModal(false);
          }}
        />
      )}

      {showDeactivateModal && selectedInstitution && (
        <DeactivateInstitutionModal
          institution={selectedInstitution}
          onClose={() => {
            setShowDeactivateModal(false);
          }}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}