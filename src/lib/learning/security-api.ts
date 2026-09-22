/**
 * ============================================================================
 * Learning Space security API client
 * ============================================================================
 *
 * LS-SEC-002 §16.1. The read side of the two findings that were write-only:
 * integrity events (LS-15) and the policy cascade (LS-22).
 *
 * Reuses `learningRequest` so error `code`s survive to the UI exactly as they
 * do everywhere else in the Learning Space.
 */

import { learningRequest } from "./api"

export type IntegritySeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH"

export interface IntegrityEvent {
  id: string
  event_type: string
  severity: IntegritySeverity
  metadata: Record<string, any> | null
  /** False for observations recorded but deliberately not counted (§11.2). */
  counted: boolean
  cleared_at: string | null
  cleared_reason: string | null
  created_at: string
}

export interface AttemptIntegrity {
  attempt: {
    id: string
    user_id: string
    assessment_id: string
    attempt_number: number
    status: string
    started_at: string
    submitted_at: string | null
    score: number | null
    percentage: number | null
    passed: boolean | null
    violation_count: number
    auto_submitted: boolean
    auto_submit_reason: string | null
    integrity_score: number
  }
  /** Returned with the events so the score's arithmetic is visible (§18.4). */
  scoring: { LOW: number; MEDIUM: number; HIGH: number; INFO: number; base: number }
  events: IntegrityEvent[]
}

export interface CourseIntegrityFeed {
  course: { id: string; title: string }
  events: Array<IntegrityEvent & { user_id: string | null; attempt_id: string | null }>
  summary: Array<{ event_type: string; severity: IntegritySeverity; n: number }>
  total: number
}

export interface ResolvedLearningPolicy {
  sequential_lessons: boolean
  sequential_modules: boolean
  allow_assessment_reopen: boolean
  final_requires_all: boolean
  min_watch_percent: number
  seek_policy: "FREE" | "NO_SKIP_AHEAD" | "LINEAR_FIRST"
  min_scroll_percent: number
  min_interactions: number
  read_time_wpm: number
  material_policy: {
    downloadable: boolean
    grant_ttl_seconds: number
    max_downloads_per_day: number | null
  }
}

export interface CoursePolicyView {
  course: { id: string; title: string }
  stored: {
    course: Record<string, any> | null
    modules: Array<{ id: string; title: string; learning_policy: any }>
    lessons: Array<{ id: string; title: string; learning_policy: any }>
    assessments: Array<{
      id: string
      title: string
      is_final_assessment: boolean
      proctoring_policy: any
      answer_release: string | null
      show_correct_answers: boolean
      shuffle_questions: boolean
      shuffle_options: boolean
      pool_draw: Record<string, number> | null
      attempt_policy: any
      time_limit_minutes: number | null
    }>
  }
  resolved: { course: ResolvedLearningPolicy }
}

// ── Assessment security (LC-CONS-001 §13.3, §19.3) ──────────────────────────

/**
 * The five presets. A preset is the unit an instructor thinks in — "this is a
 * practice quiz", "this is the certification exam" — rather than the thirteen
 * raw policy fields that made configuration effectively unreachable (P-35).
 */
export type ProctoringPreset =
  | "NORMAL"
  | "MONITOR"
  | "WARNING"
  | "STRICT"
  | "CERTIFICATION"

export interface ResolvedProctoringPolicy {
  mode: "OFF" | "MONITOR" | "STRICT"
  require_fullscreen: boolean
  monitor_visibility: boolean
  monitor_focus: boolean
  detect_second_tab: boolean
  block_copy_paste: boolean
  block_context_menu: boolean
  block_print: boolean
  grace_period_ms: number
  max_away_ms: number
  warn_at: number
  final_warn_at: number
  auto_submit_at: number | null
  late_grace_seconds: number
}

export interface AssessmentProctoringView {
  /**
   * What each scope stores. `resolved` is what actually applies — the two can
   * differ, because the platform clamps values to keep the fairness
   * guarantees true whatever an author configures.
   */
  stored: {
    institution: Record<string, any> | null
    course: Record<string, any> | null
    module: Record<string, any> | null
    assessment: Record<string, any> | null
  }
  resolved: ResolvedProctoringPolicy
  preset: ProctoringPreset
  answer_release: string | null
  show_correct_answers: boolean
  shuffle_questions: boolean
  shuffle_options: boolean
  available_presets: ProctoringPreset[]
}

