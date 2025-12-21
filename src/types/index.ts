
export enum CourseType {
  MOOC = "MOOC",
  SPOC = "SPOC",
}

export interface BackendCourseResponse {
  success: boolean;
  data?: Course;
  course?: Course;
  message?: string;
  error?: string;
  summary?: any;
}

export interface AccessExtension {
  id: string
  enrollmentId: string
  enrollment?: Enrollment
  requestedAt: Date
  approvedAt?: Date
  newExpiryDate: Date
  daysAdded: number
  status: "pending" | "approved" | "rejected"
  approvedBy?: string
  approverNotes?: string
}

export interface Notification {
  id: string
  userId: string
  user?: User
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  isRead: boolean
  createdAt: Date
}

export interface BackendStudentsResponse {
  success: boolean;
  data?: {
    students: User[];
    statistics: {
      total_students: number;
      active_students: number;
      completed_students: number;
      average_progress: string;
      total_enrollments: number;
    };
    course: {
      id: string;
      title: string;
      course_type: CourseType;
      instructor_name: string;
    };
  };
  students?: User[];
  message?: string;
  error?: string;
}

// Helper function to normalize backend data to frontend format
export function normalizeCourseFromBackend(backendCourse: any): Course {
  return {
    ...backendCourse,
    // Map backend properties to frontend properties
    isPublished: backendCourse.status === "PUBLISHED",
    rating: typeof backendCourse.average_rating === 'string' 
      ? parseFloat(backendCourse.average_rating) 
      : backendCourse.average_rating || 0,
    enrollmentCount: backendCourse.enrollment_count || 0,
    duration: backendCourse.duration_minutes || 0,
    updatedAt: backendCourse.updated_at ? new Date(backendCourse.updated_at) : new Date(),
    publishedAt: backendCourse.published_at ? new Date(backendCourse.published_at) : null,
    createdAt: backendCourse.created_at ? new Date(backendCourse.created_at) : new Date(),
    // Ensure price is a number
    price: typeof backendCourse.price === 'string' 
      ? parseFloat(backendCourse.price) 
      : backendCourse.price || 0,
    // Ensure tags is an array
    tags: Array.isArray(backendCourse.tags) ? backendCourse.tags : [],
    // Ensure modules is an array
    modules: Array.isArray(backendCourse.modules) ? backendCourse.modules : [],
    // Ensure statistics exists
    statistics: backendCourse.statistics || {
      total_modules: backendCourse.modules?.length || 0,
      total_lessons: 0,
      total_duration_minutes: backendCourse.duration_minutes || 0,
      total_assessments: 0,
      total_quizzes: 0,
      total_questions: 0,
      has_certificate: backendCourse.is_certificate_available || false,
      enrollment_count: backendCourse.enrollment_count || 0,
      average_rating: backendCourse.average_rating || 0,
      total_reviews: backendCourse.total_reviews || 0
    }
  };
}

export function normalizeUserFromBackend(backendUser: any): User {
  return {
    ...backendUser,
    // Map backend properties to frontend properties
    firstName: backendUser.first_name || backendUser.firstName || '',
    lastName: backendUser.last_name || backendUser.lastName || '',
    profilePicture: backendUser.profile_picture_url || backendUser.profilePicture || '',
    dateJoined: backendUser.date_joined ? new Date(backendUser.date_joined) : new Date(),
    lastLogin: backendUser.last_login ? new Date(backendUser.last_login) : null,
    // Ensure arrays are properly formatted
    institution_ids: Array.isArray(backendUser.institution_ids) ? backendUser.institution_ids : [],
    spoc_access_codes_used: Array.isArray(backendUser.spoc_access_codes_used) ? backendUser.spoc_access_codes_used : [],
    tags: Array.isArray(backendUser.tags) ? backendUser.tags : []
  };
}

export interface ContentBlock {
  id: string;
  type: "text" | "image" | "video" | "resource";
  order: number;
  data: {
    text?: string;
    url?: string;
    [key: string]: any;
  };
}

// AssessmentQuestion type
export interface AssessmentQuestion {
  id: string;
  question_text: string;
  question_type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
  options?: string[];
  correct_answer: string | string[];
  points: number;
  order_index: number;
  explanation?: string;
  image_url?: string;
}

