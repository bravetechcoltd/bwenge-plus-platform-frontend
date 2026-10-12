import Cookies from "js-cookie"

/**
 * ============================================================================
 * Learning Space API client
 * ============================================================================
 *
 * One typed surface for every Learning Space endpoint. Two things matter here:
 *
 *  1. **Error codes are preserved.** The backend returns
 *     `{ success, code, message }` for every refusal, and the UI needs the
 *     `code` to decide between "show the lock reason", "send them to enroll"
 *     and "this is a real error" — so `LearningApiError` carries it through.
 *
 *  2. **No security decisions live here.** This module transports; it never
 *     grades, unlocks or computes progress.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL

// ── Error codes the UI branches on (backend plan Appendix B) ────────────────
export type LearningErrorCode =
  | "NOT_ENROLLED"
  | "ENROLLMENT_INACTIVE"
  | "ACCESS_EXPIRED"
  | "COURSE_NOT_AVAILABLE"
  | "MODULE_LOCKED"
  | "LESSON_LOCKED"
  | "PREREQUISITE_NOT_MET"
  | "ATTEMPT_LIMIT_REACHED"
  | "ATTEMPT_COOLDOWN"
  | "ATTEMPT_EXPIRED"
  | "ALREADY_SUBMITTED"
  | "UNKNOWN_QUESTION"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_ELIGIBLE_FOR_CERTIFICATE"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "LINK_EXPIRED"
  | "SESSION_REVOKED"
  | (string & {})

export class LearningApiError extends Error {
  readonly status: number
  readonly code: LearningErrorCode
  readonly data?: any

  constructor(status: number, code: LearningErrorCode, message: string, data?: any) {
    super(message)
    this.name = "LearningApiError"
    this.status = status
    this.code = code
    this.data = data
  }

  /** The learner is not allowed here — show the reason, not a crash. */
  get isAccessDenied() {
    return this.status === 403 || this.status === 401
  }

  /** Retrying will not help: the server made a decision. */
  get isTerminal() {
    return this.status >= 400 && this.status < 500 && this.status !== 429
  }
}

function authToken(): string | undefined {
  return Cookies.get("bwenge_token")
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: any
  token?: string
  signal?: AbortSignal
  /** Fire-and-forget: failures are swallowed (used for heartbeats). */
  silent?: boolean
  /** Request deadline. Defaults to `DEFAULT_TIMEOUT_MS`; 0 disables it. */
  timeoutMs?: number
}

/**
 * Every learning request carries a deadline.
 *
 * `fetch` has none of its own, so a connection that opens and then stalls
 * never settles — and the Learning Space has several buttons whose only
 * spinner-off signal is the promise resolving. A stalled completion left
 * "Mark complete" spinning with no error and no way back except a reload.
 */
const DEFAULT_TIMEOUT_MS = 20_000

/**
 * A 401 means this token is dead — expired, revoked, or minted for a user the
 * server will no longer accept. Clearing it is not tidiness, it is what makes
 * recovery possible at all.
 *
 * Redux hydrates `isAuthenticated` from persisted local state, which has no
 * idea the token stopped working. `/login` redirects away when it sees an
 * authenticated user. So without this, the "Sign in" button on the error
 * screen pushes to /login, /login bounces straight back to the dashboard, and
 * the learner can never re-authenticate — the session is dead and the only
 * exit is clearing site data by hand.
 *
 * `clearAuth` clears the Redux state and every persisted credential (both the
 * `bwenge_*` cookies and the `bwengeplus_*` localStorage keys), so the next
 * render and the next reload both agree the learner is signed out.
 */
let deadSessionHandled = false

async function clearDeadSession(): Promise<void> {
  // Several requests 401 together — the path and its media, typically — and
  // only the first needs to do this.
  if (deadSessionHandled) return
  deadSessionHandled = true

  try {
    const [{ store }, { clearAuth }] = await Promise.all([
      import("@/lib/store"),
      import("@/lib/features/auth/auth-slice"),
    ])
    store.dispatch(clearAuth())
  } catch {
    // Never let sign-out bookkeeping mask the original request failure; the
    // caller still gets a proper UNAUTHENTICATED error either way.
  }
}