export interface LearnerSession {
  id: string
  system: string
  device_info: string | null
  ip_address: string | null
  last_activity: string
  created_at: string
  expires_at: string
  is_current: boolean
}

export const learningSecurityApi = {
  // ── Integrity review (§18.3) ──────────────────────────────────────────
  getAttemptIntegrity: (attemptId: string) =>
    learningRequest<AttemptIntegrity>(
      `/learning-security/attempts/${attemptId}/integrity`
    ),

  getCourseIntegrity: (
    courseId: string,
    options: { severity?: string; eventType?: string; limit?: number } = {}
  ) => {
    const params = new URLSearchParams()
    if (options.severity) params.set("severity", options.severity)
    if (options.eventType) params.set("event_type", options.eventType)
    if (options.limit) params.set("limit", String(options.limit))
    const query = params.toString()
    return learningRequest<CourseIntegrityFeed>(
      `/learning-security/courses/${courseId}/integrity${query ? `?${query}` : ""}`
    )
  },

  getLearnerIntegrity: (courseId: string, learnerId: string, days = 90) =>
    learningRequest<any>(
      `/learning-security/courses/${courseId}/learners/${learnerId}/integrity?days=${days}`
    ),

  /** Dismisses a false positive. A reason is required and is itself audited. */
  clearIntegrityEvents: (attemptId: string, reason: string, eventId?: string) =>
    learningRequest<{ cleared: number; integrity_score: number }>(
      `/learning-security/attempts/${attemptId}/integrity/clear`,
      { method: "POST", body: { reason, event_id: eventId } }
    ),

  // ── Policy (§17.3) ────────────────────────────────────────────────────
  getCoursePolicy: (courseId: string) =>
    learningRequest<CoursePolicyView>(`/learning-security/courses/${courseId}/policy`),

  setLearningPolicy: (
    courseId: string,
    body: { scope: "course" | "module" | "lesson"; target_id?: string; learning_policy: any }
  ) =>
    learningRequest<{ resolved: ResolvedLearningPolicy }>(
      `/learning-security/courses/${courseId}/policy`,
      { method: "PUT", body }
    ),

  setAssessmentPolicy: (assessmentId: string, body: Record<string, any>) =>
    learningRequest<{ resolved: any }>(
      `/learning-security/assessments/${assessmentId}/proctoring`,
      { method: "PUT", body }
    ),

  // ── Assessment security (LC-CONS-001 §19.3, closes finding P-32) ──────
  //
  // These are the calls that were missing. The backend has exposed a policy
  // write endpoint all along; nothing in the frontend called it, which is why
  // `proctoring_policy` was NULL on 25 of 25 assessments and the entire
  // behaviour-monitoring stack sat inert. An instructor could not turn
  // assessment security on anywhere in the product.

  /** Stored policy at every scope, the resolved result, and its preset. */
  getAssessmentProctoring: (assessmentId: string) =>
    learningRequest<AssessmentProctoringView>(
      `/learning-security/assessments/${assessmentId}/proctoring`
    ),

  /**
   * A preset is sent by name and expanded server-side, so the form and the
   * platform cannot disagree about what "Strict" means. `overrides` carries
   * the advanced fields when an author has opened that disclosure.
   */
  setAssessmentProctoring: (
    assessmentId: string,
    preset: ProctoringPreset,
    overrides?: Record<string, any> | null
  ) =>
    learningRequest<{ resolved: ResolvedProctoringPolicy }>(
      `/learning-security/assessments/${assessmentId}/proctoring`,
      { method: "PUT", body: { preset, proctoring_policy: overrides ?? undefined } }
    ),

  /** Course scope — "every assessment in this course is monitored". */
  setCourseProctoring: (
    courseId: string,
    preset: ProctoringPreset,
    overrides?: Record<string, any> | null
  ) =>
    learningRequest<{ scope: string; id: string; proctoring_policy: any }>(
      `/learning-security/courses/${courseId}/proctoring`,
      { method: "PUT", body: { preset, proctoring_policy: overrides ?? undefined } }
    ),

  setModuleProctoring: (
    moduleId: string,
    preset: ProctoringPreset,
    overrides?: Record<string, any> | null
  ) =>
    learningRequest<{ scope: string; id: string; proctoring_policy: any }>(
      `/learning-security/modules/${moduleId}/proctoring`,
      { method: "PUT", body: { preset, proctoring_policy: overrides ?? undefined } }
    ),

  // ── Sessions (§13.2) ──────────────────────────────────────────────────
  getMySessions: () =>
    learningRequest<{ sessions: LearnerSession[] }>(`/learning-security/sessions`),

  revokeSession: (sessionId: string) =>
    learningRequest<void>(`/learning-security/sessions/${sessionId}`, {
      method: "DELETE",
    }),
}

