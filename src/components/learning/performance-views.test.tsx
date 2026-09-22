import * as React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import type { AssessmentAggregate, AttemptRow, LearnerCourseRow } from "@/lib/learning/performance-api"

/**
 * ============================================================================
 * Performance tables — the states a screenshot never shows (LM-001 §18, §23)
 * ============================================================================
 *
 *   npm test
 *
 * §18 requires every table to have a loading state, an empty state, an error
 * state and a detail action, and §23 asks for those to be tested. They are the
 * states least likely to be exercised by hand: a developer with a populated
 * database sees the happy path every time and the empty one never.
 *
 * The API module is stubbed here — not to fake marks, but because these tests
 * are about what the component renders for a given response. What the server
 * actually returns is the backend suites' job (`npm run test:performance`,
 * 98 assertions against the live database), and duplicating that here would
 * assert the stub rather than the system.
 */

const api = {
  learnerCourses: vi.fn(),
  assessments: vi.fn(),
  attempts: vi.fn(),
  courses: vi.fn(),
  patterns: vi.fn(),
}

vi.mock("@/lib/learning/performance-api", async (importOriginal) => {
  // The real band labels and colours are kept: they are presentation logic
  // under test, not a dependency to replace.
  const actual = await importOriginal<typeof import("@/lib/learning/performance-api")>()
  return { ...actual, performanceApi: api }
})

// Imported after the mock so the module under test picks it up.
const { LearnerCourseTable, AssessmentPerformanceTable, AttemptsReview } = await import(
  "./performance-views"
)

const learnerCourseRow = (over: Partial<LearnerCourseRow> = {}): LearnerCourseRow => ({
  user_id: "u1",
  learner_name: "Ada Byron",
  learner_email: "ada@example.com",
  institution_name: "Kigali Institute",
  course_id: "c1",
  course_title: "Fiscal Policy",
  assessments_total: 4,
  assessments_attempted: 3,
  assessments_passed: 2,
  average_percentage: 72,
  progress_percentage: 61,
  completed: false,
  enrollment_status: "ACTIVE",
  awaiting_grading: 0,
  certificate_issued: false,
  passing_score: 60,
  enrolled_at: "2026-02-01T09:00:00.000Z",
  last_activity: "2026-03-06T14:30:00.000Z",
  band: "GOOD",
  ...over,
})

const assessmentRow = (over: Partial<AssessmentAggregate> = {}): AssessmentAggregate => ({
  assessment_id: "a1",
  assessment_title: "Midterm Paper",
  course_id: "c1",
  course_title: "Fiscal Policy",
  passing_score: 60,
  learners_attempted: 9,
  attempts_total: 14,
  average_percentage: 41,
  pass_rate: 22,
  awaiting_grading: 2,
  hardest_rank: 1,
  band: "AT_RISK",
  ...over,
})

const attemptRow = (over: Partial<AttemptRow> = {}): AttemptRow => ({
  attempt_id: "at1",
  user_id: "u1",
  learner_name: "Ada Byron",
  course_id: "c1",
  course_title: "Fiscal Policy",
  assessment_id: "a1",
  assessment_title: "Midterm Paper",
  attempt_number: 2,
  submitted_at: "2026-03-04T10:00:00.000Z",
  percentage: 68,
  passed: true,
  status: "GRADED",
  awaiting_grading: false,
  review_status: "REVIEWED",
  ...over,
})

/** Never resolves — the component stays in whatever it shows while waiting. */
const pending = () => new Promise(() => {})

beforeEach(() => {
  vi.clearAllMocks()
  api.courses.mockResolvedValue({ courses: [] })
  api.learnerCourses.mockResolvedValue({ rows: [], total: 0 })
  api.assessments.mockResolvedValue({ assessments: [] })
  api.attempts.mockResolvedValue({ attempts: [] })
})

// ── Loading ────────────────────────────────────────────────────────────────

