"use client"

import { useAuth } from "@/hooks/use-auth"
import { MessageInbox } from "@/components/message-inbox"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

export default function StudentMessagesPage() {
  const { user, token } = useAuth()
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!user?.id || !token) {
        setLoading(false)
        return
      }

      try {
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              include_course_details: true,
              limit: 100,
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          
          // Extract courses from enrollments and normalize instructor data
          const courses = data.data?.map((enrollment: any) => ({
            ...enrollment.course,
            instructor: enrollment.course?.instructor ? {
              ...enrollment.course.instructor,
              id: enrollment.course.instructor.id,
              first_name: enrollment.course.instructor.first_name || "",
              last_name: enrollment.course.instructor.last_name || "",
              firstName: enrollment.course.instructor.first_name || "",
              lastName: enrollment.course.instructor.last_name || "",
              email: enrollment.course.instructor.email,
              profile_picture_url: enrollment.course.instructor.profile_picture_url,
              profilePicUrl: enrollment.course.instructor.profile_picture_url,
            } : undefined
          })) || []
          setEnrolledCourses(courses)
        } else {
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    fetchEnrolledCourses()
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
        ) : enrolledCourses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">You are not enrolled in any courses yet</p>
          </Card>
        ) : (
          <MessageInbox 
            enrolledCourses={enrolledCourses} 
            isStudent={true} 
          />
        )}
      </div>
    </div>
  )
}