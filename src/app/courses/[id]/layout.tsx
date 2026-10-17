/**
 * Metadata for this route (SEO-001).
 *
 * The page is a client component and cannot export metadata itself, so it
 * lives here. This layout renders its children unchanged.
 */
import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo/metadata"
import { findPublicCourse, courseDescription } from "@/lib/seo/public-courses"
import { JsonLd } from "@/components/seo/json-ld"
import { courseSchema, breadcrumbSchema } from "@/lib/seo/structured-data"

/**
 * Per-course metadata, from the course's own content.
 *
 * `GET /api/courses/:id` requires a session, so a single course cannot be
 * fetched while rendering for an anonymous visitor. The unauthenticated
 * discovery list carries the same title, description and thumbnail, so the
 * course is looked up there.
 *
 * A course missing from that list is private, so it gets a generic title and
 * `noIndex`: a private course must not be described in search results.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const course = await findPublicCourse(id)

  if (!course) {
    return buildMetadata({
      title: "Course",
      description:
        "This course is not publicly listed. Sign in to view it if you have access.",
      path: `/courses/${id}`,
      noIndex: true,
    })
  }

  return buildMetadata({
    title: course.title,
    description: courseDescription(course),
    path: `/courses/${course.id}`,
    image: course.thumbnail_url ?? undefined,
    imageAlt: course.title,
    type: "article",
  })
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const course = await findPublicCourse(id)

  return (
    <>
      {/*
        Server-rendered course data. The page itself is a client component, so
        without this a crawler sees no course information at all.
      */}
      <JsonLd
        data={
          course
            ? [
                courseSchema(course),
                breadcrumbSchema([
                  { name: "Home", path: "/" },
                  { name: "Courses", path: "/courses" },
                  { name: course.title, path: `/courses/${course.id}` },
                ]),
              ]
            : [
                breadcrumbSchema([
                  { name: "Home", path: "/" },
                  { name: "Courses", path: "/courses" },
                ]),
              ]
        }
      />
      {children}
    </>
  )
}