export enum CourseLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  EXPERT = "EXPERT",
}

export enum CourseStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum AccountType {
  STUDENT = "Student",
  RESEARCHER = "Researcher",
  DIASPORA = "Diaspora",
  INSTITUTION = "Institution",
  ADMIN = "admin",
}

export enum BwengeRole {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  LEARNER = "LEARNER",
}

export enum InstitutionRole {
  ADMIN = "ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  MEMBER = "MEMBER",
}

export enum AssessmentType {
  QUIZ = "QUIZ",
  EXAM = "EXAM",
  ASSIGNMENT = "ASSIGNMENT",
  PROJECT = "PROJECT",
}

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  SHORT_ANSWER = "SHORT_ANSWER",
  ESSAY = "ESSAY",
}

export enum InstitutionType {
  UNIVERSITY = "UNIVERSITY",
  GOVERNMENT = "GOVERNMENT",
  PRIVATE_COMPANY = "PRIVATE_COMPANY",
  NGO = "NGO",
}

export enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  DROPPED = "DROPPED",
  EXPIRED = "EXPIRED",
  PENDING = "PENDING",
}

export enum EnrollmentApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum LessonType {
  VIDEO = "VIDEO",
  TEXT = "TEXT",
  QUIZ = "QUIZ",
  ASSIGNMENT = "ASSIGNMENT",
  LIVE_SESSION = "LIVE_SESSION",
  RESOURCE = "RESOURCE",
}

export enum ModuleFinalType {
  ASSESSMENT = "ASSESSMENT",
  PROJECT = "PROJECT",
}

export enum SubmissionStatus {
  PENDING = "PENDING",
  PASSED = "PASSED",
  FAILED = "FAILED",
}

export enum InstitutionMemberRole {
  ADMIN = "ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  MEMBER = "MEMBER",
}

export enum MessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
}

export enum CommentStatus {
  ACTIVE = "active",
  FLAGGED = "flagged",
  HIDDEN = "hidden",
  DELETED = "deleted",
}

// ==================== USER INTERFACE ====================
export interface User {
  id: string; // UUID
  email: string;
  password_hash: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  profile_picture_url?: string;
  bio?: string;
  account_type: AccountType;
  is_verified: boolean;
  is_active: boolean;
  isUserLogin: boolean;
  date_joined: Date;
  last_login?: Date;
  country?: string;
  city?: string;
  social_auth_provider?: string;
  social_auth_id?: string;
  total_points: number;
  
  is_institution_member: boolean;
  institution_ids?: string[];
  primary_institution_id?: string;
  bwenge_role: BwengeRole;
  institution_role?: InstitutionRole;
  
  institution?: {
    id: string;
    name: string;
    type: InstitutionType;
    logo_url?: string;
    description?: string;
    is_active: boolean;
    slug: string;
    created_at: Date;
    updated_at: Date;
    
    settings?: {
      allow_public_courses?: boolean;
      require_approval_for_spoc?: boolean;
      max_instructors?: number;
      custom_branding?: any;
    };
    
    user_role?: InstitutionRole;
    
    institution_address?: string;
    institution_phone?: string;
    institution_website?: string;
    institution_description?: string;
    institution_departments?: string[];
    institution_founded_year?: number;
    institution_accreditation?: string;
  };
  
  spoc_access_codes_used?: string[];
  
  profile?: {
    institution_name?: string;
    department?: string;
    academic_level?: string;
    research_interests?: string[];
    orcid_id?: string;
    google_scholar_url?: string;
    linkedin_url?: string;
    website_url?: string;
    cv_file_url?: string;
    current_position?: string;
    home_institution?: string;
    willing_to_mentor?: boolean;
    
    institution_address?: string;
    institution_phone?: string;
    institution_type?: InstitutionType;
    institution_website?: string;
    institution_description?: string;
    institution_departments?: string[];
    institution_founded_year?: number;
    institution_accreditation?: string;
    
    total_projects_count?: number;
    total_followers_count?: number;
    total_following_count?: number;
  };
  