describe("loading state", () => {
  it("shows a skeleton rather than an empty table while the request is open", () => {
    api.learnerCourses.mockImplementation(pending)
    const { container } = render(<LearnerCourseTable />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    // The distinction that matters: "we don't know yet" must not render as
    // "there is nothing", which is a different fact.
    expect(screen.queryByText(/no learners match/i)).not.toBeInTheDocument()
  })
})

// ── Empty ──────────────────────────────────────────────────────────────────

describe("empty state", () => {
  it("says there are no matching rows, and suggests why", async () => {
    render(<LearnerCourseTable />)

    expect(await screen.findByText(/no learners match these filters/i)).toBeInTheDocument()
    expect(screen.getByText(/clear a filter/i)).toBeInTheDocument()
  })

  it("distinguishes an empty queue from an empty scope", async () => {
    render(<AttemptsReview onOpen={vi.fn()} />)
    expect(await screen.findByText(/no attempts in scope/i)).toBeInTheDocument()
  })
})

// ── Error ──────────────────────────────────────────────────────────────────

describe("error state", () => {
  it("surfaces the server's message instead of an empty table", async () => {
    api.learnerCourses.mockRejectedValue(new Error("Scope refused by the server."))
    render(<LearnerCourseTable />)

    expect(await screen.findByText("Scope refused by the server.")).toBeInTheDocument()
    expect(screen.queryByText(/no learners match/i)).not.toBeInTheDocument()
  })

  it("falls back to a readable message when the failure carries none", async () => {
    api.assessments.mockRejectedValue({})
    render(<AssessmentPerformanceTable />)

    expect(
      await screen.findByText(/could not load assessment performance/i)
    ).toBeInTheDocument()
  })
})

// ── Rendered data ──────────────────────────────────────────────────────────

describe("rendered rows", () => {
  it("shows a mark with its band, and a dash where there is no mark", async () => {
    api.learnerCourses.mockResolvedValue({
      rows: [
        learnerCourseRow(),
        learnerCourseRow({
          user_id: "u2",
          learner_name: "Grace Hopper",
          average_percentage: null,
          assessments_attempted: 0,
          assessments_passed: 0,
          band: "NOT_STARTED",
        }),
      ],
      total: 2,
    })
    render(<LearnerCourseTable />)

    const table = await screen.findByRole("table")
    expect(within(table).getByText("72%")).toBeInTheDocument()
    expect(within(table).getByText("Good")).toBeInTheDocument()

    // An unattempted course reads as "—", never 0%: a learner who has not
    // started has not failed.
    expect(within(table).getByText("—")).toBeInTheDocument()
    expect(within(table).queryByText("0%")).not.toBeInTheDocument()
    expect(within(table).getByText("Not started")).toBeInTheDocument()
  })

  it("labels an ungraded attempt as awaiting rather than scoring it zero", async () => {
    api.attempts.mockResolvedValue({
      attempts: [
        attemptRow({
          percentage: null,
          passed: null,
          status: "SUBMITTED",
          awaiting_grading: true,
          review_status: "PENDING",
        }),
      ],
    })
    render(<AttemptsReview onOpen={vi.fn()} />)

    const table = await screen.findByRole("table")
    expect(within(table).getByText("—")).toBeInTheDocument()
    expect(within(table).getByText("Pending")).toBeInTheDocument()
    // The action reads "Grade" while it is unmarked, "Review" once it is.
    expect(within(table).getByRole("button", { name: "Grade" })).toBeInTheDocument()
  })

  it("names an independent learner rather than leaving the cell blank", async () => {
    api.learnerCourses.mockResolvedValue({
      rows: [learnerCourseRow({ institution_name: null })],
      total: 1,
    })
    render(<LearnerCourseTable />)
    expect(await screen.findByText("Independent")).toBeInTheDocument()
  })
})

// ── Detail action (§18) ────────────────────────────────────────────────────

describe("detail action", () => {
  it("opens the learner record from a row", async () => {
    const onOpenLearner = vi.fn()
    api.learnerCourses.mockResolvedValue({ rows: [learnerCourseRow()], total: 1 })
    render(<LearnerCourseTable onOpenLearner={onOpenLearner} />)

    const table = await screen.findByRole("table")
    within(table).getByText("Ada Byron").click()

    await waitFor(() => expect(onOpenLearner).toHaveBeenCalledWith("u1"))
  })

  it("opens an assessment into its own attempts", async () => {
    api.assessments.mockResolvedValue({ assessments: [assessmentRow()] })
    api.attempts.mockResolvedValue({ attempts: [attemptRow()] })
    render(<AssessmentPerformanceTable />)

    const table = await screen.findByRole("table")
    within(table).getByRole("button", { name: "View" }).click()

    // The drawer asks the server for that assessment only — the filter is a
    // narrowing parameter, and passing nothing would open someone else's data.
    await waitFor(() =>
      expect(api.attempts).toHaveBeenCalledWith(
        expect.objectContaining({ assessment_id: "a1" })
      )
    )

    const drawer = await screen.findByRole("dialog")
    expect(within(drawer).getByText("Midterm Paper")).toBeInTheDocument()
    expect(within(drawer).getByText(/2 awaiting grading/)).toBeInTheDocument()
    expect(await within(drawer).findByText(/Ada Byron/)).toBeInTheDocument()
  })

  it("shows the drawer's own empty state when an assessment has no attempts", async () => {
    api.assessments.mockResolvedValue({ assessments: [assessmentRow()] })
    api.attempts.mockResolvedValue({ attempts: [] })
    render(<AssessmentPerformanceTable />)

    const table = await screen.findByRole("table")
    within(table).getByRole("button", { name: "View" }).click()

    const drawer = await screen.findByRole("dialog")
    expect(
      await within(drawer).findByText(/nobody has attempted this assessment yet/i)
    ).toBeInTheDocument()
  })

  it("reports a failure inside the drawer rather than showing it as empty", async () => {
    api.assessments.mockResolvedValue({ assessments: [assessmentRow()] })
    api.attempts.mockRejectedValue(new Error("Attempts unavailable."))
    render(<AssessmentPerformanceTable />)

    const table = await screen.findByRole("table")
    within(table).getByRole("button", { name: "View" }).click()

    const drawer = await screen.findByRole("dialog")
    expect(await within(drawer).findByText("Attempts unavailable.")).toBeInTheDocument()
  })
})

// ── Responsive (§18, §23) ──────────────────────────────────────────────────

describe("responsive layout", () => {
  it("renders both a table and a card list, each hidden at the other's width", async () => {
    api.learnerCourses.mockResolvedValue({ rows: [learnerCourseRow()], total: 1 })
    const { container } = render(<LearnerCourseTable />)
    await screen.findByRole("table")

    // jsdom applies no media queries, so the assertion is on the classes that
    // drive them: the table is desktop-only and the card list mobile-only.
    // Both existing with opposite breakpoints is what makes the switch work.
    const tableWrap = container.querySelector("table")?.parentElement
    expect(tableWrap?.className).toContain("hidden")
    expect(tableWrap?.className).toContain("md:block")

    const cards = container.querySelector(".md\\:hidden")
    expect(cards).not.toBeNull()
    expect(within(cards as HTMLElement).getByText("Ada Byron")).toBeInTheDocument()
  })

  it("never pins an element wider than a phone screen", async () => {
    api.learnerCourses.mockResolvedValue({ rows: [learnerCourseRow()], total: 1 })
    const { container } = render(<LearnerCourseTable />)
    await screen.findByRole("table")

    // A fixed width above ~360px is what forces a phone to scroll sideways.
    // Narrower fixed widths are fine — the toolbar's selects are 150–170px and
    // wrap — so the assertion is on the number, not on the presence of one.
    const PHONE = 360
    const offenders = [...container.querySelectorAll("[class]")]
      .flatMap((el) => {
        const classes = el.className.toString().split(/\s+/)
        return classes
          .map((c) => /^(?:w|min-w)-\[(\d+)px\]$/.exec(c))
          .filter((m): m is RegExpExecArray => m !== null)
          .map((m) => ({ cls: m[0], px: Number(m[1]) }))
      })
      .filter((hit) => hit.px > PHONE)

    expect(offenders.map((o) => o.cls)).toEqual([])
  })
})
