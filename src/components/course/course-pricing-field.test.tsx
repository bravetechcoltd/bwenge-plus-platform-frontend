import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  CoursePricingField,
  isFreeCourse,
  pricingError,
  formatCoursePrice,
} from "./course-pricing-field"

/** CP-001: a price is never required, but a paid course must have one. */
describe("course pricing", () => {
  it("treats a course with no pricing as free", () => {
    expect(isFreeCourse({})).toBe(true)
    expect(isFreeCourse({ price: 0 })).toBe(true)
  })

  it("reads an existing paid course as paid even without the flag", () => {
    // Courses saved before `is_free` existed have only a price. Without this
    // they would open as free and be saved back that way on the next edit.
    expect(isFreeCourse({ price: 5000, currency: "RWF" })).toBe(false)
  })

  it("lets the stored flag override the amount", () => {
    expect(isFreeCourse({ is_free: true, price: 5000 })).toBe(true)
    expect(isFreeCourse({ is_free: false, price: 0 })).toBe(false)
  })

  it("asks nothing of a free course", () => {
    expect(pricingError({ is_free: true })).toBeNull()
  })

  it("requires an amount and a currency once the course is paid", () => {
    expect(pricingError({ is_free: false })).toMatch(/price greater than zero/i)
    expect(pricingError({ is_free: false, price: 0 })).toMatch(/price greater than zero/i)
    expect(pricingError({ is_free: false, price: 100 })).toMatch(/currency/i)
    expect(pricingError({ is_free: false, price: 100, currency: "RWF" })).toBeNull()
  })

  it("shows the currency the price is actually in", () => {
    expect(formatCoursePrice({ is_free: true })).toBe("FREE")
    expect(formatCoursePrice({ is_free: false, price: 5000, currency: "RWF" })).toBe("5,000 RWF")
    expect(formatCoursePrice({ is_free: false, price: 20, currency: "USD" })).toBe("20 USD")
  })

  it("hides the price input while the course is free", () => {
    render(<CoursePricingField courseData={{ is_free: true }} setCourseData={() => {}} />)
    expect(screen.queryByLabelText(/^price/i)).toBeNull()
    expect(screen.queryByLabelText(/currency/i)).toBeNull()
  })

  it("shows and requires price and currency once cost is chosen", () => {
    render(
      <CoursePricingField
        courseData={{ is_free: false, price: 100, currency: "RWF" }}
        setCourseData={() => {}}
      />
    )
    expect(screen.getByLabelText(/^price/i)).toBeRequired()
    expect(screen.getByLabelText(/currency/i)).toBeRequired()
  })

  it("offers exactly RWF and USD", () => {
    render(
      <CoursePricingField
        courseData={{ is_free: false, price: 1, currency: "RWF" }}
        setCourseData={() => {}}
      />
    )
    const options = screen.getAllByRole("option").map((o) => (o as HTMLOptionElement).value)
    expect(options).toEqual(["RWF", "USD"])
  })

  it("clears the amount when the author switches to free", () => {
    // Hiding the field is not enough: a hidden value is still submitted, and
    // would be stored against a course marked free.
    const setCourseData = vi.fn()
    render(
      <CoursePricingField
        courseData={{ is_free: false, price: 5000, currency: "USD" }}
        setCourseData={setCourseData}
      />
    )
    fireEvent.click(screen.getByRole("radio", { name: /is free course/i }))
    expect(setCourseData).toHaveBeenCalledWith(
      expect.objectContaining({ is_free: true, price: 0, currency: null })
    )
  })

  it("defaults a newly paid course to RWF rather than leaving it unset", () => {
    const setCourseData = vi.fn()
    render(<CoursePricingField courseData={{ is_free: true }} setCourseData={setCourseData} />)
    fireEvent.click(screen.getByRole("radio", { name: /course requires cost/i }))
    expect(setCourseData).toHaveBeenCalledWith(
      expect.objectContaining({ is_free: false, currency: "RWF" })
    )
  })

  it("marks the two options as a radio group", () => {
    render(<CoursePricingField courseData={{ is_free: true }} setCourseData={() => {}} />)
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(2)
    expect(radios[0].getAttribute("aria-checked")).toBe("true")
    expect(radios[1].getAttribute("aria-checked")).toBe("false")
  })
})
