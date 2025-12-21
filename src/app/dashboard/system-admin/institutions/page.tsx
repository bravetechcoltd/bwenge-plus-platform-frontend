// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchInstitutions,
  activateInstitution,
  clearError,
} from "@/lib/features/institutions/institutionSlice";
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  SlidersHorizontal,
  RefreshCw,
  Users,
  BookOpen,
  FolderTree,
  CheckCircle2,
  XCircle,
  Calendar,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ReplaceAdminModal from "@/components/institutions/ReplaceAdminModal";
import DeactivateInstitutionModal from "@/components/institutions/DeactivateInstitutionModal";

export default function InstitutionManagementPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { institutions, isLoading, error } = useAppSelector(
    (state) => state.institutions
  );

  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showReplaceAdminModal, setShowReplaceAdminModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);

  useEffect(() => {
    loadInstitutions();
  }, [dispatch]);

  const loadInstitutions = () => {
    dispatch(fetchInstitutions());
    setCurrentPage(1);
    setSearchQuery("");
    setTypeFilter("all");
  };

  const getFilteredInstitutions = () => {
    let filtered = [...institutions];

    // Apply tab filter
    if (activeTab === "active") {
      filtered = filtered.filter((i) => i.is_active === true);
    }

    // Apply type filter
    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter((i) => i.type === typeFilter);
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((institution) => {
        const name = institution.name?.toLowerCase() || "";
        const description = institution.description?.toLowerCase() || "";
        const type = institution.type?.toLowerCase() || "";

        return name.includes(query) || description.includes(query) || type.includes(query);
      });
    }

    return filtered;
  };

  const handleToggleStatus = async (institution: any) => {
    if (institution.is_active) {
      // Show deactivation modal
      setSelectedInstitution(institution);
      setShowDeactivateModal(true);
    } else {
      // Activate directly
      try {
        await dispatch(activateInstitution(institution.id)).unwrap();
        toast.success("Institution activated successfully!");
        dispatch(fetchInstitutions());
      } catch (error: any) {
        toast.error(error || "Failed to activate institution");
      }
    }
  };

  const handleReplaceAdmin = (institution: any) => {
    setSelectedInstitution(institution);
    setShowReplaceAdminModal(true);
  };

  const handleModalSuccess = () => {
    // Refresh institutions data after successful modal operation
    dispatch(fetchInstitutions());
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

  const filteredInstitutions = getFilteredInstitutions();
  const totalItems = filteredInstitutions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageInstitutions = filteredInstitutions.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Institution Management
                </h1>
                <p className="text-xs text-gray-500">{totalItems} total institutions</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 rounded-lg transition-all text-sm ${
                  showFilters
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                Filters
              </button>
              <button
                onClick={loadInstitutions}
                disabled={isLoading}
                className="flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <Link
                href="/dashboard/system-admin/institutions/create"
                className="flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Institution
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === "active"
                  ? "bg-primary text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Active ({institutions.filter((i) => i.is_active).length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === "all"
                  ? "bg-primary text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Building2 className="w-4 h-4 mr-2" />
              All Institutions ({institutions.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description, or type..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3"
              >
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="UNIVERSITY">University</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="PRIVATE_COMPANY">Private Company</option>
                  <option value="NGO">NGO</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

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

        {/* Institutions Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : currentPageInstitutions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center"
          >
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Institutions {searchQuery ? "Found" : ""}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "Try adjusting your search"
                : "Get started by creating your first institution"}
            </p>
            {!searchQuery && (
              <Link
                href="/dashboard/system-admin/institutions/create"
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Institution
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase">#</th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase">
                      Institution
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase">
                      Statistics
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase">
                      Created
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentPageInstitutions.map((institution, index) => (
                    <motion.tr
                      key={institution.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-blue-50 transition-colors group"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-white">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-3">
                          {institution.logo_url ? (
                            <img
                              src={institution.logo_url}
                              alt={institution.name}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{institution.name}</p>
                            {institution.description && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {institution.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(
                            institution.type
                          )}`}
                        >
                          {getTypeLabel(institution.type)}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-3 text-xs text-gray-600">
                          <div className="flex items-center">
                            <Users className="w-3 h-3 mr-1 text-gray-400" />
                            {institution.memberCount || 0}
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="w-3 h-3 mr-1 text-gray-400" />
                            {institution.courseCount || 0}
                          </div>
                          <div className="flex items-center">
                            <FolderTree className="w-3 h-3 mr-1 text-gray-400" />
                            {institution.categoryCount || 0}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        {institution.is_active ? (
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
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center text-xs text-gray-600">
                          <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                          {new Date(institution.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/system-admin/institutions/${institution.id}`
                              )
                            }
                            className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors group-hover:scale-110"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/system-admin/institutions/create?id=${institution.id}`
                              )
                            }
                            className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors group-hover:scale-110"
                            title="Edit Institution"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleReplaceAdmin(institution)}
                            className="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors group-hover:scale-110"
                            title="Replace Admin"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(institution)}
                            className={`p-1.5 rounded transition-colors group-hover:scale-110 ${
                              institution.is_active
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                            title={institution.is_active ? "Deactivate" : "Activate"}
                          >
                            {institution.is_active ? (
                              <PowerOff className="w-3.5 h-3.5" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold">
                      {Math.min(endIndex, totalItems)}
                    </span>{" "}
                    of <span className="font-semibold">{totalItems}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              currentPage === pageNum
                                ? "bg-primary text-white shadow-sm"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:border-gray-400 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Replace Admin Modal */}
      {showReplaceAdminModal && selectedInstitution && (
        <ReplaceAdminModal
          institution={selectedInstitution}
          currentAdmin={selectedInstitution.admin}
          onClose={() => {
            setShowReplaceAdminModal(false);
            setSelectedInstitution(null);
          }}
        />
      )}

      {/* Deactivate Institution Modal */}
      {showDeactivateModal && selectedInstitution && (
        <DeactivateInstitutionModal
          institution={selectedInstitution}
          onClose={() => {
            setShowDeactivateModal(false);
            setSelectedInstitution(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}