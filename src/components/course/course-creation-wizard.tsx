// @ts-nocheck
"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, CheckCircle, FolderOpen } from "lucide-react"
import { CourseDetailsStep } from "./steps/course-details-step"
import { TreeBuilderStep } from "./steps/new-tree-builder-step"
import { ReviewPublishStep } from "./steps/review-publish-step"
import type { Course, Module, User, Institution, CourseCategory } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Cookies from "js-cookie"
import { useSearchParams } from "next/navigation"
import { useCourseDraft, fetchDraft, linkDraftToCourse } from "@/hooks/useCourseDraft"
import { DraftSaveIndicator } from "@/components/course/draft-save-indicator"

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  component: React.ComponentType<any>
  isCompleted: boolean
  points: number
}

// Local Storage Keys — distinct from institution wizard to avoid conflicts
/** Restores the `Date` objects JSON turned into strings. */
const reviveModules = (raw: any[]): any[] =>
  (raw ?? []).map((module: any) => ({
    ...module,
    created_at: new Date(module.created_at),
    updated_at: new Date(module.updated_at),
    lessons: module.lessons?.map((lesson: any) => ({
      ...lesson,
      created_at: new Date(lesson.created_at),
      updated_at: new Date(lesson.updated_at),
      assessments: lesson.assessments?.map((assessment: any) => ({
        ...assessment,
        created_at: new Date(assessment.created_at),
        updated_at: new Date(assessment.updated_at),
      })),
    })),
  }))

const STORAGE_KEYS = {
  COURSE_DATA: "course_creation_data",
  MODULES: "course_creation_modules",
  CURRENT_STEP: "course_creation_step",
  THUMBNAIL_NAME: "course_creation_thumbnail_name",
}

