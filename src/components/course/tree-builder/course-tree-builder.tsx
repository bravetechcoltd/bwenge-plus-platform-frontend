// @ts-nocheck

"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { BookOpen, ChevronDown, ChevronRight, Plus, Trash2, Trophy, Loader2, Save, Video, PanelLeftClose, PanelLeftOpen, Image as ImageIcon, Paperclip } from "lucide-react"
// import type { Module, Lesson, Assessment } from "@/types"
import { ContentEditor } from "./content-editor"
import { useAuth } from "@/hooks/use-auth"
import { generateTempId, isTempId } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Enhanced types with status tracking
interface BaseEntity {
  id: string
  _status?: 'local' | 'synced' | 'modified' | 'deleting'
  _tempId?: string
  created_at?: Date
  updated_at?: Date
}

interface Module extends BaseEntity {
  title: string
  description?: string
  order_index?: number
  course_id: string
  estimated_duration_hours?: number
  is_published?: boolean
  lessons?: Lesson[]
  final_assessment?: Assessment
}

interface Lesson extends BaseEntity {
  title: string
  content?: string
  video_url?: string
  thumbnail_url?: string
  duration_minutes?: number
  order_index?: number
  module_id: string
  course_id: string
  type?: string
  is_preview?: boolean
  is_published?: boolean
  resources?: any[]
  assessments?: Assessment[]
}

interface Assessment extends BaseEntity {
  title: string
  description?: string
  type: string
  questions: any[]
  passing_score?: number
  time_limit_minutes?: number
  max_attempts?: number
  lesson_id?: string
  module_id?: string
  course_id?: string
  is_published?: boolean
  is_final_assessment?: boolean
  is_module_final?: boolean
}

interface TreeItem {
  id: string
  type: "module" | "lesson" | "assessment" | "module_final_assessment"
  title: string
  moduleId?: string
  lessonId?: string
  data: Module | Lesson | Assessment
}

interface DeleteDialogState {
  open: boolean
  item: TreeItem | null
  isLocal: boolean
}

interface CourseTreeBuilderProps {
  modules: Module[]
  setModules: (modules: any) => void
  onNext: () => void
  onPrevious: () => void
  type?: string
  loading?: boolean
  courseId?: string
  onSave?: () => void
  /** Expose video files to parent for submission */
  onVideoFilesChange?: (files: Map<string, File>) => void
  /** NEW: expose thumbnail files to parent */
  onThumbnailFilesChange?: (files: Map<string, File>) => void
  /** NEW: expose material files to parent */
  onMaterialFilesChange?: (files: Map<string, File[]>) => void
}

