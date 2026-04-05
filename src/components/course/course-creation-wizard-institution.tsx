// @ts-nocheck
"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef, startTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, CheckCircle, FolderOpen } from "lucide-react"
import { CourseDetailsStep } from "./steps/course-details-step-institution"
import { TreeBuilderStep } from "./steps/new-tree-builder-step"
import { ReviewPublishStep } from "./steps/review-publish-step"
import type { Course, Module, User, Institution, CourseCategory } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Cookies from "js-cookie"

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  component: React.ComponentType<any>
  isCompleted: boolean
  points: number
}

// Local Storage Keys
const STORAGE_KEYS = {
  COURSE_DATA: 'course_creation_data',
  MODULES: 'course_creation_modules',
  CURRENT_STEP: 'course_creation_step',
  THUMBNAIL_NAME: 'course_creation_thumbnail_name'
}

export function CourseCreationWizard({ institutionId }: { institutionId?: string }) {
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
    price: 0,
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

  // Course thumbnail file (from Step 1)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  // ==================== lesson-level file maps ====================
  // Use useRef to store the maps to prevent unnecessary re-renders
  const videoFilesMapRef = useRef<Map<string, File>>(new Map())
  const thumbnailFilesMapRef = useRef<Map<string, File>>(new Map())
  const materialFilesMapRef = useRef<Map<string, File[]>>(new Map())
  
  // State versions for triggering re-renders when needed
  const [videoFilesMap, setVideoFilesMap] = useState<Map<string, File>>(new Map())
  const [thumbnailFilesMap, setThumbnailFilesMap] = useState<Map<string, File>>(new Map())
  const [materialFilesMap, setMaterialFilesMap] = useState<Map<string, File[]>>(new Map())
  
  // Flag to prevent updates during render
  const isUpdatingFromChild = useRef(false)

  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>('')

  // ==================== LOCAL STORAGE ====================

  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const savedCourseData = localStorage.getItem(STORAGE_KEYS.COURSE_DATA)
        if (savedCourseData) {
          const parsed = JSON.parse(savedCourseData)
          setCourseData(prev => ({ ...prev, ...parsed }))
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
                updated_at: new Date(assessment.updated_at)
              }))
            }))
          }))
          setModules(modulesWithDates)
        }

        const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP)
        if (savedStep) {
          setCurrentStep(parseInt(savedStep))
        }

        setIsDataLoaded(true)

        if (savedCourseData || savedModules) {
          toast.success("Draft restored from previous session", {
            description: "Your progress has been recovered"
          })
        }
      } catch (error) {
        setIsDataLoaded(true)
      }
    }
    loadFromStorage()
  }, [])

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
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
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

  // ==================== AUTH DEBUG ====================

  useEffect(() => {
    const cookieToken = Cookies.get("bwenge_token")
    const cookieUser = Cookies.get("bwenge_user")
    const localToken = localStorage.getItem("bwengeplus_token")
    const localUser = localStorage.getItem("bwengeplus_user")
    if (!user && !cookieUser && !localUser) {
    } else if (!user && (cookieUser || localUser)) {
    } else if (user) {
    }
  }, [user, token])

  // ==================== FILE MAP CHANGE DEBUG ====================
  // Log whenever a file map changes so we can confirm files are being
  // registered from CourseTreeBuilder → TreeBuilderStep → Wizard.

  useEffect(() => {
    videoFilesMap.forEach((file, lessonId) => {
    })
  }, [videoFilesMap])

  useEffect(() => {
    thumbnailFilesMap.forEach((file, lessonId) => {
    })
  }, [thumbnailFilesMap])

  useEffect(() => {
    materialFilesMap.forEach((files, lessonId) => {
    })
  }, [materialFilesMap])

  // ==================== DATA FETCHING ====================

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) { return }
      setInLoading(true)
      try {
        const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (categoriesResponse.ok) {
          const data = await categoriesResponse.json()
          const categoriesArray = data.data?.categories || data.data || []
          setCategories(categoriesArray)
        }

        if (user.bwenge_role === "SYSTEM_ADMIN") {
          const institutionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/institutions`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (institutionsResponse.ok) {
            const data = await institutionsResponse.json()
            setInstitutions(data.data || [])
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

  // ==================== STEPS ====================

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

  // ==================== FILE MAP CALLBACKS ====================
  // These are stable references passed down to TreeBuilderStep.
  //
  // FIX: "Cannot update a component while rendering a different component"
  // The issue occurs when CourseTreeBuilder calls these callbacks during its
  // render cycle. Using setTimeout with 0 delay ensures the update happens
  // after the current render cycle completes, preventing the React warning.
  //
  // Additionally, we use useRef to store the actual maps and only update state
  // when necessary to avoid unnecessary re-renders.

  const handleVideoFilesChange = useCallback((map: Map<string, File>) => {
    
    // Update ref immediately for synchronous access
    videoFilesMapRef.current = new Map(map)
    
    // Use setTimeout to defer the state update until after the current render
    setTimeout(() => {
      setVideoFilesMap(new Map(map))
    }, 0)
  }, [])

  const handleThumbnailFilesChange = useCallback((map: Map<string, File>) => {
    
    thumbnailFilesMapRef.current = new Map(map)
    
    setTimeout(() => {
      setThumbnailFilesMap(new Map(map))
    }, 0)
  }, [])

  const handleMaterialFilesChange = useCallback((map: Map<string, File[]>) => {
    
    materialFilesMapRef.current = new Map(map)
    
    setTimeout(() => {
      setMaterialFilesMap(new Map(map))
    }, 0)
  }, [])

  // ==================== COURSE SUBMISSION ====================

  const handleCourseSubmission = async () => {


    if (!user || !token) {
      const cookieToken = Cookies.get("bwenge_token")
      const localToken = localStorage.getItem("bwengeplus_token")
      if (cookieToken || localToken) {
        toast.error("Session initializing, please try again in a moment")
      } else {
        toast.error("You must be logged in to create a course")
        router.push("/login")
      }
      return
    }



    // ── DEBUG: modules state at submission time ────────────────────────────
    modules.forEach((mod, mi) => {
      mod.lessons?.forEach((les, li) => {
        const videoFile = videoFilesMapRef.current.get(les.id)
        const thumbFile = thumbnailFilesMapRef.current.get(les.id)
        const matFiles = materialFilesMapRef.current.get(les.id) || []
      })
    })

    setIsSubmitting(true)

    try {
      const formData = new FormData()

      // ==================== COURSE THUMBNAIL ====================
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      } else {
      }

      // ==================== COURSE PAYLOAD ====================
      const coursePayload: any = {
        title: courseData.title || "",
        description: courseData.description || "",
        short_description: courseData.short_description || "",
        level: courseData.level || "BEGINNER",
        price: courseData.price || 0,
        status: user?.bwenge_role === "SYSTEM_ADMIN" ? "PUBLISHED" : "DRAFT",
        duration_minutes: courseData.duration_minutes || 0,
        tags: courseData.tags || [],
        language: courseData.language || "English",
        requirements: courseData.requirements || "",
        what_you_will_learn: courseData.what_you_will_learn || "",
        is_certificate_available: courseData.is_certificate_available !== undefined
          ? courseData.is_certificate_available
          : true,
        course_type: courseData.course_type || "MOOC",
        is_public: courseData.is_public !== undefined ? courseData.is_public : true,
        requires_approval: courseData.requires_approval || false,
        is_institution_wide: courseData.is_institution_wide || false,
      }

      // ==================== INSTITUTION ID HANDLING ====================

      if (user.bwenge_role === "INSTITUTION_ADMIN" ||
          (user.bwenge_role === "INSTRUCTOR" && user.is_institution_member)) {
        const targetInstitutionId = institutionId || user.primary_institution_id
        if (!targetInstitutionId) {
          toast.error("Your account is not associated with an institution")
          return
        }
        coursePayload.institution_id = targetInstitutionId
        if (user.bwenge_role === "INSTRUCTOR") {
          coursePayload.instructor_id = user.id
        }
      } else if (user.bwenge_role === "SYSTEM_ADMIN") {
        if (courseData.course_type === "SPOC") {
          if (courseData.institution_id) {
            coursePayload.institution_id = courseData.institution_id
          } else {
            toast.error("Please select an institution for SPOC course")
            return
          }
        } else {
          coursePayload.institution_id = null
        }
      } else if (user.primary_institution_id) {
        coursePayload.institution_id = user.primary_institution_id
      }


      // ==================== INSTRUCTOR ASSIGNMENT ====================
      if (user.bwenge_role === "SYSTEM_ADMIN" && courseData.instructor_id) {
        coursePayload.instructor_id = courseData.instructor_id
      }

      // ==================== SPOC-SPECIFIC SETTINGS ====================
      if (courseData.course_type === "SPOC") {
        if (courseData.max_enrollments) {
          coursePayload.max_enrollments = courseData.max_enrollments
        }
      }

      // ==================== CATEGORY ASSIGNMENT ====================
      if (courseData.category_id) {
        coursePayload.category_id = courseData.category_id
      } else if (courseData.category_name) {
        coursePayload.category_name = courseData.category_name
      }

      // ==================== MODULES ====================
      // FIX: Strip blob: URLs from the JSON payload — they are browser-only
      // and meaningless on the server. The actual files are appended as
      // multipart fields below. The backend will write the Cloudinary URL
      // returned by the upload helper, not the blob: URL from the payload.
      coursePayload.modules = modules.map((module, moduleIndex) => ({
        title: module.title,
        description: module.description || "",
        order_index: moduleIndex + 1,
        estimated_duration_hours: module.estimated_duration_hours || 0,
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          title: lesson.title,
          content: lesson.content || "",
          // FIX: Always strip blob: URLs here — never send them in the JSON payload.
          // If the instructor pasted a real http(s) URL, preserve it.
          // If a file was selected (blob:), send empty string; the file is in formData.
          video_url: (lesson.video_url && !lesson.video_url.startsWith("blob:"))
            ? lesson.video_url
            : "",
          thumbnail_url: (lesson.thumbnail_url && !lesson.thumbnail_url.startsWith("blob:"))
            ? lesson.thumbnail_url
            : "",
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
          // Persisted materials (already have Cloudinary URLs — safe to include)
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
            passing_score_percentage: module.final_assessment.passing_score_percentage || 70,
            time_limit_minutes: module.final_assessment.time_limit_minutes,
            requires_file_submission: module.final_assessment.requires_file_submission || false,
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


      // ==================== APPEND COURSE PAYLOAD TO FORMDATA ====================
      Object.keys(coursePayload).forEach(key => {
        if (key === 'modules' || key === 'tags') {
          formData.append(key, JSON.stringify(coursePayload[key]))
        } else if (coursePayload[key] !== undefined && coursePayload[key] !== null) {
          formData.append(key, coursePayload[key])
        }
      })

      // ==================== APPEND LESSON FILES TO FORMDATA ====================
      // Walk every module/lesson by index so the field names exactly match what
      // multer expects: modules[M].lessons[L].video / .thumbnail / .materials[N]
      //
      // The lesson IDs stored as keys in the file maps are the SAME temp IDs
      // that are in the modules state array — this is the lookup that must succeed.

      let appendedVideoCount = 0
      let appendedThumbCount = 0
      let appendedMatCount = 0

      modules.forEach((module, modIdx) => {
        (module.lessons || []).forEach((lesson, lesIdx) => {
          // ── Video ────────────────────────────────────────────────────────
          const videoFile = videoFilesMapRef.current.get(lesson.id)
          if (videoFile) {
            const fieldName = `modules[${modIdx}].lessons[${lesIdx}].video`
            formData.append(fieldName, videoFile, videoFile.name)
            appendedVideoCount++
          } else {
          }

          // ── Lesson thumbnail ──────────────────────────────────────────────
          const thumbFile = thumbnailFilesMapRef.current.get(lesson.id)
          if (thumbFile) {
            const fieldName = `modules[${modIdx}].lessons[${lesIdx}].thumbnail`
            formData.append(fieldName, thumbFile, thumbFile.name)
            appendedThumbCount++
          } else {
          }

          // ── Lesson materials ──────────────────────────────────────────────
          const matFiles = materialFilesMapRef.current.get(lesson.id) || []
          matFiles.forEach((matFile, matIdx) => {
            const fieldName = `modules[${modIdx}].lessons[${lesIdx}].materials[${matIdx}]`
            formData.append(fieldName, matFile, matFile.name)
            appendedMatCount++
          })
        })
      })

      // ── DEBUG: full FormData inventory ─────────────────────────────────
      let fdEntryCount = 0
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
        } else {
          const preview = typeof value === "string" && value.length > 120
            ? value.substring(0, 120) + "…"
            : value
        }
        fdEntryCount++
      }


      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/create`, {
        method: "POST",
        // ⚠️ Do NOT set Content-Type manually — the browser sets it with the
        // correct multipart/form-data boundary automatically.
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })


      const result = await response.json()


      if (!response.ok) {
        throw new Error(result.message || "Failed to create course")
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

  // ==================== AUTH GUARD ====================

  if (!user && !Cookies.get("bwenge_token") && !localStorage.getItem("bwengeplus_token")) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-destructive mb-2">Authentication Required</h2>
            <p className="text-destructive mb-4">You must be logged in to create a course.</p>
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

  // ==================== RENDER ====================

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Step Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center min-w-0 flex-1 relative px-2">
              {index < steps.length - 1 && (
                <div className={`hidden md:block absolute top-3 left-1/2 w-full h-0.5 ${
                  index < currentStep ? "bg-[#0158B7]" : "bg-secondary"
                }`} />
              )}

              <button
                onClick={() => handleStepClick(index)}
                disabled={index > currentStep}
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center mb-2 transition-all relative z-10
                  ${index === currentStep
                    ? "bg-[#0158B7] text-white shadow-lg ring-2 ring-[#0158B7] ring-offset-2"
                    : index < currentStep
                      ? "bg-success/100 text-white"
                      : "bg-secondary text-muted-foreground"
                  }
                  ${index <= currentStep ? "cursor-pointer hover:scale-105" : "cursor-not-allowed"}
                `}
              >
                {index < currentStep ? <CheckCircle className="w-4 h-4" /> : step.icon}
              </button>

              <div className="text-center">
                <p className={`text-xs font-medium ${index <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{step.description}</p>
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
                onVideoFilesChange={handleVideoFilesChange}
                onThumbnailFilesChange={handleThumbnailFilesChange}
                onMaterialFilesChange={handleMaterialFilesChange}
              />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}