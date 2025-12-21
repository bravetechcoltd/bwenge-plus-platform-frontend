// @ts-nocheck
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Plus, X, ImageIcon, Clock, DollarSign, Tag, Award,
  BookOpen, Target, CheckSquare, Loader2, Building,
  Users, Globe, Lock, Shield
} from 'lucide-react'
import { ThumbnailUpload } from "../thumbnail-upload"
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
  const [currentLearningObjective, setCurrentLearningObjective] = useState("")
  const [currentRequirement, setCurrentRequirement] = useState("")
  const [institutionCategories, setInstitutionCategories] = useState<CourseCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const { token, updateUser } = useAuth()

  const userRole = user?.bwenge_role
  const isSystemAdmin = userRole === "SYSTEM_ADMIN"
  const isInstitutionAdmin = userRole === "INSTITUTION_ADMIN"

  // Get user's institution
  const userInstitution = user?.institution
  const userInstitutionId = user?.primary_institution_id

  // Filter instructors based on user role
  const getAvailableInstructors = () => {
    if (isSystemAdmin) {
      return instructors
    }

    if (isInstitutionAdmin && userInstitutionId) {
      return instructors.filter(instructor =>
        instructor.institution_ids?.includes(userInstitutionId)
      )
    }

    return []
  }






  // Determine which institution to use for fetching categories
  const getInstitutionIdForCategories = () => {
    if (isInstitutionAdmin) {
      return userInstitutionId
    }
    if (isSystemAdmin && courseData.course_type === "SPOC") {
      return courseData.institution_id
    }
    return null
  }

  // Fetch institution categories
  useEffect(() => {
    const fetchInstitutionCategories = async () => {
      const institutionId = getInstitutionIdForCategories()

      if (!institutionId) {
        setInstitutionCategories([])
        return
      }

      setLoadingCategories(true)
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/categories/institution/${institutionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`, // You need to get token from your auth context
            },
          }
        )

        const data = await response.json()
        if (data.success) {
          // Flatten hierarchical categories for dropdown
          const flattenCategories = (cats: any[]): any[] => {
            let result: any[] = []
            cats.forEach(cat => {
              result.push(cat)
              if (cat.subcategories && cat.subcategories.length > 0) {
                result = [...result, ...flattenCategories(cat.subcategories)]
              }
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
  }, [user?.id, courseData.institution_id, courseData.course_type])


  const addTag = () => {
    if (currentTag.trim() && !courseData.tags?.includes(currentTag.trim())) {
      setCourseData({
        ...courseData,
        tags: [...(courseData.tags || []), currentTag.trim()],
      })
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCourseData({
      ...courseData,
      tags: courseData.tags?.filter((tag) => tag !== tagToRemove) || [],
    })
  }

  const addLearningObjective = () => {
    if (currentLearningObjective.trim()) {
      const currentObjectives = courseData.what_you_will_learn || ""
      const newObjectives = currentObjectives
        ? `${currentObjectives}\n• ${currentLearningObjective.trim()}`
        : `• ${currentLearningObjective.trim()}`

      setCourseData({
        ...courseData,
        what_you_will_learn: newObjectives,
      })
      setCurrentLearningObjective("")
    }
  }

  const addRequirement = () => {
    if (currentRequirement.trim()) {
      const currentRequirements = courseData.requirements || ""
      const newRequirements = currentRequirements
        ? `${currentRequirements}\n• ${currentRequirement.trim()}`
        : `• ${currentRequirement.trim()}`

      setCourseData({
        ...courseData,
        requirements: newRequirements,
      })
      setCurrentRequirement("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const isFormValid = () => {
    return (
      courseData.title?.trim() &&
      courseData.description?.trim() &&
      courseData.level &&
      courseData.language?.trim()
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course Details</h2>
        <p className="text-gray-600 dark:text-gray-300">Set up the foundation of your course</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Basic Details */}
        <div className="space-y-6">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <BookOpen className="w-5 h-5 text-[#0158B7]" />
                Basic Information
              </CardTitle>
              <CardDescription className="text-gray-600">Essential course details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-900 font-medium">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Complete React Development Course"
                  value={courseData.title || ""}
                  onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-900 font-medium">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Brief overview of your course (2-3 sentences)"
                  value={courseData.description || ""}
                  onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                  rows={3}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                  required
                />
              </div>

              {isSystemAdmin && courseData.course_type === "SPOC" && (
                <div className="space-y-2">
                  <Label htmlFor="institution_id" className="text-gray-900 font-medium flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-600" />
                    Institution (Required for SPOC)
                  </Label>
                  <select
                    id="institution_id"
                    value={courseData.institution_id || ""}
                    onChange={(e) => setCourseData({ ...courseData, institution_id: e.target.value || null })}
                    disabled={inLoading}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required={courseData.course_type === "SPOC"}
                  >
                    <option value="">Select institution</option>
                    {institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isInstitutionAdmin && userInstitution && (
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-600" />
                    Institution
                  </Label>
                  <Input
                    value={userInstitution.name}
                    disabled
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                  <p className="text-xs text-gray-500">
                    You can only create courses for your institution
                  </p>
                  <input
                    type="hidden"
                    value={userInstitutionId}
                    onChange={(e) => setCourseData({ ...courseData, institution_id: userInstitutionId })}
                  />
                </div>
              )}

              {/* Course Type Selection - Conditionally Rendered */}
              {isSystemAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="course_type" className="text-gray-900 font-medium">Course Type *</Label>
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
                        // Clear institution_id for MOOC
                        if (!courseData.institution_id) {
                          updates.institution_id = null
                        }
                      } else if (value === "SPOC") {
                        updates.is_public = false
                        updates.requires_approval = true
                        // For institution admin, auto-set their institution
                        if (isInstitutionAdmin && userInstitutionId) {
                          updates.institution_id = userInstitutionId
                        }
                      }
                      setCourseData({ ...courseData, ...updates })
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white text-gray-900"
                  >
                    <option value="MOOC">MOOC (Massive Open Online Course)</option>
                    <option value="SPOC">SPOC (Small Private Online Course)</option>
                  </select>
                </div>
              )}

              {isInstitutionAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="course_type" className="text-gray-900 font-medium">Course Type *</Label>
                  <select
                    id="course_type"
                    value={courseData.course_type || "SPOC"}
                    onChange={(e) => {
                      const value = e.target.value
                      const updates: any = { course_type: value }
                      if (value === "MOOC") {
                        updates.is_public = true
                        updates.requires_approval = false
                        updates.is_institution_wide = false
                        // For Institution Admin, institution_id is always set
                        updates.institution_id = userInstitutionId
                      } else if (value === "SPOC") {
                        updates.is_public = false
                        updates.requires_approval = true
                        updates.institution_id = userInstitutionId
                      }
                      setCourseData({ ...courseData, ...updates })
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white text-gray-900"
                  >
                    <option value="SPOC">SPOC (Small Private Online Course)</option>
                    <option value="MOOC">MOOC (Massive Open Online Course)</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Institution admins can create both SPOC and MOOC courses for their institution
                  </p>
                </div>
              )}

              {/* Instructor Selection */}
              <div className="space-y-2">
                <Label htmlFor="instructor_id" className="text-gray-900 font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  Primary Instructor
                </Label>
                <select
                  id="instructor_id"
                  value={courseData.instructor_id || ""}
                  onChange={(e) => setCourseData({ ...courseData, instructor_id: e.target.value })}
                  disabled={inLoading}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {isInstitutionAdmin ? "Select instructor from your institution" : "Select instructor"}
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
                  <p className="text-xs text-gray-500">
                    You can assign yourself as instructor or choose from your institution's instructors
                  </p>
                )}
              </div>

              {/* Rest of the form fields remain the same */}
              <div className="space-y-2">
                <Label htmlFor="short_description" className="text-gray-900 font-medium">Short Description</Label>
                <Textarea
                  id="short_description"
                  placeholder="Brief summary for course listings (max 150 characters)"
                  value={courseData.short_description || ""}
                  onChange={(e) => setCourseData({ ...courseData, short_description: e.target.value })}
                  rows={2}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="what_you_will_learn" className="text-gray-900 font-medium">What You Will Learn</Label>
                <Textarea
                  id="what_you_will_learn"
                  placeholder="Key learning outcomes for students (one per line)"
                  value={courseData.what_you_will_learn || ""}
                  onChange={(e) => setCourseData({ ...courseData, what_you_will_learn: e.target.value })}
                  rows={4}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-gray-900 font-medium">Requirements</Label>
                <Textarea
                  id="requirements"
                  placeholder="Prerequisites for taking this course (one per line)"
                  value={courseData.requirements || ""}
                  onChange={(e) => setCourseData({ ...courseData, requirements: e.target.value })}
                  rows={3}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level" className="text-gray-900 font-medium">Difficulty Level *</Label>
                  <select
                    id="level"
                    value={courseData.level || ""}
                    onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white text-gray-900"
                    required
                  >
                    <option value="">Select level</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language" className="text-gray-900 font-medium">Language *</Label>
                  <select
                    id="language"
                    value={courseData.language || ""}
                    onChange={(e) => setCourseData({ ...courseData, language: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white text-gray-900"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-gray-900 font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    Price (USD)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={courseData.price || ""}
                    onChange={(e) => setCourseData({ ...courseData, price: Number.parseFloat(e.target.value) || 0 })}
                    className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes" className="text-gray-900 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    Duration (minutes)
                  </Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="1"
                    placeholder="e.g., 1200"
                    value={courseData.duration_minutes || ""}
                    onChange={(e) => setCourseData({ ...courseData, duration_minutes: Number.parseInt(e.target.value) || 0 })}
                    className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-gray-900 font-medium">Category</Label>
                <div className="relative">
                  <select
                    id="category_id"
                    value={courseData.category_id || ""}
                    onChange={(e) => setCourseData({ ...courseData, category_id: e.target.value })}
                    disabled={loadingCategories}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0158B7] bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select category</option>
                    {loadingCategories ? (
                      <option value="" disabled>Loading institution categories...</option>
                    ) : institutionCategories.length > 0 ? (
                      institutionCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.parent_category_id ? `↳ ${category.name}` : category.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {getInstitutionIdForCategories()
                          ? "No categories found for this institution"
                          : "Select an institution first"}
                      </option>
                    )}
                  </select>
                  {loadingCategories && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>

              </div>

              {/* SPOC Specific Settings - Only show if SPOC */}
              {(courseData.course_type === "SPOC") && (
                <>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-gray-900 font-medium">
                        <Shield className="w-4 h-4 text-[#0158B7]" />
                        Require Enrollment Approval
                      </Label>
                      <p className="text-sm text-gray-600">Students need approval to join</p>
                    </div>
                    <Switch
                      checked={courseData.requires_approval || false}
                      onCheckedChange={(checked) => setCourseData({ ...courseData, requires_approval: checked })}
                      className="data-[state=checked]:bg-[#0158B7]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-gray-900 font-medium">
                        <Building className="w-4 h-4 text-[#0158B7]" />
                        Institution-wide Course
                      </Label>
                      <p className="text-sm text-gray-600">Available to all institution members</p>
                    </div>
                    <Switch
                      checked={courseData.is_institution_wide || false}
                      onCheckedChange={(checked) => setCourseData({ ...courseData, is_institution_wide: checked })}
                      className="data-[state=checked]:bg-[#0158B7]"
                    />
                  </div>

                  {!courseData.is_institution_wide && (
                    <div className="space-y-2">
                      <Label htmlFor="max_enrollments" className="text-gray-900 font-medium">Maximum Enrollments</Label>
                      <Input
                        id="max_enrollments"
                        type="number"
                        min="1"
                        placeholder="e.g., 100"
                        value={courseData.max_enrollments || ""}
                        onChange={(e) => setCourseData({ ...courseData, max_enrollments: Number.parseInt(e.target.value) || null })}
                        className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Certificate Option */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 text-gray-900 font-medium">
                    <Award className="w-4 h-4 text-[#0158B7]" />
                    Certificate Included
                  </Label>
                  <p className="text-sm text-gray-600">Students will receive a certificate upon completion</p>
                </div>
                <Switch
                  checked={courseData.is_certificate_available !== false}
                  onCheckedChange={(checked) => setCourseData({ ...courseData, is_certificate_available: checked })}
                  className="data-[state=checked]:bg-[#0158B7]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags Section */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Tag className="w-5 h-5 text-[#0158B7]" />
                Tags
              </CardTitle>
              <CardDescription className="text-gray-600">Help students find your course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  size="sm"
                  className="bg-[#0158B7] hover:bg-[#014A9C] text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {courseData.tags?.map((tag) => (
                  <Badge
                    key={tag}
                    className="flex items-center gap-1 rounded bg-[#0158B7] text-white px-3 py-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Additional Details */}
        <div className="space-y-6">
          {/* Thumbnail Upload */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <ImageIcon className="w-5 h-5 text-[#0158B7]" />
                Course Thumbnail
              </CardTitle>
              <CardDescription className="text-gray-600">Upload an eye-catching course image</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ThumbnailUpload
                onFileSelect={onThumbnailFileSelect}
                currentThumbnail={courseData.thumbnail_url}
                selectedFile={thumbnailFile}
              />
              {thumbnailFile && (
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {thumbnailFile.name} ({(thumbnailFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Course Settings */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Target className="w-5 h-5 text-[#0158B7]" />
                Course Settings
              </CardTitle>
              <CardDescription className="text-gray-600">Additional course configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Public/Private Toggle - Different for System vs Institution Admin */}
              {isSystemAdmin && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-gray-900 font-medium">
                      <Globe className="w-4 h-4 text-[#0158B7]" />
                      Public Course
                    </Label>
                    <p className="text-sm text-gray-600">Course is visible to all users</p>
                  </div>
                  <Switch
                    checked={courseData.is_public !== false}
                    onCheckedChange={(checked) => setCourseData({ ...courseData, is_public: checked })}
                    className="data-[state=checked]:bg-[#0158B7]"
                  />
                </div>
              )}
              {isInstitutionAdmin && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-gray-900 font-medium">
                      {courseData.course_type === "MOOC" ? (
                        <>
                          <Globe className="w-4 h-4 text-[#0158B7]" />
                          Public Institution Course
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-[#0158B7]" />
                          Private Institution Course
                        </>
                      )}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {courseData.course_type === "MOOC"
                        ? "Course is publicly available but associated with your institution"
                        : "Course is for institution members only"}
                    </p>
                  </div>
                  <Switch
                    checked={courseData.course_type === "MOOC" ? true : false}
                    onCheckedChange={(checked) => {
                      const newCourseType = checked ? "MOOC" : "SPOC"
                      const updates: any = { course_type: newCourseType }
                      if (newCourseType === "MOOC") {
                        updates.is_public = true
                        updates.requires_approval = false
                        updates.is_institution_wide = false
                      } else {
                        updates.is_public = false
                        updates.requires_approval = true
                      }
                      setCourseData({ ...courseData, ...updates })
                    }}
                    className="data-[state=checked]:bg-[#0158B7]"
                  />
                </div>
              )}

              {/* Course Type Info Box */}
              {courseData.course_type === "MOOC" && (
                <div className={`rounded-lg p-4 ${isInstitutionAdmin
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-blue-50 border border-blue-200"
                  }`}>
                  <div className="flex gap-3">
                    <Globe className="w-5 h-5 text-[#0158B7] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">MOOC Course Settings</p>
                      <p>This course will be publicly available to all learners on the platform.</p>
                      {isInstitutionAdmin && (
                        <p className="mt-1 text-xs">Institution Admin: This MOOC course will be associated with your institution</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {courseData.course_type === "SPOC" && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Lock className="w-5 h-5 text-[#0158B7] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">SPOC Course Settings</p>
                      <p>This course is private and requires access codes or institution membership.</p>
                      <p className="mt-1 text-xs">
                        {isInstitutionAdmin
                          ? "Institution Admin: SPOC course for your institution members"
                          : "System Admin: SPOC course for selected institution"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Objectives Helper */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Target className="w-5 h-5 text-[#0158B7]" />
                What You Will Learn
              </CardTitle>
              <CardDescription className="text-gray-600">Add learning objectives one by one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a learning objective..."
                  value={currentLearningObjective}
                  onChange={(e) => setCurrentLearningObjective(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLearningObjective())}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                />
                <Button
                  type="button"
                  onClick={addLearningObjective}
                  size="sm"
                  className="bg-[#0158B7] hover:bg-[#014A9C] text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {courseData.what_you_will_learn?.split('\n').filter(line => line.trim()).map((objective, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-900">{objective.replace('• ', '')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const objectives = courseData.what_you_will_learn?.split('\n').filter(line => line.trim() && !line.includes(objective.replace('• ', ''))).join('\n') || ''
                        setCourseData({ ...courseData, what_you_will_learn: objectives })
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Requirements Helper */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <CheckSquare className="w-5 h-5 text-[#0158B7]" />
                Requirements
              </CardTitle>
              <CardDescription className="text-gray-600">Add prerequisites for students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a requirement..."
                  value={currentRequirement}
                  onChange={(e) => setCurrentRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRequirement())}
                  className="border-gray-300 focus:border-[#0158B7] focus:ring-[#0158B7] text-gray-900"
                />
                <Button
                  type="button"
                  onClick={addRequirement}
                  size="sm"
                  className="bg-[#0158B7] hover:bg-[#014A9C] text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {courseData.requirements?.split('\n').filter(line => line.trim()).map((requirement, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-2 h-2 bg-[#0158B7] rounded-full flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-900">{requirement.replace('• ', '')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const requirements = courseData.requirements?.split('\n').filter(line => line.trim() && !line.includes(requirement.replace('• ', ''))).join('\n') || ''
                        setCourseData({ ...courseData, requirements: requirements })
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">Step 1 of 3 • Course Details</div>

        <Button
          type="submit"
          disabled={!isFormValid()}
          size="lg"
          className="px-8 bg-[#0158B7] hover:bg-[#014A9C] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue to Course Structure
        </Button>
      </div>
    </form>
  )
}