export async function learningRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, signal, silent } = options
  const token = options.token || authToken()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers["Authorization"] = `Bearer ${token}`

  // The caller's signal and the deadline both abort the same controller, so
  // an explicit cancellation still works exactly as it did.
  const controller = new AbortController()
  let timedOut = false
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeoutMs)
      : null

  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener("abort", () => controller.abort(), { once: true })
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (networkError) {
    if (silent) return undefined as T
    // A caller-driven abort is not a failure — let it propagate so SWR and
    // the navigation guard can tell it apart from a real network problem.
    if (signal?.aborted && !timedOut) throw networkError
    throw new LearningApiError(
      0,
      timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      timedOut
        ? "That took too long to respond. Please try again."
        : "You appear to be offline. We'll retry when the connection returns."
    )
  } finally {
    if (timer) clearTimeout(timer)
  }

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    // A 401 always means "not authenticated", whatever the endpoint called it.
    //
    // `LearningErrorState` switches on this code to decide what the learner is
    // offered, and only the auth codes render "Please sign in again" with a
    // working Sign in button. Endpoints that answer 401 without a `code` used
    // to fall through to "REQUEST_FAILED" and so to a generic "Something went
    // wrong" behind a Try again button that could only 401 again. Deriving the
    // code from the status keeps that true for every endpoint, including ones
    // that have never been updated.
    const code =
      payload?.code ||
      (response.status === 401 ? "UNAUTHENTICATED" : "REQUEST_FAILED")

    // Only for requests a human is waiting on. A heartbeat is fire-and-forget,
    // and signing someone out from a background beat would drop them out of a
    // half-finished attempt with nothing on screen to explain it.
    if (response.status === 401 && !silent) void clearDeadSession()

    if (silent) return undefined as T
    throw new LearningApiError(
      response.status,
      code,
      payload?.message || "Something went wrong. Please try again.",
      payload?.data
    )
  }

  // A good response means the session is live again (a fresh sign-in, say), so
  // a later 401 gets to clear it once more.
  deadSessionHandled = false

  return (payload?.data !== undefined ? payload.data : payload) as T
}

// ============================================================================
// TYPES — mirror the backend contracts
// ============================================================================

export type StepKind = "lesson" | "assessment" | "quiz" | "module_final"
export type StepRenderType = "content" | "video" | "assessment"
export type StepState =
  | "locked"
  | "available"
  | "in_progress"
  | "pending"
  | "failed"
  | "passed"

export interface LearningStepNode {
  step_id: string
  kind: StepKind
  ref_id: string
  lesson_id: string | null
  module_id: string
  title: string
  type: StepRenderType
  duration_minutes: number | null
  state: StepState
  state_reason: string | null
  is_completed: boolean
  is_required: boolean
  score: number | null
  passing_score: number | null
  attempts: { used: number; allowed: number | null }
  index: number
  /**
   * LC-CONS-001 §18.1. Ids this activity was historically addressed by —
   * mirror quiz ids folded into their canonical assessment.
   *
   * Present on almost no step. It exists so a client holding a retired id (a
   * bookmark, a saved link, a notification payload written before the repair)
   * can still recognise which step it belongs to. Optional and additive:
   * ignoring it behaves exactly as before.
   */
  alias_ids?: string[]
}

export interface LearningModuleNode {
  id: string
  title: string
  description: string | null
  order_index: number
  state: "locked" | "available" | "completed"
  completed_steps: number
  total_steps: number
  steps: LearningStepNode[]
}

/**
 * Course-level state (LP-CONS-001 §3.6). Richer than `is_course_complete`:
 * `NO_CONTENT` is what an empty course reports instead of a silent 0%, and
 * `BLOCKED` says the learner is held up by a failed or pending activity
 * rather than simply being partway through.
 */
export type CourseProgressState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "NO_CONTENT"

/** Lesson and module roll-up state (L2 / L3). */
export type RollupState =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"

export interface LessonRollup {
  lesson_id: string
  module_id: string
  title: string
  state: RollupState
  percent: number
  completed_steps: number
  total_steps: number
  /** True when the lesson's own content activity is done. */
  content_completed: boolean
  is_required: boolean
  completed_at: string | null
  blocked_by: string | null
}

export interface ModuleRollup {
  module_id: string
  title: string
  order_index: number
  state: RollupState
  percent: number
  completed_steps: number
  total_steps: number
  total_lessons: number
  completed_lessons: number
  is_required: boolean
  completed_at: string | null
  blocked_by: string | null
}

