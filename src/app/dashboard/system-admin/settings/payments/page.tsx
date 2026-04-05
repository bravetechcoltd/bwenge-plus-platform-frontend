"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  getPaymentIntegrations,
  getPaymentProviders,
  createPaymentIntegration,
  updatePaymentIntegration,
  deletePaymentIntegration,
  testPaymentIntegration,
  PaymentIntegration,
} from "@/lib/features/system-settings/systemSettingsSlice";
import {
  CreditCard,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Globe,
  Shield,
  Zap,
  Clock,
  DollarSign,
  Activity,
  Webhook,
  Key,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function PaymentIntegrationPage() {
  const dispatch = useAppDispatch();
  const { paymentIntegrations, paymentProviders, isLoading } = useAppSelector(
    (state) => state.systemSettings
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<PaymentIntegration | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentIntegration>>({
    provider: "STRIPE",
    display_name: "",
    environment: "SANDBOX",
    credentials: {},
    supported_currencies: ["USD"],
    supported_payment_methods: ["card"],
    transaction_fee_percentage: 0,
    transaction_fee_fixed: 0,
    settings: {
      auto_capture: true,
      allow_refunds: true,
    },
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const loadData = () => {
    dispatch(getPaymentIntegrations({}));
    dispatch(getPaymentProviders());
  };

  const filteredIntegrations = paymentIntegrations.filter((integration) => {
    const matchesSearch =
      integration.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.provider.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvider = providerFilter === "all" || integration.provider === providerFilter;
    const matchesStatus = statusFilter === "all" || integration.status === statusFilter;

    return matchesSearch && matchesProvider && matchesStatus;
  });

  const handleEdit = (integration: PaymentIntegration) => {
    setEditingIntegration(integration);
    setFormData({
      ...integration,
      credentials: {}, // Don't prefill credentials for security
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment integration?")) return;

    try {
      await dispatch(deletePaymentIntegration(id)).unwrap();
      toast.success("Payment integration deleted successfully");
    } catch (error: any) {
      toast.error(error || "Failed to delete payment integration");
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await dispatch(testPaymentIntegration(id)).unwrap();
      if (result.status === "healthy") {
        toast.success("Integration test successful!");
      } else {
        toast.error(`Test failed: ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      toast.error(error || "Test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingIntegration) {
        await dispatch(
          updatePaymentIntegration({
            id: editingIntegration.id,
            data: formData,
          })
        ).unwrap();
        toast.success("Payment integration updated successfully");
      } else {
        await dispatch(createPaymentIntegration(formData)).unwrap();
        toast.success("Payment integration created successfully");
      }

      setShowForm(false);
      setEditingIntegration(null);
      setFormData({
        provider: "STRIPE",
        display_name: "",
        environment: "SANDBOX",
        credentials: {},
        supported_currencies: ["USD"],
        supported_payment_methods: ["card"],
        transaction_fee_percentage: 0,
        transaction_fee_fixed: 0,
        settings: { auto_capture: true, allow_refunds: true },
        is_default: false,
        is_active: true,
      });
      loadData();
    } catch (error: any) {
      toast.error(error || "Failed to save payment integration");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: "bg-success/15 text-success",
      INACTIVE: "bg-muted text-muted-foreground",
      MAINTENANCE: "bg-warning/15 text-warning",
      ERROR: "bg-destructive/15 text-destructive",
    };
    return styles[status as keyof typeof styles] || styles.INACTIVE;
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "STRIPE":
        return "💳";
      case "PAYPAL":
        return "🅿️";
      case "FLUTTERWAVE":
        return "🌊";
      case "PAYSTACK":
        return "📦";
      case "MPESA":
        return "📱";
      default:
        return "💰";
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success rounded-xl">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Integration</h1>
              <p className="text-sm text-muted-foreground">Configure payment gateways and transaction settings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 border border-border rounded-lg hover:bg-muted/50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => {
                setEditingIntegration(null);
                setFormData({
                  provider: "STRIPE",
                  display_name: "",
                  environment: "SANDBOX",
                  credentials: {},
                  supported_currencies: ["USD"],
                  supported_payment_methods: ["card"],
                  transaction_fee_percentage: 0,
                  transaction_fee_fixed: 0,
                  settings: { auto_capture: true, allow_refunds: true },
                  is_default: false,
                  is_active: true,
                });
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-success text-white px-4 py-2 rounded-lg hover:bg-success"
            >
              <Plus className="w-4 h-4" />
              Add Integration
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Integrations</p>
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{paymentIntegrations.length}</p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active</p>
              <Check className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">
              {paymentIntegrations.filter(i => i.status === "ACTIVE").length}
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Default</p>
              <Star className="w-4 h-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-warning">
              {paymentIntegrations.filter(i => i.is_default).length}
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">$0</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Providers</option>
              {paymentProviders.providers?.map((p: any) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Statuses</option>
              {paymentProviders.statuses?.map((status: string) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="bg-card rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-success border-t-transparent mx-auto" />
            </div>
          ) : filteredIntegrations.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No payment integrations found</p>
            </div>
          ) : (
            filteredIntegrations.map((integration) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-2xl">
                        {getProviderIcon(integration.provider)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{integration.display_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(integration.status)}`}>
                            {integration.status}
                          </span>
                          {integration.is_default && (
                            <span className="px-2 py-0.5 bg-warning/15 text-warning rounded-full text-xs">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {integration.provider} • {integration.environment}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Fee: {integration.transaction_fee_percentage}% + ${integration.transaction_fee_fixed}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{integration.supported_currencies?.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Health: {integration.health_check?.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Last: {integration.last_transaction_at 
                            ? new Date(integration.last_transaction_at).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </div>
                    </div>

                    {integration.webhook_config?.enabled && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                        <Webhook className="w-3 h-3" />
                        <span>Webhook: {integration.webhook_config.url}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(integration.id)}
                      disabled={testingId === integration.id}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Test Connection"
                    >
                      {testingId === integration.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(integration)}
                      className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
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
                className="relative bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-success" />
                    <h2 className="text-lg font-semibold text-foreground">
                      {editingIntegration ? "Edit Integration" : "New Payment Integration"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1 hover:bg-muted rounded-lg"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Provider <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={formData.provider}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      >
                        {paymentProviders.providers?.map((p: any) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Display Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Environment
                      </label>
                      <select
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="SANDBOX">Sandbox (Test)</option>
                        <option value="PRODUCTION">Production (Live)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status || "ACTIVE"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="MAINTENANCE">Maintenance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      API Credentials
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">API Key / Public Key</label>
                        <input
                          type="password"
                          value={formData.credentials?.api_key || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            credentials: { ...formData.credentials, api_key: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="Enter API key"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Secret Key</label>
                        <input
                          type="password"
                          value={formData.credentials?.secret_key || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            credentials: { ...formData.credentials, secret_key: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="Enter secret key"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Webhook Secret</label>
                        <input
                          type="password"
                          value={formData.credentials?.webhook_secret || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            credentials: { ...formData.credentials, webhook_secret: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="Enter webhook secret"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Supported Currencies
                      </label>
                      <input
                        type="text"
                        value={formData.supported_currencies?.join(', ') || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          supported_currencies: e.target.value.split(',').map(s => s.trim().toUpperCase())
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="USD, EUR, GBP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Payment Methods
                      </label>
                      <input
                        type="text"
                        value={formData.supported_payment_methods?.join(', ') || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          supported_payment_methods: e.target.value.split(',').map(s => s.trim())
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="card, paypal, mobile_money"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Transaction Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.transaction_fee_percentage}
                        onChange={(e) => setFormData({ ...formData, transaction_fee_percentage: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Fixed Fee ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.transaction_fee_fixed}
                        onChange={(e) => setFormData({ ...formData, transaction_fee_fixed: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Webhook Configuration
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Webhook URL</label>
                        <input
                          type="url"
                          value={formData.webhook_config?.url || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            webhook_config: { ...formData.webhook_config, url: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="https://api.example.com/webhook"
                        />
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.webhook_config?.enabled || false}
                          onChange={(e) => setFormData({
                            ...formData,
                            webhook_config: { ...formData.webhook_config, enabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-success rounded"
                        />
                        <span className="text-sm text-muted-foreground">Enable Webhooks</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_default || false}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="w-4 h-4 text-success rounded"
                      />
                      <span className="text-sm text-muted-foreground">Set as Default</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.settings?.auto_capture !== false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, auto_capture: e.target.checked }
                        })}
                        className="w-4 h-4 text-success rounded"
                      />
                      <span className="text-sm text-muted-foreground">Auto-capture payments</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.settings?.allow_refunds !== false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, allow_refunds: e.target.checked }
                        })}
                        className="w-4 h-4 text-success rounded"
                      />
                      <span className="text-sm text-muted-foreground">Allow refunds</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-success rounded"
                      />
                      <span className="text-sm text-muted-foreground">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 bg-success text-white px-4 py-2 rounded-lg hover:bg-success"
                    >
                      <Save className="w-4 h-4" />
                      {editingIntegration ? "Update Integration" : "Create Integration"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50"
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