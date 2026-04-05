// frontend/components/enrollment/AccessCodeRedeemInput.tsx

"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, XCircle, Key } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface AccessCodeRedeemInputProps {
  courseId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AccessCodeRedeemInput({
  courseId,
  onSuccess,
  onCancel,
}: AccessCodeRedeemInputProps) {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accessCode.trim()) {
      setError("Please enter your access code")
      return
    }

    setError(null)
    setIsVerifying(true)

    try {
      const token = localStorage.getItem("bwengeplus_token")
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/redeem-access-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            course_id: courseId,
            access_code: accessCode.trim().toUpperCase(),
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        toast.success("Access code verified! You are now enrolled.")
        
        if (onSuccess) {
          onSuccess()
        } else {
          // Redirect to course learn page
          router.push(`/courses/${courseId}/learn`)
        }
      } else {
        setError(data.message || "Invalid access code")
        toast.error(data.message || "Invalid access code")
      }
    } catch (error) {
      setError("Failed to verify code. Please try again.")
      toast.error("Failed to verify code. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="access-code" className="text-sm font-medium">
            Enter Access Code
          </Label>
          {error && (
            <span className="text-xs text-destructive flex items-center">
              <XCircle className="w-3 h-3 mr-1" />
              {error}
            </span>
          )}
        </div>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="access-code"
            type="text"
            placeholder="e.g., ABC123XYZ"
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value.toUpperCase())
              setError(null)
            }}
            disabled={isVerifying}
            className="pl-10 font-mono uppercase"
            maxLength={20}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Check your email for the access code you received
        </p>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isVerifying}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isVerifying || !accessCode.trim()}
          className={onCancel ? "flex-1" : "w-full"}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify & Enroll
            </>
          )}
        </Button>
      </div>
    </form>
  )
}