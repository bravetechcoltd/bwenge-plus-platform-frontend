"use client"

import { useParams } from "next/navigation"
import { QuestionBankTable } from "@/components/course/assessment/question-bank-table"

/**
 * The course question bank (QP-001 §15).
 *
 * A tab on the course inside Manage Courses, not a separate application —
 * questions belong to the course they teach, and a standalone `/question-bank`
 * would be a second system to keep in step with the first.
 *
 * Authorisation is the server's: every endpoint behind this table checks
 * `requireCourseStaff`, so reaching the route without permission returns an
 * error rather than an empty screen pretending to be a permission model.
 */
export default function CourseQuestionBankRoute() {
  const params = useParams()
  const courseId = params.id as string

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Question bank
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Write questions once and reuse them across this course&apos;s assessments. A
          deeper bank is what lets a retake ask different questions.
        </p>
      </header>

      <QuestionBankTable courseId={courseId} />
    </div>
  )
}
