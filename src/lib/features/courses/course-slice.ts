import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
export interface PublicCourseForAssignment {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  course_type: "MOOC" | "SPOC";
  status: string;
  level: string;
  enrollment_count: number;
  average_rating: number;
  total_reviews: number;
  duration_minutes: number;
  total_lessons: number;
  instructor?: any;
  course_category?: CourseCategory;
  statistics?: any;
  is_public_course: boolean;
  can_be_assigned: boolean;
}

export interface MOOCOverviewData {
  overview: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    total_enrollments: number;
    avg_rating: string;
    total_lessons: number;
    avg_duration_minutes: number;
  };
  level_distribution: Array<{ level: string; count: number }>;
  enrollment_trend: Array<{ month: string; count: number }>;
  top_courses: Array<{
    id: string;
    title: string;
    thumbnail_url?: string;
    enrollment_count: number;
    average_rating: number;
    status: string;
    instructor: any;
  }>;
  courses: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SPOCOverviewData {
  overview: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    total_enrollments: number;
    institution_count: number;
    avg_rating: string;
  };
  institution_breakdown: Array<{
    institution_id: string;
    institution_name: string;
    institution_logo?: string;
    course_count: number;
    published_count: number;
    total_enrollments: number;
    avg_rating: string;
  }>;
  enrollment_trend: Array<{ month: string; count: number }>;
  courses: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CourseReportsData {
  period: { start: Date; end: Date };
  platform_stats: {
    total_courses: number;
    total_mooc: number;
    total_spoc: number;
    published: number;
    draft: number;
    archived: number;
    total_enrollments: number;
    avg_rating: string;
    total_lessons: number;
    total_duration_hours: number;
    institutions_with_courses: number;
  };
  enrollment_stats: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
    avg_progress: string;
    avg_time_spent_minutes: number;
  };
  courses_over_time: Array<{ period: string; count: number; mooc_count: number; spoc_count: number }>;
  enrollments_over_time: Array<{ period: string; count: number }>;
  top_courses: Array<{
    id: string;
    title: string;
    course_type: string;
    status: string;
    level: string;
    enrollment_count: number;
    average_rating: number;
    total_lessons: number;
    duration_minutes: number;
    institution_name?: string;
    instructor_name?: string;
  }>;
  level_breakdown: Array<{ level: string; count: number; enrollments: number }>;
  category_breakdown: Array<{ category_name: string; course_count: number; total_enrollments: number }>;
}

export interface ModerationCourse {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  course_type: string;
  status: string;
  level: string;
  language?: string;
  tags?: string[];
  requirements?: string;
  what_you_will_learn?: string;
  total_lessons: number;
  total_modules: number;
  duration_minutes: number;
  is_certificate_available: boolean;
  price: number;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  moderation_flag: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  instructor?: any;
  institution?: any;
  course_category?: any;
}