/** Human-readable label for an integrity event type. */
export function describeIntegrityEvent(type: string): string {
  const labels: Record<string, string> = {
    TAB_HIDDEN: "Left the page",
    WINDOW_BLURRED: "Window lost focus",
    FULLSCREEN_EXITED: "Exited full screen",
    NAVIGATION_ATTEMPTED: "Tried to navigate away",
    SECOND_TAB_DETECTED: "Opened a second tab",
    COPY_ATTEMPTED: "Tried to copy",
    PASTE_ATTEMPTED: "Tried to paste",
    PRINT_ATTEMPTED: "Tried to print",
    AUTO_SUBMIT_TRIGGERED: "Submitted automatically by policy",
    SESSION_MISMATCH: "Used from a different session",
    ABANDONED_SUSPECTED: "Left without submitting",
    IMPLAUSIBLE_SPEED: "Submitted implausibly fast",
    ATTEMPT_CHURN: "Repeated attempts in quick succession",
    LOCKED_STEP_WRITE: "Wrote to a locked step",
    MEDIA_GRANT_ANOMALY: "Unusual media access",
    LATE_SUBMISSION: "Submitted after the deadline",
    AUTHZ_PROBE: "Requested something they cannot access",
    UNKNOWN_QUESTION_SUBMITTED: "Answered a question not issued to them",
    IMPOSSIBLE_PROGRESS_VALUE: "Reported an impossible progress value",
    DUPLICATE_SUBMISSION: "Submitted the same attempt twice",
    CERTIFICATE_INELIGIBLE_ATTEMPT: "Tried to claim a certificate early",
    // LC-CONS-001 §16.2
    IN_APP_NAVIGATION: "Left the assessment",
    ATTEMPT_REENTRY: "Returned to the attempt",
  }
  return labels[type] ?? type.replace(/_/g, " ").toLowerCase()
}

/**
 * What each preset means, in the instructor's language.
 *
 * `LS-SEC-002 §21.3` requires the learner to be told the rules before they
 * start, so the authoring form shows `learnerNotice` as a live preview. An
 * author should be able to see exactly what their choice will say to a
 * learner, rather than discovering it afterwards.
 */
export const PROCTORING_PRESET_INFO: Record<
  ProctoringPreset,
  { label: string; description: string; suitedTo: string; learnerNotice: string | null }
> = {
  NORMAL: {
    label: "Normal",
    description: "No monitoring. Nothing is observed and nothing is recorded.",
    suitedTo: "Practice quizzes and self-check activities",
    learnerNotice: null,
  },
  MONITOR: {
    label: "Monitor",
    description:
      "Behaviour is recorded and the learner is warned. The attempt is never ended automatically.",
    suitedTo: "Lesson quizzes and course assessments that count towards a grade",
    learnerNotice:
      "This assessment is monitored. Leaving the assessment window is recorded for your instructor. Your attempt will not be ended automatically.",
  },
  WARNING: {
    label: "Warning",
    description:
      "As Monitor, with a firmer escalation ladder. The attempt is still never ended automatically.",
    suitedTo: "Module final assessments",
    learnerNotice:
      "This assessment is monitored. Leaving the assessment window is recorded, and you will receive a final warning after two events. Your attempt will not be ended automatically.",
  },
  STRICT: {
    label: "Strict",
    description:
      "Full screen is required, and the attempt is submitted automatically after 3 recorded events.",
    suitedTo: "Final assessments",
    learnerNotice:
      "This assessment is monitored and runs in full screen. Leaving the assessment window is recorded. After 3 recorded events your attempt will be submitted automatically.",
  },
  CERTIFICATION: {
    label: "Certification",
    description:
      "Strict, at the tightest threshold the platform's fairness rules allow.",
    suitedTo: "Certification assessments",
    learnerNotice:
      "This assessment is monitored and runs in full screen. Leaving the assessment window is recorded, and your attempt will be submitted automatically once the limit is reached.",
  },
}
