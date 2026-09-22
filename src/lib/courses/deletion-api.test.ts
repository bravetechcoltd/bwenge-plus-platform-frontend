import { describe, it, expect } from "vitest"
import { summariseBulk } from "./deletion-api"

/**
 * The bulk handler this replaced counted successes and said nothing about the
 * rest: `results.filter(r => r.success).length`, then a success toast if that
 * was above zero. A selection where two of six were refused read as a clean
 * run, and the two that did not go were never named.
 */

const ok = (title: string) => ({ ok: true, title })
const no = (title: string, error?: string) => ({ ok: false, title, error })

describe("summariseBulk", () => {
  it("reports a clean run plainly", () => {
    const s = summariseBulk([ok("A"), ok("B")], "archived")
    expect(s).toEqual({ succeeded: 2, failed: 0, message: "2 courses archived." })
  })

  it("uses the singular for one", () => {
    expect(summariseBulk([ok("A")], "deleted").message).toBe("1 course deleted.")
  })

  it("names what did not go when some did", () => {
    const s = summariseBulk([ok("A"), no("B"), no("C")], "archived")
    expect(s.succeeded).toBe(1)
    expect(s.failed).toBe(2)
    expect(s.message).toContain("1 archived")
    expect(s.message).toContain("B")
    expect(s.message).toContain("C")
  })

  it("does not list more than three names", () => {
    const s = summariseBulk(
      [ok("A"), no("Alpha"), no("Beta"), no("Gamma"), no("Delta")],
      "archived"
    )
    // The count still says four; it is the list of names that is cut.
    expect(s.failed).toBe(4)
    expect(s.message).toContain("…")
    expect(s.message).toContain("Alpha")
    expect(s.message).not.toContain("Delta")
  })

  it("surfaces the server's reason when nothing succeeded", () => {
    // The sentence naming the rule is more use than "Failed to delete courses".
    const s = summariseBulk([no("A", "You don't have permission to move \"A\".")], "deleted")
    expect(s.succeeded).toBe(0)
    expect(s.message).toBe('You don\'t have permission to move "A".')
  })

  it("falls back to a sentence when a failure carried no reason", () => {
    const s = summariseBulk([no("A")], "deleted")
    expect(s.message).toBe("Nothing could be deleted.")
  })

  it("handles an empty selection without claiming anything happened", () => {
    expect(summariseBulk([], "archived")).toEqual({
      succeeded: 0,
      failed: 0,
      message: "0 courses archived.",
    })
  })
})
