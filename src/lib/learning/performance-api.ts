import { learningRequest } from "./api"

/**
 * Academic performance (LM-001).
 *
 * Three endpoints, one contract. The scope a caller gets is decided by the
 * server from their role — nothing here can widen it, which is why the same
 * table component serves instructor, institution admin and system admin.
 */

export type PerformanceBand =
  | "EXCELLENT"
  | "STRONG"
  | "GOOD"
  | "SATISFACTORY"
  | "NEEDS_IMPROVEMENT"
  | "AT_RISK"
  | "FAILED"
  | "NOT_STARTED"

export interface CoursePerformance {
  course_id: string
  course_title: string
  institution_id: string | null
  assessments_total: number
  assessments_attempted: number
  assessments_passed: number
  marks_earned: number
  marks_available: number
  percentage: number | null
  progress_percentage: number
  passing_score: number
  enrollment_status: string | null
  completed: boolean
  certificate_issued: boolean
  awaiting_grading: number
  band: PerformanceBand
}

export interface LearnerSummary {
  user_id: string
  name: string
  email: string
  institution_id: string | null
  institution_name: string | null
  courses_enrolled: number
  courses_completed: number
  courses_passed: number
  courses_at_risk: number
  assessments_attempted: number
  assessments_passed: number
  overall_percentage: number | null
  average_progress: number
  certificates: number
  band: PerformanceBand
}

export interface TranscriptRow {
  date: string | null
  course_id: string
  course_title: string
  assessment_id: string
  assessment_title: string
  attempt_number: number
  score: number | null
  max_score: number
  percentage: number | null
  passing_score: number
  passed: boolean | null
  status: string
  awaiting_grading: boolean
  is_best: boolean
  feedback: string | null
  review_status: "AUTO" | "REVIEWED" | "PENDING"
}

export interface GradingQueueRow {
  attempt_id: string
  user_id: string
  learner_name: string
  learner_email: string
  course_id: string
  course_title: string
  assessment_id: string
  assessment_title: string
  attempt_number: number
  submitted_at: string | null
  answers_total: number
  answers_ungraded: number
}

export interface GradableAnswer {
  answer_id: string
  question_id: string | null
  question: string
  question_type: string
  learner_answer: string | null
  points_earned: number | null
  points_possible: number
  is_graded: boolean
  feedback: string | null
}

export interface LearnerRecord {
  summary: LearnerSummary
  courses: CoursePerformance[]
  transcript: TranscriptRow[]
}

export interface CohortResponse {
  learners: LearnerSummary[]
  total: number
  scope: {
    kind: "GLOBAL" | "INSTITUTION" | "COURSES"
    institution_id: string | null
    course_count: number | null
  }
}

export interface CourseAggregate {
  course_id: string
  course_title: string
  institution_id: string | null
  institution_name: string | null
  /** Who teaches it — the source of the instructor filter's options (§8). */
  instructor_id: string | null
  instructor_name: string | null
  learners_enrolled: number
  learners_attempted: number
  learners_completed: number
  learners_passed: number
  learners_at_risk: number
  average_percentage: number | null
  average_progress: number
  pass_rate: number | null
  completion_rate: number
  passing_score: number
  awaiting_grading: number
  band: PerformanceBand
}

export interface InstitutionAggregate {
  institution_id: string | null
  institution_name: string
  learners: number
  courses: number
  average_percentage: number | null
  pass_rate: number | null
  completion_rate: number
}

export interface LearnerCourseRow {
  user_id: string
  learner_name: string
  learner_email: string
  institution_name: string | null
  course_id: string
  course_title: string
  assessments_total: number
  assessments_attempted: number
  assessments_passed: number
  average_percentage: number | null
  progress_percentage: number
  completed: boolean
  enrollment_status: string | null
  awaiting_grading: number
  certificate_issued: boolean
  passing_score: number
  /** When they joined the course (IC-001 §7). */
  enrolled_at: string | null
  /** Last time they opened it — quiet is not the same as gone. */
  last_activity: string | null
  band: PerformanceBand
}

/**
 * One institution course, with how its learners are doing (IC-001 §7, §9).
 *
 * `visibility` is derived on the server from the same two columns the
 * enrolment policy reads, so a course labelled a public MOOC here is one a
 * public learner can actually enrol in.
 */
export interface InstitutionCourseRow {
  course_id: string
  course_title: string
  course_type: string
  is_public: boolean
  visibility: "PUBLIC_MOOC" | "RESTRICTED_SPOC" | "RESTRICTED_MOOC"
  status: string
  instructor_name: string | null
  learners_enrolled: number
  learners_active: number
  learners_completed: number
  learners_at_risk: number
  average_percentage: number | null
  average_progress: number
  completion_rate: number
  passing_score: number
  awaiting_grading: number
  certificates_issued: number
  band: PerformanceBand
}

