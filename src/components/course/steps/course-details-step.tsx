// @ts-nocheck
"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Plus, X, ImageIcon, Clock, DollarSign, Tag, Award,
  BookOpen, Loader2, Building, Users, Globe, Lock,
  Shield, Settings, ChevronRight
} from "lucide-react"
import { ThumbnailUpload } from "../thumbnail-upload"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { Course, User, CourseCategory, Institution } from "@/types"

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

// ── Reusable layout components ────────────────────────────────────────────────
// (identical in shape to course-details-step-institution so both feel consistent)

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
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/50/60">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0158B7]/10 flex items-center justify-center text-[#0158B7]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

function RowDivider() {
  return <div className="border-t border-border -mx-5 my-1" />
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ReactNode
  label: React.ReactNode
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="flex-shrink-0 mt-0.5 text-[#0158B7]">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="flex-shrink-0 data-[state=checked]:bg-[#0158B7]"
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

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

  // ── Role flags (System Admin unique) ─────────────────────────
  const userRole = user?.bwenge_role
  const isSystemAdmin = userRole === "SYSTEM_ADMIN"
  const isInstitutionAdmin = userRole === "INSTITUTION_ADMIN"

  const userInstitution = user?.institution
  const userInstitutionId = user?.primary_institution_id

  const getAvailableInstructors = () => {
    if (isSystemAdmin) return instructors
    if (isInstitutionAdmin && userInstitutionId) {
      return instructors.filter((i) =>
        i.institution_ids?.includes(userInstitutionId)
      )
    }
    return []
  }

  // ── Tag helpers ───────────────────────────────────────────────
  const addTag = () => {
    if (currentTag.trim() && !courseData.tags?.includes(currentTag.trim())) {
      setCourseData({ ...courseData, tags: [...(courseData.tags || []), currentTag.trim()] })
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCourseData({
      ...courseData,
      tags: courseData.tags?.filter((t) => t !== tagToRemove) || [],
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const isFormValid = () =>
    courseData.title?.trim() &&
    courseData.description?.trim() &&
    courseData.level &&
    courseData.language?.trim()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#0158B7]" />
      </div>
    )
  }

  // Shared style tokens — identical to institution step for visual consistency
  const sel =
    "w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0158B7]/30 focus:border-[#0158B7] disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
  const inp =
    "border-border focus:border-[#0158B7] focus:ring-[#0158B7]/30 text-foreground placeholder:text-muted-foreground text-sm transition-colors"
  const lbl = "text-sm font-medium text-muted-foreground"
  const hint = "text-xs text-muted-foreground mt-0.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ═══════════════════════════════════════════════════════════
          OUTER CONTAINER — same slate-50 tinted background as institution step
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-muted/50 border border-border rounded-2xl p-5 space-y-5">

        {/* Page heading */}
        <div className="text-center pb-1">
          <h2 className="text-xl font-bold text-foreground">Course Details</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set up the foundation of your course</p>
        </div>

        {/* ── CARD 1: Basic Information ─────────────────────────── */}
        <Section
          icon={<BookOpen className="w-4 h-4" />}
          title="Basic Information"
          subtitle="Essential course details"
        >
          {/* Course Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className={lbl}>
              Course Title <span className="text-destructive">*</span>
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className={lbl}>
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Brief overview of your course (2-3 sentences)"
              value={courseData.description || ""}
              onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
              rows={3}
              className={inp}
              required
            />
          </div>

          {/* Short Description */}
          <div className="space-y-1.5">
            <Label htmlFor="short_description" className={lbl}>
              Short Description
            </Label>
            <Textarea
              id="short_description"
              placeholder="Brief summary for course listings (max 150 characters)"
              value={courseData.short_description || ""}
              onChange={(e) =>
                setCourseData({ ...courseData, short_description: e.target.value })
              }
              rows={2}
              className={inp}
            />
          </div>
        </Section>

        {/* ── CARD 2: Course Setup ──────────────────────────────── */}
        <Section
          icon={<Settings className="w-4 h-4" />}
          title="Course Setup"
          subtitle="Type, institution, and audience"
        >
          {/* Institution — System Admin: always selectable */}
          {isSystemAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="institution_id" className={lbl}>
                Institution
              </Label>
              <select
                id="institution_id"
                value={courseData.institution_id || ""}
                onChange={(e) =>
                  setCourseData({ ...courseData, institution_id: e.target.value || null })
                }
                disabled={inLoading}
                className={sel}
              >
                <option value="">General Course (No Institution)</option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
              <p className={hint}>
                Leave blank for a platform-wide MOOC not tied to any institution.
              </p>
            </div>
          )}

          {/* Institution — Institution Admin: read-only */}
          {isInstitutionAdmin && userInstitution && (
            <div className="space-y-1.5">
              <Label className={lbl}>Institution</Label>
              <Input
                value={userInstitution.name}
                disabled
                className="bg-muted/50 border-border text-muted-foreground text-sm"
              />
              <p className={hint}>You can only create courses for your institution</p>
              <input
                type="hidden"
                value={userInstitutionId}
                onChange={() =>
                  setCourseData({ ...courseData, institution_id: userInstitutionId })
                }
              />
            </div>
          )}

          {/* Course Type — System Admin: full select */}
          {isSystemAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="course_type" className={lbl}>
                Course Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="course_type"
                value={courseData.course_type || "MOOC"}
                onChange={(e) => {
                  const value = e.target.value
                  const updates: any = { course_type: value }
                  if (value === "MOOC") {
                    updates.is_public = true
                    updates.requires_approval = false
                    updates.is_institution_wide = false
                    if (!courseData.institution_id) updates.institution_id = null
                  } else if (value === "SPOC") {
                    updates.is_public = false
                    updates.requires_approval = true
                    if (isInstitutionAdmin && userInstitutionId)
                      updates.institution_id = userInstitutionId
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

          {/* Course Type — Institution Admin: read-only (SPOC) */}
          {isInstitutionAdmin && (
            <div className="space-y-1.5">
              <Label className={lbl}>Course Type</Label>
              <Input
                value="SPOC — Small Private Online Course"
                disabled
                className="bg-muted/50 border-border text-muted-foreground text-sm"
              />
              <p className={hint}>
                Institution admins can create both SPOC and MOOC courses for their institution
              </p>
              <input
                type="hidden"
                value="SPOC"
                onChange={() => setCourseData({ ...courseData, course_type: "SPOC" })}
              />
            </div>
          )}

          {(courseData.course_type === "SPOC" || isInstitutionAdmin) && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-primary leading-snug space-y-0.5">
                <p className="font-semibold">SPOC — Private access only</p>
                <p>Requires access codes or institution membership to enroll.</p>
                {isInstitutionAdmin && (
                  <p className="text-primary">
                    Institution Admin: Can create SPOC and MOOC courses for your institution.
                  </p>
                )}
                {isSystemAdmin && (
                  <p className="text-primary">
                    System Admin: Can create SPOC courses for any institution.
                  </p>
                )}
              </div>
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
              onChange={(e) =>
                setCourseData({ ...courseData, instructor_id: e.target.value })
              }
              disabled={inLoading}
              className={sel}
            >
              <option value="">
                {isInstitutionAdmin
                  ? "Select instructor from your institution"
                  : "Select instructor"}
              </option>
              {getAvailableInstructors().map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.first_name} {instructor.last_name}
                  {isInstitutionAdmin && ` (${instructor.email})`}
                </option>
              ))}
              {isInstitutionAdmin && (
                <option value={user?.id}>
                  {user?.first_name} {user?.last_name} (Myself)
                </option>
              )}
            </select>
            {isInstitutionAdmin && (
              <p className={hint}>
                You can assign yourself or choose from your institution's instructors
              </p>
            )}
          </div>

          {/* Level & Language */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="level" className={lbl}>
                Difficulty Level <span className="text-destructive">*</span>
              </Label>
              <select
                id="level"
                value={courseData.level || ""}
                onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
                className={sel}
                required
              >
                <option value="">Select level</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language" className={lbl}>
                Language <span className="text-destructive">*</span>
              </Label>
              <select
                id="language"
                value={courseData.language || ""}
                onChange={(e) =>
                  setCourseData({ ...courseData, language: e.target.value })
                }
                className={sel}
                required
              >
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

          {/* Price & Duration — SA unique: has price field */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price" className={lbl}>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  Price (USD)
                </span>
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={courseData.price || ""}
                onChange={(e) =>
                  setCourseData({
                    ...courseData,
                    price: Number.parseFloat(e.target.value) || 0,
                  })
                }
                className={inp}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration_minutes" className={lbl}>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Duration (min)
                </span>
              </Label>
              <Input
                id="duration_minutes"
                type="number"
                min="1"
                placeholder="e.g. 1200"
                value={courseData.duration_minutes || ""}
                onChange={(e) =>
                  setCourseData({
                    ...courseData,
                    duration_minutes: Number.parseInt(e.target.value) || 0,
                  })
                }
                className={inp}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category_id" className={lbl}>Category</Label>
            <div className="relative">
              <select
                id="category_id"
                value={courseData.category_id || ""}
                onChange={(e) =>
                  setCourseData({ ...courseData, category_id: e.target.value })
                }
                disabled={inLoading}
                className={sel}
              >
                <option value="">Select category</option>
                {inLoading ? (
                  <option value="" disabled>Loading categories...</option>
                ) : Array.isArray(categories) && categories.length > 0 ? (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No categories available</option>
                )}
              </select>
              {inLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {/* SA unique: create new category inline */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground flex-shrink-0">Or create new:</span>
              <Input
                placeholder="New category name"
                value={courseData.category_name || ""}
                onChange={(e) =>
                  setCourseData({ ...courseData, category_name: e.target.value })
                }
                className="h-8 text-xs border-border focus:border-[#0158B7] focus:ring-[#0158B7]/30 text-foreground"
              />
            </div>
          </div>
        </Section>

        {/* ── CARD 3: Course Content ────────────────────────────── */}
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
              onChange={(value) =>
                setCourseData({ ...courseData, what_you_will_learn: value })
              }
              className="min-h-[140px] border border-border rounded-lg overflow-hidden text-sm"
            />
          </div>

          <RowDivider />

          {/* Requirements */}
          <div className="space-y-1.5">
            <Label className={lbl}>Requirements</Label>
            <p className={hint}>Prerequisites students should have before starting this course.</p>
            <RichTextEditor
              value={courseData.requirements || ""}
              onChange={(value) =>
                setCourseData({ ...courseData, requirements: value })
              }
              className="min-h-[110px] border border-border rounded-lg overflow-hidden text-sm"
            />
          </div>
        </Section>

        {/* ── CARD 4: Media & Tags ─────────────────────────────── */}
        <Section
          icon={<ImageIcon className="w-4 h-4" />}
          title="Media & Tags"
          subtitle="Course thumbnail and discovery tags"
        >
          {/* Thumbnail — before tags as per pattern */}
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
                placeholder="Add a tag..."
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
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
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── CARD 5: Access & Settings ─────────────────────────── */}
        <Section
          icon={<Shield className="w-4 h-4" />}
          title="Access & Settings"
          subtitle="Visibility, enrollment rules, and certificate"
        >
          {/* Public Course — System Admin only */}
          {isSystemAdmin && (
            <>
              <ToggleRow
                icon={<Globe className="w-4 h-4" />}
                label="Public Course"
                description="Course is visible to all users on the platform"
                checked={courseData.is_public !== false}
                onCheckedChange={(checked) =>
                  setCourseData({ ...courseData, is_public: checked })
                }
              />
              <RowDivider />
            </>
          )}

          {/* Private Institution Course — Institution Admin read-only */}
          {isInstitutionAdmin && (
            <>
              <ToggleRow
                icon={<Lock className="w-4 h-4" />}
                label="Private Institution Course"
                description="Course is for institution members only"
                checked={courseData.is_public === false}
                onCheckedChange={() => {}}
                disabled
              />
              <RowDivider />
            </>
          )}

          {/* SPOC-only toggles */}
          {(courseData.course_type === "SPOC" || isInstitutionAdmin) && (
            <>
              <ToggleRow
                icon={<Shield className="w-4 h-4" />}
                label="Require Enrollment Approval"
                description="Students need approval before they can join"
                checked={courseData.requires_approval || false}
                onCheckedChange={(checked) =>
                  setCourseData({ ...courseData, requires_approval: checked })
                }
              />
              <RowDivider />
              <ToggleRow
                icon={<Building className="w-4 h-4" />}
                label="Institution-wide Course"
                description="Available to all members of the institution automatically"
                checked={courseData.is_institution_wide || false}
                onCheckedChange={(checked) =>
                  setCourseData({ ...courseData, is_institution_wide: checked })
                }
              />
              {!courseData.is_institution_wide && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="max_enrollments" className={lbl}>
                    Maximum Enrollments
                  </Label>
                  <Input
                    id="max_enrollments"
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={courseData.max_enrollments || ""}
                    onChange={(e) =>
                      setCourseData({
                        ...courseData,
                        max_enrollments: Number.parseInt(e.target.value) || null,
                      })
                    }
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
            onCheckedChange={(checked) =>
              setCourseData({ ...courseData, is_certificate_available: checked })
            }
          />
        </Section>

      </div>
      {/* ── END outer container ──────────────────────────────── */}

      {/* ── Navigation ──────────────────────────────────────── */}
      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-muted-foreground">Step 1 of 3 · Course Details</p>
        <Button
          type="submit"
          disabled={!isFormValid()}
          size="lg"
          className="px-8 bg-[#0158B7] hover:bg-[#014A9C] text-white disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
        >
          Continue to Course Structure
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

    </form>
  )
}