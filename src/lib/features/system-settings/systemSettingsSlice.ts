
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

// ==================== INTERFACES ====================

export interface PlatformConfiguration {
  id: string;
  key: string;
  display_name: string;
  type: "SYSTEM" | "SECURITY" | "EMAIL" | "STORAGE" | "FEATURE" | "LOCALIZATION";
  data_type: "STRING" | "NUMBER" | "BOOLEAN" | "JSON" | "ARRAY";
  value: string | null;
  json_value: any;
  array_value: string[];
  description: string;
  validation_rules: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
    depends_on?: string;
  };
  metadata: {
    category?: string;
    order?: number;
    is_sensitive?: boolean;
    is_encrypted?: boolean;
    ui_component?: "input" | "textarea" | "select" | "checkbox" | "radio" | "json";
    ui_options?: any;
  };
  is_active: boolean;
  requires_restart: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentIntegration {
  id: string;
  provider: "STRIPE" | "PAYPAL" | "FLUTTERWAVE" | "PAYSTACK" | "MPESA" | "CUSTOM";
  display_name: string;
  environment: "SANDBOX" | "PRODUCTION";
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "ERROR";
  credentials: any;
  webhook_config: {
    url?: string;
    events?: string[];
    secret?: string;
    enabled?: boolean;
  };
  supported_currencies: string[];
  supported_payment_methods: string[];
  transaction_fee_percentage: number;
  transaction_fee_fixed: number;
  fee_structure: any;
  settings: any;
  metadata: any;
  is_default: boolean;
  is_active: boolean;
  last_webhook_received_at: string | null;
  last_transaction_at: string | null;
  health_check: {
    last_check: string;
    status: "healthy" | "degraded" | "down";
    latency_ms?: number;
    error?: string;
  };
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface GlobalPolicy {
  id: string;
  type: string;
  title: string;
  slug: string;
  version: string;
  content: string;
  summary: string;
  sections: {
    id: string;
    title: string;
    content: string;
    order: number;
  }[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  effective_date: string;
  expiry_date: string | null;
  published_at: string | null;
  requires_acceptance: boolean;
  acceptance_count: number;
  change_log: {
    version: string;
    date: string;
    changes: string[];
    author: string;
  }[];
  metadata: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  description: string;
  key_preview: string;
  key?: string; // Only returned on creation
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "REVOKED";
  permissions: string[];
  allowed_ips: string[];
  allowed_domains: string[];
  rate_limits: {
    window_ms: number;
    max_requests: number;
  };
  expires_at: string | null;
  last_used_at: string | null;
  total_requests: number;
  metadata: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseBackup {
  id: string;
  filename: string;
  type: "FULL" | "INCREMENTAL" | "SCHEMA" | "DATA";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "RESTORING";
  size_bytes: number;
  storage_path: string;
  public_url: string | null;
  metadata: any;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  is_automated: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface SystemSettingsState {
  // Platform Config
  platformConfigs: PlatformConfiguration[];
  platformConfigTypes: { config_types: string[]; data_types: string[] };

  // Payment Integrations
  paymentIntegrations: PaymentIntegration[];
  paymentProviders: any;

  // Global Policies
  globalPolicies: GlobalPolicy[];
  policyTypes: any;

  // API Keys
  apiKeys: ApiKey[];
  apiPermissions: any;

  // Database
  databaseBackups: DatabaseBackup[];
  databaseHealth: any;
  databaseStatus: any;
  activeQueries: any[];

  // UI States
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: SystemSettingsState = {
  platformConfigs: [],
  platformConfigTypes: { config_types: [], data_types: [] },
  paymentIntegrations: [],
  paymentProviders: { providers: [], environments: [], statuses: [] },
  globalPolicies: [],
  policyTypes: { types: [], statuses: [] },
  apiKeys: [],
  apiPermissions: { permissions: [], statuses: [] },
  databaseBackups: [],
  databaseHealth: null,
  databaseStatus: null,
  activeQueries: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

// ==================== ASYNC THUNKS ====================

// Platform Configuration
export const getPlatformConfigs = createAsyncThunk(
  "systemSettings/getPlatformConfigs",
  async (params: { type?: string; category?: string; active_only?: boolean } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });

      const response = await api.get(`/system-settings/platform?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch platform configs");
    }
  }
);

export const getPlatformConfigTypes = createAsyncThunk(
  "systemSettings/getPlatformConfigTypes",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-settings/platform/types");
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch platform config types");
    }
  }
);

export const createPlatformConfig = createAsyncThunk(
  "systemSettings/createPlatformConfig",
  async (data: Partial<PlatformConfiguration>, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-settings/platform", data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create platform config");
    }
  }
);

export const updatePlatformConfig = createAsyncThunk(
  "systemSettings/updatePlatformConfig",
  async ({ key, data }: { key: string; data: Partial<PlatformConfiguration> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/system-settings/platform/${key}`, data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update platform config");
    }
  }
);

export const deletePlatformConfig = createAsyncThunk(
  "systemSettings/deletePlatformConfig",
  async (key: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/system-settings/platform/${key}`);
      return response.data.success ? key : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete platform config");
    }
  }
);

// Payment Integrations
export const getPaymentIntegrations = createAsyncThunk(
  "systemSettings/getPaymentIntegrations",
  async (params: { provider?: string; status?: string; environment?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });

      const response = await api.get(`/system-settings/payments?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch payment integrations");
    }
  }
);

export const getPaymentProviders = createAsyncThunk(
  "systemSettings/getPaymentProviders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-settings/payments/providers");
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch payment providers");
    }
  }
);

