"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/use-auth"
import { 
  Camera, 
  Save, 
  Loader2, 
  Upload, 
  X, 
  Briefcase, 
  GraduationCap, 
  Building, 
  Globe, 
  Linkedin, 
  FileText,
  User,
  BookOpen,
  Award,
  Users
} from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

// Academic level options matching backend enum
const ACADEMIC_LEVELS = [
  { value: "Undergraduate", label: "Undergraduate" },
  { value: "Masters", label: "Master's" },
  { value: "PhD", label: "PhD" },
  { value: "Professional", label: "Professional" },
]

// Account type options matching backend enum
const ACCOUNT_TYPES = [
  { value: "Student", label: "Student", icon: GraduationCap },
  { value: "Researcher", label: "Researcher", icon: BookOpen },
  { value: "Diaspora", label: "Diaspora", icon: Globe },
  { value: "Institution", label: "Institution", icon: Building },
]

// Institution types
const INSTITUTION_TYPES = [
  "University",
  "Research Center",
  "College",
  "Polytechnic",
  "Vocational School",
  "Training Institute",
  "Other"
]

export default function CompleteProfilePage() {
  const { user, token, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState("personal")
  const [isEditing, setIsEditing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingCV, setIsUploadingCV] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [completionStatus, setCompletionStatus] = useState({
    is_completed: false,
    completion_percentage: 0,
    missing_fields: []
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)
  
  // Form state matching backend fields exactly
  const [formData, setFormData] = useState({
    // User fields
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    phone_number: "",
    profile_picture_url: "",
    bio: "",
    country: "",
    city: "",
    account_type: "Student",
    
    // Student/Researcher/Diaspora fields
    institution_name: "",
    department: "",
    academic_level: "",
    research_interests: [] as string[],
    orcid_id: "",
    google_scholar_url: "",
    linkedin_url: "",
    website_url: "",
    cv_file_url: "",
    current_position: "",
    home_institution: "",
    willing_to_mentor: false,
    
    // Institution-specific fields
    institution_address: "",
    institution_phone: "",
    institution_type: "",
    institution_website: "",
    institution_description: "",
    institution_departments: [] as string[],
    institution_founded_year: "" as string | number,
    institution_accreditation: "",
    
    // Learning preferences
    learning_preferences: {
      preferred_language: "en",
      notification_settings: {},
      learning_pace: "moderate",
      interests: [] as string[]
    },
  })

  // Research interest input
  const [researchInterest, setResearchInterest] = useState("")
  const [institutionDepartment, setInstitutionDepartment] = useState("")

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        // User fields
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        username: user.username || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
        profile_picture_url: user.profile_picture_url || "",
        bio: user.bio || "",
        country: user.country || "",
        city: user.city || "",
        account_type: user.account_type || "Student",
        learning_preferences: {
          preferred_language: user.learning_preferences?.preferred_language || "en",
          notification_settings: user.learning_preferences?.notification_settings || {},
          learning_pace: user.learning_preferences?.learning_pace || "moderate",
          interests: user.learning_preferences?.interests || []
        },
        
        // Profile fields
        ...(user.profile || {}),
        
        // Ensure arrays are properly initialized
        research_interests: user.profile?.research_interests || [],
        institution_departments: user.profile?.institution_departments || [],
      }))
    }
  }, [user])

  // Fetch profile completion status
  useEffect(() => {
    fetchCompletionStatus()
  }, [user])

  const fetchCompletionStatus = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile/completion`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompletionStatus(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch completion status:", error)
    }
  }

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setIsUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile/picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      
      setFormData(prev => ({ 
        ...prev, 
        profile_picture_url: data.data.profile_picture_url 
      }))
      
      // Update user context
      updateUser({
        profile_picture_url: data.data.profile_picture_url
      })
      
      toast.success("Profile picture uploaded successfully!")
      fetchCompletionStatus() // Refresh completion status
      
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a PDF or Word document")
      if (cvInputRef.current) cvInputRef.current.value = ""
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      if (cvInputRef.current) cvInputRef.current.value = ""
      return
    }

    setIsUploadingCV(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile/cv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      
      setFormData(prev => ({ 
        ...prev, 
        cv_file_url: data.data.cv_file_url 
      }))
      
      toast.success("CV uploaded successfully!")
      fetchCompletionStatus()
      
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload CV. Please try again.")
    } finally {
      setIsUploadingCV(false)
      if (cvInputRef.current) cvInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!token) {
      toast.error("Please log in to save changes")
      return
    }

    setIsSaving(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update user context with all data
        updateUser({
          ...data.data,
          profile: data.data.profile
        })
        
        toast.success("Profile updated successfully!")
        setIsEditing(false)
        fetchCompletionStatus()
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("An error occurred while updating profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAccountTypeChange = async (value: string) => {
    if (!token) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile/account-type`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ account_type: value }),
      })

      if (response.ok) {
        const data = await response.json()
        
        setFormData(prev => ({ ...prev, account_type: value }))
        
        // Update user context
        updateUser({
          account_type: value as any,
          bwenge_role: data.data.bwenge_role
        })
        
        toast.success("Account type updated successfully!")
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || "Failed to update account type")
      }
    } catch (error) {
      console.error("Error updating account type:", error)
      toast.error("An error occurred while updating account type")
    }
  }

  const addResearchInterest = () => {
    if (researchInterest.trim() && !formData.research_interests.includes(researchInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        research_interests: [...prev.research_interests, researchInterest.trim()]
      }))
      setResearchInterest("")
    }
  }

  const removeResearchInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      research_interests: prev.research_interests.filter(i => i !== interest)
    }))
  }

  const addInstitutionDepartment = () => {
    if (institutionDepartment.trim() && !formData.institution_departments.includes(institutionDepartment.trim())) {
      setFormData(prev => ({
        ...prev,
        institution_departments: [...prev.institution_departments, institutionDepartment.trim()]
      }))
      setInstitutionDepartment("")
    }
  }

  const removeInstitutionDepartment = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      institution_departments: prev.institution_departments.filter(d => d !== dept)
    }))
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      // Handle nested objects
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof typeof prev] as Record<string, any>),
            [child]: value
          }
        }
      }
      return { ...prev, [field]: value }
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const isInstitutionAccount = formData.account_type === "Institution"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and profile information</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Profile Completion</div>
            <div className="flex items-center gap-2">
              <Progress value={completionStatus.completion_percentage} className="w-32" />
              <span className="text-sm font-medium">{completionStatus.completion_percentage}%</span>
            </div>
          </div>
          
          <Button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            variant={isEditing ? "default" : "outline"}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {isEditing ? <Save className="w-4 h-4 mr-2" /> : null}
                {isEditing ? "Save Changes" : "Edit Profile"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Completion Alert */}
      {!completionStatus.is_completed && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-800">Complete your profile</h3>
                <p className="text-sm text-yellow-700">
                  {completionStatus.missing_fields.length > 0 
                    ? `Missing: ${completionStatus.missing_fields.join(", ")}`
                    : "Please fill in all required fields to complete your profile."}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Complete Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-background">
                    <AvatarImage
                      src={formData.profile_picture_url || "/placeholder.svg"}
                      alt={`${formData.first_name} ${formData.last_name}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl">
                      {formData.first_name?.[0]}{formData.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold">
                    {formData.first_name} {formData.last_name}
                  </h2>
                  <p className="text-muted-foreground">{formData.email}</p>
                  
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize">
                      {formData.account_type}
                    </Badge>
                    <Badge variant="secondary">
                      {user.bwenge_role?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{user.enrolled_courses_count || 0}</div>
                    <div className="text-sm text-muted-foreground">Courses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{user.certificates_earned || 0}</div>
                    <div className="text-sm text-muted-foreground">Certificates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{user.total_learning_hours || 0}</div>
                    <div className="text-sm text-muted-foreground">Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {user.profile?.total_followers_count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {formData.cv_file_url && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={formData.cv_file_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4 mr-2" />
                    View CV
                  </a>
                </Button>
              )}
              {formData.orcid_id && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`https://orcid.org/${formData.orcid_id}`} target="_blank" rel="noopener noreferrer">
                    <Briefcase className="w-4 h-4 mr-2" />
                    ORCID Profile
                  </a>
                </Button>
              )}
              {formData.linkedin_url && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              )}
              {formData.website_url && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={formData.website_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Profile Details */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="personal">
                <User className="w-4 h-4 mr-2" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="academic">
                <GraduationCap className="w-4 h-4 mr-2" />
                Academic
              </TabsTrigger>
              <TabsTrigger value="professional">
                <Briefcase className="w-4 h-4 mr-2" />
                Professional
              </TabsTrigger>
              {isInstitutionAccount && (
                <TabsTrigger value="institution">
                  <Building className="w-4 h-4 mr-2" />
                  Institution
                </TabsTrigger>
              )}
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleChange("last_name", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => handleChange("username", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={formData.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        value={formData.phone_number}
                        onChange={(e) => handleChange("phone_number", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => handleChange("country", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleChange("city", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferred_language">Preferred Language</Label>
                      <Select
                        value={formData.learning_preferences?.preferred_language}
                        onValueChange={(value) => handleChange("learning_preferences.preferred_language", value)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="rw">Kinyarwanda</SelectItem>
                          <SelectItem value="sw">Swahili</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio *</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* CV Upload */}
                  <div className="space-y-2">
                    <Label>Curriculum Vitae (CV)</Label>
                    <div className="flex items-center gap-4">
                      {formData.cv_file_url ? (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <a 
                            href={formData.cv_file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Current CV
                          </a>
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleChange("cv_file_url", "")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No CV uploaded</span>
                      )}
                      
                      {isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cvInputRef.current?.click()}
                          disabled={isUploadingCV}
                        >
                          {isUploadingCV ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {formData.cv_file_url ? "Replace" : "Upload"}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <input
                      ref={cvInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCVUpload}
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload your CV (PDF or Word document, max 10MB)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Academic Information Tab */}
            <TabsContent value="academic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Academic Information</CardTitle>
                  <CardDescription>Your academic background and research interests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="institution_name">Institution Name *</Label>
                      <Input
                        id="institution_name"
                        value={formData.institution_name}
                        onChange={(e) => handleChange("institution_name", e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., University of Rwanda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => handleChange("department", e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="academic_level">Academic Level</Label>
                      <Select
                        value={formData.academic_level}
                        onValueChange={(value) => handleChange("academic_level", value)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select academic level" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACADEMIC_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orcid_id">ORCID ID</Label>
                      <Input
                        id="orcid_id"
                        value={formData.orcid_id}
                        onChange={(e) => handleChange("orcid_id", e.target.value)}
                        disabled={!isEditing}
                        placeholder="0000-0000-0000-0000"
                      />
                    </div>
                  </div>

                  {/* Research Interests */}
                  <div className="space-y-2">
                    <Label>Research Interests</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={researchInterest}
                        onChange={(e) => setResearchInterest(e.target.value)}
                        disabled={!isEditing}
                        placeholder="Add a research interest"
                        onKeyPress={(e) => e.key === 'Enter' && addResearchInterest()}
                      />
                      <Button
                        onClick={addResearchInterest}
                        disabled={!isEditing || !researchInterest.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.research_interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {interest}
                          {isEditing && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-3 h-3 p-0 hover:bg-transparent"
                              onClick={() => removeResearchInterest(interest)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </Badge>
                      ))}
                      {formData.research_interests.length === 0 && (
                        <span className="text-sm text-muted-foreground">No research interests added</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="google_scholar_url">Google Scholar Profile</Label>
                    <Input
                      id="google_scholar_url"
                      value={formData.google_scholar_url}
                      onChange={(e) => handleChange("google_scholar_url", e.target.value)}
                      disabled={!isEditing}
                      placeholder="https://scholar.google.com/..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Professional Information Tab */}
            <TabsContent value="professional" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                  <CardDescription>Your professional background and networks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_position">Current Position</Label>
                      <Input
                        id="current_position"
                        value={formData.current_position}
                        onChange={(e) => handleChange("current_position", e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., Senior Researcher"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="home_institution">Home Institution</Label>
                      <Input
                        id="home_institution"
                        value={formData.home_institution}
                        onChange={(e) => handleChange("home_institution", e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., Rwanda Biomedical Centre"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={(e) => handleChange("linkedin_url", e.target.value)}
                      disabled={!isEditing}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website_url">Personal Website</Label>
                    <Input
                      id="website_url"
                      value={formData.website_url}
                      onChange={(e) => handleChange("website_url", e.target.value)}
                      disabled={!isEditing}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Willing to Mentor</Label>
                      <p className="text-sm text-muted-foreground">
                        Are you willing to mentor students or junior researchers?
                      </p>
                    </div>
                    <Switch
                      checked={formData.willing_to_mentor}
                      onCheckedChange={(checked) => handleChange("willing_to_mentor", checked)}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Institution Information Tab (only for Institution accounts) */}
            {isInstitutionAccount && (
              <TabsContent value="institution" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Institution Information</CardTitle>
                    <CardDescription>Details about your institution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="institution_type">Institution Type</Label>
                        <Select
                          value={formData.institution_type}
                          onValueChange={(value) => handleChange("institution_type", value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select institution type" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTITUTION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution_phone">Institution Phone</Label>
                        <Input
                          id="institution_phone"
                          value={formData.institution_phone}
                          onChange={(e) => handleChange("institution_phone", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution_website">Institution Website</Label>
                        <Input
                          id="institution_website"
                          value={formData.institution_website}
                          onChange={(e) => handleChange("institution_website", e.target.value)}
                          disabled={!isEditing}
                          placeholder="https://institution.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution_founded_year">Founded Year</Label>
                        <Input
                          id="institution_founded_year"
                          type="number"
                          value={formData.institution_founded_year}
                          onChange={(e) => handleChange("institution_founded_year", e.target.value)}
                          disabled={!isEditing}
                          placeholder="e.g., 1995"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="institution_address">Institution Address</Label>
                      <Textarea
                        id="institution_address"
                        value={formData.institution_address}
                        onChange={(e) => handleChange("institution_address", e.target.value)}
                        disabled={!isEditing}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="institution_description">Institution Description</Label>
                      <Textarea
                        id="institution_description"
                        value={formData.institution_description}
                        onChange={(e) => handleChange("institution_description", e.target.value)}
                        disabled={!isEditing}
                        rows={4}
                        placeholder="Brief description of your institution..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="institution_accreditation">Accreditation</Label>
                      <Input
                        id="institution_accreditation"
                        value={formData.institution_accreditation}
                        onChange={(e) => handleChange("institution_accreditation", e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., Accredited by Ministry of Education"
                      />
                    </div>

                    {/* Institution Departments */}
                    <div className="space-y-2">
                      <Label>Departments</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={institutionDepartment}
                          onChange={(e) => setInstitutionDepartment(e.target.value)}
                          disabled={!isEditing}
                          placeholder="Add a department"
                          onKeyPress={(e) => e.key === 'Enter' && addInstitutionDepartment()}
                        />
                        <Button
                          onClick={addInstitutionDepartment}
                          disabled={!isEditing || !institutionDepartment.trim()}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.institution_departments.map((dept, index) => (
                          <Badge key={index} variant="outline" className="gap-1">
                            {dept}
                            {isEditing && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-3 h-3 p-0 hover:bg-transparent"
                                onClick={() => removeInstitutionDepartment(dept)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </Badge>
                        ))}
                        {formData.institution_departments.length === 0 && (
                          <span className="text-sm text-muted-foreground">No departments added</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}