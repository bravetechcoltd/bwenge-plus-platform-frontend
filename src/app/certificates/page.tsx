import { redirect } from "next/navigation"

/**
 * CERT-CONS-001 C-27.
 *
 * The main sidebar has always linked "Certificates" to `/certificates`
 * (`components/layout/sidebar.tsx`), and this route did not exist — the
 * directory held only `[id]`, `my-certificates` and `verify`, so the link was a
 * 404.
 *
 * The certificates list lives at `/dashboard/learner/certificates`, inside the
 * dashboard shell that gives it navigation and the role guard. Redirecting
 * keeps the existing link working rather than adding a second list.
 */
export default function CertificatesIndexPage() {
  redirect("/dashboard/learner/certificates")
}
