import type { MetadataRoute } from "next"
import { SITE } from "@/lib/seo/config"

/**
 * robots.txt (SEO-001). Served at /robots.txt, which currently 404s.
 *
 * ── Allow by default, deny what is genuinely private ───────────────────────
 *
 * An explicit allow-list of paths is a trap: every public route added later is
 * silently excluded until someone remembers this file. So crawling is allowed
 * by default and the disallow list names what must stay out — the dashboard,
 * the authoring tools, the API, and the pages that carry a named individual's
 * certificate.
 *
 * `robots.txt` controls *crawling*, not indexing. A URL that is disallowed
 * here can still be indexed from an external link, so the pages that must not
 * appear in results also carry `robots: noindex` from their own metadata. The
 * two mechanisms are complementary, not alternatives.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Signed-in application surface.
          "/dashboard/",
          "/api/",

          // Course authoring and the enrolled-learner player.
          "/courses/add",
          "/courses/*/learn",

          /*
           * Certificate pages name a real person. Verification keeps working
           * for anyone with the link; it just does not belong in a search
           * index. Each of these also sends noindex.
           */
          "/certificates/my-certificates",
          "/certificates/*/print",
          "/certificates/verify/",
          "/verify/",
          "/verify-certificate/",

          // Single-use token links and machine redirects.
          "/join",
          "/reset-password",
          "/verify-email",
          "/sso/",

          // Utility states.
          "/offline",
          "/maintenance",

          // Build output and infrastructure.
          "/_next/",
        ],
      },
      /*
       * No AI-crawler block.
       *
       * The reference configuration this was modelled on blocked GPTBot,
       * ClaudeBot, Google-Extended, CCBot and others. That is a legitimate
       * choice, but it is a business decision about whether BwengePlus wants
       * its public course catalogue cited by AI assistants, not a technical
       * default — and `Google-Extended` in particular affects AI training and
       * Gemini grounding, not Search ranking. For a platform whose goal is
       * discovery, blocking them removes a growing referral channel.
       *
       * Left open on purpose. To block them, add rules here; nothing else in
       * this implementation depends on the choice.
       */
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