export interface ContentModerationData {
  queue_stats: {
    pending_review: number;
    approved: number;
    rejected: number;
    total: number;
  };
  courses: ModerationCourse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const parseNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Safely parse integer values
 */
export const parseInt = (value: any): number => {
  if (typeof value === "number") return Math.floor(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// ==================== INTERFACES ====================

export interface CourseCategory {
  id: string;
  name: string;
  description?: string;
  institution_id?: string;
  parent_category_id?: string;
  order_index: number;
  is_active: boolean;
  course_count?: number;
  subcategories?: CourseCategory[];
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
  options?: string[];
  correct_answer: string;
  explanation?: string;
  points: number;
  order_index: number;
  image_url?: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  lesson_id: string;
  title: string;
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  is_published: boolean;
  questions?: Question[];
}

export interface Assessment {
  id: string;
  course_id: string;
  lesson_id?: string;
  module_id?: string;
  title: string;
  description?: string;
  type: string;
  questions: any[];
  passing_score: number;
  max_attempts: number;
  time_limit_minutes?: number;
  is_published: boolean;
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id?: string;
  title: string;
  content?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_minutes: number;
  order_index: number;
  type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "LIVE_SESSION" | "RESOURCE";
  is_published: boolean;
  is_preview: boolean;
  resources?: any[];
  assessments?: Assessment[];
  quizzes?: Quiz[];
}

export interface ModuleFinalAssessment {
  id: string;
  module_id: string;
  title: string;
  type: "ASSESSMENT" | "PROJECT";
  project_instructions?: string;
  passing_score_percentage: number;
  time_limit_minutes?: number;
  requires_file_submission: boolean;
  assessment?: Assessment;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  estimated_duration_hours?: number;
  lessons?: Lesson[];
  final_assessment?: ModuleFinalAssessment;
}

export interface CourseInstructor {
  id: string;
  course_id: string;
  instructor_id: string;
  is_primary_instructor: boolean;
  can_grade_assignments: boolean;
  can_manage_enrollments: boolean;
  can_edit_course_content: boolean;
  instructor?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  category?: string;
  category_id?: string;
  tags?: string[];
  instructor_id?: string | null;
  institution_id?: string | null;
  course_type: "MOOC" | "SPOC";
  is_public: boolean;
  access_codes?: string[];
  requires_approval: boolean;
  max_enrollments?: number | null;
  enrollment_start_date?: Date;
  enrollment_end_date?: Date;
  is_institution_wide: boolean;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  enrollment_count: number | string; // Can be string from API
  completion_rate: number | string; // Can be string from API
  average_rating: number | string; // Can be string from API
  total_reviews: number | string; // Can be string from API
  duration_minutes: number | string; // Can be string from API
  total_lessons: number | string; // Can be string from API
  price: number | string; // Can be string from API
  is_certificate_available: boolean;
  requirements?: string;
  what_you_will_learn?: string;
  language?: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;

  // Relations
  instructor?: any | null;
  institution?: any | null;
  course_category?: CourseCategory;
  modules?: Module[];
  course_instructors?: CourseInstructor[];
  reviews?: any[];
  enrollments?: any[];

  // Computed
  statistics?: {
    total_modules: number;
    total_lessons: number;
    total_video_lessons: number;
    total_duration_minutes: number;
    estimated_total_hours: number;
    total_assessments: number;
    total_quizzes: number;
    total_questions: number;
    total_module_finals: number;
    total_resources: number;
    has_certificate: boolean;
    all_instructors: any[];
    instructor_count: number;
    enrollment_count: number;
    average_rating: number;
    total_reviews: number;
    active_enrollments: number;
  };
}

export interface CoursesState {
  courses: Course[];
  selectedCourse: Course | null;
  categories: CourseCategory[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    course_type?: string;
    status?: string;
    institution_id?: string;
    category_id?: string;
    level?: string;
    search?: string;
  };
  moocOverview: MOOCOverviewData | null;
  spocOverview: SPOCOverviewData | null;
  courseReports: CourseReportsData | null;
  contentModeration: ContentModerationData | null;
  publicCoursesForAssignment: PublicCourseForAssignment[];
publicCoursesPagination: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
isLoadingPublicCourses: boolean;
}

const initialState: CoursesState = {
  courses: [],
  selectedCourse: null,
  categories: [],
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
  filters: {},
  moocOverview: null,
  spocOverview: null,
  courseReports: null,
  contentModeration: null,
  publicCoursesForAssignment: [],
  publicCoursesPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoadingPublicCourses: false,
};

export const getPublicCoursesForAssignment = createAsyncThunk(
  "courses/getPublicCoursesForAssignment",
  async (params: {
    page?: number;
    limit?: number;
    course_type?: string;
    status?: string;
    search?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });

      const response = await api.get(`/courses/public/available?${queryParams.toString()}`);
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch public courses");
    }
  }
);

// Assign course to institution
export const assignCourseToInstitution = createAsyncThunk(
  "courses/assignToInstitution",
  async ({ courseId, institutionId }: { courseId: string; institutionId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/courses/${courseId}/assign-to-institution/${institutionId}`);
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to assign course to institution");
    }
  }
);

// Get MOOC Overview
export const getMOOCOverview = createAsyncThunk(
  "courses/getMOOCOverview",
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    level?: string;
    category_id?: string;
    search?: string;
    sort_by?: string;
    sort_dir?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") queryParams.append(key, String(value));
      });
      const response = await api.get(`/courses/admin/mooc-overview?${queryParams.toString()}`);
      if (response.data.success) return response.data.data as MOOCOverviewData;
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch MOOC overview");
    }
  }
);

// Get SPOC Overview
export const getSPOCOverview = createAsyncThunk(
  "courses/getSPOCOverview",
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    institution_id?: string;
    search?: string;
    sort_by?: string;
    sort_dir?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") queryParams.append(key, String(value));
      });
      const response = await api.get(`/courses/admin/spoc-overview?${queryParams.toString()}`);
      if (response.data.success) return response.data.data as SPOCOverviewData;
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch SPOC overview");
    }
  }
);

// Get Course Reports
export const getCourseReports = createAsyncThunk(
  "courses/getCourseReports",
  async (params: {
    start_date?: string;
    end_date?: string;
    group_by?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") queryParams.append(key, String(value));
      });
      const response = await api.get(`/courses/admin/reports?${queryParams.toString()}`);
      if (response.data.success) return response.data.data as CourseReportsData;
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch course reports");
    }
  }
);

// Export Course Reports CSV
export const exportCourseReports = createAsyncThunk(
  "courses/exportCourseReports",
  async (params: { start_date?: string; end_date?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({ export: "true" });
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
      const response = await api.get(`/courses/admin/reports?${queryParams.toString()}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `course_reports_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to export reports");
    }
  }
);

// Get Content Moderation Queue
export const getContentModeration = createAsyncThunk(
  "courses/getContentModeration",
  async (params: {
    page?: number;
    limit?: number;
    moderation_status?: string;
    course_type?: string;
    search?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") queryParams.append(key, String(value));
      });
      const response = await api.get(`/courses/admin/moderation?${queryParams.toString()}`);
      if (response.data.success) return response.data.data as ContentModerationData;
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch moderation queue");
    }
  }
);

// Approve Course
export const approveModerationCourse = createAsyncThunk(
  "courses/approveModerationCourse",
  async ({ id, note }: { id: string; note?: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/courses/admin/moderation/${id}/approve`, { note });
      if (response.data.success) return response.data.data;
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to approve course");
    }
  }
);