export const createPaymentIntegration = createAsyncThunk(
  "systemSettings/createPaymentIntegration",
  async (data: Partial<PaymentIntegration>, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-settings/payments", data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create payment integration");
    }
  }
);

export const updatePaymentIntegration = createAsyncThunk(
  "systemSettings/updatePaymentIntegration",
  async ({ id, data }: { id: string; data: Partial<PaymentIntegration> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/system-settings/payments/${id}`, data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update payment integration");
    }
  }
);

export const deletePaymentIntegration = createAsyncThunk(
  "systemSettings/deletePaymentIntegration",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/system-settings/payments/${id}`);
      return response.data.success ? id : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete payment integration");
    }
  }
);

export const testPaymentIntegration = createAsyncThunk(
  "systemSettings/testPaymentIntegration",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/system-settings/payments/${id}/test`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to test payment integration");
    }
  }
);

// Global Policies
export const getGlobalPolicies = createAsyncThunk(
  "systemSettings/getGlobalPolicies",
  async (params: { type?: string; status?: string; active_only?: boolean } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });

      const response = await api.get(`/system-settings/policies?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch global policies");
    }
  }
);

export const getPolicyTypes = createAsyncThunk(
  "systemSettings/getPolicyTypes",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-settings/policies/types");
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch policy types");
    }
  }
);

export const createGlobalPolicy = createAsyncThunk(
  "systemSettings/createGlobalPolicy",
  async (data: Partial<GlobalPolicy>, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-settings/policies", data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create global policy");
    }
  }
);

export const updateGlobalPolicy = createAsyncThunk(
  "systemSettings/updateGlobalPolicy",
  async ({ id, data }: { id: string; data: Partial<GlobalPolicy> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/system-settings/policies/${id}`, data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update global policy");
    }
  }
);

export const deleteGlobalPolicy = createAsyncThunk(
  "systemSettings/deleteGlobalPolicy",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/system-settings/policies/${id}`);
      return response.data.success ? id : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete global policy");
    }
  }
);

export const publishGlobalPolicy = createAsyncThunk(
  "systemSettings/publishGlobalPolicy",
  async ({ id, effective_date }: { id: string; effective_date?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/system-settings/policies/${id}/publish`, { effective_date });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to publish global policy");
    }
  }
);

// API Keys
export const getApiKeys = createAsyncThunk(
  "systemSettings/getApiKeys",
  async (params: { status?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append("status", params.status);

      const response = await api.get(`/system-settings/api-keys?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch API keys");
    }
  }
);

export const getApiPermissions = createAsyncThunk(
  "systemSettings/getApiPermissions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-settings/api-keys/permissions");
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch API permissions");
    }
  }
);

export const createApiKey = createAsyncThunk(
  "systemSettings/createApiKey",
  async (data: Partial<ApiKey>, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-settings/api-keys", data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create API key");
    }
  }
);

export const updateApiKey = createAsyncThunk(
  "systemSettings/updateApiKey",
  async ({ id, data }: { id: string; data: Partial<ApiKey> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/system-settings/api-keys/${id}`, data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update API key");
    }
  }
);

export const deleteApiKey = createAsyncThunk(
  "systemSettings/deleteApiKey",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/system-settings/api-keys/${id}`);
      return response.data.success ? id : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete API key");
    }
  }
);

