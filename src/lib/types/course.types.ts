// ==================== ENUMS ====================

export enum CourseType {
  MOOC = "MOOC",
  SPOC = "SPOC",
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

export enum LessonType {
  VIDEO = "VIDEO",
  TEXT = "TEXT",
  QUIZ = "QUIZ",
  ASSIGNMENT = "ASSIGNMENT",
  LIVE_SESSION = "LIVE_SESSION",
  RESOURCE = "RESOURCE",
}

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  SHORT_ANSWER = "SHORT_ANSWER",
  ESSAY = "ESSAY",
}

export enum ModuleFinalType {
  PROJECT = "PROJECT",
  ASSESSMENT = "ASSESSMENT",
}

// ==================== INTERFACES ====================

export interface LessonResource {
  title: string
  url: string
  type: string
  public_id?: string
}

export interface Question {
  id?: string
  question: string
  type: QuestionType
  options?: string[]
  correct_answer: string | string[] | boolean
  explanation?: string
  points?: number
  order_index?: number
  image_url?: string
}

export interface Assessment {
  id?: string
  title: string
  description?: string
  type?: string
  passing_score?: number
  time_limit_minutes?: number
  max_attempts?: number
  questions?: Question[]
  is_published?: boolean
  is_final_assessment?: boolean
  is_module_final?: boolean
}

export interface Lesson {
  id?: string
  title: string
  content?: string
  type: LessonType
  video_url?: string
  thumbnail_url?: string
  duration_minutes?: number
  order_index: number
  is_published?: boolean
  is_preview?: boolean
  resources?: LessonResource[]
  assessments?: Assessment[]
}

export interface ModuleFinalAssessment {
  title: string
  type: ModuleFinalType
  instructions?: string
  project_instructions?: string
  passing_score_percentage?: number
  time_limit_minutes?: number
  requires_file_submission?: boolean
  questions?: Question[]
}

export interface Module {
  id?: string
  title: string
  description?: string
  order_index: number
  estimated_duration_hours?: number
  lessons?: Lesson[]
  is_published?: boolean
  finalAssessment?: ModuleFinalAssessment
  final_assessment?: ModuleFinalAssessment
}

export interface Course {
  id?: string
  title: string
  description: string
  short_description?: string
  thumbnail_url?: string
  category_id?: string
  category_name?: string
  institution_id?: string
  instructor_id?: string
  course_type: CourseType
  level: CourseLevel
  status?: CourseStatus
  price?: number
  duration_minutes?: number
  total_lessons?: number
  enrollment_count?: number
  average_rating?: number
  total_reviews?: number
  is_public?: boolean
  requires_approval?: boolean
  max_enrollments?: number
  is_institution_wide?: boolean
  is_certificate_available?: boolean
  tags?: string[]
  language?: string
  requirements?: string
  what_you_will_learn?: string
  modules?: Module[]
  created_at?: Date
  updated_at?: Date
  published_at?: Date
}

export interface CreateCourseRequest {
  institution_id?: string
  title: string
  description: string
  short_description?: string
  thumbnail_url?: string
  category_id?: string
  category_name?: string
  level: CourseLevel
  price?: number
  duration_minutes?: number
  requires_approval?: boolean
  max_enrollments?: number
  is_institution_wide?: boolean
  tags?: string[]
  language?: string
  requirements?: string
  what_you_will_learn?: string
  is_certificate_available?: boolean
  modules?: Module[]
  course_type: CourseType
}

export interface CourseApiResponse {
  success: boolean
  data: Course
  message?: string
}

export interface CoursesListResponse {
  success: boolean
  data: Course[]
  message?: string
}
