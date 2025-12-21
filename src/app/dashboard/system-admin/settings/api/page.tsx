"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  getApiKeys,
  getApiPermissions,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  revokeApiKey,
  regenerateApiKey,
  ApiKey,
} from "@/lib/features/system-settings/systemSettingsSlice";
import {
  Network,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  Key,
  Copy,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Shield,
  Globe,
  AlertCircle,
  Check,
  Power,
  RotateCw,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function ApiManagementPage() {
  const dispatch = useAppDispatch();
  const { apiKeys, apiPermissions, isLoading } = useAppSelector(
    (state) => state.systemSettings
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Partial<ApiKey>>({
    name: "",
    description: "",
    permissions: ["READ"],
    allowed_ips: [],
    allowed_domains: [],
    rate_limits: {
      window_ms: 3600000,
      max_requests: 1000,
    },
    metadata: {},
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const loadData = () => {
    dispatch(getApiKeys({}));
    dispatch(getApiPermissions());
  };

  const filteredKeys = apiKeys.filter((key) => {
    const matchesSearch =
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.key_preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || key.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (key: ApiKey) => {
    setEditingKey(key);
    setFormData({
      name: key.name,
      description: key.description,
      permissions: key.permissions,
      allowed_ips: key.allowed_ips || [],
      allowed_domains: key.allowed_domains || [],
      rate_limits: key.rate_limits,
      metadata: key.metadata,
      is_active: key.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) return;

    try {
      await dispatch(deleteApiKey(id)).unwrap();
      toast.success("API key deleted successfully");
    } catch (error: any) {
      toast.error(error || "Failed to delete API key");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? It will immediately stop working.")) return;

    try {
      await dispatch(revokeApiKey(id)).unwrap();
      toast.success("API key revoked successfully");
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to revoke API key");
    }
  };

  const handleRegenerate = async (id: string) => {
    if (!confirm("Regenerating will create a new key. The old key will stop working immediately. Continue?")) return;

    try {
      const result = await dispatch(regenerateApiKey(id)).unwrap();
      setShowNewKey(result.key || "New key generated");
      toast.success("API key regenerated successfully");
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to regenerate API key");
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingKey) {
        await dispatch(
          updateApiKey({
            id: editingKey.id,
            data: formData,
          })
        ).unwrap();
        toast.success("API key updated successfully");
      } else {
        const result = await dispatch(createApiKey(formData)).unwrap();
        setShowNewKey(result.key || "API key created");
        toast.success("API key created successfully");
      }

      setShowForm(false);
      setEditingKey(null);
      setFormData({
        name: "",
        description: "",
        permissions: ["READ"],
        allowed_ips: [],
        allowed_domains: [],
        rate_limits: {
          window_ms: 3600000,
          max_requests: 1000,
        },
        metadata: {},
        is_active: true,
      });
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to save API key");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-700",
      INACTIVE: "bg-gray-100 text-gray-600",
      EXPIRED: "bg-amber-100 text-amber-700",
      REVOKED: "bg-red-100 text-red-700",
    };
    return styles[status as keyof typeof styles] || styles.INACTIVE;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
              <p className="text-sm text-gray-600">Create and manage API keys for external integrations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => {
                setEditingKey(null);
                setFormData({
                  name: "",
                  description: "",
                  permissions: ["READ"],
                  allowed_ips: [],
                  allowed_domains: [],
                  rate_limits: {
                    window_ms: 3600000,
                    max_requests: 1000,
                  },
                  metadata: {},
                  is_active: true,
                });
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <Plus className="w-4 h-4" />
              New API Key
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Keys</p>
              <Key className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{apiKeys.length}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active</p>
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {apiKeys.filter(k => k.status === "ACTIVE").length}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Requests</p>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {apiKeys.reduce((sum, k) => sum + (k.total_requests || 0), 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {apiKeys.filter(k => {
                if (!k.expires_at) return false;
                const daysLeft = (new Date(k.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                return daysLeft > 0 && daysLeft < 7;
              }).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search API keys by name or preview..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Statuses</option>
              {apiPermissions.statuses?.map((status: string) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* New Key Display */}
        <AnimatePresence>
          {showNewKey && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Your New API Key</h3>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    Save this key now. For security reasons, it won't be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-white border border-green-300 rounded-lg font-mono text-sm">
                      {showNewKey}
                    </code>
                    <button
                      onClick={() => handleCopyKey(showNewKey)}
                      className="p-2 bg-white border border-green-300 rounded-lg hover:bg-green-50"
                    >
                      <Copy className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewKey(null)}
                  className="p-1 hover:bg-green-100 rounded"
                >
                  <X className="w-5 h-5 text-green-600" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Keys Grid */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto" />
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No API keys found</p>
            </div>
          ) : (
            filteredKeys.map((key) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(key.status)}`}>
                        {key.status}
                      </span>
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {key.key_preview}
                      </span>
                    </div>

                    {key.description && (
                      <p className="text-sm text-gray-600 mb-3">{key.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {key.permissions?.join(', ') || 'No permissions'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {key.rate_limits?.max_requests || 1000}/{(key.rate_limits?.window_ms || 3600000) / 3600000}h
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          Last used: {formatDate(key.last_used_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {key.total_requests} requests
                        </span>
                      </div>
                    </div>

                    {(key.allowed_ips && key.allowed_ips.length > 0) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                        <Globe className="w-3 h-3" />
                        <span>Allowed IPs: {key.allowed_ips.join(', ')}</span>
                      </div>
                    )}

                    {key.expires_at && (
                      <div className="mt-2 text-xs text-gray-500">
                        Expires: {formatDate(key.expires_at)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSecret(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Toggle Secret"
                    >
                      {showSecret[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleRegenerate(key.id)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Regenerate"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(key)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {key.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Create/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowForm(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingKey ? "Edit API Key" : "Create New API Key"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Production API Key"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="What is this key for?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-2">
                      {apiPermissions.permissions?.map((perm: any) => (
                        <label key={perm.value} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.permissions?.includes(perm.value)}
                            onChange={(e) => {
                              const current = formData.permissions || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, permissions: [...current, perm.value] });
                              } else {
                                setFormData({ ...formData, permissions: current.filter(p => p !== perm.value) });
                              }
                            }}
                            className="w-4 h-4 text-red-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate Limit (requests)
                      </label>
                      <input
                        type="number"
                        value={formData.rate_limits?.max_requests || 1000}
                        onChange={(e) => setFormData({
                          ...formData,
                          rate_limits: {
                            ...formData.rate_limits,
                            max_requests: parseInt(e.target.value),
                            window_ms: formData.rate_limits?.window_ms || 3600000,
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Window
                      </label>
                      <select
                        value={formData.rate_limits?.window_ms || 3600000}
                        onChange={(e) => setFormData({
                          ...formData,
                          rate_limits: {
                            ...formData.rate_limits,
                            window_ms: parseInt(e.target.value),
                            max_requests: formData.rate_limits?.max_requests || 1000,
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      >
                        <option value={3600000}>Per Hour</option>
                        <option value={86400000}>Per Day</option>
                        <option value={60000}>Per Minute</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allowed IPs (one per line)
                    </label>
                    <textarea
                      value={formData.allowed_ips?.join('\n') || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        allowed_ips: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                      })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="192.168.1.1&#10;10.0.0.0/24"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to allow all IPs</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allowed Domains (one per line)
                    </label>
                    <textarea
                      value={formData.allowed_domains?.join('\n') || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        allowed_domains: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                      })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="example.com&#10;api.example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to allow all domains</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at?.slice(0, 16) || ''}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-red-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      <Save className="w-4 h-4" />
                      {editingKey ? "Update API Key" : "Create API Key"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}