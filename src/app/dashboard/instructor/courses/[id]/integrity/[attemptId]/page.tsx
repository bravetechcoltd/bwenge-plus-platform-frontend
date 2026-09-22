"use client"

import { useParams } from "next/navigation"
import { IntegrityReviewPage } from "@/components/learning/integrity-review-page"

/**
 * Attempt integrity review (AS-CAM-001 §7).
 *
 * Sits beside the existing `security` route rather than in a separate admin
 * area: reviewing an attempt and configuring the policy that produced it are
 * the same person's job, and splitting them across two applications is how a
 * reviewer ends up judging evidence without knowing what was being watched
 * for.
 *
 * Authorisation is the server's — every endpoint behind this page checks
 * `requireCourseStaff`, and reaching the URL without rights returns an error
 * rather than an empty page pretending to be a permission model.
 */
export default function AttemptIntegrityRoute() {
  const params = useParams()
  const courseId = params.id as string
  const attemptId = params.attemptId as string

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <IntegrityReviewPage courseId={courseId} attemptId={attemptId} />
    </div>
  )
}
