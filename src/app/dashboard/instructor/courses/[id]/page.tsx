"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  BookOpen,
  Users,
  Star,
  Clock,
  Edit,
  Eye,
  Plus,
  Trophy,
  Zap,
  Award,
  Calendar,
  Video,
  Image,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import type { Course, Lesson, User } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { LessonDetailModal } from "@/components/course/lesson/lesson-detail-modal"
import CourseBasicInfoForm  from "@/components/course/course-basic-info-modal"
import { useCourses } from "@/hooks/use-courses"


export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("curriculum")
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const { token } = useAuth()
  const { id } = use(params)
  const [students, setStudents] = useState<User[]>([])
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false)
  const { useCourse, updateCourseInCache } = useCourses()
  const { course, loading, mutate } = useCourse(id)

  // Fetch students when course is loaded
  useEffect(() => {
    const fetchStudents = async () => {
      if (!course || !token) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/get/${id}/students`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          const studentsArray = data.data?.students || data.students || []
          setStudents(studentsArray)
        }
      } catch (error) {
        console.error("Failed to fetch students:", error)
      }
    }

    fetchStudents()
  }, [course, id, token])

  const getTotalLessons = () => {
    return course?.modules?.reduce((acc, module) => acc + (module.lessons?.length || 0), 0) || 0
  }

  const getContentTypeIcon = (lesson: Lesson) => {
    const videoUrl = (lesson as any).video_url || lesson.video_url
    if (videoUrl) return <Video className="w-4 h-4 text-blue-500" />
    if (lesson.assessments && lesson.assessments.length > 0) return <Trophy className="w-4 h-4 text-yellow-500" />
    return <Image className="w-4 h-4 text-gray-500" />
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const shouldShowExpandButton = (description: string) => {
    return description && description.length > 150
  }

  const handleViewLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setIsLessonModalOpen(true)
  }

  const handleSaveCourseInfo = async (updates: Partial<Course>) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedCourse = data.data || data.course || data
        await updateCourseInCache(id, updatedCourse)
        mutate()
      }
    } catch (error) {
      console.error("Failed to update course:", error)
      throw error
    }
  }

  const handleDelete = async () => {
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        router.push("/dashboard/instructor/courses")
      }
    } catch (error) {
      console.error("Failed to delete course:", error)
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Button asChild>
          <Link href="/dashboard/instructor/courses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
      </div>
    )
  }

  const isPublished = course.status === "PUBLISHED"
  const rating = typeof course.average_rating === 'string' 
    ? parseFloat(course.average_rating) 
    : course.average_rating || 0
  const enrollmentCount = course.enrollment_count || 0
  const duration = course.duration_minutes || 0
  const updatedAt = course.updated_at ? new Date(course.updated_at) : new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/instructor/courses">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Link>
            </Button>
            <div className="flex gap-2">
              {isPublished ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <Zap className="w-3 h-3 mr-1" />
                  Published
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
              {rating >= 4.8 && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600">
                  <Trophy className="w-3 h-3 mr-1" />
                  Top Rated
                </Badge>
              )}
              {enrollmentCount > 200 && (
                <Badge className="bg-purple-500 hover:bg-purple-600">
                  <Award className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>

          <div className="mb-4">
            <p className={`text-muted-foreground text-lg ${!isDescriptionExpanded ? "line-clamp-3" : ""}`}>
              {course.description}
            </p>
            {shouldShowExpandButton(course.description) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
              >
                {isDescriptionExpanded ? (
                  <>
                    Show less <ChevronUp className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{enrollmentCount} students</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{rating.toFixed(1)} rating</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Updated {updatedAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="rounded" size="sm" onClick={() => setIsEditCourseOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Content
          </Button>

        </div>
      </div>

      {/* Course Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Curriculum</CardTitle>
                  <CardDescription>
                    {course.modules?.length || 0} modules • {getTotalLessons()} lessons •{" "}
                    {formatDuration(duration)}
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/dashboard/instructor/courses/${course.id}/modules`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Manage Content
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {course.modules?.map((module, moduleIndex) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center justify-between w-full mr-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {moduleIndex + 1}
                          </Badge>
                          <div>
                            <div className="font-medium text-left">{module.title}</div>
                            <div className="text-sm text-muted-foreground text-left">{module.description}</div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{module.lessons?.length || 0} lessons</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-4">
                        {module.lessons?.map((lesson, lessonIndex) => {
                          const lessonDuration = (lesson as any).duration_minutes || lesson.duration_minutes || 0
                          const videoUrl = (lesson as any).video_url || lesson.video_url
                          const isPreview = (lesson as any).is_preview || lesson.is_preview || false
                          
                          return (
                            <motion.div
                              key={lesson.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: lessonIndex * 0.1 }}
                              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {getContentTypeIcon(lesson)}
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{lesson.title}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDuration(lessonDuration)}
                                    </span>
                                    {videoUrl && <span>• Video</span>}
                                    {lesson.assessments && lesson.assessments.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        • <Trophy className="w-3 h-3" />
                                        {lesson.assessments.length} assessment{lesson.assessments.length > 1 ? "s" : ""}
                                      </span>
                                    )}
                                    {isPreview && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs h-5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        Preview
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleViewLesson(lesson)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {(!course.modules || course.modules.length === 0) && (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No content yet</h3>
                  <p className="text-muted-foreground mb-6">Start building your course by adding modules and lessons</p>
                  <Button asChild>
                    <Link href={`/dashboard/instructor/courses/${course.id}/modules`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Module
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                {enrollmentCount} students enrolled • Track their progress and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Enrolled Students</h4>
                  {students.length === 0 ? (
                    <span className="text-muted-foreground">No students enrolled yet.</span>
                  ) : (
                    students.slice(0, 5).map((student, index) => {
                      const firstName = student.first_name || student.first_name || "Unknown"
                      const lastName = student.last_name || student.last_name || ""
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">{firstName[0]}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {firstName} {lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <Button
                  className="w-full bg-transparent"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/instructor/courses/${course.id}/students`)}
                >
                  View All Students
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Settings</CardTitle>
                <CardDescription>Manage your course visibility and access settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Course Status</div>
                    <div className="text-sm text-muted-foreground">Control whether students can enroll</div>
                  </div>
                  <Badge className={isPublished ? "bg-green-500" : "bg-gray-500"}>
                    {isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Course Price</div>
                    <div className="text-sm text-muted-foreground">Set your course pricing</div>
                  </div>
                  <div className="text-lg font-bold text-primary">${course.price || 0}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full bg-destructive/20 border border-destructive/35">
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>Irreversible actions for this course</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full" onClick={handleDelete}>
                  Delete Course
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* FIXED: Only render modals when they should be open */}
      {isLessonModalOpen && (
        <LessonDetailModal 
          lesson={selectedLesson} 
          open={isLessonModalOpen} 
          onOpenChange={setIsLessonModalOpen} 
        />
      )}
      
      {isEditCourseOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-6xl ">
            <CourseBasicInfoForm
              course={course}
              onSave={async (updates) => {
                await handleSaveCourseInfo(updates)
                setIsEditCourseOpen(false)
              }}
              onCancel={() => setIsEditCourseOpen(false)}
              isCreating={false}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Using regular div */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg border p-6 shadow-lg w-full max-w-lg animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex flex-col gap-2 text-center sm:text-left mb-4">
              <h2 className="text-lg leading-none font-semibold">Delete Course</h2>
              <p className="text-muted-foreground text-sm">
                Are you sure you want to delete this course? This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}