export interface AssessmentAggregate {
  assessment_id: string
  assessment_title: string
  course_id: string
  course_title: string
  passing_score: number
  learners_attempted: number
  attempts_total: number
  average_percentage: number | null
  pass_rate: number | null
  awaiting_grading: number
  hardest_rank: number
  band: PerformanceBand
}

export interface AttemptRow {
  attempt_id: string
  user_id: string
  learner_name: string
  course_id: string
  course_title: string
  assessment_id: string
  assessment_title: string
  attempt_number: number
  submitted_at: string | null
  percentage: number | null
  passed: boolean | null
  status: string
  awaiting_grading: boolean
  review_status: "AUTO" | "REVIEWED" | "PENDING"
}

export interface PerformancePatterns {
  bands: Record<string, number>
  trend: Array<{ month: string; average: number | null; attempts: number }>
  distribution: Array<{ bucket: string; learners: number }>
}

type Query = Record<string, string | number | undefined>

function qs(params: Query): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}` !== "") q.set(k, String(v))
  }
  const out = q.toString()
  return out ? `?${out}` : ""
}

export const performanceApi = {
  /** The signed-in learner's own record. */
  me: () => learningRequest<LearnerRecord>("/academic-performance/me"),

  cohort: (
    params: {
      search?: string
      limit?: number
      offset?: number
      institution_id?: string
      band?: string
      course_id?: string
      instructor_id?: string
      completion?: string
      sort?: string
      direction?: "asc" | "desc"
    } = {}
  ) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}` !== "") q.set(k, String(v))
    }
    const query = q.toString()
    return learningRequest<CohortResponse>(
      `/academic-performance/learners${query ? `?${query}` : ""}`
    )
  },

  learner: (userId: string) =>
    learningRequest<LearnerRecord>(`/academic-performance/learners/${userId}`),

  /** Courses in the caller's scope, aggregated across their learners. */
  courses: (params: Query = {}) =>
    learningRequest<{ courses: CourseAggregate[] }>(
      `/academic-performance/courses${qs(params)}`
    ),

  /** Attempts waiting on a human, in the caller's scope. */
  gradingQueue: () =>
    learningRequest<{ queue: GradingQueueRow[] }>("/academic-performance/grading-queue"),

  /** One attempt, answer by answer, ready to mark. */
  attemptAnswers: (attemptId: string) =>
    learningRequest<{ attempt: any; answers: GradableAnswer[] }>(
      `/academic-performance/attempts/${attemptId}`
    ),

  /** One row per learner per course (§7). */
  learnerCourses: (params: Query = {}) =>
    learningRequest<{ rows: LearnerCourseRow[]; total: number }>(
      `/academic-performance/learner-courses${qs(params)}`
    ),

  /** Per-assessment results, hardest first (§8, §9). */
  assessments: (params: Query = {}) =>
    learningRequest<{ assessments: AssessmentAggregate[] }>(
      `/academic-performance/assessments${qs(params)}`
    ),

  /** Attempts in scope; pass ungraded=true for the grading queue only. */
  attempts: (params: Query = {}) =>
    learningRequest<{ attempts: AttemptRow[] }>(
      `/academic-performance/attempts${qs(params)}`
    ),

  /** Bands, trend and distribution (§9). */
  patterns: (params: Query = {}) =>
    learningRequest<PerformancePatterns>(`/academic-performance/patterns${qs(params)}`),

  /** The caller's own institution course catalogue (§7, §9). */
  institutionCourses: (params: Query = {}) =>
    learningRequest<{ courses: InstitutionCourseRow[] }>(
      `/academic-performance/institution-courses${qs(params)}`
    ),

  /** System admin only. Institutions side by side, independents included. */
  institutions: () =>
    learningRequest<{ institutions: InstitutionAggregate[] }>(
      "/academic-performance/institutions"
    ),
}

/** Band presentation, in one place so every table agrees. */
export const BAND_LABEL: Record<PerformanceBand, string> = {
  EXCELLENT: "Excellent",
  STRONG: "Strong",
  GOOD: "Good",
  SATISFACTORY: "Satisfactory",
  NEEDS_IMPROVEMENT: "Needs improvement",
  AT_RISK: "At risk",
  FAILED: "Failed",
  NOT_STARTED: "Not started",
}

/**
 * Semantic colour, separate from the brand accent.
 *
 * At risk and failed are the two an instructor is scanning for, so they are the
 * only ones that carry alarm; everything else stays quiet so those stand out.
 */
export function bandClass(band: PerformanceBand): string {
  switch (band) {
    case "EXCELLENT":
    case "STRONG":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    case "GOOD":
    case "SATISFACTORY":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
    case "NEEDS_IMPROVEMENT":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
    case "AT_RISK":
      return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300"
    case "FAILED":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}
