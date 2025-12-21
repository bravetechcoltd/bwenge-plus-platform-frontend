import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { RootState } from "@/lib/store";
import { InstitutionMemberRole } from "@/types";
export interface InstitutionLimits {
  max_instructors: number;
  max_members: number;
  current_instructors: number;
  current_members: number;
  instructors_remaining: number;
  members_remaining: number;
  can_add_instructor: boolean;
  can_add_member: boolean;
}
export interface Institution {
  id: string;
  name: string;
  slug: string;
  type: "UNIVERSITY" | "GOVERNMENT" | "PRIVATE_COMPANY" | "NGO";
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  settings: {
    allow_public_courses?: boolean;
    require_approval_for_spoc?: boolean;
    max_instructors?: number;
    custom_branding?: any;
  };
  created_at: Date;
  updated_at: Date;
  memberCount?: number;
  max_instructors?: number;
  max_members?: number;
  instructorCount?: number;
  courseCount?: number;
  categoryCount?: number;
  members?: any[];
  statistics?: {
    members: number;
    courses: {
      total: number;
      by_type: any[];
      by_status: any[];
      by_level: any[];
      total_enrollments: any;
      total_rating: any;
      total_duration: any;
      total_lessons: any;
    };
    categories: number;
    instructors: number | { count: string };
    active_learners: number | { count: string };
  };
}

export interface CourseCategory {
  id: string;
  name: string;
  description: string | null;
  institution_id: string;
  parent_category_id: string | null;
  parent_category: {
    id: string;
    name: string;
  } | null;
  subcategories: CourseCategory[];
  order_index: number;
  is_active: boolean;
  slug: string;
  course_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  sort_by?: 'name' | 'order_index' | 'course_count';
  sort_order?: 'ASC' | 'DESC';
  include_course_count?: boolean;
  hierarchical?: boolean;
}

export interface CategoryCreateData {
  name: string;
  description?: string;
  institution_id: string;
  parent_category_id?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface CategoryUpdateData {
  name?: string;
  description?: string;
  parent_category_id?: string | null;
  order_index?: number;
  is_active?: boolean;
}

export interface CategoryReorderData {
  id: string;
  order_index: number;
}

interface InstitutionState {
  institutions: Institution[];
  selectedInstitution: Institution | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  createSuccess: boolean;
  updateSuccess: boolean;

  publicInstitutions: PublicInstitution[];
  isLoadingPublic: boolean;
  publicError: string | null;
  institutionLimits: InstitutionLimits | null;
  isLoadingLimits: boolean;
  limitsError: string | null;

  institutionCategories: CourseCategory[];
  isLoadingCategories: boolean;
  categoriesError: string | null;
  categoryOperationSuccess: boolean;
  categoryPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

const initialState: InstitutionState = {
  institutions: [],
  selectedInstitution: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  createSuccess: false,
  updateSuccess: false,
  publicInstitutions: [],
  isLoadingPublic: false,
  publicError: null,
  institutionCategories: [],
  isLoadingCategories: false,
  categoriesError: null,
  institutionLimits: null,
  isLoadingLimits: false,
  limitsError: null,
  categoryOperationSuccess: false,
  categoryPagination: null,
};

export interface PublicInstitution {
  id: string;
  name: string;
  logo_url: string | null;
  type: string;
  slug: string;
  categories: PublicCategory[];
}

export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
  course_count: number;
  courses: PublicCourse[];
}

export interface PublicCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  } | null;
  enrollment_count: number;
  average_rating: number;
  course_type: string;
  level: string;
  duration_minutes: number;
}

