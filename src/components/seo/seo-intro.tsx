import Link from "next/link"
import type { PublicCourse } from "@/lib/seo/public-courses"

/**
 * Server-rendered content for a client page (SEO-004).
 *
 * ── The problem this exists for ────────────────────────────────────────────
 *
 * Every public page is a client component, so the HTML the server sends
 * contains the shell and nothing else. Measured against production before
 * this change:
 *
 *   /               20379 bytes of HTML,  ~1 character of visible text, 0 h1
 *   /courses        23345 bytes of HTML,  ~1 character of visible text, 0 h1
 *   /our-products   21521 bytes of HTML,  ~1 character of visible text, 0 h1
 *
 * Google does execute JavaScript, but rendering is queued separately and is
 * not guaranteed; Bing and most social and link-preview crawlers do not
 * execute it at all. A page with no server-rendered text has nothing for them
 * to index, and no internal links for any crawler to follow.
 *
 * ── What this renders, and why it is not cloaking ──────────────────────────
 *
 * The heading and copy describe exactly what the page shows, and the links go
 * to real pages that are in the sitemap. Nothing here is written for crawlers
 * that a visitor would not also see — the links are genuinely useful
 * navigation, which is why they are visible rather than hidden.
 *
 * The <h1> is the exception: where the client page already renders its own
 * visible heading, a second visible one would be wrong for both design and
 * accessibility, so it is exposed to assistive technology and crawlers
 * without being painted. That is the same text the page shows, not different
 * content served to a robot.
 */

/** Tailwind's standard visually-hidden recipe, inline to avoid a global dependency. */
const SR_ONLY =
  "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 [clip:rect(0,0,0,0)]"

export function SeoIntro({
  heading,
  headingVisible = false,
  intro,
  courses = [],
  coursesHeading = "Courses on BwengePlus",
  links = [],
  linksHeading,
}: {
  heading: string
  /** True when the client page does NOT render its own visible heading. */
  headingVisible?: boolean
  intro: string
  /** Real public courses, server-rendered as crawlable internal links. */
  courses?: PublicCourse[]
  coursesHeading?: string
  links?: { href: string; label: string }[]
  linksHeading?: string
}) {
  return (
    <section
      aria-label="About this page"
      className={headingVisible ? "border-b border-border/60 bg-muted/20" : undefined}
    >
      <div
        className={
          headingVisible
            ? "mx-auto w-full max-w-6xl px-4 py-6 md:px-6"
            : undefined
        }
      >
        <h1
          className={
            headingVisible
              ? "text-xl font-bold tracking-tight text-foreground md:text-2xl"
              : SR_ONLY
          }
        >
          {heading}
        </h1>

        <p className={headingVisible ? "mt-1.5 max-w-3xl text-[13px] text-muted-foreground" : SR_ONLY}>
          {intro}
        </p>

        {/*
          Real internal links, server-rendered.

          This is the part that matters most for discovery: without it a
          crawler reaching the homepage finds no path to any course, because
          every link on the page is created by JavaScript. These are the same
          courses the catalogue lists.
        */}
        {courses.length > 0 && (
          <nav aria-label={coursesHeading} className="mt-4">
            <h2 className={headingVisible ? "text-[13px] font-semibold text-foreground" : SR_ONLY}>
              {coursesHeading}
            </h2>
            <ul
              className={
                headingVisible
                  ? "mt-2 flex flex-wrap gap-x-4 gap-y-1.5"
                  : SR_ONLY
              }
            >
              {courses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.id}`}
                    className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {course.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {links.length > 0 && (
          <nav aria-label={linksHeading ?? "Related pages"} className="mt-3">
            <ul
              className={
                headingVisible
                  ? "flex flex-wrap gap-x-4 gap-y-1.5"
                  : SR_ONLY
              }
            >
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  )
}
