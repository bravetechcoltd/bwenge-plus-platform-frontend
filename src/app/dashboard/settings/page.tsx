"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Palette, Save, Lock, ShieldCheck, KeyRound, Loader2, Sun, Moon, Monitor, Check } from "lucide-react"
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
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
        <AlertDialogContent className="max-w-md">
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