"use client"

import { use } from "react"
import { CertificateVerification } from "@/components/certificate/certificate-verification"

/**
 * CERT-CONS-001 §7.3, C-29.
 *
 * This route and `/verify/[id]` were byte-identical copies of each other, and
 * both lagged behind `/certificates/verify/[code]`, which had gained a request
 * timeout and proper handling of a 200 response carrying `valid: false`. The
 * canonical link printed on every certificate points *here*, so the unfixed
 * copy was the one real verifiers hit.
 *
 * All three now render the same component. The parameter is named `id` for
 * backwards compatibility but has always held the verification code.
 */
export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <CertificateVerification code={id} />
}
