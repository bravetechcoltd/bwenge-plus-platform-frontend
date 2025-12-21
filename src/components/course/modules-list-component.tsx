"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import type { Course } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { CourseTreeBuilder } from "@/components/course/tree-builder/course-tree-builder"
import { useRouter } from "next/navigation"

interface ModulesListComponentProps {
  courseId: string
  backLink: string
  backLabel?: string
  role: "LEARNER" | "INSTRUCTOR" | "CONTENT_CREATOR" | "ADMIN" | "SYSTEM_ADMIN"
}

export function ModulesListComponent({
  courseId,
  backLink,
  backLabel = "Back to Course",
  role,
}: ModulesListComponentProps) {
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { token, user } = useAuth()
  const router = useRouter()

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!token) {
        toast.error("Authentication required")
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch course")
        }

        const data = await response.json()
        const courseData = data.data || data.course || data
        
        if (courseData) {
          setCourse(courseData)
          // Initialize modules with proper structure
          const initialModules = courseData.modules?.map((module: any) => ({
            ...module,
            _status: 'synced' as const,
            lessons: module.lessons?.map((lesson: any) => ({
              ...lesson,
              _status: 'synced' as const,
              assessments: lesson.assessments?.map((assessment: any) => ({
                ...assessment,
                _status: 'synced' as const
              })) || []
            })) || [],
            final_assessment: module.final_assessment ? {
              ...module.final_assessment,
              _status: 'synced' as const
            } : undefined
          })) || []
          
          setModules(initialModules)
        } else {
          setCourse(null)
          setModules([])
        }
      } catch (error) {
        console.error("Failed to fetch course:", error)
        toast.error("Failed to load course")
        setCourse(null)
        setModules([])
      } finally {
        setLoading(false)
      }
    }

    if (courseId && token) {
      fetchCourse()
    }
  }, [courseId, token])

  // Save modules to backend
  const saveModules = async () => {
    if (!courseId || !token || !user) {
      toast.error("Authentication required")
      return
    }

    setSaving(true)
    try {
      // Prepare modules data according to backend structure
      const modulesData = modules.map((module, index) => {
        const moduleData: any = {
          title: module.title,
          description: module.description || "",
          order_index: module.order_index || index + 1,
          estimated_duration_hours: module.estimated_duration_hours || 0,
          lessons: module.lessons?.map((lesson: any, lessonIndex: number) => {
            const lessonData: any = {
              title: lesson.title,
              content: lesson.content || "",
              video_url: lesson.video_url || "",
              thumbnail_url: lesson.thumbnail_url || "",
              duration_minutes: lesson.duration_minutes || 0,
              order_index: lesson.order_index || lessonIndex + 1,
              type: lesson.type || "VIDEO",
              is_preview: lesson.is_preview || false,
              resources: lesson.resources || [],
              assessments: lesson.assessments?.map((assessment: any) => {
                const assessmentData: any = {
                  title: assessment.title,
                  description: assessment.description || "",
                  type: assessment.type || "QUIZ",
                  passing_score: assessment.passing_score || 70,
                  max_attempts: assessment.max_attempts || 3,
                  time_limit_minutes: assessment.time_limit_minutes || null,
                  questions: (assessment.questions || []).map((q: any, qIndex: number) => ({
                    question: q.question,
                    type: q.type || "MULTIPLE_CHOICE",
                    options: q.options || [],
                    correct_answer: q.correct_answer || "",
                    points: q.points || 1,
                    order_index: q.order_index || qIndex + 1,
                  }))
                }
                
                // Include ID if it exists
                if (assessment.id) {
                  assessmentData.id = assessment.id
                }
                
                return assessmentData
              }) || []
            }
            
            // Include ID if it exists
            if (lesson.id) {
              lessonData.id = lesson.id
            }
            
            return lessonData
          }) || [],
        }
        
        // Include module final assessment
        if (module.final_assessment) {
          moduleData.final_assessment = {
            title: module.final_assessment.title,
            type: module.final_assessment.type === "ASSESSMENT" ? "assessment" : "project",
            description: module.final_assessment.description || "",
            instructions: module.final_assessment.description || "",
            passing_score: module.final_assessment.passing_score || 70,
            time_limit_minutes: module.final_assessment.time_limit_minutes || null,
            fileRequired: false,
            questions: (module.final_assessment.questions || []).map((q: any, qIndex: number) => ({
              question: q.question,
              type: q.type || "MULTIPLE_CHOICE",
              options: q.options || [],
              correct_answer: q.correct_answer || "",
              points: q.points || 1,
              order_index: q.order_index || qIndex + 1,
            }))
          }
          
          // Include ID if it exists
          if (module.final_assessment.id) {
            moduleData.final_assessment.id = module.final_assessment.id
          }
        }
        
        // Include module ID if it exists
        if (module.id) {
          moduleData.id = module.id
        }
        
        return moduleData
      })

      // Send update request using the correct endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/modules`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modules: modulesData }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update modules")
      }

      const result = await response.json()
      
      // Update local state with synced data
      if (result.data?.modules) {
        const syncedModules = result.data.modules.map((module: any) => ({
          ...module,
          _status: 'synced' as const
        }))
        setModules(syncedModules)
      }

      toast.success("Course modules updated successfully!")
      
      // Refresh course data
      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCourse(data.data || data.course || data)
      }

    } catch (error: any) {
      console.error("Failed to save modules:", error)
      toast.error(error.message || "Failed to save modules")
    } finally {
      setSaving(false)
    }
  }

  // Handle successful save from CourseTreeBuilder
  const handleSaveSuccess = async () => {
    // Refresh course data after successful save
    if (!courseId || !token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const courseData = data.data || data.course || data
        setCourse(courseData)
      }
    } catch (error) {
      console.error("Failed to refresh course:", error)
    }
  }

  // Determine back URL based on role
  const getBackUrl = () => {
    switch (role) {
      case "SYSTEM_ADMIN":
        return `/dashboard/system-admin/courses/${courseId}`
      case "INSTRUCTOR":
        return `/dashboard/instructor/courses/${courseId}`
      case "ADMIN":
        return `/dashboard/admin/courses/${courseId}`
      default:
        return backLink
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Button asChild>
          <Link href={backLink}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Link>
        </Button>
      </div>
    )
  }

  // Check if user has permission to edit this course
  const canEdit = user?.bwenge_role === "SYSTEM_ADMIN" || 
                 (user?.bwenge_role === "INSTITUTION_ADMIN" && course.institution_id === user.primary_institution_id) ||
                 course.instructor_id === user?.id

  if (!canEdit) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Permission Denied</h1>
        <p className="text-muted-foreground mb-6">You don't have permission to edit this course.</p>
        <Button asChild>
          <Link href={getBackUrl()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={getBackUrl()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Manage Course Content</h1>
          <p className="text-muted-foreground">{course.title}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500">
              {course.modules?.length || 0} modules • 
              {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} lessons • 
              {modules.reduce((acc, m) => acc + (m.lessons?.reduce((acc2: number, l: any) => 
                acc2 + (l.assessments?.length || 0), 0) || 0), 0)} assessments
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveModules} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <CourseTreeBuilder
        modules={modules}
        setModules={setModules}
        type="update"
        loading={saving}
        courseId={courseId}
        onSave={handleSaveSuccess}
        onNext={saveModules}
        onPrevious={() => router.push(getBackUrl())}
      />
    </div>
  )
}