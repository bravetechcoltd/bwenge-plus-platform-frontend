// @ts-nocheck
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CoursePricingField } from "@/components/course/course-pricing-field"
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
import { useDuplicateTitleCheck } from "@/lib/courses/duplicate-check";
import { AddCategoryDialog } from "@/components/course/add-category-dialog";
import type { GlobalCategory } from "@/lib/categories/global-categories-api";
import {
  accessDefaultsForCourseType,
  fillAccessDefaults,
  toggleChecked,
} from "@/lib/course/access-defaults";

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

  /*
   * CAT-002. A category added from this form.
   *
   * Same behaviour as the institution step: held locally so the author can
   * select it at once, rather than waiting for a refetch that will not happen
   * until the page reloads.
   */
  const [addedCategories, setAddedCategories] = useState<CourseCategory[]>([])
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)

  /** The fetched categories plus anything added here, without duplicates. */
  const categoryOptions = [
    ...(Array.isArray(categories) ? categories : []),
    ...addedCategories.filter(
      (added) =>
        !(Array.isArray(categories) ? categories : []).some(
          (existing: any) => existing.id === added.id
        )
    ),
  ]

  // ── Role flags (System Admin unique) ─────────────────────────
  const userRole = user?.bwenge_role
  const isSystemAdmin = userRole === "SYSTEM_ADMIN"
  const isInstitutionAdmin = userRole === "INSTITUTION_ADMIN"
  // CT-001. Needed so an instructor reaching this wizard still gets a course
  // type field; without it the value stayed undefined all the way to submit.
  const isInstructor = userRole === "INSTRUCTOR"

  /*
   * SPOC-TOGGLE-001 — the switches reflect the type, and so does the payload.
   *
   * `accessDefaults` is what the Access & Settings switches should read when
   * the field has not been decided yet, and the effect below writes those
   * values into `courseData` so what is submitted matches what is shown.
   *
   * Both are needed. The type selectors already applied side effects, but they
   * are event handlers: an institution admin's type is SPOC from the start, so
   * nothing fired and the flags stayed undefined — displayed as off by
   * `|| false`, and submitted as off for the same reason.
   *
   * `fillAccessDefaults` returns the same object when there is nothing to
   * fill, so this cannot loop.
   */
  const accessDefaults = accessDefaultsForCourseType(courseData.course_type)

  useEffect(() => {
    const filled = fillAccessDefaults(courseData)
    if (filled !== courseData) setCourseData(filled)
  }, [courseData, setCourseData])

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

  /*
   * CI-001. Advisory only: it asks the server whether this title is already
   * taken in the scope the course would be created in, debounced so typing
   * does not fire a request per character. The authoritative refusal lives
   * in createCourse and in the unique index behind it.
   */
  const titleDuplicate = useDuplicateTitleCheck(courseData?.title, {
    courseType: courseData?.course_type ?? null,
    institutionId: courseData?.institution_id ?? null,
    excludeId: courseData?.id ?? null,
  });

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
              className={`${inp} ${titleDuplicate.isDuplicate ? "border-destructive focus-visible:ring-destructive" : ""}`}
              required
              aria-invalid={titleDuplicate.isDuplicate || undefined}
            />

            {/*
              CI-001. A title that already exists is refused on submit, by the
              server and by a unique index behind it. Saying so here means it is
              found while it can still be changed in one keystroke, rather than
              at the end of the wizard. The warning is advice and never blocks
              typing — the refusal that matters happens on save.
            */}
            {titleDuplicate.isChecking && (
              <p className="text-xs text-muted-foreground">Checking the title…</p>
            )}
            {titleDuplicate.isDuplicate && (
              <p className="text-xs text-destructive">{titleDuplicate.message}</p>
            )}
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

          {/*
            CT-001. One control, for everyone who may create a course.

            This was gated on isSystemAdmin, and the institution admin got a
            disabled box below it reading SPOC — directly above its own help
            text saying institution admins can create both SPOC and MOOC. The
            text was right and the control was wrong: /dashboard/
            institution-admin/courses/create uses this same step, so an
            institution admin could not create a MOOC at all. An instructor
            reaching this wizard got no course-type field whatsoever, which
            left course_type undefined on submit.

            The side effects below are unchanged, and the institution rules
            are unchanged with them: a SPOC still pins to the admin's own
            institution, and the server still decides what each role may
            actually do. This only stops the form from withholding a choice
            the rules already allow.
          */}
          {(isSystemAdmin || isInstitutionAdmin || isInstructor) && (
            <div className="space-y-1.5">
              <Label htmlFor="course_type" className={lbl}>
                Course Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="course_type"
                value={courseData.course_type || (isSystemAdmin ? "MOOC" : "SPOC")}
                onChange={(e) => {
                  const value = e.target.value
                  // One rule for the access flags, shared with the other
                  // selectors and the wizard's `?type=` arrival effect.
                  const updates: any = {
                    course_type: value,
                    ...accessDefaultsForCourseType(value),
                  }
                  if (value === "MOOC") {
                    if (!courseData.institution_id) updates.institution_id = null
                  } else if (value === "SPOC") {
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

          {/*
            The read-only duplicate of the field above used to sit here. Its
            hidden input carried an onChange that could never fire — hidden
            inputs do not change — so for an institution admin the only thing
            that ever set course_type was the default further up.
          */}

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
                  : "Select a public instructor"}
              </option>

              {/*
                PI-001. For a system admin these are the public instructors —
                active, and belonging to no institution — because a MOOC has no
                institution to draw one from. The server marks itself in the
                list with is_self, so the admin's own account is labelled as the
                fallback it is rather than offered as a peer of the others.

                The institution rules are untouched: an institution admin still
                sees only their own institution's instructors, filtered above.
              */}
              {getAvailableInstructors().map((instructor: any) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.is_self
                    ? `${instructor.first_name ?? ""} ${instructor.last_name ?? ""} (Myself — system admin)`.trim()
                    : `${instructor.first_name ?? ""} ${instructor.last_name ?? ""}`.trim() ||
                      instructor.email}
                  {!instructor.is_self && instructor.email ? ` (${instructor.email})` : null}
                </option>
              ))}

              {/* The institution admin's own fallback, as before. */}
              {isInstitutionAdmin && (
                <option value={user?.id}>
                  {user?.first_name} {user?.last_name} (Myself)
                </option>
              )}
            </select>
            {isInstitutionAdmin && (
              <p className={hint}>
                You can assign yourself or choose from your institution&apos;s instructors
              </p>
            )}
            {isSystemAdmin && (
              <p className={hint}>
                Public instructors belong to the platform rather than an institution.
                Manage them at Users &rarr; Public Instructors. If none exists yet, you can
                name yourself and reassign the course later.
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

          {/* Pricing — free or paid, with the currency the price is in (CP-001) */}
          <CoursePricingField
            courseData={courseData}
            setCourseData={setCourseData}
            labelClassName={lbl}
            inputClassName={inp}
          />

          {/* Duration */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="category_id" className={lbl}>Category</Label>
              {/*
                CAT-002. Adds to the platform category list, which is what
                /dashboard/instructor/categories shows, so the new category is
                visible there as well as here.
              */}
              <button
                type="button"
                onClick={() => setCategoryDialogOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                New category
              </button>
            </div>
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
                ) : categoryOptions.length > 0 ? (
                  categoryOptions.map((category: any) => (
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
                checked={toggleChecked(
                  courseData.requires_approval,
                  accessDefaults.requires_approval
                )}
                onCheckedChange={(checked) =>
                  setCourseData({ ...courseData, requires_approval: checked })
                }
              />
              <RowDivider />
              <ToggleRow
                icon={<Building className="w-4 h-4" />}
                label="Institution-wide Course"
                description="Available to all members of the institution automatically"
                checked={toggleChecked(
                  courseData.is_institution_wide,
                  accessDefaults.is_institution_wide
                )}
                onCheckedChange={(checked) =>
                  setCourseData({ ...courseData, is_institution_wide: checked })
                }
              />
              {!toggleChecked(
                courseData.is_institution_wide,
                accessDefaults.is_institution_wide
              ) && (
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

      <AddCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCreated={(created: GlobalCategory) => {
          setAddedCategories((previous) =>
            previous.some((c) => c.id === created.id)
              ? previous
              : [...previous, created as unknown as CourseCategory]
          )
          setCourseData({ ...courseData, category_id: created.id })
        }}
      />

    </form>
  )
}