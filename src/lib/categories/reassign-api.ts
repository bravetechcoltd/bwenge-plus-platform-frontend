import api from "@/lib/api"

/**
 * ============================================================================
 * Emptying a category before it is deleted
 * ============================================================================
 *
 * A category holding courses cannot be deleted, which is correct — the courses
 * would be left pointing at nothing. What was missing was any way to act on
 * that: the dialog reported a count and disabled the button, so the only route
 * forward was to guess which courses were involved and edit them one at a time
 * from somewhere else.
 *
 * These two calls are what make the count actionable. One says which courses,
 * the other moves them.
 */

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | string

export interface CategoryCourse {
  id: string
  title: string
  status: CourseStatus
  course_type: string | null
  level: string | null
  thumbnail_url: string | null
  enrollment_count: number | null
  total_lessons: number | null
  institution_id: string | null
  created_at: string
  instructor?: { id: string; first_name: string | null; last_name: string | null } | null
}

export interface CategoryDestination {
  id: string
  name: string
  is_active: boolean
}

export interface CategoryCourses {
  category: { id: string; name: string }
  courses: CategoryCourse[]
  /** Where these courses may be moved. Sent with the list, not fetched after. */
  destinations: CategoryDestination[]
  total: number
}

/** One course, and where it should end up. `null` means uncategorised. */
export interface CourseAssignment {
  course_id: string
  category_id: string | null
}

function messageFrom(error: any, fallback: string): string {
  // The server names the rule that was broken — which category is retired,
  // which course the caller may not move. That sentence is the useful one.
  return error?.response?.data?.message || error?.message || fallback
}

export const categoryReassignApi = {
  /**
   * Every course filed under a category, whatever its status.
   *
   * Deliberately not the public `/courses/category/:id`, which serves the
   * catalogue: that one returns published courses the caller may enrol in, so
   * it would show fewer courses than the delete check counts and leave an
   * administrator hunting for the difference.
   */
  list: async (categoryId: string): Promise<CategoryCourses> => {
    try {
      const res = await api.get(`/categories/${categoryId}/courses`)
      if (!res.data?.success) throw new Error(res.data?.message)
      return res.data.data as CategoryCourses
    } catch (error: any) {
      throw new Error(messageFrom(error, "Could not load the courses in this category."))
    }
  },

  /**
   * Moves courses, one decision per course, in a single request.
   *
   * Sent as a batch rather than a request per row: the server applies them in
   * a transaction, so a category is either emptied or untouched. Row-at-a-time
   * would leave it half-emptied with no way to tell which half moved.
   */
  reassign: async (assignments: CourseAssignment[]): Promise<number> => {
    try {
      const res = await api.patch("/categories/courses/reassign", { assignments })
      if (!res.data?.success) throw new Error(res.data?.message)
      return Number(res.data?.data?.moved ?? assignments.length)
    } catch (error: any) {
      throw new Error(messageFrom(error, "Could not move the courses."))
    }
  },
}

/** The label shown for a chosen destination, including the uncategorised case. */
export const UNCATEGORISED = "__none__"

/**
 * The moves that are actually worth sending.
 *
 * A row the administrator did not touch still has a destination — the category
 * it is already in — and sending it would be a write that changes nothing
 * while counting towards "6 courses moved". Only the changes go.
 */
export function pendingAssignments(
  courses: Array<{ id: string }>,
  chosen: Record<string, string>,
  currentCategoryId: string
): CourseAssignment[] {
  return courses
    .filter((course) => {
      const target = chosen[course.id]
      if (!target) return false
      const resolved = target === UNCATEGORISED ? null : target
      return resolved !== currentCategoryId
    })
    .map((course) => ({
      course_id: course.id,
      category_id: chosen[course.id] === UNCATEGORISED ? null : chosen[course.id],
    }))
}
