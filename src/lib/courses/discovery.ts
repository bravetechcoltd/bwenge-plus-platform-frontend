"use client"

import Cookies from "js-cookie"

/**
 * ============================================================================
 * Course discovery client (CE-001 §4, §5, §6)
 * ============================================================================
 *
 * The one way the frontend searches courses.
 *
 * Every surface that searches — the navigation field on any page, `/courses`,
 * an institution catalogue — calls this, which calls the single backend
 * service. That is the whole point of §6: a learner who types "accounting" in
 * the bar and a learner who types it into the catalogue filter are asking the
 * same question and must get the same answer in the same order.
 *
 * Before this, each page filtered its own locally-fetched array with its own
 * notion of which fields count, so the three disagreed — and none of them knew
 * anything about the learner.
 *
 * ── Personalisation ────────────────────────────────────────────────────────
 *
 * The server reads the answers given at registration and orders results by how
 * well each course matches them. It never removes a result for not matching.
 * Signed out, `personalised` comes back false and this is an ordinary keyword
 * search — which is why the token is attached when present and simply omitted
 * when not.
 */

export interface DiscoveredCourse {
  id: string
  title: string
  short_description: string | null
  thumbnail_url: string | null
  level: string | null
  course_type: string
  is_public: boolean
  category: string | null
  category_name: string | null
  institution_id: string | null
  institution_name: string | null
  instructor_name: string | null
  enrollment_count: number
  average_rating: number | null
  duration_minutes: number | null
  total_lessons: number | null
  is_certificate_available: boolean
  /** 0 when nothing on the learner's profile matched. */
  match_score: number
  /** Which of their stated interests this course matched. */
  matched_interests: string[]
}

export interface DiscoveryResult {
  courses: DiscoveredCourse[]
  /** True only when the learner had answers to personalise with. */
  personalised: boolean
  interests: string[]
}

export interface DiscoveryQuery {
  search?: string
  institutionId?: string
  limit?: number
  signal?: AbortSignal
}

export const EMPTY_DISCOVERY: DiscoveryResult = {
  courses: [],
  personalised: false,
  interests: [],
}

export async function discoverCourses(query: DiscoveryQuery = {}): Promise<DiscoveryResult> {
  const params = new URLSearchParams()
  if (query.search?.trim()) params.set("search", query.search.trim())
  if (query.institutionId) params.set("institution_id", query.institutionId)
  params.set("limit", String(query.limit ?? 24))

  // Sent when there is one, omitted when there is not. The endpoint accepts
  // both; a token is what turns the search personal, never what permits it.
  const token = Cookies.get("bwenge_token")

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/course-discovery?${params.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: query.signal,
    }
  )

  if (!res.ok) throw new Error(`Course search failed (${res.status})`)

  const json = await res.json()
  if (!json?.success || !json.data) throw new Error("Course search returned no data")

  return {
    courses: Array.isArray(json.data.courses) ? json.data.courses : [],
    personalised: json.data.personalised === true,
    interests: Array.isArray(json.data.interests) ? json.data.interests : [],
  }
}

/** `finance-accounting` → `Finance Accounting`, for showing why a course ranked. */
export function interestLabel(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
