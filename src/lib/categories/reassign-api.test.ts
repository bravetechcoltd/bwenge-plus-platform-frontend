import { describe, it, expect } from "vitest"
import { pendingAssignments, UNCATEGORISED } from "./reassign-api"

/**
 * The dialog starts every row on the category it is already in, so that
 * "leave this one where it is" is a visible choice rather than the absence of
 * one. That makes the untouched rows indistinguishable from the moved ones in
 * the selection state, and this is what tells them apart before anything is
 * sent.
 */

const HERE = "cat-here"
const courses = [{ id: "a" }, { id: "b" }, { id: "c" }]

describe("pendingAssignments", () => {
  it("sends nothing when nothing was changed", () => {
    const chosen = { a: HERE, b: HERE, c: HERE }
    expect(pendingAssignments(courses, chosen, HERE)).toEqual([])
  })

  it("sends only the rows that changed", () => {
    const chosen = { a: HERE, b: "cat-other", c: HERE }
    expect(pendingAssignments(courses, chosen, HERE)).toEqual([
      { course_id: "b", category_id: "cat-other" },
    ])
  })

  it("treats uncategorised as a real move", () => {
    const chosen = { a: UNCATEGORISED, b: HERE, c: HERE }
    expect(pendingAssignments(courses, chosen, HERE)).toEqual([
      { course_id: "a", category_id: null },
    ])
  })

  it("sends every row when all of them move", () => {
    const chosen = { a: "x", b: "y", c: UNCATEGORISED }
    expect(pendingAssignments(courses, chosen, HERE)).toEqual([
      { course_id: "a", category_id: "x" },
      { course_id: "b", category_id: "y" },
      { course_id: "c", category_id: null },
    ])
  })

  it("ignores a row with no destination at all", () => {
    // Should not happen — every row is seeded — but an undefined here would
    // otherwise be sent as a move to nowhere, silently uncategorising a course
    // nobody touched.
    const chosen = { a: "x" } as Record<string, string>
    expect(pendingAssignments(courses, chosen, HERE)).toEqual([
      { course_id: "a", category_id: "x" },
    ])
  })

  it("never names one course twice", () => {
    const chosen = { a: "x", b: "x", c: "x" }
    const sent = pendingAssignments(courses, chosen, HERE)
    expect(new Set(sent.map((s) => s.course_id)).size).toBe(sent.length)
  })

  it("is empty for an empty category", () => {
    expect(pendingAssignments([], {}, HERE)).toEqual([])
  })
})
