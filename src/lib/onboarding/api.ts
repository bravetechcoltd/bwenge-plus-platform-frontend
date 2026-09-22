import Cookies from "js-cookie"

/**
 * ============================================================================
 * Onboarding questionnaire client (ONB-001)
 * ============================================================================
 *
 * The questions come from the server, not from a constant in this file. That
 * is the whole point of §6 and §19: an administrator adds a career category
 * and it appears, without a deployment.
 */

export type OnboardingQuestionType = "SINGLE" | "MULTIPLE"

export interface OnboardingOption {
  id: string
  title: string
  description: string | null
  value: string
  /** A lucide icon name, resolved by the card. */
  icon: string | null
  image_url: string | null
}

/** Where a question's answers land on the profile, decided by the server. */
export type OnboardingProfileField = "MAIN_GOALS" | "CAREER_INTERESTS" | "NONE"

export interface OnboardingQuestion {
  id: string
  title: string
  description: string | null
  type: OnboardingQuestionType
  /**
   * Presentational only here — the server decides what an answer means and
   * where it is stored. Carried so a caller can tell the career question from
   * the others without matching on its title.
   */
  profile_field: OnboardingProfileField
  required: boolean
  min_selections: number
  max_selections: number | null
  options: OnboardingOption[]
}

/** One question's answer: the option ids chosen for it. */
export interface OnboardingAnswer {
  question_id: string
  option_ids: string[]
}

export interface OnboardingProfile {
  completed: boolean
  completed_at: string | null
  career_interests: string[]
  main_goals: string[]
  responses: OnboardingAnswer[]
}

const base = () => process.env.NEXT_PUBLIC_API_URL

function authHeaders(): Record<string, string> {
  const token = Cookies.get("bwenge_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    // The server's own message where there is one: it names the question that
    // failed, which is more use than a status code.
    const detail = json?.errors?.[0] ?? json?.message
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return json.data as T
}

export const onboardingApi = {
  /**
   * The active questionnaire. Public, because it is answered during
   * registration before an account exists.
   */
  questions: async (): Promise<OnboardingQuestion[]> => {
    const res = await fetch(`${base()}/onboarding/questions`)
    const data = await unwrap<{ questions: OnboardingQuestion[] }>(res)
    return data.questions ?? []
  },

  /** The signed-in learner's own answers. */
  profile: async (): Promise<OnboardingProfile> => {
    const res = await fetch(`${base()}/onboarding/profile`, { headers: authHeaders() })
    return unwrap<OnboardingProfile>(res)
  },

  /** Save without finishing — used when someone steps away part-way (§24). */
  saveProgress: async (answers: OnboardingAnswer[]) => {
    const res = await fetch(`${base()}/onboarding/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ answers }),
    })
    return unwrap(res)
  },

  /** Save and mark complete. Rejected unless every required question is answered. */
  complete: async (answers: OnboardingAnswer[]) => {
    const res = await fetch(`${base()}/onboarding/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ answers }),
    })
    return unwrap(res)
  },

  /** Replace the saved answers — the profile editor (§26). */
  update: async (answers: OnboardingAnswer[]) => {
    const res = await fetch(`${base()}/onboarding/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ answers }),
    })
    return unwrap(res)
  },
}

/**
 * Whether a question's current selection satisfies its own rules.
 *
 * Shared by the card grid and the Next button so the message a learner reads
 * and the reason the button is disabled are the same sentence. The server
 * checks all of this again — this exists to answer immediately, not to be the
 * authority.
 */
export function validateAnswer(
  question: OnboardingQuestion,
  selected: string[]
): { valid: boolean; message: string | null } {
  const count = selected.length

  if (count === 0) {
    if (!question.required) return { valid: true, message: null }
    return {
      valid: false,
      message:
        question.type === "SINGLE"
          ? "Select an option to continue."
          : `Select at least ${question.min_selections} option${
              question.min_selections === 1 ? "" : "s"
            } to continue.`,
    }
  }

  if (count < question.min_selections) {
    return {
      valid: false,
      message: `Select at least ${question.min_selections} options to continue.`,
    }
  }

  if (question.max_selections && count > question.max_selections) {
    return {
      valid: false,
      message: `You can select up to ${question.max_selections} options.`,
    }
  }

  return { valid: true, message: null }
}
