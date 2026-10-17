import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  SITE,
  PUBLIC_API,
  absoluteUrl,
  INDEXABLE_PAGES,
  NOINDEX_ROUTES,
  SITE_KEYWORDS,
  VERIFICATION,
  GOOGLE_VERIFICATION_FILE,
} from "./config"
import { buildMetadata, buildNoIndexMetadata } from "./metadata"
import {
  organizationSchema,
  websiteSchema,
  courseSchema,
  breadcrumbSchema,
} from "./structured-data"
import { courseDescription } from "./public-courses"

/**
 * SEO-001 / SEO-002 — the rules that must not regress.
 *
 * These run against the real modules with the project's existing vitest, so
 * they test behaviour rather than the shape of the source.
 */

describe("canonical host", () => {
  it("uses www, which is where the apex redirects", () => {
    // https://bwengeplus.com 302s to https://www.bwengeplus.com, so pointing
    // canonicals at the apex would make every one of them a redirect.
    expect(SITE.url).toBe("https://www.bwengeplus.com")
  })

  it("never carries a trailing slash", () => {
    expect(SITE.url.endsWith("/")).toBe(false)
  })

  it("builds absolute URLs without doubling the slash", () => {
    expect(absoluteUrl("/courses")).toBe("https://www.bwengeplus.com/courses")
    expect(absoluteUrl("courses")).toBe("https://www.bwengeplus.com/courses")
    expect(absoluteUrl("/")).toBe("https://www.bwengeplus.com")
  })

  it("leaves an already-absolute URL alone", () => {
    expect(absoluteUrl("https://res.cloudinary.com/x.jpg")).toBe(
      "https://res.cloudinary.com/x.jpg"
    )
  })

  it("is this platform, not a sibling project", () => {
    // bwengeconsult.com serves a different app; bwenge.com is a different
    // product again. Getting this wrong points the whole sitemap elsewhere.
    expect(SITE.url).not.toContain("bwengeconsult")
    expect(SITE.url).not.toContain("//bwenge.com")
  })
})

describe("public API", () => {
  it("never falls back to localhost in a build", () => {
    // Local .env sets NEXT_PUBLIC_API_URL to localhost. If that reached a
    // production build the sitemap would silently contain no courses.
    expect(PUBLIC_API).not.toMatch(/localhost|127\.0\.0\.1/)
    expect(PUBLIC_API.startsWith("https://")).toBe(true)
  })
})

