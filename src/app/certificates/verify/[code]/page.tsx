"use client"

import { use } from "react"
import { CertificateVerification } from "@/components/certificate/certificate-verification"

/**
 * CERT-CONS-001 §7.3. One of three routes onto the same public verification
 * view. The implementation lives in `CertificateVerification`; this file only
 * names the parameter.
 */
export default function VerifyCertificateByCodePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  return <CertificateVerification code={code} />
}
