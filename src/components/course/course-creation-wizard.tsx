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
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  
  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>('')

  // ==================== LOCAL STORAGE FUNCTIONS ====================
  
  // Load data from local storage on mount
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        // Load course data
        const savedCourseData = localStorage.getItem(STORAGE_KEYS.COURSE_DATA)
        if (savedCourseData) {
          const parsed = JSON.parse(savedCourseData)
          setCourseData(prev => ({ ...prev, ...parsed }))
          console.log("✅ Loaded course data from storage")
        }

        // Load modules
        const savedModules = localStorage.getItem(STORAGE_KEYS.MODULES)
        if (savedModules) {
          const parsed = JSON.parse(savedModules)
          // Reconstruct Date objects
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
          console.log("✅ Loaded modules from storage:", modulesWithDates.length)
        }

        // Load current step
        const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP)
        if (savedStep) {
          setCurrentStep(parseInt(savedStep))
          console.log("✅ Loaded current step from storage:", savedStep)
        }

        // Load thumbnail file name (we can't restore the File object, but we can show the name)
        const savedThumbnailName = localStorage.getItem(STORAGE_KEYS.THUMBNAIL_NAME)
        if (savedThumbnailName) {
          console.log("ℹ️ Previous thumbnail file name:", savedThumbnailName)
          // Note: The actual File object cannot be restored, user will need to re-upload
        }

        setIsDataLoaded(true)
        
        if (savedCourseData || savedModules) {
          toast.success("Draft restored from previous session", {
            description: "Your progress has been recovered"
          })
        }
      } catch (error) {
        console.error("❌ Error loading from storage:", error)
        setIsDataLoaded(true)
      }
    }

    loadFromStorage()
  }, [])

  // Debounced save function
  const saveToStorage = useCallback(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const currentData = JSON.stringify({
          courseData,
          modules,
          currentStep
        })

        // Only save if data has changed
        if (currentData !== lastSaveRef.current) {
          localStorage.setItem(STORAGE_KEYS.COURSE_DATA, JSON.stringify(courseData))
          localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(modules))
          localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStep.toString())
          
          if (thumbnailFile) {
            localStorage.setItem(STORAGE_KEYS.THUMBNAIL_NAME, thumbnailFile.name)
          }

          lastSaveRef.current = currentData
          console.log("💾 Auto-saved to storage")
        }
      } catch (error) {
        console.error("❌ Error saving to storage:", error)
        // If storage is full, clear old data
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn("⚠️ Storage quota exceeded, clearing old data")
          clearStorage()
        }
      }
    }, 1000) // Save 1 second after last change
  }, [courseData, modules, currentStep, thumbnailFile])

  // Auto-save when data changes
  useEffect(() => {
    if (isDataLoaded) {
      saveToStorage()
    }
  }, [courseData, modules, currentStep, saveToStorage, isDataLoaded])

  // Clear storage function
  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.COURSE_DATA)
    localStorage.removeItem(STORAGE_KEYS.MODULES)
    localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP)
    localStorage.removeItem(STORAGE_KEYS.THUMBNAIL_NAME)
    console.log("🗑️ Storage cleared")
  }

  // Clear storage on successful submission
  const clearStorageOnSuccess = () => {
    clearStorage()
    toast.success("Draft cleared - course created successfully!")
  }

  // ==================== EXISTING CODE (AUTH, DATA FETCHING, ETC.) ====================
  
  useEffect(() => {
    console.log("=" .repeat(80))
    console.log("🔍 [CourseCreationWizard] AUTHENTICATION DEBUG")
    console.log("=" .repeat(80))
    
    console.log("📋 [useAuth Hook]:", {
      hasUser: !!user,
      hasToken: !!token,
      userId: user?.id,
      email: user?.email,
      role: user?.bwenge_role,
      fullUser: user
    })
    
    const cookieToken = Cookies.get("bwenge_token")
    const cookieUser = Cookies.get("bwenge_user")
    console.log("🍪 [Cookies]:", {
      hasCookieToken: !!cookieToken,
      hasCookieUser: !!cookieUser,
      cookieTokenPreview: cookieToken?.substring(0, 20) + "...",
      cookieUserPreview: cookieUser?.substring(0, 100) + "..."
    })
    
    if (cookieUser) {
      try {
        const parsedCookieUser = JSON.parse(decodeURIComponent(cookieUser))
        console.log("🍪 [Parsed Cookie User]:", {
          id: parsedCookieUser.id,
          email: parsedCookieUser.email,
          role: parsedCookieUser.bwenge_role
        })
      } catch (error) {
        console.error("❌ [Cookie Parse Error]:", error)
      }
    }
    
    const localToken = localStorage.getItem("bwengeplus_token")
    const localUser = localStorage.getItem("bwengeplus_user")
    console.log("💾 [localStorage]:", {
      hasLocalToken: !!localToken,
      hasLocalUser: !!localUser,
      localTokenPreview: localToken?.substring(0, 20) + "..."
    })
    
    if (localUser) {
      try {
        const parsedLocalUser = JSON.parse(localUser)
        console.log("💾 [Parsed localStorage User]:", {
          id: parsedLocalUser.id,
          email: parsedLocalUser.email,
          role: parsedLocalUser.bwenge_role
        })
      } catch (error) {
        console.error("❌ [localStorage Parse Error]:", error)
      }
    }
    
    if (!user && !cookieUser && !localUser) {
      console.error("❌ [CRITICAL] No authentication found anywhere!")
      console.log("🔴 [ACTION] User should be redirected to login")
    } else if (!user && (cookieUser || localUser)) {
      console.warn("⚠️ [WARNING] Auth data exists but useAuth hook not initialized yet")
      console.log("⏳ [INFO] Wait for hook to initialize...")
    } else if (user) {
      console.log("✅ [SUCCESS] User authenticated and ready")
    }
    
    console.log("=" .repeat(80))
  }, [user, token])

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) {
        console.log("⏸️ [fetchData] Skipping data fetch - no authentication")
        return
      }

      console.log("📡 [fetchData] Starting data fetch...")
      setInLoading(true)

      try {
        console.log("📁 [fetchData] Fetching categories...")
        const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (categoriesResponse.ok) {
          const data = await categoriesResponse.json()
          const categoriesArray = data.data?.categories || data.data || []
          setCategories(categoriesArray)
          console.log("✅ [fetchData] Categories loaded:", categoriesArray.length)
        }

        if (user.bwenge_role === "SYSTEM_ADMIN") {
          console.log("🏛️ [fetchData] Fetching institutions...")
          const institutionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/institutions`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (institutionsResponse.ok) {
            const data = await institutionsResponse.json()
            setInstitutions(data.data || [])
            console.log("✅ [fetchData] Institutions loaded:", data.data?.length)
          }
        }
        
        console.log("✅ [fetchData] All data fetched successfully")
      } catch (error) {
        console.error("❌ [fetchData] Error:", error)
        toast.error("Failed to load initial data")
      } finally {
        setInLoading(false)
      }
    }

    if (user && token) {
      fetchData()
    }
  }, [user, token])

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

  const handleThumbnailFileSelect = (file: File | null) => {
    setThumbnailFile(file)
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      steps[currentStep].isCompleted = true
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex)
    }
  }

const handleCourseSubmission = async () => {
  console.log("=" .repeat(80))
  console.log("🚀 [handleCourseSubmission] SUBMISSION START")
  console.log("=" .repeat(80))
  
  console.log("🔐 [handleCourseSubmission] Checking authentication...")
  
  if (!user || !token) {
    console.error("❌ [handleCourseSubmission] AUTHENTICATION FAILED")
    console.log("📊 [handleCourseSubmission] Auth State:", {
      hasUser: !!user,
      hasToken: !!token,
      userId: user?.id,
      email: user?.email
    })
    
    const cookieToken = Cookies.get("bwenge_token")
    const cookieUser = Cookies.get("bwenge_user")
    const localToken = localStorage.getItem("bwengeplus_token")
    const localUser = localStorage.getItem("bwengeplus_user")
    
    console.log("🔍 [handleCourseSubmission] Looking for auth in storage:", {
      hasCookieToken: !!cookieToken,
      hasCookieUser: !!cookieUser,
      hasLocalToken: !!localToken,
      hasLocalUser: !!localUser
    })
    
    if (cookieToken || localToken) {
      toast.error("Session initializing, please try again in a moment")
    } else {
      toast.error("You must be logged in to create a course")
      router.push("/login")
    }
    return
  }

  console.log("✅ [handleCourseSubmission] Authentication verified")
  console.log("👤 [handleCourseSubmission] User details:", {
    id: user.id,
    email: user.email,
    role: user.bwenge_role,
    primary_institution_id: user.primary_institution_id,
    institution_ids: user.institution_ids,
    institution: user.institution
  })

  setIsSubmitting(true)
  
  try {
    const formData = new FormData()
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
      console.log("🖼️ [handleCourseSubmission] Thumbnail attached with field name 'thumbnail'");
    } else {
      console.log("⚠️ [handleCourseSubmission] No thumbnail file selected")
    }
    
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

    // ==================== ✅ FIXED: INSTITUTION ID HANDLING ====================
    console.log("🏢 [handleCourseSubmission] Processing institution assignment...")
    
    // For INSTITUTION_ADMIN: ALWAYS use their primary_institution_id
    if (user.bwenge_role === "INSTITUTION_ADMIN") {
      if (!user.primary_institution_id) {
        toast.error("Your account is not associated with an institution")
        return
      }
      
      // Set institution_id for BOTH SPOC and MOOC courses
      coursePayload.institution_id = user.primary_institution_id
      
      console.log("✅ [handleCourseSubmission] Institution Admin - Using primary_institution_id:", user.primary_institution_id)
      console.log("📋 [handleCourseSubmission] Course type:", courseData.course_type)
      console.log("📋 [handleCourseSubmission] Institution assigned:", user.primary_institution_id)
    }
    // For SYSTEM_ADMIN: Use selected institution_id from form (for SPOC) or null (for MOOC)
    else if (user.bwenge_role === "SYSTEM_ADMIN") {
      if (courseData.course_type === "SPOC") {
        if (courseData.institution_id) {
          coursePayload.institution_id = courseData.institution_id
          console.log("✅ [handleCourseSubmission] System Admin - Using selected institution_id:", courseData.institution_id)
        } else {
          toast.error("Please select an institution for SPOC course")
          return
        }
      } else {
        // MOOC courses don't require institution for SYSTEM_ADMIN
        coursePayload.institution_id = null
        console.log("ℹ️ [handleCourseSubmission] System Admin - MOOC course, no institution required")
      }
    }

    // For CONTENT_CREATOR or INSTRUCTOR: Use their institution if they have one
    else if (user.primary_institution_id) {
      coursePayload.institution_id = user.primary_institution_id
      console.log("✅ [handleCourseSubmission] User with institution - Using primary_institution_id:", user.primary_institution_id)
    }

    console.log("🏢 [handleCourseSubmission] Final institution_id:", coursePayload.institution_id || "null")

    // ==================== INSTRUCTOR ASSIGNMENT ====================
    if (user.bwenge_role === "SYSTEM_ADMIN" && courseData.instructor_id) {
      coursePayload.instructor_id = courseData.instructor_id
      console.log("👨‍🏫 [handleCourseSubmission] Admin assigned instructor:", courseData.instructor_id)
    }

    // ==================== SPOC-SPECIFIC SETTINGS ====================
    if (courseData.course_type === "SPOC") {
      if (courseData.max_enrollments) {
        coursePayload.max_enrollments = courseData.max_enrollments
      }
      console.log("🎓 [handleCourseSubmission] SPOC course settings applied")
    }

    // ==================== CATEGORY ASSIGNMENT ====================
    if (courseData.category_id) {
      coursePayload.category_id = courseData.category_id
    } else if (courseData.category_name) {
      coursePayload.category_name = courseData.category_name
    }

    // ==================== MODULES ====================
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

    console.log("📦 [handleCourseSubmission] Payload summary:", {
      title: coursePayload.title,
      course_type: coursePayload.course_type,
      institution_id: coursePayload.institution_id || "null",
      instructor_id: coursePayload.instructor_id || "Will use logged-in user",
      modules_count: coursePayload.modules.length,
      total_lessons: coursePayload.modules.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0),
    })

    // ==================== APPEND TO FORMDATA ====================
    Object.keys(coursePayload).forEach(key => {
      if (key === 'modules' || key === 'tags') {
        formData.append(key, JSON.stringify(coursePayload[key]))
      } else if (coursePayload[key] !== undefined && coursePayload[key] !== null) {
        formData.append(key, coursePayload[key])
      }
    })

    console.log("📡 [handleCourseSubmission] Sending request to API...")
    console.log("🔑 [handleCourseSubmission] Using token:", token.substring(0, 20) + "...")

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    console.log("📨 [handleCourseSubmission] Response status:", response.status)

    const result = await response.json()
    
    console.log("📬 [handleCourseSubmission] Response data:", {
      success: result.success,
      message: result.message,
      courseId: result.data?.id,
      institution_id: result.data?.institution_id,
      summary: result.summary
    })

    if (!response.ok) {
      throw new Error(result.message || "Failed to create course")
    }

    console.log("✅ [handleCourseSubmission] Course created successfully!")
    console.log("=" .repeat(80))

    clearStorageOnSuccess()

    toast.success("Course created successfully!")

    return result
  } catch (error: any) {
    console.error("❌ [handleCourseSubmission] Error:", error)
    console.error("📋 [handleCourseSubmission] Error details:", {
      message: error.message,
      stack: error.stack
    })
    console.log("=" .repeat(80))
    
    toast.error(error.message || "Failed to create course")
    throw error
  } finally {
    setIsSubmitting(false)
  }
}

  if (!user && !Cookies.get("bwenge_token") && !localStorage.getItem("bwengeplus_token")) {
    console.log("⚠️ [Render] No authentication found - showing error")
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-red-900 mb-2">Authentication Required</h2>
            <p className="text-red-700 mb-4">You must be logged in to create a course.</p>
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Go to Login
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Step Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center min-w-0 flex-1 relative px-2">
              {index < steps.length - 1 && (
                <div className={`hidden md:block absolute top-3 left-1/2 w-full h-0.5 ${
                  index < currentStep ? "bg-[#0158B7]" : "bg-gray-200"
                }`} />
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
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                  }
                  ${index <= currentStep ? "cursor-pointer hover:scale-105" : "cursor-not-allowed"}
                `}
              >
                {index < currentStep ? <CheckCircle className="w-4 h-4" /> : step.icon}
              </button>
              
              <div className="text-center">
                <p
                  className={`text-xs font-medium ${
                    index <= currentStep ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="min-h-[600px] border border-gray-200 bg-white shadow-sm">
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
              />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}