export function CourseTreeBuilder({ modules, setModules, onNext, onPrevious, type, loading, courseId, onSave, onVideoFilesChange, onThumbnailFilesChange, onMaterialFilesChange }: CourseTreeBuilderProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    Array.isArray(modules)
      ? new Set(modules.map(m => m.id))
      : new Set()
  )
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<TreeItem | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    item: null,
    isLocal: false
  })
  const [isSaving, setIsSaving] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Map of lessonId -> File for locally selected video files
  const [videoFiles, setVideoFiles] = useState<Map<string, File>>(new Map())
  // NEW: Map of lessonId -> thumbnail File
  const [thumbnailFiles, setThumbnailFiles] = useState<Map<string, File>>(new Map())
  // NEW: Map of lessonId -> material File[]
  const [materialFiles, setMaterialFiles] = useState<Map<string, File[]>>(new Map())

  const { token, user } = useAuth()
  const router = useRouter()

  // Initialize expanded modules
  useEffect(() => {
    if (modules && Array.isArray(modules)) {
      setExpandedModules(new Set(modules.map(m => m.id)))
    }
  }, [modules])

  // Handle video file selection from ContentEditor
  const handleVideoFileSelect = useCallback((lessonId: string, file: File | null) => {
    setVideoFiles(prev => {
      const next = new Map(prev)
      if (file) { next.set(lessonId, file) } else { next.delete(lessonId) }
      onVideoFilesChange?.(next)
      return next
    })
  }, [onVideoFilesChange])

  // NEW: Handle thumbnail file selection from ContentEditor
  const handleThumbnailFileSelect = useCallback((lessonId: string, file: File | null) => {
    setThumbnailFiles(prev => {
      const next = new Map(prev)
      if (file) { next.set(lessonId, file) } else { next.delete(lessonId) }
      onThumbnailFilesChange?.(next)
      return next
    })
  }, [onThumbnailFilesChange])

  // NEW: Handle material files change from ContentEditor
  const handleMaterialFilesChange = useCallback((lessonId: string, files: File[]) => {
    setMaterialFiles(prev => {
      const next = new Map(prev)
      if (files.length > 0) { next.set(lessonId, files) } else { next.delete(lessonId) }
      onMaterialFilesChange?.(next)
      return next
    })
  }, [onMaterialFilesChange])

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  // Toggle lesson expansion
  const toggleLesson = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons)
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId)
    } else {
      newExpanded.add(lessonId)
    }
    setExpandedLessons(newExpanded)
  }

  // Add new module
  const addModule = () => {
    const moduleId = generateTempId()
    const newModule: Module = {
      id: moduleId,
      title: "New Module",
      description: "",
      order_index: modules.length + 1,
      course_id: courseId || "",
      estimated_duration_hours: 0,
      is_published: false,
      created_at: new Date(),
      updated_at: new Date(),
      lessons: [],
      _status: 'local',
      _tempId: moduleId,
    }
    setModules([...modules, newModule])
    setExpandedModules(new Set([...expandedModules, moduleId]))
    setSelectedItem({
      id: moduleId,
      type: "module",
      title: newModule.title,
      data: newModule,
    })
  }

  // Add lesson to module
  const addLesson = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId)
    if (!module) return

    const lessonId = generateTempId()
    const newLesson: Lesson = {
      id: lessonId,
      title: "New Lesson",
      content: "",
      duration_minutes: 0,
      order_index: module.lessons?.length || 0,
      module_id: moduleId,
      course_id: courseId || "",
      type: "VIDEO",
      is_preview: false,
      is_published: false,
      created_at: new Date(),
      updated_at: new Date(),
      _status: 'local',
      _tempId: lessonId,
      resources: [],
    }

    const updatedModules = modules.map((m) =>
      m.id === moduleId
        ? {
          ...m,
          lessons: [...(m.lessons || []), newLesson]
        }
        : m
    )

    setModules(updatedModules)
    setExpandedLessons(new Set([...expandedLessons, lessonId]))
    setSelectedItem({
      id: lessonId,
      type: "lesson",
      title: newLesson.title,
      moduleId,
      data: newLesson,
    })
  }

  // Add assessment to lesson
  const addAssessment = (moduleId: string, lessonId: string) => {
    const assessmentId = generateTempId()
    const newAssessment: Assessment = {
      id: assessmentId,
      title: "New Assessment",
      description: "",
      type: "QUIZ",
      questions: [],
      passing_score: 70,
      time_limit_minutes: 30,
      max_attempts: 3,
      lesson_id: lessonId,
      module_id: moduleId,
      course_id: courseId,
      is_published: false,
      created_at: new Date(),
      updated_at: new Date(),
      _status: 'local',
      _tempId: assessmentId,
    }

    const updatedModules = modules.map((module) =>
      module.id === moduleId
        ? {
          ...module,
          lessons: module.lessons?.map((lesson) =>
            lesson.id === lessonId
              ? {
                ...lesson,
                assessments: [...(lesson.assessments || []), newAssessment],
              }
              : lesson
          ),
        }
        : module
    )

    setModules(updatedModules)
    setSelectedItem({
      id: assessmentId,
      type: "assessment",
      title: newAssessment.title,
      moduleId,
      lessonId,
      data: newAssessment,
    })
  }

  // Add final assessment to module
  const addFinalAssessment = (moduleId: string) => {
    const assessmentId = generateTempId()
    const newFinalAssessment: Assessment = {
      id: assessmentId,
      title: "Final Assessment",
      type: "ASSESSMENT",
      description: "",
      passing_score: 70,
      time_limit_minutes: 60,
      max_attempts: 2,
      module_id: moduleId,
      course_id: courseId,
      is_published: false,
      is_module_final: true,
      questions: [],
      created_at: new Date(),
      updated_at: new Date(),
      _status: 'local',
      _tempId: assessmentId,
    }

    const updatedModules = modules.map((module) =>
      module.id === moduleId
        ? {
          ...module,
          final_assessment: newFinalAssessment
        }
        : module
    )

    setModules(updatedModules)
    setSelectedItem({
      id: assessmentId,
      type: "module_final_assessment",
      title: newFinalAssessment.title,
      moduleId,
      data: newFinalAssessment,
    })
  }

  // Remove item from UI state
  const removeFromUI = (item: TreeItem) => {
    let updatedModules = [...modules]

    if (item.type === "module") {
      updatedModules = updatedModules.filter(m => m.id !== item.id)
    }
    else if (item.type === "lesson" && item.moduleId) {
      updatedModules = updatedModules.map(module =>
        module.id === item.moduleId
          ? { ...module, lessons: module.lessons?.filter(l => l.id !== item.id) || [] }
          : module
      )
      // Remove video file for this lesson
      setVideoFiles(prev => { const next = new Map(prev); next.delete(item.id); onVideoFilesChange?.(next); return next })
      // NEW: Remove thumbnail file for this lesson
      setThumbnailFiles(prev => { const next = new Map(prev); next.delete(item.id); onThumbnailFilesChange?.(next); return next })
      // NEW: Remove material files for this lesson
      setMaterialFiles(prev => { const next = new Map(prev); next.delete(item.id); onMaterialFilesChange?.(next); return next })
    }
    else if (item.type === "assessment" && item.moduleId && item.lessonId) {
      updatedModules = updatedModules.map(module =>
        module.id === item.moduleId
          ? {
            ...module,
            lessons: module.lessons?.map(lesson =>
              lesson.id === item.lessonId
                ? {
                  ...lesson,
                  assessments: lesson.assessments?.filter(a => a.id !== item.id) || []
                }
                : lesson
            ) || []
          }
          : module
      )
    }
    else if (item.type === "module_final_assessment" && item.moduleId) {
      updatedModules = updatedModules.map(module =>
        module.id === item.moduleId
          ? { ...module, final_assessment: undefined }
          : module
      )
    }

    setModules(updatedModules)

    if (selectedItem?.id === item.id) {
      setSelectedItem(null)
    }
  }

  // Mark item as deleting for UI feedback
  const markItemAsDeleting = (id: string) => {
    setModules((prevModules: any[]) =>
      prevModules.map(module => {
        // Check module itself
        if (module.id === id) {
          return { ...module, _status: 'deleting' as const }
        }

        // Check lessons in module
        const updatedLessons = module.lessons?.map((lesson: any) => {
          if (lesson.id === id) {
            return { ...lesson, _status: 'deleting' as const }
          }

          // Check assessments in lesson
          const updatedAssessments = lesson.assessments?.map((assessment: any) => {
            if (assessment.id === id) {
              return { ...assessment, _status: 'deleting' as const }
            }
            return assessment
          })

          return {
            ...lesson,
            assessments: updatedAssessments
          }
        })

        // Check final assessment
        let updatedFinalAssessment = module.final_assessment
        if (module.final_assessment?.id === id) {
          updatedFinalAssessment = {
            ...module.final_assessment,
            _status: 'deleting' as const
          }
        }

        return {
          ...module,
          lessons: updatedLessons,
          final_assessment: updatedFinalAssessment
        }
      })
    )
  }

  // Remove deleting status from item
  const unmarkItemAsDeleting = (id: string) => {
    setModules((prevModules: any[]) =>
      prevModules.map(module => ({
        ...module,
        _status: module.id === id ? 'synced' : module._status,
        lessons: module.lessons?.map((lesson: any) => ({
          ...lesson,
          _status: lesson.id === id ? 'synced' : lesson._status,
          assessments: lesson.assessments?.map((assessment: any) => ({
            ...assessment,
            _status: assessment.id === id ? 'synced' : assessment._status
          }))
        })),
        final_assessment: module.final_assessment?.id === id
          ? { ...module.final_assessment, _status: 'synced' as const }
          : module.final_assessment
      }))
    )
  }

  // Delete item from database
  const deleteFromDatabase = async (item: TreeItem) => {
    if (!token) {
      toast.error("Authentication required")
      return
    }

    try {
      // Mark item as deleting for UI feedback
      markItemAsDeleting(item.id)

      // Determine endpoint based on item type
      let endpoint = ''

      switch (item.type) {
        case 'module':
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/courses/module/${item.id}`
          break
        case 'lesson':
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/courses/lesson/${item.id}`
          break
        case 'assessment':
        case 'module_final_assessment':
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/courses/assessment/${item.id}`
          break
      }

      // Call API endpoint
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to delete ${item.type}`)
      }

      // Remove from UI after successful deletion
      removeFromUI(item)
      toast.success(`${item.type} deleted successfully`)

    } catch (error: any) {
      console.error(`Error deleting ${item.type}:`, error)

      // Remove deleting state on error
      unmarkItemAsDeleting(item.id)

      // Show error message
      toast.error(error.message || `Failed to delete ${item.type}`)

      // Re-throw error for potential handling by parent component
      throw error
    }
  }

  // Handle delete click - opens confirmation dialog
  const handleDeleteClick = (e: React.MouseEvent, item: TreeItem) => {
    e.stopPropagation()

    // Prevent deletion if already deleting
    if ((item.data as any)._status === 'deleting') return
    const isLocal = isTempId(item.data.id)
    setDeleteDialog({
      open: true,
      item,
      isLocal
    })
  }

  // Confirm and execute deletion
  const confirmDelete = async () => {
    if (!deleteDialog.item) return

    try {
      if (deleteDialog.isLocal) {
        // Local item - just remove from UI
        removeFromUI(deleteDialog.item)
        toast.success("Item removed")
      } else {
        // Database item - delete from backend
        await deleteFromDatabase(deleteDialog.item)
      }
    } catch (error) {
      // Error is already handled in deleteFromDatabase
    } finally {
      // Close dialog
      setDeleteDialog({ open: false, item: null, isLocal: false })
    }
  }

  // Update item
  const updateItem = (item: TreeItem, updates: any) => {
    if (item.type === "module") {
      setModules(modules.map((m) =>
        m.id === item.id
          ? {
            ...m,
            ...updates,
            _status: m._status === 'synced' ? 'modified' : m._status,
            updated_at: new Date()
          }
          : m
      ))
    } else if (item.type === "lesson" && item.moduleId) {
      setModules(
        modules.map((module) =>
          module.id === item.moduleId
            ? {
              ...module,
              lessons: module.lessons?.map((l) =>
                l.id === item.id
                  ? {
                    ...l,
                    ...updates,
                    _status: l._status === 'synced' ? 'modified' : l._status,
                    updated_at: new Date()
                  }
                  : l
              ),
            }
            : module,
        ),
      )
    } else if (item.type === "assessment" && item.moduleId && item.lessonId) {
      setModules(
        modules.map((module) =>
          module.id === item.moduleId
            ? {
              ...module,
              lessons: module.lessons?.map((lesson) =>
                lesson.id === item.lessonId
                  ? {
                    ...lesson,
                    assessments: lesson.assessments?.map((a) =>
                      a.id === item.id
                        ? {
                          ...a,
                          ...updates,
                          _status: a._status === 'synced' ? 'modified' : a._status,
                          updated_at: new Date()
                        }
                        : a
                    ),
                  }
                  : lesson,
              ),
            }
            : module,
        ),
      )
    } else if (item.type === "module_final_assessment" && item.moduleId) {
      setModules(
        modules.map((module) =>
          module.id === item.moduleId
            ? {
              ...module,
              final_assessment: {
                ...module.final_assessment,
                ...updates,
                _status: module.final_assessment?._status === 'synced' ? 'modified' : module.final_assessment?._status,
                updated_at: new Date()
              } as any
            }
            : module,
        ),
      )
    }
  }

  // ==================== SAVE MODULES ====================
  // When courseId is present (update mode), saves via JSON PUT.
  // When called during course creation (no courseId), video files are
  // collected by the parent wizard via onVideoFilesChange and appended
  // to the FormData submission in handleCourseSubmission.
  const saveModules = async () => {
    if (!courseId || !token) {
      toast.error("Course ID or authentication missing")
      return
    }

    setIsSaving(true)
    console.log("💾 [FRONTEND] Starting save modules...");
    console.log("💾 [FRONTEND] Course ID:", courseId);
    console.log("💾 [FRONTEND] Token exists:", !!token);
    console.log("💾 [FRONTEND] Modules count:", modules.length);

    try {
      // ==================== PREPARE MODULES DATA ====================
      const modulesData = modules.map((module, index) => {
        const moduleData: any = {
          title: module.title,
          description: module.description || "",
          order_index: module.order_index || index + 1,
          estimated_duration_hours: module.estimated_duration_hours || 0,
          lessons: module.lessons?.map((lesson, lessonIndex) => {
            const lessonData: any = {
              title: lesson.title,
              content: lesson.content || "",
              // Strip blob URLs — actual video files are uploaded separately via FormData
              video_url: lesson.video_url && lesson.video_url.startsWith("blob:")
                ? ""
                : lesson.video_url || "",
              thumbnail_url: lesson.thumbnail_url || "",
              duration_minutes: lesson.duration_minutes || 0,
              order_index: lesson.order_index || lessonIndex + 1,
              type: lesson.type || "VIDEO",
              is_preview: lesson.is_preview || false,
              resources: lesson.resources || [],
              assessments: lesson.assessments?.map((assessment) => {
                const assessmentData: any = {
                  title: assessment.title,
                  description: assessment.description || "",
                  type: assessment.type || "QUIZ",
                  passing_score: assessment.passing_score || 70,
                  max_attempts: assessment.max_attempts || 3,
                  time_limit_minutes: assessment.time_limit_minutes || null,
                  questions: (assessment.questions || []).map((q, qIndex) => ({
                    question: q.question,
                    type: q.type || "MULTIPLE_CHOICE",
                    options: q.options || [],
                    correct_answer: q.correct_answer || "",
                    points: q.points || 1,
                    order_index: q.order_index || qIndex + 1,
                  }))
                }

                // Include ID if it's not a temp ID
                if (assessment.id && !isTempId(assessment.id)) {
                  assessmentData.id = assessment.id
                }

                return assessmentData
              }) || []
            }

            // Include ID if it's not a temp ID
            if (lesson.id && !isTempId(lesson.id)) {
              lessonData.id = lesson.id
            }

            return lessonData
          }) || [],
        }

        // Include module final assessment
        if (module.final_assessment) {
          moduleData.final_assessment = {
            title: module.final_assessment.title,
            type: module.final_assessment.type, // ✅ Send the actual type, don't transform it
            description: module.final_assessment.description || "",
            instructions: module.final_assessment.description || "",
            passing_score: module.final_assessment.passing_score || 70,
            time_limit_minutes: module.final_assessment.time_limit_minutes || null,
            fileRequired: false,
            // ✅ ALWAYS include questions regardless of type
            questions: (module.final_assessment.questions || []).map((q, qIndex) => ({
              question: q.question,
              type: q.type || "MULTIPLE_CHOICE",
              options: q.options || [],
              correct_answer: q.correct_answer || "",
              points: q.points || 1,
              order_index: q.order_index || qIndex + 1,
            }))
          };

          // Include ID if it's not a temp ID
          if (module.final_assessment.id && !isTempId(module.final_assessment.id)) {
            moduleData.final_assessment.id = module.final_assessment.id;
          }
        }

        // Include module ID if it's not a temp ID
        if (module.id && !isTempId(module.id)) {
          moduleData.id = module.id
        }

        return moduleData
      })

      // ==================== CHECK FOR VIDEO FILES ====================
      // If there are pending video files, use FormData so multer can handle them.
      // Otherwise use plain JSON (original behaviour).
      const hasVideoFiles = videoFiles.size > 0 || thumbnailFiles.size > 0 || materialFiles.size > 0

      if (hasVideoFiles) {
        console.log("💾 [FRONTEND] Video files detected — using FormData upload");

        const formData = new FormData()
        formData.append("modules", JSON.stringify(modulesData))

        // Walk modules to append video, thumbnail, and material files
        modules.forEach((module, modIdx) => {
          module.lessons?.forEach((lesson, lesIdx) => {
            // Video
            const videoFile = videoFiles.get(lesson.id)
            if (videoFile) {
              const fieldName = `modules[${modIdx}].lessons[${lesIdx}].video`
              formData.append(fieldName, videoFile)
              console.log(`💾 [FRONTEND] Appended video: ${fieldName} (${videoFile.name})`)
            }
            // NEW: Thumbnail
            const thumbFile = thumbnailFiles.get(lesson.id)
            if (thumbFile) {
              const fieldName = `modules[${modIdx}].lessons[${lesIdx}].thumbnail`
              formData.append(fieldName, thumbFile)
              console.log(`💾 [FRONTEND] Appended thumbnail: ${fieldName} (${thumbFile.name})`)
            }
            // NEW: Materials
            const matFiles = materialFiles.get(lesson.id) || []
            matFiles.forEach((matFile, matIdx) => {
              const fieldName = `modules[${modIdx}].lessons[${lesIdx}].materials[${matIdx}]`
              formData.append(fieldName, matFile)
              console.log(`💾 [FRONTEND] Appended material: ${fieldName} (${matFile.name})`)
            })
          })
        })

        const url = `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/modules`
        console.log("💾 [FRONTEND] Request URL (FormData):", url)

        const response = await fetch(url, {
          method: "PUT",
          headers: {
            // ⚠️ Do NOT set Content-Type — browser sets it automatically with boundary
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        console.log("💾 [FRONTEND] Response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          let error
          try { error = JSON.parse(errorText) } catch { error = { message: errorText } }
          throw new Error(error.message || "Failed to update modules")
        }

        const result = await response.json()
        console.log("💾 [FRONTEND] Success (FormData):", result.message)

        if (result.data?.modules) {
          const syncedModules = result.data.modules.map((module: any) => ({
            ...module,
            _status: 'synced' as const
          }))
          setModules(syncedModules)
        }

        // Clear all file maps after successful upload
        setVideoFiles(new Map()); onVideoFilesChange?.(new Map())
        setThumbnailFiles(new Map()); onThumbnailFilesChange?.(new Map())
        setMaterialFiles(new Map()); onMaterialFilesChange?.(new Map())

      } else {
        // ==================== ORIGINAL JSON PATH ====================
        console.log("💾 [FRONTEND] Prepared modules data:", modulesData.length, "modules");
        console.log("💾 [FRONTEND] First module:", modulesData[0]?.title);
        console.log("💾 [FRONTEND] Sample data:", JSON.stringify(modulesData[0]).substring(0, 200));

        const requestPayload = { modules: modulesData }

        console.log("💾 [FRONTEND] Request payload keys:", Object.keys(requestPayload));
        console.log("💾 [FRONTEND] Payload has modules:", !!requestPayload.modules);
        console.log("💾 [FRONTEND] Modules is array:", Array.isArray(requestPayload.modules));
        console.log("💾 [FRONTEND] Full payload size:", JSON.stringify(requestPayload).length, "bytes");

        const url = `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/modules`
        console.log("💾 [FRONTEND] Request URL:", url);
        console.log("💾 [FRONTEND] Request method: PUT");
        console.log("💾 [FRONTEND] Request headers:", {
          "Content-Type": "application/json",
          "Authorization": "Bearer [REDACTED]"
        });

        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json", // ⚠️ CRITICAL: Must be application/json
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(requestPayload), // ⚠️ CRITICAL: Must stringify
        })

        console.log("💾 [FRONTEND] Response status:", response.status);
        console.log("💾 [FRONTEND] Response ok:", response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("💾 [FRONTEND] Error response:", errorText);

          let error;
          try {
            error = JSON.parse(errorText);
          } catch {
            error = { message: errorText };
          }

          console.error("💾 [FRONTEND] Parsed error:", error);
          throw new Error(error.message || "Failed to update modules")
        }

        const result = await response.json()
        console.log("💾 [FRONTEND] Success response:", {
          success: result.success,
          message: result.message,
          modulesCount: result.summary?.total_modules,
          lessonsCount: result.summary?.total_lessons
        });

        // Update local state with synced data
        if (result.data?.modules) {
          const syncedModules = result.data.modules.map((module: any) => ({
            ...module,
            _status: 'synced' as const
          }))
          setModules(syncedModules)
          console.log("💾 [FRONTEND] Local state updated with synced modules");
        }
      }

      toast.success("Course modules updated successfully!")

      // Call onSave callback if provided
      if (onSave) {
        onSave()
      }

    } catch (error: any) {
      console.error("💾 [FRONTEND] ❌ Save failed:", error)
      console.error("💾 [FRONTEND] Error message:", error.message)
      console.error("💾 [FRONTEND] Error stack:", error.stack)
      toast.error(error.message || "Failed to save modules")
      throw error
    } finally {
      setIsSaving(false)
      console.log("💾 [FRONTEND] Save process completed");
    }
  }

  // Helper function to get status badge
  const getStatusBadge = (item: Module | Lesson | Assessment) => {
    switch (item._status) {
      case 'local':
        return (
          <Badge variant="outline" className="text-xs ml-1 bg-gray-100 text-gray-600">
            Unsaved
          </Badge>
        )
      case 'deleting':
        return (
          <Badge variant="destructive" className="text-xs ml-1">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Deleting...
          </Badge>
        )
      case 'modified':
        return (
          <Badge variant="outline" className="text-xs ml-1 bg-yellow-100 text-yellow-700">
            Modified
          </Badge>
        )
      default:
        return null
    }
  }

  const totalLessons = (modules && Array.isArray(modules)) && modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)
  const totalAssessments = (modules && Array.isArray(modules)) && modules.reduce(
    (acc, m) => acc + (m.lessons?.reduce((acc2, l) => acc2 + (l.assessments?.length || 0), 0) || 0),
    0,
  )

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.isLocal ? 'Delete Unsaved Item' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.isLocal
                ? `Delete "${deleteDialog.item?.title}"? This item hasn't been saved to the database yet and will be permanently removed.`
                : `Are you sure you want to delete "${deleteDialog.item?.title}"? This will permanently remove it from the database. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteDialog.isLocal ? 'Delete' : 'Delete from Database'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File upload indicator banners */}
      {(videoFiles.size > 0 || thumbnailFiles.size > 0 || materialFiles.size > 0) && (
        <div className="flex flex-wrap gap-2">
          {videoFiles.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <Video className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
              <span><strong>{videoFiles.size}</strong> video{videoFiles.size !== 1 ? "s" : ""} pending upload</span>
            </div>
          )}
          {thumbnailFiles.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
              <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 text-purple-500" />
              <span><strong>{thumbnailFiles.size}</strong> thumbnail{thumbnailFiles.size !== 1 ? "s" : ""} pending upload</span>
            </div>
          )}
          {materialFiles.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              <Paperclip className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />
              <span>
                <strong>{Array.from(materialFiles.values()).reduce((s, f) => s + f.length, 0)}</strong> material{Array.from(materialFiles.values()).reduce((s, f) => s + f.length, 0) !== 1 ? "s" : ""} pending upload
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 min-h-[700px] transition-all duration-300 ${sidebarCollapsed ? 'lg:grid-cols-[44px_1fr]' : 'lg:grid-cols-3'}`}>
        {/* ===== Left: Course Structure Tree ===== */}
        <div className={`lg:sticky lg:top-6 lg:h-fit transition-all duration-300 ${sidebarCollapsed ? 'w-[44px]' : 'lg:col-span-1'}`}>

          {/* ---- Collapsed state: just the toggle button centered ---- */}
          {sidebarCollapsed ? (
            <div className="flex items-center justify-center w-[44px] h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (

          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Course Structure</CardTitle>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-gray-500">
                {modules.length} modules • {totalLessons} lessons • {totalAssessments} assessments
              </div>
              {/* Top-level Add Module button — prominent, full width */}
              <Button
                onClick={addModule}
                className="w-full mt-2"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Module
              </Button>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              <div className="space-y-1">
                {modules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No modules yet</p>
                    <p className="text-xs mt-1">Click "Add Module" above to get started</p>
                  </div>
                ) : (
                  modules.map((module) => (
                    <div key={module.id} className="space-y-1">
                      {/* Module Node */}
                      <div
                        className={`flex items-center gap-1 p-2 rounded-lg cursor-pointer transition-colors group ${
                          selectedItem?.id === module.id
                            ? "bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        } ${module._status === 'local' ? 'opacity-75 border-dashed border-gray-300' : ''
                        } ${module._status === 'deleting' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (module._status !== 'deleting') {
                            setSelectedItem({
                              id: module.id,
                              type: "module",
                              title: module.title,
                              data: module,
                            })
                          }
                        }}
                      >
                        {module.lessons && module.lessons.length > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (module._status !== 'deleting') {
                                toggleModule(module.id)
                              }
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            disabled={module._status === 'deleting'}
                          >
                            {expandedModules.has(module.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-4 h-4 p-1" />
                        )}
                        <BookOpen className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{module.title || "Untitled Module"}</span>

                        {/* Status Badge */}
                        {getStatusBadge(module)}

                        {/* Delete button — visible on hover */}
                        <button
                          onClick={(e) => handleDeleteClick(e, {
                            id: module.id,
                            type: "module",
                            title: module.title,
                            data: module,
                          })}
                          disabled={module._status === 'deleting'}
                          className={`p-1 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                            module._status === 'deleting'
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                              : 'hover:bg-red-100 dark:hover:bg-red-900 text-red-600'
                          }`}
                          title={module._status === 'deleting' ? 'Deleting...' : 'Delete Module'}
                        >
                          {module._status === 'deleting' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Lessons */}
                      {expandedModules.has(module.id) && (
                        <div className="ml-4 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                          {(module.lessons || []).map((lesson) => (
                            <div key={lesson.id} className="space-y-1">
                              <div
                                className={`flex items-center gap-1 p-2 rounded-lg cursor-pointer transition-colors group ${
                                  selectedItem?.id === lesson.id
                                    ? "bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                } ${lesson._status === 'local' ? 'opacity-75 border-dashed border-gray-300' : ''
                                } ${lesson._status === 'deleting' ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                onClick={() => {
                                  if (lesson._status !== 'deleting') {
                                    setSelectedItem({
                                      id: lesson.id,
                                      type: "lesson",
                                      title: lesson.title,
                                      moduleId: module.id,
                                      data: lesson,
                                    })
                                  }
                                }}
                              >
                                {lesson.assessments && lesson.assessments.length > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (lesson._status !== 'deleting') {
                                        toggleLesson(lesson.id)
                                      }
                                    }}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                    disabled={lesson._status === 'deleting'}
                                  >
                                    {expandedLessons.has(lesson.id) ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-4 h-4 p-1" />
                                )}
                                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                                <span className="flex-1 text-xs font-medium truncate">
                                  {lesson.title || "Untitled Lesson"}
                                </span>

                                {/* Status Badge */}
                                {getStatusBadge(lesson)}

                                {/* Video file indicator badge */}
                                {videoFiles.has(lesson.id) && (
                                  <Badge variant="outline" className="text-xs ml-1 bg-blue-100 text-blue-600 border-blue-300">
                                    <Video className="w-2.5 h-2.5 mr-1" />
                                    video
                                  </Badge>
                                )}

                                {/* Delete button — visible on hover */}
                                <button
                                  onClick={(e) => handleDeleteClick(e, {
                                    id: lesson.id,
                                    type: "lesson",
                                    title: lesson.title,
                                    moduleId: module.id,
                                    data: lesson,
                                  })}
                                  disabled={lesson._status === 'deleting'}
                                  className={`p-1 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                    lesson._status === 'deleting'
                                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                      : 'hover:bg-red-100 dark:hover:bg-red-900 text-red-600'
                                  }`}
                                  title={lesson._status === 'deleting' ? 'Deleting...' : 'Delete Lesson'}
                                >
                                  {lesson._status === 'deleting' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                              </div>

                              {/* Assessments nested under lesson */}
                              {expandedLessons.has(lesson.id) && lesson.assessments && (
                                <div className="ml-4 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                                  {lesson.assessments.map((assessment) => (
                                    <div
                                      key={assessment.id}
                                      className={`flex items-center gap-1 p-2 rounded-lg cursor-pointer transition-colors group ${
                                        selectedItem?.id === assessment.id
                                          ? "bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800"
                                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                      } ${assessment._status === 'local' ? 'opacity-75 border-dashed border-gray-300' : ''
                                      } ${assessment._status === 'deleting' ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      onClick={() => {
                                        if (assessment._status !== 'deleting') {
                                          setSelectedItem({
                                            id: assessment.id,
                                            type: "assessment",
                                            title: assessment.title,
                                            moduleId: module.id,
                                            lessonId: lesson.id,
                                            data: assessment,
                                          })
                                        }
                                      }}
                                    >
                                      <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                                      <span className="flex-1 text-xs font-medium truncate">
                                        {assessment.title || "Untitled Assessment"}
                                      </span>

                                      {/* Status Badge */}
                                      {getStatusBadge(assessment)}

                                      <button
                                        onClick={(e) => handleDeleteClick(e, {
                                          id: assessment.id,
                                          type: "assessment",
                                          title: assessment.title,
                                          moduleId: module.id,
                                          lessonId: lesson.id,
                                          data: assessment,
                                        })}
                                        disabled={assessment._status === 'deleting'}
                                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                          assessment._status === 'deleting'
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                            : 'hover:bg-red-100 dark:hover:bg-red-900 text-red-600'
                                        }`}
                                        title={assessment._status === 'deleting' ? 'Deleting...' : 'Delete Assessment'}
                                      >
                                        {assessment._status === 'deleting' ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Assessment — inline text button under each lesson */}
                              <button
                                onClick={() => {
                                  if (lesson._status !== 'deleting') {
                                    addAssessment(module.id, lesson.id)
                                  }
                                }}
                                disabled={lesson._status === 'deleting'}
                                className={`flex items-center gap-1 px-2 py-1 w-full rounded text-xs transition-colors ml-4 ${
                                  lesson._status === 'deleting'
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950'
                                }`}
                                title="Add Assessment to this lesson"
                              >
                                <Plus className="w-3 h-3" />
                                Add Assessment
                              </button>
                            </div>
                          ))}

                          {/* Add Lesson — inline text button inside module */}
                          <button
                            onClick={() => {
                              if (module._status !== 'deleting') {
                                addLesson(module.id)
                              }
                            }}
                            disabled={module._status === 'deleting'}
                            className={`flex items-center gap-1 px-2 py-1.5 w-full rounded-lg text-xs transition-colors ${
                              module._status === 'deleting'
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'
                            }`}
                            title="Add Lesson to this module"
                          >
                            <Plus className="w-3 h-3" />
                            Add Lesson
                          </button>
                        </div>
                      )}

                      {/* Final Assessment — inside the module, after lessons */}
                      {expandedModules.has(module.id) && (
                        <div className="ml-4 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                          {module.final_assessment ? (
                            <div
                              className={`flex items-center gap-1 p-2 rounded-lg cursor-pointer transition-colors group ${
                                selectedItem?.id === module.final_assessment.id
                                  ? "bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
                              } ${module.final_assessment._status === 'local' ? 'opacity-75 border-dashed border-gray-300' : ''
                              } ${module.final_assessment._status === 'deleting' ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              onClick={() => {
                                if (module.final_assessment?._status !== 'deleting') {
                                  setSelectedItem({
                                    id: module.final_assessment?.id || "",
                                    type: "module_final_assessment",
                                    title: module.final_assessment?.title || "Final Assessment",
                                    moduleId: module.id,
                                    data: module.final_assessment || {},
                                  })
                                }
                              }}
                            >
                              <Trophy className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <span className="flex-1 text-sm font-medium truncate">
                                {module.final_assessment.title}
                              </span>

                              {/* Status Badge */}
                              {getStatusBadge(module.final_assessment)}

                              <button
                                onClick={(e) => handleDeleteClick(e, {
                                  id: module.final_assessment!.id,
                                  type: "module_final_assessment",
                                  title: module.final_assessment!.title,
                                  moduleId: module.id,
                                  data: module.final_assessment,
                                })}
                                disabled={module.final_assessment._status === 'deleting'}
                                className={`p-1 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  module.final_assessment._status === 'deleting'
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    : 'hover:bg-red-100 dark:hover:bg-red-900 text-red-600'
                                }`}
                                title={module.final_assessment._status === 'deleting' ? 'Deleting...' : 'Delete Final Assessment'}
                              >
                                {module.final_assessment._status === 'deleting' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            // Add Final Assessment — text button, purple to match trophy icon
                            <button
                              onClick={() => addFinalAssessment(module.id)}
                              className="flex items-center gap-1 px-2 py-1.5 w-full rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors text-xs"
                              disabled={module._status === 'deleting'}
                            >
                              <Plus className="w-3 h-3" />
                              Add Final Assessment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          )} {/* end expanded ternary */}
        </div>

        {/* ===== Right: Content Editor ===== */}
        <div className={sidebarCollapsed ? 'col-span-1' : 'lg:col-span-2'}>
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ContentEditor
                  item={selectedItem}
                  modules={modules}
                  onUpdate={(updates) => updateItem(selectedItem, updates)}
                  onDelete={() => handleDeleteClick(
                    { stopPropagation: () => { } } as React.MouseEvent,
                    selectedItem
                  )}
                  onVideoFileSelect={handleVideoFileSelect}
                  videoFiles={videoFiles}
                  onThumbnailFileSelect={handleThumbnailFileSelect}
                  thumbnailFiles={thumbnailFiles}
                  onMaterialFilesChange={handleMaterialFilesChange}
                  materialFiles={materialFiles}
                />
              </motion.div>
            ) : (
              // ===== Empty State: Build Your Course guide =====
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="h-full flex items-center justify-center min-h-[700px]">
                  <CardContent className="w-full max-w-sm py-12">
                    {/* Heading */}
                    <div className="text-center mb-8">
                      <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Build Your Course
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Start by creating a module, then add lessons and assessments inside each module.
                      </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3 mb-8">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          1
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add a Module</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            A module groups related lessons together (e.g. "Introduction", "Chapter 1")
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          2
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add Lessons</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Each lesson can have text content, a video, or both
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-orange-100 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          3
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add Assessments</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Add quizzes to lessons or a final assessment to end the module
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button onClick={addModule} className="w-full" size="lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Module
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>

        <div className="flex gap-3">
          {courseId && (
            <Button
              onClick={saveModules}
              disabled={modules.length === 0 || isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}

          <div className="text-sm text-gray-500 flex items-center">
            {modules.length > 0
              ? `Ready to review: ${modules.length} modules, ${totalLessons} lessons`
              : "Create at least one module to continue"}
          </div>
        </div>

        <Button onClick={onNext} disabled={modules.length === 0 || loading} size="lg" className="px-8">
          {type === "update" ? (loading ? "Updating..." : "Update Course") : "Review & Publish"}
        </Button>
      </div>
    </div>
  )
}