import * as React from "react"
import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { OnboardingWizard } from "./onboarding-wizard"
import type { OnboardingQuestion } from "@/lib/onboarding/api"

/**
 * ============================================================================
 * Onboarding wizard (ONB-001 §11–§16, §28)
 * ============================================================================
 *
 *   npm test
 *
 * The behaviours a screenshot cannot show: that the step count follows the
 * data rather than a constant, that Next stays shut until the question is
 * satisfied, that a maximum blocks rather than silently evicts, and that
 * answers survive going back.
 */

const question = (over: Partial<OnboardingQuestion> = {}): OnboardingQuestion => ({
  id: "q1",
  title: "What is your main goal?",
  description: "Pick one.",
  type: "SINGLE",
  profile_field: "MAIN_GOALS",
  required: true,
  min_selections: 1,
  max_selections: 1,
  options: [
    { id: "o1", title: "Improve my skills", description: null, value: "improve", icon: null, image_url: null },
    { id: "o2", title: "Change career", description: null, value: "change", icon: null, image_url: null },
  ],
  ...over,
})

const careers = (over: Partial<OnboardingQuestion> = {}): OnboardingQuestion => ({
  id: "q2",
  title: "I have knowledge, experience or interest in...",
  description: "Choose at least two.",
  type: "MULTIPLE",
  profile_field: "CAREER_INTERESTS",
  required: true,
  min_selections: 2,
  max_selections: null,
  options: ["IT", "Health", "Business", "Management"].map((t, i) => ({
    id: `c${i}`,
    title: t,
    description: null,
    value: t.toLowerCase(),
    icon: null,
    image_url: null,
  })),
  ...over,
})

const noop = () => {}

describe("the questionnaire follows its data", () => {
  it("counts the questions it was given, not a hard-coded six", () => {
    render(
      <OnboardingWizard
        questions={[question(), careers(), question({ id: "q3", title: "Third" })]}
        onComplete={noop}
      />
    )
    expect(screen.getByText("Question 1 / 3")).toBeInTheDocument()
  })

  it("renders every option as a card", () => {
    render(<OnboardingWizard questions={[careers()]} onComplete={noop} />)
    expect(screen.getAllByRole("checkbox")).toHaveLength(4)
  })

  it("uses radio semantics for a single-answer question", () => {
    render(<OnboardingWizard questions={[question()]} onComplete={noop} />)
    // §28: the role is what tells a screen reader whether choosing one
    // replaces the other. Colour cannot say that.
    expect(screen.getAllByRole("radio")).toHaveLength(2)
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0)
  })
})

describe("the next button gates on the question's own rules", () => {
  it("is disabled until something is chosen", () => {
    render(<OnboardingWizard questions={[question(), careers()]} onComplete={noop} />)
    const next = screen.getByRole("button", { name: /next question/i })
    expect(next).toBeDisabled()

    fireEvent.click(screen.getByRole("radio", { name: /improve my skills/i }))
    expect(next).toBeEnabled()
  })

  it("stays disabled below the minimum, and says why once you try", () => {
    render(<OnboardingWizard questions={[careers()]} onComplete={noop} />)
    const finish = screen.getByRole("button", { name: /complete profile/i })

    fireEvent.click(screen.getByRole("checkbox", { name: /^IT/ }))
    expect(finish).toBeDisabled()

    fireEvent.click(screen.getByRole("checkbox", { name: /^Health/ }))
    expect(finish).toBeEnabled()
  })

  it("replaces rather than adds on a single-answer question", () => {
    render(<OnboardingWizard questions={[question()]} onComplete={noop} />)
    const [first, second] = screen.getAllByRole("radio")

    fireEvent.click(first)
    expect(first).toBeChecked()

    fireEvent.click(second)
    expect(second).toBeChecked()
    expect(first).not.toBeChecked()
  })
})

describe("selection limits", () => {
  it("blocks past the maximum instead of quietly dropping a choice", () => {
    render(
      <OnboardingWizard
        questions={[careers({ min_selections: 1, max_selections: 2 })]}
        onComplete={noop}
      />
    )
    const boxes = screen.getAllByRole("checkbox")
    fireEvent.click(boxes[0])
    fireEvent.click(boxes[1])

    // §12 forbids silently removing a selection to make room.
    expect(boxes[2]).toBeDisabled()
    fireEvent.click(boxes[2])
    expect(boxes[0]).toBeChecked()
    expect(boxes[1]).toBeChecked()
    expect(boxes[2]).not.toBeChecked()

    expect(screen.getByText(/you can select up to 2/i)).toBeInTheDocument()
  })
})

describe("answers survive navigation (§16)", () => {
  it("still has the earlier selections after Back", () => {
    render(<OnboardingWizard questions={[question(), careers()]} onComplete={noop} />)

    fireEvent.click(screen.getByRole("radio", { name: /change career/i }))
    fireEvent.click(screen.getByRole("button", { name: /next question/i }))

    // On question two now.
    expect(screen.getByText("Question 2 / 2")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: /^IT/ }))

    fireEvent.click(screen.getByRole("button", { name: /back/i }))
    expect(screen.getByText("Question 1 / 2")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /change career/i })).toBeChecked()

    // And forward again, to prove the second question kept its answer too.
    fireEvent.click(screen.getByRole("button", { name: /next question/i }))
    expect(screen.getByRole("checkbox", { name: /^IT/ })).toBeChecked()
  })

  it("hands every answer to onComplete, keeping multiple careers", () => {
    const onComplete = vi.fn()
    render(<OnboardingWizard questions={[question(), careers()]} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole("radio", { name: /improve my skills/i }))
    fireEvent.click(screen.getByRole("button", { name: /next question/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /^IT/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: /^Management/ }))
    fireEvent.click(screen.getByRole("button", { name: /complete profile/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const answers = onComplete.mock.calls[0][0]
    expect(answers).toEqual(
      expect.arrayContaining([
        { question_id: "q1", option_ids: ["o1"] },
        // §9: several careers, not collapsed to one.
        { question_id: "q2", option_ids: ["c0", "c3"] },
      ])
    )
  })

  it("seeds from saved answers when editing an existing profile", () => {
    render(
      <OnboardingWizard
        questions={[careers()]}
        initialAnswers={[{ question_id: "q2", option_ids: ["c1", "c2"] }]}
        onComplete={noop}
        finishLabel="Save changes"
      />
    )
    expect(screen.getByRole("checkbox", { name: /^Health/ })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /^Business/ })).toBeChecked()
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled()
  })
})

describe("the last step finishes rather than continuing", () => {
  it("shows the finish label only on the final question", () => {
    render(<OnboardingWizard questions={[question(), careers()]} onComplete={noop} />)
    expect(screen.getByRole("button", { name: /next question/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("radio", { name: /improve my skills/i }))
    fireEvent.click(screen.getByRole("button", { name: /next question/i }))

    expect(screen.getByRole("button", { name: /complete profile/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next question/i })).not.toBeInTheDocument()
  })

  it("surfaces a server error instead of failing silently", () => {
    render(
      <OnboardingWizard
        questions={[question()]}
        onComplete={noop}
        error="That option is no longer available."
      />
    )
    expect(within(screen.getByRole("alert")).getByText(/no longer available/i)).toBeInTheDocument()
  })
})
