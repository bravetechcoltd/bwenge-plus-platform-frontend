import CoursesClient from "./courses-client"
import { SeoIntro } from "@/components/seo/seo-intro"
import { fetchPublicCourses } from "@/lib/seo/public-courses"
import { INDEXABLE_PAGES } from "@/lib/seo/config"
import { JsonLd } from "@/components/seo/json-ld"
import { courseListSchema, breadcrumbSchema } from "@/lib/seo/structured-data"

/**
 * The course catalogue (SEO-004).
 *
 * A server wrapper around the unchanged client page. Before this, the
 * catalogue — the single most valuable page on the site for search — arrived
 * as 23KB of HTML containing no course names, no course links and no
 * headings. Every one of the 27 public courses was reachable only by running
 * JavaScript.
 *
 * Now the full list is server-rendered as real links, so a crawler landing
 * here can reach every course page, and `ItemList` structured data describes
 * the collection.
 *
 * The <h1> is not painted because the client page renders its own visible
 * heading; duplicating it would be wrong for design and for accessibility.
 * The text is identical to what the page shows.
 */
export default async function Page() {
  const courses = await fetchPublicCourses()

  return (
    <>
      <JsonLd
        data={[
          courseListSchema(courses),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Courses", path: "/courses" },
          ]),
        ]}
      />
      <SeoIntro
        heading={INDEXABLE_PAGES.courses.title}
        intro={INDEXABLE_PAGES.courses.description}
        // The whole catalogue: this is the page whose job is to lead to every
        // course, and 27 links is a normal size for a listing page.
        courses={courses}
        coursesHeading="All courses"
      />
      <CoursesClient />
    </>
  )
}
