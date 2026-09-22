import api from "@/lib/api"

/**
 * ============================================================================
 * Removing a course
 * ============================================================================
 *
 * Two operations behind one route, and the difference matters enough to be
 * named at every layer: archiving hides a course, deleting removes it and
 * everything attached to it.
 *
 * The endpoint used to do the first and report the second, which is why the
 * mode is explicit here rather than implied.
 */

export interface CourseDeletionCounts {
  modules: number
  lessons: number
  assessments: number
  enrollments: number
  certificates: number
  reviews: number
  attempts: number
  lesson_progress: number
}

export interface CourseDeletionPreview {
  course: {
    id: string
    title: string
    status: string
    category: { id: string; name: string } | null
  }
  counts: CourseDeletionCounts
  /** The two that are somebody else's, rather than the institution's. */
  irreversible: {
    learners_enrolled: number
    certificates_issued: number
  }
}

function messageFrom(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback
}

export const courseDeletionApi = {
  /** What a permanent delete would remove, so the dialog can say it first. */
  preview: async (courseId: string): Promise<CourseDeletionPreview> => {
    try {
      const res = await api.get(`/courses/${courseId}/deletion-preview`)
      if (!res.data?.success) throw new Error(res.data?.message)
      return res.data.data as CourseDeletionPreview
    } catch (error: any) {
      throw new Error(messageFrom(error, "Could not check what this course is attached to."))
    }
  },

  /**
   * Archives by default; removes with `permanent`.
   *
   * The flag is required rather than inferred, because the destructive
   * reading of "delete" should be the one someone asked for by name.
   */
  remove: async (courseId: string, permanent: boolean): Promise<void> => {
    try {
      const res = await api.delete(
        `/courses/${courseId}${permanent ? "?permanent=true" : ""}`
      )
      if (!res.data?.success) throw new Error(res.data?.message)
    } catch (error: any) {
      throw new Error(
        messageFrom(error, permanent ? "Could not delete the course." : "Could not archive the course.")
      )
    }
  },
}

/**
 * How many succeeded and what to say when some did not.
 *
 * A bulk action over N courses can partly fail — one course may be refused
 * while the rest go — and reporting only the successes leaves someone
 * believing the whole selection went.
 */
export function summariseBulk(
  results: Array<{ ok: boolean; title: string; error?: string }>,
  verb: string
): { succeeded: number; failed: number; message: string } {
  const succeeded = results.filter((r) => r.ok).length
  const failures = results.filter((r) => !r.ok)

  if (failures.length === 0) {
    return {
      succeeded,
      failed: 0,
      message: `${succeeded} course${succeeded === 1 ? "" : "s"} ${verb}.`,
    }
  }

  if (succeeded === 0) {
    return {
      succeeded: 0,
      failed: failures.length,
      message: failures[0].error || `Nothing could be ${verb}.`,
    }
  }

  return {
    succeeded,
    failed: failures.length,
    message: `${succeeded} ${verb}, ${failures.length} could not be: ${failures
      .map((f) => f.title)
      .slice(0, 3)
      .join(", ")}${failures.length > 3 ? "…" : ""}`,
  }
}
