import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { RootState } from "@/lib/store";

export interface SystemUser {
  // Basic Info
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  profile_picture_url?: string;
  bio?: string;
  
  // Account Info
  account_type: string;
  is_verified: boolean;
  is_active: boolean;
  country?: string;
  city?: string;
  
  // Dates
  date_joined: string;
  last_login?: string;
  last_login_bwenge?: string;
  updated_at?: string;
  
  // Roles
  bwenge_role: string;
  institution_role?: string;
  
  // Institution Info
  is_institution_member: boolean;
  institution_ids: string[];
  primary_institution_id?: string;
  institutions?: Array<{
    id: string;
    name: string;
    logo_url?: string;
    role: string;
    is_active: boolean;
    joined_at: string;
  }>;
  
  // Statistics
  statistics?: {
    enrolled_courses_count: number;
    completed_courses_count: number;
    courses_taught: number;
    total_learning_hours: number;
    certificates_earned: number;
    institutions_count: number;
  };
  
  // Profile
  profile?: any;
}

export interface UserStatistics {
  total_users: number;
  by_role: {
    SYSTEM_ADMIN: number;
    INSTITUTION_ADMIN: number;
    CONTENT_CREATOR: number;
    INSTRUCTOR: number;
    LEARNER: number;
  };
  by_account_type: {
    Student: number;
    Researcher: number;
    Institution: number;
    Diaspora: number;
    admin: number;
  };
  active_users: number;
  verified_users: number;
  recent_signups: number;
  institution_members: number;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserFilters {
  search: string;
  bwenge_role: string | null;
  institution_role: string | null;
  account_type: string | null;
  is_institution_member: boolean | null;
  institution_id: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  sort_by: string;
  sort_order: string;
}

interface UserManagementState {
  // Users list
  users: SystemUser[];
  isLoadingUsers: boolean;
  usersError: string | null;
  usersPagination: PaginationData | null;
  
  // Single user
  selectedUser: SystemUser | null;
  isLoadingUser: boolean;
  userError: string | null;
  
  // Statistics
  statistics: UserStatistics | null;
  isLoadingStats: boolean;
  
  // Operations
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  operationSuccess: boolean;
  operationError: string | null;
  
  // Filters
  filters: UserFilters;
}

const initialFilters: UserFilters = {
  search: "",
  bwenge_role: null,
  institution_role: null,
  account_type: null,
  is_institution_member: null,
  institution_id: null,
  is_active: null,
  is_verified: null,
  sort_by: "created_at",
  sort_order: "DESC",
};

const initialState: UserManagementState = {
  users: [],
  isLoadingUsers: false,
  usersError: null,
  usersPagination: null,
  
  selectedUser: null,
  isLoadingUser: false,
  userError: null,
  
  statistics: null,
  isLoadingStats: false,
  
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  operationSuccess: false,
  operationError: null,
  
  filters: initialFilters,
};

// Async Thunks

// Thunk 1: fetchSystemUsers
export const fetchSystemUsers = createAsyncThunk(
  "systemAdmin/fetchUsers",
  async (
    {
      page = 1,
      limit = 20,
      filters = initialFilters,
    }: {
      page?: number;
      limit?: number;
      filters?: Partial<UserFilters>;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      
      const response = await api.get(`/system-admin/users?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch users"
      );
    }
  }
);

// Thunk 2: fetchUserDetails
export const fetchUserDetails = createAsyncThunk(
  "systemAdmin/fetchUserDetails",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/system-admin/users/${userId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user details"
      );
    }
  }
);

// Thunk 3: createUser
export const createUser = createAsyncThunk(
  "systemAdmin/createUser",
  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/system-admin/users", userData);
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create user"
      );
    }
  }
);

// Thunk 4: updateUser
export const updateUser = createAsyncThunk(
  "systemAdmin/updateUser",
  async (
    { userId, updates }: { userId: string; updates: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/system-admin/users/${userId}`, updates);
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update user"
      );
    }
  }
);

