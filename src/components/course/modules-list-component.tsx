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
import { fetcher } from "@/lib/fetcher"
import { ErrorState } from "@/components/system/error-state"
import { isPrivilegedForCourse } from "@/lib/auth/authorization"
import type { SessionUser } from "@/lib/auth/session"

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
  // AXM-CONS-001 C-05: the catch below turned every failure into a toast and a
  // null course, so a 403 and a 500 both reached the "Course not found" branch.
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { token, user, isRestoring } = useAuth()
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
        setLoadError(null)
        // `fetcher` throws an ApiError carrying the status, so the catch below
        // can tell a 403 from a 500 from an offline browser (C-04).
        const data = await fetcher<any>(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
          token
        )
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
        // Kept, so nothing that relied on the toast changes — but the error is
        // now also held, so the page can say what actually went wrong instead
        // of claiming the course does not exist.
        toast.error("Failed to load course")
        setLoadError(error)
        setCourse(null)
        setModules([])
      } finally {
        setLoading(false)
      }
    }

    if (courseId && token) {
      fetchCourse()
    }
  }, [courseId, token, reloadKey])

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
          /*
           * DND-002. Position, not the stored value.
           *
           * This screen builds its own payload rather than using the
           * builder's, and this line still read
           * `module.order_index || index + 1` — so a drag here would have
           * been saved back in the old order. Same defect, second copy.
           */
          order_index: index + 1,
          estimated_duration_hours: module.estimated_duration_hours || 0,
          lessons: module.lessons?.map((lesson: any, lessonIndex: number) => {
            const lessonData: any = {
              title: lesson.title,
              content: lesson.content || "",
              video_url: lesson.video_url || "",
              thumbnail_url: lesson.thumbnail_url || "",
              duration_minutes: lesson.duration_minutes || 0,
              // DND-002: position, as above.
              order_index: lessonIndex + 1,
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

  // The session may still be restoring, in which case no request has been made
  // yet — which is not the same thing as one that came back empty (C-03).
  if (loading || isRestoring || !token) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary dark:bg-secondary rounded w-1/3 mb-4" />
          <div className="h-4 bg-secondary dark:bg-secondary rounded w-2/3 mb-8" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <ErrorState
        variant="page"
        error={loadError}
        onRetry={() => setReloadKey((k) => k + 1)}
        action={{ href: backLink, label: backLabel }}
      />
    )
  }

  if (!course) {
    return (
      <ErrorState
        variant="page"
        kind="not-found"
        action={{ href: backLink, label: backLabel }}
      />
    )
  }

  // Check if user has permission to edit this course.
  //
  // This was a seventh copy of the institution-admin predicate (A-06), narrower
  // than the rest because it required `primary_institution_id` to match
  // exactly. `isPrivilegedForCourse` is the shared rule and mirrors the
  // server's own `isPrivilegedForCourse`, so the button and the API agree.
  const canEdit = isPrivilegedForCourse(user as SessionUser | null, course)

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
            <span className="text-sm text-muted-foreground">
              {course.modules?.length || 0} modules • 
              {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} lessons • 
              {modules.reduce((acc, m) => acc + (m.lessons?.reduce((acc2: number, l: any) => 
                acc2 + (l.assessments?.length || 0), 0) || 0), 0)} assessments
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveModules} disabled={saving} className="bg-primary hover:bg-primary">
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