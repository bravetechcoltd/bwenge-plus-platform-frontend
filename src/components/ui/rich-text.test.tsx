import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  RichText,
  isRichTextEmpty,
  looksLikeHtml,
  richTextToPlain,
} from "./rich-text"

/**
 * Essay answers are written in the rich text editor now, so the same field
 * holds two shapes: markup from the editor, and plain text with real newlines
 * from every answer submitted before the change. Both have to read correctly
 * to the marker, and an empty editor has to count as no answer.
 */

describe("looksLikeHtml", () => {
  it("recognises markup", () => {
    expect(looksLikeHtml("<p>Because the inverter…</p>")).toBe(true)
    expect(looksLikeHtml("a <strong>b</strong>")).toBe(true)
    expect(looksLikeHtml("<br>")).toBe(true)
  })

  it("does not mistake a comparison for a tag", () => {
    // An answer discussing `a < b` must keep its line breaks, not be parsed.
    expect(looksLikeHtml("If a < b then the current flows\nthe other way")).toBe(false)
    expect(looksLikeHtml("5 < 10 and 10 > 5")).toBe(false)
  })

  it("treats nothing as nothing", () => {
    expect(looksLikeHtml("")).toBe(false)
    expect(looksLikeHtml(null)).toBe(false)
  })
})

describe("isRichTextEmpty", () => {
  it("treats an empty editor as empty", () => {
    // What Quill stores for a field clicked into and left blank. Counted as an
    // answer it inflates "answered 5 of 5" and lets a blank paper be submitted.
    expect(isRichTextEmpty("<p><br></p>")).toBe(true)
    expect(isRichTextEmpty("<p>&nbsp;</p>")).toBe(true)
    expect(isRichTextEmpty("<p>   </p>")).toBe(true)
  })

  it("treats a real answer as an answer", () => {
    expect(isRichTextEmpty("<p>Because the inverter…</p>")).toBe(false)
    expect(isRichTextEmpty("Plain answer")).toBe(false)
  })
})

describe("richTextToPlain", () => {
  it("gives a row or a summary one line of text, not markup", () => {
    expect(richTextToPlain("<p>Because the <b>inverter</b></p>")).toBe(
      "Because the inverter"
    )
  })
})

describe("RichText", () => {
  it("renders an authored answer with its formatting intact", () => {
    const { container } = render(
      <RichText html="<p>First</p><ul><li>One</li><li>Two</li></ul>" />
    )
    expect(container.querySelectorAll("li")).toHaveLength(2)
    expect(screen.getByText("First")).toBeTruthy()
  })

  it("keeps the line breaks of an answer typed before the editor existed", () => {
    const { container } = render(<RichText html={"Line one\nLine two"} />)
    const el = container.firstElementChild as HTMLElement
    // Not fed to a parser, which would collapse the newline the learner typed.
    expect(el.className).toContain("whitespace-pre-wrap")
    expect(el.innerHTML).not.toContain("<p>")
    expect(el.textContent).toBe("Line one\nLine two")
  })

  it("renders nothing at all for an empty editor", () => {
    const { container } = render(<RichText html="<p><br></p>" />)
    expect(container.firstChild).toBeNull()
  })

  it("strips what executes", () => {
    const { container } = render(
      <RichText html={'<p>Safe</p><script>alert(1)</script><img src=x onerror="alert(1)">'} />
    )
    expect(container.innerHTML).not.toContain("<script")
    expect(container.innerHTML).not.toContain("onerror")
    expect(screen.getByText("Safe")).toBeTruthy()
  })
})

describe("size", () => {
  it("compact carries the class the stylesheet acts on", () => {
    const { container } = render(<RichText html="<p>Answer</p>" size="compact" />)
    expect((container.firstElementChild as HTMLElement).className).toContain("is-compact")
  })

  it("default does not", () => {
    const { container } = render(<RichText html="<p>Answer</p>" />)
    expect((container.firstElementChild as HTMLElement).className).not.toContain("is-compact")
  })

  it("compact applies to plain text too, so both shapes sit the same in a card", () => {
    const { container } = render(<RichText html={"Line one\nLine two"} size="compact" />)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain("whitespace-pre-wrap")
    expect(cls).toContain("text-sm")
  })
})
