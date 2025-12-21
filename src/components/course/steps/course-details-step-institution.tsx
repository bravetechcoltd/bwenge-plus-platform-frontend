// @ts-nocheck
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Plus, X, ImageIcon, Clock, Tag, Award,
  BookOpen, Loader2, Building, Users, Globe,
  Lock, Shield, Settings, ChevronRight
} from "lucide-react"
import { ThumbnailUpload } from "../thumbnail-upload"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { Course, User, CourseCategory, Institution } from "@/types"
import { useAuth } from "@/hooks/use-auth"

interface CourseDetailsStepProps {
  courseData: Partial<Course>
  setCourseData: (data: Partial<Course>) => void
  onNext: () => void
  isFirstStep: boolean
  onThumbnailFileSelect: (file: File | null) => void
  thumbnailFile: File | null
  instructors: User[]
  categories: CourseCategory[]
  institutions: Institution[]
  user: User | null
  loading: boolean
  inLoading: boolean
}

// ── Reusable sub-components ─────────────────────────────────────────────────

/** Card container that matches the image: light border, white bg, rounded-xl */
function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Section header — matches "Basic Information / Essential course details" style */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0158B7]/10 flex items-center justify-center text-[#0158B7]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-none">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {/* Section body */}
      <div className="px-5 py-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

/** Thin intra-section row divider */
function RowDivider() {
  return <div className="border-t border-gray-100 -mx-5 my-1" />
}

/** Toggle row used for all Switch fields */
function ToggleRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode
  label: React.ReactNode
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="flex-shrink-0 mt-0.5 text-[#0158B7]">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="flex-shrink-0 data-[state=checked]:bg-[#0158B7]"
      />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function CourseDetailsStep({
  courseData,
  setCourseData,
  onNext,
  isFirstStep,
  onThumbnailFileSelect,
  thumbnailFile,
  instructors,
  categories,
  institutions,
  user,
  loading,
  inLoading,
}: CourseDetailsStepProps) {
  const [currentTag, setCurrentTag] = useState("")
  const [institutionCategories, setInstitutionCategories] = useState<CourseCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const { token } = useAuth()

  // ── Role flags ──────────────────────────────────────────
  const userRole = user?.bwenge_role
  const isSystemAdmin = userRole === "SYSTEM_ADMIN"
  const isInstitutionAdmin = userRole === "INSTITUTION_ADMIN"
  const isInstitutionInstructor = userRole === "INSTRUCTOR" && user?.is_institution_member

  const userInstitution = user?.institution
  const userInstitutionId = user?.primary_institution_id

  const getAvailableInstructors = () => {
    if (isSystemAdmin) return instructors
    if ((isInstitutionAdmin || isInstitutionInstructor) && userInstitutionId) {
      return instructors.filter(i => i.institution_ids?.includes(userInstitutionId))
    }
    return []
  }

  const getInstitutionIdForCategories = () => {
    if (isInstitutionAdmin || isInstitutionInstructor) return userInstitutionId
    if (isSystemAdmin && courseData.course_type === "SPOC") return courseData.institution_id
    return null
  }

  // ── Fetch institution categories ────────────────────────
  useEffect(() => {
    const fetchInstitutionCategories = async () => {
      const institutionId = getInstitutionIdForCategories()
      if (!institutionId || !token) { setInstitutionCategories([]); return }
      setLoadingCategories(true)
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/categories/institution/${institutionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await response.json()
        if (data.success) {
          const flattenCategories = (cats: any[]): any[] => {
            let result: any[] = []
            cats.forEach(cat => {
              result.push(cat)
              if (cat.subcategories?.length > 0) result = [...result, ...flattenCategories(cat.subcategories)]
            })
            return result
          }
          setInstitutionCategories(flattenCategories(data.data.categories || []))
        }
      } catch (error) {
        console.error("Failed to fetch institution categories:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchInstitutionCategories()
  }, [token, userInstitutionId, courseData.institution_id, courseData.course_type])

  // ── Tag helpers ─────────────────────────────────────────
  const addTag = () => {
    if (currentTag.trim() && !courseData.tags?.includes(currentTag.trim())) {
      setCourseData({ ...courseData, tags: [...(courseData.tags || []), currentTag.trim()] })
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCourseData({ ...courseData, tags: courseData.tags?.filter(t => t !== tagToRemove) || [] })
  }

  // ── Form ────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const isFormValid = () =>
    courseData.title?.trim() && courseData.description?.trim() && courseData.level && courseData.language?.trim()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#0158B7]" />
      </div>
    )
  }

  // Shared style tokens
  const sel = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0158B7]/30 focus:border-[#0158B7] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
  const inp = "border-gray-200 focus:border-[#0158B7] focus:ring-[#0158B7]/30 text-gray-900 placeholder:text-gray-400 text-sm transition-colors"
  const lbl = "text-sm font-medium text-gray-700"
  const hint = "text-xs text-gray-400 mt-0.5"

  // ── Render ──────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ═══════════════════════════════════════════════════
          OUTER CONTAINER — light blue-gray tinted background
          matches the image's "main container" feel
      ══════════════════════════════════════════════════════ */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-5">

        {/* Page heading inside outer container */}
        <div className="text-center pb-1">
          <h2 className="text-xl font-bold text-gray-900">Course Details</h2>
          <p className="text-sm text-gray-400 mt-0.5">Set up the foundation of your course</p>
        </div>

        {/* ── CARD 1: Basic Information ───────────────────── */}
        <Section
          icon={<BookOpen className="w-4 h-4" />}
          title="Basic Information"
          subtitle="Essential course details"
        >
          {/* Course Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className={lbl}>
              Course Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Complete React Development Course"
              value={courseData.title || ""}
              onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
              className={inp}
              required
            />
          </div>

          {/* Description — RichTextEditor matching the image */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className={lbl}>
              Description <span className="text-red-500">*</span>
            </Label>
            <RichTextEditor
              value={courseData.description || ""}
              onChange={(value) => setCourseData({ ...courseData, description: value })}
              className="min-h-[160px] border border-gray-200 rounded-lg overflow-hidden text-sm"
              placeholder="Brief overview of your course (2-3 sentences)"
            />
          </div>

          {/* Talk More About Your Course (short description) */}
          <div className="space-y-1.5">
            <Label htmlFor="short_description" className={lbl}>
              Talk More About Your Course
            </Label>
            <RichTextEditor
              value={courseData.short_description || ""}
              onChange={(value) => setCourseData({ ...courseData, short_description: value })}
              className="min-h-[120px] border border-gray-200 rounded-lg overflow-hidden text-sm"
              placeholder="A short summary shown in course listings and search results"
            />
          </div>
        </Section>

        {/* ── CARD 2: Course Setup ────────────────────────── */}
        <Section
          icon={<Settings className="w-4 h-4" />}
          title="Course Setup"
          subtitle="Type, access, and audience"
        >
          {/* Institution — System Admin SPOC */}
          {isSystemAdmin && courseData.course_type === "SPOC" && (
            <div className="space-y-1.5">
              <Label htmlFor="institution_id" className={lbl}>
                Institution <span className="text-red-500">*</span>
              </Label>
              <select
                id="institution_id"
                value={courseData.institution_id || ""}
                onChange={(e) => setCourseData({ ...courseData, institution_id: e.target.value || null })}
                disabled={inLoading}
                className={sel}
                required
              >
                <option value="">Select institution</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Institution — read-only for Institution Admin / Instructor */}
          {(isInstitutionAdmin || isInstitutionInstructor) && userInstitution && (
            <div className="space-y-1.5">
              <Label className={lbl}>Institution</Label>
              <Input value={userInstitution.name} disabled className="bg-gray-50 border-gray-200 text-gray-500 text-sm" />
              <p className={hint}>Courses are created under your institution</p>
              <input type="hidden" value={userInstitutionId}
                onChange={() => setCourseData({ ...courseData, institution_id: userInstitutionId })} />
            </div>
          )}

          {/* Course Type — System Admin */}
          {isSystemAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="course_type_sa" className={lbl}>
                Course Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="course_type_sa"
                value={courseData.course_type || "MOOC"}
                onChange={(e) => {
                  const value = e.target.value
                  const updates: any = { course_type: value }
                  if (value === "MOOC") {
                    updates.is_public = true
                    updates.requires_approval = false
                    updates.is_institution_wide = false
                    if (!courseData.institution_id) updates.institution_id = null
                  } else {
                    updates.is_public = false
                    updates.requires_approval = true
                    if (isInstitutionAdmin && userInstitutionId) updates.institution_id = userInstitutionId
                  }
                  setCourseData({ ...courseData, ...updates })
                }}
                className={sel}
              >
                <option value="MOOC">MOOC — Massive Open Online Course</option>
                <option value="SPOC">SPOC — Small Private Online Course</option>
              </select>
            </div>
          )}

          {/* Course Type — Institution Admin / Instructor */}
          {(isInstitutionAdmin || isInstitutionInstructor) && (
            <div className="space-y-1.5">
              <Label htmlFor="course_type_ia" className={lbl}>
                Course Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="course_type_ia"
                value={courseData.course_type || "SPOC"}
                onChange={(e) => {
                  const value = e.target.value
                  const updates: any = { course_type: value, institution_id: userInstitutionId }
                  if (value === "MOOC") {
                    updates.is_public = true
                    updates.requires_approval = false
                    updates.is_institution_wide = false
                  } else {
                    updates.is_public = false
                    updates.requires_approval = true
                  }
                  setCourseData({ ...courseData, ...updates })
                }}
                className={sel}
              >
                <option value="SPOC">SPOC — Small Private Online Course</option>
                <option value="MOOC">MOOC — Massive Open Online Course</option>
              </select>
            </div>
          )}

          {/* Course type info banner */}
          {courseData.course_type === "MOOC" && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
              <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-snug">
                <span className="font-semibold">MOOC</span> — Publicly visible on the platform, open to all learners.
              </p>
            </div>
          )}
          {courseData.course_type === "SPOC" && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-purple-50 border border-purple-100 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700 leading-snug">
                <span className="font-semibold">SPOC</span> — Requires an access code or institution membership to enroll.
              </p>
            </div>
          )}

          {/* Primary Instructor */}
          <div className="space-y-1.5">
            <Label htmlFor="instructor_id" className={lbl}>
              Primary Instructor
            </Label>
            <select
              id="instructor_id"
              value={courseData.instructor_id || ""}
              onChange={(e) => setCourseData({ ...courseData, instructor_id: e.target.value })}
              disabled={inLoading}
              className={sel}
            >
              <option value="">Select instructor</option>
              {getAvailableInstructors().map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.first_name} {instructor.last_name}
                  {(isInstitutionAdmin || isInstitutionInstructor) && ` (${instructor.email})`}
                </option>
              ))}
              {(isInstitutionAdmin || isInstitutionInstructor) && (
                <option value={user?.id}>{user?.first_name} {user?.last_name} (Myself)</option>
              )}
            </select>
          </div>

          {/* Level & Language — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="level" className={lbl}>
                Level <span className="text-red-500">*</span>
              </Label>
              <select id="level" value={courseData.level || ""} onChange={(e) => setCourseData({ ...courseData, level: e.target.value })} className={sel} required>
                <option value="">Select level</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language" className={lbl}>
                Language <span className="text-red-500">*</span>
              </Label>
              <select id="language" value={courseData.language || ""} onChange={(e) => setCourseData({ ...courseData, language: e.target.value })} className={sel} required>
                <option value="">Select language</option>
                <option value="English">English</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Swahili">Swahili</option>
                <option value="Kinyarwanda">Kinyarwanda</option>
              </select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label htmlFor="duration_minutes" className={lbl}>
              Duration (minutes)
            </Label>
            <Input
              id="duration_minutes"
              type="number"
              min="1"
              placeholder="e.g. 1200"
              value={courseData.duration_minutes || ""}
              onChange={(e) => setCourseData({ ...courseData, duration_minutes: Number.parseInt(e.target.value) || 0 })}
              className={inp}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category_id" className={lbl}>Category</Label>
            <div className="relative">
              <select
                id="category_id"
                value={courseData.category_id || ""}
                onChange={(e) => setCourseData({ ...courseData, category_id: e.target.value })}
                disabled={loadingCategories}
                className={sel}
              >
                <option value="">Select category</option>
                {loadingCategories ? (
                  <option disabled>Loading categories…</option>
                ) : institutionCategories.length > 0 ? (
                  institutionCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parent_category_id ? `↳ ${cat.name}` : cat.name}
                    </option>
                  ))
                ) : (
                  <option disabled>
                    {getInstitutionIdForCategories() ? "No categories found" : "Select an institution first"}
                  </option>
                )}
              </select>
              {loadingCategories && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── CARD 3: Course Content ──────────────────────── */}
        <Section
          icon={<BookOpen className="w-4 h-4" />}
          title="Course Content"
          subtitle="Learning outcomes and prerequisites"
        >
          {/* What You Will Learn */}
          <div className="space-y-1.5">
            <Label className={lbl}>What You Will Learn</Label>
            <p className={hint}>Key outcomes students can expect — use bullet points or numbered lists.</p>
            <RichTextEditor
              value={courseData.what_you_will_learn || ""}
              onChange={(value) => setCourseData({ ...courseData, what_you_will_learn: value })}
              className="min-h-[140px] border border-gray-200 rounded-lg overflow-hidden text-sm"
            />
          </div>

          {/* Requirements */}
          <div className="space-y-1.5">
            <Label className={lbl}>Requirements</Label>
            <p className={hint}>Prerequisites students should have before starting this course.</p>
            <RichTextEditor
              value={courseData.requirements || ""}
              onChange={(value) => setCourseData({ ...courseData, requirements: value })}
              className="min-h-[110px] border border-gray-200 rounded-lg overflow-hidden text-sm"
            />
          </div>
        </Section>

        {/* ── CARD 4: Thumbnail & Tags ────────────────────── */}
        <Section
          icon={<ImageIcon className="w-4 h-4" />}
          title="Media & Tags"
          subtitle="Course thumbnail and discovery tags"
        >
          {/* Thumbnail — comes BEFORE tags as requested */}
          <div className="space-y-1.5">
            <Label className={lbl}>Course Thumbnail</Label>
            <ThumbnailUpload
              onFileSelect={onThumbnailFileSelect}
              currentThumbnail={courseData.thumbnail_url}
              selectedFile={thumbnailFile}
            />
            {thumbnailFile && (
              <p className={hint}>
                {thumbnailFile.name} · {(thumbnailFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <RowDivider />

          {/* Tags */}
          <div className="space-y-2">
            <Label className={lbl}>Tags</Label>
            <p className={hint}>Help students discover your course via search and filters.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Type a tag and press Enter"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className={inp}
              />
              <Button
                type="button"
                onClick={addTag}
                size="sm"
                className="bg-[#0158B7] hover:bg-[#014A9C] text-white flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {(courseData.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {courseData.tags?.map((tag) => (
                  <Badge
                    key={tag}
                    className="flex items-center gap-1 bg-[#0158B7]/10 text-[#0158B7] border border-[#0158B7]/20 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-[#0158B7]/15 transition-colors"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── CARD 5: Access & Settings ───────────────────── */}
        <Section
          icon={<Shield className="w-4 h-4" />}
          title="Access & Settings"
          subtitle="Visibility, enrollment rules, and certificate"
        >
          {/* Public Course toggle — System Admin */}
          {isSystemAdmin && (
            <>
              <ToggleRow
                icon={<Globe className="w-4 h-4" />}
                label="Public Course"
                description="Visible to all users on the platform"
                checked={courseData.is_public !== false}
                onCheckedChange={(checked) => setCourseData({ ...courseData, is_public: checked })}
              />
              <RowDivider />
            </>
          )}

          {/* Public/Private toggle — Institution Admin / Instructor */}
          {(isInstitutionAdmin || isInstitutionInstructor) && (
            <>
              <ToggleRow
                icon={courseData.course_type === "MOOC"
                  ? <Globe className="w-4 h-4" />
                  : <Lock className="w-4 h-4" />}
                label={courseData.course_type === "MOOC" ? "Public Institution Course" : "Private Institution Course"}
                description={courseData.course_type === "MOOC"
                  ? "Publicly available, associated with your institution"
                  : "Accessible to institution members only"}
                checked={courseData.course_type === "MOOC"}
                onCheckedChange={(checked) => {
                  const newType = checked ? "MOOC" : "SPOC"
                  const updates: any = { course_type: newType }
                  if (newType === "MOOC") {
                    updates.is_public = true
                    updates.requires_approval = false
                    updates.is_institution_wide = false
                  } else {
                    updates.is_public = false
                    updates.requires_approval = true
                  }
                  setCourseData({ ...courseData, ...updates })
                }}
              />
              <RowDivider />
            </>
          )}

          {/* SPOC-only toggles */}
          {courseData.course_type === "SPOC" && (
            <>
              <ToggleRow
                icon={<Shield className="w-4 h-4" />}
                label="Require Enrollment Approval"
                description="Students must be approved before they can join"
                checked={courseData.requires_approval || false}
                onCheckedChange={(checked) => setCourseData({ ...courseData, requires_approval: checked })}
              />
              <RowDivider />
              <ToggleRow
                icon={<Building className="w-4 h-4" />}
                label="Institution-wide Course"
                description="Available to all members of your institution automatically"
                checked={courseData.is_institution_wide || false}
                onCheckedChange={(checked) => setCourseData({ ...courseData, is_institution_wide: checked })}
              />
              {!courseData.is_institution_wide && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="max_enrollments" className={lbl}>Maximum Enrollments</Label>
                  <Input
                    id="max_enrollments"
                    type="number"
                    min="1"
                    placeholder="Leave blank for unlimited"
                    value={courseData.max_enrollments || ""}
                    onChange={(e) => setCourseData({ ...courseData, max_enrollments: Number.parseInt(e.target.value) || null })}
                    className={inp}
                  />
                </div>
              )}
              <RowDivider />
            </>
          )}

          {/* Certificate */}
          <ToggleRow
            icon={<Award className="w-4 h-4" />}
            label="Certificate on Completion"
            description="Students receive a certificate when they finish the course"
            checked={courseData.is_certificate_available !== false}
            onCheckedChange={(checked) => setCourseData({ ...courseData, is_certificate_available: checked })}
          />
        </Section>

      </div>
      {/* ── END outer container ─────────────────────────── */}

      {/* ── Navigation ─────────────────────────────────── */}
      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-gray-400">Step 1 of 3 · Course Details</p>
        <Button
          type="submit"
          disabled={!isFormValid()}
          size="lg"
          className="px-8 bg-[#0158B7] hover:bg-[#014A9C] text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Course Structure
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

    </form>
  )
}