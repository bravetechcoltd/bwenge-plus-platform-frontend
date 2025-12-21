"use client"

import { useAuth } from "@/hooks/use-auth"
import { MessageInbox } from "@/components/message-inbox"
import { useCourses } from "@/hooks/use-courses"
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
        console.log("📚 Fetching enrolled courses for user:", user.id)
        
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
          console.log("✅ Enrolled courses response:", data)
          
          // Extract courses from enrollments
          const courses = data.data?.map((enrollment: any) => enrollment.course) || []
          setEnrolledCourses(courses)
        } else {
          console.error("❌ Failed to fetch enrolled courses:", response.status)
        }
      } catch (error) {
        console.error("❌ Error fetching enrolled courses:", error)
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

  // Transform courses to the expected format
  const transformedCourses = enrolledCourses.map(course => ({
    ...course,
    instructor: course.instructor ? {
      ...course.instructor,
      firstName: course.instructor.first_name || "",
      lastName: course.instructor.last_name || "",
      email: course.instructor.email,
      id: course.instructor.id,
      avatar: course.instructor.profile_picture_url
    } : undefined
  }))

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <Card className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-muted-foreground">Loading your courses...</p>
          </Card>
        ) : transformedCourses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">You are not enrolled in any courses yet</p>
          </Card>
        ) : (
          <MessageInbox 
            enrolledCourses={transformedCourses} 
            isStudent={true} 
          />
        )}
      </div>
    </div>
  )
}