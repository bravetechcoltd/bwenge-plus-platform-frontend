/**
 * SEO configuration for Bwenge Plus (SEO-001).
 *
 * ── The canonical host is verified, not assumed ────────────────────────────
 *
 * `https://bwengeplus.com` answers 302 → `https://www.bwengeplus.com`, so www
 * is the canonical host and every canonical URL, sitemap entry and OG URL here
 * uses it. Pointing them at the apex would make every canonical a redirect,
 * which search engines treat as a weaker signal.
 *
 * This is the Bwenge Plus e-learning platform. It is deliberately not
 * bwengeconsult.com (a separate "Consultancy Platform"), bwenge.com, or the
 * loan-management system.
 */

/** The one place the production origin is defined. */
export const SITE = {
  name: "BwengePlus",
  fullName: "BwengePlus — E-Learning Platform",
  shortName: "BwengePlus",
  /**
   * Overridable per environment, but the default is production rather than
   * localhost: a preview deployment without the variable set should still emit
   * correct canonicals rather than advertise itself as the real site under a
   * bare hostname.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.bwengeplus.com").replace(
    /\/+$/,
    ""
  ),
  locale: "en_RW",
  /** Used only for schema.org and the manifest; both are real brand assets. */
  logo: "/BwengePlusLogo.png",
  mark: "/bwenge-plus-mark.png",
  /** Sampled from bwenge-plus-mark.png, not guessed: the badge purple. */
  themeColor: "#62529c",
  backgroundColor: "#FFFFFF",
} as const

/**
 * The public API, used by the sitemap and by per-course metadata.
 *
 * `NEXT_PUBLIC_API_URL` is localhost in local `.env` files, which would make a
 * production build emit an empty sitemap silently. So production is the
 * default and localhost is only used when explicitly asked for.
 */
export const PUBLIC_API =
  (process.env.NEXT_PUBLIC_API_URL &&
  !/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_API_URL)
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://api.bwengeplus.com/api"
  ).replace(/\/+$/, "")

/** Absolute URL for a site-relative path, with the canonical host. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path
  const clean = path.startsWith("/") ? path : `/${path}`
  return `${SITE.url}${clean === "/" ? "" : clean}` || SITE.url
}

/**
 * Routes that may be indexed, with the copy that describes each one.
 *
 * Every entry was written against what the page actually shows. Nothing here
 * is a generic repeat of the site description, because a set of pages sharing
 * one title and description competes with itself.
 */
export interface PageSeo {
  /** Path as the router sees it. */
  path: string
  title: string
  description: string
  /** Sitemap hints. Omitted entries are not in the sitemap. */
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never"
  priority?: number
}

export const INDEXABLE_PAGES: Record<string, PageSeo> = {
  home: {
    path: "/",
    /*
     * The title is where the target phrase has to appear.
     *
     * "E-Learning Platform in Rwanda" is the phrase this page is competing
     * for, and the brand leads so that a search for "bwenge" or "bwenge plus"
     * matches the strongest position in the title. Kept under ~60 characters
     * before the pipe so Google does not truncate the brand away.
     */
    title: "Bwenge Plus — E-Learning Platform in Rwanda",
    description:
      "Bwenge Plus is an e-learning platform in Rwanda offering online courses, MOOC and institution-led SPOC programmes, and verifiable certificates for learners across Rwanda and Africa.",
    changeFrequency: "daily",
    priority: 1.0,
  },
  courses: {
    path: "/courses",
    title: "Online Courses in Rwanda — Browse the Catalogue",
    description:
      "Search and filter the full BwengePlus course catalogue by subject, level and instructor. Open MOOC courses and institution-led programmes across technology, data, business and more.",
    changeFrequency: "daily",
    priority: 0.9,
  },
  products: {
    path: "/our-products",
    title: "Our Products",
    description:
      "The products and platforms built by BwengePlus for learners, instructors and institutions across Rwanda.",
    changeFrequency: "weekly",
    priority: 0.6,
  },
  certificates: {
    path: "/certificates",
    title: "Verify a Certificate",
    description:
      "Check that a BwengePlus certificate is genuine. Enter a certificate code to confirm the course, the holder and the date it was issued.",
    changeFrequency: "monthly",
    priority: 0.5,
  },
}

/**
 * Routes that exist publicly but must not be indexed, and why.
 *
 * The reason is kept with the rule so the next person changing it can see
 * whether it was a considered decision or an oversight.
 */
export const NOINDEX_ROUTES: { path: string; reason: string }[] = [
  // Credential and account flows. Thin, duplicated across every platform, and
  // of no search value; indexing them also invites credential-phishing clones
  // to rank beside the real page.
  { path: "/login", reason: "authentication form" },
  { path: "/register", reason: "authentication form" },
  { path: "/forgot-password", reason: "authentication form" },
  { path: "/reset-password", reason: "single-use token link" },
  { path: "/verify-email", reason: "single-use token link" },
  { path: "/sso/callback", reason: "machine redirect target" },
  { path: "/join", reason: "single-use invite token link" },

  // Utility states with no content.
  { path: "/offline", reason: "service-worker fallback" },
  { path: "/maintenance", reason: "temporary status page" },

  // Authoring and learning surfaces: behind a login, and useless to a crawler.
  { path: "/courses/add", reason: "authoring tool, requires sign-in" },
  { path: "/courses/[id]/learn", reason: "enrolled-learner player" },

  /*
   * Certificates name a real person.
   *
   * These pages render a named individual's achievement. Verification must
   * keep working for anyone holding the link — that is the point of it — but
   * having Google list learners' names and credentials is a privacy exposure
   * nobody asked for, and the pages are worthless as search results. They stay
   * reachable and stay out of the index.
   */
  { path: "/certificates/[id]", reason: "names an individual" },
  { path: "/certificates/[id]/print", reason: "print view, names an individual" },
  { path: "/certificates/verify/[code]", reason: "names an individual" },
  { path: "/certificates/my-certificates", reason: "personal, requires sign-in" },
  { path: "/verify/[id]", reason: "names an individual" },
  { path: "/verify-certificate/[id]", reason: "names an individual" },
]

