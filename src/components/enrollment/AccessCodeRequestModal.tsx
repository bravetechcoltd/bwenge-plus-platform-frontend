// frontend/components/enrollment/AccessCodeRequestModal.tsx

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"

interface AccessCodeRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  institutionName?: string
  onSuccess?: () => void
}

export default function AccessCodeRequestModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  institutionName,
  onSuccess,
}: AccessCodeRequestModalProps) {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const token = localStorage.getItem("bwengeplus_token")
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/request-access-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            course_id: courseId,
            message: message.trim() || undefined,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        setIsSuccess(true)
        toast.success("Access code request submitted successfully!")
        
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 2000)
        }
      } else {
        toast.error(data.message || "Failed to submit request")
      }
    } catch (error) {
      toast.error("Failed to submit request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage("")
      setIsSuccess(false)
      onOpenChange(false)
    }
  }

  const adminType = institutionName ? "Institution Admin" : "System Admin"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isSuccess ? "Request Submitted!" : "Request Access Code"}
          </DialogTitle>
          <DialogDescription>
            {isSuccess 
              ? `Your request has been sent to the ${adminType}. You'll receive an email with your access code when approved.`
              : `Request an access code for "${courseTitle}"`
            }
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Your request has been submitted successfully.
            </p>
            <p className="text-xs text-muted-foreground">
              Please check your email for the access code. This may take a few minutes.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-sm text-primary">
                  <span className="font-semibold">Note:</span> Your request will be sent to the{" "}
                  <span className="font-medium">{adminType}</span>. You'll receive an email with your access code once approved.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Optional Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a note for the administrator..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Include any relevant information about why you need access.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}