export const revokeApiKey = createAsyncThunk(
  "systemSettings/revokeApiKey",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/system-settings/api-keys/${id}/revoke`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to revoke API key");
    }
  }
);

export const regenerateApiKey = createAsyncThunk(
  "systemSettings/regenerateApiKey",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/system-settings/api-keys/${id}/regenerate`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to regenerate API key");
    }
  }
);

export const getDatabaseBackups = createAsyncThunk(
  "systemSettings/getDatabaseBackups",
  async (params: { page?: number; limit?: number; status?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append("page", String(params.page));
      if (params.limit) queryParams.append("limit", String(params.limit));
      if (params.status) queryParams.append("status", params.status);

      const response = await api.get(`/system-settings/database/backups?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch database backups");
    }
  }
);

export const createDatabaseBackup = createAsyncThunk(
  "systemSettings/createDatabaseBackup",
  async (data: { type?: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-settings/database/backups", data);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create database backup");
    }
  }
);

export const restoreDatabaseBackup = createAsyncThunk(
  "systemSettings/restoreDatabaseBackup",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/system-settings/database/backups/${id}/restore`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to restore database backup");
    }
  }
);

export const deleteDatabaseBackup = createAsyncThunk(
  "systemSettings/deleteDatabaseBackup",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/system-settings/database/backups/${id}`);
      return response.data.success ? id : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete database backup");
    }
  }
);

export const getDatabaseHealth = createAsyncThunk(
  "systemSettings/getDatabaseHealth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-settings/database/health");
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch database health");
    }
  }
);

export const getDatabaseStatus = createAsyncThunk(
  "systemSettings/getDatabaseStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-settings/database/status");
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch database status");
    }
  }
);

export const getActiveQueries = createAsyncThunk(
  "systemSettings/getActiveQueries",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-settings/database/queries");
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch active queries");
    }
  }
);

export const terminateQuery = createAsyncThunk(
  "systemSettings/terminateQuery",
  async (pid: number, { rejectWithValue }) => {
    try {
      const response = await api.post(`/system-settings/database/queries/${pid}/terminate`);
      return response.data.success ? pid : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to terminate query");
    }
  }
);

export const runVacuum = createAsyncThunk(
  "systemSettings/runVacuum",
  async (params: { table?: string; full?: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-settings/database/maintenance/vacuum", params);
      return response.data.success ? response.data.message : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to run vacuum");
    }
  }
);

export const runAnalyze = createAsyncThunk(
  "systemSettings/runAnalyze",
  async (params: { table?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-settings/database/maintenance/analyze", params);
      return response.data.success ? response.data.message : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to run analyze");
    }
  }
);

// ==================== SLICE ====================

const systemSettingsSlice = createSlice({
  name: "systemSettings",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPlatformConfigs: (state) => {
      state.platformConfigs = [];
    },
    clearPaymentIntegrations: (state) => {
      state.paymentIntegrations = [];
    },
    clearGlobalPolicies: (state) => {
      state.globalPolicies = [];
    },
    clearApiKeys: (state) => {
      state.apiKeys = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Platform Configs
      .addCase(getPlatformConfigs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPlatformConfigs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.platformConfigs = action.payload;
      })
      .addCase(getPlatformConfigs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getPlatformConfigTypes.fulfilled, (state, action) => {
        state.platformConfigTypes = action.payload;
      })
      .addCase(createPlatformConfig.fulfilled, (state, action) => {
        state.platformConfigs.unshift(action.payload);
      })
      .addCase(updatePlatformConfig.fulfilled, (state, action) => {
        const index = state.platformConfigs.findIndex(c => c.key === action.payload.key);
        if (index !== -1) state.platformConfigs[index] = action.payload;
      })
      .addCase(deletePlatformConfig.fulfilled, (state, action) => {
        state.platformConfigs = state.platformConfigs.filter(c => c.key !== action.payload);
      })

      // Payment Integrations
      .addCase(getPaymentIntegrations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPaymentIntegrations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentIntegrations = action.payload;
      })
      .addCase(getPaymentIntegrations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getPaymentProviders.fulfilled, (state, action) => {
        state.paymentProviders = action.payload;
      })
      .addCase(createPaymentIntegration.fulfilled, (state, action) => {
        state.paymentIntegrations.unshift(action.payload);
      })
      .addCase(updatePaymentIntegration.fulfilled, (state, action) => {
        const index = state.paymentIntegrations.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.paymentIntegrations[index] = action.payload;
      })
      .addCase(deletePaymentIntegration.fulfilled, (state, action) => {
        state.paymentIntegrations = state.paymentIntegrations.filter(p => p.id !== action.payload);
      })
      .addCase(testPaymentIntegration.fulfilled, (state, action) => {
        // Update the integration's health check status
        const index = state.paymentIntegrations.findIndex(p => p.id === action.meta.arg);
        if (index !== -1 && state.paymentIntegrations[index].health_check) {
          state.paymentIntegrations[index].health_check = {
            ...state.paymentIntegrations[index].health_check,
            ...action.payload,
            last_check: new Date().toISOString(),
          };
        }
      })

      // Global Policies
      .addCase(getGlobalPolicies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getGlobalPolicies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.globalPolicies = action.payload.policies;
      })
      .addCase(getGlobalPolicies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getPolicyTypes.fulfilled, (state, action) => {
        state.policyTypes = action.payload;
      })
      .addCase(createGlobalPolicy.fulfilled, (state, action) => {
        state.globalPolicies.unshift(action.payload);
      })
      .addCase(updateGlobalPolicy.fulfilled, (state, action) => {
        const index = state.globalPolicies.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.globalPolicies[index] = action.payload;
      })
      .addCase(deleteGlobalPolicy.fulfilled, (state, action) => {
        state.globalPolicies = state.globalPolicies.filter(p => p.id !== action.payload);
      })
      .addCase(publishGlobalPolicy.fulfilled, (state, action) => {
        const index = state.globalPolicies.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.globalPolicies[index] = action.payload;
      })

      // API Keys
      .addCase(getApiKeys.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getApiKeys.fulfilled, (state, action) => {
        state.isLoading = false;
        state.apiKeys = action.payload;
      })
      .addCase(getApiKeys.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getApiPermissions.fulfilled, (state, action) => {
        state.apiPermissions = action.payload;
      })
      .addCase(createApiKey.fulfilled, (state, action) => {
        state.apiKeys.unshift(action.payload);
      })
      .addCase(updateApiKey.fulfilled, (state, action) => {
        const index = state.apiKeys.findIndex(k => k.id === action.payload.id);
        if (index !== -1) state.apiKeys[index] = action.payload;
      })
      .addCase(deleteApiKey.fulfilled, (state, action) => {
        state.apiKeys = state.apiKeys.filter(k => k.id !== action.payload);
      })
      .addCase(revokeApiKey.fulfilled, (state, action) => {
        const index = state.apiKeys.findIndex(k => k.id === action.payload.id);
        if (index !== -1) state.apiKeys[index] = action.payload;
      })
      .addCase(regenerateApiKey.fulfilled, (state, action) => {
        const index = state.apiKeys.findIndex(k => k.id === action.payload.id);
        if (index !== -1) state.apiKeys[index] = action.payload;
      })

      // Database
      .addCase(getDatabaseBackups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDatabaseBackups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.databaseBackups = action.payload.backups;
        state.pagination = action.payload.pagination;
      })
      .addCase(getDatabaseBackups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createDatabaseBackup.fulfilled, (state, action) => {
        state.databaseBackups.unshift(action.payload);
      })
      .addCase(restoreDatabaseBackup.fulfilled, (state, action) => {
        const index = state.databaseBackups.findIndex(b => b.id === action.payload.id);
        if (index !== -1) state.databaseBackups[index] = action.payload;
      })
      .addCase(deleteDatabaseBackup.fulfilled, (state, action) => {
        state.databaseBackups = state.databaseBackups.filter(b => b.id !== action.payload);
      })
      .addCase(getDatabaseHealth.fulfilled, (state, action) => {
        state.databaseHealth = action.payload;
      })
      .addCase(getDatabaseStatus.fulfilled, (state, action) => {
        state.databaseStatus = action.payload;
      })
      .addCase(getActiveQueries.fulfilled, (state, action) => {
        state.activeQueries = action.payload;
      })
      .addCase(terminateQuery.fulfilled, (state, action) => {
        state.activeQueries = state.activeQueries.filter(q => q.pid !== action.payload);
      });
  },
});

export const {
  clearError,
  clearPlatformConfigs,
  clearPaymentIntegrations,
  clearGlobalPolicies,
  clearApiKeys,
} = systemSettingsSlice.actions;

export default systemSettingsSlice.reducer;