// Reject Course
export const rejectModerationCourse = createAsyncThunk(
  "courses/rejectModerationCourse",
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/courses/admin/moderation/${id}/reject`, { reason });
      if (response.data.success) return response.data.data;
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to reject course");
    }
  }
);

// Flag Published Course
export const flagModerationCourse = createAsyncThunk(
  "courses/flagModerationCourse",
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/courses/admin/moderation/${id}/flag`, { reason });
      if (response.data.success) return response.data.data;
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to flag course");
    }
  }
);


// ==================== ASYNC THUNKS ====================

// Get all courses with full info
export const getAllCoursesWithFullInfo = createAsyncThunk(
  "courses/getAllWithFullInfo",
  async (params: {
    page?: number;
    limit?: number;
    course_type?: string;
    status?: string;
    institution_id?: string;
    category_id?: string;
    level?: string;
    search?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });

      const response = await api.get(`/courses/all?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch courses");
    }
  }
);

// Get course categories
export const getCourseCategories = createAsyncThunk(
  "courses/getCategories",
  async (params: {
    institution_id?: string;
    include_subcategories?: boolean;
    active_only?: boolean;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });

      const response = await api.get(`/courses/categories?${queryParams.toString()}`);
      return response.data.success ? response.data.data.categories : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch categories");
    }
  }
);

// Get public MOOCs
export const getPublicMOOCs = createAsyncThunk(
  "courses/getPublicMOOCs",
  async (params: {
    page?: number;
    limit?: number;
    category?: string;
    level?: string;
    search?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });

      const response = await api.get(`/courses/mooc?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch MOOCs");
    }
  }
);

