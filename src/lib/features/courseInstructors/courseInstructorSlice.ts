import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { RootState } from "@/lib/store";

// ==================== TYPES ====================

export interface InstructorUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  institution_role: string;
  member_since: string;
  courses_taught: number;
}

export interface InstructorDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  is_primary?: boolean;
  is_primary_instructor?: boolean;
  permissions?: {
    can_grade_assignments: boolean;
    can_manage_enrollments: boolean;
    can_edit_course_content: boolean;
  };
  assigned_at: string;
}

export interface CourseInstructorState {
  // Available instructors for assignment
  availableInstructors: InstructorUser[];
  isLoadingAvailable: boolean;
  availableError: string | null;
  
  // Current course instructors
  courseInstructors: {
    primary: InstructorDetail | null;
    additional: InstructorDetail[];
  };
  isLoadingInstructors: boolean;
  instructorsError: string | null;
  
  // Operation states
  isAssigning: boolean;
  isRemoving: boolean;
  isUpdating: boolean;
  isReplacing: boolean;
  isBulkAssigning: boolean;
  operationSuccess: boolean;
  operationError: string | null;
}

const initialState: CourseInstructorState = {
  availableInstructors: [],
  isLoadingAvailable: false,
  availableError: null,
  
  courseInstructors: {
    primary: null,
    additional: [],
  },
  isLoadingInstructors: false,
  instructorsError: null,
  
  isAssigning: false,
  isRemoving: false,
  isUpdating: false,
  isReplacing: false,
  isBulkAssigning: false,
  operationSuccess: false,
  operationError: null,
};

// ==================== ASYNC THUNKS ====================

// Thunk 1: Fetch Available Instructors
export const fetchAvailableInstructors = createAsyncThunk(
  "courseInstructors/fetchAvailable",
  async (
    { institutionId, courseId, search }: { 
      institutionId: string; 
      courseId?: string; 
      search?: string 
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (courseId) params.append("course_id", courseId);
      if (search) params.append("search", search);
      params.append("page", "1");
      params.append("limit", "100");

      const response = await api.get(
        `/course-instructors/institutions/${institutionId}/available-instructors?${params.toString()}`
      );

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch available instructors"
      );
    }
  }
);

