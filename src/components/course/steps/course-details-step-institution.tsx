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
  Plus, X, ImageIcon, Clock, Tag, Award,
  BookOpen, Loader2, Building, Users, Globe,
  Lock, Shield, Settings, ChevronRight
} from "lucide-react"
import { ThumbnailUpload } from "../thumbnail-upload"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { Course, User, CourseCategory, Institution } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useDuplicateTitleCheck } from "@/lib/courses/duplicate-check";
import { CoInstructorsField } from "@/components/course/co-instructors-field";
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
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Section header — matches "Basic Information / Essential course details" style */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/50/60">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0158B7]/10 flex items-center justify-center text-[#0158B7]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
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
  return <div className="border-t border-border -mx-5 my-1" />
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
          <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
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

  /*
   * CAT-002. A category added from this form.
   *
   * Held locally and merged into the options below, so the author can select
   * it at once. The server already has it; this only avoids waiting for a
   * refetch that would not otherwise happen until the page reloads.
   */
  const [addedCategories, setAddedCategories] = useState<CourseCategory[]>([])
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const { token } = useAuth()

  // ── Role flags ──────────────────────────────────────────
  const userRole = user?.bwenge_role
  const isSystemAdmin = userRole === "SYSTEM_ADMIN"
  const isInstitutionAdmin = userRole === "INSTITUTION_ADMIN"
  const isInstitutionInstructor = userRole === "INSTRUCTOR" && user?.is_institution_member

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
  /*
   * PI-001. An instructor who belongs to no institution.
   *
   * Every gate in this step asked `isInstitutionInstructor`, so a global
   * instructor got no course-type field, was absent from their own instructor
   * list, and had no institution to fall back on. They create platform
   * courses — a MOOC, necessarily, since a SPOC needs an institution to be
   * private to.
   */
  const isPublicInstructor = userRole === "INSTRUCTOR" && !user?.is_institution_member

  useEffect(() => {
    if (isPublicInstructor && courseData.course_type !== "MOOC") {
      setCourseData({
        ...courseData,
        course_type: "MOOC",
        is_public: true,
        requires_approval: false,
        is_institution_wide: false,
        institution_id: null,
      })
    }
  }, [isPublicInstructor, courseData.course_type])

  const userInstitution = user?.institution
  const userInstitutionId = user?.primary_institution_id

  /**
   * Everyone who may be set as the primary instructor.
   *
   * Two things were wrong. The filter matched on `institution_ids`, a
   * denormalised column that is not populated for every member, so real
   * instructors of the institution were dropped from a list that had been
   * fetched for that institution in the first place — the server already
   * answered the question the filter was re-asking, and answered it from the
   * membership table.
   *
   * And the caller is always in it. An institution administrator creating a
   * course may well be teaching it, and an instructor creating their own
   * course certainly is; they were offered as a hard-coded option appended
   * after the list, which put them there twice once the list arrived and gave
   * two options the same value.
   */
  const getAvailableInstructors = (): User[] => {
    const fromInstitution = isSystemAdmin
      ? instructors
      : // Already scoped by the request that fetched them.
        instructors

    const seen = new Set(fromInstitution.map(i => i.id))
    const withMe =
      user &&
      !seen.has(user.id) &&
      (isInstitutionAdmin || isInstitutionInstructor || isPublicInstructor)
        ? [...fromInstitution, user as unknown as User]
        : fromInstitution

    // Alphabetical, so a list of twenty is something a person can scan.
    return [...withMe].sort((a, b) =>
      `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim().localeCompare(
        `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim()
      )
    )
  }

  const getInstitutionIdForCategories = () => {
    if (isInstitutionAdmin || isInstitutionInstructor) return userInstitutionId
    if (isSystemAdmin && courseData.course_type === "SPOC") return courseData.institution_id
    return null
  }

  /*
   * CAT-001. Which categories this course can be filed under.
   *
   * The select read `institutionCategories` and nothing else, so a course with
   * no institution had no categories at all — the dropdown said "Select an
   * institution first" to a global instructor who will never have one, and to
   * a system admin creating a MOOC, which by definition has none.
   *
   * The global list was already being fetched by the wizard and handed to this
   * step as `categories`; it was simply never read. An institution course uses
   * that institution's categories, and a platform course uses the platform's.
   */
  const usesInstitutionCategories = !!getInstitutionIdForCategories()
  const baseCategoryOptions = usesInstitutionCategories
    ? institutionCategories
    : categories

  /*
   * Anything added from this form is offered too, and only once: a refetch
   * elsewhere may already have picked it up.
   */
  const categoryOptions = [
    ...baseCategoryOptions,
    ...addedCategories.filter(
      (added) => !baseCategoryOptions.some((existing: any) => existing.id === added.id)
    ),
  ]

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

  // Shared style tokens
  const sel = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#0158B7]/30 focus:border-[#0158B7] disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
  const inp = "border-border focus:border-[#0158B7] focus:ring-[#0158B7]/30 text-foreground placeholder:text-muted-foreground text-sm transition-colors"
  const lbl = "text-sm font-medium text-muted-foreground"
  const hint = "text-xs text-muted-foreground mt-0.5"

  // ── Render ──────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ═══════════════════════════════════════════════════
          OUTER CONTAINER — light blue-gray tinted background
          matches the image's "main container" feel
      ══════════════════════════════════════════════════════ */}
      <div className="bg-muted/50 border border-border rounded-2xl p-5 space-y-5">

        {/* Page heading inside outer container */}
        <div className="text-center pb-1">
          <h2 className="text-xl font-bold text-foreground">Course Details</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set up the foundation of your course</p>
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

          {/* Description — RichTextEditor matching the image */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className={lbl}>
              Description <span className="text-destructive">*</span>
            </Label>
            <RichTextEditor
              value={courseData.description || ""}
              onChange={(value) => setCourseData({ ...courseData, description: value })}
              className="min-h-[160px] border border-border rounded-lg overflow-hidden text-sm"
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
              className="min-h-[120px] border border-border rounded-lg overflow-hidden text-sm"
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
                Institution <span className="text-destructive">*</span>
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
              <Input value={userInstitution.name} disabled className="bg-muted/50 border-border text-muted-foreground text-sm" />
              <p className={hint}>Courses are created under your institution</p>
              <input type="hidden" value={userInstitutionId}
                onChange={() => setCourseData({ ...courseData, institution_id: userInstitutionId })} />
            </div>
          )}

          {/* Course Type — System Admin */}
          {isSystemAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="course_type_sa" className={lbl}>
                Course Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="course_type_sa"
                value={courseData.course_type || "MOOC"}
                onChange={(e) => {
                  const value = e.target.value
                  const updates: any = {
                    course_type: value,
                    ...accessDefaultsForCourseType(value),
                  }
                  if (value === "MOOC") {
                    if (!courseData.institution_id) updates.institution_id = null
                  } else {
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

          {/*
            PI-001. A global instructor has no institution, so a SPOC — a course
            private to one — is not a thing they can make. They are shown what
            they are creating rather than a choice with one real option.
          */}
          {isPublicInstructor && (
            <div className="space-y-1.5">
              <Label className={lbl}>Course Type</Label>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground">
                MOOC — Massive Open Online Course
              </div>
              <p className={hint}>
                You teach on the platform rather than for an institution, so your courses are
                public.
              </p>
            </div>
          )}

          {/* Course Type — Institution Admin / Instructor */}
          {(isInstitutionAdmin || isInstitutionInstructor) && (
            <div className="space-y-1.5">
              <Label htmlFor="course_type_ia" className={lbl}>
                Course Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="course_type_ia"
                value={courseData.course_type || "SPOC"}
                onChange={(e) => {
                  const value = e.target.value
                  const updates: any = {
                    course_type: value,
                    institution_id: userInstitutionId,
                    ...accessDefaultsForCourseType(value),
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
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
              <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-snug">
                <span className="font-semibold">MOOC</span> — Publicly visible on the platform, open to all learners.
              </p>
            </div>
          )}
          {courseData.course_type === "SPOC" && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-snug">
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
              <option value="">
                {inLoading ? "Loading instructors…" : "Select instructor"}
              </option>
              {getAvailableInstructors().map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.first_name} {instructor.last_name}
                  {instructor.id === user?.id ? " (me)" : ""}
                  {(isInstitutionAdmin || isInstitutionInstructor) && instructor.email
                    ? ` — ${instructor.email}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {/*
            CI-001. A course can be taught by more than one person.

            The course row holds a single `instructor_id` — the owner — and
            `course_instructors` holds the rest with their own permissions.
            These are assigned after the course exists, because the bulk
            endpoint is keyed by course id.

            Only for institution courses: the server validates each additional
            instructor against the course's institution membership, so a MOOC
            with no institution has nobody it can accept. Saying that here is
            better than letting the author pick people and watching the
            assignment fail after the course is created.
          */}
          <CoInstructorsField
            instructors={getAvailableInstructors()}
            primaryInstructorId={courseData.instructor_id}
            selectedIds={courseData.co_instructor_ids || []}
            onChange={(ids) =>
              setCourseData({ ...courseData, co_instructor_ids: ids })
            }
            disabled={inLoading}
            labelClassName={lbl}
            unavailableReason={
              courseData.course_type === "MOOC"
                ? "A MOOC belongs to the platform rather than one institution, so additional instructors cannot be assigned here. Add them from the course once it exists."
                : null
            }
          />

          {/* Level & Language — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="level" className={lbl}>
                Level <span className="text-destructive">*</span>
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
                Language <span className="text-destructive">*</span>
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

          {/* Pricing — free or paid, with the currency the price is in (CP-001) */}
          <CoursePricingField
            courseData={courseData}
            setCourseData={setCourseData}
            labelClassName={lbl}
            inputClassName={inp}
          />

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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="category_id" className={lbl}>Category</Label>
              {/*
                CAT-002. The category the author needs may not exist yet.

                Writes to the platform category list, which is what
                /dashboard/instructor/categories shows, so a category added
                here appears there too. The endpoint is open to instructors.
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
                onChange={(e) => setCourseData({ ...courseData, category_id: e.target.value })}
                disabled={loadingCategories}
                className={sel}
              >
                <option value="">Select category</option>
                {loadingCategories ? (
                  <option disabled>Loading categories…</option>
                ) : categoryOptions.length > 0 ? (
                  categoryOptions.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parent_category_id ? `↳ ${cat.name}` : cat.name}
                    </option>
                  ))
                ) : (
                  <option disabled>
                    {/*
                      Three different situations, and they used to share one
                      sentence that was wrong for two of them. "Select an
                      institution first" is only true for a system admin
                      building a SPOC who has not named one yet.
                    */}
                    {usesInstitutionCategories
                      ? "No categories in this institution yet"
                      : isSystemAdmin && courseData.course_type === "SPOC"
                        ? "Select an institution first"
                        : "No platform categories exist yet"}
                  </option>
                )}
              </select>
              {loadingCategories && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/*
              CAT-001. A dead end otherwise.

              An empty dropdown told the reader there was nothing to pick and
              stopped there. If the platform has no categories yet, the fix is a
              page away and the person reading this is usually the one who can
              make it — an instructor may add one, and a system admin may do
              anything with the list.
            */}
            {!loadingCategories && categoryOptions.length === 0 && !usesInstitutionCategories && (
              <p className={hint}>
                No platform categories exist yet.{" "}
                <a
                  href={
                    isSystemAdmin
                      ? "/dashboard/system-admin/courses/categories"
                      : "/dashboard/instructor/categories"
                  }
                  className="font-medium text-primary hover:underline"
                >
                  Add one
                </a>
                , then come back — your course details are kept.
              </p>
            )}
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
              className="min-h-[140px] border border-border rounded-lg overflow-hidden text-sm"
            />
          </div>

          {/* Requirements */}
          <div className="space-y-1.5">
            <Label className={lbl}>Requirements</Label>
            <p className={hint}>Prerequisites students should have before starting this course.</p>
            <RichTextEditor
              value={courseData.requirements || ""}
              onChange={(value) => setCourseData({ ...courseData, requirements: value })}
              className="min-h-[110px] border border-border rounded-lg overflow-hidden text-sm"
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
                  setCourseData({
                    ...courseData,
                    course_type: newType,
                    ...accessDefaultsForCourseType(newType),
                  })
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
                checked={toggleChecked(
                  courseData.requires_approval,
                  accessDefaults.requires_approval
                )}
                onCheckedChange={(checked) => setCourseData({ ...courseData, requires_approval: checked })}
              />
              <RowDivider />
              <ToggleRow
                icon={<Building className="w-4 h-4" />}
                label="Institution-wide Course"
                description="Available to all members of your institution automatically"
                checked={toggleChecked(
                  courseData.is_institution_wide,
                  accessDefaults.is_institution_wide
                )}
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

      {/*
        CAT-002. The create-category dialog.

        Rendered once at the form root rather than inside the field, so
        opening it cannot be affected by the conditional branches around the
        category select. On success the new category is added to the options
        and selected, so the author carries straight on.
      */}
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