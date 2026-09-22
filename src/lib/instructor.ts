/**
 * ============================================================================
 * Instructor display — one answer to "who teaches this course?"
 * ============================================================================
 *
 * `course.instructor` can legitimately be absent. The API declares it that way
 * (`instructor?: User` in `@/types`) because a course can outlive its
 * instructor: hard-deleting a user sets `instructor_id = NULL` on every course
 * they owned, and those courses keep their enrollments.
 *
 * Individual pages then redeclared their own local `Course` interfaces with
 * `instructor: Instructor` — required, non-null. That declaration is a claim
 * about the API which is not true, and because it was made locally, `strict`
 * mode believed it: `course.instructor.id` typechecked everywhere and threw
 *
 *     Cannot read properties of null (reading 'id')
 *
 * at runtime, taking down the whole page rather than one card.
 *
 * These helpers accept the absence and answer with something renderable, so a
 * course with no instructor is a course that displays without one — not a
 * white screen where the learner's dashboard used to be.
 */

/** The loosest shape any of our endpoints hand back for an instructor. */
export interface InstructorLike {
  id?: string | null
  first_name?: string | null
  last_name?: string | null
  /** Some endpoints pre-join the name; some pages normalise to it. */
  name?: string | null
  email?: string | null
  profile_picture_url?: string | null
  avatar?: string | null
}

/** What a card or list row needs in order to render a person. */
export interface DisplayInstructor {
  id: string
  first_name: string
  last_name: string
  profile_picture_url?: string
}

/**
 * The single label for "this course has no instructor".
 *
 * There were four spellings of this in the codebase — "Unknown Instructor",
 * "No instructor", and two components that crashed instead of saying anything.
 * A learner should see the same words wherever the situation arises.
 */
export const NO_INSTRUCTOR_LABEL = "Instructor not assigned"

/** Splits a pre-joined "First Last" into parts, tolerating one-word names. */
function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return { first: "", last: "" }
  return { first: parts[0], last: parts.slice(1).join(" ") }
}

/**
 * Normalises an instructor for display, or `undefined` when there isn't one.
 *
 * `undefined` rather than a placeholder object on purpose: components already
 * guard with `{instructor && ...}` (BwengeCourseCard3D does), and that guard
 * produces a card with no instructor line — which is honest. Inventing a
 * person named "Instructor not assigned" would render a fake avatar next to a
 * fake name. Use `instructorName` where a label is genuinely required.
 */
export function resolveInstructor(
  raw: InstructorLike | null | undefined
): DisplayInstructor | undefined {
  if (!raw) return undefined

  let first = raw.first_name ?? ""
  let last = raw.last_name ?? ""

  if (!first && !last && raw.name) {
    const split = splitName(raw.name)
    first = split.first
    last = split.last
  }

  // An instructor with no id and no name is not a person we can show.
  if (!first && !last && !raw.id) return undefined

  return {
    id: raw.id ?? "",
    first_name: first,
    last_name: last,
    profile_picture_url: raw.profile_picture_url ?? raw.avatar ?? undefined,
  }
}

/**
 * A name that is always safe to render.
 *
 * Pass a `fallback` only where the surrounding copy needs different wording;
 * the default keeps every screen saying the same thing.
 */
export function instructorName(
  raw: InstructorLike | null | undefined,
  fallback: string = NO_INSTRUCTOR_LABEL
): string {
  const resolved = resolveInstructor(raw)
  if (!resolved) return fallback
  const full = `${resolved.first_name} ${resolved.last_name}`.trim()
  return full || fallback
}

/** Initials for an avatar fallback; empty string when there is no instructor. */
export function instructorInitials(raw: InstructorLike | null | undefined): string {
  const resolved = resolveInstructor(raw)
  if (!resolved) return ""
  return `${resolved.first_name[0] ?? ""}${resolved.last_name[0] ?? ""}`.toUpperCase()
}

/** The avatar URL, or undefined — never `null`, which `<img src>` dislikes. */
export function instructorAvatar(
  raw: InstructorLike | null | undefined
): string | undefined {
  return resolveInstructor(raw)?.profile_picture_url
}
