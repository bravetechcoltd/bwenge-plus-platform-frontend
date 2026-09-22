import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FileUploadWithProgress } from "./FileUploadWithProgress"
import type { UploadedDocument } from "@/hooks/useDocumentUpload"

/**
 * CD-001 §4.
 *
 * The upload itself belongs to the hook; what matters here is the behaviour
 * around it — that an oversized file is refused before it costs the author an
 * upload, that a failure can be retried without re-picking the file, and that
 * removing a file actually clears it rather than only hiding it.
 */

const uploadSingle = vi.fn()
vi.mock("@/hooks/useDocumentUpload", () => ({
  useDocumentUpload: () => ({ uploadSingle }),
}))

function fileOf(name: string, bytes: number, type = "application/pdf"): File {
  const file = new File(["x"], name, { type })
  Object.defineProperty(file, "size", { value: bytes })
  return file
}

const uploaded: UploadedDocument = {
  url: "https://res.cloudinary.test/v1/handout.pdf",
  publicId: "course/handout_abc",
  fileName: "handout.pdf",
  fileSize: 2048,
  fileType: "application/pdf",
  uploadedAt: new Date().toISOString(),
}

beforeEach(() => {
  uploadSingle.mockReset()
})

function pick(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe("file upload", () => {
  it("offers a picker when there is nothing yet", () => {
    render(<FileUploadWithProgress label="Handout" value={null} onChange={() => {}} />)
    expect(screen.getByText(/choose a file/i)).toBeTruthy()
  })

  it("refuses an oversized file before uploading it", async () => {
    render(<FileUploadWithProgress maxSizeMB={5} value={null} onChange={() => {}} />)
    pick(fileOf("huge.pdf", 10 * 1024 * 1024))

    // Sending 10MB only to be refused wastes the author's upload and time.
    expect(await screen.findByText(/the limit is 5MB/i)).toBeTruthy()
    expect(uploadSingle).not.toHaveBeenCalled()
  })

  it("refuses an empty file", async () => {
    render(<FileUploadWithProgress value={null} onChange={() => {}} />)
    pick(fileOf("empty.pdf", 0))
    expect(await screen.findByText(/that file is empty/i)).toBeTruthy()
    expect(uploadSingle).not.toHaveBeenCalled()
  })

  it("uploads an acceptable file and reports the result", async () => {
    uploadSingle.mockResolvedValue(uploaded)
    const onChange = vi.fn()
    render(<FileUploadWithProgress value={null} onChange={onChange} />)
    pick(fileOf("handout.pdf", 2048))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(uploaded))
  })

  it("shows what is already uploaded when a draft is reopened", () => {
    render(<FileUploadWithProgress value={uploaded} onChange={() => {}} />)
    expect(screen.getByText("handout.pdf")).toBeTruthy()
    expect(screen.getByText(/uploaded/i)).toBeTruthy()
    // No picker: the file is there, so the actions are replace and remove.
    expect(screen.queryByText(/choose a file/i)).toBeNull()
  })

  it("clears the file on remove rather than only hiding it", () => {
    const onChange = vi.fn()
    render(<FileUploadWithProgress value={uploaded} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/remove file/i))
    // Null, not undefined: the draft must record that there is no file now.
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("lets a failed upload be retried without re-picking the file", async () => {
    uploadSingle.mockResolvedValueOnce(null)
    render(<FileUploadWithProgress value={null} onChange={() => {}} />)
    pick(fileOf("handout.pdf", 2048))

    const retry = await screen.findByRole("button", { name: /retry/i })
    uploadSingle.mockResolvedValueOnce(uploaded)
    fireEvent.click(retry)

    await waitFor(() => expect(uploadSingle).toHaveBeenCalledTimes(2))
  })

  it("opens the shared preview rather than a new tab", () => {
    const onPreview = vi.fn()
    render(<FileUploadWithProgress value={uploaded} onChange={() => {}} onPreview={onPreview} />)
    fireEvent.click(screen.getByLabelText(/preview file/i))
    expect(onPreview).toHaveBeenCalledWith(uploaded.url, uploaded.fileName, uploaded.fileType)
  })

  it("marks a required field as required", () => {
    render(<FileUploadWithProgress label="Thumbnail" required value={null} onChange={() => {}} />)
    expect(screen.getByText("Thumbnail").textContent).toContain("*")
  })
})
