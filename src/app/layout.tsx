// @ts-nocheck
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GoogleOAuthProvider } from '@react-oauth/google';

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

export const metadata: Metadata = {
  title: "BwengePlus - E-Learning Platform",
  description: "Premium online courses, MOOC & SPOC education platform integrated with Ongera",
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
