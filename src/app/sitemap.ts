import type { MetadataRoute } from "next"
import { INDEXABLE_PAGES, absoluteUrl } from "@/lib/seo/config"
import { fetchPublicCourses } from "@/lib/seo/public-courses"

/**
 * sitemap.xml (SEO-001). Served at /sitemap.xml, which currently 404s.
 *
 * ── Built from the same table as the metadata ──────────────────────────────
 *
 * The static entries come from `INDEXABLE_PAGES`, which is also what sets each
 * page's canonical URL. A separate hand-maintained list of paths is how a
 * sitemap ends up advertising a URL whose own canonical points elsewhere, or
 * listing a page that was set to noindex months ago.
 *
 * ── Only genuinely public courses ──────────────────────────────────────────
 *
 * Course URLs come from the unauthenticated discovery endpoint, which returns
 * only public courses. A private SPOC course is therefore absent by
 * construction rather than by a filter someone has to remember.
 *
 * `lastModified` uses each course's own timestamp when the API provides one.
 * Stamping every URL with "now" on each build tells crawlers that the whole
 * site changed every deploy, which devalues the signal.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = Object.values(INDEXABLE_PAGES)
    .filter((page) => page.changeFrequency && page.priority !== undefined)
    .map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))

  const courses = await fetchPublicCourses()

  const courseEntries: MetadataRoute.Sitemap = courses.map((course) => ({
    url: absoluteUrl(`/courses/${course.id}`),
    lastModified: course.updated_at ? new Date(course.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [...staticEntries, ...courseEntries]
}

/**
 * Revalidate hourly.
 *
 * Without this the sitemap is generated once at build time and a course
 * published afterwards never appears until the next deploy.
 */
export const revalidate = 3600
