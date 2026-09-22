"use client"

import { useAuth } from "@/hooks/use-auth"
import { MessageInbox } from "@/components/message-inbox"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function InstructorMessagesPage() {
  const { user, token } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInstructorCourses = async () => {
      if (!user?.id || !token) {
        setLoading(false)
        return
      }

      try {
        
        // Use the correct endpoint that matches your backend route
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/${user.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          
          // Extract courses from response - backend returns { data: { courses: [...] } }
          const coursesData = data.data?.courses || data.courses || []
          setCourses(coursesData)
        } else {
          // Try fallback endpoint
          const fallbackResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/${user.id}/courses`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          )
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            setCourses(fallbackData.data?.courses || fallbackData.courses || [])
          }
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    fetchInstructorCourses()
  }, [user?.id, token])

  if (!user || !token) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Please log in to view your messages</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <Card className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-muted-foreground">Loading your courses...</p>
          </Card>
        ) : courses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">You are not an instructor for any courses yet</p>
          </Card>
        ) : (
          <MessageInbox 
            enrolledCourses={courses} 
            isStudent={false} 
          />
        )}
      </div>
    </div>
  )
}