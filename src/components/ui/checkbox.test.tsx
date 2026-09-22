import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Checkbox } from "./checkbox"

/**
 * Reported on the proctoring acknowledgement, which sits on a tinted panel:
 * the unchecked box was a 1px `border-input` edge, and `--input` is
 * `oklch(0.93 0 0)`. Against `bg-warning/[0.06]` that is not a faint control,
 * it is no control — the learner sees a stray mark and cannot tell there is
 * anything to click. The same component is every multi-select answer on the
 * assessment screens.
 *
 * Asserting class names is a blunt instrument, but the two properties that
 * make an unchecked box survive a coloured surface are exactly the two that a
 * refactor drops without noticing.
 */
describe("Checkbox", () => {
  it("carries its own background, so a tinted panel cannot swallow it", () => {
    render(<Checkbox aria-label="ack" />)
    expect(screen.getByRole("checkbox").className).toContain("bg-background")
  })

  it("has an edge heavy enough to read when unchecked", () => {
    render(<Checkbox aria-label="ack" />)
    const cls = screen.getByRole("checkbox").className
    expect(cls).toContain("border-2")
    // Tracks the theme rather than pinning one grey that only works on white.
    expect(cls).toContain("border-foreground/")
    expect(cls).not.toContain("border-input")
  })

  it("does not shrink inside a flex row", () => {
    render(<Checkbox aria-label="ack" />)
    expect(screen.getByRole("checkbox").className).toContain("shrink-0")
  })

  it("still lets a caller add classes without losing its own", () => {
    render(<Checkbox aria-label="ack" className="mt-0.5" />)
    const cls = screen.getByRole("checkbox").className
    expect(cls).toContain("mt-0.5")
    expect(cls).toContain("bg-background")
  })

  it("reads as checked to assistive technology when checked", () => {
    render(<Checkbox aria-label="ack" checked onCheckedChange={() => {}} />)
    expect(screen.getByRole("checkbox").getAttribute("data-state")).toBe("checked")
  })
})
