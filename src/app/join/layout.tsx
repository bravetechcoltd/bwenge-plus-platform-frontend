/**
 * Metadata for this route (SEO-001).
 *
 * The page is a client component and cannot export metadata itself, so it
 * lives here. This layout renders its children unchanged.
 */
import type { Metadata } from "next"
import { buildNoIndexMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = buildNoIndexMetadata(
  "Accept your invitation",
  "Accept an invitation to join a BwengePlus institution or course.",
  "/join"
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
