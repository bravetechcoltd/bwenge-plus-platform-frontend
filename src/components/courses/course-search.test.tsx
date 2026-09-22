import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CourseSearch } from "./course-search"

/**
 * CE-001 §4–§6.
 *
 * The navigation search now asks the server, so what is worth testing is the
 * behaviour around that request: that it debounces, that a stale response
 * cannot overwrite a fresh one, that personalisation is shown rather than
 * applied silently, and that a failure still leaves the learner a way forward.
 */

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("js-cookie", () => ({ default: { get: () => "test-token" } }))
// The search reads auth from the store to decide whether to gate a course
// click behind the login modal. Signed in here, so clicks navigate directly.
vi.mock("react-redux", () => ({
  useSelector: () => ({ user: { id: "u1" }, isAuthenticated: true }),
  // LoginModal is rendered by the search and dispatches on submit.
  useDispatch: () => vi.fn(),
}))

function course(id: string, title: string, matched: string[] = []) {
  return {
    id,
    title,
    short_description: null,
    thumbnail_url: null,
    level: "BEGINNER",
    course_type: "MOOC",
    is_public: true,
    category: null,
    category_name: "Finance",
    institution_id: null,
    institution_name: null,
    instructor_name: "Ada Uwase",
    enrollment_count: 0,
    average_rating: null,
    duration_minutes: null,
    total_lessons: null,
    is_certificate_available: false,
    match_score: matched.length > 0 ? 2 : 0,
    matched_interests: matched,
  }
}

function reply(courses: any[], personalised = false, interests: string[] = []) {
  return {
    ok: true,
    json: async () => ({ success: true, data: { courses, personalised, interests } }),
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  push.mockClear()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function type(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } })
}

describe("catalogue search", () => {
  it("does not ask the server for a one-character query", async () => {
    render(<CourseSearch />)
    await type("a")
    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("asks once for a run of keystrokes, not once per key", async () => {
    fetchMock.mockResolvedValue(reply([course("1", "Accounting Basics")]))
    render(<CourseSearch />)

    await type("ac")
    await type("acc")
    await type("accounting")
    await vi.advanceTimersByTimeAsync(500)

    // Three keystrokes inside the debounce window are one question.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain("search=accounting")
  })

  it("sends the query to the shared discovery endpoint", async () => {
    fetchMock.mockResolvedValue(reply([]))
    render(<CourseSearch />)
    await type("policy")
    await vi.advanceTimersByTimeAsync(500)

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain("/course-discovery")
    // §6: the same service every other surface uses, not a local filter.
    expect(url).not.toContain("/courses/all")
  })

  it("scopes suggestions to an institution when given one", async () => {
    fetchMock.mockResolvedValue(reply([]))
    render(<CourseSearch institutionId="inst-7" />)
    await type("data")
    await vi.advanceTimersByTimeAsync(500)

    expect(String(fetchMock.mock.calls[0][0])).toContain("institution_id=inst-7")
  })

  it("shows results and opens the one that is clicked", async () => {
    fetchMock.mockResolvedValue(reply([course("c-9", "Accounting Basics")]))
    render(<CourseSearch />)
    await type("accounting")
    await vi.advanceTimersByTimeAsync(500)

    const option = await screen.findByText("Accounting Basics")
    fireEvent.click(option)
    expect(push).toHaveBeenCalledWith("/courses/c-9")
  })

  it("says when the order came from the learner's interests, and why", async () => {
    fetchMock.mockResolvedValue(
      reply([course("c-1", "Financial Reporting", ["finance"])], true, ["finance-accounting"])
    )
    render(<CourseSearch />)
    await type("report")
    await vi.advanceTimersByTimeAsync(500)

    // Reordering without saying so leaves a learner unable to tell a good
    // match from an arbitrary one.
    expect(await screen.findByText(/ordered by your interests/i)).toBeTruthy()
    expect(screen.getByText(/matches your interest in/i).textContent).toContain("Finance")
  })

  it("says nothing about personalisation when there was none", async () => {
    fetchMock.mockResolvedValue(reply([course("c-1", "Financial Reporting")], false))
    render(<CourseSearch />)
    await type("report")
    await vi.advanceTimersByTimeAsync(500)

    await screen.findByText("Financial Reporting")
    expect(screen.queryByText(/ordered by your interests/i)).toBeNull()
  })

  it("still offers the catalogue when the search fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"))
    render(<CourseSearch />)
    await type("accounting")
    await vi.advanceTimersByTimeAsync(500)

    // The field must never become a dead end: a failed lookup loses the
    // suggestions, not the ability to search.
    const fallback = await screen.findByText(/unavailable right now/i)
    fireEvent.click(fallback)
    expect(push).toHaveBeenCalledWith("/courses?search=accounting")
  })

  it("distinguishes a failure from an empty result", async () => {
    fetchMock.mockResolvedValue(reply([]))
    render(<CourseSearch />)
    await type("zzzzzz")
    await vi.advanceTimersByTimeAsync(500)

    expect(await screen.findByText(/no course matches/i)).toBeTruthy()
    expect(screen.queryByText(/unavailable right now/i)).toBeNull()
  })

  it("submitting takes the query to the catalogue", async () => {
    fetchMock.mockResolvedValue(reply([]))
    render(<CourseSearch />)
    await type("machine learning")
    fireEvent.submit(screen.getByRole("combobox").closest("form")!)

    expect(push).toHaveBeenCalledWith("/courses?search=machine%20learning")
  })

  it("a stale response cannot replace a newer one", async () => {
    // "acc" resolves slowly, "accounting" quickly. Without the abort, the slow
    // one lands last and the learner sees results for what they were typing
    // two keystrokes ago.
    let releaseSlow: (v: any) => void = () => {}
    const slow = new Promise((resolve) => {
      releaseSlow = resolve
    })

    fetchMock
      .mockImplementationOnce(() => slow)
      .mockImplementationOnce(() => Promise.resolve(reply([course("fresh", "Accounting Basics")])))

    render(<CourseSearch />)
    await type("acc")
    await vi.advanceTimersByTimeAsync(300)
    await type("accounting")
    await vi.advanceTimersByTimeAsync(500)

    await screen.findByText("Accounting Basics")

    releaseSlow(reply([course("stale", "Stale Result")]))
    await vi.advanceTimersByTimeAsync(100)

    await waitFor(() => {
      expect(screen.queryByText("Stale Result")).toBeNull()
    })
    expect(screen.getByText("Accounting Basics")).toBeTruthy()
  })
})