// ==================== HELPER FUNCTION ====================
// Helper function to safely extract numeric values from statistics
const getStatValue = (stat: any): number => {
  if (typeof stat === 'number') return stat;
  if (stat && typeof stat === 'object' && 'count' in stat) {
    const count = stat.count;
    if (typeof count === 'string') {
      const parsed = parseInt(count, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof count === 'number') return count;
  }
  return 0;
};

export const fetchInstitutionLimits = createAsyncThunk(
  "institutions/fetchLimits",
  async (institutionId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/institutions/${institutionId}/limits`);
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch institution limits"
      );
    }
  }
);

// ==================== ASYNC THUNKS ====================

export const fetchPublicInstitutionsForHomepage = createAsyncThunk(
  "institutions/fetchPublicHomepage",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/institutions/public/homepage");

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch public institutions"
      );
    }
  }
);

// Thunk 1: Fetch institution categories
export const fetchInstitutionCategories = createAsyncThunk(
  "institutions/fetchCategories",
  async (
    { institutionId, filters = {} }: {
      institutionId: string;
      filters?: CategoryFilters
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();

      // Add filter parameters
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.search) params.append("search", filters.search);
      if (filters.is_active !== undefined) params.append("is_active", filters.is_active.toString());
      if (filters.sort_by) params.append("sort_by", filters.sort_by);
      if (filters.sort_order) params.append("sort_order", filters.sort_order);
      if (filters.include_course_count !== undefined) {
        params.append("include_course_count", filters.include_course_count.toString());
      }
      if (filters.hierarchical !== undefined) {
        params.append("hierarchical", filters.hierarchical.toString());
      }

      const response = await api.get(
        `/categories/institution/${institutionId}?${params.toString()}`
      );

      if (response.data.success) {
        return {
          categories: response.data.data.categories,
          pagination: response.data.data.pagination
        };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch categories"
      );
    }
  }
);

// Thunk 2: Create institution category
export const createInstitutionCategory = createAsyncThunk(
  "institutions/createCategory",
  async (
    { institutionId, categoryData }: {
      institutionId: string;
      categoryData: CategoryCreateData
    },
    { rejectWithValue }
  ) => {
    try {
      // Ensure institution_id is included
      const dataToSend = {
        ...categoryData,
        institution_id: institutionId
      };

      const response = await api.post("/categories", dataToSend);

      if (response.data.success) {
        return response.data.data.category;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create category"
      );
    }
  }
);

// Thunk 3: Update institution category
export const updateInstitutionCategory = createAsyncThunk(
  "institutions/updateCategory",
  async (
    { categoryId, updates }: {
      categoryId: string;
      updates: CategoryUpdateData
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/categories/${categoryId}`, updates);

      if (response.data.success) {
        return response.data.data.category;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update category"
      );
    }
  }
);

// Thunk 4: Delete institution category
export const deleteInstitutionCategory = createAsyncThunk(
  "institutions/deleteCategory",
  async (
    {
      categoryId,
      force_delete,
      reassign_to
    }: {
      categoryId: string;
      force_delete?: boolean;
      reassign_to?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (force_delete) params.append("force_delete", force_delete.toString());
      if (reassign_to) params.append("reassign_to", reassign_to);

      const response = await api.delete(
        `/categories/${categoryId}?${params.toString()}`
      );

      if (response.data.success) {
        return { categoryId, ...response.data.data };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete category"
      );
    }
  }
);

// Thunk 5: Toggle category status
export const toggleCategoryStatus = createAsyncThunk(
  "institutions/toggleCategoryStatus",
  async (categoryId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/categories/${categoryId}/toggle-status`);

      if (response.data.success) {
        return response.data.data.category;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle category status"
      );
    }
  }
);

export const fetchInstitutionDashboard = createAsyncThunk(
  "institutionDashboard/fetch",
  async (institutionId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/institution-admin/${institutionId}/dashboard`);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch dashboard data");
    }
  }
);

