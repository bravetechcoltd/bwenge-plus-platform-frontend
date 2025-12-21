import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { RootState } from "@/lib/store";

// ==================== TYPES ====================

export interface DashboardSummary {
  overview: {
    total_courses: number;
    active_courses: number;
    draft_courses: number;
    archived_courses: number;
    mooc_courses: number;
    spoc_courses: number;
    primary_instructor_count: number;
    additional_instructor_count: number;
  };
  students: {
    total_students: number;
    active_students: number;
    completed_students: number;
    average_completion_rate: number;
  };
  engagement: {
    average_course_rating: number;
    total_reviews: number;
    total_enrollments: number;
    overall_completion_rate: number;
    average_course_completion_time: number;
  };
  recent_activity: {
    new_enrollments: number;
    recent_enrollments: Array<{
      student: {
        id: string;
        name: string;
        email: string;
        profile_picture_url: string;
      };
      course: {
        id: string;
        title: string;
      };
      enrolled_at: string;
    }>;
    recent_lesson_completions: number;
    recent_assessment_submissions: number;
    latest_activities: Array<{
      type: string;
      student: {
        name: string;
        profile_picture_url: string;
      };
      course_title: string;
      lesson_title: string;
      timestamp: string;
    }>;
  };
  content: {
    total_modules: number;
    total_lessons: number;
    total_assessments: number;
    total_duration_hours: number;
  };
  attention_required: {
    pending_assignments: number;
    draft_courses: number;
    pending_approvals: number;
    low_rated_courses: number;
    inactive_courses: number;
    total_items: number;
  };
  top_courses: {
    by_enrollment: Array<{
      id: string;
      title: string;
      enrollment_count: number;
      thumbnail_url: string;
    }>;
    by_rating: Array<{
      id: string;
      title: string;
      average_rating: number;
      total_reviews: number;
      thumbnail_url: string;
    }>;
    by_completion: Array<{
      id: string;
      title: string;
      completion_rate: number;
      thumbnail_url: string;
    }>;
  };
  institutions: Array<{
    id: string;
    name: string;
    logo_url: string;
    courses_count: number;
    students_count: number;
  }>;
  quick_actions: Array<{
    type: string;
    label: string;
    count: number;
    link: string;
    priority: string;
  }>;
}

export interface InstructorCourse {
  id: string;
  title: string;
  description: string;
  short_description: string;
  thumbnail_url: string;
  status: string;
  course_type: string;
  level: string;
  language: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  institution: {
    id: string;
    name: string;
    logo_url: string;
    type: string;
  } | null;
  category: {
    id: string;
    name: string;
    description: string;
  } | null;
  primary_instructor: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url: string;
  } | null;
  instructor_role: {
    is_primary: boolean;
    permissions: {
      can_grade_assignments: boolean;
      can_manage_enrollments: boolean;
      can_edit_course_content: boolean;
    };
    assigned_at: string;
  };
  statistics: {
    enrollments: {
      total: number;
      active: number;
      completed: number;
      pending: number;
    };
    progress: {
      average_completion: number;
      completed_students: number;
      in_progress_students: number;
      not_started_students: number;
    };
    content: {
      modules_count: number;
      lessons_count: number;
      assessments_count: number;
      total_duration_minutes: number;
    };
    ratings: {
      average: number;
      total_reviews: number;
      distribution: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
      };
    };
    recent_activity: {
      latest_enrollment: string;
      latest_student_activity: string;
      recent_submissions: number;
    };
  } | null;
  available_actions: string[];
}

export interface CourseStudent {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url: string;
    country: string;
    city: string;
  };
  enrollment: {
    id: string;
    status: string;
    enrolled_at: string;
    started_at: string;
    completed_at: string;
    last_accessed_at: string;
    days_since_enrollment: number;
    days_since_last_activity: number;
  };
  progress: {
    completion_percentage: number;
    rank: number;
    lessons: {
      total: number;
      completed: number;
      in_progress: number;
      not_started: number;
      completion_rate: number;
    };
    modules: {
      total: number;
      completed: number;
      in_progress: number;
      current_module: {
        id: string;
        title: string;
        order_index: number;
      } | null;
    };
    assessments: {
      total: number;
      completed: number;
      passed: number;
      failed: number;
      pending: number;
      average_score: number;
      highest_score: number;
      lowest_score: number;
    };
  };
  details: {
    time_metrics: {
      total_time_spent_minutes: number;
      average_session_duration_minutes: number;
      total_sessions: number;
      estimated_completion_date: string;
      on_track: boolean;
    };
    recent_activity: Array<{
      type: string;
      lesson_title: string;
      timestamp: string;
    }>;
    current_position: {
      module_title: string;
      lesson_title: string;
      last_watched_video_progress: number;
    };
    performance_indicators: {
      engagement_score: number;
      completion_velocity: string;
      at_risk: boolean;
      risk_factors: string[];
    };
  } | null;
  contact: {
    last_message_sent: string;
    unread_messages: number;
  };
  available_actions: string[];
}

