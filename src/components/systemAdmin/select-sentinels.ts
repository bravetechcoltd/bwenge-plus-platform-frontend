/**
 * ============================================================================
 * Standing in for "no value" inside a Select
 * ============================================================================
 *
 * Radix refuses a `<SelectItem value="">`:
 *
 *   A <Select.Item /> must have a value prop that is not an empty string.
 *   This is because the Select value can be set to an empty string to clear
 *   the selection and show the placeholder.
 *
 * The empty string is how the *Select* is told to clear itself, so an item
 * claiming it is asking the component to mean two things at once. It throws as
 * soon as the offending menu opens — which is why this only appeared when
 * switching account or role in the create-user dialog, rather than when the
 * dialog first rendered.
 *
 * These filters and pickers genuinely have an unset state, so the answer is a
 * value that is not empty and cannot collide with a real one. It is converted
 * back at the edge: nothing outside a component should ever see a sentinel.
 */

/** "No institution role", in the user form. */
export const NO_VALUE = "__none__";

/** "No filter applied", in the filter bar. */
export const ANY_VALUE = "__any__";

/** A sentinel back to the absence it represents. */
export function fromSentinel(value: string): string | undefined {
  if (value === NO_VALUE || value === ANY_VALUE || value === "") return undefined;
  return value;
}

/** An absent value to the sentinel a Select can hold. */
export function toSentinel(
  value: string | null | undefined,
  sentinel: string = ANY_VALUE
): string {
  return value === null || value === undefined || value === "" ? sentinel : value;
}
