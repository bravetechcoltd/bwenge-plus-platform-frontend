// @ts-nocheck
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SITE, SITE_KEYWORDS, INDEXABLE_PAGES, VERIFICATION } from "@/lib/seo/config";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo/structured-data";

/*
 * Fonts are served from this repository, not fetched at build time.
 *
 * `next/font/google` downloads each family from fonts.googleapis.com while
 * the production build runs. The deployment container has no outbound
 * access to it, so the build failed outright — not with a fallback face,
 * but with `Failed to fetch `Inter` from Google Fonts` and a non-zero exit.
 * A build that needs the public internet to succeed will fail again the next
 * time that network is unavailable.
 *
 * These are the same faces, the latin subsets, stored in `src/app/fonts`.
 * `next/font/local` inlines them exactly as before: same hashed family
 * names, same CSS variables, same preloading, and no third-party request
 * from the visitor's browser either.
 *
 * The certificate names its faces through the CSS variables rather than by
 * family name, because next/font mints hashed names (`__Inter_a1b2c3`) and a
 * literal "Inter" in a stylesheet resolves to nothing.
 */
const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  variable: "--font-certificate-body",
  display: "swap",
  // The variable font carries the whole range in one file.
  weight: "100 900",
  fallback: ["system-ui", "sans-serif"],
});

// ── Certificate typography ──────────────────────────────────────────────────
// A generic fallback would flatten the design: the certificate's hierarchy
// rests on the contrast between a high-contrast serif title, a calligraphic
// recipient name and a clean sans body.
const playfair = localFont({
  src: "./fonts/PlayfairDisplay-latin.woff2",
  variable: "--font-certificate-serif",
  display: "swap",
  weight: "400 800",
  fallback: ["Georgia", "serif"],
});

const greatVibes = localFont({
  src: "./fonts/GreatVibes-latin.woff2",
  variable: "--font-certificate-script",
  display: "swap",
  weight: "400",
  fallback: ["cursive"],
});

const dancingScript = localFont({
  src: "./fonts/DancingScript-latin.woff2",
  variable: "--font-certificate-signature",
  display: "swap",
  weight: "400 700",
  fallback: ["cursive"],
});

/**
 * Site-wide metadata and the homepage's own (SEO-001).
 *
 * This layout renders "/" as well as everything under it, so its title and
 * description ARE the homepage's. The previous pair said "Premium online
 * courses, MOOC & SPOC education platform integrated with Ongera" on every
 * single page of the site, which gave 23 public pages one identical snippet
 * to compete with.
 *
 * `metadataBase` is what makes relative image paths and canonicals resolve to
 * absolute URLs. Without it Next warns at build time and emits relative OG
 * image URLs, which most social scrapers refuse to fetch.
 *
 * `title.template` appends the brand to child pages, so each route sets only
 * its own name and cannot forget the suffix. `title.default` is used for the
 * homepage itself, where the template would read "BwengePlus | BwengePlus".
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: INDEXABLE_PAGES.home.title,
    template: `%s | ${SITE.name}`,
  },
  description: INDEXABLE_PAGES.home.description,
  applicationName: SITE.name,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: SITE.url },
  manifest: "/manifest.webmanifest",
  robots: {
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
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: INDEXABLE_PAGES.home.title,
    description: INDEXABLE_PAGES.home.description,
  },
  twitter: {
    card: "summary_large_image",
    title: INDEXABLE_PAGES.home.title,
    description: INDEXABLE_PAGES.home.description,
  },
  formatDetection: { telephone: false, address: false, email: false },
  /*
   * Search-engine ownership verification.
   *
   * Next omits any key whose value is undefined, so with no tokens set this
   * renders nothing at all rather than an empty, invalid meta tag.
   */
  verification: {
    ...(VERIFICATION.google.length ? { google: VERIFICATION.google } : {}),
    ...(VERIFICATION.yandex ? { yandex: VERIFICATION.yandex } : {}),
    ...(VERIFICATION.bing ? { other: { "msvalidate.01": VERIFICATION.bing } } : {}),
  },
};

/**
 * Separate from `metadata` because Next 14+ moved it there; leaving
 * `themeColor` inside `metadata` logs a deprecation warning on every build.
 */
export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const fontVariables = `${playfair.variable} ${greatVibes.variable} ${dancingScript.variable} ${inter.variable}`;

  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className={inter.className}>
        {/*
          Organisation and site schema, rendered on the server.

          This is deliberate and load-bearing: every public page is a client
          component, so the HTML a crawler receives contains almost no text.
          These two blocks are machine-readable content that is present
          without executing any JavaScript.
        */}
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            <Providers>
              {children}
            </Providers>
          </GoogleOAuthProvider>
        ) : (
          <Providers>
            {children}
          </Providers>
        )}
      </body>
    </html>
  );
}
