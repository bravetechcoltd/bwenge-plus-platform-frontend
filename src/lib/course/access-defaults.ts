/**
 * The Access & Settings defaults for a course type (SPOC-TOGGLE-001).
 *
 * ── Why this is one function and not four copies ───────────────────────────
 *
 * The MOOC/SPOC side effects were written out by hand in four places: the
 * course-type selector in `course-details-step`, the two selectors in
 * `course-details-step-institution` (system admin and institution admin), and
 * the `?type=` arrival effect in `course-creation-wizard`. They had already
 * drifted — three of them set `is_institution_wide` on the MOOC branch and
 * none of them set it on the SPOC branch — which is part of why a SPOC course
 * opened with that switch off.
 *
 * ── The first-render gap ───────────────────────────────────────────────────
 *
 * Every one of those sites is an *event handler*. An institution admin's
 * default type is already SPOC, so no handler ever fires, and the flags stay
 * `undefined`. The toggles read `courseData.requires_approval || false`, so
 * `undefined` rendered as off even though SPOC is meant to require approval.
 * The wizards then submitted `courseData.requires_approval || false`, so the
 * course was genuinely created with it off: the display and the saved value
 * agreed, and both were wrong.
 *
 * Defaults therefore have to be data, applied to `courseData`, rather than a
 * nicer-looking fallback in the `checked` expression. `fillAccessDefaults`
 * does that, and fills only keys that are still `undefined` so it can run on
 * every render without ever overriding a switch somebody deliberately turned
 * off.
 *
 * ── A note on `is_public` ──────────────────────────────────────────────────
 *
 * SPOC keeps `is_public: false`. That is not an exception to "all switches
 * on": the row is labelled "Private Institution Course" and is checked when
 * `is_public === false`, so false is what shows it *on*. Setting it true would
 * turn that switch off and stop the course being private, which is the whole
 * meaning of SPOC.
 */

export type CourseType = "MOOC" | "SPOC"

export interface AccessDefaults {
  is_public: boolean
  requires_approval: boolean
  is_institution_wide: boolean
  is_certificate_available: boolean
}

/**
 * What the Access & Settings switches should be for a freshly chosen type.
 *
 * SPOC: every switch in the section on. A private institution course requires
 * approval, is offered to the whole institution, and certifies on completion.
 *
 * MOOC: unchanged from the previous behaviour — public and certifying, with
 * the two institution switches off. They are not rendered for a MOOC in either
 * step, so these values only matter for what gets submitted.
 */
export function accessDefaultsForCourseType(
  courseType: string | null | undefined
): AccessDefaults {
  if (String(courseType).toUpperCase() === "MOOC") {
    return {
      is_public: true,
      requires_approval: false,
      is_institution_wide: false,
      is_certificate_available: true,
    }
  }

  // SPOC, and the fallback: the institution-facing default.
  return {
    is_public: false,
    requires_approval: true,
    is_institution_wide: true,
    is_certificate_available: true,
  }
}

/** The keys this module owns, so callers cannot drift from the interface. */
const ACCESS_KEYS: (keyof AccessDefaults)[] = [
  "is_public",
  "requires_approval",
  "is_institution_wide",
  "is_certificate_available",
]

/**
 * Fill in any access flag that has not been decided yet.
 *
 * Returns the same object when there is nothing to fill, so it is safe to call
 * from a `setCourseData` updater without causing a render loop.
 *
 * Only `undefined` is filled. A flag the user switched off is `false`, which is
 * a decision, and this leaves it alone.
 */
export function fillAccessDefaults<T extends Record<string, unknown>>(
  courseData: T
): T {
  const defaults = accessDefaultsForCourseType(
    courseData.course_type as string | null | undefined
  )

  const missing = ACCESS_KEYS.filter((key) => courseData[key] === undefined)
  if (missing.length === 0) return courseData

  const filled: Record<string, unknown> = { ...courseData }
  for (const key of missing) filled[key] = defaults[key]
  return filled as T
}

/**
 * How a switch should read when its value has not been decided yet.
 *
 * Used by the `checked` expressions so the first render agrees with the
 * default that `fillAccessDefaults` is about to write. Without it there is one
 * frame where SPOC's switches are off.
 */
export function toggleChecked(
  value: boolean | null | undefined,
  fallback: boolean
): boolean {
  return value === undefined || value === null ? fallback : Boolean(value)
}