export const fetchInstitutionInfo = createAsyncThunk(
  "institutionDashboard/fetchInfo",
  async (institutionId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/institution-admin/${institutionId}/info`);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch institution info");
    }
  }
);

export const addMemberToInstitution = createAsyncThunk(
  "institutions/addMember",
  async (
    { id, memberData }: { id: string; memberData: any },
    { rejectWithValue }
  ) => {
    try {
      console.log("📤 Adding member...", { id, memberData });

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await api.post(`/institutions/${id}/members`, memberData, {
        signal: controller.signal,
        // Add headers for better error handling
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      console.log("✅ Member added:", response.data);

      if (response.data.success) {
        return {
          ...response.data.data,
          institutionId: id, // Include institution ID for state update
        };
      }

      return rejectWithValue(response.data.message || "Failed to add member");

    } catch (error: any) {
      console.error("❌ Add member error:", error);

      let errorMessage = "Failed to add member";

      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        errorMessage = "Request timeout. Please try again.";
      } else if (error.response) {
        // Extract detailed error message
        errorMessage = error.response.data?.message ||
          error.response.data?.error ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection.";
      } else {
        errorMessage = error.message || "Request failed";
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// Remove member from institution
export const removeMemberFromInstitution = createAsyncThunk(
  "institutions/removeMember",
  async (
    { id, userId }: { id: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.delete(`/institutions/${id}/members/${userId}`);

      if (response.data.success) {
        return { id, userId };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to remove member");
    }
  }
);

// Update member role
export const updateMemberRole = createAsyncThunk(
  "institutions/updateMemberRole",
  async (
    { id, userId, role }: { id: string; userId: string; role: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch(`/institutions/${id}/members/${userId}/role`, { role });

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update member role");
    }
  }
);

export const reorderInstitutionCategories = createAsyncThunk(
  "institutions/reorderCategories",
  async (
    { institutionId, categoryOrders }: {
      institutionId: string;
      categoryOrders: CategoryReorderData[]
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/categories/reorder", {
        category_orders: categoryOrders
      });

      if (response.data.success) {
        // Refetch categories to get updated order
        const refreshResponse = await api.get(
          `/categories/institution/${institutionId}?hierarchical=true`
        );

        if (refreshResponse.data.success) {
          return refreshResponse.data.data.categories;
        }
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to reorder categories"
      );
    }
  }
);

// Fetch all institutions
export const fetchInstitutions = createAsyncThunk(
  "institutions/fetchAll",
  async (filters: { type?: string; is_active?: boolean; search?: string } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append("type", filters.type);
      if (filters?.is_active !== undefined) params.append("is_active", String(filters.is_active));
      if (filters?.search) params.append("search", filters.search);

      const response = await api.get(`/institutions?${params.toString()}`);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch institutions");
    }
  }
);

// Fetch institution by ID
export const fetchInstitutionById = createAsyncThunk(
  "institutions/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/institutions/${id}`);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch institution");
    }
  }
);

// Create institution
export const createInstitution = createAsyncThunk(
  "institutions/create",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await api.post("/institutions", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create institution");
    }
  }
);

// Update institution
export const updateInstitution = createAsyncThunk(
  "institutions/update",
  async ({ id, formData }: { id: string; formData: FormData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/institutions/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update institution");
    }
  }
);

// Toggle institution status
export const toggleInstitutionStatus = createAsyncThunk(
  "institutions/toggleStatus",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/institutions/${id}/toggle-status`);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update institution status");
    }
  }
);

// Delete institution
export const deleteInstitution = createAsyncThunk(
  "institutions/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/institutions/${id}`);

      if (response.data.success) {
        return id;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete institution");
    }
  }
);

// Get institution admin
export const getInstitutionAdmin = createAsyncThunk(
  "institutions/getAdmin",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/institutions/${id}/admin`);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch institution admin");
    }
  }
);

// Replace institution admin
export const replaceInstitutionAdmin = createAsyncThunk(
  "institutions/replaceAdmin",
  async (
    {
      id,
      adminData
    }: {
      id: string;
      adminData: {
        new_admin_email: string;
        new_admin_first_name: string;
        new_admin_last_name: string;
        new_admin_phone?: string;
        new_admin_username?: string;
      }
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/institutions/${id}/replace-admin`, adminData);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to replace institution admin");
    }
  }
);

// Activate institution
export const activateInstitution = createAsyncThunk(
  "institutions/activate",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/institutions/${id}/activate`);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to activate institution");
    }
  }
);

// Deactivate institution
export const deactivateInstitution = createAsyncThunk(
  "institutions/deactivate",
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/institutions/${id}/deactivate`, { reason });

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to deactivate institution");
    }
  }
);

