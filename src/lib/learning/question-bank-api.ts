import { learningRequest } from "./api"

/**
 * ============================================================================
 * Question bank, blueprint, pool health and preview (QP-001 §19)
 * ============================================================================
 *
 * A separate module from `api.ts` because every call here is staff-only.
 * Keeping them apart makes the boundary visible: nothing a learner's bundle
 * needs imports this, and a route added here cannot be reached by a
 * learner-facing hook by accident.
 *
 * `learningRequest` is reused so authentication, timeouts and the
 * `LearningApiError` shape stay identical to the rest of the client.
 */

export interface BankQuestion {
  id: string
  question: string
  question_type: string
  options: string[] | null
  correct_answer: string | null
  explanation: string | null
  points: number
  topic: string | null
  difficulty: "EASY" | "MEDIUM" | "HARD" | null
  objective: string | null
  competency: string | null
  tags: string[]
  status: "DRAFT" | "REVIEW" | "ACTIVE" | "RETIRED"
  pool_tag: string | null
  module_id: string | null
  lesson_id: string | null
  created_at: string
  updated_at: string
}

export interface BankListResponse {
  items: BankQuestion[]
  total: number
  topics: string[]
  capabilities: { exact: boolean; similarity: boolean }
}

export interface DuplicateMatch {
  id: string
  question: string
  similarity: number
  kind: "EXACT" | "SIMILAR"
}

export interface PoolHealth {
  bank_size: number
  total_questions: number
  retired_or_inactive: number
  draw_size: number
  possible_papers: number
  expected_retake_overlap: number
  probability_identical_paper: number
  add_questions_for_50pct: number
  add_questions_for_33pct: number
  topics: Record<string, number>
  difficulty: Record<string, number>
  types: Record<string, number>
  unclassified: { topic: number; difficulty: number }
  blueprint: Blueprint | null
  feasibility: Feasibility | null
}

export interface Blueprint {
  total: number
  strata: Array<{ topic: string; count: number }>
  difficulty: Record<string, number>
  types: Record<string, number>
  relaxation_order: Array<"types" | "difficulty" | "topic">
}

export interface Feasibility {
  feasible: boolean
  total_required: number
  total_available: number
  shortfalls: Array<{
    dimension: string
    key: string
    required: number
    available: number
  }>
  relax: string[]
}

export interface Relaxation {
  cell: string
  dimension: string
  reason: string
  required: number
  available: number
  restored?: string[]
}

export interface PreviewResult {
  questions: Array<{
    id: string
    question: string
    type: string
    topic: string | null
    difficulty: string | null
    points: number
  }>
  count: number
  blueprint_applied: boolean
  relaxations: Relaxation[]
  excluded_prior: string[]
  /** Always false. The preview never creates an attempt. */
  persisted: boolean
}

export interface ExposureRow {
  id: string
  question: string
  topic: string | null
  difficulty: string | null
  status: string
  times_issued: number
  times_answered: number
  times_correct: number
  /** Null until there is a large enough sample to mean anything. */
  p_value: number | null
  last_issued_at: string | null
}

const bank = (courseId: string) => `/courses/${courseId}/question-bank`

export const questionBankApi = {
  list: (courseId: string, filters: Record<string, string | number> = {}) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && `${v}` !== "") params.set(k, String(v))
    }
    const query = params.toString()
    return learningRequest<BankListResponse>(`${bank(courseId)}${query ? `?${query}` : ""}`)
  },

  create: (courseId: string, question: Partial<BankQuestion>) =>
    learningRequest<BankQuestion>(bank(courseId), {
      method: "POST",
      body: JSON.stringify(question),
    }),

  /** Bulk add: one metadata block, many questions. */
  createMany: (
    courseId: string,
    shared: Partial<BankQuestion>,
    questions: Array<Partial<BankQuestion>>
  ) =>
    learningRequest<{ created: number; items: BankQuestion[] }>(bank(courseId), {
      method: "POST",
      body: JSON.stringify({ shared, questions }),
    }),

  update: (courseId: string, questionId: string, patch: Partial<BankQuestion>) =>
    learningRequest<BankQuestion>(`${bank(courseId)}/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  retire: (courseId: string, questionId: string, restore = false) =>
    learningRequest<BankQuestion>(`${bank(courseId)}/${questionId}/retire`, {
      method: "POST",
      body: JSON.stringify({ restore }),
    }),

  checkDuplicates: (courseId: string, question: string, excludeId?: string) =>
    learningRequest<{ matches: DuplicateMatch[]; capabilities: { exact: boolean; similarity: boolean } }>(
      `${bank(courseId)}/check-duplicates`,
      { method: "POST", body: JSON.stringify({ question, exclude_id: excludeId }) }
    ),

  /**
   * Validates and imports a whole file.
   *
   * Rejects with a `LearningApiError` carrying the per-row errors when
   * anything is wrong — nothing is imported in that case, so the caller shows
   * the list and the author fixes the file once.
   */
  import: (courseId: string, rows: Array<Record<string, unknown>>) =>
    learningRequest<{
      ok: boolean
      imported: number
      errors: Array<{ row: number; field: string; message: string }>
      duplicates: Array<{ row: number; matches: DuplicateMatch[] }>
    }>(`${bank(courseId)}/import`, { method: "POST", body: JSON.stringify({ rows }) }),

  copyToAssessment: (assessmentId: string, questionIds: string[]) =>
    learningRequest<{ ok: boolean; added: number }>(
      `/assessments/${assessmentId}/questions/from-bank`,
      { method: "POST", body: JSON.stringify({ question_ids: questionIds }) }
    ),

  poolHealth: (assessmentId: string) =>
    learningRequest<PoolHealth>(`/assessments/${assessmentId}/pool-health`),

  setBlueprint: (assessmentId: string, blueprint: Blueprint | null) =>
    learningRequest<{ blueprint: Blueprint | null; warnings?: string[]; hash?: string }>(
      `/assessments/${assessmentId}/blueprint`,
      { method: "PUT", body: JSON.stringify({ blueprint }) }
    ),

  /**
   * Runs the production selection engine and discards the result.
   *
   * `previouslySeen` simulates a retake, which is the case worth previewing:
   * an instructor wants to know whether attempt 2 will actually differ, not
   * only what attempt 1 looks like.
   */
  previewGeneration: (assessmentId: string, previouslySeen: string[] = []) =>
    learningRequest<PreviewResult>(`/assessments/${assessmentId}/preview-generation`, {
      method: "POST",
      body: JSON.stringify({ previously_seen: previouslySeen }),
    }),

  exposure: (assessmentId: string) =>
    learningRequest<{ items: ExposureRow[] }>(`/assessments/${assessmentId}/exposure`),
}
