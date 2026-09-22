"use client"

import { useAuth } from "@/hooks/use-auth"
import { MessageInbox } from "@/components/message-inbox"
import { useCourses } from "@/hooks/use-courses"
import { Card } from "@/components/ui/card"

export default function InstructorMessagesPage() {
  const { user, token } = useAuth()
  const { useCoursesByType } = useCourses()
  const { courses: allCourses, loading } = useCoursesByType("all")

  if (!user || !token) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading your courses...</p>
          </Card>
        ) : allCourses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No courses yet</p>
          </Card>
        ) : (
          <MessageInbox isStudent={false} />
        )}
      </div>
    </div>
  )
}