// Thunk 5: deleteUser
export const deleteUser = createAsyncThunk(
  "systemAdmin/deleteUser",
  async (
    {
      userId,
      options = {},
    }: {
      userId: string;
      options?: {
        permanent?: boolean;
        force?: boolean;
        reassign_courses_to?: string;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (options.permanent) params.append("permanent", "true");
      if (options.force) params.append("force", "true");
      if (options.reassign_courses_to) {
        params.append("reassign_courses_to", options.reassign_courses_to);
      }
      
      const response = await api.delete(
        `/system-admin/users/${userId}?${params.toString()}`
      );
      
      if (response.data.success) {
        return { userId, ...response.data.data };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete user"
      );
    }
  }
);

// Thunk 6: batchUpdateUsers
export const batchUpdateUsers = createAsyncThunk(
  "systemAdmin/batchUpdate",
  async (
    { userIds, updates }: { userIds: string[]; updates: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch("/system-admin/users/batch", {
        user_ids: userIds,
        updates,
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to batch update users"
      );
    }
  }
);

// Thunk 7: resetUserPassword
export const resetUserPassword = createAsyncThunk(
  "systemAdmin/resetPassword",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/system-admin/users/${userId}/reset-password`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to reset password"
      );
    }
  }
);

// Thunk 8: toggleUserStatus
export const toggleUserStatus = createAsyncThunk(
  "systemAdmin/toggleStatus",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/system-admin/users/${userId}/toggle-status`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle user status"
      );
    }
  }
);

// Thunk 9: fetchUserStatistics
export const fetchUserStatistics = createAsyncThunk(
  "systemAdmin/fetchStatistics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/system-admin/users/statistics");
      
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch statistics"
      );
    }
  }
);

// Create slice
const userManagementSlice = createSlice({
  name: "systemAdminUserManagement",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<UserFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    resetFilters: (state) => {
      state.filters = initialFilters;
    },
    
    clearOperationStatus: (state) => {
      state.operationSuccess = false;
      state.operationError = null;
    },
    
    setSelectedUser: (state, action: PayloadAction<SystemUser | null>) => {
      state.selectedUser = action.payload;
    },
    
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
    
    updateUserLocally: (state, action: PayloadAction<{ id: string; updates: Partial<SystemUser> }>) => {
      const index = state.users.findIndex(u => u.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...action.payload.updates };
      }
    },
    
    // Add other reducers as needed
  },
  extraReducers: (builder) => {
    builder
      // fetchSystemUsers
      .addCase(fetchSystemUsers.pending, (state) => {
        state.isLoadingUsers = true;
        state.usersError = null;
      })
      .addCase(fetchSystemUsers.fulfilled, (state, action) => {
        state.isLoadingUsers = false;
        state.users = action.payload.users;
        state.usersPagination = action.payload.pagination;
        state.usersError = null;
      })
      .addCase(fetchSystemUsers.rejected, (state, action) => {
        state.isLoadingUsers = false;
        state.usersError = action.payload as string;
      })
      
      // fetchUserDetails
      .addCase(fetchUserDetails.pending, (state) => {
        state.isLoadingUser = true;
        state.userError = null;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.isLoadingUser = false;
        state.selectedUser = action.payload.user;
        state.userError = null;
      })
      .addCase(fetchUserDetails.rejected, (state, action) => {
        state.isLoadingUser = false;
        state.userError = action.payload as string;
      })
      
      // createUser
      .addCase(createUser.pending, (state) => {
        state.isCreating = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isCreating = false;
        state.users.unshift(action.payload.user);
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isCreating = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      })
      
      // updateUser
      .addCase(updateUser.pending, (state) => {
        state.isUpdating = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.users.findIndex(u => u.id === action.payload.user.id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
        if (state.selectedUser?.id === action.payload.user.id) {
          state.selectedUser = action.payload.user;
        }
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isUpdating = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      })
      
      // deleteUser
      .addCase(deleteUser.pending, (state) => {
        state.isDeleting = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.users = state.users.filter(u => u.id !== action.payload.userId);
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isDeleting = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      })
      
      // fetchUserStatistics
      .addCase(fetchUserStatistics.pending, (state) => {
        state.isLoadingStats = true;
      })
      .addCase(fetchUserStatistics.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.statistics = action.payload;
      })
      .addCase(fetchUserStatistics.rejected, (state) => {
        state.isLoadingStats = false;
      });
  },
});

// Export actions
export const {
  setFilters,
  resetFilters,
  clearOperationStatus,
  setSelectedUser,
  clearSelectedUser,
  updateUserLocally,
} = userManagementSlice.actions;

// Export selectors
export const selectSystemUsers = (state: RootState) => state.systemAdminUserManagement.users;
export const selectIsLoadingUsers = (state: RootState) => state.systemAdminUserManagement.isLoadingUsers;
export const selectUsersPagination = (state: RootState) => state.systemAdminUserManagement.usersPagination;
export const selectUserFilters = (state: RootState) => state.systemAdminUserManagement.filters;
export const selectUserStatistics = (state: RootState) => state.systemAdminUserManagement.statistics;
export const selectIsCreating = (state: RootState) => state.systemAdminUserManagement.isCreating; 

export default userManagementSlice.reducer;