// Thunk 2: Fetch Course Instructors
export const fetchCourseInstructors = createAsyncThunk(
  "courseInstructors/fetchCourseInstructors",
  async (courseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/course-instructors/courses/${courseId}/instructors`
      );

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch course instructors"
      );
    }
  }
);

// Thunk 3: Assign Instructor
export const assignInstructor = createAsyncThunk(
  "courseInstructors/assignInstructor",
  async (
    { 
      courseId, 
      instructorId, 
      permissions 
    }: { 
      courseId: string; 
      instructorId: string; 
      permissions: {
        can_grade_assignments: boolean;
        can_manage_enrollments: boolean;
        can_edit_course_content: boolean;
      }
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(
        `/course-instructors/courses/${courseId}/instructors`,
        {
          instructor_id: instructorId,
          is_primary_instructor: false,
          permissions,
        }
      );

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to assign instructor"
      );
    }
  }
);

// Thunk 4: Replace Primary Instructor
export const replacePrimaryInstructor = createAsyncThunk(
  "courseInstructors/replacePrimary",
  async (
    { 
      courseId, 
      newInstructorId, 
      keepAsAdditional,
      transferPermissions 
    }: { 
      courseId: string; 
      newInstructorId: string; 
      keepAsAdditional: boolean;
      transferPermissions?: {
        can_grade_assignments: boolean;
        can_manage_enrollments: boolean;
        can_edit_course_content: boolean;
      }
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(
        `/course-instructors/courses/${courseId}/instructors/primary`,
        {
          new_instructor_id: newInstructorId,
          keep_as_additional: keepAsAdditional,
          transfer_permissions: transferPermissions,
        }
      );

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to replace primary instructor"
      );
    }
  }
);

// Thunk 5: Update Instructor Permissions
export const updateInstructorPermissions = createAsyncThunk(
  "courseInstructors/updatePermissions",
  async (
    { 
      courseId, 
      instructorId, 
      permissions 
    }: { 
      courseId: string; 
      instructorId: string; 
      permissions: {
        can_grade_assignments: boolean;
        can_manage_enrollments: boolean;
        can_edit_course_content: boolean;
      }
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch(
        `/course-instructors/courses/${courseId}/instructors/${instructorId}/permissions`,
        permissions
      );

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update instructor permissions"
      );
    }
  }
);

// Thunk 6: Remove Instructor
export const removeInstructor = createAsyncThunk(
  "courseInstructors/removeInstructor",
  async (
    { courseId, instructorId }: { courseId: string; instructorId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.delete(
        `/course-instructors/courses/${courseId}/instructors/${instructorId}`
      );

      if (response.data.success) {
        return { courseId, instructorId, data: response.data.data };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove instructor"
      );
    }
  }
);

// Thunk 7: Bulk Assign Instructors
export const bulkAssignInstructors = createAsyncThunk(
  "courseInstructors/bulkAssign",
  async (
    { 
      courseId, 
      instructors 
    }: { 
      courseId: string; 
      instructors: Array<{
        instructorId: string;
        permissions: {
          can_grade_assignments: boolean;
          can_manage_enrollments: boolean;
          can_edit_course_content: boolean;
        }
      }>
    },
    { rejectWithValue }
  ) => {
    try {
      const formattedInstructors = instructors.map(instructor => ({
        instructor_id: instructor.instructorId,
        permissions: instructor.permissions,
      }));

      const response = await api.post(
        `/course-instructors/courses/${courseId}/instructors/bulk`,
        { instructors: formattedInstructors }
      );

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to bulk assign instructors"
      );
    }
  }
);

// ==================== SLICE ====================

const courseInstructorSlice = createSlice({
  name: "courseInstructors",
  initialState,
  reducers: {
    clearOperationSuccess: (state) => {
      state.operationSuccess = false;
    },
    clearOperationError: (state) => {
      state.operationError = null;
    },
    setAvailableInstructors: (state, action: PayloadAction<InstructorUser[]>) => {
      state.availableInstructors = action.payload;
    },
    resetInstructorState: (state) => {
      state.availableInstructors = [];
      state.courseInstructors = { primary: null, additional: [] };
      state.isLoadingAvailable = false;
      state.isLoadingInstructors = false;
      state.availableError = null;
      state.instructorsError = null;
      state.operationSuccess = false;
      state.operationError = null;
    },
    updateInstructorLocal: (
      state,
      action: PayloadAction<{ instructorId: string; updates: Partial<InstructorDetail> }>
    ) => {
      const { instructorId, updates } = action.payload;
      
      // Update in additional instructors
      const index = state.courseInstructors.additional.findIndex(
        instructor => instructor.id === instructorId
      );
      
      if (index !== -1) {
        state.courseInstructors.additional[index] = {
          ...state.courseInstructors.additional[index],
          ...updates,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ==================== FETCH AVAILABLE INSTRUCTORS ====================
      .addCase(fetchAvailableInstructors.pending, (state) => {
        state.isLoadingAvailable = true;
        state.availableError = null;
      })
      .addCase(fetchAvailableInstructors.fulfilled, (state, action) => {
        state.isLoadingAvailable = false;
        state.availableInstructors = action.payload;
        state.availableError = null;
      })
      .addCase(fetchAvailableInstructors.rejected, (state, action) => {
        state.isLoadingAvailable = false;
        state.availableError = action.payload as string;
      })

      // ==================== FETCH COURSE INSTRUCTORS ====================
      .addCase(fetchCourseInstructors.pending, (state) => {
        state.isLoadingInstructors = true;
        state.instructorsError = null;
      })
      .addCase(fetchCourseInstructors.fulfilled, (state, action) => {
        state.isLoadingInstructors = false;
        state.courseInstructors = {
          primary: action.payload.primary_instructor,
          additional: action.payload.additional_instructors || [],
        };
        state.instructorsError = null;
      })
      .addCase(fetchCourseInstructors.rejected, (state, action) => {
        state.isLoadingInstructors = false;
        state.instructorsError = action.payload as string;
      })

      // ==================== ASSIGN INSTRUCTOR ====================
      .addCase(assignInstructor.pending, (state) => {
        state.isAssigning = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(assignInstructor.fulfilled, (state, action) => {
        state.isAssigning = false;
        // Add the new instructor to additional instructors list
        if (action.payload.course_instructor) {
          const newInstructor: InstructorDetail = {
            id: action.payload.course_instructor.instructor_id,
            email: action.payload.course_instructor.instructor?.email || '',
            first_name: action.payload.course_instructor.instructor?.first_name || '',
            last_name: action.payload.course_instructor.instructor?.last_name || '',
            is_primary_instructor: action.payload.course_instructor.is_primary_instructor,
            permissions: {
              can_grade_assignments: action.payload.course_instructor.can_grade_assignments,
              can_manage_enrollments: action.payload.course_instructor.can_manage_enrollments,
              can_edit_course_content: action.payload.course_instructor.can_edit_course_content,
            },
            assigned_at: action.payload.course_instructor.assigned_at,
          };
          state.courseInstructors.additional.push(newInstructor);
        }
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(assignInstructor.rejected, (state, action) => {
        state.isAssigning = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      })

      // ==================== REPLACE PRIMARY INSTRUCTOR ====================
      .addCase(replacePrimaryInstructor.pending, (state) => {
        state.isReplacing = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(replacePrimaryInstructor.fulfilled, (state, action) => {
        state.isReplacing = false;
        
        // Update primary instructor
        if (action.payload.new_primary_instructor) {
          state.courseInstructors.primary = {
            id: action.payload.new_primary_instructor.id,
            email: action.payload.new_primary_instructor.email,
            first_name: action.payload.new_primary_instructor.first_name,
            last_name: action.payload.new_primary_instructor.last_name,
            is_primary: true,
            assigned_at: new Date().toISOString(),
          };
        }
        
        // Handle previous instructor
        if (action.payload.previous_instructor) {
          if (action.payload.previous_instructor.status === "additional") {
            // Add previous instructor to additional list
            const previousInstructor: InstructorDetail = {
              id: action.payload.previous_instructor.id,
              email: action.payload.previous_instructor.email,
              first_name: action.payload.previous_instructor.first_name || '',
              last_name: action.payload.previous_instructor.last_name || '',
              permissions: action.payload.previous_instructor.permissions,
              assigned_at: new Date().toISOString(),
            };
            state.courseInstructors.additional.push(previousInstructor);
          } else {
            // Remove previous instructor from additional list if they were there
            state.courseInstructors.additional = state.courseInstructors.additional.filter(
              instructor => instructor.id !== action.payload.previous_instructor.id
            );
          }
        }
        
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(replacePrimaryInstructor.rejected, (state, action) => {
        state.isReplacing = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      })

      // ==================== UPDATE INSTRUCTOR PERMISSIONS ====================
      .addCase(updateInstructorPermissions.pending, (state) => {
        state.isUpdating = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(updateInstructorPermissions.fulfilled, (state, action) => {
        state.isUpdating = false;
        
        // Update instructor in additional list
        const index = state.courseInstructors.additional.findIndex(
          instructor => instructor.id === action.payload.instructor_id
        );
        
        if (index !== -1) {
          state.courseInstructors.additional[index] = {
            ...state.courseInstructors.additional[index],
            permissions: {
              can_grade_assignments: action.payload.can_grade_assignments,
              can_manage_enrollments: action.payload.can_manage_enrollments,
              can_edit_course_content: action.payload.can_edit_course_content,
            },
          };
        }
        
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(updateInstructorPermissions.rejected, (state, action) => {
        state.isUpdating = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      })

      // ==================== REMOVE INSTRUCTOR ====================
      .addCase(removeInstructor.pending, (state) => {
        state.isRemoving = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(removeInstructor.fulfilled, (state, action) => {
        state.isRemoving = false;
        
        // Remove instructor from additional list
        state.courseInstructors.additional = state.courseInstructors.additional.filter(
          instructor => instructor.id !== action.payload.instructorId
        );
        
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(removeInstructor.rejected, (state, action) => {
        state.isRemoving = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      })

      // ==================== BULK ASSIGN INSTRUCTORS ====================
      .addCase(bulkAssignInstructors.pending, (state) => {
        state.isBulkAssigning = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(bulkAssignInstructors.fulfilled, (state, action) => {
        state.isBulkAssigning = false;
        
        // Add new instructors to additional list
        if (action.payload.created_assignments) {
          action.payload.created_assignments.forEach((assignment: any) => {
            const newInstructor: InstructorDetail = {
              id: assignment.instructor.id,
              email: assignment.instructor.email,
              first_name: assignment.instructor.first_name || '',
              last_name: assignment.instructor.last_name || '',
              is_primary_instructor: assignment.course_instructor.is_primary_instructor,
              permissions: {
                can_grade_assignments: assignment.course_instructor.can_grade_assignments,
                can_manage_enrollments: assignment.course_instructor.can_manage_enrollments,
                can_edit_course_content: assignment.course_instructor.can_edit_course_content,
              },
              assigned_at: assignment.course_instructor.assigned_at,
            };
            state.courseInstructors.additional.push(newInstructor);
          });
        }
        
        state.operationSuccess = true;
        state.operationError = null;
      })
      .addCase(bulkAssignInstructors.rejected, (state, action) => {
        state.isBulkAssigning = false;
        state.operationError = action.payload as string;
        state.operationSuccess = false;
      });
  },
});

export const {
  clearOperationSuccess,
  clearOperationError,
  setAvailableInstructors,
  resetInstructorState,
  updateInstructorLocal,
} = courseInstructorSlice.actions;

// Selectors
export const selectAvailableInstructors = (state: RootState) =>
  state.courseInstructors.availableInstructors;

export const selectCourseInstructors = (state: RootState) =>
  state.courseInstructors.courseInstructors;

export const selectIsLoadingInstructors = (state: RootState) =>
  state.courseInstructors.isLoadingInstructors;

export const selectIsLoadingAvailable = (state: RootState) =>
  state.courseInstructors.isLoadingAvailable;

export const selectOperationSuccess = (state: RootState) =>
  state.courseInstructors.operationSuccess;

export const selectOperationError = (state: RootState) =>
  state.courseInstructors.operationError;

export default courseInstructorSlice.reducer;