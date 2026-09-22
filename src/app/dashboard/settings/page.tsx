"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Palette, Save, Lock, ShieldCheck, KeyRound, Loader2, Sun, Moon, Monitor, Check, Bell } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface UserSettings {
  appearance: {
    theme: string
    language: string
  }
  security: {
    two_factor_enabled: boolean
    email: string
    last_password_change: string | null
  }
  profile: {
    first_name: string
    last_name: string
    email: string
    phone_number: string
    bio: string
    country: string
    city: string
    profile_picture_url: string
  }
}

export default function SettingsPage() {
  const { user, token, updateUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [settings, setSettings] = useState<UserSettings | null>(null)

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "en",
  })

  /*
   * Notification preferences (IS-001).
   *
   * The column always had room for these and nothing wrote to them, so this
   * tab is new but the storage is not. The server fills every missing key
   * from its defaults, so what arrives is always complete — a half-populated
   * object would render an unset preference as an off switch, which tells
   * someone they are unsubscribed from something they are still receiving.
   */
  const [notifications, setNotifications] = useState<Record<string, boolean>>({})
  const [savingNotifications, setSavingNotifications] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Password change
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  // Fetch user settings on mount
  useEffect(() => {
    fetchUserSettings()
  }, [])

  /**
   * Saves one toggle, optimistically.
   *
   * The switch moves immediately and is put back if the request fails. A
   * toggle that waits for a round trip before moving feels broken, and one
   * that moves and silently fails is worse — so the revert is explicit and
   * the failure is said out loud.
   */
  const saveNotification = async (key: string, value: boolean) => {
    const previous = notifications[key]
    setNotifications((prev) => ({ ...prev, [key]: value }))
    setSavingNotifications(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/settings/notifications`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Only the key that moved: the server merges, so sending the whole
        // object would overwrite anything changed in another tab meanwhile.
        body: JSON.stringify({ notifications: { [key]: value } }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message)

      setNotifications(data.data.notifications)
    } catch {
      setNotifications((prev) => ({ ...prev, [key]: previous }))
      toast.error("That preference could not be saved. Please try again.")
    } finally {
      setSavingNotifications(false)
    }
  }

  const fetchUserSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/auth/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success && data.data) {
        setSettings(data.data)
        const savedTheme = data.data.appearance.theme || "light"
        setAppearance({
          theme: savedTheme,
          language: data.data.appearance.language || "en",
        })
        setNotifications(data.data.notifications ?? {})
        // Apply saved theme to the app
        setTheme(savedTheme)
      } else {
        toast.error(data.message || "Failed to load settings")
      }
    } catch (error) {
      toast.error("Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAppearance = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/settings/appearance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          theme: appearance.theme,
          language: appearance.language,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Apply theme immediately
        setTheme(data.data.theme || appearance.theme)

        // Update local state
        if (settings) {
          setSettings({
            ...settings,
            appearance: {
              theme: data.data.theme,
              language: data.data.language,
            },
          })
        }

        // Update user in auth context
        updateUser({
          learning_preferences: {
            ...(user?.learning_preferences || {}),
            preferred_language: data.data.language,
          },
        })

        toast.success("Appearance settings updated successfully!")
      } else {
        toast.error(data.message || "Failed to update settings")
      }
    } catch (error) {
      toast.error("Failed to update settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle2FA = () => {
    setShow2FADialog(true)
  }

  const confirmToggle2FA = async () => {
    setIsSaving(true)
    try {
      const newValue = !settings?.security.two_factor_enabled

      const response = await fetch(`${API_BASE_URL}/auth/settings/two-factor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enable: newValue,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        if (settings) {
          setSettings({
            ...settings,
            security: {
              ...settings.security,
              two_factor_enabled: data.data.two_factor_enabled,
            },
          })
        }

        // Update user in auth context
        updateUser({
          learning_preferences: {
            ...(user?.learning_preferences || {}),
            two_factor_enabled: data.data.two_factor_enabled,
          },
        })

        toast.success(data.message || `2FA ${newValue ? "enabled" : "disabled"} successfully!`)
        setShow2FADialog(false)
      } else {
        toast.error(data.message || "Failed to update 2FA settings")
      }
    } catch (error) {
      toast.error("Failed to update 2FA settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error("All password fields are required")
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordData.new_password.length < 8) {
      toast.error("New password must be at least 8 characters long")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/settings/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Password changed successfully!")
        setShowPasswordDialog(false)
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        })

        // Update settings to reflect last password change
        if (settings) {
          setSettings({
            ...settings,
            security: {
              ...settings.security,
              last_password_change: new Date().toISOString(),
            },
          })
        }
      } else {
        toast.error(data.message || "Failed to change password")
      }
    } catch (error) {
      toast.error("Failed to change password")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance Settings
              </CardTitle>
              <CardDescription>Customize the look and feel of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: "light",
                      label: "Light",
                      icon: Sun,
                      preview: "bg-card border-border",
                      previewContent: "bg-muted",
                    },
                    {
                      value: "dark",
                      label: "Dark",
                      icon: Moon,
                      preview: "bg-zinc-900 border-zinc-700",
                      previewContent: "bg-zinc-800",
                    },
                    {
                      value: "system",
                      label: "System",
                      icon: Monitor,
                      preview: "bg-gradient-to-br from-white to-zinc-900 border-border",
                      previewContent: "bg-gradient-to-br from-gray-100 to-zinc-800",
                    },
                  ].map(({ value, label, icon: Icon, preview, previewContent }) => {
                    const isSelected = mounted ? appearance.theme === value : false
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          setAppearance({ ...appearance, theme: value })
                          setTheme(value)
                        }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-accent"
                        )}
                      >
                        {/* Mini preview */}
                        <div className={cn("w-full h-10 rounded-md border overflow-hidden", preview)}>
                          <div className={cn("h-3 w-3/4 rounded m-1.5", previewContent)} />
                          <div className={cn("h-2 w-1/2 rounded ml-1.5 mb-1", previewContent, "opacity-60")} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{label}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Choose your preferred color theme. Changes apply immediately.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={appearance.language}
                  onValueChange={(value) => setAppearance({ ...appearance, language: value })}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="rw">Kinyarwanda</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Select your preferred language</p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleSaveAppearance} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        {/*
          Notification preferences (IS-001). Saved per toggle rather than
          behind a "Save" button: each one is independent, and a settings
          screen that can be left with unsaved changes is a screen people
          leave with unsaved changes.
        */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Choose what you want to be told about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">How you are reached</p>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-email_notifications" className="text-sm">Email</Label>
                    <p className="text-[12px] text-muted-foreground">Send notifications to your email address</p>
                  </div>
                  <Switch
                    id="notify-email_notifications"
                    checked={notifications.email_notifications ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("email_notifications", v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-push_notifications" className="text-sm">In-app</Label>
                    <p className="text-[12px] text-muted-foreground">Show notifications inside the dashboard</p>
                  </div>
                  <Switch
                    id="notify-push_notifications"
                    checked={notifications.push_notifications ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("push_notifications", v)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your courses</p>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-course_updates" className="text-sm">Course updates</Label>
                    <p className="text-[12px] text-muted-foreground">Changes to courses you teach or are enrolled in</p>
                  </div>
                  <Switch
                    id="notify-course_updates"
                    checked={notifications.course_updates ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("course_updates", v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-new_enrollments" className="text-sm">New enrolments</Label>
                    <p className="text-[12px] text-muted-foreground">When someone enrols in a course you teach</p>
                  </div>
                  <Switch
                    id="notify-new_enrollments"
                    checked={notifications.new_enrollments ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("new_enrollments", v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-enrollment_requests" className="text-sm">Enrolment requests</Label>
                    <p className="text-[12px] text-muted-foreground">When someone asks to join a course you manage</p>
                  </div>
                  <Switch
                    id="notify-enrollment_requests"
                    checked={notifications.enrollment_requests ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("enrollment_requests", v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-assessment_submissions" className="text-sm">Assessment submissions</Label>
                    <p className="text-[12px] text-muted-foreground">When work is submitted for marking</p>
                  </div>
                  <Switch
                    id="notify-assessment_submissions"
                    checked={notifications.assessment_submissions ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("assessment_submissions", v)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">People</p>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-direct_messages" className="text-sm">Direct messages</Label>
                    <p className="text-[12px] text-muted-foreground">When someone messages you</p>
                  </div>
                  <Switch
                    id="notify-direct_messages"
                    checked={notifications.direct_messages ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("direct_messages", v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-mentions" className="text-sm">Mentions</Label>
                    <p className="text-[12px] text-muted-foreground">When you are mentioned in a discussion</p>
                  </div>
                  <Switch
                    id="notify-mentions"
                    checked={notifications.mentions ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("mentions", v)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Everything else</p>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-announcements" className="text-sm">Announcements</Label>
                    <p className="text-[12px] text-muted-foreground">Platform and institution announcements</p>
                  </div>
                  <Switch
                    id="notify-announcements"
                    checked={notifications.announcements ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("announcements", v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-weekly_summary" className="text-sm">Weekly summary</Label>
                    <p className="text-[12px] text-muted-foreground">A digest of activity each week</p>
                  </div>
                  <Switch
                    id="notify-weekly_summary"
                    checked={notifications.weekly_summary ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("weekly_summary", v)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="notify-marketing_emails" className="text-sm">Product news</Label>
                    <p className="text-[12px] text-muted-foreground">Occasional news about new features</p>
                  </div>
                  <Switch
                    id="notify-marketing_emails"
                    checked={notifications.marketing_emails ?? false}
                    disabled={savingNotifications}
                    onCheckedChange={(v) => saveNotification("marketing_emails", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Manage your password and security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 2FA Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add an extra layer of security to your account by requiring a verification code in addition to
                        your password when signing in.
                      </p>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleToggle2FA}
                          disabled={isSaving}
                          variant={settings?.security.two_factor_enabled ? "destructive" : "default"}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Lock className="w-4 h-4 mr-2" />
                          )}
                          {settings?.security.two_factor_enabled ? "Disable 2FA" : "Enable 2FA"}
                        </Button>
                        {settings?.security.two_factor_enabled && (
                          <div className="flex items-center gap-2 text-sm text-success dark:text-success">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="font-medium">Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <KeyRound className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Password</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Update your password regularly to keep your account secure. Use a strong password with a mix of
                        letters, numbers, and symbols.
                      </p>
                      {settings?.security.last_password_change && (
                        <p className="text-xs text-muted-foreground mb-4">
                          Last changed:{" "}
                          {new Date(settings.security.last_password_change).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      )}
                      <Button onClick={() => setShowPasswordDialog(true)} variant="outline">
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 2FA Confirmation Dialog */}
      <AlertDialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {settings?.security.two_factor_enabled
                ? "Disable Two-Factor Authentication?"
                : "Enable Two-Factor Authentication?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {settings?.security.two_factor_enabled
                ? "Disabling 2FA will make your account less secure. You will only need your password to sign in."
                : "Enabling 2FA will add an extra layer of security to your account. You will need to enter a verification code sent to your email when signing in."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle2FA} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : settings?.security.two_factor_enabled ? (
                "Disable 2FA"
              ) : (
                "Enable 2FA"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        {/* Matched to the shared confirm width so it lines up with every other
            confirmation surface (AXM-CONS-001 M-01). */}
        <AlertDialogContent className="w-[min(94vw,28rem)] max-w-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and choose a new strong password.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    current_password: e.target.value,
                  })
                }
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    new_password: e.target.value,
                  })
                }
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirm_password: e.target.value,
                  })
                }
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSaving}
              onClick={() => {
                setPasswordData({
                  current_password: "",
                  new_password: "",
                  confirm_password: "",
                })
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePassword} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}