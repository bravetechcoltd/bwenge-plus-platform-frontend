import { PUBLIC_API } from "./config"

/**
 * The public course list, for the sitemap and per-course metadata (SEO-001).
 *
 * ── Why the list endpoint and not the course endpoint ──────────────────────
 *
 * `GET /api/courses/:id` answers 401 — a single course needs a session. The
 * server has no session while rendering metadata for an anonymous visitor, so
 * fetching one course is not an option.
 *
 * `GET /api/course-discovery` is unauthenticated and returns the courses that
 * are genuinely public, each with `title`, `short_description` and
 * `thumbnail_url`. That is everything the title, description, OG image and
 * sitemap entry need, so metadata comes from the list and is looked up by id.
 *
 * It also decides indexability correctly for free: a private SPOC course is
 * absent from this list, so it never reaches the sitemap. Listing private
 * courses would publish the existence of material an institution keeps to
 * itself.
 */

export interface PublicCourse {
  id: string
  title: string
  short_description?: string | null
  thumbnail_url?: string | null
  level?: string | null
  course_type?: string | null
  category_name?: string | null
  updated_at?: string | null
}

/** Cached for an hour: the catalogue changes far more slowly than it is crawled. */
const REVALIDATE_SECONDS = 3600

/**
 * Fetch the public catalogue.
 *
 * Never throws and never rejects. A sitemap that fails the build because an
 * API was briefly unavailable is worse than a sitemap that is temporarily
 * missing its course URLs, so every failure degrades to an empty list and the
 * caller falls back to the static routes.
 */
export async function fetchPublicCourses(): Promise<PublicCourse[]> {
  try {
    const res = await fetch(`${PUBLIC_API}/course-discovery`, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return []

    const body: unknown = await res.json()
    const courses = (body as { data?: { courses?: unknown } })?.data?.courses

    if (!Array.isArray(courses)) return []

    return courses.filter(
      (c): c is PublicCourse =>
        Boolean(c) &&
        typeof c === "object" &&
        typeof (c as PublicCourse).id === "string" &&
        typeof (c as PublicCourse).title === "string"
    )
  } catch {
    return []
  }
}

/** One course by id, or null. Shares the cached list rather than refetching. */
export async function findPublicCourse(
  id: string
): Promise<PublicCourse | null> {
  if (!id) return null
  const courses = await fetchPublicCourses()
  return courses.find((c) => c.id === id) ?? null
}

/**
 * A description for a course, from its own content.
 *
 * Falls back to a sentence built from the fields that are present rather than
 * to a fixed string, so two courses without a short description still get
 * different descriptions instead of competing with each other.
 */
export function courseDescription(course: PublicCourse): string {
  const own = course.short_description?.trim()
  if (own) return own.length > 300 ? `${own.slice(0, 297).trimEnd()}…` : own

  const parts = [
    course.level ? `${course.level.toLowerCase()}-level` : null,
    course.category_name ? `${course.category_name}` : null,
  ].filter(Boolean)

  const descriptor = parts.length ? ` ${parts.join(" ")}` : ""
  return `${course.title} — a${descriptor} course on BwengePlus. Study online at your own pace and earn a verifiable certificate on completion.`
}
