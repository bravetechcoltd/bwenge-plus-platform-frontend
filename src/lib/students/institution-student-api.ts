import api from "@/lib/api";

/**
 * One student, as their institution sees them (ISTU-001).
 *
 * The three-dot menu on /dashboard/institution-admin/students advertised
 * "View Courses", "Learning Progress" and "Certificates" — each with a live
 * count beside it, and none of them wired to anything. These are the calls
 * behind the three pages that replaced them.
 *
 * Every field below is read from a row that already existed: `enrollments`,
 * `lesson_progress`, `certificates`, `assessment_attempts`. Anything that
 * cannot be derived from a row arrives as `null`, and the pages render that
 * as "not recorded" rather than as a zero — a confident number with nothing
 * behind it is the exact failure these pages exist to correct.
 */

/* ── Shared ──────────────────────────────────────────────────────────────── */

export interface StudentMembership {
  role: string;
  is_active: boolean;
  joined_at: string | null;
}

export interface InstitutionStudent {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string;
  profile_picture_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  date_joined: string | null;
  last_login: string | null;
  membership: StudentMembership;
}

export interface StudentStats {
  /**
   * Distinct courses with status ACTIVE or COMPLETED.
   *
   * Defined exactly as the students table defines its "Courses" column, and
   * as the three-dot menu's "View Courses (N)" label prints it, so the number
   * clicked and the number shown are the same one (ISTU-002).
   */
  enrolled_courses: number;
  /** Every enrollment row, including dropped and pending ones. */
  total_enrollments: number;
  /** Of those listed, the ones belonging to this institution. */
  courses_from_institution: number;
  completed_courses: number;
  in_progress_courses: number;
  not_started_courses: number;
  /** Every certificate the student holds — see ISTU-002 in the controller. */
  certificates_earned: number;
  /** Of those, the ones earned on this institution's courses. */
  certificates_from_institution: number;
  total_learning_minutes: number;
  /** `null` when there are no courses to average. Not zero percent. */
  average_progress: number | null;
  last_active_at: string | null;
  /** Of those listed, the ones from outside this institution. */
  enrollments_outside_institution: number;
}

export interface StudentOverview {
  student: InstitutionStudent;
  stats: StudentStats;
}

/* ── Courses ─────────────────────────────────────────────────────────────── */

export interface StudentCourseSummary {
  id: string;
  title: string;
  short_description: string | null;
  thumbnail_url: string | null;
  course_type: string | null;
  level: string | null;
  status: string | null;
  category: string | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  belongs_to_institution: boolean;
}

export interface StudentEnrollment {
  enrollment_id: string;
  course: StudentCourseSummary | null;
  status: string | null;
  approval_status: string | null;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  time_spent_minutes: number;
  /** `null` while ungraded. */
  final_score: number | null;
  enrolled_at: string | null;
  last_accessed: string | null;
  completion_date: string | null;
  completion_basis: string | null;
  certificate_issued: boolean;
  certificate_id: string | null;
}

/* ── Progress ────────────────────────────────────────────────────────────── */

export interface StudentLessonProgress {
  id: string;
  title: string;
  type: string | null;
  order_index: number;
  duration_minutes: number;
  is_required: boolean;
  /**
   * Reported, never filtered on.
   *
   * Every lesson in this database has it false — the authoring flow does not
   * set it — so a query that required `is_published = true` returned nothing
   * for courses students have measurably worked through. The pages mark a
   * draft lesson only where its course has published ones too.
   */
  is_published: boolean;
  /** False when no `lesson_progress` row exists — never opened. */
  started: boolean;
  is_completed: boolean;
  completion_percentage: number;
  time_spent_seconds: number;
  quiz_score: number | null;
  attempt_count: number;
  completion_source: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
}

export interface StudentModuleProgress {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  estimated_duration_hours: number;
  lessons: StudentLessonProgress[];
  completed_lessons: number;
  total_lessons: number;
  progress_percentage: number | null;
}

export interface StudentCourseProgress {
  enrollment_id: string;
  course: Pick<
    StudentCourseSummary,
    "id" | "title" | "thumbnail_url" | "course_type" | "instructor_name"
  > | null;
  status: string | null;
  progress_percentage: number;
  enrolled_at: string | null;
  last_accessed: string | null;
  completion_date: string | null;
  modules: StudentModuleProgress[];
  lesson_totals: {
    total: number;
    completed: number;
    started: number;
    not_started: number;
  };
  time_spent_seconds: number;
}

export interface StudentAssessmentAttempt {
  id: string;
  assessment_id: string;
  assessment_title: string | null;
  course_id: string | null;
  attempt_number: number;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  status: string | null;
  time_taken_seconds: number;
  started_at: string | null;
  submitted_at: string | null;
  requires_manual_grading: boolean;
}

export interface StudentProgressPayload {
  courses: StudentCourseProgress[];
  assessment_attempts: StudentAssessmentAttempt[];
}