export interface StudentStatistics {
  total_students: number;
  by_status: {
    ACTIVE: number;
    COMPLETED: number;
    DROPPED: number;
    PENDING: number;
  };
  by_progress: {
    not_started: number;
    in_progress: number;
    completed: number;
  };
  average_completion: number;
  average_time_spent_hours: number;
  at_risk_students: number;
  top_performers: number;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface InstructorState {
  // Dashboard Summary
  dashboardSummary: DashboardSummary | null;
  isLoadingSummary: boolean;
  summaryError: string | null;
  
  // Instructor's Courses
  courses: InstructorCourse[];
  isLoadingCourses: boolean;
  coursesError: string | null;
  coursesPagination: PaginationData | null;
  
  // Students for Selected Course
  selectedCourseId: string | null;
  students: CourseStudent[];
  isLoadingStudents: boolean;
  studentsError: string | null;
  studentsPagination: PaginationData | null;
  studentsStatistics: StudentStatistics | null;
  
  // Filters
  coursesFilters: {
    status: string | null;
    course_type: string | null;
    institution_id: string | null;
    search: string;
    sort_by: string;
    sort_order: string;
  };
  
  studentsFilters: {
    status: string | null;
    search: string;
    progress_filter: string | null;
    sort_by: string;
    sort_order: string;
  };
}

const initialState: InstructorState = {
  dashboardSummary: null,
  isLoadingSummary: false,
  summaryError: null,
  
  courses: [],
  isLoadingCourses: false,
  coursesError: null,
  coursesPagination: null,
  
  selectedCourseId: null,
  students: [],
  isLoadingStudents: false,
  studentsError: null,
  studentsPagination: null,
  studentsStatistics: null,
  
  coursesFilters: {
    status: null,
    course_type: null,
    institution_id: null,
    search: "",
    sort_by: "created_at",
    sort_order: "DESC",
  },
  
  studentsFilters: {
    status: null,
    search: "",
    progress_filter: null,
    sort_by: "enrolled_at",
    sort_order: "DESC",
  },
};

// ==================== ASYNC THUNKS ====================

// Thunk 1: fetchInstructorDashboardSummary
export const fetchInstructorDashboardSummary = createAsyncThunk(
  "instructor/fetchDashboardSummary",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/instructor/dashboard/summary");
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch dashboard summary"
      );
    }
  }
);