  enrolled_courses_count: number;
  completed_courses_count: number;
  total_learning_hours: number;
  certificates_earned: number;
  
  learning_preferences?: {
    preferred_language?: string;
    notification_settings?: any;
    learning_pace?: string;
    interests?: string[];
    theme?: "light" | "dark" | "system";
    two_factor_enabled?: boolean;
    last_password_change?: string;
  };
  
  bwenge_profile_completed: boolean;
  last_login_bwenge?: Date;
  updated_at: Date;
  
  courses_created?: Course[];
  enrollments?: Enrollment[];
  certificates?: Certificate[];
  reviews?: CourseReview[];
  lesson_progress?: LessonProgress[];
  institution_memberships?: InstitutionMember[];
  course_instructor_assignments?: CourseInstructor[];
  answers?: Answer[];
  
  // Messaging relations
  sentMessages?: Message[];
  studentConversations?: Conversation[];
  instructorConversations?: Conversation[];
}

// ==================== COURSE INTERFACE ====================
export interface Course {
  id: string; // UUID
  title: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  instructor_id: string | null;
  instructor?: User;
  
  created_by_institution_admin_id?: string | null;
  created_by_admin?: User;

  institution_id?: string;
  institution?: Institution;
  category_id?: string;
  course_category?: CourseCategory;
  
  course_type: CourseType;
  is_public: boolean;
  access_codes?: string[];
  requires_approval: boolean;
  max_enrollments?: number;
  enrollment_start_date?: Date;
  enrollment_end_date?: Date;
  is_institution_wide: boolean;
  
  level: CourseLevel;
  status: CourseStatus;
  enrollment_count: number;
  completion_rate: number;
  average_rating: number;
  total_reviews: number;
  duration_minutes: number;
  total_lessons: number;
  price: number;
  is_certificate_available: boolean;
  requirements?: string;
  what_you_will_learn?: string;
  language?: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  
  // Relations
  modules?: Module[];
  lessons?: Lesson[];
  enrollments?: Enrollment[];
  certificates?: Certificate[];
  reviews?: CourseReview[];
  course_instructors?: CourseInstructor[];
  
  // Space relation
  space?: Space;
}

// ==================== COURSE CATEGORY ====================
export interface CourseCategory {
  id: string;
  institution_id?: string;
  institution?: Institution;
  name: string;
  description?: string;
  parent_category_id?: string;
  parent_category?: CourseCategory;
  subcategories?: CourseCategory[];
  order_index: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  courses?: Course[];
}

// ==================== INSTITUTION ====================
export interface Institution {
  id: string;
  name: string;
  slug: string;
  type: InstitutionType;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  settings?: {
    allow_public_courses?: boolean;
    require_approval_for_spoc?: boolean;
    max_instructors?: number;
    custom_branding?: any;
  };
  created_at: Date;
  updated_at: Date;
  
  // Relations
  members?: InstitutionMember[];
  courses?: Course[];
  categories?: CourseCategory[];
}

// ==================== INSTITUTION MEMBER ====================
export interface InstitutionMember {
  id: string;
  user_id: string;
  user: User;
  institution_id: string;
  institution: Institution;
  role: InstitutionMemberRole;
  is_active: boolean;
  joined_at: Date;
  additional_permissions?: {
    can_create_courses?: boolean;
    can_manage_members?: boolean;
    can_view_analytics?: boolean;
    custom_permissions?: string[];
  };
}

// ==================== COURSE INSTRUCTOR ====================
export interface CourseInstructor {
  id: string;
  course_id: string;
  course: Course;
  instructor_id: string;
  instructor: User;
  is_primary_instructor: boolean;
  can_grade_assignments: boolean;
  can_manage_enrollments: boolean;
  can_edit_course_content: boolean;
  assigned_at: Date;
}

// ==================== MODULE ====================
export interface Module {
  id: string;
  course_id: string;
  course: Course;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  estimated_duration_hours?: number;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  lessons?: Lesson[];
  final_assessment?: ModuleFinalAssessment;
}

