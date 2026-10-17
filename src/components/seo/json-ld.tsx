import type { Json } from "@/lib/seo/structured-data"

/**
 * Renders structured data into the document (SEO-001).
 *
 * A server component with no "use client", so the JSON-LD is in the HTML that
 * arrives from the server. That matters more here than on most sites: the
 * public pages are client components, so this is some of the only machine
 * readable content a crawler gets without running JavaScript.
 *
 * `JSON.stringify` output is placed in a `<script type="application/ld+json">`.
 * The only character sequence that can break out of a script element is
 * `</script`, and `<` is escaped below, so the payload cannot terminate the
 * tag early. The data comes from our own API and config, never from a URL.
 */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const payload = Array.isArray(data) ? data : [data]

  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  )
}
