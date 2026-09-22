import { redirect } from "next/navigation"

/**
 * CERT-CONS-001 C-30.
 *
 * A second, older "my certificates" list lived here — 486 lines with its own
 * data shape, its own actions and its own look, reachable only by typing the
 * URL. Its download built `…/pdf/download?download=true` with no token and so
 * could never have worked (C-19).
 *
 * The URL is kept alive and points at the one list, which is linked from the
 * dashboard navigation. Nothing that could reach the old page loses access.
 */
export default function MyCertificatesRedirect() {
  redirect("/dashboard/learner/certificates")
}
