import HomeClient from "./home-client"
import { SeoIntro } from "@/components/seo/seo-intro"
import { fetchPublicCourses } from "@/lib/seo/public-courses"
import { INDEXABLE_PAGES } from "@/lib/seo/config"

/**
 * The homepage (SEO-004).
 *
 * ── Why this file is a server component now ────────────────────────────────
 *
 * It used to be the client component itself, which meant the HTML the server
 * sent carried about one character of visible text, no <h1>, and no link to
 * any course. Everything a crawler could read had to be produced by running
 * JavaScript first.
 *
 * The client component is unchanged and now lives in `home-client.tsx`; only
 * its export name changed. This wrapper renders real server-side content
 * around it, so the page arrives with a heading, a description and crawlable
 * links to actual courses before any JavaScript runs.
 *
 * ── The <h1> ───────────────────────────────────────────────────────────────
 *
 * The page had none at all — the hero carousel opens with <h2>. Rather than
 * push a second visible heading above a carousel that was designed without
 * one, the <h1> is exposed to assistive technology and crawlers without being
 * painted. It says exactly what the page is, so nothing is being shown to a
 * robot that a visitor is not also given.
 */
export default async function Page() {
  /*
   * Never let the catalogue break the homepage.
   *
   * `fetchPublicCourses` already swallows its own failures and returns an
   * empty list, and `SeoIntro` renders nothing for an empty list. A slow or
   * unavailable API therefore costs the SEO block, not the page.
   */
  const courses = await fetchPublicCourses()

  return (
    <>
      <SeoIntro
        heading={INDEXABLE_PAGES.home.title}
        intro={INDEXABLE_PAGES.home.description}
        // The first dozen: enough to give a crawler a path into the
        // catalogue without dumping the whole list onto the homepage.
        courses={courses.slice(0, 12)}
        coursesHeading="Courses on BwengePlus"
        links={[
          { href: "/courses", label: "Browse all courses" },
          { href: "/our-products", label: "Our products" },
          { href: "/certificates", label: "Verify a certificate" },
        ]}
      />
      <HomeClient />
    </>
  )
}
