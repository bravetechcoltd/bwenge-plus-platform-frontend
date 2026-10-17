/**
 * Metadata for this route (SEO-001).
 *
 * The page is a client component and cannot export metadata itself, so it
 * lives here. This layout renders its children unchanged.
 */
import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo/metadata"

/**
 * An institution's public course list.
 *
 * The slug is the only thing known without a session, so it is turned into a
 * readable name rather than left as a URL fragment. The description says what
 * the page lists without asserting anything about the institution that this
 * build cannot verify.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  const name = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

  return buildMetadata({
    title: `${name} — courses`,
    description: `Courses offered by ${name} on BwengePlus. Browse the programmes this institution publishes and enrol online.`,
    path: `/institutions/${slug}/courses`,
  })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