describe("page metadata", () => {
  it("gives every indexable page a distinct title and description", () => {
    const pages = Object.values(INDEXABLE_PAGES)
    const titles = pages.map((p) => p.title)
    const descriptions = pages.map((p) => p.description)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it("keeps descriptions within a sensible snippet length", () => {
    for (const page of Object.values(INDEXABLE_PAGES)) {
      expect(page.description.length).toBeGreaterThan(70)
      expect(page.description.length).toBeLessThanOrEqual(200)
    }
  })

  it("targets the phrase the homepage competes for", () => {
    const home = INDEXABLE_PAGES.home
    expect(home.title.toLowerCase()).toContain("bwenge")
    expect(home.title.toLowerCase()).toContain("rwanda")
    expect(home.title.toLowerCase()).toContain("e-learning")
    expect(home.description.toLowerCase()).toContain("africa")
  })

  it("sets a self-referencing canonical", () => {
    const meta = buildMetadata(INDEXABLE_PAGES.courses)
    expect(meta.alternates?.canonical).toBe(
      "https://www.bwengeplus.com/courses"
    )
    expect(meta.openGraph?.url).toBe("https://www.bwengeplus.com/courses")
  })

  it("marks indexable pages index,follow", () => {
    const robots = buildMetadata(INDEXABLE_PAGES.home).robots as {
      index: boolean
      follow: boolean
    }
    expect(robots.index).toBe(true)
    expect(robots.follow).toBe(true)
  })

  it("marks noindex pages noindex but still follow", () => {
    const robots = buildNoIndexMetadata("Sign in", "x", "/login").robots as {
      index: boolean
      follow: boolean
    }
    expect(robots.index).toBe(false)
    // Links out of the page are still worth crawling.
    expect(robots.follow).toBe(true)
  })

  it("always supplies a social image", () => {
    const meta = buildMetadata(INDEXABLE_PAGES.home)
    const images = meta.openGraph?.images as { url: string }[]
    expect(images[0].url).toContain("https://www.bwengeplus.com")
    expect(meta.twitter?.card).toBe("summary_large_image")
  })

  it("uses a course's own image when it has one", () => {
    const meta = buildMetadata({
      title: "T",
      description: "D",
      path: "/courses/1",
      image: "https://res.cloudinary.com/x/cover.jpg",
    })
    const images = meta.openGraph?.images as { url: string }[]
    expect(images[0].url).toBe("https://res.cloudinary.com/x/cover.jpg")
  })
})

describe("indexing policy", () => {
  it("keeps pages that name an individual out of the index", () => {
    const personal = [
      "/certificates/[id]",
      "/verify/[id]",
      "/verify-certificate/[id]",
      "/certificates/verify/[code]",
    ]
    for (const path of personal) {
      expect(NOINDEX_ROUTES.some((r) => r.path === path)).toBe(true)
    }
  })

  it("keeps credential forms out of the index", () => {
    for (const path of ["/login", "/register", "/reset-password"]) {
      expect(NOINDEX_ROUTES.some((r) => r.path === path)).toBe(true)
    }
  })

  it("never lists a route as both indexable and noindex", () => {
    const indexable = Object.values(INDEXABLE_PAGES).map((p) => p.path)
    const blocked = NOINDEX_ROUTES.map((r) => r.path)
    expect(indexable.filter((p) => blocked.includes(p))).toEqual([])
  })

  it("records a reason for every exclusion", () => {
    for (const route of NOINDEX_ROUTES) {
      expect(route.reason.length).toBeGreaterThan(8)
    }
  })
})

describe("keywords", () => {
  it("leads with the brand", () => {
    expect(SITE_KEYWORDS[0]).toBe("bwenge")
    expect(SITE_KEYWORDS).toContain("bwenge plus")
  })

  it("covers the category phrases being targeted", () => {
    for (const phrase of [
      "e-learning platform rwanda",
      "elearning platform rwanda",
      "e-learning platform africa",
      "online courses rwanda",
    ]) {
      expect(SITE_KEYWORDS).toContain(phrase)
    }
  })

  it("has no duplicates", () => {
    expect(new Set(SITE_KEYWORDS).size).toBe(SITE_KEYWORDS.length)
  })

  it("describes this product, not the research sibling", () => {
    const joined = SITE_KEYWORDS.join(" ")
    // The pasted reference config was for a research-collaboration platform.
    for (const foreign of ["research grants", "phd researchers", "dissertation"]) {
      expect(joined).not.toContain(foreign)
    }
  })
})

describe("structured data", () => {
  it("describes an educational organisation, not a research one", () => {
    const org = organizationSchema() as Record<string, unknown>
    expect(org["@type"]).toBe("EducationalOrganization")
    expect(org.url).toBe(SITE.url)
  })

  it("asserts no contact details the site does not publish", () => {
    const org = organizationSchema() as Record<string, unknown>
    // Inventing a phone number or founding date would be fabricating facts
    // about a real company.
    expect(org.telephone).toBeUndefined()
    expect(org.foundingDate).toBeUndefined()
    expect(org.address).toBeUndefined()
  })

  it("points the site search at the real catalogue parameter", () => {
    const site = websiteSchema() as Record<string, unknown>
    const action = site.potentialAction as { target: { urlTemplate: string } }
    expect(action.target.urlTemplate).toContain("/courses?search=")
  })

  it("builds course schema from the course's own fields", () => {
    const schema = courseSchema({
      id: "abc",
      title: "Data Pipelines",
      short_description: "Building pipelines.",
      thumbnail_url: "https://img/x.jpg",
      category_name: "Data",
      level: "INTERMEDIATE",
    }) as Record<string, unknown>

    expect(schema["@type"]).toBe("Course")
    expect(schema.name).toBe("Data Pipelines")
    expect(schema.url).toBe("https://www.bwengeplus.com/courses/abc")
    expect(schema.image).toBe("https://img/x.jpg")
    // No price is shown publicly, so none is claimed.
    expect(schema.offers).toBeUndefined()
  })

  it("numbers breadcrumbs from one and absolutises them", () => {
    const crumbs = breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Courses", path: "/courses" },
    ]) as { itemListElement: { position: number; item: string }[] }

    expect(crumbs.itemListElement[0].position).toBe(1)
    expect(crumbs.itemListElement[1].item).toBe(
      "https://www.bwengeplus.com/courses"
    )
  })
})

describe("course descriptions", () => {
  it("prefers the course's own description", () => {
    expect(
      courseDescription({ id: "1", title: "T", short_description: "Real copy." })
    ).toBe("Real copy.")
  })

  it("truncates an over-long description rather than emitting it whole", () => {
    const long = "x".repeat(400)
    const out = courseDescription({ id: "1", title: "T", short_description: long })
    expect(out.length).toBeLessThanOrEqual(300)
    expect(out.endsWith("…")).toBe(true)
  })

  it("gives two untitled courses different fallbacks", () => {
    const a = courseDescription({ id: "1", title: "Intro to Python" })
    const b = courseDescription({ id: "2", title: "Advanced SQL" })
    expect(a).not.toBe(b)
    expect(a).toContain("Intro to Python")
  })
})

describe("search-engine verification (SEO-003)", () => {
  it("carries both tokens Google issued for this domain", () => {
    // Search Console issues one token per property; this domain has the apex
    // and the www prefix it redirects to.
    expect(VERIFICATION.google).toContain(
      "vJrdo22dU4sSHPtpQPJ2MOk3nnZXJ82-_czTDzVvydg"
    )
    expect(VERIFICATION.google).toContain(
      "BidL7x14xNtlH7mqwT1ryoq_5q30d-kboJg_1lj8wWQ"
    )
  })

  it("records the HTML-file method's filename", () => {
    expect(GOOGLE_VERIFICATION_FILE).toBe("googlede57741f1e204520.html")
  })

  it("serves that file from public/, the only directory Next exposes", () => {
    // It was at the repository root, where Next never serves it, and was
    // untracked by git so it would not have deployed at all.
    const onDisk = resolve(__dirname, "../../../public", GOOGLE_VERIFICATION_FILE)
    expect(existsSync(onDisk)).toBe(true)
    // Google checks the exact contents, not just that the URL responds.
    expect(readFileSync(onDisk, "utf8").trim()).toBe(
      `google-site-verification: ${GOOGLE_VERIFICATION_FILE}`
    )
  })
})