export interface CourseRollup {
  percent: number | null
  state: CourseProgressState
  is_complete: boolean
  completed_steps: number
  total_steps: number
  completed_lessons: number
  total_lessons: number
  completed_assessments: number
  total_assessments: number
  average_score: number
  time_spent_seconds: number
  blocked_by: string | null
}

/**
 * The L2 / L3 / L4 roll-ups. **Every progress figure rendered anywhere in the
 * product comes from here** — no component computes its own, which is what
 * stops two surfaces disagreeing about the same entity.
 */
export interface LearningRollups {
  lessons: LessonRollup[]
  modules: ModuleRollup[]
  course: CourseRollup
}

/**
 * What actually changed as a result of one learner action.
 *
 * The client applies this directly instead of refetching and re-deriving —
 * which is how the sidebar, the header ring and the action bar used to end up
 * showing three different things after the same click.
 */
export interface ProgressDiff {
  course_id: string
  changed: boolean
  lessons: Array<{
    lesson_id: string
    title: string
    from: RollupState
    to: RollupState
    percent_from: number
    percent_to: number
  }>
  modules: Array<{
    module_id: string
    title: string
    from: RollupState
    to: RollupState
    percent_from: number
    percent_to: number
    completed_at?: string | null
  }>
  course: {
    percent_from: number | null
    percent_to: number | null
    state_from: CourseProgressState
    state_to: CourseProgressState
    completed_at?: string | null
  }
  /** Step ids that are currently reachable. */
  unlocked: string[]
  newly_blocked: string[]
  certificate_eligible: boolean
}

export interface LearningPath {
  course: {
    id: string
    title: string
    type: string
    status: string
    thumbnail_url: string | null
    access_expires_at: string | null
    days_remaining: number | null
    certificate_passing_score: number
  }
  summary: {
    total_steps: number
    completed_steps: number
    percent: number
    total_lessons: number
    completed_lessons: number
    total_assessments: number
    completed_assessments: number
    average_score: number
    total_time_spent_minutes: number
    current_step_id: string | null
    is_course_complete: boolean
    enrollment_status: string
    state: CourseProgressState
    /** Title of the required step holding the course back, when BLOCKED. */
    blocked_by: string | null
  }
  modules: LearningModuleNode[]
  steps: LearningStepNode[]
  rollups: LearningRollups
}

export interface MediaHandle {
  media_id: string
  kind: "VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT" | "OTHER"
  role: string
  title: string | null
  mime_type: string | null
  size_bytes: number | null
  is_external: boolean
  external_url: string | null
}

export interface LessonPayload {
  lesson: any
  media: MediaHandle[]
  step: LearningStepNode | null
  learner_state: {
    is_completed: boolean
    completion_percentage: number
    last_position_seconds: number
    watched_ranges: Array<[number, number]>
    media_duration_seconds: number | null
    engagement: Record<string, number> | null
    is_bookmarked: boolean
    notes: string | null
    time_spent_seconds: number
  }
  /**
   * The resolved learning policy for this lesson (LS-SEC-002 §7.4).
   *
   * Presentation only: the client shows the required watch percentage and
   * honours `seek_policy` in the player. The completion gate runs server-side
   * against the same resolved values, so nothing here is load-bearing.
   */
  policy?: {
    min_watch_percent: number
    seek_policy: "FREE" | "NO_SKIP_AHEAD" | "LINEAR_FIRST"
    min_scroll_percent: number
    min_interactions: number
    read_time_wpm: number
    /** LTM-001. True when the gate is the lesson's own estimated duration. */
    require_lesson_duration?: boolean
    max_duration_gate_minutes?: number
    min_dwell_seconds?: number | null
  }

  /**
   * This lesson's completion criteria, already evaluated by the server
   * (LTM-001).
   *
   * Unlike `policy`, this one *is* load-bearing — it is what the learning
   * timer counts down and what seeds the completion gate before the first
   * heartbeat. It is still the server's evaluation rather than inputs for the
   * client to redo: `required.dwell_ms` here is by construction the number
   * `POST /learning/lessons/:id/complete` will enforce.
   *
   * Optional because a deployment serving an older build of the API will not
   * send it, and the gate must fall back to the existing behaviour rather
   * than break.
   */
  evidence?: LessonEvidenceEvaluation
}

export interface SanitizedQuestion {
  id: string
  question: string
  type: string
  options: string[] | null
  points: number
  order: number
  image_url?: string | null
}

