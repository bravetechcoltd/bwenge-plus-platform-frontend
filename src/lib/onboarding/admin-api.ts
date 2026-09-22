import Cookies from "js-cookie"

import type {
  OnboardingProfileField,
  OnboardingQuestionType,
} from "@/lib/onboarding/api"

/**
 * ============================================================================
 * Onboarding questionnaire — administration client
 * ============================================================================
 *
 * The learner-facing client next door reads the published questionnaire. This
 * one reads and writes the whole of it, including what is retired, and is the
 * only caller of the `/admin` routes.
 *
 * Kept separate rather than added to `api.ts` deliberately: that module is
 * imported by the registration page, which is public, and a public bundle has
 * no business carrying the shape of the administration API.
 */

export interface AdminOption {
  id: string
  question_id: string
  title: string
  description: string | null
  value: string
  icon: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
  /** How many people have chosen it. Retiring is a decision; this informs it. */
  response_count: number
}

export interface AdminQuestion {
  id: string
  title: string
  description: string | null
  type: OnboardingQuestionType
  profile_field: OnboardingProfileField
  required: boolean
  min_selections: number
  max_selections: number | null
  display_order: number
  is_active: boolean
  options: AdminOption[]
  response_count: number
}

export interface AdminQuestionnaire {
  questions: AdminQuestion[]
  /** Distinct people who have answered anything, for the header. */
  respondents: number
}

/** The fields a question form submits. */
export interface QuestionDraft {
  title: string
  description: string | null
  type: OnboardingQuestionType
  profile_field: OnboardingProfileField
  required: boolean
  min_selections: number
  max_selections: number | null
  display_order: number
  is_active: boolean
}

/** The fields an option form submits. */
export interface OptionDraft {
  question_id?: string
  title: string
  description: string | null
  value: string
  icon: string | null
  display_order: number
  is_active: boolean
}

const base = () => process.env.NEXT_PUBLIC_API_URL

function headers(): Record<string, string> {
  const token = Cookies.get("bwenge_token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    // The server's message names the rule that was broken — "this is the only
    // live question", "the maximum cannot be lower than the minimum" — which
    // is the sentence worth showing. A status code is not.
    throw new Error(json?.message || `Request failed (${res.status})`)
  }
  return json.data as T
}

export const onboardingAdminApi = {
  /** Everything, retired included. */
  list: async (): Promise<AdminQuestionnaire> => {
    const res = await fetch(`${base()}/onboarding/admin/questions`, {
      headers: headers(),
      cache: "no-store",
    })
    const data = await unwrap<{ questions: AdminQuestion[]; respondents?: number }>(res)
    return { questions: data.questions ?? [], respondents: data.respondents ?? 0 }
  },

  saveQuestion: async (draft: QuestionDraft, id?: string): Promise<AdminQuestion> => {
    const res = await fetch(
      `${base()}/onboarding/admin/questions${id ? `/${id}` : ""}`,
      { method: id ? "PUT" : "POST", headers: headers(), body: JSON.stringify(draft) }
    )
    return unwrap<AdminQuestion>(res)
  },

  /** Deactivates. Answers already given keep pointing at it. */
  retireQuestion: async (id: string): Promise<void> => {
    const res = await fetch(`${base()}/onboarding/admin/questions/${id}`, {
      method: "DELETE",
      headers: headers(),
    })
    await unwrap(res)
  },

  saveOption: async (draft: OptionDraft, id?: string): Promise<AdminOption> => {
    const res = await fetch(
      `${base()}/onboarding/admin/options${id ? `/${id}` : ""}`,
      { method: id ? "PUT" : "POST", headers: headers(), body: JSON.stringify(draft) }
    )
    return unwrap<AdminOption>(res)
  },

  retireOption: async (id: string): Promise<void> => {
    const res = await fetch(`${base()}/onboarding/admin/options/${id}`, {
      method: "DELETE",
      headers: headers(),
    })
    await unwrap(res)
  },

  /**
   * One request for a whole list, applied in a transaction.
   *
   * `scope` is "questions", or a question id when ordering its options. Sent
   * as the full sequence rather than a moved pair, because the server assigns
   * positions from the array index and a partial order is how two rows end up
   * claiming the same place.
   */
  reorder: async (scope: string, ids: string[]): Promise<void> => {
    const res = await fetch(`${base()}/onboarding/admin/reorder`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ scope, ids }),
    })
    await unwrap(res)
  },
}

/** Moves one entry of `ids`, returning a new array. */
export function moveInList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list
  }
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * What a question's selection rules mean, as a sentence.
 *
 * The three numbers — type, minimum, maximum — interact, and an administrator
 * setting them one field at a time cannot see the result until someone
 * registers. Saying it back is cheaper than finding out later.
 */
export function describeSelection(q: {
  type: OnboardingQuestionType
  required: boolean
  min_selections: number
  max_selections: number | null
}): string {
  const optional = q.required ? "" : ", or skip it"

  if (q.type === "SINGLE") return `Pick one${optional}.`

  const { min_selections: min, max_selections: max } = q

  if (max === null) {
    return min <= 1 ? `Pick as many as apply${optional}.` : `Pick at least ${min}${optional}.`
  }
  if (min === max) return `Pick exactly ${min}${optional}.`
  if (min <= 1) return `Pick up to ${max}${optional}.`
  return `Pick between ${min} and ${max}${optional}.`
}
