/**
 * Metadata for this route (SEO-001).
 *
 * The page is a client component and cannot export metadata itself, so it
 * lives here. This layout renders its children unchanged.
 */
import { Suspense } from "react"
import type { Metadata } from "next"
import { buildNoIndexMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = buildNoIndexMetadata(
  "Signing you in",
  "Completing single sign-on.",
  "/sso/callback"
)

/**
 * SEO-004. useSearchParams() needs a Suspense boundary.
 *
 * This page reads the SSO token from the query string. Until the server
 * actually rendered the tree, that call never ran during prerender and the
 * requirement never surfaced; now that it does, Next fails the build without
 * a boundary around it.
 *
 * The fallback is deliberately empty: this is a machine redirect target that
 * is on screen for a moment, and a spinner would flash for no one.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