export interface AttemptSession {
  attempt_id: string
  attempt_number: number
  attempts: { used: number; allowed: number | null }
  started_at: string
  expires_at: string | null
  time_limit_minutes: number | null
  passing_score: number
  total_points: number
  title: string
  description: string | null
  questions: SanitizedQuestion[]
  draft_answers: Record<string, any> | null
  resumed: boolean
  requires_manual_grading: boolean
  /**
   * The server's clock at issue (LS-SEC-002 §9.4).
   *
   * The countdown is derived from `expires_at − server_time` rather than from
   * the device clock, so a learner whose system time is wrong still sees the
   * right remaining time. The deadline itself has always been server-owned;
   * this only fixes what the learner is *shown*.
   */
  server_time: string
  /** Resolved proctoring policy. `mode: "OFF"` means nothing is observed. */
  proctoring: ProctoringPolicy
}

/**
 * Behaviour-monitoring policy for this assessment (LS-SEC-002 Appendix A).
 *
 * Sent to the client so it can *present* the rules — the readiness screen tells
 * the learner what applies before they start (§21.3: monitoring is never
 * covert). It is never used to decide anything: the server owns the counter and
 * the verdict.
 */
export interface ProctoringPolicy {
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

// ── Camera recording (AS-CAM-001) ───────────────────────────────────────────

export interface RecordingGrant {
  recording_id: string
  chunk_index: number
  upload_url: string
  /** Signed fields Cloudinary requires alongside the file, sent verbatim. */
  upload_fields: Record<string, string>
  storage_key: string
  expires_in: number
}

export interface RecordingCompletion {
  status: "RECORDING" | "COMPLETE" | "INCOMPLETE" | "FAILED" | "DELETED"
  chunk_count: number
  gaps: Array<{ from_ms: number; to_ms: number; reason: string }>
  media_asset_id: string | null
}

export interface RecordingManifest {
  status: string
  duration_ms: number | null
  /** Milliseconds of footage per chunk. The seek unit. */
  chunk_ms: number
  gaps: Array<{ from_ms: number; to_ms: number; reason: string }>
  chunks: Array<{ index: number; elapsed_ms: number; url: string }>
}

export interface IntegrityReviewRecord {
  id: string
  attempt_id: string
  reviewer_id: string
  decision: "CLEARED" | "FLAGGED" | "UPHELD" | "INCONCLUSIVE"
  rationale: string
  evidence_seen: Record<string, unknown> | null
  created_at: string
}

export interface AttemptIntegrityDetail {
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
  scoring: Record<string, number>
  events: Array<{
    id: string
    event_type: string
    severity: string
    metadata: any
    counted: boolean
    explanation: string
    cleared_at: string | null
    cleared_reason: string | null
    created_at: string
  }>
}

export type ProctoringPresetName =
  | "NORMAL"
  | "MONITOR"
  | "PROCTORED"
  | "WARNING"
  | "STRICT"
  | "CERTIFICATION"

export interface ProctoringSettings {
  /** The policy in force after the whole cascade and the clamps. */
  resolved: ProctoringPolicy
  /**
   * The preset that describes `resolved` — the *effective* posture, which is
   * not the same as what an author set on this assessment. An assessment
   * with nothing of its own still reports the preset it inherits.
   */
  preset: ProctoringPresetName
  /**
   * What is stored at each level. `assessment: null` means "inherit".
   *
   * The read returns every scope; the write returns only `assessment`, which
   * is the one that changed. Each field is therefore optional.
   */
  stored?: {
    institution?: ProctoringPolicy | null
    course?: ProctoringPolicy | null
    module?: ProctoringPolicy | null
    assessment?: ProctoringPolicy | null
  }
}

export interface PoolReport {
  assessment_id: string
  title: string
  is_final: boolean
  bank_size: number
  retired: number
  drawable: number
  draw_count: number
  target_bank: number
  shortfall: number
  distinct_papers: number
  expected_overlap: number
  pool_draw: Record<string, number> | null
  configured: boolean
  status: "TARGET_MET" | "PARTIAL" | "TOO_SHALLOW" | "EMPTY"
  shuffle_questions?: boolean
  shuffle_options?: boolean
  time_limit_minutes?: number | null
  time_per_question_seconds?: number | null
}

export interface ItemStat {
  question_id: string
  attempts: number
  correct: number
  success_rate: number
  early_rate: number | null
  recent_rate: number | null
  delta: number | null
  flags: string[]
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH"
  retired: boolean
  note: string
  question_text?: string | null
  still_in_bank?: boolean
}

export interface AttemptResult {
  attempt_id: string
  attempt_number: number
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "EXPIRED" | "ABANDONED"
  assessment_id: string
  assessment_type: string
  title: string | null
  score: number | null
  total_points: number | null
  percentage: number | null
  passing_score: number
  passed: boolean | null
  requires_manual_grading: boolean
  score_released: boolean
  show_correct_answers: boolean
  is_late: boolean
  started_at: string
  submitted_at: string | null
  time_taken_seconds: number
  /**
   * What the learner is told about their own monitoring (G-3).
   * Counts only — the event timeline is staff-only.
   */
  integrity?: {
    recorded_events: number
    repeated_warnings: number
    auto_submitted: boolean
    auto_submit_reason: string | null
  }
  answers: Array<{
    id: string
    question_id: string
    question: any
    user_answer: any
    is_correct: boolean | null
    points_earned: number | null
    points_possible: number
    is_graded: boolean
    feedback: string | null
  }>
}

export interface AssessmentReadiness {
  assessment_id: string
  kind: "assessment" | "quiz"
  title: string
  description: string | null
  question_count: number
  total_points: number
  passing_score: number
  time_limit_minutes: number | null
  attempts: { used: number; allowed: number | null }
  /** Resolved proctoring policy, so the readiness screen can state the rules. */
  proctoring?: ProctoringPolicy
  requires_manual_grading: boolean
  show_correct_answers: boolean
  result_release: string
  state: StepState | null
  state_reason: string | null
  /** The learner has a graded, passing attempt. Terminal. */
  has_passed: boolean
  can_start: boolean
  cannot_start_reason: string | null
  has_open_attempt: boolean
  open_attempt_expires_at: string | null
  history: Array<{
    attempt_id: string
    attempt_number: number
    status: string
    score: number | null
    total_points: number | null
    percentage: number | null
    passed: boolean | null
    is_late: boolean
    started_at: string
    submitted_at: string | null
    time_taken_seconds: number
  }>
  best_percentage: number | null
}

export interface EvidenceReport {
  lesson_id: string
  can_complete: boolean
  required: Record<string, number>
  observed: Record<string, number>
  reason: string | null
  /** LTM-005. Same label the lesson payload carries. See the type below. */
  dwell_source?: 'duration' | 'required' | 'floor' | 'estimate'
  completion_percentage: number
  last_position_seconds: number
}

/**
 * The server's evaluation of a lesson's completion criteria, as the lesson
 * payload now carries it (LTM-001).
 *
 * The same `required`/`observed` pair as `EvidenceReport` and as the 422
 * `INSUFFICIENT_EVIDENCE` body, so one piece of client code reads all three.
 * It is on the payload so the learning timer knows the requirement and the
 * accumulated dwell on first render — without it the countdown has nothing to
 * count until the first heartbeat lands, and a learner returning to a
 * half-finished lesson would watch it restart from the top.
 *
 * `met` rather than `can_complete`: this is an evaluation of evidence, not a
 * permission. Locks, prerequisites and privilege are decided elsewhere.
 */
export interface LessonEvidenceEvaluation {
  met: boolean
  required: Record<string, number | boolean>
  observed: Record<string, number | boolean>
  reason: string | null
  /**
   * Where `required.dwell_ms` came from (LTM-003).
   *
   * `"duration"` is the only one the learning timer counts down.
   *
   * `"floor"` is `min_dwell_seconds`, five seconds by default — an
   * anti-instant-complete guard rather than a learning time. The timer
   * rendered it as a duration, so on any lesson with dwell already
   * accumulated it opened on its end state and never visibly counted.
   *
   * `"estimate"` is a word-count reading estimate. The number alone cannot
   * distinguish the three, which is why the server says which it is.
   */
  dwell_source?: "duration" | "required" | "floor" | "estimate"
}

// ============================================================================
// ENDPOINTS
// ============================================================================

export const learningApi = {
  // ── Path & navigation ────────────────────────────────────────────────────
  getPath: (courseId: string, signal?: AbortSignal) =>
    learningRequest<LearningPath>(`/learning/courses/${courseId}/path`, { signal }),

  getResume: (courseId: string) =>
    learningRequest<{
      step_id: string | null
      kind: StepKind | null
      ref_id: string | null
      module_id: string | null
      lesson_id: string | null
      title: string | null
      position_seconds: number
      percent: number
    }>(`/learning/courses/${courseId}/resume`),

  getContinueLearning: (limit = 3) =>
    learningRequest<any[]>(`/learning/continue?limit=${limit}`),

  /**
   * The whole Learning Space in one response.
   *
   * Same path `getPath` returns, plus a lesson payload for every lesson the
   * learner has reached and a readiness object for every activity — each one
   * byte-identical to what its own endpoint answers with, because the server
   * builds both from the same service.
   *
   * Locked steps are absent rather than refused: the client falls through to
   * the single endpoint, which enforces the lock exactly as it does today.
   */
  getBundle: (courseId: string, signal?: AbortSignal) =>
    learningRequest<{
      path: LearningPath
      lessons: Record<string, LessonPayload>
      readiness: Record<string, AssessmentReadiness>
      reachable_step_ids: string[]
    }>(`/learning/courses/${courseId}/bundle`, { signal }),

  // ── Proctoring and pools (course staff only) ─────────────────────────────
  //
  // These read and write *policy*, never verdicts. The server resolves the
  // cascade, applies the clamps and decides what a mode means; the panel
  // shows what came back and posts what an author chose. Nothing here
  // computes a policy locally, because a client that disagreed with the
  // server about what STRICT means would be a security bug, not a display bug.
  getCoursePools: (courseId: string, signal?: AbortSignal) =>
    learningRequest<{
      course_id: string
      assessments: PoolReport[]
      totals: { assessments: number; at_target: number; questions_to_write: number }
    }>(`/learning-security/courses/${courseId}/pools`, { signal }),

  getAssessmentProctoring: (assessmentId: string, signal?: AbortSignal) =>
    learningRequest<ProctoringSettings>(
      `/learning-security/assessments/${assessmentId}/proctoring`,
      { signal }
    ),

  setAssessmentProctoring: (assessmentId: string, preset: ProctoringPresetName) =>
    learningRequest<ProctoringSettings>(
      `/learning-security/assessments/${assessmentId}/proctoring`,
      { method: "PUT", body: JSON.stringify({ preset }) }
    ),

  /**
   * Camera settings for one assessment.
   *
   * Goes through the same policy endpoint as every other proctoring field, so
   * the cascade and the clamps apply identically — there is no second
   * configuration path for camera.
   */
  setAssessmentCamera: (
    assessmentId: string,
    body: { camera_mode: "OFF" | "RECORD"; camera_required: boolean }
  ) =>
    learningRequest<ProctoringSettings>(
      `/learning-security/assessments/${assessmentId}/proctoring`,
      { method: "PUT", body: JSON.stringify(body) }
    ),

  setAssessmentPool: (
    assessmentId: string,
    body: { pool_draw?: Record<string, number> | null; time_per_question_seconds?: number | null }
  ) =>
    learningRequest<PoolReport>(`/learning-security/assessments/${assessmentId}/pool`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getItemAnalysis: (assessmentId: string, signal?: AbortSignal) =>
    learningRequest<{ assessment_id: string; items: ItemStat[]; flagged: number }>(
      `/learning-security/assessments/${assessmentId}/items`,
      { signal }
    ),

  retireQuestion: (assessmentId: string, questionId: string, reason: string) =>
    learningRequest<{ message: string }>(
      `/learning-security/assessments/${assessmentId}/items/${questionId}/retire`,
      { method: "POST", body: JSON.stringify({ reason }) }
    ),

  restoreQuestion: (assessmentId: string, questionId: string) =>
    learningRequest<{ message: string }>(
      `/learning-security/assessments/${assessmentId}/items/${questionId}/restore`,
      { method: "POST" }
    ),

  // ── Camera recording, learner side (AS-CAM-001 §5.3) ─────────────────────
  //
  // Metadata only. The video itself is PUT straight to storage on the URL
  // `grantRecordingChunk` returns, so no method here ever carries a byte of
  // it — which is what keeps an hour of footage off the API's request path.
  grantRecordingChunk: (attemptId: string, chunkIndex: number, mimeType: string) =>
    learningRequest<RecordingGrant>(
      `/assessments/attempts/${attemptId}/recording/grant`,
      {
        method: "POST",
        body: JSON.stringify({ chunk_index: chunkIndex, mime_type: mimeType }),
      }
    ),

  registerRecordingChunk: (
    attemptId: string,
    body: {
      chunk_index: number
      storage_key: string
      bytes: number
      elapsed_ms: number
      duration_ms?: number
    }
  ) =>
    learningRequest<{ chunk_count: number; duplicate: boolean }>(
      `/assessments/attempts/${attemptId}/recording/chunk`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  completeRecording: (
    attemptId: string,
    body: { expected_chunks?: number; duration_ms?: number }
  ) =>
    learningRequest<RecordingCompletion>(
      `/assessments/attempts/${attemptId}/recording/complete`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  // ── Review, staff side ───────────────────────────────────────────────────
  getAttemptIntegrity: (attemptId: string, signal?: AbortSignal) =>
    learningRequest<AttemptIntegrityDetail>(
      `/learning-security/attempts/${attemptId}/integrity`,
      { signal }
    ),

  getRecordingManifest: (attemptId: string, signal?: AbortSignal) =>
    learningRequest<RecordingManifest>(
      `/learning-security/attempts/${attemptId}/recording`,
      { signal }
    ),

  getRecordingStatus: (attemptId: string, signal?: AbortSignal) =>
    learningRequest<{
      recording: {
        status: string
        chunk_count: number
        expected_chunks: number | null
        duration_ms: number | null
        gaps: Array<{ from_ms: number; to_ms: number; reason: string }>
        started_at: string
        completed_at: string | null
        retention_due_at: string | null
        deleted_at: string | null
      } | null
      reviews: IntegrityReviewRecord[]
    }>(`/learning-security/attempts/${attemptId}/recording/status`, { signal }),

  recordIntegrityDecision: (
    attemptId: string,
    body: {
      decision: IntegrityReviewRecord["decision"]
      rationale: string
      evidence_seen?: Record<string, unknown>
    }
  ) =>
    learningRequest<IntegrityReviewRecord>(
      `/learning-security/attempts/${attemptId}/review`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  getReviewQueue: (courseId: string, signal?: AbortSignal) =>
    learningRequest<{
      course_id: string
      attempts: Array<Record<string, any>>
      note: string
    }>(`/learning-security/courses/${courseId}/review-queue`, { signal }),

  // ── Lesson ───────────────────────────────────────────────────────────────
  getLesson: (lessonId: string, signal?: AbortSignal) =>
    learningRequest<LessonPayload>(`/learning/lessons/${lessonId}`, { signal }),

  /** Evidence intake. Deliberately silent: a dropped heartbeat is not an error. */
  heartbeat: (lessonId: string, evidence: Record<string, number>) =>
    learningRequest<EvidenceReport>(`/learning/lessons/${lessonId}/heartbeat`, {
      method: "POST",
      body: evidence,
      silent: true,
    }),

  /**
   * Evidence-validated completion.
   *
   * The response carries `progress_diff` — the authoritative consequence of
   * the action, computed server-side against the pre-event snapshot. The UI
   * applies it directly rather than refetching: that is what makes the step
   * icon, the module chip, the header ring and the action bar move together
   * in one render, with the server's numbers rather than a client guess.
   */
  completeLesson: (lessonId: string, evidence?: Record<string, number> | null) =>
    learningRequest<{
      lesson_id: string
      progress: any
      course: any
      progress_diff: ProgressDiff
      rollups: LearningRollups | null
    }>(`/learning/lessons/${lessonId}/complete`, {
      method: "POST",
      // The last heartbeat rides along instead of being posted first and
      // awaited — one round trip for one click. The server records it inside
      // the same learner lock, so the completion gate sees it.
      body: evidence ? { evidence } : {},
    }),

  // ── Notes & bookmarks ────────────────────────────────────────────────────
  getNotes: (lessonId: string) =>
    learningRequest<{ lesson_id: string; notes: string | null }>(
      `/learning/lessons/${lessonId}/notes`
    ),

  saveNotes: (lessonId: string, notes: string) =>
    learningRequest(`/learning/lessons/${lessonId}/notes`, {
      method: "POST",
      body: { notes },
    }),

  listCourseNotes: (courseId: string) =>
    learningRequest<any[]>(`/learning/courses/${courseId}/notes`),

  addBookmark: (lessonId: string) =>
    learningRequest(`/learning/lessons/${lessonId}/bookmark`, { method: "POST", body: {} }),

  removeBookmark: (lessonId: string) =>
    learningRequest(`/learning/lessons/${lessonId}/bookmark`, { method: "DELETE" }),

  listBookmarks: (courseId: string) =>
    learningRequest<any[]>(`/learning/courses/${courseId}/bookmarks`),

  // ── Search & recents ─────────────────────────────────────────────────────
  search: (courseId: string, query: string) =>
    learningRequest<{ query: string; results: any[]; total: number }>(
      `/learning/courses/${courseId}/search?q=${encodeURIComponent(query)}`
    ),

  getRecent: (courseId: string, limit = 5) =>
    learningRequest<any[]>(`/learning/courses/${courseId}/recent?limit=${limit}`),

  // ── Media ────────────────────────────────────────────────────────────────
  getMediaUrl: (mediaId: string) =>
    learningRequest<{
      url: string
      expires_at: string
      kind: string
      is_external: boolean
      mime_type: string | null
      title: string | null
    }>(`/media/${mediaId}/url`),

  // ── Assessments ──────────────────────────────────────────────────────────
  getReadiness: (assessmentId: string) =>
    learningRequest<AssessmentReadiness>(`/assessments/${assessmentId}/readiness`),

  openAttempt: (assessmentId: string) =>
    learningRequest<AttemptSession>(`/assessments/${assessmentId}/attempts`, {
      method: "POST",
      body: {},
    }),

  saveDraft: (attemptId: string, answers: Record<string, any>) =>
    learningRequest<{ saved_at: string; expires_at: string | null }>(
      `/assessments/attempts/${attemptId}/answers`,
      { method: "PATCH", body: { answers } }
    ),

  /**
   * Final submission. The response carries `progress_diff`: grading an
   * activity rolls the lesson, module and course up and can unlock what came
   * after it, and the diff is how the UI learns all of that in one merge.
   */
  submitAttempt: (attemptId: string, answers: Record<string, any>) =>
    learningRequest<
      AttemptResult & { progress_updated: boolean; progress_diff: ProgressDiff }
    >(`/assessments/attempts/${attemptId}/submit`, {
      method: "POST",
      body: { answers },
    }),

  getAttemptResult: (attemptId: string) =>
    learningRequest<AttemptResult>(`/assessments/attempts/${attemptId}/result`),

  getAttemptHistory: (assessmentId: string) =>
    learningRequest<{
      attempts: AssessmentReadiness["history"]
      total: number
      allowance: { used: number; allowed: number | null }
      best_percentage: number | null
    }>(`/assessments/${assessmentId}/attempts`),

  getLatestResult: (assessmentId: string) =>
    learningRequest<AttemptResult | null>(`/assessments/${assessmentId}/latest-result`),

  retakeAssessment: (assessmentId: string, courseId: string) =>
    learningRequest(`/progress/retake-assessment`, {
      method: "PUT",
      body: { assessmentId, courseId },
    }),

  // ── Certificates ─────────────────────────────────────────────────────────
  /**
   * Resolves to `null` when the learner has no certificate yet.
   *
   * The endpoint answers with `{ exists: false, data: null }` in that case —
   * a normal state, not an error — so the caller gets `null` rather than a
   * thrown 404.
   */
  checkCertificate: async (userId: string, courseId: string) => {
    const result = await learningRequest<any>(
      `/certificates/check/user/${userId}/course/${courseId}`
    )
    if (!result || result.exists === false || result.success === false) return null
    return result
  },

  /**
   * Note: `final_score` is deliberately NOT sent. The server recomputes both
   * eligibility and score at issue time and ignores any client value.
   */
  issueCertificate: (courseId: string) =>
    learningRequest<any>(`/certificates/issue`, {
      method: "POST",
      body: { course_id: courseId },
    }),

  /**
   * Kept for any caller that still reaches for it, but the certificate UI uses
   * `downloadCertificate()` from `@/components/certificate`, which owns the
   * two-step mint-then-redeem flow and its error mapping (CERT-CONS-001 §6.3).
   */
  getCertificateDownload: (certificateId: string) =>
    learningRequest<{ token: string; expires_in: number; url: string }>(
      `/certificates/${certificateId}/download-token`
    ),
}
