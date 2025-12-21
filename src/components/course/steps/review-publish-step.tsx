// @ts-nocheck

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  AlertTriangle,
  BookOpen,
  PlayCircle,
  Trophy,
  Users,
  Target,
  Rocket,
  Eye,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  Lock,
  Building,
} from "lucide-react"
import { CourseCompletionCelebration } from "../gamification/course-completion-celebration"
import type { Course, Module } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

interface ReviewPublishStepProps {
  courseData: Partial<Course>
  modules: Module[]
  onPrevious: () => void
  isLastStep: boolean
  onSubmit?: () => Promise<any>
  isSubmitting?: boolean
  // Add this prop
  thumbnailFile?: File | null
}

export function ReviewPublishStep({
  courseData,
  modules,
  onPrevious,
  isLastStep,
  onSubmit,
  isSubmitting = false,
  thumbnailFile = null,
}: ReviewPublishStepProps) {
  const [isPublished, setIsPublished] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const { user } = useAuth()
  const router = useRouter()

  // Debug logging
  console.log("[ReviewPublishStep] Modules:", modules.length)
  modules.forEach((module, idx) => {
    console.log(`Module ${idx + 1}: ${module.title}`, {
      finalAssessment: module.final_assessment ? "Yes" : "No",
      details: module.final_assessment
    })
  })

  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0)
  const totalAssessments = modules.reduce(
    (acc, module) =>
      acc + (module.lessons?.reduce((lessonAcc, lesson) => lessonAcc + (lesson.assessments?.length || 0), 0) || 0),
    0,
  )
  const totalModuleFinalAssessments = modules.filter(m => m.final_assessment).length
  const totalQuestions = modules.reduce(
    (acc, module) =>
      acc +
      (module.lessons?.reduce(
        (lessonAcc, lesson) =>
          lessonAcc +
          (lesson.assessments?.reduce((assessmentAcc, assessment) => assessmentAcc + (assessment.questions?.length || 0), 0) ||
            0),
        0,
      ) || 0),
    0,
  )

  const completionChecks = [
    {
      label: "Course details completed",
      completed: !!(courseData.title && courseData.description && courseData.level),
      required: true,
    },
    {
      label: "At least one module created",
      completed: modules.length > 0,
      required: true,
    },
    {
      label: "At least one lesson created",
      completed: totalLessons > 0,
      required: true,
    },
    {
      label: "Course thumbnail uploaded",
      // FIX: Check for both thumbnail URL AND uploaded file
      completed: !!(courseData.thumbnail_url || thumbnailFile),
      required: false,
    },
    {
      label: "Course category selected",
      completed: !!(courseData.category_id || courseData.category_name),
      required: false,
    },
    {
      label: "Learning objectives defined",
      completed: !!courseData.what_you_will_learn,
      required: false,
    },
    {
      label: "Course type configured",
      completed: !!courseData.course_type,
      required: true,
    },
  ]


  const requiredCompleted = completionChecks.filter((check) => check.required && check.completed).length
  const requiredTotal = completionChecks.filter((check) => check.required).length
  const optionalCompleted = completionChecks.filter((check) => !check.required && check.completed).length
  const optionalTotal = completionChecks.filter((check) => !check.required).length

  const canPublish = requiredCompleted === requiredTotal
  const completionPercentage = ((requiredCompleted + optionalCompleted) / completionChecks.length) * 100

  const handlePublish = async () => {
    if (onSubmit) {
      try {
        const result = await onSubmit()
        setIsPublished(true)
        setShowCelebration(true)
        return result
      } catch (error) {
        console.error("Error publishing course:", error)
        throw error
      }
    } else {
      setIsPublished(true)
      setShowCelebration(true)
    }
  }

  const getQualityScore = () => {
    let score = 0
    if (courseData.title && courseData.description) score += 20
    if (modules.length >= 2) score += 20
    if (totalLessons >= 3) score += 20
    if (totalAssessments >= 1) score += 10
    if (totalModuleFinalAssessments >= 1) score += 10
    if (courseData.thumbnail_url || thumbnailFile) score += 10
    if ((courseData.tags?.length || 0) >= 2) score += 10
    if (courseData.what_you_will_learn) score += 10
    return Math.min(score, 100)
  }

  const qualityScore = getQualityScore()

  const toggleModule = (moduleIndex: number) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleIndex)) {
      newExpanded.delete(moduleIndex)
    } else {
      newExpanded.add(moduleIndex)
    }
    setExpandedModules(newExpanded)
  }

  return (
    <div className="space-y-6">
      {showCelebration && (
        <CourseCompletionCelebration
          courseTitle={courseData.title || "Your Course"}
          stats={{
            modules: modules.length,
            lessons: totalLessons,
            assessments: totalAssessments,
            moduleFinals: totalModuleFinalAssessments,
            qualityScore,
          }}
          onClose={() => setShowCelebration(false)}
        />
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isPublished
            ? user?.bwenge_role === "SYSTEM_ADMIN"
              ? "Course Published Successfully!"
              : "Course Submitted Successfully"
            : "Review & Publish"}
        </h2>
        <p className="text-gray-600">
          {isPublished
            ? user?.bwenge_role === "SYSTEM_ADMIN"
              ? "Your course is now live and ready for students!"
              : "Your course has been successfully submitted for review."
            : "Final review of your course before making it available to students"}
        </p>
      </div>

      {!isPublished ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="content"
              className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600"
            >
              Content Details
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600"
            >
              Course Settings
            </TabsTrigger>
            <TabsTrigger
              value="checklist"
              className="data-[state=active]:bg-white data-[state=active]:text-[#0158B7] data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-600"
            >
              Checklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Course Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-8 h-8 text-[#0158B7] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{modules.length}</div>
                  <div className="text-sm text-gray-600">Modules</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center">
                  <PlayCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{totalLessons}</div>
                  <div className="text-sm text-gray-600">Lessons</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{totalAssessments}</div>
                  <div className="text-sm text-gray-600">Lesson Assessments</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{totalModuleFinalAssessments}</div>
                  <div className="text-sm text-gray-600">Module Finals</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
                    {courseData.course_type === "MOOC" ? (
                      <Globe className="w-8 h-8 text-[#0158B7]" />
                    ) : (
                      <Lock className="w-8 h-8 text-[#0158B7]" />
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {courseData.course_type === "MOOC" ? "MOOC" : "SPOC"}
                  </div>
                  <div className="text-sm text-gray-600">Course Type</div>
                </CardContent>
              </Card>
            </div>

            {/* Course Preview */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Eye className="w-5 h-5 text-[#0158B7]" />
                  Course Preview
                </CardTitle>
                <CardDescription className="text-gray-600">How your course will appear to students</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex gap-4 mb-4">
                    <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
                      {courseData.thumbnail_url || thumbnailFile ? (
                        <img
                          src={
                            thumbnailFile
                              ? URL.createObjectURL(thumbnailFile) // Use object URL for uploaded file
                              : courseData.thumbnail_url || "/placeholder.svg"
                          }
                          alt="Course thumbnail"
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {courseData.title || "Course Title"}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {courseData.short_description || courseData.description || "Course description will appear here..."}
                      </p>
                      <div className="flex gap-2">
                        <Badge className="capitalize rounded bg-blue-100 text-blue-700 border-0">
                          {courseData.level?.toLowerCase() || "beginner"}
                        </Badge>
                        <Badge className={`capitalize rounded border-0 ${courseData.course_type === "MOOC"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                          }`}>
                          {courseData.course_type === "MOOC" ? "Public" : "Private"}
                        </Badge>
                        <Badge className="capitalize rounded bg-gray-100 text-gray-700 border-0">
                          {modules.length} modules
                        </Badge>
                        {courseData.price && courseData.price > 0 ? (
                          <Badge className="capitalize rounded bg-yellow-100 text-yellow-700 border-0">
                            ${courseData.price}
                          </Badge>
                        ) : (
                          <Badge className="capitalize rounded bg-green-100 text-green-700 border-0">
                            Free
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {courseData.tags?.map((tag, index) => (
                      <Badge key={index} className="text-xs rounded bg-[#0158B7] text-white px-2 py-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    {courseData.course_type === "SPOC" && (
                      <>
                        <Lock className="w-4 h-4 text-gray-500" />
                        <span>Private Course • Requires Access</span>
                      </>
                    )}
                    {courseData.course_type === "MOOC" && (
                      <>
                        <Globe className="w-4 h-4 text-gray-500" />
                        <span>Public Course • Open Enrollment</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Details Tab - UPDATED to show module assessments */}
          <TabsContent value="content" className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-gray-900">Detailed Course Structure</CardTitle>
                <CardDescription className="text-gray-600">
                  Complete breakdown of all modules, lessons, and assessments
                  {totalModuleFinalAssessments > 0 && ` • ${totalModuleFinalAssessments} module final assessment(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {modules.map((module, moduleIndex) => (
                    <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleModule(moduleIndex)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {expandedModules.has(moduleIndex) ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Module {moduleIndex + 1}: {module.title}
                            </h4>
                            <p className="text-sm text-gray-600">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="text-xs bg-blue-100 text-blue-700 border-0">
                            {module.lessons?.length || 0} lessons
                          </Badge>
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                            {module.lessons?.reduce((acc, lesson) => acc + (lesson.assessments?.length || 0), 0) || 0}{" "}
                            assessments
                          </Badge>
                          {module.final_assessment && (
                            <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                              Final Assessment
                            </Badge>
                          )}
                        </div>
                      </div>

                      {expandedModules.has(moduleIndex) && (
                        <div className="p-4 space-y-3 bg-white">
                          {/* Module Final Assessment Section */}
                          {module.final_assessment && (
                            <div className="mb-4 p-3 border border-purple-200 rounded-lg bg-purple-50">
                              <div className="flex items-center gap-2 mb-2">
                                <Trophy className="w-4 h-4 text-purple-600" />
                                <h5 className="font-medium text-sm text-gray-900">Module Final Assessment</h5>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">{module.final_assessment.title}</span>
                                  <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                                    Required
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">{module.final_assessment.description}</p>
                                <div className="flex gap-4 text-xs text-gray-600">
                                  <span>Passing: {module.final_assessment.passing_score_percentage || 70}%</span>
                                  <span>•</span>
                                  <span>{module.final_assessment.time_limit_minutes || "No"} time limit</span>
                                  <span>•</span>
                                  <span>{module.final_assessment.questions?.length || 0} questions</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Lessons */}
                          {module.lessons && module.lessons.length > 0 ? (
                            module.lessons.map((lesson, lessonIndex) => (
                              <div key={lesson.id} className="border-l-2 border-[#0158B7] pl-4 py-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <PlayCircle className="w-4 h-4 text-[#0158B7]" />
                                      <h5 className="font-medium text-sm text-gray-900">
                                        Lesson {lessonIndex + 1}: {lesson.title}
                                      </h5>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2">
                                      {lesson.type} • {lesson.duration_minutes || 0} minutes
                                    </p>

                                    {lesson.assessments && lesson.assessments.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {lesson.assessments.map((assessment, assessmentIndex) => (
                                          <div key={assessment.id} className="bg-orange-50 rounded p-2 border border-orange-100">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Target className="w-3 h-3 text-orange-500" />
                                              <span className="text-xs font-medium text-gray-900">
                                                Assessment {assessmentIndex + 1}: {assessment.title}
                                              </span>
                                            </div>
                                            <div className="flex gap-2 text-xs text-gray-600">
                                              <span>{assessment.questions?.length || 0} questions</span>
                                              <span>•</span>
                                              <span>{assessment.passing_score || 70}% passing score</span>
                                              <span>•</span>
                                              <span>{assessment.time_limit_minutes || "No"} time limit</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic">No lessons added yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-gray-900">Course Configuration</CardTitle>
                <CardDescription className="text-gray-600">Review your course settings</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Course Type</p>
                      <div className="flex items-center gap-2">
                        {courseData.course_type === "MOOC" ? (
                          <Globe className="w-5 h-5 text-green-500" />
                        ) : (
                          <Lock className="w-5 h-5 text-purple-500" />
                        )}
                        <p className="font-medium text-gray-900">
                          {courseData.course_type === "MOOC" ? "MOOC (Public)" : "SPOC (Private)"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Access</p>
                      <p className="font-medium text-gray-900">
                        {courseData.is_public ? "Public" : "Private"}
                      </p>
                    </div>

                    {courseData.course_type === "SPOC" && (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">Enrollment Approval</p>
                          <p className="font-medium text-gray-900">
                            {courseData.requires_approval ? "Required" : "Not Required"}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">Institution-wide</p>
                          <p className="font-medium text-gray-900">
                            {courseData.is_institution_wide ? "Yes" : "No"}
                          </p>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Certificate</p>
                      <p className="font-medium text-gray-900">
                        {courseData.is_certificate_available ? "Available" : "Not Available"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Level</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {courseData.level?.toLowerCase()}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Language</p>
                      <p className="font-medium text-gray-900">{courseData.language}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Price</p>
                      <p className="font-medium text-gray-900">
                        {courseData.price && courseData.price > 0 ? `$${courseData.price}` : "Free"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">{courseData.duration_minutes || 0} minutes</p>
                    </div>
                  </div>

                  {/* Module Assessment Stats */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Assessment Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded p-3 text-center">
                        <div className="text-lg font-bold text-blue-700">{totalAssessments}</div>
                        <div className="text-xs text-blue-600">Lesson Assessments</div>
                      </div>
                      <div className="bg-purple-50 rounded p-3 text-center">
                        <div className="text-lg font-bold text-purple-700">{totalModuleFinalAssessments}</div>
                        <div className="text-xs text-purple-600">Module Finals</div>
                      </div>
                      <div className="bg-green-50 rounded p-3 text-center">
                        <div className="text-lg font-bold text-green-700">{totalAssessments + totalModuleFinalAssessments}</div>
                        <div className="text-xs text-green-600">Total Assessments</div>
                      </div>
                    </div>
                  </div>

                  {courseData.institution_id && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Institution</p>
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-gray-500" />
                        <p className="font-medium text-gray-900">Institution ID: {courseData.institution_id}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-gray-900">Publication Checklist</CardTitle>
                <CardDescription className="text-gray-600">Complete all required items to publish your course</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-gray-900">Progress</span>
                    <Badge className="bg-gray-100 text-gray-700 border-0">
                      {requiredCompleted + optionalCompleted}/{completionChecks.length} completed
                    </Badge>
                  </div>
                  <Progress value={completionPercentage} className="h-2 mb-6" />

                  <div className="space-y-3">
                    {completionChecks.map((check, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                        {check.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : check.required ? (
                          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                        )}
                        <span
                          className={`flex-1 ${check.completed ? "text-gray-900" : "text-gray-600"}`}
                        >
                          {check.label}
                        </span>
                        <div className="flex gap-1">
                          {check.required && (
                            <Badge className="text-xs bg-red-100 text-red-700 border-0">Required</Badge>
                          )}
                          {check.completed && (
                            <Badge className="text-xs bg-green-100 text-green-700 border-0">Done</Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Additional Assessment Check */}
                    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded border-t border-gray-100 pt-4">
                      {totalModuleFinalAssessments > 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                      )}
                      <span className={`flex-1 ${totalModuleFinalAssessments > 0 ? "text-gray-900" : "text-gray-600"}`}>
                        Module Final Assessments ({totalModuleFinalAssessments} added)
                      </span>
                      <div className="flex gap-1">
                        <Badge className={`text-xs ${totalModuleFinalAssessments > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} border-0`}>
                          {totalModuleFinalAssessments > 0 ? '✓ Added' : 'Optional'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* Published State */
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Rocket className="w-12 h-12 text-green-600" />
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900">Congratulations!</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Your course "{courseData.title}" {user?.bwenge_role === 'SYSTEM_ADMIN'
                ? "has been successfully published and is now available to students."
                : "has been successfully submitted for review."}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600">Course Summary:</p>
              <div className="flex justify-center gap-4 mt-2 text-sm">
                <span className="text-gray-700">{modules.length} modules</span>
                <span className="text-gray-700">{totalLessons} lessons</span>
                <span className="text-gray-700">{totalAssessments + totalModuleFinalAssessments} assessments</span>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => router.push(`/courses`)}
              >
                <Eye className="w-4 h-4" />
                View All Courses
              </Button>
              <Button
                className="flex items-center gap-2 bg-[#0158B7] hover:bg-[#014A9C] text-white"
                onClick={() => router.push(`/instructor/courses`)}
              >
                <BookOpen className="w-4 h-4" />
                Go to My Courses
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        {!isPublished && (
          <>
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={isSubmitting}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Previous Step
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handlePublish}
                disabled={!canPublish || isSubmitting}
                size="lg"
                className="px-8 bg-[#0158B7] hover:bg-[#014A9C] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    {user?.bwenge_role === 'SYSTEM_ADMIN' ? 'Publish Course' : 'Submit for Review'}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}