// Get institution SPOCs
export const getInstitutionSPOCs = createAsyncThunk(
  "courses/getInstitutionSPOCs",
  async (institutionId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/courses/spoc/${institutionId}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch SPOC courses");
    }
  }
);

// Get course by ID
export const getCourseById = createAsyncThunk(
  "courses/getById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/courses/${id}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch course");
    }
  }
);

// Get course curriculum
export const getCourseCurriculum = createAsyncThunk(
  "courses/getCurriculum",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/courses/${id}/curriculum`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch curriculum");
    }
  }
);

// Create course
export const createCourse = createAsyncThunk(
  "courses/create",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await api.post("/courses/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create course");
    }
  }
);

// Update course
export const updateCourse = createAsyncThunk(
  "courses/update",
  async ({ id, formData }: { id: string; formData: FormData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/courses/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update course");
    }
  }
);

// Update course thumbnail
export const updateCourseThumbnail = createAsyncThunk(
  "courses/updateThumbnail",
  async ({ id, file }: { id: string; file: File }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("thumbnail", file);

      const response = await api.post(`/courses/${id}/thumbnail`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update thumbnail");
    }
  }
);

// Publish course
export const publishCourse = createAsyncThunk(
  "courses/publish",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/courses/${id}/publish`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to publish course");
    }
  }
);

// Unpublish course
export const unpublishCourse = createAsyncThunk(
  "courses/unpublish",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/courses/${id}/unpublish`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to unpublish course");
    }
  }
);

// Delete course
export const deleteCourse = createAsyncThunk(
  "courses/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/courses/${id}`);
      return response.data.success ? id : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete course");
    }
  }
);

// Clone course
export const cloneCourse = createAsyncThunk(
  "courses/clone",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/courses/${id}/clone`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to clone course");
    }
  }
);

// Get instructor courses
export const getInstructorCourses = createAsyncThunk(
  "courses/getInstructorCourses",
  async (params: { page?: number; limit?: number; status?: string; type?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });

      const response = await api.get(`/courses/instructor/my-courses?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch instructor courses");
    }
  }
);

// Search courses
export const searchCourses = createAsyncThunk(
  "courses/search",
  async (params: {
    q?: string;
    type?: string;
    level?: string;
    category?: string;
    institution?: string;
    minPrice?: number;
    maxPrice?: number;
    duration?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });

      const response = await api.get(`/courses/search?${queryParams.toString()}`);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to search courses");
    }
  }
);

// Validate access code
export const validateAccessCode = createAsyncThunk(
  "courses/validateAccessCode",
  async ({ id, access_code }: { id: string; access_code: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/courses/${id}/validate-code`, { access_code });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to validate access code");
    }
  }
);

// Assign instructor
export const assignInstructor = createAsyncThunk(
  "courses/assignInstructor",
  async ({ id, instructorData }: { id: string; instructorData: any }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/courses/${id}/instructors`, instructorData);
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to assign instructor");
    }
  }
);

// Remove instructor
export const removeInstructor = createAsyncThunk(
  "courses/removeInstructor",
  async ({ id, instructorId }: { id: string; instructorId: string }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/courses/${id}/instructors/${instructorId}`);
      return response.data.success ? { id, instructorId } : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to remove instructor");
    }
  }
);

// Generate access codes
export const generateAccessCodes = createAsyncThunk(
  "courses/generateAccessCodes",
  async ({ id, count, expiry_date, usage_limit }: {
    id: string;
    count: number;
    expiry_date?: string;
    usage_limit?: number
  }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/courses/${id}/access-codes`, {
        count,
        expiry_date,
        usage_limit
      });
      return response.data.success ? response.data.data : rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to generate access codes");
    }
  }
);

// ==================== SLICE ====================