// ==================== SLICE ====================
const institutionSlice = createSlice({
  name: "institutions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessFlags: (state) => {
      state.createSuccess = false;
      state.updateSuccess = false;
    },
    setSelectedInstitution: (state, action: PayloadAction<Institution | null>) => {
      state.selectedInstitution = action.payload;
    },
    addMemberManually: (state, action: PayloadAction<{
      member: any;
      user: any;
    }>) => {
      if (state.selectedInstitution) {
        if (!state.selectedInstitution.members) {
          state.selectedInstitution.members = [];
        }

        const { member, user } = action.payload;

        const newMemberObj = {
          member_id: member.id,
          role: member.role,
          is_active: member.is_active,
          joined_at: member.joined_at || new Date().toISOString(),
          additional_permissions: {},
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name || user.email.split('@')[0],
            last_name: user.last_name || "User",
            username: user.username,
            profile_picture_url: user.profile_picture_url,
            phone_number: user.phone_number,
            bio: user.bio,
            account_type: user.account_type || "Member",
            bwenge_role: user.bwenge_role || "MEMBER",
            institution_role: user.institution_role,
            is_verified: user.is_verified || false,
            is_active: user.is_active || true,
            date_joined: user.date_joined || new Date().toISOString(),
            last_login: user.last_login,
            country: user.country,
            city: user.city,
            enrolled_courses_count: user.enrolled_courses_count || 0,
            completed_courses_count: user.completed_courses_count || 0,
            total_learning_hours: user.total_learning_hours || 0,
            certificates_earned: user.certificates_earned || 0,
          }
        };

        state.selectedInstitution.members.push(newMemberObj);

        if (state.selectedInstitution.memberCount !== undefined) {
          state.selectedInstitution.memberCount += 1;
        }
      }
    },
    addMemberLocally: (state, action: PayloadAction<any>) => {
      if (state.selectedInstitution) {
        if (!state.selectedInstitution.members) {
          state.selectedInstitution.members = [];
        }
        // Add the new member to the members array
        state.selectedInstitution.members.push({
          member_id: action.payload.member.id,
          role: action.payload.member.role,
          is_active: action.payload.member.is_active,
          joined_at: action.payload.member.joined_at,
          user: action.payload.user
        });

        // Update member count
        if (state.selectedInstitution.memberCount !== undefined) {
          state.selectedInstitution.memberCount += 1;
        }
      }
    },

    // Category reducers
    clearCategoriesError: (state) => {
      state.categoriesError = null;
    },
    clearCategoryOperationSuccess: (state) => {
      state.categoryOperationSuccess = false;
    },
    setInstitutionCategories: (state, action: PayloadAction<CourseCategory[]>) => {
      state.institutionCategories = action.payload;
    },
    addCategoryLocally: (state, action: PayloadAction<CourseCategory>) => {
      state.institutionCategories.push(action.payload);
      state.categoryOperationSuccess = true;
    },
    removeCategoryLocally: (state, action: PayloadAction<string>) => {
      state.institutionCategories = state.institutionCategories.filter(
        category => category.id !== action.payload
      );
      state.categoryOperationSuccess = true;
    },
    updateCategoryLocally: (state, action: PayloadAction<{ id: string; updates: Partial<CourseCategory> }>) => {
      const index = state.institutionCategories.findIndex(
        category => category.id === action.payload.id
      );
      if (index !== -1) {
        state.institutionCategories[index] = {
          ...state.institutionCategories[index],
          ...action.payload.updates
        };
        state.categoryOperationSuccess = true;
      }
    },
    resetCategoryState: (state) => {
      state.institutionCategories = [];
      state.isLoadingCategories = false;
      state.categoriesError = null;
      state.categoryOperationSuccess = false;
      state.categoryPagination = null;
    },
    addMemberOptimistic: (state, action: PayloadAction<{ member: any; user: any }>) => {
      if (state.selectedInstitution) {
        if (!state.selectedInstitution.members) {
          state.selectedInstitution.members = [];
        }

        const newMember = {
          member_id: action.payload.member.id,
          role: action.payload.member.role,
          is_active: true,
          joined_at: new Date().toISOString(),
          user: action.payload.user,
          _optimistic: true, // Mark as optimistic
        };

        state.selectedInstitution.members.unshift(newMember);
        if (state.selectedInstitution.memberCount !== undefined) {
          state.selectedInstitution.memberCount += 1;
        }
      }
    },

    rollbackMemberAddition: (state, action: PayloadAction<{ memberId: string }>) => {
      if (state.selectedInstitution?.members) {
        state.selectedInstitution.members = state.selectedInstitution.members.filter(
          (member: any) => member.member_id !== action.payload.memberId || !member._optimistic
        );
        if (state.selectedInstitution.memberCount !== undefined) {
          state.selectedInstitution.memberCount = Math.max(0, state.selectedInstitution.memberCount - 1);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Institutions
      .addCase(fetchInstitutions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInstitutions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.institutions = action.payload;
      })
      .addCase(fetchInstitutions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Institution By ID
      .addCase(fetchInstitutionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInstitutionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedInstitution = action.payload;
      })
      .addCase(fetchInstitutionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Institution
      .addCase(createInstitution.pending, (state) => {
        state.isCreating = true;
        state.error = null;
        state.createSuccess = false;
      })
      .addCase(createInstitution.fulfilled, (state, action) => {
        state.isCreating = false;
        state.institutions.unshift(action.payload);
        state.createSuccess = true;
      })
      .addCase(createInstitution.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
        state.createSuccess = false;
      })

      // Update Institution
      .addCase(updateInstitution.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateInstitution.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.institutions.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.institutions[index] = action.payload;
        }
        if (state.selectedInstitution?.id === action.payload.id) {
          state.selectedInstitution = action.payload;
        }
        state.updateSuccess = true;
      })
      .addCase(updateInstitution.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
        state.updateSuccess = false;
      })

      // Toggle Status
      .addCase(toggleInstitutionStatus.fulfilled, (state, action) => {
        const index = state.institutions.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.institutions[index] = action.payload;
        }
        if (state.selectedInstitution?.id === action.payload.id) {
          state.selectedInstitution = action.payload;
        }
      })

      // Activate Institution
      .addCase(activateInstitution.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(activateInstitution.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.institutions.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.institutions[index] = action.payload;
        }
        if (state.selectedInstitution?.id === action.payload.id) {
          state.selectedInstitution = action.payload;
        }
      })
      .addCase(activateInstitution.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Deactivate Institution
      .addCase(deactivateInstitution.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(deactivateInstitution.fulfilled, (state, action) => {
        state.isUpdating = false;
        const institutionData = action.payload.institution;
        const index = state.institutions.findIndex((i) => i.id === institutionData.id);
        if (index !== -1) {
          state.institutions[index] = institutionData;
        }
        if (state.selectedInstitution?.id === institutionData.id) {
          state.selectedInstitution = institutionData;
        }
      })
      .addCase(deactivateInstitution.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Delete Institution
      .addCase(deleteInstitution.fulfilled, (state, action) => {
        state.institutions = state.institutions.filter((i) => i.id !== action.payload);
      })

      .addCase(addMemberToInstitution.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addMemberToInstitution.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;

        console.log("🔄 Processing add member fulfilled:", action.payload);

        const { member, user, institutionId } = action.payload;

        // Update the selected institution's members
        if (state.selectedInstitution && state.selectedInstitution.id === institutionId) {
          // Initialize members array if it doesn't exist
          if (!state.selectedInstitution.members) {
            state.selectedInstitution.members = [];
          }

          // Check if member already exists (prevent duplicates)
          const memberExists = state.selectedInstitution.members.some(
            (existingMember: any) => existingMember.member_id === member.id
          );

          if (!memberExists) {
            console.log("➕ Adding new member to state:", { member, user });

            // Create properly formatted member object
            const newMemberObj = {
              member_id: member.id,
              role: member.role,
              is_active: member.is_active ?? true,
              joined_at: member.joined_at || new Date().toISOString(),
              additional_permissions: member.additional_permissions || {},
              user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name || user.email.split('@')[0],
                last_name: user.last_name || "User",
                username: user.username,
                profile_picture_url: user.profile_picture_url,
                phone_number: user.phone_number,
                bio: user.bio,
                account_type: user.account_type || "Member",
                bwenge_role: user.bwenge_role || member.role,
                institution_role: user.institution_role || member.role,
                is_verified: user.is_verified ?? false,
                is_active: user.is_active ?? true,
                date_joined: user.date_joined || new Date().toISOString(),
                last_login: user.last_login,
                country: user.country,
                city: user.city,
                enrolled_courses_count: user.enrolled_courses_count || 0,
                completed_courses_count: user.completed_courses_count || 0,
                total_learning_hours: user.total_learning_hours || 0,
                certificates_earned: user.certificates_earned || 0,
              }
            };

            // Add new member to the beginning of the array (most recent first)
            state.selectedInstitution.members.unshift(newMemberObj);

            // Update member count
            if (state.selectedInstitution.memberCount !== undefined) {
              state.selectedInstitution.memberCount += 1;
            }

            // Update statistics if they exist
            if (state.selectedInstitution.statistics) {
              const currentMembers = typeof state.selectedInstitution.statistics.members === 'number'
                ? state.selectedInstitution.statistics.members
                : 0;
              state.selectedInstitution.statistics.members = currentMembers + 1;

              // Update instructor count if the new member is an instructor
              if (member.role === 'INSTRUCTOR' && state.selectedInstitution.statistics.instructors) {
                const currentInstructors = getStatValue(state.selectedInstitution.statistics.instructors);
                state.selectedInstitution.statistics.instructors = currentInstructors + 1;
              }
            }

            console.log("✅ Member added successfully. Total members:", state.selectedInstitution.members.length);
          } else {
            console.log("⚠️ Member already exists in state");
          }
        }
      })
      .addCase(addMemberToInstitution.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.error("❌ Failed to add member:", action.payload);
      })

      // Remove Member
      .addCase(removeMemberFromInstitution.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeMemberFromInstitution.fulfilled, (state, action) => {
        state.isLoading = false;

        if (state.selectedInstitution?.members) {
          const { userId } = action.payload;

          // Find the member being removed to check their role
          const removedMember = state.selectedInstitution.members.find(
            (member: any) => member.user.id === userId
          );

          // Filter out the removed member
          state.selectedInstitution.members = state.selectedInstitution.members.filter(
            (member: any) => member.user.id !== userId
          );

          // Update member count
          if (state.selectedInstitution.memberCount !== undefined) {
            state.selectedInstitution.memberCount = Math.max(0, state.selectedInstitution.memberCount - 1);
          }

          // Update statistics
          if (state.selectedInstitution.statistics) {
            const currentMembers = typeof state.selectedInstitution.statistics.members === 'number'
              ? state.selectedInstitution.statistics.members
              : 0;
            state.selectedInstitution.statistics.members = Math.max(0, currentMembers - 1);

            // Update instructor count if removed member was an instructor
            if (removedMember?.role === 'INSTRUCTOR' && state.selectedInstitution.statistics.instructors) {
              const currentInstructors = getStatValue(state.selectedInstitution.statistics.instructors);
              state.selectedInstitution.statistics.instructors = Math.max(0, currentInstructors - 1);
            }
          }
        }
      })
      .addCase(removeMemberFromInstitution.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Update Member Role
      .addCase(updateMemberRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        state.isLoading = false;

        if (state.selectedInstitution?.members) {
          const { user_id, role: newRole } = action.payload;

          const memberIndex = state.selectedInstitution.members.findIndex(
            (member: any) => member.user.id === user_id
          );

          if (memberIndex !== -1) {
            const oldRole = state.selectedInstitution.members[memberIndex].role;

            // Update member role
            state.selectedInstitution.members[memberIndex].role = newRole;
            state.selectedInstitution.members[memberIndex].user.institution_role = newRole;
            state.selectedInstitution.members[memberIndex].user.bwenge_role = newRole;

            // Update instructor count in statistics
            if (state.selectedInstitution.statistics?.instructors) {
              let instructorCount = getStatValue(state.selectedInstitution.statistics.instructors);

              // If changed from instructor to another role, decrement
              if (oldRole === 'INSTRUCTOR' && newRole !== 'INSTRUCTOR') {
                instructorCount = Math.max(0, instructorCount - 1);
              }
              // If changed to instructor from another role, increment
              else if (oldRole !== 'INSTRUCTOR' && newRole === 'INSTRUCTOR') {
                instructorCount += 1;
              }

              state.selectedInstitution.statistics.instructors = instructorCount;
            }
          }
        }
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Public Institutions for Homepage
      .addCase(fetchPublicInstitutionsForHomepage.pending, (state) => {
        state.isLoadingPublic = true;
        state.publicError = null;
      })
      .addCase(fetchPublicInstitutionsForHomepage.fulfilled, (state, action) => {
        state.isLoadingPublic = false;
        state.publicInstitutions = action.payload;
      })
      .addCase(fetchPublicInstitutionsForHomepage.rejected, (state, action) => {
        state.isLoadingPublic = false;
        state.publicError = action.payload as string;
      })

      // Fetch Institution Categories
      .addCase(fetchInstitutionCategories.pending, (state) => {
        state.isLoadingCategories = true;
        state.categoriesError = null;
      })
      .addCase(fetchInstitutionCategories.fulfilled, (state, action) => {
        state.isLoadingCategories = false;
        state.institutionCategories = action.payload.categories;
        state.categoryPagination = action.payload.pagination;
        state.categoriesError = null;
      })
      .addCase(fetchInstitutionCategories.rejected, (state, action) => {
        state.isLoadingCategories = false;
        state.categoriesError = action.payload as string;
      })

      // Create Institution Category
      .addCase(createInstitutionCategory.pending, (state) => {
        state.isLoadingCategories = true;
        state.categoriesError = null;
        state.categoryOperationSuccess = false;
      })
      .addCase(createInstitutionCategory.fulfilled, (state, action) => {
        state.isLoadingCategories = false;
        // Add new category to the list
        state.institutionCategories.push(action.payload);
        state.categoryOperationSuccess = true;
        state.categoriesError = null;
      })
      .addCase(createInstitutionCategory.rejected, (state, action) => {
        state.isLoadingCategories = false;
        state.categoriesError = action.payload as string;
        state.categoryOperationSuccess = false;
      })

      // Update Institution Category
      .addCase(updateInstitutionCategory.pending, (state) => {
        state.isLoadingCategories = true;
        state.categoriesError = null;
        state.categoryOperationSuccess = false;
      })
      .addCase(updateInstitutionCategory.fulfilled, (state, action) => {
        state.isLoadingCategories = false;

        // Update category in the list
        const index = state.institutionCategories.findIndex(
          category => category.id === action.payload.id
        );
        if (index !== -1) {
          state.institutionCategories[index] = action.payload;
        }

        // Also update in subcategories if it's a subcategory
        state.institutionCategories.forEach((category, catIndex) => {
          if (category.subcategories) {
            const subIndex = category.subcategories.findIndex(
              sub => sub.id === action.payload.id
            );
            if (subIndex !== -1) {
              state.institutionCategories[catIndex].subcategories[subIndex] = action.payload;
            }
          }
        });

        state.categoryOperationSuccess = true;
        state.categoriesError = null;
      })
      .addCase(updateInstitutionCategory.rejected, (state, action) => {
        state.isLoadingCategories = false;
        state.categoriesError = action.payload as string;
        state.categoryOperationSuccess = false;
      })

      // Delete Institution Category
      .addCase(deleteInstitutionCategory.pending, (state) => {
        state.isLoadingCategories = true;
        state.categoriesError = null;
        state.categoryOperationSuccess = false;
      })
      .addCase(deleteInstitutionCategory.fulfilled, (state, action) => {
        state.isLoadingCategories = false;

        // Remove category from the list
        state.institutionCategories = state.institutionCategories.filter(
          category => category.id !== action.payload.categoryId
        );

        // Also remove from parent's subcategories
        state.institutionCategories.forEach((category, index) => {
          if (category.subcategories) {
            state.institutionCategories[index].subcategories =
              category.subcategories.filter(
                sub => sub.id !== action.payload.categoryId
              );
          }
        });

        state.categoryOperationSuccess = true;
        state.categoriesError = null;
      })
      .addCase(deleteInstitutionCategory.rejected, (state, action) => {
        state.isLoadingCategories = false;
        state.categoriesError = action.payload as string;
        state.categoryOperationSuccess = false;
      })

      // Toggle Category Status
      .addCase(toggleCategoryStatus.pending, (state) => {
        state.isLoadingCategories = true;
        state.categoriesError = null;
      })
      .addCase(toggleCategoryStatus.fulfilled, (state, action) => {
        state.isLoadingCategories = false;

        // Update category status in the list
        const index = state.institutionCategories.findIndex(
          category => category.id === action.payload.id
        );
        if (index !== -1) {
          state.institutionCategories[index].is_active = action.payload.is_active;
        }

        // Also update in subcategories
        state.institutionCategories.forEach((category, catIndex) => {
          if (category.subcategories) {
            const subIndex = category.subcategories.findIndex(
              sub => sub.id === action.payload.id
            );
            if (subIndex !== -1) {
              state.institutionCategories[catIndex].subcategories[subIndex].is_active =
                action.payload.is_active;
            }
          }
        });

        state.categoriesError = null;
        state.categoryOperationSuccess = true;
      })
      .addCase(toggleCategoryStatus.rejected, (state, action) => {
        state.isLoadingCategories = false;
        state.categoriesError = action.payload as string;
        state.categoryOperationSuccess = false;
      })

      // Reorder Institution Categories
      .addCase(reorderInstitutionCategories.pending, (state) => {
        state.isLoadingCategories = true;
        state.categoriesError = null;
      })
      .addCase(reorderInstitutionCategories.fulfilled, (state, action) => {
        state.isLoadingCategories = false;
        state.institutionCategories = action.payload;
        state.categoriesError = null;
        state.categoryOperationSuccess = true;
      })
      .addCase(reorderInstitutionCategories.rejected, (state, action) => {
        state.isLoadingCategories = false;
        state.categoriesError = action.payload as string;
        state.categoryOperationSuccess = false;
      })
      .addCase(fetchInstitutionLimits.pending, (state) => {
        state.isLoadingLimits = true;
        state.limitsError = null;
      })
      .addCase(fetchInstitutionLimits.fulfilled, (state, action) => {
        state.isLoadingLimits = false;
        state.institutionLimits = action.payload;
      })
      .addCase(fetchInstitutionLimits.rejected, (state, action) => {
        state.isLoadingLimits = false;
        state.limitsError = action.payload as string;
      })
  },
});

