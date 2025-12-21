
"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  getPlatformConfigs,
  getPlatformConfigTypes,
  createPlatformConfig,
  updatePlatformConfig,
  deletePlatformConfig,
  PlatformConfiguration,
} from "@/lib/features/system-settings/systemSettingsSlice";
import {
  Cpu,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ChevronDown,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function PlatformConfigPage() {
  const dispatch = useAppDispatch();
  const { platformConfigs, platformConfigTypes, isLoading } = useAppSelector(
    (state) => state.systemSettings
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PlatformConfiguration | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Partial<PlatformConfiguration>>({
    key: "",
    display_name: "",
    type: "SYSTEM",
    data_type: "STRING",
    value: "",
    description: "",
    metadata: {
      ui_component: "input",
    },
    is_active: true,
    requires_restart: false,
  });

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const loadData = () => {
    dispatch(getPlatformConfigs({ active_only: false }));
    dispatch(getPlatformConfigTypes());
  };

  const filteredConfigs = platformConfigs.filter((config) => {
    const matchesSearch =
      config.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || config.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleEdit = (config: PlatformConfiguration) => {
    setEditingConfig(config);
    setFormData({
      ...config,
      value: config.metadata?.is_encrypted ? "" : config.value,
    });
    setShowForm(true);
  };

  const handleDelete = async (key: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    try {
      await dispatch(deletePlatformConfig(key)).unwrap();
      toast.success("Configuration deleted successfully");
    } catch (error: any) {
      toast.error(error || "Failed to delete configuration");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingConfig) {
        await dispatch(
          updatePlatformConfig({
            key: editingConfig.key,
            data: formData,
          })
        ).unwrap();
        toast.success("Configuration updated successfully");
      } else {
        await dispatch(createPlatformConfig(formData)).unwrap();
        toast.success("Configuration created successfully");
      }

      setShowForm(false);
      setEditingConfig(null);
      setFormData({
        key: "",
        display_name: "",
        type: "SYSTEM",
        data_type: "STRING",
        value: "",
        description: "",
        metadata: { ui_component: "input" },
        is_active: true,
        requires_restart: false,
      });
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to save configuration");
    }
  };

  const getValueDisplay = (config: PlatformConfiguration) => {
    if (config.metadata?.is_sensitive) {
      return showSensitive[config.id] ? config.value : "••••••••";
    }

    if (config.data_type === "BOOLEAN") {
      return config.value === "true" ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
          <Check className="w-3 h-3" /> True
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
          <X className="w-3 h-3" /> False
        </span>
      );
    }

    if (config.data_type === "JSON" && config.json_value) {
      return (
        <button
          onClick={() => alert(JSON.stringify(config.json_value, null, 2))}
          className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
        >
          View JSON
        </button>
      );
    }

    if (config.data_type === "ARRAY" && config.array_value) {
      return (
        <div className="flex flex-wrap gap-1">
          {config.array_value.slice(0, 3).map((item, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
              {item}
            </span>
          ))}
          {config.array_value.length > 3 && (
            <span className="text-xs text-gray-500">+{config.array_value.length - 3}</span>
          )}
        </div>
      );
    }

    return config.value || <span className="text-gray-400">—</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platform Configuration</h1>
              <p className="text-sm text-gray-600">Manage system-wide settings and feature flags</p>
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
                setEditingConfig(null);
                setFormData({
                  key: "",
                  display_name: "",
                  type: "SYSTEM",
                  data_type: "STRING",
                  value: "",
                  description: "",
                  metadata: { ui_component: "input" },
                  is_active: true,
                  requires_restart: false,
                });
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Setting
            </button>
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
                placeholder="Search configurations..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {platformConfigTypes.config_types?.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Configurations Grid */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Cpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No configurations found</p>
            </div>
          ) : (
            filteredConfigs.map((config) => (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{config.display_name}</h3>
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {config.key}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {config.type}
                      </span>
                      {!config.is_active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          Inactive
                        </span>
                      )}
                      {config.requires_restart && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                          Requires Restart
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{config.description}</p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Value:</span>
                        <div className="flex items-center gap-1">
                          {getValueDisplay(config)}
                          {config.metadata?.is_sensitive && (
                            <button
                              onClick={() =>
                                setShowSensitive((prev) => ({
                                  ...prev,
                                  [config.id]: !prev[config.id],
                                }))
                              }
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {showSensitive[config.id] ? (
                                <EyeOff className="w-3 h-3 text-gray-500" />
                              ) : (
                                <Eye className="w-3 h-3 text-gray-500" />
                              )}
                                       </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Type:</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {config.data_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Updated:</span>
                        <span className="text-xs">
                          {new Date(config.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(config)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(config.key)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                    <Settings className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingConfig ? "Edit Configuration" : "New Configuration"}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.key}
                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                        disabled={!!editingConfig}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Unique identifier, e.g., "site.name"</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {platformConfigTypes.config_types?.map((type) => (
                          <option key={type} value={type}>
                            {type.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Type
                      </label>
                      <select
                        value={formData.data_type}
                        onChange={(e) => setFormData({ ...formData, data_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {platformConfigTypes.data_types?.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    {formData.data_type === "BOOLEAN" ? (
                      <select
                        value={formData.value || "false"}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : formData.data_type === "JSON" ? (
                      <textarea
                        value={typeof formData.json_value === 'object' ? JSON.stringify(formData.json_value, null, 2) : formData.value || ''}
                        onChange={(e) => {
                          try {
                            const json = JSON.parse(e.target.value);
                            setFormData({ ...formData, json_value: json, value: e.target.value });
                          } catch {
                            setFormData({ ...formData, value: e.target.value });
                          }
                        }}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="{}"
                      />
                    ) : formData.data_type === "ARRAY" ? (
                      <input
                        type="text"
                        value={formData.array_value?.join(', ') || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          array_value: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="item1, item2, item3"
                      />
                    ) : (
                      <input
                        type={formData.metadata?.is_sensitive ? "password" : "text"}
                        value={formData.value || ''}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="What does this configuration control?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UI Component
                      </label>
                      <select
                        value={formData.metadata?.ui_component || "input"}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, ui_component: e.target.value as any }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="input">Input</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="radio">Radio</option>
                        <option value="json">JSON Editor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.metadata?.category || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, category: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., security, email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.metadata?.is_sensitive || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, is_sensitive: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Sensitive (encrypt)</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_restart || false}
                        onChange={(e) => setFormData({ ...formData, requires_restart: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Requires Restart</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      {editingConfig ? "Update Configuration" : "Create Configuration"}
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