"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Share2, Linkedin } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"

interface CertificateProps {
  studentName: string
  courseName: string
  score: number
  instructorName: string
  institutionName: string
  directorName?: string
  completionDate: string
  verificationCode: string
  instructorSignature?: string
  directorSignature?: string
  organizationStamp?: string
}

export function Certificate({
  studentName,
  courseName,
  score,
  instructorName,
  institutionName,
  directorName = "Institution Director",
  completionDate,
  verificationCode,
  instructorSignature,
  directorSignature,
  organizationStamp,
}: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const { token } = useAuth()

  useEffect(() => {
    // Generate QR code URL for verification
    const verificationUrl = `${window.location.origin}/verify-certificate/${verificationCode}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verificationUrl)}`
    setQrCodeUrl(qrUrl)
  }, [verificationCode])

  const handleDownload = async () => {
    if (!certificateRef.current) return

    try {
      // Create a new window with the certificate content
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow popups to download the certificate.",
          variant: "destructive",
        })
        return
      }

      // Get the certificate HTML
      const certificateHTML = certificateRef.current.innerHTML
      const verificationUrl = `${window.location.origin}/verify-certificate/${verificationCode}`

      // Write the HTML to the new window with proper styling
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Certificate - ${courseName}</title>
            <style>
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              @page {
                size: A4 landscape;
                margin: 0;
              }
              
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: white;
              }
              
              .certificate-container {
                width: 297mm;
                height: 210mm;
                margin: 0 auto;
                background-color: #ffffff;
                position: relative;
                page-break-after: always;
              }
              
              .certificate {
                width: 100%;
                height: 100%;
                padding: 30px;
                box-sizing: border-box;
                position: relative;
                background-color: #ffffff;
                border: 15px solid #0158B7;
                display: flex;
                flex-direction: column;
              }
              
              .inner-border {
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                bottom: 20px;
                border: 2px solid #0158B7;
                pointer-events: none;
              }
              
              .header {
                text-align: center;
                margin-bottom: 15px;
                position: relative;
                z-index: 10;
              }
              
              .header-subtitle {
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 3px;
                text-transform: uppercase;
                margin-bottom: 6px;
                color: #0158B7;
              }
              
              .header-title {
                font-family: Georgia, serif;
                font-size: 42px;
                font-weight: bold;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: #0158B7;
              }
              
              .header-type {
                font-size: 14px;
                font-weight: 300;
                letter-spacing: 1px;
                color: #4b5563;
              }
              
              .content {
                text-align: center;
                margin: 20px 0;
                position: relative;
                z-index: 10;
                flex: 1;
              }
              
              .certify-text {
                font-size: 13px;
                margin-bottom: 15px;
                font-weight: 300;
                color: #6b7280;
              }
              
              .student-name {
                font-family: Georgia, serif;
                font-size: 34px;
                font-weight: bold;
                margin: 15px 0;
                padding: 12px 0;
                display: inline-block;
                min-width: 60%;
                color: #0158B7;
                border-bottom: 3px solid #0158B7;
              }
              
              .course-text {
                font-size: 13px;
                margin: 15px 0;
                line-height: 1.5;
                color: #6b7280;
              }
              
              .course-name {
                font-weight: 600;
                font-size: 16px;
                color: #1f2937;
              }
              
              .score-label {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 8px;
              }
              
              .score-badge {
                display: inline-block;
                padding: 6px 22px;
                border-radius: 25px;
                font-size: 20px;
                font-weight: 600;
                margin: 12px 0;
                background-color: #0158B7;
                color: #ffffff;
              }
              
              .institution-text {
                font-size: 13px;
                color: #6b7280;
                margin-top: 12px;
              }
              
              .institution-name {
                font-weight: bold;
                color: #1f2937;
              }
              
              .footer {
                display: flex;
                justify-content: space-around;
                align-items: center;
                margin-top: 25px;
                padding-top: 20px;
                position: relative;
                z-index: 10;
              }
              
              .signature-block {
                text-align: center;
                flex: 1;
                padding: 0 15px;
              }
              
              .signature-line {
                margin-bottom: 6px;
                width: 200px;
                margin-left: auto;
                margin-right: auto;
                border-top: 2px solid #0158B7;
              }
              
              .signature-label {
                font-size: 11px;
                margin-bottom: 4px;
                color: #6b7280;
              }
              
              .signature-name {
                font-weight: 600;
                font-size: 13px;
                color: #1f2937;
              }
              
              .seal {
                width: 90px;
                height: 90px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 4px solid #0158B7;
                background-color: #ffffff;
              }
              
              .seal-image {
                width: 100px;
                height: 100px;
                object-fit: contain;
              }
              
              .signature-image {
                max-width: 150px;
                max-height: 60px;
                object-fit: contain;
                margin-bottom: 8px;
              }
              
              .seal-text {
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                color: #0158B7;
                line-height: 1.3;
              }
              
              .date-text {
                text-align: center;
                margin-top: 15px;
                font-size: 11px;
                color: #9ca3af;
                position: relative;
                z-index: 10;
              }
              
              .verification {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin-top: 15px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
                position: relative;
                z-index: 10;
              }
              
              .qr-code img {
                width: 60px;
                height: 60px;
                padding: 3px;
                border: 2px solid #0158B7;
                background-color: #ffffff;
              }
              
              .verification-text {
                font-size: 9px;
                max-width: 320px;
                color: #6b7280;
                line-height: 1.3;
              }
              
              .verification-link {
                color: #0158B7;
                text-decoration: none;
                word-break: break-all;
              }
              
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  color-adjust: exact;
                }
                
                .certificate-container {
                  width: 297mm;
                  height: 210mm;
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="certificate-container">
              <div class="certificate">
                <div class="inner-border"></div>
                
                <div class="header">
                  <div class="header-subtitle">Bwenge Plus</div>
                  <div class="header-title">Certificate</div>
                  <div class="header-type">of Completion</div>
                </div>
                
                <div class="content">
                  <div class="certify-text">This is to certify that</div>
                  
                  <div class="student-name">${studentName}</div>
                  
                  <div class="course-text">
                    has successfully completed the course<br/>
                    <span class="course-name">${courseName}</span>
                  </div>
                  
                  <div class="score-label">with a score of</div>
                  
                  <div class="score-badge">${score}%</div>
                  
                  <div class="institution-text">
                    at <span class="institution-name">${institutionName}</span>
                  </div>
                </div>
                
                <div class="footer">
                  <div class="signature-block">
                    ${instructorSignature ? `<img src="${instructorSignature}" alt="Instructor Signature" class="signature-image" crossorigin="anonymous" />` : '<div class="signature-line"></div>'}
                    <div class="signature-label">Instructor</div>
                    <div class="signature-name">${instructorName}</div>
                  </div>
                  
                  ${
                    organizationStamp
                      ? `
                    <div class="seal">
                      <img src="${organizationStamp}" alt="Official Seal" class="seal-image" crossorigin="anonymous" />
                    </div>
                  `
                      : `
                    <div class="seal">
                      <div class="seal-text">BWENGE<br/>PLUS</div>
                    </div>
                  `
                  }
                  
                  <div class="signature-block">
                    ${directorSignature ? `<img src="${directorSignature}" alt="Director Signature" class="signature-image" crossorigin="anonymous" />` : '<div class="signature-line"></div>'}
                    <div class="signature-label">Director</div>
                    <div class="signature-name">${directorName}</div>
                  </div>
                </div>
                
                <div class="date-text">
                  Issued on ${new Date(completionDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                
                <div class="verification">
                  <div class="qr-code">
                    <img src="${qrCodeUrl}" alt="QR Code" crossorigin="anonymous" />
                  </div>
                  <div class="verification-text">
                    You can verify this certificate on: 
                    <a href="${verificationUrl}" class="verification-link" target="_blank">
                      ${verificationUrl}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `)

      printWindow.document.close()

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }

      toast({
        title: "Success",
        description: "Opening print dialog. Save as PDF to download.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShareLinkedIn = () => {
    const verificationUrl = `${window.location.origin}/verify-certificate/${verificationCode}`
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`
    window.open(linkedInUrl, "_blank", "width=600,height=600")

    toast({
      title: "Opening LinkedIn",
      description: "Share your certificate on LinkedIn!",
    })
  }

  const handleShare = () => {
    const verificationUrl = `${window.location.origin}/verify-certificate/${verificationCode}`
    const shareText = `I've completed ${courseName} with a score of ${score}%!`

    if (navigator.share) {
      navigator.share({
        title: "My Course Certificate",
        text: shareText,
        url: verificationUrl,
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${verificationUrl}`)
      toast({
        title: "Link Copied",
        description: "Certificate details copied to clipboard!",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div ref={certificateRef} className="certificate-container bg-card">
        <div
          className="certificate p-[60px] shadow-2xl relative"
          style={{
            backgroundColor: "#ffffff",
            border: "20px solid #0158B7",
          }}
        >
          {/* Inner border */}
          <div
            className="absolute top-[40px] left-[40px] right-[40px] bottom-[40px] pointer-events-none"
            style={{ border: "2px solid #0158B7" }}
          />

          {/* Header */}
          <div className="text-center mb-10 relative z-10">
            <div
              className="text-sm font-semibold tracking-[3px] uppercase mb-2.5"
              style={{ color: "#0158B7", backgroundColor: "transparent" }}
            >
              Bwenge Plus
            </div>
            <div
              className="font-serif text-5xl font-bold mb-2.5 uppercase tracking-[2px]"
              style={{ color: "#0158B7", backgroundColor: "transparent" }}
            >
              Certificate
            </div>
            <div
              className="text-lg font-light tracking-wide"
              style={{ color: "#4b5563", backgroundColor: "transparent" }}
            >
              of Completion
            </div>
          </div>

          {/* Content */}
          <div className="text-center my-12 relative z-10">
            <div className="text-base mb-7 font-light" style={{ color: "#6b7280", backgroundColor: "transparent" }}>
              This is to certify that
            </div>

            <div
              className="font-serif text-[42px] font-bold my-7 py-5 inline-block min-w-[60%]"
              style={{ color: "#0158B7", borderBottom: "3px solid #0158B7", backgroundColor: "transparent" }}
            >
              {studentName}
            </div>

            <div
              className="text-base my-7 leading-relaxed"
              style={{ color: "#6b7280", backgroundColor: "transparent" }}
            >
              has successfully completed the course
              <br />
              <span className="font-semibold text-xl" style={{ color: "#1f2937", backgroundColor: "transparent" }}>
                {courseName}
              </span>
            </div>

            <div className="text-base" style={{ color: "#6b7280", backgroundColor: "transparent" }}>
              with a score of
            </div>

            <div
              className="inline-block px-7 py-2.5 rounded-full text-2xl font-semibold my-5"
              style={{ backgroundColor: "#0158B7", color: "#ffffff" }}
            >
              {score}%
            </div>

            <div className="text-base" style={{ color: "#6b7280", backgroundColor: "transparent" }}>
              at <strong style={{ color: "#1f2937" }}>{institutionName}</strong>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-around mt-[60px] pt-10 relative z-10">
            <div className="text-center flex-1 px-5">
              {instructorSignature ? (
                <img
                  src={instructorSignature || "/placeholder.svg"}
                  alt="Instructor Signature"
                  className="max-w-[150px] max-h-[60px] object-contain mx-auto mb-2.5"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="mb-2.5 w-[250px] mx-auto" style={{ borderTop: "2px solid #0158B7" }} />
              )}
              <div className="text-sm mb-1" style={{ color: "#6b7280", backgroundColor: "transparent" }}>
                Instructor
              </div>
              <div className="font-semibold text-base" style={{ color: "#1f2937", backgroundColor: "transparent" }}>
                {instructorName}
              </div>
            </div>

            {organizationStamp ? (
              <div className="w-[120px] h-[120px] flex items-center justify-center">
                <img
                  src={organizationStamp || "/placeholder.svg"}
                  alt="Official Seal"
                  className="max-w-full max-h-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
            ) : (
              <div
                className="w-[120px] h-[120px] rounded-full flex items-center justify-center opacity-90"
                style={{ border: "5px solid #0158B7", backgroundColor: "#ffffff" }}
              >
                <div className="text-center text-xs font-semibold" style={{ color: "#0158B7" }}>
                  BWENGE
                  <br />
                  PLUS
                </div>
              </div>
            )}

            <div className="text-center flex-1 px-5">
              {directorSignature ? (
                <img
                  src={directorSignature || "/placeholder.svg"}
                  alt="Director Signature"
                  className="max-w-[150px] max-h-[60px] object-contain mx-auto mb-2.5"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="mb-2.5 w-[250px] mx-auto" style={{ borderTop: "2px solid #0158B7" }} />
              )}
              <div className="text-sm mb-1" style={{ color: "#6b7280", backgroundColor: "transparent" }}>
                Director
              </div>
              <div className="font-semibold text-base" style={{ color: "#1f2937", backgroundColor: "transparent" }}>
                {directorName}
              </div>
            </div>
          </div>

          {/* Date */}
          <div
            className="text-center mt-7 text-sm relative z-10"
            style={{ color: "#9ca3af", backgroundColor: "transparent" }}
          >
            Issued on{" "}
            {new Date(completionDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          {/* Verification */}
          <div
            className="flex items-center justify-center gap-5 mt-7 pt-5 relative z-10"
            style={{ borderTop: "1px solid #e5e7eb" }}
          >
            <div className="qr-code">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl || "/placeholder.svg"}
                  alt="Verification QR Code"
                  className="w-20 h-20 p-1"
                  style={{ border: "2px solid #0158B7", backgroundColor: "#ffffff" }}
                  crossOrigin="anonymous"
                />
              )}
            </div>
            <div className="text-xs max-w-[400px]" style={{ color: "#6b7280", backgroundColor: "transparent" }}>
              You can verify this certificate on:{" "}
              <a
                href={`${window.location.origin}/verify-certificate/${verificationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline break-all hover:underline"
                style={{ color: "#0158B7" }}
              >
                {window.location.origin}/verify-certificate/{verificationCode}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button onClick={handleDownload} className="flex items-center gap-2 bg-[#0158B7] hover:bg-[#014A9C]">
          <Download className="w-4 h-4" />
          Download Certificate
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShareLinkedIn} className="cursor-pointer">
              <Linkedin className="w-4 h-4 mr-2" />
              Share on LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
              <Share2 className="w-4 h-4 mr-2" />
              Share Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}