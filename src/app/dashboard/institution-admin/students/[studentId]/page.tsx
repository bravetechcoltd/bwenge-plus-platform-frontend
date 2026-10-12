import { redirect } from "next/navigation"

/**
 * The student's landing route (ISTU-001).
 *
 * There is no "overview" page: the header in the layout already is the
 * overview, so landing here means landing on the first of the three real
 * lists. Courses is that one — it is the cheapest to load and the question an
 * administrator opening a student almost always has first.
 */
export default async function StudentIndexPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  redirect(`/dashboard/institution-admin/students/${studentId}/courses`)
}