// Thunk 2: fetchInstructorCourses
export const fetchInstructorCourses = createAsyncThunk(
  "instructor/fetchCourses",
  async (
    { 
      filters = {}, 
      page = 1, 
      limit = 10,
      include_stats = true 
    }: { 
      filters?: Partial<InstructorState["coursesFilters"]>;
      page?: number;
      limit?: number;
      include_stats?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters
      if (filters.status) params.append("status", filters.status);
      if (filters.course_type) params.append("course_type", filters.course_type);
      if (filters.institution_id) params.append("institution_id", filters.institution_id);
      if (filters.search) params.append("search", filters.search);
      if (filters.sort_by) params.append("sort_by", filters.sort_by);
      if (filters.sort_order) params.append("sort_order", filters.sort_order);
      
      // Add pagination
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      params.append("include_stats", include_stats.toString());
      
      const response = await api.get(`/instructor/courses?${params.toString()}`);
      
      if (response.data.success) {
        return {
          courses: response.data.data.courses,
          pagination: response.data.data.pagination,
          summary: response.data.data.summary,
        };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch instructor courses"
      );
    }
  }
);
export const fetchCourseStudents = createAsyncThunk(
  "instructor/fetchCourseStudents",
  async (
    { 
      courseId,
      filters = {},
      page = 1,
      limit = 20,
      include_details = true
    }: { 
      courseId: string;
      filters?: Partial<InstructorState["studentsFilters"]>;
      page?: number;
      limit?: number;
      include_details?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters
      console.log("🔄 Building query params for fetchCourseStudents");
      console.log("📌 Filters received:", filters);
      
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      if (filters.progress_filter) params.append("progress_filter", filters.progress_filter);
      if (filters.sort_by) params.append("sort_by", filters.sort_by);
      if (filters.sort_order) params.append("sort_order", filters.sort_order);
      
      // Add pagination
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      params.append("include_details", include_details.toString());
      
      const url = `/instructor/courses/${courseId}/students?${params.toString()}`;
      console.log("🌐 Making API call to:", url);
      
      const response = await api.get(url);
      
      console.log("✅ API Response:", response.data);
      
      if (response.data.success) {
        return {
          courseId,
          students: response.data.data.students,
          pagination: response.data.data.pagination,
          statistics: response.data.data.statistics,
          course: response.data.data.course,
          filters: response.data.data.filters,
        };
      }
      console.error("❌ API returned success: false", response.data.message);
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      console.error("❌ API call failed:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch course students"
      );
    }
  }
);
export const searchStudents = createAsyncThunk(
  "instructor/searchStudents",
  async (
    { courseId, searchTerm }: { courseId: string; searchTerm: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await dispatch(
        fetchCourseStudents({
          courseId,
          filters: { search: searchTerm },
          page: 1,
        })
      ).unwrap();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk 5: refreshCourseData
export const refreshCourseData = createAsyncThunk(
  "instructor/refreshCourseData",
  async (courseId: string, { dispatch, rejectWithValue }) => {
    try {
      // Re-fetch course students
      await dispatch(fetchCourseStudents({ courseId })).unwrap();
      
      // Re-fetch instructor courses to update statistics
      await dispatch(fetchInstructorCourses({})).unwrap();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ==================== SLICE ====================

const instructorSlice = createSlice({
  name: "instructor",
  initialState,
  reducers: {
    // Filter management
    setCoursesFilters: (state, action: PayloadAction<Partial<InstructorState["coursesFilters"]>>) => {
      state.coursesFilters = { ...state.coursesFilters, ...action.payload };
    },
    
    resetCoursesFilters: (state) => {
      state.coursesFilters = initialState.coursesFilters;
    },
    
    setStudentsFilters: (state, action: PayloadAction<Partial<InstructorState["studentsFilters"]>>) => {
      state.studentsFilters = { ...state.studentsFilters, ...action.payload };
    },
    
    resetStudentsFilters: (state) => {
      state.studentsFilters = initialState.studentsFilters;
    },
    
    // Selected course
    setSelectedCourseId: (state, action: PayloadAction<string | null>) => {
      state.selectedCourseId = action.payload;
    },
    
    // Clear errors
    clearCoursesError: (state) => {
      state.coursesError = null;
    },
    
    clearStudentsError: (state) => {
      state.studentsError = null;
    },
    
    clearSummaryError: (state) => {
      state.summaryError = null;
    },
    
    // Update local state
    updateCourseLocally: (state, action: PayloadAction<{ id: string; updates: Partial<InstructorCourse> }>) => {
      const index = state.courses.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.courses[index] = { ...state.courses[index], ...action.payload.updates };
      }
    },
    
    updateStudentLocally: (state, action: PayloadAction<{ studentId: string; updates: Partial<CourseStudent> }>) => {
      const index = state.students.findIndex(s => s.student.id === action.payload.studentId);
      if (index !== -1) {
        state.students[index] = { ...state.students[index], ...action.payload.updates };
      }
    },
    
    // Reset state
    resetInstructorState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // ==================== DASHBOARD SUMMARY ====================
      .addCase(fetchInstructorDashboardSummary.pending, (state) => {
        state.isLoadingSummary = true;
        state.summaryError = null;
      })
      .addCase(fetchInstructorDashboardSummary.fulfilled, (state, action) => {
        state.isLoadingSummary = false;
        state.dashboardSummary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchInstructorDashboardSummary.rejected, (state, action) => {
        state.isLoadingSummary = false;
        state.summaryError = action.payload as string;
      })
      
      // ==================== INSTRUCTOR COURSES ====================
      .addCase(fetchInstructorCourses.pending, (state) => {
        state.isLoadingCourses = true;
        state.coursesError = null;
      })
      .addCase(fetchInstructorCourses.fulfilled, (state, action) => {
        state.isLoadingCourses = false;
        state.courses = action.payload.courses;
        state.coursesPagination = action.payload.pagination;
        state.coursesError = null;
      })
      .addCase(fetchInstructorCourses.rejected, (state, action) => {
        state.isLoadingCourses = false;
        state.coursesError = action.payload as string;
      })
      
      // ==================== COURSE STUDENTS ====================
      .addCase(fetchCourseStudents.pending, (state) => {
        state.isLoadingStudents = true;
        state.studentsError = null;
      })
      .addCase(fetchCourseStudents.fulfilled, (state, action) => {
        state.isLoadingStudents = false;
        state.selectedCourseId = action.payload.courseId;
        state.students = action.payload.students;
        state.studentsPagination = action.payload.pagination;
        state.studentsStatistics = action.payload.statistics;
        state.studentsError = null;
      })
      .addCase(fetchCourseStudents.rejected, (state, action) => {
        state.isLoadingStudents = false;
        state.studentsError = action.payload as string;
      })
      
      // ==================== SEARCH STUDENTS ====================
      .addCase(searchStudents.pending, (state) => {
        state.isLoadingStudents = true;
        state.studentsError = null;
      })
      .addCase(searchStudents.rejected, (state, action) => {
        state.isLoadingStudents = false;
        state.studentsError = action.payload as string;
      });
  },
});

// ==================== SELECTORS ====================

// Basic selectors
export const selectDashboardSummary = (state: RootState) => state.instructor.dashboardSummary;
export const selectIsLoadingSummary = (state: RootState) => state.instructor.isLoadingSummary;
export const selectSummaryError = (state: RootState) => state.instructor.summaryError;

export const selectInstructorCourses = (state: RootState) => state.instructor.courses;
export const selectIsLoadingCourses = (state: RootState) => state.instructor.isLoadingCourses;
export const selectCoursesError = (state: RootState) => state.instructor.coursesError;
export const selectCoursesPagination = (state: RootState) => state.instructor.coursesPagination;
export const selectCoursesFilters = (state: RootState) => state.instructor.coursesFilters;

export const selectCourseStudents = (state: RootState) => state.instructor.students;
export const selectIsLoadingStudents = (state: RootState) => state.instructor.isLoadingStudents;
export const selectStudentsError = (state: RootState) => state.instructor.studentsError;
export const selectStudentsPagination = (state: RootState) => state.instructor.studentsPagination;
export const selectStudentsStatistics = (state: RootState) => state.instructor.studentsStatistics;
export const selectStudentsFilters = (state: RootState) => state.instructor.studentsFilters;
export const selectSelectedCourseId = (state: RootState) => state.instructor.selectedCourseId;

// Computed selectors
export const selectActiveCourses = (state: RootState) => 
  state.instructor.courses.filter(c => c.status === 'PUBLISHED');

export const selectDraftCourses = (state: RootState) => 
  state.instructor.courses.filter(c => c.status === 'DRAFT');

export const selectArchivedCourses = (state: RootState) => 
  state.instructor.courses.filter(c => c.status === 'ARCHIVED');

export const selectPrimaryInstructorCourses = (state: RootState) => 
  state.instructor.courses.filter(c => c.instructor_role.is_primary);

export const selectAdditionalInstructorCourses = (state: RootState) => 
  state.instructor.courses.filter(c => !c.instructor_role.is_primary);

export const selectAtRiskStudents = (state: RootState) => 
  state.instructor.students.filter(s => s.details?.performance_indicators?.at_risk);

export const selectTopStudents = (state: RootState) => 
  state.instructor.students
    .filter(s => s.progress.completion_percentage >= 80)
    .sort((a, b) => b.progress.completion_percentage - a.progress.completion_percentage);

export const selectInProgressStudents = (state: RootState) => 
  state.instructor.students.filter(s => 
    s.progress.completion_percentage > 0 && 
    s.progress.completion_percentage < 100
  );

export const selectNotStartedStudents = (state: RootState) => 
  state.instructor.students.filter(s => s.progress.completion_percentage === 0);

// Export actions and reducer
export const {
  setCoursesFilters,
  resetCoursesFilters,
  setStudentsFilters,
  resetStudentsFilters,
  setSelectedCourseId,
  clearCoursesError,
  clearStudentsError,
  clearSummaryError,
  updateCourseLocally,
  updateStudentLocally,
  resetInstructorState,
} = instructorSlice.actions;

export default instructorSlice.reducer;