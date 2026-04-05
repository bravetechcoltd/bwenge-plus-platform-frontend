"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchInstitutionLimits,
} from "@/lib/features/institutions/institutionSlice";
import { useAuth } from "@/hooks/use-auth";
import toast from "react-hot-toast";
import {
  Loader2,
  Building2,
  Settings,
  Shield,
  BookOpen,
  Users,
  Bell,
  Save,
  Key,
} from "lucide-react";
interface InstitutionLimits {
  max_instructors: number;
  max_members: number;
  total_capacity?: number;
  current_instructors: number;
  current_members: number;
  total_current?: number;
  instructors_remaining: number;
  members_remaining: number;
  can_add_instructor: boolean;
  can_add_member: boolean;
}

export default function InstitutionSettingsPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading } = useAppSelector(
    (state) => state.bwengeAuth
  );
  const { selectedInstitution, institutionLimits } = useAppSelector(
    (state) => state.institutions
  );
  const dispatch = useAppDispatch();


  const urlInstitutionId = searchParams.get("institution");
  const institutionId =
    urlInstitutionId ||
    authUser?.primary_institution_id ||
    undefined;

  // Resolve the institution object from the best available source
  const institution = (() => {
    if (authUser?.institution && institutionId) {
      if (authUser.institution.id === institutionId) return authUser.institution;
    }
    if (selectedInstitution && institutionId) {
      if ((selectedInstitution as any).id === institutionId)
        return selectedInstitution;
    }
    return authUser?.institution || selectedInstitution || null;
  })();

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    institution_name: "",
    institution_type: "",
    institution_website: "",
    institution_email: "",
    institution_phone: "",
    institution_address: "",
    institution_description: "",
    language: "en",
    timezone: "UTC",
    date_format: "MM/DD/YYYY",
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    require_2fa: false,
    session_timeout: 60,
    max_login_attempts: 5,
    password_complexity: "medium",
    ip_whitelist: [] as string[],
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    member_joined: true,
    course_published: true,
    enrollment_request: true,
    weekly_report: true,
    monthly_report: true,
  });

  // Course settings
  const [courseSettings, setCourseSettings] = useState({
    allow_public_courses: true,
    require_approval_for_spoc: false,
    max_instructors: 10,
    auto_approve_instructors: false,
    default_course_visibility: "private",
    max_course_duration: 365,
    enable_certificates: true,
    enable_reviews: true,
    enable_discussions: true,
  });

  // Member settings
  const [memberSettings, setMemberSettings] = useState({
    allow_self_registration: false,
    require_approval_for_members: true,
    max_members: 100,
    default_member_role: "MEMBER",
    allow_role_changes: true,
    enable_member_directory: true,
  });

  // Fetch institution limits
  useEffect(() => {
    if (institutionId) {
      dispatch(fetchInstitutionLimits(institutionId));
    }
  }, [institutionId, dispatch]);

  // Initialize settings when institution data is available
  useEffect(() => {
    if (institution && user && authUser) {
      setGeneralSettings({
        institution_name: institution.name,
        institution_type: institution.type,
        institution_website: "",
        institution_email: user?.email || authUser?.email || "",
        institution_phone: "",
        institution_address: "",
        institution_description: institution.description || "",
        language: "en",
        timezone: "UTC",
        date_format: "MM/DD/YYYY",
      });

      setCourseSettings((prev) => ({
        ...prev,
        allow_public_courses:
          institution.settings?.allow_public_courses ?? true,
        require_approval_for_spoc:
          institution.settings?.require_approval_for_spoc ?? false,
        max_instructors: institutionLimits?.max_instructors ?? institution.settings?.max_instructors ?? 10,
      }));

      setMemberSettings((prev) => ({
        ...prev,
        max_members: institutionLimits?.max_members ?? (institution.settings as any)?.max_members ?? 100,
      }));
    }
  }, [institution, user, authUser, institutionLimits]);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const authToken = token || (typeof window !== "undefined"
        ? document.cookie.match(/bwenge_token=([^;]+)/)?.[1]
        : null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/institutions/${institutionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name: generalSettings.institution_name,
            description: generalSettings.institution_description,
            settings: {
              ...institution?.settings,
            },
          }),
        }
      );

      if (response.ok) {
        toast.success("General settings updated successfully!");
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setIsSaving(true);
    try {
      const authToken = token || (typeof window !== "undefined"
        ? document.cookie.match(/bwenge_token=([^;]+)/)?.[1]
        : null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/institutions/${institutionId}/settings/security`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(securitySettings),
        }
      );

      if (response.ok) {
        toast.success("Security settings updated successfully!");
      } else {
        throw new Error("Failed to update security settings");
      }
    } catch (error) {
      toast.error("Failed to update security settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCourseSettings = async () => {
    setIsSaving(true);
    try {
      const authToken = token || (typeof window !== "undefined"
        ? document.cookie.match(/bwenge_token=([^;]+)/)?.[1]
        : null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/institutions/${institutionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            settings: {
              ...institution?.settings,
              allow_public_courses: courseSettings.allow_public_courses,
              require_approval_for_spoc:
                courseSettings.require_approval_for_spoc,
              max_instructors: courseSettings.max_instructors,
            },
          }),
        }
      );

      if (response.ok) {
        toast.success("Course settings updated successfully!");
      } else {
        throw new Error("Failed to update course settings");
      }
    } catch (error) {
      toast.error("Failed to update course settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.allSettled([
        handleSaveGeneral(),
        handleSaveCourseSettings(),
        handleSaveSecurity(),
      ]);
      toast.success("All settings saved!");
    } catch (error) {
      toast.error("Failed to update some settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Show spinner only while auth is genuinely loading AND we have no data yet
  if (authLoading && !authUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authLoading && !institution) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              No Institution Selected
            </h2>
            <p className="text-muted-foreground">
              Please select an institution from the dashboard to access
              settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard: institution must be truthy from here on
  if (!institution) return null;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Institution Settings</h1>
        <p className="text-muted-foreground">
          Configure your institution's preferences and security settings
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic information and preferences for your institution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="institution_name">Institution Name</Label>
                  <Input
                    id="institution_name"
                    value={generalSettings.institution_name}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        institution_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution_type">Institution Type</Label>
                  <Select
                    value={generalSettings.institution_type}
                    onValueChange={(value) =>
                      setGeneralSettings({
                        ...generalSettings,
                        institution_type: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNIVERSITY">University</SelectItem>
                      <SelectItem value="GOVERNMENT">Government</SelectItem>
                      <SelectItem value="PRIVATE_COMPANY">
                        Private Company
                      </SelectItem>
                      <SelectItem value="NGO">NGO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution_website">Website</Label>
                  <Input
                    id="institution_website"
                    type="url"
                    value={generalSettings.institution_website}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        institution_website: e.target.value,
                      })
                    }
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution_email">Contact Email</Label>
                  <Input
                    id="institution_email"
                    type="email"
                    value={generalSettings.institution_email}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        institution_email: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution_phone">Phone Number</Label>
                  <Input
                    id="institution_phone"
                    type="tel"
                    value={generalSettings.institution_phone}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        institution_phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={generalSettings.language}
                    onValueChange={(value) =>
                      setGeneralSettings({
                        ...generalSettings,
                        language: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="rw">Kinyarwanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution_address">Address</Label>
                <Textarea
                  id="institution_address"
                  value={generalSettings.institution_address}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      institution_address: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution_description">Description</Label>
                <Textarea
                  id="institution_description"
                  value={generalSettings.institution_description}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      institution_description: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Describe your institution..."
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Authentication</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all administrators
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.require_2fa}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        require_2fa: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session_timeout">
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    min="1"
                    value={securitySettings.session_timeout}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        session_timeout: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-32"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_login_attempts">
                    Max Login Attempts
                  </Label>
                  <Input
                    id="max_login_attempts"
                    type="number"
                    min="1"
                    value={securitySettings.max_login_attempts}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        max_login_attempts:
                          parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-32"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_complexity">
                    Password Complexity
                  </Label>
                  <Select
                    value={securitySettings.password_complexity}
                    onValueChange={(value) =>
                      setSecuritySettings({
                        ...securitySettings,
                        password_complexity: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        Low (6+ characters)
                      </SelectItem>
                      <SelectItem value="medium">
                        Medium (8+ characters, mixed case)
                      </SelectItem>
                      <SelectItem value="high">
                        High (10+ characters, mixed case + numbers)
                      </SelectItem>
                      <SelectItem value="very-high">
                        Very High (12+ characters, symbols included)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">IP Whitelist</h3>
                <div className="space-y-2">
                  <Label>Allowed IP Addresses</Label>
                  <div className="space-y-2">
                    {securitySettings.ip_whitelist.map((ip, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={ip} readOnly />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newList = [
                              ...securitySettings.ip_whitelist,
                            ];
                            newList.splice(index, 1);
                            setSecuritySettings({
                              ...securitySettings,
                              ip_whitelist: newList,
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSecuritySettings({
                          ...securitySettings,
                          ip_whitelist: [
                            ...securitySettings.ip_whitelist,
                            "",
                          ],
                        });
                      }}
                    >
                      Add IP Address
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Admin Access</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Change Admin Password</Label>
                    <p className="text-sm text-muted-foreground">
                      Update your administrator password
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowChangePassword(true)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Setup</Label>
                    <p className="text-sm text-muted-foreground">
                      Configure 2FA for your account
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowTwoFactor(true)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Setup 2FA
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Settings */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
              <CardDescription>
                Configure course creation and management rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Public Courses</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow instructors to create public courses
                    </p>
                  </div>
                  <Switch
                    checked={courseSettings.allow_public_courses}
                    onCheckedChange={(checked) =>
                      setCourseSettings({
                        ...courseSettings,
                        allow_public_courses: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require SPOC Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Require approval for SPOC course enrollments
                    </p>
                  </div>
                  <Switch
                    checked={courseSettings.require_approval_for_spoc}
                    onCheckedChange={(checked) =>
                      setCourseSettings({
                        ...courseSettings,
                        require_approval_for_spoc: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-approve Instructors</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve instructor requests
                    </p>
                  </div>
                  <Switch
                    checked={courseSettings.auto_approve_instructors}
                    onCheckedChange={(checked) =>
                      setCourseSettings({
                        ...courseSettings,
                        auto_approve_instructors: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_instructors">
                    Maximum Instructors
                    <span className="text-xs text-muted-foreground ml-2">(System Admin Only)</span>
                  </Label>
                  <Input
                    id="max_instructors"
                    type="number"
                    min="1"
                    max={institutionLimits?.can_add_instructor ? (institutionLimits.current_instructors + institutionLimits.instructors_remaining) : institutionLimits?.max_instructors}
                    disabled={!institutionLimits?.can_add_instructor}
                    value={courseSettings.max_instructors}
                    onChange={(e) =>
                      setCourseSettings({
                        ...courseSettings,
                        max_instructors: parseInt(e.target.value) || 10,
                      })
                    }
                    className={institutionLimits?.can_add_instructor ? "w-32" : "w-32 bg-muted cursor-not-allowed opacity-60"}
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Max: {institutionLimits?.max_instructors || 'Unlimited'} | Current: {institutionLimits?.current_instructors || 0} | Remaining: {institutionLimits?.instructors_remaining || 0}</p>
                    {institutionLimits && !institutionLimits.can_add_instructor && (
                      <p className="text-warning">⚠️ Instructor limit reached. Cannot add more instructors.</p>
                    )}
                    {institutionLimits?.can_add_instructor && (
                      <p className="text-xs text-primary">You can increase the limit up to {institutionLimits.current_instructors + institutionLimits.instructors_remaining} instructors.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_course_duration">
                    Max Course Duration (days)
                  </Label>
                  <Input
                    id="max_course_duration"
                    type="number"
                    min="1"
                    value={courseSettings.max_course_duration}
                    onChange={(e) =>
                      setCourseSettings({
                        ...courseSettings,
                        max_course_duration:
                          parseInt(e.target.value) || 365,
                      })
                    }
                    className="w-32"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Course Visibility</Label>
                  <Select
                    value={courseSettings.default_course_visibility}
                    onValueChange={(value) =>
                      setCourseSettings({
                        ...courseSettings,
                        default_course_visibility: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="institution">
                        Institution Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Features</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={courseSettings.enable_certificates}
                      onCheckedChange={(checked) =>
                        setCourseSettings({
                          ...courseSettings,
                          enable_certificates: checked,
                        })
                      }
                    />
                    <Label>Enable Certificates</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={courseSettings.enable_reviews}
                      onCheckedChange={(checked) =>
                        setCourseSettings({
                          ...courseSettings,
                          enable_reviews: checked,
                        })
                      }
                    />
                    <Label>Enable Reviews</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={courseSettings.enable_discussions}
                      onCheckedChange={(checked) =>
                        setCourseSettings({
                          ...courseSettings,
                          enable_discussions: checked,
                        })
                      }
                    />
                    <Label>Enable Discussions</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveCourseSettings}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Course Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Member Settings */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Member Settings</CardTitle>
              <CardDescription>
                Configure member registration and management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Self Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to request membership
                    </p>
                  </div>
                  <Switch
                    checked={memberSettings.allow_self_registration}
                    onCheckedChange={(checked) =>
                      setMemberSettings({
                        ...memberSettings,
                        allow_self_registration: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Approval for Members</Label>
                    <p className="text-sm text-muted-foreground">
                      Manually approve new member requests
                    </p>
                  </div>
                  <Switch
                    checked={memberSettings.require_approval_for_members}
                    onCheckedChange={(checked) =>
                      setMemberSettings({
                        ...memberSettings,
                        require_approval_for_members: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Member Directory</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow members to view other members
                    </p>
                  </div>
                  <Switch
                    checked={memberSettings.enable_member_directory}
                    onCheckedChange={(checked) =>
                      setMemberSettings({
                        ...memberSettings,
                        enable_member_directory: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Role Changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow administrators to change member roles
                    </p>
                  </div>
                  <Switch
                    checked={memberSettings.allow_role_changes}
                    onCheckedChange={(checked) =>
                      setMemberSettings({
                        ...memberSettings,
                        allow_role_changes: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_members">
                    Maximum Members
                    <span className="text-xs text-muted-foreground ml-2">(System Admin Only)</span>
                  </Label>
                  <Input
                    id="max_members"
                    type="number"
                    min="1"
                    max={institutionLimits?.can_add_member ? (institutionLimits.current_members + institutionLimits.members_remaining) : institutionLimits?.max_members}
                    disabled={!institutionLimits?.can_add_member}
                    value={memberSettings.max_members}
                    onChange={(e) =>
                      setMemberSettings({
                        ...memberSettings,
                        max_members: parseInt(e.target.value) || 100,
                      })
                    }
                    className={institutionLimits?.can_add_member ? "w-32" : "w-32 bg-muted cursor-not-allowed opacity-60"}
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Max: {institutionLimits?.max_members || 'Unlimited'} | Current: {institutionLimits?.current_members || 0} | Remaining: {institutionLimits?.members_remaining || 0}</p>
                    {institutionLimits && !institutionLimits.can_add_member && (
                      <p className="text-warning">⚠️ Member limit reached. Cannot add more members.</p>
                    )}
                    {institutionLimits?.can_add_member && (
                      <p className="text-xs text-primary">You can increase the limit up to {institutionLimits.current_members + institutionLimits.members_remaining} members.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Member Role</Label>
                  <Select
                    value={memberSettings.default_member_role}
                    onValueChange={(value) =>
                      setMemberSettings({
                        ...memberSettings,
                        default_member_role: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                      <SelectItem value="CONTENT_CREATOR">
                        Content Creator
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveAll} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Member Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_notifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        email_notifications: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.push_notifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        push_notifications: checked,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Notification Types
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={notificationSettings.member_joined}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          member_joined: checked,
                        })
                      }
                    />
                    <Label>New Member Joined</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={notificationSettings.course_published}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          course_published: checked,
                        })
                      }
                    />
                    <Label>Course Published</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={notificationSettings.enrollment_request}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          enrollment_request: checked,
                        })
                      }
                    />
                    <Label>Enrollment Requests</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={notificationSettings.weekly_report}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          weekly_report: checked,
                        })
                      }
                    />
                    <Label>Weekly Reports</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={notificationSettings.monthly_report}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          monthly_report: checked,
                        })
                      }
                    />
                    <Label>Monthly Reports</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveAll} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your administrator password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">
                Confirm New Password
              </Label>
              <Input id="confirm_password" type="password" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangePassword(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Password updated successfully!");
                setShowChangePassword(false);
              }}
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Two-Factor Setup Dialog */}
      <Dialog open={showTwoFactor} onOpenChange={setShowTwoFactor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Add an extra layer of security to your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-48 h-48 bg-muted mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Scan the QR code with your authenticator app
              </p>
            </div>
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input placeholder="Enter 6-digit code" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTwoFactor(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("2FA enabled successfully!");
                setShowTwoFactor(false);
              }}
            >
              Enable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save All Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="shadow-lg"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}