/* ── Certificates ────────────────────────────────────────────────────────── */

export interface StudentCertificate {
  id: string;
  /**
   * Earned on one of this institution's courses, or elsewhere.
   *
   * The list is deliberately not institution-scoped: scoping it produced an
   * empty page for a student the table credited with a certificate, because
   * the table counts `users.certificates_earned` (global) and the page was
   * filtering to institution courses. Everything is listed and each row says
   * where it came from.
   */
  belongs_to_institution: boolean;
  certificate_number: string;
  verification_code: string;
  certificate_url: string | null;
  issue_date: string | null;
  expires_at: string | null;
  is_valid: boolean;
  is_expired: boolean;
  final_score: number | null;
  enrollment_id: string | null;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    course_type: string | null;
    level: string | null;
    instructor_name: string | null;
  } | null;
}

/* ── Calls ───────────────────────────────────────────────────────────────── */

const base = (institutionId: string, studentId: string) =>
  `/institution-admin/${institutionId}/students/${studentId}`;

/**
 * The Authorization header, explicitly.
 *
 * `api`'s request interceptor reads the token from the `bwenge_token` cookie
 * and nothing else. A session restored into Redux but not back into that
 * cookie would therefore send these calls unauthenticated — the same split
 * between the two session stores that left this page's parent showing a
 * skeleton forever (AUTH-001). The caller already has the resolved token, so
 * it is passed down rather than rediscovered here.
 */
const auth = (token?: string | null) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

/**
 * The shared header. Its own call, so each page renders its chrome at once
 * and pays only for the list it is actually about — the progress tree walks
 * every module and lesson of every course, and the certificates page should
 * not wait for that.
 */
export async function fetchStudentOverview(
  institutionId: string,
  studentId: string,
  token?: string | null
): Promise<StudentOverview> {
  const res = await api.get(`${base(institutionId, studentId)}/overview`, auth(token));
  return res.data?.data as StudentOverview;
}

export async function fetchStudentCourses(
  institutionId: string,
  studentId: string,
  token?: string | null
): Promise<StudentEnrollment[]> {
  const res = await api.get(`${base(institutionId, studentId)}/courses`, auth(token));
  return (res.data?.data?.courses ?? []) as StudentEnrollment[];
}

export async function fetchStudentProgress(
  institutionId: string,
  studentId: string,
  token?: string | null
): Promise<StudentProgressPayload> {
  const res = await api.get(`${base(institutionId, studentId)}/progress`, auth(token));
  return {
    courses: res.data?.data?.courses ?? [],
    assessment_attempts: res.data?.data?.assessment_attempts ?? [],
  };
}

export async function fetchStudentCertificates(
  institutionId: string,
  studentId: string,
  token?: string | null
): Promise<StudentCertificate[]> {
  const res = await api.get(`${base(institutionId, studentId)}/certificates`, auth(token));
  return (res.data?.data?.certificates ?? []) as StudentCertificate[];
}

/* ── Formatting ──────────────────────────────────────────────────────────── */

/**
 * Minutes as an administrator reads them.
 *
 * Returns the em dash for nothing recorded rather than "0m", because a course
 * with no tracked time and a course genuinely studied for zero minutes are
 * different facts and the difference matters on this page.
 */
export function formatDuration(
  minutes: number | null | undefined,
  fallback = "—"
): string {
  if (minutes === null || minutes === undefined) return fallback;
  const total = Math.round(Number(minutes));
  if (!Number.isFinite(total) || total <= 0) return fallback;
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatSeconds(
  seconds: number | null | undefined,
  fallback = "—"
): string {
  if (seconds === null || seconds === undefined) return fallback;
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return fallback;
  if (total < 60) return `${Math.round(total)}s`;
  return formatDuration(Math.round(total / 60), fallback);
}

export function formatDate(
  value: string | null | undefined,
  fallback = "—"
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  value: string | null | undefined,
  fallback = "—"
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A percentage, or the em dash when there is nothing to report. */
export function formatPercent(
  value: number | null | undefined,
  fallback = "—"
): string {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return `${Math.round(parsed)}%`;
}

/** The lifecycle of an enrollment, as one word plus a colour. */
export function enrollmentState(enrollment: {
  status: string | null;
  completion_date: string | null;
  progress_percentage: number;
}): { label: string; tone: "success" | "primary" | "muted" | "warning" } {
  if (enrollment.completion_date || enrollment.status === "COMPLETED") {
    return { label: "Completed", tone: "success" };
  }
  if (enrollment.status === "SUSPENDED" || enrollment.status === "DROPPED") {
    return { label: enrollment.status === "DROPPED" ? "Dropped" : "Suspended", tone: "warning" };
  }
  if (Number(enrollment.progress_percentage) > 0) {
    return { label: "In progress", tone: "primary" };
  }
  return { label: "Not started", tone: "muted" };
}