// ==================== LESSON ====================
export interface Lesson {
  id: string;
  course_id: string;
  course: Course;
  module_id?: string;
  module?: Module;
  is_preview: boolean;
  title: string;
  content?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_minutes: number;
  order_index: number;
  type: LessonType;
  is_published: boolean;
  resources?: Array<{
    title: string;
    url: string;
    type: string;
    public_id?: string;
  }>;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  assessments?: Assessment[];
  progress_records?: LessonProgress[];
  quizzes?: Quiz[];
}

// ==================== ASSESSMENT ====================
export interface Assessment {
  id: string;
  course_id: string;
  lesson_id?: string;
  module_id?: string;
  is_final_assessment: boolean;
  is_module_final: boolean;
  title: string;
  description?: string;
  type: AssessmentType;
  questions: AssessmentQuestion[];
  passing_score: number;
  max_attempts: number;
  time_limit_minutes?: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
  order_index?: number;
  
  // Relations
  course?: Course;
  lesson?: Lesson;
  module?: Module;
  attempts?: AssessmentAttempt[];
}

// ==================== QUIZ ====================
export interface Quiz {
  id: string;
  course_id: string;
  course: Course;
  lesson_id?: string;
  lesson?: Lesson;
  title: string;
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  questions?: Question[];
  answers?: Answer[];
}

// ==================== QUESTION ====================
export interface Question {
  id: string;
  quiz_id: string;
  quiz: Quiz;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  points: number;
  order_index: number;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  answers?: Answer[];
}

// ==================== ANSWER ====================
export interface Answer {
  id: string;
  user_id: string;
  user: User;
  question_id: string;
  question: Question;
  quiz_id: string;
  quiz: Quiz;
  selected_option: string;
  is_correct: boolean;
  time_spent_seconds: number;
  created_at: Date;
}

// ==================== ENROLLMENT ====================
export interface Enrollment {
  id: string;
  user_id: string;
  user: User;
  course_id: string;
  course: Course;
  
  access_code_used?: string;
  requires_approval: boolean;
  approval_status?: EnrollmentApprovalStatus;
  approved_by_user_id?: string;
  approval_date?: Date;
  institution_id?: string;
  request_type?: string;
  request_message?: string;
  access_code_sent: boolean;
  access_code_sent_at?: Date;
  
  enrolled_at: Date;
  progress_percentage: number;
  status: EnrollmentStatus;
  completion_date?: Date;
  certificate_issued: boolean;
  total_time_spent_minutes: number;
  last_accessed?: Date;
  completed_lessons: number;
  final_score?: number;
  updated_at: Date;
  
  // Relations
  lesson_progress?: LessonProgress[];
  assessment_attempts?: AssessmentAttempt[];
  accessExtensions?: AccessExtension[];
}

// ==================== LESSON PROGRESS ====================
export interface LessonProgress {
  id: string;
  enrollment_id: string;
  enrollment: Enrollment;
  lesson_id: string;
  lesson: Lesson;
  user_id: string;
  user: User;
  is_completed: boolean;
  completion_percentage: number;
  time_spent_seconds: number;
  last_position_seconds?: number;
  quiz_score?: number;
  attempt_count: number;
  started_at: Date;
  completed_at?: Date;
  last_accessed_at: Date;
  quiz_answers?: any;
  notes?: string;
}

// ==================== ASSESSMENT ATTEMPT ====================
export interface AssessmentAttempt {
  id: string;
  enrollment_id: string;
  enrollment: Enrollment;
  assessment_id: string;
  assessment: Assessment;
  attempt_number: number;
  answers: any;
  score: number;
  percentage: number;
  passed: boolean;
  started_at: Date;
  submitted_at?: Date;
  time_taken_seconds?: number;
}

// ==================== CERTIFICATE ====================
export interface Certificate {
  id: string;
  user_id: string;
  user: User;
  course_id: string;
  course: Course;
  enrollment_id: string;
  certificate_number: string;
  verification_code: string;
  issue_date: Date;
  certificate_url?: string;
  final_score: number;
  is_valid: boolean;
  expires_at?: Date;
}

// ==================== COURSE REVIEW ====================
export interface CourseReview {
  id: string;
  user_id: string;
  user: User;
  course_id: string;
  course: Course;
  rating: number;
  comment?: string;
  created_at: Date;
  updated_at: Date;
}

