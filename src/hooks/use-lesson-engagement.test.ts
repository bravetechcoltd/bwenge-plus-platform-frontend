import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

/**
 * The reading gate, on a lesson that fits on screen.
 *
 * Reported from `/courses/3c3a4761.../learn`: a 54-word lesson with nothing
 * below the fold, "Mark complete" permanently disabled, and the only guidance
 * being "scroll to the end of the lesson" on a page with no end to scroll to.
 *
 * The stored evidence for that lesson read `max_scroll_pct: 50` after five and
 * a half minutes and twenty-two heartbeats — not zero, stale. Moving between
 * lessons scrolls the window smoothly, so when the gauge re-armed for the new
 * lesson the document was still the old, taller one and the window was still
 * part-way down it. Every event the smooth scroll then fired was on the way
 * up, the gauge keeps a maximum, and once the short lesson painted there was
 * nothing left to scroll and no further event of any kind.
 */

const heartbeat = vi.fn()
vi.mock("@/lib/learning/api", () => ({
  learningApi: {
    heartbeat: (...args: unknown[]) => heartbeat(...args),
  },
}))

/** Drives ResizeObserver by hand, the way the browser drives it on reflow. */
let observers: Array<() => void> = []

class FakeResizeObserver {
  constructor(private cb: () => void) {
    observers.push(() => this.cb())
  }
  observe() {}
  disconnect() {}
}

function setPageHeight(scrollHeight: number, scrollY: number) {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: scrollHeight,
    configurable: true,
  })
  Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true })
}

/** What the next heartbeat would report. */
function reportedScrollPct(): number {
  const last = heartbeat.mock.calls[heartbeat.mock.calls.length - 1]
  return (last?.[1] as Record<string, number>)?.scroll_depth_pct
}

let useLessonEngagement: typeof import("./use-lesson-engagement").useLessonEngagement

beforeEach(async () => {
  observers = []
  heartbeat.mockReset()
  heartbeat.mockResolvedValue(null)
  vi.stubGlobal("ResizeObserver", FakeResizeObserver)
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true })
  ;({ useLessonEngagement } = await import("./use-lesson-engagement"))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("reading gate on a lesson that fits on screen", () => {
  it("reports the whole lesson read once the page turns out not to scroll", async () => {
    // Mounted mid-transition: the previous, taller lesson is still laid out
    // and the smooth scroll has not finished returning to the top.
    setPageHeight(2000, 400)

    const { result } = renderHook(() =>
      useLessonEngagement({ lessonId: "lesson-1", content: "<p>Short.</p>" })
    )

    await act(async () => {
      await result.current.flush()
    })
    // 400 of 1200 scrollable: the stale reading the learner was stuck with.
    expect(reportedScrollPct()).toBe(33)

    // The short lesson paints and the document collapses to the viewport.
    // No scroll event can fire — there is nothing left to scroll.
    setPageHeight(790, 400)
    await act(async () => {
      observers.forEach((fire) => fire())
    })

    await act(async () => {
      await result.current.flush()
    })
    expect(reportedScrollPct()).toBe(100)
  })

  it("still measures scroll depth on a lesson that does scroll", async () => {
    setPageHeight(2000, 0)

    const { result } = renderHook(() =>
      useLessonEngagement({ lessonId: "lesson-2", content: "<p>Long.</p>" })
    )

    setPageHeight(2000, 1080)
    await act(async () => {
      observers.forEach((fire) => fire())
    })
    await act(async () => {
      await result.current.flush()
    })

    // 1080 of 1200 — read, but not to the end, and the gate should say so.
    expect(reportedScrollPct()).toBe(90)
    expect(result.current.canComplete).toBe(false)
  })

  it("does not throw where ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined)
    setPageHeight(790, 0)

    const { result } = renderHook(() =>
      useLessonEngagement({ lessonId: "lesson-3", content: "<p>Short.</p>" })
    )

    await act(async () => {
      await result.current.flush()
    })
    // The mount-time measurement still stands on a page that already fits.
    expect(reportedScrollPct()).toBe(100)
  })
})
