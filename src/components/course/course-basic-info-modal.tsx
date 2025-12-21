// @ts-nocheck

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { X, Plus, Save, BookOpen, Target, Globe, Lock, Users, DollarSign, Clock, Languages, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RichTextEditor } from "@/components/ui/rich-text-editor"

// Mock types for demo
const CourseType = {
  MOOC: "MOOC",
  SPOC: "SPOC"
}

const CourseLevel = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  EXPERT: "EXPERT"
}

interface CourseBasicInfoFormProps {
  course: any
  onSave: (updates: any) => Promise<void>
  onCancel: () => void
  isCreating?: boolean
}

export default function CourseBasicInfoForm({
  course,
  onSave,
  onCancel,
  isCreating = false,
}: CourseBasicInfoFormProps) {
  const [formData, setFormData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    short_description: course?.short_description || "",
    level: course?.level || CourseLevel.BEGINNER,
    price: course?.price || 0,
    duration_minutes: course?.duration_minutes || 0,
    language: course?.language || "English",
    tags: course?.tags || [],
    requirements: course?.requirements || "",
    what_you_will_learn: course?.what_you_will_learn || "",
    is_certificate_available: course?.is_certificate_available || false,
    course_type: course?.course_type || CourseType.MOOC,
    is_public: course?.is_public ?? true,
    requires_approval: course?.requires_approval || false,
    max_enrollments: course?.max_enrollments || null,
    is_institution_wide: course?.is_institution_wide || false,
  })
  const [newTag, setNewTag] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFormData({
      title: course?.title || "",
      description: course?.description || "",
      short_description: course?.short_description || "",
      level: course?.level || CourseLevel.BEGINNER,
      price: course?.price || 0,
      duration_minutes: course?.duration_minutes || 0,
      language: course?.language || "English",
      tags: course?.tags || [],
      requirements: course?.requirements || "",
      what_you_will_learn: course?.what_you_will_learn || "",
      is_certificate_available: course?.is_certificate_available || false,
      course_type: course?.course_type || CourseType.MOOC,
      is_public: course?.is_public ?? true,
      requires_approval: course?.requires_approval || false,
      max_enrollments: course?.max_enrollments || null,
      is_institution_wide: course?.is_institution_wide || false,
    })
  }, [course])

  const handleShortDescriptionChange = useCallback((value: string) => {
    setFormData((prev) => prev.short_description === value ? prev : { ...prev, short_description: value })
  }, [])

  const handleDescriptionChange = useCallback((value: string) => {
    setFormData((prev) => prev.description === value ? prev : { ...prev, description: value })
  }, [])

  const handleWhatYouWillLearnChange = useCallback((value: string) => {
    setFormData((prev) => prev.what_you_will_learn === value ? prev : { ...prev, what_you_will_learn: value })
  }, [])

  const handleRequirementsChange = useCallback((value: string) => {
    setFormData((prev) => prev.requirements === value ? prev : { ...prev, requirements: value })
  }, [])

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] })
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((tag) => tag !== tagToRemove) })
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave(formData)
    } catch (error) {
      console.error("Failed to save course:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-h-[95vh] overflow-y-auto">
      {/* Header */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              {isCreating ? "Create New Course" : "Edit Course Information"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Form */}
      <Card className="border-2">
        <CardContent className="p-6 space-y-6 pb-0">
{/* Course Type and Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 w-full">
              <Label htmlFor="course_type" className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Course Type
              </Label>
              <select
                id="course_type"
                value={formData.course_type}
                onChange={(e) => setFormData({ ...formData, course_type: e.target.value })}
                className="w-full h-11 px-3 py-2 border-2 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
              >
                <option value={CourseType.MOOC}>MOOC (Massive Open Online Course)</option>
                <option value={CourseType.SPOC}>SPOC (Small Private Online Course)</option>
              </select>
              <p className="text-xs text-muted-foreground italic">
                {formData.course_type === CourseType.MOOC
                  ? "Open to all students worldwide"
                  : "Restricted to specific institution or group"}
              </p>
            </div>

            <div className="space-y-2 w-full">
              <Label htmlFor="level" className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Course Level
              </Label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full h-11 px-3 py-2 border-2 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
              >
                <option value={CourseLevel.BEGINNER}>Beginner</option>
                <option value={CourseLevel.INTERMEDIATE}>Intermediate</option>
                <option value={CourseLevel.ADVANCED}>Advanced</option>
                <option value={CourseLevel.EXPERT}>Expert</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Course Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter an engaging course title"
              className="h-11 border-2"
              required
            />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label htmlFor="short_description" className="text-sm font-semibold">
              Short Description <span className="text-red-500">*</span>
            </Label>
            <div>
              <RichTextEditor
                value={formData.short_description}
                onChange={handleShortDescriptionChange}
                placeholder="Brief, compelling summary for course preview"
                className="border-2"
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground italic">Displayed in course cards and search results</p>
              <p className={`text-xs font-medium ${formData.short_description.replace(/<[^>]*>/g, '').length > 180 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {formData.short_description.replace(/<[^>]*>/g, '').length}/200
              </p>
            </div>
          </div>

          {/* Full Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Full Description <span className="text-red-500">*</span>
            </Label>
            <div>
              <RichTextEditor
                value={formData.description}
                onChange={handleDescriptionChange}
                placeholder="Provide comprehensive details about the course content, objectives, and benefits"
                className="border-2"
              />
            </div>
          </div>

          {/* Learning Outcomes and Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 p-4 border-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <Label htmlFor="what_you_will_learn" className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                What You Will Learn
              </Label>
              <div className="rounded-md overflow-hidden">
                <RichTextEditor
                  value={formData.what_you_will_learn}
                  onChange={handleWhatYouWillLearnChange}
                  placeholder="• Master key concepts&#10;• Apply practical skills&#10;• Build real projects"
                  className="border-2 bg-white dark:bg-gray-950"
                />
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Use bullet points or formatted lists for better organization</p>
            </div>

            <div className="space-y-2 p-4 border-2 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <Label htmlFor="requirements" className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                Prerequisites
              </Label>
              <div className="rounded-md overflow-hidden">
                <RichTextEditor
                  value={formData.requirements}
                  onChange={handleRequirementsChange}
                  placeholder="• Basic programming knowledge&#10;• Computer with internet&#10;• Willingness to learn"
                  className="border-2 bg-white dark:bg-gray-950"
                />
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Use bullet points or formatted lists for better organization</p>
            </div>
          </div>

          {/* Price, Duration, Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         

            <div className="space-y-2">
              <Label htmlFor="duration_minutes" className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Duration (minutes)
              </Label>
              <Input
                id="duration_minutes"
                type="number"
                min="0"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number.parseInt(e.target.value) || 0 })}
                placeholder="120"
                className="h-11 border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-semibold flex items-center gap-2">
                <Languages className="w-4 h-4 text-purple-600" />
                Language
              </Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                placeholder="English"
                className="h-11 border-2"
              />
            </div>
          </div>

          {/* SPOC-specific settings */}
          {formData.course_type === CourseType.SPOC && (
            <div className="space-y-4 p-5 border-2 rounded-lg bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30">
              <h3 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2 text-base">
                <Lock className="w-5 h-5" />
                SPOC Course Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 rounded-md bg-white/60 dark:bg-gray-900/60 border">
                  <Switch
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                    id="requires_approval"
                  />
                  <Label htmlFor="requires_approval" className="font-medium cursor-pointer">Requires Approval</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-md bg-white/60 dark:bg-gray-900/60 border">
                  <Switch
                    checked={formData.is_institution_wide}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_institution_wide: checked })}
                    id="is_institution_wide"
                  />
                  <Label htmlFor="is_institution_wide" className="font-medium cursor-pointer">Institution-wide Access</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_enrollments" className="text-sm font-semibold">Maximum Enrollments</Label>
                <Input
                  id="max_enrollments"
                  type="number"
                  min="0"
                  value={formData.max_enrollments || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_enrollments: e.target.value ? Number.parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Unlimited"
                  className="h-11 border-2"
                />
              </div>
            </div>
          )}

          {/* MOOC and Certificate Settings */}
          <div className="flex flex-col sm:flex-row gap-4">
            {formData.course_type === CourseType.MOOC && (
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 flex-1">
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  id="is_public"
                />
                <Label htmlFor="is_public" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Public Course (visible to all)
                </Label>
              </div>
            )}
            
            <div className="flex items-center space-x-3 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 flex-1">
              <Switch
                checked={formData.is_certificate_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_certificate_available: checked })}
                id="is_certificate_available"
              />
              <Label htmlFor="is_certificate_available" className="flex items-center gap-2 font-medium cursor-pointer">
                <BookOpen className="w-5 h-5 text-green-600" />
                Certificate Available
              </Label>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3 p-5 border-2 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <Label className="text-sm font-semibold">Course Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="e.g., programming, business, design"
                className="h-11 border-2"
              />
              <Button type="button" variant="outline" onClick={handleAddTag} className="h-11 px-4 border-2">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-white/60 dark:bg-gray-900/60 rounded-md border">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} className="flex items-center gap-1 px-3 py-1.5 text-sm">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">
              Add relevant tags to improve course discoverability
            </p>
          </div>
        </CardContent>
      <div>
        <div className="px-10">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={saving} className="h-11 px-6 border-2">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.title || !formData.description} className="h-11 px-6">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : isCreating ? "Create Course" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
      </Card>


    </div>
  )
}