/**
 * Metadata for this route (SEO-001).
 *
 * The page is a client component and cannot export metadata itself, so it
 * lives here. This layout renders its children unchanged.
 */
import type { Metadata } from "next"
import { INDEXABLE_PAGES } from "@/lib/seo/config"
import { buildMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = buildMetadata(INDEXABLE_PAGES.courses)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
