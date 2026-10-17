import { SITE, absoluteUrl } from "./config"
import type { PublicCourse } from "./public-courses"
import { courseDescription } from "./public-courses"

/**
 * schema.org structured data (SEO-001).
 *
 * Every builder here describes something the page actually shows. Structured
 * data that claims more than the page contains — ratings nobody left, prices
 * that are not displayed, an organisation type the site is not — is a
 * manual-action risk, not a ranking trick, so the types are the conservative
 * accurate ones.
 *
 * This is also the one place the public site gets *server-rendered content* a
 * crawler can read without executing JavaScript, because the pages themselves
 * are client components. See the note in the SEO report.
 */

export type Json = Record<string, unknown>

/**
 * The organisation behind the platform.
 *
 * `EducationalOrganization` rather than `ResearchOrganization`: BwengePlus
 * teaches courses and issues certificates. No founding date, telephone or
 * postal address is asserted, because none of those is published on the site
 * and inventing them would be fabricating facts about a real company.
 */
export function organizationSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: "Bwenge Plus",
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(SITE.logo),
    },
    description:
      "BwengePlus is an e-learning platform offering open (MOOC) and institution-led (SPOC) online courses with verifiable certificates.",
    areaServed: {
      "@type": "Country",
      name: "Rwanda",
    },
  }
}

/**
 * The site itself, with the search action that points at the real catalogue
 * search — `/courses` accepts a `search` query parameter.
 */
export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/courses?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

/**
 * A single course.
 *
 * `hasCourseInstance` is omitted deliberately: these are self-paced courses
 * with no fixed schedule, and asserting a start date or duration that the page
 * does not show would be inventing data. `offers` is likewise omitted because
 * no price is displayed publicly.
 */
export function courseSchema(course: PublicCourse): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": absoluteUrl(`/courses/${course.id}`),
    name: course.title,
    description: courseDescription(course),
    url: absoluteUrl(`/courses/${course.id}`),
    ...(course.thumbnail_url ? { image: course.thumbnail_url } : {}),
    provider: { "@id": `${SITE.url}/#organization` },
    inLanguage: "en",
    ...(course.category_name ? { about: course.category_name } : {}),
    ...(course.level
      ? { educationalLevel: String(course.level).toLowerCase() }
      : {}),
  }
}

/** A list of courses, for the catalogue page. */
export function courseListSchema(courses: PublicCourse[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "BwengePlus course catalogue",
    numberOfItems: courses.length,
    itemListElement: courses.slice(0, 50).map((course, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/courses/${course.id}`),
      name: course.title,
    })),
  }
}

/** Breadcrumbs. `items` must match the trail the page actually renders. */
export function breadcrumbSchema(
  items: { name: string; path: string }[]
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
