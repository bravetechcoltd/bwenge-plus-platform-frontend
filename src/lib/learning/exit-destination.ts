import { normaliseRole } from "@/app/utils/roleNavigation"

/**
 * ============================================================================
 * Where "Back" goes from learning mode (IL-001)
 * ============================================================================
 *
 * An instructor taking a course is doing the same thing a learner is — the
 * enrolment, the lessons, the assessments, the completion rules and the
 * certificate are all one workflow, and none of that changes by role. What
 * changes is where they came from.
 *
 * A learner reached the player from the public course page, so Back belongs
 * there. An instructor reached it from their own courses list, and sending
 * them to the public marketing page for a course they teach is a dead end:
 * the page offers them enrolment they already have and no route back to the
 * dashboard they were working in.
 *
 * One function, used by every Back control in the player, so the header and
 * the assessment exit cannot disagree about where "back" is.
 */

/**
 * The path a Back control should navigate to.
 *
 * Falls through to the course page for every role that is not an instructor,
 * including an unresolved one — that is the behaviour the player has always
 * had, and "I do not know who this is yet" must not send someone to a
 * dashboard they may not be able to open.
 */
export function learningExitPath(role: unknown, courseId: string): string {
  return normaliseRole(role) === "INSTRUCTOR"
    ? "/dashboard/instructor/courses"
    : `/courses/${courseId}`
}

/** The label that matches the destination, so the button does not lie. */
export function learningExitLabel(role: unknown): string {
  return normaliseRole(role) === "INSTRUCTOR" ? "Back to my courses" : "Back to course overview"
}