// ==================== SELECTORS ====================

export const selectPublicInstitutions = (state: RootState) =>
  state.institutions.publicInstitutions;

export const selectInstitutionById = (id: string) => (state: RootState) =>
  state.institutions.publicInstitutions.find((inst) => inst.id === id);

export const selectCategoriesByInstitution = (institutionId: string) => (state: RootState) =>
  state.institutions.publicInstitutions.find((inst) => inst.id === institutionId)?.categories || [];

export const selectCoursesByCategory = (categoryId: string) => (state: RootState) => {
  for (const institution of state.institutions.publicInstitutions) {
    const category = institution.categories.find((cat) => cat.id === categoryId);
    if (category) return category.courses;
  }
  return [];
};

export const selectInstitutionMembers = (state: RootState) =>
  state.institutions.selectedInstitution?.members || [];

export const selectInstitutionMemberCount = (state: RootState) =>
  state.institutions.selectedInstitution?.memberCount || 0;

export const selectInstitutionMembersByRole = (role: InstitutionMemberRole) => (state: RootState) =>
  state.institutions.selectedInstitution?.members?.filter(
    (member: any) => member.role === role
  ) || [];

export const selectIsInstitutionMember = (userId: string) => (state: RootState) =>
  state.institutions.selectedInstitution?.members?.some(
    (member: any) => member.user.id === userId
  ) || false;

// ==================== EXPORTS ====================

export const {
  clearError,
  clearSuccessFlags,
  setSelectedInstitution,
  addMemberLocally,
  addMemberManually,
  clearCategoriesError,
  clearCategoryOperationSuccess,
  setInstitutionCategories,
  addCategoryLocally,
  removeCategoryLocally,
  updateCategoryLocally,
  resetCategoryState,
  addMemberOptimistic,
  rollbackMemberAddition
} = institutionSlice.actions;

export default institutionSlice.reducer;