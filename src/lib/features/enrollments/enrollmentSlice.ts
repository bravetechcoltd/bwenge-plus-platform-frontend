"use client"

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { RootState } from "@/lib/store";

// ==================== INTERFACES ====================

export interface EnrollmentRequest {
  course_id: string;
  user_id?: string;
  access_code?: string;
  message?: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    level: string;
    price: number;
    status: string;
    is_certificate_available: boolean;
    course_type: "MOOC" | "SPOC";
    institution_id?: string;
    duration_minutes: number;
    language: string;
    average_rating: number;
    total_reviews: number;
    enrollment_count: number;
    instructor?: {
      id: string;
      first_name: string;
      last_name: string;
      profile_picture_url?: string;
    };
  };
  progress_percentage: number;
  status: "ACTIVE" | "COMPLETED" | "DROPPED" | "EXPIRED" | "PENDING";
  total_time_spent_minutes: number;
  completed_lessons: number;
  enrolled_at: string;
  last_accessed?: string;
  certificate_issued: boolean;
  final_score?: number;
}

export interface EnrollmentEligibility {
  eligible: boolean;
  reason: string;
  requires_access_code: boolean;
  requires_approval?: boolean;
}

// ==================== STATE ====================

interface EnrollmentState {
  enrollments: Enrollment[];
  enrollmentEligibility: Record<string, EnrollmentEligibility>;
  isLoading: boolean;
  isEnrolling: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: EnrollmentState = {
  enrollments: [],
  enrollmentEligibility: {},
  isLoading: false,
  isEnrolling: false,
  error: null,
  successMessage: null,
};

// ==================== ASYNC THUNKS ====================

// Check enrollment eligibility
export const checkEnrollmentEligibility = createAsyncThunk(
  "enrollments/checkEligibility",
  async ({ course_id }: { course_id: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/enrollments/check-eligibility", { course_id });
      return response.data.success 
        ? { course_id, eligibility: response.data.data } 
        : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to check eligibility");
    }
  }
);

// Request enrollment approval
export const requestEnrollmentApproval = createAsyncThunk(
  "enrollments/requestApproval",
  async (enrollmentData: EnrollmentRequest, { rejectWithValue }) => {
    try {
      const response = await api.post("/enrollments/request-approval", enrollmentData);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to request enrollment");
    }
  }
);

// Get user enrollments
export const getUserEnrollments = createAsyncThunk(
  "enrollments/getUserEnrollments",
  async (user_id: string, { rejectWithValue }) => {
    try {
      const response = await api.post("/enrollments/user-enrollments", { user_id });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch enrollments");
    }
  }
);

// Bulk enroll students (for institution admins)
export const bulkEnrollStudents = createAsyncThunk(
  "enrollments/bulkEnroll",
  async ({ 
    course_id, 
    student_emails 
  }: { 
    course_id: string; 
    student_emails: string[] 
  }, { rejectWithValue }) => {
    try {
      const response = await api.post("/enrollments/bulk", { course_id, student_emails });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to bulk enroll students");
    }
  }
);

// ==================== SLICE ====================

const enrollmentSlice = createSlice({
  name: "enrollments",
  initialState,
  reducers: {
    clearEnrollmentError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    setEnrollmentEligibility: (state, action: PayloadAction<{ course_id: string; eligibility: EnrollmentEligibility }>) => {
      state.enrollmentEligibility[action.payload.course_id] = action.payload.eligibility;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check enrollment eligibility
      .addCase(checkEnrollmentEligibility.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkEnrollmentEligibility.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollmentEligibility[action.payload.course_id] = action.payload.eligibility;
      })
      .addCase(checkEnrollmentEligibility.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Request enrollment approval
      .addCase(requestEnrollmentApproval.pending, (state) => {
        state.isEnrolling = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(requestEnrollmentApproval.fulfilled, (state, action) => {
        state.isEnrolling = false;
        state.successMessage = "Enrollment request submitted successfully";
        // Add to enrollments if this is for current user
        state.enrollments.unshift(action.payload);
      })
      .addCase(requestEnrollmentApproval.rejected, (state, action) => {
        state.isEnrolling = false;
        state.error = action.payload as string;
      })

      // Get user enrollments
      .addCase(getUserEnrollments.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUserEnrollments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollments = action.payload;
      })
      .addCase(getUserEnrollments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEnrollmentError, clearSuccessMessage, setEnrollmentEligibility } = enrollmentSlice.actions;

// Selectors
export const selectEnrollmentEligibility = (courseId: string) => (state: RootState) => 
  state.enrollments.enrollmentEligibility[courseId];

export const selectIsUserEnrolled = (courseId: string) => (state: RootState) => 
  state.enrollments.enrollments.some(enrollment => enrollment.course_id === courseId);

export const selectUserEnrollment = (courseId: string) => (state: RootState) =>
  state.enrollments.enrollments.find(enrollment => enrollment.course_id === courseId);

export default enrollmentSlice.reducer;