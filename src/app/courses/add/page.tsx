"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import Cookies from "js-cookie"

export default function AddCoursePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [institutions, setInstitutions] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const { token, user } = useAuth()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    short_description: "",
    level: "",
    price: "",
    duration_minutes: "",
    tags: "",
    category_id: "",
    category_name: "",
    institution_id: "",
    course_type: "MOOC",
    is_public: true,
    requires_approval: false,
    is_certificate_available: true,
    language: "English",
    requirements: "",
    what_you_will_learn: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const cookieToken = Cookies.get("bwenge_token")
      const currentToken = token || cookieToken
      
      if (!currentToken || !user) {
        router.push("/login")
        return
      }

      setLoadingData(true)
      try {
        // Fetch categories
        const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/categories`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        })
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.data?.categories || [])
        }

        // Fetch institutions for admins
        if (user.bwenge_role === "SYSTEM_ADMIN" || user.bwenge_role === "INSTITUTION_ADMIN") {
          const institutionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          })
          if (institutionsResponse.ok) {
            const institutionsData = await institutionsResponse.json()
            setInstitutions(institutionsData.data || [])
          }
        }
      } catch (error) {
      } finally {
        setLoadingData(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [token, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    
    if (!currentToken || !user) {
      toast.error("You must be logged in to create a course")
      router.push("/login")
      return
    }

    setIsLoading(true)

    try {
      const courseData = {
        ...formData,
        price: Number.parseFloat(formData.price) || 0,
        duration_minutes: Number.parseInt(formData.duration_minutes) || 0,
        tags: formData.tags.split(",").map((tag) => tag.trim()).filter(tag => tag),
        modules: [], // Empty modules array - can be added later
        instructor_id: user.id, // Current user as instructor
      }

      // Remove empty strings
      Object.keys(courseData).forEach(key => {
        if (courseData[key as keyof typeof courseData] === "") {
          delete courseData[key as keyof typeof courseData]
        }
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(courseData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Course created successfully!")
        router.push("/instructor/courses")
      } else {
        toast.error(result.message || "Failed to create course")
      }
    } catch (error) {
      toast.error("Failed to create course")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/system-admin/courses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Course</h1>
          <p className="text-muted-foreground">Set up your course foundation</p>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Course Information
          </CardTitle>
          <CardDescription>Fill in the details to create a new course</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Introduction to React Development"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => handleInputChange("short_description", e.target.value)}
                    placeholder="Brief summary (max 150 characters)"
                    maxLength={150}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Level *</Label>
                  <Select value={formData.level} onValueChange={(value) => handleInputChange("level", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">Beginner</SelectItem>
                      <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                      <SelectItem value="ADVANCED">Advanced</SelectItem>
                      <SelectItem value="EXPERT">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (RWF)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange("duration_minutes", e.target.value)}
                    placeholder="480"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course_type">Course Type *</Label>
                  <Select value={formData.course_type} onValueChange={(value) => handleInputChange("course_type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MOOC">MOOC (Massive Open Online Course)</SelectItem>
                      <SelectItem value="SPOC">SPOC (Small Private Online Course)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.course_type === "SPOC" && (
                  <div className="space-y-2">
                    <Label htmlFor="institution_id">Institution</Label>
                    <Select value={formData.institution_id} onValueChange={(value) => handleInputChange("institution_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select institution" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutions.map((institution) => (
                          <SelectItem key={institution.id} value={institution.id}>
                            {institution.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => handleInputChange("category_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_name">Or Create New Category</Label>
                  <Input
                    id="category_name"
                    value={formData.category_name}
                    onChange={(e) => handleInputChange("category_name", e.target.value)}
                    placeholder="New category name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <Select value={formData.language} onValueChange={(value) => handleInputChange("language", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Kinyarwanda">Kinyarwanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Detailed course description..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="what_you_will_learn">What You Will Learn</Label>
              <Textarea
                id="what_you_will_learn"
                value={formData.what_you_will_learn}
                onChange={(e) => handleInputChange("what_you_will_learn", e.target.value)}
                placeholder="List learning objectives (one per line)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => handleInputChange("requirements", e.target.value)}
                placeholder="List course prerequisites (one per line)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange("tags", e.target.value)}
                placeholder="React, JavaScript, Frontend"
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Certificate Included</Label>
                <p className="text-sm text-muted-foreground">Students will receive a certificate upon completion</p>
              </div>
              <input
                type="checkbox"
                checked={formData.is_certificate_available}
                onChange={(e) => handleInputChange("is_certificate_available", e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {formData.course_type === "SPOC" && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Require Enrollment Approval</Label>
                  <p className="text-sm text-muted-foreground">Students need approval to join</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.requires_approval}
                  onChange={(e) => handleInputChange("requires_approval", e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}