/**
 * Keywords, brand first (SEO-002).
 *
 * ── What this list is and is not ───────────────────────────────────────────
 *
 * `<meta name="keywords">` has not been a Google ranking signal since 2009,
 * and Bing says the same. This list is included because it costs little and
 * some smaller engines and internal site-search tools still read it — but it
 * is not what will make Bwenge Plus rank.
 *
 * What actually ranks these phrases is already implemented elsewhere in this
 * module and is worth knowing, because it is where effort should go:
 *
 *   1. The <title> of each page — the single strongest on-page signal. The
 *      homepage title is now "Bwenge Plus — E-Learning Platform in Rwanda".
 *   2. The meta description — drives click-through, which feeds back into
 *      ranking.
 *   3. Real headings and body text on the page. This is currently the site's
 *      biggest weakness: the public pages are client components, so the HTML
 *      a crawler receives has no <h1> and no copy at all. See the SEO report.
 *   4. Structured data — the EducationalOrganization and Course schema.
 *   5. Inbound links from Rwandan institutions, partners and directories.
 *      Nothing in this repository can manufacture these, and they are the
 *      main reason one e-learning site outranks another.
 *
 * The list below is deliberately the terms this platform can honestly compete
 * for. Padding it with hundreds of phrases the site has no content for — the
 * research, grants and academic-publishing vocabulary from the sibling
 * project — would describe a product that does not exist here.
 */
export const SITE_KEYWORDS = [
  // Brand — the primary target. Both spellings, because people search both.
  "bwenge",
  "bwenge plus",
  "bwengeplus",
  "bwenge plus rwanda",
  "bwenge e-learning",
  "bwenge online courses",
  "bwenge platform",
  "bwenge certificates",

  // The core category phrases, Rwanda.
  "e-learning platform rwanda",
  "elearning platform rwanda",
  "online learning platform rwanda",
  "online courses rwanda",
  "online education rwanda",
  "e-learning rwanda",
  "distance learning rwanda",
  "online training rwanda",
  "professional courses rwanda",
  "short courses rwanda",
  "online certification rwanda",
  "accredited online courses rwanda",
  "learning management system rwanda",
  "lms rwanda",
  "online courses kigali",

  // Africa and the wider region.
  "e-learning platform africa",
  "elearning platform africa",
  "online courses africa",
  "online learning africa",
  "african e-learning platform",
  "east africa online courses",
  "online education east africa",

  // Course model, which is a genuine differentiator here.
  "mooc rwanda",
  "mooc platform africa",
  "spoc courses",
  "massive open online course rwanda",
  "small private online course",
  "institution online courses",
  "corporate training platform rwanda",
  "university online courses rwanda",

  // Certificates — a real feature of the product.
  "verifiable certificate online course",
  "verify certificate rwanda",
  "online course certificate rwanda",
  "digital certificate rwanda",

  // Who the platform is for.
  "online courses for students rwanda",
  "professional development rwanda",
  "upskilling rwanda",
  "skills training online rwanda",
  "instructor platform rwanda",
  "teach online rwanda",

  // Intent phrases people actually type.
  "best e-learning platform in rwanda",
  "where to learn online in rwanda",
  "free online courses rwanda",
  "study online rwanda certificate",
]

/**
 * Search-engine ownership verification (SEO-002).
 *
 * Google Search Console and Bing Webmaster Tools each prove you own the
 * domain before showing you its data. The HTML-tag method is the one this
 * supports: the console gives you a token, you set it as an environment
 * variable, and it is rendered into every page's <head>.
 *
 * These are read from the environment on purpose. A verification token is not
 * a secret — it is public in the HTML — but hard-coding one ties the
 * repository to a single Search Console property and silently breaks if the
 * property is ever recreated.
 *
 * Nothing is verified until the real tokens are set and the site is deployed;
 * see the setup steps reported alongside this change.
 */

/**
 * The tokens Google issued for this site.
 *
 * Both are kept because Search Console issues a separate token per property,
 * and this domain has two: the apex (bwengeplus.com) and the www prefix that
 * it redirects to. Google accepts more than one verification tag on a page
 * and matches whichever belongs to the property being verified, so listing
 * both verifies both properties from one deployment.
 *
 * These are committed rather than left to environment variables on purpose.
 * A verification token is not a secret — it is served in the HTML of every
 * page, and anyone can read it. Requiring an env var would mean verification
 * silently fails on any deployment where someone forgot to set it, which is
 * exactly the failure this is meant to avoid. An env var still overrides,
 * for a property created later.
 */
const GOOGLE_TOKENS = [
  "vJrdo22dU4sSHPtpQPJ2MOk3nnZXJ82-_czTDzVvydg",
  "BidL7x14xNtlH7mqwT1ryoq_5q30d-kboJg_1lj8wWQ",
] as const

export const VERIFICATION = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? [process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION]
    : [...GOOGLE_TOKENS],
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined,
  yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
} as const

/**
 * The file-based verification Google also offers.
 *
 * `public/googlede57741f1e204520.html` is served at the site root. It is
 * recorded here so the test suite can assert it still exists: Search Console
 * re-checks it periodically and un-verifies the property if it disappears,
 * which is an easy thing to delete by accident during a tidy-up.
 */
export const GOOGLE_VERIFICATION_FILE = "googlede57741f1e204520.html"