const coursesSlice = createSlice({
  name: "courses",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<Partial<CoursesState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSelectedCourse: (state, action: PayloadAction<Course | null>) => {
      state.selectedCourse = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all courses with full info
      .addCase(getAllCoursesWithFullInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllCoursesWithFullInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses = action.payload.courses;
        state.pagination = action.payload.pagination;
        state.filters = action.payload.filters_applied;
      })
      .addCase(getAllCoursesWithFullInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Get categories
      .addCase(getCourseCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })

      // Get course by ID
      .addCase(getCourseById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCourseById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCourse = action.payload;
      })
      .addCase(getCourseById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create course
      .addCase(createCourse.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.isCreating = false;
        state.courses.unshift(action.payload);
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })

      // Update course
      .addCase(updateCourse.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.courses.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.courses[index] = action.payload;
        if (state.selectedCourse?.id === action.payload.id) {
          state.selectedCourse = action.payload;
        }
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Publish/Unpublish
      .addCase(publishCourse.fulfilled, (state, action) => {
        const index = state.courses.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.courses[index] = action.payload;
      })
      .addCase(unpublishCourse.fulfilled, (state, action) => {
        const index = state.courses.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.courses[index] = action.payload;
      })

      // Delete course
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.courses = state.courses.filter(c => c.id !== action.payload);
      })

      // Clone course
      .addCase(cloneCourse.fulfilled, (state, action) => {
        state.courses.unshift(action.payload);
      })

      .addCase(getMOOCOverview.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(getMOOCOverview.fulfilled, (state, action) => { state.isLoading = false; state.moocOverview = action.payload; })
      .addCase(getMOOCOverview.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // SPOC Overview
      .addCase(getSPOCOverview.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(getSPOCOverview.fulfilled, (state, action) => { state.isLoading = false; state.spocOverview = action.payload; })
      .addCase(getSPOCOverview.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // Course Reports
      .addCase(getCourseReports.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(getCourseReports.fulfilled, (state, action) => { state.isLoading = false; state.courseReports = action.payload; })
      .addCase(getCourseReports.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // Content Moderation
      .addCase(getContentModeration.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(getContentModeration.fulfilled, (state, action) => { state.isLoading = false; state.contentModeration = action.payload; })
      .addCase(getContentModeration.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // Approve/Reject/Flag moderation (refresh after action)
      .addCase(approveModerationCourse.fulfilled, (state) => { state.isLoading = false; })
      .addCase(rejectModerationCourse.fulfilled, (state) => { state.isLoading = false; })
      .addCase(flagModerationCourse.fulfilled, (state) => { state.isLoading = false; })

.addCase(getPublicCoursesForAssignment.pending, (state) => {
  state.isLoadingPublicCourses = true;
  state.error = null;
})
.addCase(getPublicCoursesForAssignment.fulfilled, (state, action) => {
  state.isLoadingPublicCourses = false;
  state.publicCoursesForAssignment = action.payload.courses;
  state.publicCoursesPagination = action.payload.pagination;
})
.addCase(getPublicCoursesForAssignment.rejected, (state, action) => {
  state.isLoadingPublicCourses = false;
  state.error = action.payload as string;
})

// Assign course to institution
.addCase(assignCourseToInstitution.pending, (state) => {
  state.isUpdating = true;
  state.error = null;
})
.addCase(assignCourseToInstitution.fulfilled, (state, action) => {
  state.isUpdating = false;
  // Remove the assigned course from the public courses list
  state.publicCoursesForAssignment = state.publicCoursesForAssignment.filter(
    c => c.id !== action.payload.id
  );
  // Add to regular courses list if needed
  if (!state.courses.find(c => c.id === action.payload.id)) {
    state.courses.unshift(action.payload);
  }
})
.addCase(assignCourseToInstitution.rejected, (state, action) => {
  state.isUpdating = false;
  state.error = action.payload as string;
})
  },
});

export const { clearError, setFilters, clearFilters, setSelectedCourse } = coursesSlice.actions;
export default coursesSlice.reducer;