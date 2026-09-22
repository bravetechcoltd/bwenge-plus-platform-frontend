import { describe, it, expect } from "vitest"
import { describeSelection, moveInList } from "./admin-api"

/**
 * The two pieces of the questionnaire admin page that decide something rather
 * than render it. `describeSelection` is what an administrator reads back
 * before saving — three fields that interact, and no way to see the result
 * until someone registers — and `moveInList` is what reorders a list before
 * the server has confirmed it.
 */

describe("describeSelection", () => {
  const single = { type: "SINGLE" as const, required: true, min_selections: 1, max_selections: 1 }
  const multi = { type: "MULTIPLE" as const, required: true, min_selections: 1, max_selections: null }

  it("describes a single-answer question", () => {
    expect(describeSelection(single)).toBe("Pick one.")
  })

  it("says when a question may be skipped", () => {
    expect(describeSelection({ ...single, required: false })).toBe("Pick one, or skip it.")
  })

  it("describes an unlimited multi-answer question", () => {
    expect(describeSelection(multi)).toBe("Pick as many as apply.")
  })

  it("describes a floor with no ceiling", () => {
    expect(describeSelection({ ...multi, min_selections: 2 })).toBe("Pick at least 2.")
  })

  it("describes a ceiling with no meaningful floor", () => {
    expect(describeSelection({ ...multi, max_selections: 5 })).toBe("Pick up to 5.")
  })

  it("describes a range", () => {
    expect(describeSelection({ ...multi, min_selections: 2, max_selections: 5 })).toBe(
      "Pick between 2 and 5."
    )
  })

  it("collapses a range whose ends meet", () => {
    // Not "between 3 and 3", which reads as a mistake in the form.
    expect(describeSelection({ ...multi, min_selections: 3, max_selections: 3 })).toBe(
      "Pick exactly 3."
    )
  })

  it("carries the optional clause through every shape", () => {
    const optional = { ...multi, required: false, min_selections: 2, max_selections: 4 }
    expect(describeSelection(optional)).toBe("Pick between 2 and 4, or skip it.")
  })
})

describe("moveInList", () => {
  const list = ["a", "b", "c", "d"]

  it("moves an entry down", () => {
    expect(moveInList(list, 0, 2)).toEqual(["b", "c", "a", "d"])
  })

  it("moves an entry up", () => {
    expect(moveInList(list, 3, 1)).toEqual(["a", "d", "b", "c"])
  })

  it("does not mutate the original", () => {
    moveInList(list, 0, 3)
    expect(list).toEqual(["a", "b", "c", "d"])
  })

  it("returns the list unchanged for a move to the same place", () => {
    expect(moveInList(list, 2, 2)).toEqual(list)
  })

  it("refuses a move off either end rather than dropping an entry", () => {
    // The buttons are disabled at the ends, but a disabled button is a UI
    // state and this is the thing that would silently lose a row.
    expect(moveInList(list, 0, -1)).toEqual(list)
    expect(moveInList(list, 3, 4)).toEqual(list)
    expect(moveInList(list, -1, 0)).toEqual(list)
  })

  it("keeps every entry", () => {
    const moved = moveInList(list, 1, 3)
    expect([...moved].sort()).toEqual([...list].sort())
  })
})
