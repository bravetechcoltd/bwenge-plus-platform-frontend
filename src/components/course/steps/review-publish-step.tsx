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
  Video,
  Image as ImageIcon,
  Paperclip,
  Film,
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
  thumbnailFile?: File | null
}

function RichContent({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null

  const isHtml = /<[a-z][\s\S]*>/i.test(html)

  if (isHtml) {
    return (
      <div
        className={`
          rich-text-content
          prose prose-sm max-w-none
          prose-p:my-2 prose-p:leading-relaxed prose-p:text-gray-700 prose-p:break-words prose-p:whitespace-normal
          prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mt-4 prose-headings:mb-2 prose-headings:break-words
          prose-h1:text-xl prose-h1:font-bold prose-h1:mb-3 prose-h1:break-words
          prose-h2:text-lg prose-h2:font-bold prose-h2:mb-2.5 prose-h2:break-words
          prose-h3:text-base prose-h3:font-semibold prose-h3:mb-2 prose-h3:break-words
          prose-h4:text-sm prose-h4:font-semibold prose-h4:mb-1.5 prose-h4:break-words
          prose-h5:text-sm prose-h5:font-medium prose-h5:mb-1 prose-h5:break-words
          prose-ul:my-2 prose-ul:pl-5 prose-ul:list-disc prose-ul:break-words
          prose-ol:my-2 prose-ol:pl-5 prose-ol:list-decimal prose-ol:break-words
          prose-li:my-1 prose-li:leading-relaxed prose-li:break-words prose-li:whitespace-normal
          prose-li:marker:text-gray-500
          prose-strong:font-semibold prose-strong:text-gray-900 prose-strong:break-words
          prose-em:text-gray-700 prose-em:italic prose-em:break-words
          prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:my-2 prose-blockquote:italic prose-blockquote:text-gray-600 prose-blockquote:break-words
          prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:break-words
          prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-3 prose-pre:rounded-lg prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-words
          prose-a:text-[#0158B7] prose-a:underline prose-a:decoration-[#0158B7]/30 prose-a:hover:decoration-[#0158B7] prose-a:break-words
          prose-img:rounded-lg prose-img:my-2 prose-img:max-w-full prose-img:h-auto
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:break-words [&_ul]:whitespace-normal
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:break-words [&_ol]:whitespace-normal
          [&_li]:my-1 [&_li]:break-words [&_li]:whitespace-normal
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:break-words
          [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:break-words
          [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre_code]:bg-transparent [&_pre_code]:p-0
          [&_a]:text-[#0158B7] [&_a]:underline [&_a]:decoration-[#0158B7]/30 [&_a:hover]:decoration-[#0158B7] [&_a]:break-words
          [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full [&_img]:h-auto
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900 [&_h1]:break-words
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2.5 [&_h2]:text-gray-900 [&_h2]:break-words
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-gray-900 [&_h3]:break-words
          [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mb-1.5 [&_h4]:text-gray-900 [&_h4]:break-words
          [&_h5]:text-sm [&_h5]:font-medium [&_h5]:mb-1 [&_h5]:text-gray-900 [&_h5]:break-words
          [&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-gray-700 [&_p]:break-words [&_p]:whitespace-normal
          [&_strong]:font-semibold [&_strong]:text-gray-900 [&_strong]:break-words
          [&_em]:italic [&_em]:text-gray-700 [&_em]:break-words
          overflow-hidden
          break-words
          whitespace-normal
          select-none
          w-full
          max-w-full
          ${className}
        `}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          maxWidth: '100%',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  // Plain text — preserve line breaks with proper wrapping
  return (
    <p 
      className={`text-sm text-gray-700 leading-relaxed select-none break-words whitespace-pre-wrap w-full max-w-full ${className}`}
      style={{
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
    >
      {html}
    </p>
  )
}
// ── File size formatter ────────────────────────────────────────────────────────
function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ── File icon helper ───────────────────────────────────────────────────────────
function FileIcon({ name, mimetype }: { name: string; mimetype?: string }) {
  const ext = name?.split(".").pop()?.toLowerCase()
  const isVideo =
    mimetype?.startsWith("video/") ||
    ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"].includes(ext || "")
  const isImage =
    mimetype?.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"].includes(ext || "")

  if (isVideo) return <Film className="w-4 h-4 text-blue-500 flex-shrink-0" />
  if (isImage) return <ImageIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
  return <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
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
      details: module.final_assessment,
    })
  })

  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0)
  const totalAssessments = modules.reduce(
    (acc, module) =>
      acc +
      (module.lessons?.reduce(
        (lessonAcc, lesson) => lessonAcc + (lesson.assessments?.length || 0),
        0,
      ) || 0),
    0,
  )
  const totalModuleFinalAssessments = modules.filter((m) => m.final_assessment).length
  const totalQuestions = modules.reduce(
    (acc, module) =>
      acc +
      (module.lessons?.reduce(
        (lessonAcc, lesson) =>
          lessonAcc +
          (lesson.assessments?.reduce(
            (assessmentAcc, assessment) =>
              assessmentAcc + (assessment.questions?.length || 0),
            0,
          ) || 0),
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

  const requiredCompleted = completionChecks.filter((c) => c.required && c.completed).length
  const requiredTotal = completionChecks.filter((c) => c.required).length
  const optionalCompleted = completionChecks.filter((c) => !c.required && c.completed).length
  const optionalTotal = completionChecks.filter((c) => !c.required).length

  const canPublish = requiredCompleted === requiredTotal
  const completionPercentage =
    ((requiredCompleted + optionalCompleted) / completionChecks.length) * 100

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

  // Build thumbnail preview URL — prefer uploaded file, fall back to URL
  const thumbnailPreviewUrl = thumbnailFile
    ? URL.createObjectURL(thumbnailFile)
    : courseData.thumbnail_url || null

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

          {/* ═══════════════════════════════════════════════════════
              OVERVIEW TAB
          ════════════════════════════════════════════════════════ */}
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

            {/* ── Course Preview ─────────────────────────────────────── */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Eye className="w-5 h-5 text-[#0158B7]" />
                  Course Preview
                </CardTitle>
                <CardDescription className="text-gray-600">
                  How your course will appear to students
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">

                  {/* ── Thumbnail banner ─────────────────────────────── */}
                  <div className="relative w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {thumbnailPreviewUrl ? (
                      <img
                        src={thumbnailPreviewUrl}
                        alt="Course thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <BookOpen className="w-10 h-10" />
                        <span className="text-xs">No thumbnail</span>
                      </div>
                    )}
                    {/* Course type pill overlay */}
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      courseData.course_type === "MOOC"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {courseData.course_type === "MOOC" ? "Public" : "Private"}
                    </span>
                  </div>

                  {/* ── Course info body ──────────────────────────────── */}
                  <div className="p-5 space-y-4">

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 leading-snug">
                      {courseData.title || "Course Title"}
                    </h3>

          

                    {/* Meta badges — level, modules, price */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className="capitalize rounded-full bg-blue-100 text-blue-700 border-0 text-xs">
                        {courseData.level?.toLowerCase() || "beginner"}
                      </Badge>
                      <Badge className="rounded-full bg-gray-100 text-gray-700 border-0 text-xs">
                        {modules.length} module{modules.length !== 1 ? "s" : ""}
                      </Badge>
                      <Badge className="rounded-full bg-gray-100 text-gray-700 border-0 text-xs">
                        {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
                      </Badge>
                      {courseData.language && (
                        <Badge className="rounded-full bg-gray-100 text-gray-700 border-0 text-xs">
                          {courseData.language}
                        </Badge>
                      )}
                      {courseData.price && courseData.price > 0 ? (
                        <Badge className="rounded-full bg-yellow-100 text-yellow-700 border-0 text-xs">
                          ${courseData.price}
                        </Badge>
                      ) : (
                        <Badge className="rounded-full bg-green-100 text-green-700 border-0 text-xs">
                          Free
                        </Badge>
                      )}
                      {courseData.is_certificate_available && (
                        <Badge className="rounded-full bg-indigo-100 text-indigo-700 border-0 text-xs">
                          Certificate
                        </Badge>
                      )}
                    </div>

                    {/* Tags — wrap naturally, no overflow */}
                    {(courseData.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {courseData.tags?.map((tag, index) => (
                          <Badge
                            key={index}
                            className="text-xs rounded-full bg-[#0158B7]/10 text-[#0158B7] border border-[#0158B7]/20 px-2.5 py-0.5"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* What You Will Learn — rich text */}
                    {courseData.what_you_will_learn && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          What you'll learn
                        </p>
                        <RichContent html={courseData.what_you_will_learn} />
                      </div>
                    )}

                    {/* Requirements — rich text */}
                    {courseData.requirements && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Requirements
                        </p>
                        <RichContent html={courseData.requirements} />
                      </div>
                    )}

                    {/* Enrolled files summary — video, thumbnail, materials across all lessons */}
                    {(() => {
                      let videoCount = 0
                      let materialCount = 0
                      modules.forEach((m) =>
                        m.lessons?.forEach((l) => {
                          if (l.video_url) videoCount++
                          if ((l.lesson_materials || []).length > 0) materialCount += l.lesson_materials.length
                        })
                      )
                      if (videoCount === 0 && materialCount === 0) return null
                      return (
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Included Files
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {videoCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                <Film className="w-3 h-3" />
                                {videoCount} video{videoCount !== 1 ? "s" : ""}
                              </span>
                            )}
                            {materialCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                                <Paperclip className="w-3 h-3" />
                                {materialCount} material{materialCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Access footer */}
                    <div className="border-t border-gray-100 pt-3 flex items-center gap-2 text-xs text-gray-400">
                      {courseData.course_type === "SPOC" ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Private Course · Requires Access</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>Public Course · Open Enrollment</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              CONTENT DETAILS TAB
          ════════════════════════════════════════════════════════ */}
          <TabsContent value="content" className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-gray-900">Detailed Course Structure</CardTitle>
                <CardDescription className="text-gray-600">
                  Complete breakdown of all modules, lessons, and assessments
                  {totalModuleFinalAssessments > 0 &&
                    ` • ${totalModuleFinalAssessments} module final assessment(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {modules.map((module, moduleIndex) => (
                    <div
                      key={module.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleModule(moduleIndex)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {expandedModules.has(moduleIndex) ? (
                            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              Module {moduleIndex + 1}: {module.title}
                            </h4>
                            {module.description && (
                              <p className="text-sm text-gray-600 truncate">{module.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-3">
                          <Badge className="text-xs bg-blue-100 text-blue-700 border-0">
                            {module.lessons?.length || 0} lessons
                          </Badge>
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                            {module.lessons?.reduce(
                              (acc, lesson) => acc + (lesson.assessments?.length || 0),
                              0,
                            ) || 0}{" "}
                            assessments
                          </Badge>
                          {module.final_assessment && (
                            <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                              Final
                            </Badge>
                          )}
                        </div>
                      </div>

                      {expandedModules.has(moduleIndex) && (
                        <div className="p-4 space-y-3 bg-white">
                          {/* Module Final Assessment */}
                          {module.final_assessment && (
                            <div className="mb-4 p-3 border border-purple-200 rounded-lg bg-purple-50">
                              <div className="flex items-center gap-2 mb-2">
                                <Trophy className="w-4 h-4 text-purple-600" />
                                <h5 className="font-medium text-sm text-gray-900">
                                  Module Final Assessment
                                </h5>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">
                                    {module.final_assessment.title}
                                  </span>
                                  <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                                    Required
                                  </Badge>
                                </div>
                                {module.final_assessment.description && (
                                  <p className="text-xs text-gray-600">
                                    {module.final_assessment.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                                  <span>
                                    Passing:{" "}
                                    {module.final_assessment.passing_score_percentage || 70}%
                                  </span>
                                  <span>·</span>
                                  <span>
                                    {module.final_assessment.time_limit_minutes || "No"} time limit
                                  </span>
                                  <span>·</span>
                                  <span>
                                    {module.final_assessment.questions?.length || 0} questions
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Lessons */}
                          {module.lessons && module.lessons.length > 0 ? (
                            module.lessons.map((lesson, lessonIndex) => (
                              <div
                                key={lesson.id}
                                className="border-l-2 border-[#0158B7] pl-4 py-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <PlayCircle className="w-4 h-4 text-[#0158B7] flex-shrink-0" />
                                      <h5 className="font-medium text-sm text-gray-900 truncate">
                                        Lesson {lessonIndex + 1}: {lesson.title}
                                      </h5>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">
                                      {lesson.type} · {lesson.duration_minutes || 0} min
                                    </p>

                                    {/* Lesson Video */}
                                    {lesson.video_url && (
                                      <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1.5">
                                        <Film className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate max-w-[240px]">
                                          {lesson.video_url.startsWith("blob:")
                                            ? "Video file (pending upload)"
                                            : lesson.video_url}
                                        </span>
                                      </div>
                                    )}

                                    {/* Lesson Materials */}
                                    {(lesson.lesson_materials || []).length > 0 && (
                                      <div className="mb-2 space-y-1">
                                        {lesson.lesson_materials.map((mat, mi) => (
                                          <div
                                            key={mi}
                                            className="flex items-center gap-1.5 text-xs text-gray-600"
                                          >
                                            <FileIcon
                                              name={mat.original_name || mat.title}
                                              mimetype={mat.type}
                                            />
                                            <span className="truncate max-w-[240px]">
                                              {mat.title || mat.original_name}
                                            </span>
                                            {mat.size_bytes && (
                                              <span className="text-gray-400 flex-shrink-0">
                                                {fmtSize(mat.size_bytes)}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Lesson Resources (links) */}
                                    {(lesson.resources || []).length > 0 && (
                                      <div className="mb-2 space-y-1">
                                        {lesson.resources.map((res, ri) => (
                                          <div
                                            key={ri}
                                            className="flex items-center gap-1.5 text-xs text-gray-600"
                                          >
                                            <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            <span className="truncate max-w-[240px]">
                                              {res.title || res.url}
                                            </span>
                                            <Badge className="text-[10px] bg-gray-100 text-gray-500 border-0 flex-shrink-0">
                                              {res.type || "link"}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Lesson Assessments */}
                                    {lesson.assessments && lesson.assessments.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {lesson.assessments.map((assessment, assessmentIndex) => (
                                          <div
                                            key={assessment.id}
                                            className="bg-orange-50 rounded p-2 border border-orange-100"
                                          >
                                            <div className="flex items-center gap-2 mb-1">
                                              <Target className="w-3 h-3 text-orange-500" />
                                              <span className="text-xs font-medium text-gray-900">
                                                Assessment {assessmentIndex + 1}: {assessment.title}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                              <span>
                                                {assessment.questions?.length || 0} questions
                                              </span>
                                              <span>·</span>
                                              <span>
                                                {assessment.passing_score || 70}% passing
                                              </span>
                                              <span>·</span>
                                              <span>
                                                {assessment.time_limit_minutes || "No"} time limit
                                              </span>
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

          {/* ═══════════════════════════════════════════════════════
              SETTINGS TAB
          ════════════════════════════════════════════════════════ */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-gray-900">Course Configuration</CardTitle>
                <CardDescription className="text-gray-600">
                  Review your course settings
                </CardDescription>
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
                          {courseData.course_type === "MOOC"
                            ? "MOOC (Public)"
                            : "SPOC (Private)"}
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
                          <p className="text-sm font-medium text-gray-600">
                            Enrollment Approval
                          </p>
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
                        {courseData.price && courseData.price > 0
                          ? `$${courseData.price}`
                          : "Free"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">
                        {courseData.duration_minutes || 0} minutes
                      </p>
                    </div>
                  </div>

                  {/* Assessment Summary */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Assessment Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded p-3 text-center">
                        <div className="text-lg font-bold text-blue-700">{totalAssessments}</div>
                        <div className="text-xs text-blue-600">Lesson Assessments</div>
                      </div>
                      <div className="bg-purple-50 rounded p-3 text-center">
                        <div className="text-lg font-bold text-purple-700">
                          {totalModuleFinalAssessments}
                        </div>
                        <div className="text-xs text-purple-600">Module Finals</div>
                      </div>
                      <div className="bg-green-50 rounded p-3 text-center">
                        <div className="text-lg font-bold text-green-700">
                          {totalAssessments + totalModuleFinalAssessments}
                        </div>
                        <div className="text-xs text-green-600">Total Assessments</div>
                      </div>
                    </div>
                  </div>

                  {courseData.institution_id && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Institution</p>
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-gray-500" />
                        <p className="font-medium text-gray-900">
                          Institution ID: {courseData.institution_id}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              CHECKLIST TAB
          ════════════════════════════════════════════════════════ */}
          <TabsContent value="checklist" className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-gray-900">Publication Checklist</CardTitle>
                <CardDescription className="text-gray-600">
                  Complete all required items to publish your course
                </CardDescription>
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
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                      >
                        {check.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : check.required ? (
                          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                        )}
                        <span
                          className={`flex-1 ${
                            check.completed ? "text-gray-900" : "text-gray-600"
                          }`}
                        >
                          {check.label}
                        </span>
                        <div className="flex gap-1">
                          {check.required && (
                            <Badge className="text-xs bg-red-100 text-red-700 border-0">
                              Required
                            </Badge>
                          )}
                          {check.completed && (
                            <Badge className="text-xs bg-green-100 text-green-700 border-0">
                              Done
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Module Final Assessments check */}
                    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded border-t border-gray-100 pt-4">
                      {totalModuleFinalAssessments > 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                      )}
                      <span
                        className={`flex-1 ${
                          totalModuleFinalAssessments > 0 ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        Module Final Assessments ({totalModuleFinalAssessments} added)
                      </span>
                      <div className="flex gap-1">
                        <Badge
                          className={`text-xs ${
                            totalModuleFinalAssessments > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          } border-0`}
                        >
                          {totalModuleFinalAssessments > 0 ? "✓ Added" : "Optional"}
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
        /* ── Published State ─────────────────────────────────────── */
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Rocket className="w-12 h-12 text-green-600" />
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900">Congratulations!</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Your course "{courseData.title}"{" "}
              {user?.bwenge_role === "SYSTEM_ADMIN"
                ? "has been successfully published and is now available to students."
                : "has been successfully submitted for review."}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600">Course Summary:</p>
              <div className="flex justify-center gap-4 mt-2 text-sm">
                <span className="text-gray-700">{modules.length} modules</span>
                <span className="text-gray-700">{totalLessons} lessons</span>
                <span className="text-gray-700">
                  {totalAssessments + totalModuleFinalAssessments} assessments
                </span>
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

      {/* ── Navigation ─────────────────────────────────────────── */}
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
                    {user?.bwenge_role === "SYSTEM_ADMIN"
                      ? "Publish Course"
                      : "Submit for Review"}
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