// ==================== MODULE FINAL ASSESSMENT ====================
export interface ModuleFinalAssessment {
  id: string;
  module_id: string;
  module: Module;
  title: string;
  type: ModuleFinalType;
  assessment_id?: string;
  assessment?: Assessment;
  project_instructions?: string;
  passing_score_percentage: number;
  time_limit_minutes?: number;
  requires_file_submission: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  submissions?: ModuleFinalSubmission[];
}

// ==================== MODULE FINAL SUBMISSION ====================
export interface ModuleFinalSubmission {
  id: string;
  module_final_assessment_id: string;
  module_final_assessment: ModuleFinalAssessment;
  user_id: string;
  user: User;
  submitted_file_url?: string;
  answer_data?: any;
  status: SubmissionStatus;
  score?: number;
  instructor_feedback?: string;
  submitted_at: Date;
  graded_at: Date;
}

// ==================== CONVERSATION ====================
export interface Conversation {
  id: string; // UUID
  studentId: string; // UUID
  student?: User;
  instructorId: string; // UUID
  instructor?: User;
  courseId: string; // UUID
  course?: Course;
  messages?: Message[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Helper methods
  getOtherUser?: (currentUserId: string) => User | undefined;
  getUnreadCount?: (currentUserId: string) => number;
  getLastMessage?: () => Message | null;
}

// ==================== MESSAGE ====================
export interface Message {
  id: string; // UUID
  conversationId: string; // UUID
  conversation?: Conversation;
  senderId: string; // UUID
  sender?: User;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  attachmentUrl?: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  
  markAsRead?: () => void;
}

// ==================== PRIVATE MESSAGE (Alias for Message) ====================
export type PrivateMessage = Message;

// ==================== SPACE ====================
export interface Space {
  id: string; // UUID
  courseId: string; // UUID
  course?: Course;
  members?: SpaceMember[];
  messages?: SpaceMessage[];
  createdAt: Date;
}

// ==================== SPACE MEMBER ====================
export interface SpaceMember {
  id: string; // UUID
  spaceId: string; // UUID
  space?: Space;
  userId: string; // UUID
  user?: User;
  isMuted: boolean;
}

// ==================== SPACE MESSAGE ====================
export interface SpaceMessage {
  id: string; // UUID
  spaceId: string; // UUID
  space?: Space;
  senderId: string; // UUID
  sender?: User;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  attachmentUrl?: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== COURSE SPACE MESSAGE (Alias for SpaceMessage) ====================
export type CourseSpaceMessage = SpaceMessage;

// ==================== INSTRUCTOR ACTIVITY ====================
export interface InstructorActivity {
  id: string
  instructorId: string
  instructor?: User
  organizationId: string
  institution?: Institution
  activityType: "message_sent" | "message_read" | "response_time" | "comment_moderation"
  relatedId?: string
  metadata?: Record<string, any>
  createdAt: Date
}

// ==================== REQUEST/RESPONSE TYPES ====================
export interface CreateCourseRequest {
  institution_id?: string;
  title: string;
  description: string;
  short_description?: string;
  thumbnail_url?: string;
  category_id?: string;
  category_name?: string;
  level: CourseLevel;
  price?: number;
  duration_minutes?: number;
  requires_approval?: boolean;
  max_enrollments?: number;
  is_institution_wide?: boolean;
  tags?: string[];
  language?: string;
  requirements?: string;
  what_you_will_learn?: string;
  is_certificate_available?: boolean;
  modules?: ModuleRequest[];
  course_type: CourseType;
  institutionId?: string;
}

export interface ModuleRequest {
  id?: string;
  title: string;
  description?: string;
  order_index?: number;
  order?: number;
  estimated_duration_hours?: number;
  lessons?: LessonRequest[];
  finalAssessment?: ModuleFinalAssessmentRequest;
  final_assessment?: ModuleFinalAssessmentRequest;
}

export interface LessonRequest {
  id?: string;
  title: string;
  content?: string;
  videoUrl?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  duration_minutes?: number;
  order_index?: number;
  order?: number;
  type?: LessonType;
  is_preview?: boolean;
  resources?: Array<{
    title: string;
    url: string;
    type: string;
    public_id?: string;
  }>;
  assessments?: AssessmentRequest[];
}

export interface AssessmentRequest {
  id?: string;
  title: string;
  description?: string;
  type?: AssessmentType;
  passingScore?: number;
  passing_score?: number;
  max_attempts?: number;
  timeLimit?: number;
  time_limit_minutes?: number;
  questions?: QuestionRequest[];
  shuffle_questions?: boolean;
  show_correct_answers?: boolean;
}

export interface QuestionRequest {
  id?: string;
  question: string;
  type: string;
  options?: string[];
  correctAnswer?: any;
  correct_answer?: any;
  points?: number;
  explanation?: string;
  image_url?: string;
  order_index?: number;
  pairs?: Array<{ left: string; right: string }>;
}

export interface ModuleFinalAssessmentRequest {
  id?: string;
  title: string;
  type: "assessment" | "project";
  description?: string;
  instructions?: string;
  project_instructions?: string;
  passingScore?: number;
  passing_score?: number;
  passing_score_percentage?: number;
  timeLimit?: number;
  time_limit_minutes?: number;
  fileRequired?: boolean;
  requires_file_submission?: boolean;
  max_attempts?: number;
  questions?: QuestionRequest[];
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string;
  category_id?: string;
  category_name?: string;
  level?: CourseLevel;
  price?: number;
  duration_minutes?: number;
  requires_approval?: boolean;
  max_enrollments?: number;
  is_institution_wide?: boolean;
  tags?: string[];
  language?: string;
  requirements?: string;
  what_you_will_learn?: string;
  is_certificate_available?: boolean;
  status?: CourseStatus;
  modules?: ModuleRequest[];
  course_type?: CourseType;
}

export interface AssignInstructorRequest {
  instructor_id: string;
  is_primary_instructor?: boolean;
  can_grade_assignments?: boolean;
  can_manage_enrollments?: boolean;
  can_edit_course_content?: boolean;
}

export interface GenerateAccessCodesRequest {
  count: number;
  expiry_date?: Date;
  usage_limit?: number;
}

export interface ValidateAccessCodeRequest {
  access_code: string;
}

export interface SearchCoursesQuery {
  page?: number;
  limit?: number;
  category?: string;
  level?: string;
  search?: string;
  type?: CourseType;
  institution?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "rating" | "enrollments" | "recent";
}

// ==================== RESPONSE TYPES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  summary?: any;
}

export interface PaginatedResponse<T> {
  courses: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CourseCreateResponse {
  success: boolean;
  message: string;
  data: Course;
  summary: {
    course_id: string;
    course_type: CourseType;
    total_modules: number;
    total_lessons: number;
    total_duration_minutes: number;
    status: CourseStatus;
    is_public: boolean;
  };
}

export interface CourseUpdateResponse {
  success: boolean;
  message: string;
  data: Course;
}

export interface CourseThumbnailResponse {
  success: boolean;
  message: string;
  data: {
    thumbnail_url: string;
  };
}

export interface AccessCodeResponse {
  success: boolean;
  message: string;
  data: {
    codes: string[];
    expiry_date?: Date;
    usage_limit?: number;
  };
}

export interface AccessCodeValidationResponse {
  success: boolean;
  data: {
    valid: boolean;
    course_id: string;
    course_title: string;
  };
}

export interface CourseCurriculumResponse {
  success: boolean;
  data: Course;
}

export interface InstructorAssignmentResponse {
  success: boolean;
  message: string;
  data: CourseInstructor;
}

// ==================== FILE UPLOAD TYPES ====================
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

// ==================== HELPER TYPES ====================
export interface CourseTotals {
  totalLessons: number;
  totalDuration: number;
}

export interface ResourceFile {
  title: string;
  url: string;
  type: string;
  public_id?: string;
}

// ==================== AUTH TYPES ====================
export interface AuthUser {
  userId?: string;
  id?: string;
  email: string;
  role: BwengeRole | InstitutionRole;
  institution_id?: string;
}

// ==================== EMAIL TYPES ====================
export interface EmailData {
  to: string;
  subject: string;
  html: string;
}