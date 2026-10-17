import type { Metadata } from "next"
import { SITE, absoluteUrl } from "./config"

/**
 * One builder for every page's metadata (SEO-001).
 *
 * Each public route gets its metadata from here so that the canonical URL, the
 * Open Graph URL and the sitemap entry can never disagree — they are all
 * derived from the same `path`.
 *
 * The root layout sets `metadataBase`, so relative image paths resolve to
 * absolute URLs automatically. Canonicals are still written out in full
 * because a relative canonical is legal but easy to get wrong behind a proxy.
 */

export interface BuildMetadataOptions {
  title: string
  description: string
  /** Router path. Used for the canonical and the OG url. */
  path: string
  /** Site-relative or absolute. Falls back to the generated OG image. */
  image?: string
  imageAlt?: string
  /** `true` keeps the page out of the index but still followable. */
  noIndex?: boolean
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
  keywords?: string[]
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
  keywords,
}: BuildMetadataOptions): Metadata {
  /*
   * A route pattern is not a URL.
   *
   * The noindex pages for dynamic segments are registered by their router
   * pattern, so `path` can still contain "[id]" or "[code]". Emitting
   * <link rel="canonical" href=".../verify-certificate/[id]"> would point at
   * a URL that does not exist. These pages are all noindex, so the honest
   * thing is to omit the canonical rather than invent one.
   */
  const isPattern = path.includes("[")
  const canonical = isPattern ? undefined : absoluteUrl(path)

  /*
   * `opengraph-image.tsx` at the app root generates a real PNG for every page
   * that does not name its own image, so there is never a missing preview.
   */
  const ogImage = image ? absoluteUrl(image) : absoluteUrl("/opengraph-image")

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: noIndex
      ? {
          index: false,
          follow: true,
          // The page should not appear in results, but links out of it are
          // still worth following so the crawler can reach what it links to.
          googleBot: { index: false, follow: true },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type,
      siteName: SITE.name,
      locale: SITE.locale,
      ...(canonical ? { url: canonical } : {}),
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt ?? title,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

/**
 * Metadata for a page that must stay out of the index.
 *
 * A thin wrapper so the call sites read as the decision they are, rather than
 * as `buildMetadata({ noIndex: true })` with the important part buried in an
 * options object.
 */
export function buildNoIndexMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  return buildMetadata({ title, description, path, noIndex: true })
}
