// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RoleSelector from "./RoleSelector";
import InstitutionRoleSelector from "./InstitutionRoleSelector";

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  user?: any;
  onSubmit: (userData: any) => Promise<void>;
  isSubmitting: boolean;
}

const accountTypes = [
  { value: "Student", label: "Student" },
  { value: "Researcher", label: "Researcher" },
  { value: "Diaspora", label: "Diaspora" },
  { value: "Institution", label: "Institution" },
  { value: "admin", label: "Admin" },
];

const countries = [
  { value: "RW", label: "Rwanda" },
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
  { value: "KE", label: "Kenya" },
  { value: "TZ", label: "Tanzania" },
  { value: "UG", label: "Uganda" },
];

export default function UserFormDialog({
  open,
  onClose,
  mode,
  user,
  onSubmit,
  isSubmitting,
}: UserFormDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    // Basic Information
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    username: "",
    phone_number: "",
    
    // Account Configuration
    account_type: "Student",
    bwenge_role: "LEARNER",
    institution_role: null as string | null,
    is_active: true,
    is_verified: false,
    
    // Profile Information
    bio: "",
    country: "",
    city: "",
    profile_picture_url: "",
    
    // Institution Assignment
    assign_to_institution: {
      institution_id: "",
      role: "MEMBER",
      is_primary: false,
      permissions: {
        can_create_courses: false,
        can_manage_members: false,
        can_view_analytics: false,
      },
    },
    
    // Additional Settings (create only)
    send_welcome_email: true,
    require_password_change: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Initialize form with user data for edit mode
  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        email: user.email || "",
        password: "",
        confirmPassword: "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        username: user.username || "",
        phone_number: user.phone_number || "",
        account_type: user.account_type || "Student",
        bwenge_role: user.bwenge_role || "LEARNER",
        institution_role: user.institution_role || null,
        is_active: user.is_active ?? true,
        is_verified: user.is_verified ?? false,
        bio: user.bio || "",
        country: user.country || "",
        city: user.city || "",
        profile_picture_url: user.profile_picture_url || "",
        assign_to_institution: {
          institution_id: user.primary_institution_id || "",
          role: user.institution_role || "MEMBER",
          is_primary: !!user.primary_institution_id,
          permissions: {
            can_create_courses: false,
            can_manage_members: false,
            can_view_analytics: false,
          },
        },
        send_welcome_email: true,
        require_password_change: false,
      });
    } else {
      // Reset form for create mode
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        first_name: "",
        last_name: "",
        username: "",
        phone_number: "",
        account_type: "Student",
        bwenge_role: "LEARNER",
        institution_role: null,
        is_active: true,
        is_verified: false,
        bio: "",
        country: "",
        city: "",
        profile_picture_url: "",
        assign_to_institution: {
          institution_id: "",
          role: "MEMBER",
          is_primary: false,
          permissions: {
            can_create_courses: false,
            can_manage_members: false,
            can_view_analytics: false,
          },
        },
        send_welcome_email: true,
        require_password_change: false,
      });
    }
    setErrors({});
    setActiveTab("basic");
  }, [mode, user, open]);
  
  // Generate username from first and last name
  useEffect(() => {
    if (mode === 'create' && !formData.username && formData.first_name && formData.last_name) {
      const generatedUsername = `${formData.first_name.toLowerCase()}.${formData.last_name.toLowerCase()}`;
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [formData.first_name, formData.last_name, mode]);
  
  // Check password strength
  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    if (formData.password.length >= 8) strength++;
    if (/[A-Z]/.test(formData.password)) strength++;
    if (/[0-9]/.test(formData.password)) strength++;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength++;
    
    setPasswordStrength(strength);
  }, [formData.password]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields validation
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.last_name) newErrors.last_name = "Last name is required";
    
    // Email format validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    // Password validation (create mode only)
    if (mode === 'create') {
      if (!formData.password) newErrors.password = "Password is required";
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    // Role compatibility validation
    if (formData.bwenge_role === "INSTITUTION_ADMIN") {
      if (!formData.assign_to_institution.institution_id) {
        newErrors.institution_id = "Institution is required for Institution Admin";
      }
      if (formData.assign_to_institution.role !== "ADMIN") {
        newErrors.institution_role = "Institution Admin must have ADMIN role in institution";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Prepare submission data
    const submissionData: any = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      account_type: formData.account_type,
      bwenge_role: formData.bwenge_role,
      institution_role: formData.institution_role,
      is_active: formData.is_active,
      is_verified: formData.is_verified,
    };
    
    // Add optional fields if they have values
    if (formData.username) submissionData.username = formData.username;
    if (formData.phone_number) submissionData.phone_number = formData.phone_number;
    if (formData.bio) submissionData.bio = formData.bio;
    if (formData.country) submissionData.country = formData.country;
    if (formData.city) submissionData.city = formData.city;
    if (formData.profile_picture_url) {
      submissionData.profile_picture_url = formData.profile_picture_url;
    }
    
    // Add password for create mode
    if (mode === 'create') {
      submissionData.password = formData.password;
      submissionData.send_welcome_email = formData.send_welcome_email;
      submissionData.require_password_change = formData.require_password_change;
    }
    
    // Add institution assignment if institution is selected
    if (formData.assign_to_institution.institution_id) {
      submissionData.assign_to_institution = formData.assign_to_institution;
    }
    
    try {
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };
  
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return "bg-secondary";
      case 1: return "bg-destructive/100";
      case 2: return "bg-warning/100";
      case 3: return "bg-warning/100";
      case 4: return "bg-success/100";
      default: return "bg-secondary";
    }
  };
  
  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0: return "Very Weak";
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Strong";
      default: return "";
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === 'create' ? 'Create New User' : 'Edit User'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new user with the appropriate roles and permissions'
              : 'Update user information, roles, and permissions'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="institution">Institution</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the user's basic personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="John"
                      />
                      {errors.first_name && (
                        <p className="text-sm text-destructive">{errors.first_name}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Doe"
                      />
                      {errors.last_name && (
                        <p className="text-sm text-destructive">{errors.last_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john.doe@example.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="john.doe"
                      helperText="Leave blank to auto-generate"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+250 123 456 789"
                    />
                  </div>
                  
                  {mode === 'create' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                          />
                          {errors.password && (
                            <p className="text-sm text-destructive">{errors.password}</p>
                          )}
                          
                          {/* Password strength meter */}
                          {formData.password && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  Password strength: {getPasswordStrengthText()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {passwordStrength}/4
                                </span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${getPasswordStrengthColor()}`}
                                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                                />
                              </div>
                              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                                <li className="flex items-center">
                                  {formData.password.length >= 8 ? (
                                    <CheckCircle2 className="w-3 h-3 text-success mr-1" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-muted-foreground mr-1" />
                                  )}
                                  At least 8 characters
                                </li>
                                <li className="flex items-center">
                                  {/[A-Z]/.test(formData.password) ? (
                                    <CheckCircle2 className="w-3 h-3 text-success mr-1" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-muted-foreground mr-1" />
                                  )}
                                  One uppercase letter
                                </li>
                                <li className="flex items-center">
                                  {/[0-9]/.test(formData.password) ? (
                                    <CheckCircle2 className="w-3 h-3 text-success mr-1" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-muted-foreground mr-1" />
                                  )}
                                  One number
                                </li>
                                <li className="flex items-center">
                                  {/[^A-Za-z0-9]/.test(formData.password) ? (
                                    <CheckCircle2 className="w-3 h-3 text-success mr-1" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-muted-foreground mr-1" />
                                  )}
                                  One special character
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password *</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                          />
                          {errors.confirmPassword && (
                            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Account Configuration Tab */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Configuration</CardTitle>
                  <CardDescription>
                    Configure the user's account type, roles, and status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>BwengePlus Role *</Label>
                    <RoleSelector
                      value={formData.bwenge_role}
                      onChange={(role) => setFormData({ ...formData, bwenge_role: role })}
                      showDescriptions
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Institution Role</Label>
                    <InstitutionRoleSelector
                      value={formData.institution_role}
                      onChange={(role) => setFormData({ ...formData, institution_role: role })}
                      bwengeRole={formData.bwenge_role}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be set automatically when assigning to an institution
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Account Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_active">Active</Label>
                          <p className="text-sm text-muted-foreground">
                            User can log in and access the platform
                          </p>
                        </div>
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_active: checked })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_verified">Email Verified</Label>
                          <p className="text-sm text-muted-foreground">
                            User's email address has been verified
                          </p>
                        </div>
                        <Switch
                          id="is_verified"
                          checked={formData.is_verified}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_verified: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Institution Assignment Tab */}
            <TabsContent value="institution" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Institution Assignment</CardTitle>
                  <CardDescription>
                    Assign user to an institution with specific role and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Institution assignment is required for INSTITUTION_ADMIN role and recommended for INSTRUCTOR and CONTENT_CREATOR roles.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="institution_id">Select Institution</Label>
                    <Select
                      value={formData.assign_to_institution.institution_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          assign_to_institution: {
                            ...formData.assign_to_institution,
                            institution_id: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Search and select institution..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inst-1">University of Rwanda</SelectItem>
                        <SelectItem value="inst-2">Rwanda Polytechnic</SelectItem>
                        <SelectItem value="inst-3">AIMS Rwanda</SelectItem>
                        <SelectItem value="inst-4">Carnegie Mellon Africa</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.institution_id && (
                      <p className="text-sm text-destructive">{errors.institution_id}</p>
                    )}
                  </div>
                  
                  {formData.assign_to_institution.institution_id && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="institution_role">Role in Institution</Label>
                        <Select
                          value={formData.assign_to_institution.role}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              assign_to_institution: {
                                ...formData.assign_to_institution,
                                role: value,
                              },
                              institution_role: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Administrator</SelectItem>
                            <SelectItem value="CONTENT_CREATOR">Content Creator</SelectItem>
                            <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.institution_role && (
                          <p className="text-sm text-destructive">{errors.institution_role}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_primary"
                          checked={formData.assign_to_institution.is_primary}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              assign_to_institution: {
                                ...formData.assign_to_institution,
                                is_primary: checked,
                              },
                            })
                          }
                        />
                        <Label htmlFor="is_primary">
                          Set as primary institution
                        </Label>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Additional Permissions</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="can_create_courses"
                              checked={formData.assign_to_institution.permissions.can_create_courses}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  assign_to_institution: {
                                    ...formData.assign_to_institution,
                                    permissions: {
                                      ...formData.assign_to_institution.permissions,
                                      can_create_courses: checked,
                                    },
                                  },
                                })
                              }
                            />
                            <Label htmlFor="can_create_courses">
                              Can create courses
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="can_manage_members"
                              checked={formData.assign_to_institution.permissions.can_manage_members}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  assign_to_institution: {
                                    ...formData.assign_to_institution,
                                    permissions: {
                                      ...formData.assign_to_institution.permissions,
                                      can_manage_members: checked,
                                    },
                                  },
                                })
                              }
                            />
                            <Label htmlFor="can_manage_members">
                              Can manage institution members
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="can_view_analytics"
                              checked={formData.assign_to_institution.permissions.can_view_analytics}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  assign_to_institution: {
                                    ...formData.assign_to_institution,
                                    permissions: {
                                      ...formData.assign_to_institution.permissions,
                                      can_view_analytics: checked,
                                    },
                                  },
                                })
                              }
                            />
                            <Label htmlFor="can_view_analytics">
                              Can view institution analytics
                            </Label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Profile Information Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Additional profile details and information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => setFormData({ ...formData, country: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Enter city"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profile_picture_url">Profile Picture URL</Label>
                    <Input
                      id="profile_picture_url"
                      value={formData.profile_picture_url}
                      onChange={(e) => setFormData({ ...formData, profile_picture_url: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Additional Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Settings</CardTitle>
                  <CardDescription>
                    Configure email notifications and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mode === 'create' ? (
                    <>
                      <div className="space-y-3">
                        <h4 className="font-medium">Email Notifications</h4>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="send_welcome_email">Send Welcome Email</Label>
                            <p className="text-sm text-muted-foreground">
                              Send login credentials and welcome instructions to the user
                            </p>
                          </div>
                          <Switch
                            id="send_welcome_email"
                            checked={formData.send_welcome_email}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, send_welcome_email: checked })
                            }
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Security Settings</h4>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="require_password_change">
                              Require Password Change on First Login
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              User must change their password after first login
                            </p>
                          </div>
                          <Switch
                            id="require_password_change"
                            checked={formData.require_password_change}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, require_password_change: checked })
                            }
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-medium">Security Actions</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          Reset Password
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          Resend Verification Email
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-destructive">
                          Force Logout from All Devices
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>
                  {mode === 'create' ? 'Create User' : 'Save Changes'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}