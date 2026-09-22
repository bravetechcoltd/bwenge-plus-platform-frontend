"use client"

/**
 * ============================================================================
 * CertificateActions — Download, Share, Copy link, Verify, Print
 * ============================================================================
 *
 * CERT-CONS-001 §6.3, §7.1. One implementation, used everywhere. Before this,
 * four call sites each built their own download URL and three of them built one
 * that could not work (C-19), while two reported success unconditionally
 * whether or not the request had succeeded (C-32).
 */

import { useCallback, useState } from "react"
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Linkedin,
  Loader2,
  Mail,
  Printer,
  Share2,
  Twitter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { CanonicalCertificate } from "./types"
import { downloadCertificate, describeCertificateError } from "./use-certificate"

export interface CertificateActionsProps {
  certificate: CanonicalCertificate
  className?: string
  /** Hide the print action where a print view is not reachable. */
  showPrint?: boolean
  size?: "sm" | "default"
}

export function CertificateActions({
  certificate,
  className,
  showPrint = true,
  size = "default",
}: CertificateActionsProps) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const revoked = certificate.status === "REVOKED"

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadCertificate(certificate.id)
      toast({
        title: "Download started",
        description: "Your certificate is opening in a new tab.",
      })
    } catch (error) {
      // Reported honestly. The reference toasted "Certificate download
      // started" whether or not the request had succeeded, so a 403 landed as
      // raw JSON in a new tab while the UI said it had worked.
      toast({
        title: "Couldn't download the certificate",
        description: describeCertificateError(error),
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }, [certificate.id])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(certificate.links.verification_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Link copied",
        description: "Anyone with this link can verify your certificate.",
      })
    } catch {
      toast({
        title: "Couldn't copy the link",
        description: certificate.links.verification_url,
        variant: "destructive",
      })
    }
  }, [certificate.links.verification_url])

  const handleShare = useCallback(async () => {
    const scoreText =
      certificate.final_score !== null
        ? ` with a score of ${Math.round(certificate.final_score)}%`
        : ""
    const shareText = `I've completed ${certificate.course.title}${scoreText}!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Course Certificate",
          text: shareText,
          url: certificate.links.verification_url,
        })
        return
      } catch {
        // Share sheet dismissed — fall through to the clipboard.
      }
    }

    await handleCopy()
  }, [certificate, handleCopy])

  /**
   * Every channel the product offered before consolidation, in one place.
   * LinkedIn and the native share sheet came from the Learning Space; Twitter,
   * Facebook and email came from the certificates page. Dropping any of them
   * would be a regression, so all five live here.
   */
  const handleSocialShare = useCallback(
    (platform: "linkedin" | "twitter" | "facebook" | "email") => {
      const url = certificate.links.verification_url
      const text = `I've earned a certificate for completing "${certificate.course.title}" on BwengePlus! 🎓`

      const targets: Record<typeof platform, string> = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          text
        )}&url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        email: `mailto:?subject=${encodeURIComponent(
          "My Course Certificate"
        )}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
      }

      window.open(
        targets[platform],
        platform === "email" ? "_self" : "_blank",
        "width=600,height=500,noopener,noreferrer"
      )
    },
    [certificate.links.verification_url, certificate.course.title]
  )

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        onClick={handleDownload}
        disabled={downloading || revoked}
        size={size}
        className="gap-2"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download PDF
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
            <Share2 className="mr-2 h-4 w-4" />
            Share link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSocialShare("linkedin")}
            className="cursor-pointer"
          >
            <Linkedin className="mr-2 h-4 w-4" />
            Share on LinkedIn
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSocialShare("twitter")}
            className="cursor-pointer"
          >
            <Twitter className="mr-2 h-4 w-4" />
            Share on X
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSocialShare("facebook")}
            className="cursor-pointer"
          >
            <Facebook className="mr-2 h-4 w-4" />
            Share on Facebook
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSocialShare("email")}
            className="cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4" />
            Share by email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-success" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy verification link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              window.open(
                certificate.links.verification_url,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open verification page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showPrint ? (
        <Button
          variant="outline"
          size={size}
          className="gap-2"
          onClick={() =>
            window.open(
              `/certificates/${certificate.id}/print`,
              "_blank",
              "noopener,noreferrer"
            )
          }
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      ) : null}
    </div>
  )
}