export function CourseCreationWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [courseData, setCourseData] = useState<Partial<Course>>({
    course_type: "MOOC",
    is_public: true,
    requires_approval: false,
    is_certificate_available: true,
    status: "DRAFT",
    tags: [],
    level: "BEGINNER",
    language: "English",
    is_free: true,
    price: 0,
    currency: null as string | null,
    duration_minutes: 0,
    total_lessons: 0,
  })
  const [modules, setModules] = useState<Module[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { token, user } = useAuth()
  const [instructors, setInstructors] = useState<User[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(false)
  const [inLoading, setInLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // ── NEW: lesson-level file maps (same as institution wizard) ──────────────
  /** lessonId -> video File */
  const [videoFilesMap, setVideoFilesMap] = useState<Map<string, File>>(new Map())
  /** lessonId -> thumbnail File */
  const [thumbnailFilesMap, setThumbnailFilesMap] = useState<Map<string, File>>(new Map())
  /** lessonId -> material File[] */
  const [materialFilesMap, setMaterialFilesMap] = useState<Map<string, File[]>>(new Map())

  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>("")

  /*
   * Continuing a saved draft (CD-001 §3). `?draft=<id>` is set by the drafts
   * listing; the server copy wins over localStorage, which is only this
   * browser's last session.
   */
  const searchParams = useSearchParams()
  const requestedDraftId = searchParams?.get("draft") ?? null
  const [restoredDraftId, setRestoredDraftId] = useState<string | null>(requestedDraftId)

  /*
   * ?type=MOOC — the course type the caller asked for.
   *
   * A dashboard that says "Launch a MOOC" has to arrive at a form already set
   * to MOOC; landing on the default and expecting the person to change it
   * makes the button a lie. Applied once, and only when a draft is not being
   * restored — a saved draft already has a type, and overwriting it with a
   * query string would silently change a course someone was part way through.
   */
  const requestedType = (searchParams?.get("type") ?? "").toUpperCase()

  useEffect(() => {
    if (requestedDraftId) return
    if (requestedType !== "MOOC" && requestedType !== "SPOC") return

    setCourseData((previous: any) => {
      if (previous.course_type === requestedType) return previous
      return {
        ...previous,
        course_type: requestedType,
        // The same side effects the type selector applies, so arriving by link
        // and choosing by hand leave the form in the same state.
        ...(requestedType === "MOOC"
          ? { is_public: true, requires_approval: false, is_institution_wide: false }
          : { is_public: false, requires_approval: true }),
      }
    })
    // Once, on arrival. Re-running would fight the selector if the user then
    // changes the type by hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedType, requestedDraftId])

  /*
   * Server-side auto-save (CD-001 §1), alongside the localStorage mirror
   * below. Paused until loading finishes, so restoring a draft cannot save
   * the half-populated state back over it.
   */
  const { draftId, saveState, lastSavedAt } = useCourseDraft({
    courseData,
    modules,
    currentStep,
    enabled: isDataLoaded && !isSubmitting,
    initialDraftId: restoredDraftId,
  })

  useEffect(() => {
    if (!requestedDraftId) return

    let cancelled = false
    const run = async () => {
      const draft = await fetchDraft(requestedDraftId)
      if (cancelled) return

      if (!draft) {
        toast.error("That draft could not be opened. Starting a new course.")
        setRestoredDraftId(null)
        setIsDataLoaded(true)
        return
      }

      setCourseData((prev) => ({ ...prev, ...(draft.course_data ?? {}) }))
      setModules(reviveModules(draft.modules ?? []))
      setCurrentStep(draft.current_step ?? 0)
      setRestoredDraftId(draft.id)
      setIsDataLoaded(true)
      toast.success("Draft restored", { description: "Continuing where you left off" })
    }
    run()

    return () => { cancelled = true }
  }, [requestedDraftId])

  // ── LOCAL STORAGE ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Skipped while a server draft is opening: that one is authoritative.
    if (requestedDraftId) return

    const loadFromStorage = () => {
      try {
        const savedCourseData = localStorage.getItem(STORAGE_KEYS.COURSE_DATA)
        if (savedCourseData) {
          const parsed = JSON.parse(savedCourseData)
          setCourseData((prev) => ({ ...prev, ...parsed }))
        }

        const savedModules = localStorage.getItem(STORAGE_KEYS.MODULES)
        if (savedModules) {
          const parsed = JSON.parse(savedModules)
          const modulesWithDates = parsed.map((module: any) => ({
            ...module,
            created_at: new Date(module.created_at),
            updated_at: new Date(module.updated_at),
            lessons: module.lessons?.map((lesson: any) => ({
              ...lesson,
              created_at: new Date(lesson.created_at),
              updated_at: new Date(lesson.updated_at),
              assessments: lesson.assessments?.map((assessment: any) => ({
                ...assessment,
                created_at: new Date(assessment.created_at),
                updated_at: new Date(assessment.updated_at),
              })),
            })),
          }))
          setModules(modulesWithDates)
        }

        const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP)
        if (savedStep) {
          setCurrentStep(parseInt(savedStep))
        }

        const savedThumbnailName = localStorage.getItem(STORAGE_KEYS.THUMBNAIL_NAME)
        if (savedThumbnailName) {
        }

        setIsDataLoaded(true)

        if (savedCourseData || savedModules) {
          toast.success("Draft restored from previous session", {
            description: "Your progress has been recovered",
          })
        }
      } catch (error) {
        setIsDataLoaded(true)
      }
    }

    loadFromStorage()
  }, [requestedDraftId])

  const saveToStorage = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const currentData = JSON.stringify({ courseData, modules, currentStep })
        if (currentData !== lastSaveRef.current) {
          localStorage.setItem(STORAGE_KEYS.COURSE_DATA, JSON.stringify(courseData))
          localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(modules))
          localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStep.toString())
          if (thumbnailFile) {
            localStorage.setItem(STORAGE_KEYS.THUMBNAIL_NAME, thumbnailFile.name)
          }
          lastSaveRef.current = currentData
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          clearStorage()
        }
      }
    }, 1000)
  }, [courseData, modules, currentStep, thumbnailFile])

  useEffect(() => {
    if (isDataLoaded) saveToStorage()
  }, [courseData, modules, currentStep, saveToStorage, isDataLoaded])

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.COURSE_DATA)
    localStorage.removeItem(STORAGE_KEYS.MODULES)
    localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP)
    localStorage.removeItem(STORAGE_KEYS.THUMBNAIL_NAME)
  }

  const clearStorageOnSuccess = () => {
    clearStorage()
    toast.success("Draft cleared - course created successfully!")
  }

  // ── AUTH DEBUG ─────────────────────────────────────────────────────────────

  useEffect(() => {


    const cookieToken = Cookies.get("bwenge_token")
    const cookieUser = Cookies.get("bwenge_user")

    if (cookieUser) {
      try {
        const parsedCookieUser = JSON.parse(decodeURIComponent(cookieUser))
      } catch (error) {
      }
    }

    const localToken = localStorage.getItem("bwengeplus_token")
    const localUser = localStorage.getItem("bwengeplus_user")

    if (localUser) {
      try {
        const parsedLocalUser = JSON.parse(localUser)
      } catch (error) {
      }
    }

    if (!user && !cookieUser && !localUser) {
    } else if (!user && (cookieUser || localUser)) {
    } else if (user) {
    }

  }, [user, token])

  // ── DATA FETCHING ──────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) {
        return
      }

      setInLoading(true)

      try {
        const categoriesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/categories`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (categoriesResponse.ok) {
          const data = await categoriesResponse.json()
          const categoriesArray = data.data?.categories || data.data || []
          setCategories(categoriesArray)
        }

        /*
          CAT-001. The platform's own categories, fetched explicitly.

          The call above returns every top-level category on the platform when
          no institution is named — including other institutions' — and keeps
          the inactive ones. This one returns exactly the global set, active
          only, which is what a course with no institution can be filed under.

          Merged by id rather than replacing, so an institution context keeps
          every category it already had.
        */
        try {
          const globalResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/categories/global?active=true`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (globalResponse.ok) {
            const globalData = await globalResponse.json()
            const globals = Array.isArray(globalData.data) ? globalData.data : []
            if (globals.length > 0) {
              setCategories((previous: any[]) => {
                const seen = new Set((previous || []).map((c: any) => c.id))
                return [...(previous || []), ...globals.filter((c: any) => !seen.has(c.id))]
              })
            }
          }
        } catch {
          // The list above still stands; this only adds to it.
        }


        // System Admin: always fetch instructors and institutions
        if (user.bwenge_role === "SYSTEM_ADMIN") {
          const institutionsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/institutions`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (institutionsResponse.ok) {
            const data = await institutionsResponse.json()
            setInstitutions(data.data || [])
          }

          /*
            PI-001. This asked /users?role=INSTRUCTOR, which is not a route on
            this server. The request 404'd, the catch below swallowed it, and
            the instructor list came back empty every single time — so a system
            admin had nobody to name as primary instructor and could not tell
            why.

            /public-instructors/assignable returns the active instructors who
            belong to no institution, plus the system admin making the request
            as a fallback, so the field is never empty on a platform that has
            not recruited one yet.
          */
          const instructorsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/public-instructors/assignable`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (instructorsResponse.ok) {
            const data = await instructorsResponse.json()
            setInstructors(data.data || [])
          } else {
            // Said out loud, rather than left as an empty dropdown that reads
            // as though the platform has no instructors at all.
            toast.error("Could not load the instructor list")
          }
        }

      } catch (error) {
        toast.error("Failed to load initial data")
      } finally {
        setInLoading(false)
      }
    }

    if (user && token) fetchData()
  }, [user, token])

  // ── STEPS ──────────────────────────────────────────────────────────────────

  const steps: WizardStep[] = [
    {
      id: "details",
      title: "Course Details",
      description: "Set up your course foundation",
      icon: <BookOpen className="w-3 h-3" />,
      component: CourseDetailsStep,
      isCompleted: false,
      points: 50,
    },
    {
      id: "build",
      title: "Build Course",
      description: "Create modules, lessons, and assessments",
      icon: <FolderOpen className="w-3 h-3" />,
      component: TreeBuilderStep,
      isCompleted: false,
      points: 200,
    },
    {
      id: "review",
      title: "Review & Publish",
      description: "Final review and course launch",
      icon: <CheckCircle className="w-3 h-3" />,
      component: ReviewPublishStep,
      isCompleted: false,
      points: 100,
    },
  ]

  const CurrentStepComponent = steps[currentStep].component

  const handleThumbnailFileSelect = (file: File | null) => setThumbnailFile(file)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      steps[currentStep].isCompleted = true
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep) setCurrentStep(stepIndex)
  }

  // ── COURSE SUBMISSION ─────────────────────────────────────────────────────

  const handleCourseSubmission = async () => {


    if (!user || !token) {

      const cookieToken = Cookies.get("bwenge_token")
      const cookieUser = Cookies.get("bwenge_user")
      const localToken = localStorage.getItem("bwengeplus_token")
      const localUser = localStorage.getItem("bwengeplus_user")


      if (cookieToken || localToken) {
        toast.error("Session initializing, please try again in a moment")
      } else {
        toast.error("You must be logged in to create a course")
        router.push("/login")
      }
      return
    }


    setIsSubmitting(true)

    try {
      const formData = new FormData()

      // ── Course thumbnail ─────────────────────────────────────
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile)
      } else {
      }

      // ── Course payload ───────────────────────────────────────
      const coursePayload: any = {
        title: courseData.title || "",
        description: courseData.description || "",
        short_description: courseData.short_description || "",
        level: courseData.level || "BEGINNER",
        is_free: courseData.is_free !== false,
        price: courseData.is_free === false ? Number(courseData.price) || 0 : 0,
        currency: courseData.is_free === false ? courseData.currency || "RWF" : null,
        status: user?.bwenge_role === "SYSTEM_ADMIN" ? "PUBLISHED" : "DRAFT",
        duration_minutes: courseData.duration_minutes || 0,
        tags: courseData.tags || [],
        language: courseData.language || "English",
        requirements: courseData.requirements || "",
        what_you_will_learn: courseData.what_you_will_learn || "",
        is_certificate_available:
          courseData.is_certificate_available !== undefined
            ? courseData.is_certificate_available
            : true,
        course_type: courseData.course_type || "MOOC",
        is_public: courseData.is_public !== undefined ? courseData.is_public : true,
        requires_approval: courseData.requires_approval || false,
        is_institution_wide: courseData.is_institution_wide || false,
      }

      // ── SYSTEM_ADMIN institution handling ────────────────────

      if (user.bwenge_role === "SYSTEM_ADMIN") {
        if (courseData.course_type === "SPOC") {
          if (courseData.institution_id) {
            coursePayload.institution_id = courseData.institution_id
          } else {
            toast.error("Please select an institution for SPOC course")
            return
          }
        } else {
          // MOOC: institution_id from form if set, else null
          coursePayload.institution_id = courseData.institution_id || null
        }
      } else if (user.bwenge_role === "INSTITUTION_ADMIN") {
        // Fallback: institution admin using this wizard
        const targetInstitutionId = user.primary_institution_id
        if (!targetInstitutionId) {
          toast.error("Your account is not associated with an institution")
          return
        }
        coursePayload.institution_id = targetInstitutionId
      } else if (user.primary_institution_id) {
        coursePayload.institution_id = user.primary_institution_id
      }


      // ── Instructor assignment (System Admin) ─────────────────
      if (user.bwenge_role === "SYSTEM_ADMIN" && courseData.instructor_id) {
        coursePayload.instructor_id = courseData.instructor_id
      }

      // ── SPOC-specific settings ───────────────────────────────
      if (courseData.course_type === "SPOC") {
        if (courseData.max_enrollments) {
          coursePayload.max_enrollments = courseData.max_enrollments
        }
      }

      // ── Category assignment ──────────────────────────────────
      if (courseData.category_id) {
        coursePayload.category_id = courseData.category_id
      } else if (courseData.category_name) {
        coursePayload.category_name = courseData.category_name
      }

      // ── Modules ──────────────────────────────────────────────
      coursePayload.modules = modules.map((module, moduleIndex) => ({
        title: module.title,
        description: module.description || "",
        order_index: moduleIndex + 1,
        estimated_duration_hours: module.estimated_duration_hours || 0,
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          title: lesson.title,
          content: lesson.content || "",
          video_url: lesson.video_url || "",
          thumbnail_url: lesson.thumbnail_url || "",
          duration_minutes: lesson.duration_minutes || 0,
          order_index: lessonIndex + 1,
          type: lesson.type || "VIDEO",
          is_preview: lesson.is_preview || false,
          resources: Array.isArray(lesson.resources)
            ? lesson.resources.map((resource: any) => ({
                title: resource.title,
                url: resource.url,
                type: resource.type || "link",
              }))
            : [],
          // Persisted course materials (already-uploaded ones; URLs are in the object)
          lesson_materials: Array.isArray(lesson.lesson_materials) ? lesson.lesson_materials : [],
          assessments: (lesson.assessments || []).map((assessment) => ({
            title: assessment.title,
            description: assessment.description || "",
            type: assessment.type || "QUIZ",
            questions: (assessment.questions || []).map((q: any) => ({
              id: q.id,
              question: q.question,
              type: q.type || q.question_type,
              options: q.options || [],
              correct_answer: q.correct_answer,
              points: q.points || 1,
              order_index: q.order_index || 0,
            })),
            passing_score: assessment.passing_score || 70,
            max_attempts: assessment.max_attempts || 3,
            time_limit_minutes: assessment.time_limit_minutes,
          })),
        })),
        ...(module.final_assessment && {
          final_assessment: {
            title: module.final_assessment.title,
            type: module.final_assessment.type,
            description: module.final_assessment.description,
            instructions: module.final_assessment.instructions,
            passing_score_percentage:
              module.final_assessment.passing_score_percentage || 70,
            time_limit_minutes: module.final_assessment.time_limit_minutes,
            requires_file_submission:
              module.final_assessment.requires_file_submission || false,
            questions: (module.final_assessment.questions || []).map((q: any) => ({
              id: q.id,
              question: q.question,
              type: q.type || q.question_type,
              options: q.options || [],
              correct_answer: q.correct_answer,
              points: q.points || 1,
              order_index: q.order_index || 0,
            })),
          },
        }),
      }))


      // ── Append course payload to FormData ────────────────────
      Object.keys(coursePayload).forEach((key) => {
        if (key === "modules" || key === "tags") {
          formData.append(key, JSON.stringify(coursePayload[key]))
        } else if (
          coursePayload[key] !== undefined &&
          coursePayload[key] !== null
        ) {
          formData.append(key, coursePayload[key])
        }
      })

      // ── Append lesson video, thumbnail, and material files ───
      modules.forEach((module, modIdx) => {
        module.lessons?.forEach((lesson, lesIdx) => {
          // Video
          const videoFile = videoFilesMap.get(lesson.id)
          if (videoFile) {
            const fieldName = `modules[${modIdx}].lessons[${lesIdx}].video`
            formData.append(fieldName, videoFile)
          }
          // Lesson thumbnail
          const thumbFile = thumbnailFilesMap.get(lesson.id)
          if (thumbFile) {
            const fieldName = `modules[${modIdx}].lessons[${lesIdx}].thumbnail`
            formData.append(fieldName, thumbFile)
          }
          // Lesson materials
          const matFiles = materialFilesMap.get(lesson.id) || []
          matFiles.forEach((matFile, matIdx) => {
            const fieldName = `modules[${modIdx}].lessons[${lesIdx}].materials[${matIdx}]`
            formData.append(fieldName, matFile)
          })
        })
      })


      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/create`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      )


      const result = await response.json()


      if (!response.ok) {
        throw new Error(result.message || "Failed to create course")
      }


      // The draft becomes the course's history rather than being deleted.
      const newCourseId = result?.data?.id ?? result?.data?.course?.id
      if (draftId && newCourseId) {
        await linkDraftToCourse(draftId, newCourseId)
      }

      clearStorageOnSuccess()
      toast.success("Course created successfully!")

      return result
    } catch (error: any) {

      toast.error(error.message || "Failed to create course")
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── AUTH GUARD ─────────────────────────────────────────────────────────────

  if (
    !user &&
    !Cookies.get("bwenge_token") &&
    !localStorage.getItem("bwengeplus_token")
  ) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-destructive mb-2">
              Authentication Required
            </h2>
            <p className="text-destructive mb-4">
              You must be logged in to create a course.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive"
            >
              Go to Login
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-2 flex justify-end">
        <DraftSaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
      </div>

      {/* Step Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-col items-center min-w-0 flex-1 relative px-2"
            >
              {index < steps.length - 1 && (
                <div
                  className={`hidden md:block absolute top-3 left-1/2 w-full h-0.5 ${
                    index < currentStep ? "bg-[#0158B7]" : "bg-secondary"
                  }`}
                />
              )}

              <button
                onClick={() => handleStepClick(index)}
                disabled={index > currentStep}
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center mb-2 transition-all relative z-10
                  ${
                    index === currentStep
                      ? "bg-[#0158B7] text-white shadow-lg ring-2 ring-[#0158B7] ring-offset-2"
                      : index < currentStep
                      ? "bg-success/100 text-white"
                      : "bg-secondary text-muted-foreground"
                  }
                  ${
                    index <= currentStep
                      ? "cursor-pointer hover:scale-105"
                      : "cursor-not-allowed"
                  }
                `}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step.icon
                )}
              </button>

              <div className="text-center">
                <p
                  className={`text-xs font-medium ${
                    index <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="min-h-[600px] border border-border bg-card shadow-sm">
        <CardContent className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent
                courseData={courseData}
                setCourseData={setCourseData}
                modules={modules}
                setModules={setModules}
                onNext={handleNext}
                onPrevious={handlePrevious}
                isFirstStep={currentStep === 0}
                isLastStep={currentStep === steps.length - 1}
                onSubmit={handleCourseSubmission}
                isSubmitting={isSubmitting}
                onThumbnailFileSelect={handleThumbnailFileSelect}
                thumbnailFile={thumbnailFile}
                instructors={instructors}
                categories={categories}
                institutions={institutions}
                user={user}
                loading={loading}
                inLoading={inLoading}
                // Lesson-level file map callbacks
                onVideoFilesChange={(map: Map<string, File>) =>
                  setVideoFilesMap(new Map(map))
                }
                onThumbnailFilesChange={(map: Map<string, File>) =>
                  setThumbnailFilesMap(new Map(map))
                }
                onMaterialFilesChange={(map: Map<string, File[]>) =>
                  setMaterialFilesMap(new Map(map))
                }
              />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}