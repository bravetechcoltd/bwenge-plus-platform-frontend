import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SmartDocumentPreview, detectFileType, getExtension } from "./SmartDocumentPreview"

/** CD-001 §4: the preview has to recognise what it is being given. */
describe("file type detection", () => {
  it("reads the extension, ignoring the query string", () => {
    // Cloudinary URLs carry one, and ".pdf?v=3" is not an extension.
    expect(getExtension("https://x.test/a/handout.pdf?v=3")).toBe("pdf")
    expect(getExtension("https://x.test/a/slide.PPTX#page=2")).toBe("pptx")
    expect(getExtension("https://x.test/a/nofile")).toBe("")
  })

  it("recognises the formats a course actually carries", () => {
    expect(detectFileType("a/thumb.png")).toBe("image")
    expect(detectFileType("a/notes.pdf")).toBe("pdf")
    expect(detectFileType("a/lesson.mp4")).toBe("video")
    expect(detectFileType("a/deck.pptx")).toBe("presentation")
    expect(detectFileType("a/marks.xlsx")).toBe("spreadsheet")
    expect(detectFileType("a/brief.docx")).toBe("document")
    expect(detectFileType("a/audio.mp3")).toBe("audio")
    expect(detectFileType("a/bundle.zip")).toBe("archive")
  })

  it("falls back to the MIME type when there is no extension", () => {
    expect(detectFileType("https://x.test/abc123", "image/png")).toBe("image")
    expect(detectFileType("https://x.test/abc123", "application/pdf")).toBe("pdf")
  })

  it("prefers the extension over the MIME type", () => {
    // Cloudinary serves plenty of files as octet-stream, which says nothing.
    expect(detectFileType("a/lesson.mp4", "application/octet-stream")).toBe("video")
  })

  it("says unknown rather than guessing", () => {
    expect(detectFileType("https://x.test/abc123")).toBe("unknown")
  })
})

describe("preview modal", () => {
  it("renders an image inline", () => {
    render(<SmartDocumentPreview url="https://x.test/a/thumb.png" fileName="thumb.png" onClose={() => {}} />)
    expect(screen.getByRole("img", { name: "thumb.png" })).toBeTruthy()
  })

  it("offers a way out for a file it cannot render", () => {
    render(<SmartDocumentPreview url="https://x.test/a/thing.bin" fileName="thing.bin" onClose={() => {}} />)
    expect(screen.getByText(/no preview available/i)).toBeTruthy()
    expect(screen.getByRole("link", { name: /open in a new tab/i })).toBeTruthy()
  })

  it("closes on Escape", () => {
    const onClose = vi.fn()
    render(<SmartDocumentPreview url="https://x.test/a/thumb.png" onClose={onClose} />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })

  it("closes on the button", () => {
    const onClose = vi.fn()
    render(<SmartDocumentPreview url="https://x.test/a/thumb.png" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText(/close preview/i))
    expect(onClose).toHaveBeenCalled()
  })

  it("is announced as a dialog", () => {
    render(<SmartDocumentPreview url="https://x.test/a/thumb.png" fileName="thumb.png" onClose={() => {}} />)
    const dialog = screen.getByRole("dialog")
    expect(dialog.getAttribute("aria-modal")).toBe("true")
    expect(dialog.getAttribute("aria-label")).toContain("thumb.png")
  })

  it("restores page scrolling when it unmounts", () => {
    const { unmount } = render(
      <SmartDocumentPreview url="https://x.test/a/thumb.png" onClose={() => {}} />
    )
    expect(document.body.style.overflow).toBe("hidden")
    unmount()
    expect(document.body.style.overflow).not.toBe("hidden")
  })
})
