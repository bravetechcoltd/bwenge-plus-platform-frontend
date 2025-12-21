"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchInstitutionById,
  updateInstitution,
  replaceInstitutionAdmin,
  removeMemberFromInstitution,
  updateMemberRole,
} from "@/lib/features/institutions/institutionSlice";
import {
  Building2,
  Users,
  BookOpen,
  FolderTree,
  Phone,
  Globe,
  Settings,
  Edit,
  Loader2,
  RefreshCw,
  UserCog,
  Shield,
  CheckCircle2,
  XCircle,
  Award,
  Plus,
  Trash2,
  Eye,
  MoreVertical,
  Search,
  Upload,
  Bell,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import AddMemberDialog from "@/components/institutions/AddMemberDialog";

enum InstitutionMemberRole {
  ADMIN = "ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  MEMBER = "MEMBER",
}

interface InstitutionMember {
  member_id: string;
  role: InstitutionMemberRole;
  is_active: boolean;
  joined_at: string;
  additional_permissions?: any;
  user: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    profile_picture_url?: string;
    bio?: string;
    account_type: string;
    bwenge_role: string;
    institution_role?: string;
    is_verified: boolean;
    is_active: boolean;
    date_joined: string;
    last_login?: string;
    country?: string;
    city?: string;
  };
}

interface Institution {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  settings: {
    allow_public_courses?: boolean;
    require_approval_for_spoc?: boolean;
    max_instructors?: number;
    custom_branding?: any;
  };
  created_at: string;
  updated_at: string;
  memberCount?: number;
  courseCount?: number;
  categoryCount?: number;
  admin?: InstitutionMember;
  members?: InstitutionMember[];
  statistics?: {
    members: number;
    courses: {
      total: number;
      by_type: any[];
      by_status: any[];
      by_level: any[];
      total_enrollments: any;
      total_rating: any;
      total_duration: any;
      total_lessons: any;
    };
    categories: number;
    instructors: number | { count: string };
    active_learners: number | { count: string };
  };
}

const getStatValue = (stat: any): number => {
  if (typeof stat === "number") return stat;
  if (stat && typeof stat === "object" && "count" in stat) {
    const count = stat.count;
    if (typeof count === "string") {
      const parsed = parseInt(count, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof count === "number") return count;
  }
  return 0;
};

export default function InstitutionProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  const { user: authUser, isLoading: authLoading } = useAppSelector(
    (state) => state.bwengeAuth
  );
  const { selectedInstitution, isLoading } = useAppSelector(
    (state) => state.institutions
  );

  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "settings" | "activity"
  >("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    settings: {
      allow_public_courses: true,
      require_approval_for_spoc: false,
      max_instructors: 10,
    },
  });

  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] =
    useState<InstitutionMember | null>(null);

  // ─── KEY FIX ──────────────────────────────────────────────────────────────
  // Read the ?institution= param from the URL first, then fall back to the
  // value stored in the Redux user object (set on login / hydrated from
  // cookies).  Without this the page would always get `undefined` on the very
  // first render before any async thunk had a chance to run.
  const urlInstitutionId = searchParams.get("institution");
  const institutionId =
    urlInstitutionId ||
    authUser?.primary_institution_id ||
    undefined;

  // Access check: user must be an institution member AND an ADMIN AND the
  // requested institution must be one they belong to.
  const hasAccess = useMemo(() => {
    if (authLoading || !authUser) return false;
    if (!authUser.is_institution_member) return false;
    if (!institutionId) return false;
    // Accept if institutionId matches primary or any institution in the list
    const userInstIds: string[] = authUser.institution_ids ?? [];
    const belongsToInstitution =
      userInstIds.includes(institutionId) ||
      authUser.primary_institution_id === institutionId;
    if (!belongsToInstitution) return false;
    if (authUser.institution_role !== "ADMIN") return false;
    return true;
  }, [authLoading, authUser, institutionId]);

  // Prefer the full institution object stored on the user (comes from login
  // response) so the page works immediately without an extra API call.
  const institution = useMemo(() => {
    // If the stored institution matches the requested ID use it directly
    if (authUser?.institution && institutionId) {
      if (authUser.institution.id === institutionId) {
        return authUser.institution;
      }
    }
    // Fall back to Redux institutions slice
    if (selectedInstitution && institutionId) {
      if ((selectedInstitution as any).id === institutionId) {
        return selectedInstitution;
      }
    }
    // Last resort: whatever is available
    return authUser?.institution || selectedInstitution || null;
  }, [authUser?.institution, selectedInstitution, institutionId]);

  // Fetch full institution details (members, stats, etc.) once we know the ID
  // and the user has access.  Skip the call when the user object already
  // carries all institution data (avoids an unnecessary round-trip on login).
  useEffect(() => {
    if (institutionId && hasAccess) {
      dispatch(fetchInstitutionById(institutionId));
    }
  }, [dispatch, institutionId, hasAccess]);

  useEffect(() => {
    if (institution && !isEditing) {
      setFormData({
        name: institution.name,
        description: institution.description || "",
        settings: {
          allow_public_courses:
            institution.settings?.allow_public_courses ?? true,
          require_approval_for_spoc:
            institution.settings?.require_approval_for_spoc ?? false,
          max_instructors: institution.settings?.max_instructors ?? 10,
        },
      });

      if (institution.logo_url && !logoFile) {
        setLogoPreview(institution.logo_url);
      }
    }
  }, [
    institution?.id,
    institution?.name,
    institution?.description,
    institution?.settings?.allow_public_courses,
    institution?.settings?.require_approval_for_spoc,
    institution?.settings?.max_instructors,
    institution?.logo_url,
    isEditing,
    logoFile,
  ]);

  const handleRefresh = () => {
    if (institutionId && hasAccess) {
      dispatch(fetchInstitutionById(institutionId));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSave = async () => {
    if (!institutionId || !hasAccess) {
      toast.error("You don't have permission to edit this institution");
      return;
    }

    setIsSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("description", formData.description.trim());
      formDataToSend.append("settings", JSON.stringify(formData.settings));

      if (logoFile) {
        formDataToSend.append("logoFile", logoFile);
      }

      await dispatch(
        updateInstitution({
          id: institutionId,
          formData: formDataToSend,
        })
      ).unwrap();

      toast.success("Institution updated successfully!");
      setIsEditing(false);
      handleRefresh();
    } catch (error: any) {
      toast.error(error || "Failed to update institution");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!institutionId || !hasAccess) return;

    if (confirm("Are you sure you want to remove this member?")) {
      try {
        await dispatch(
          removeMemberFromInstitution({
            id: institutionId,
            userId: memberId,
          })
        ).unwrap();

        toast.success("Member removed successfully!");
        handleRefresh();
      } catch (error: any) {
        toast.error(error || "Failed to remove member");
      }
    }
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    role: InstitutionMemberRole
  ) => {
    if (!institutionId || !hasAccess) return;

    try {
      await dispatch(
        updateMemberRole({
          id: institutionId,
          userId: memberId,
          role,
        })
      ).unwrap();

      toast.success("Member role updated successfully!");
      handleRefresh();
    } catch (error: any) {
      toast.error(error || "Failed to update member role");
    }
  };

  const handleReplaceAdmin = async (adminData: {
    new_admin_email: string;
    new_admin_first_name: string;
    new_admin_last_name: string;
    new_admin_phone?: string;
    new_admin_username?: string;
  }) => {
    if (!institutionId || !hasAccess) return;

    try {
      await dispatch(
        replaceInstitutionAdmin({
          id: institutionId,
          adminData,
        })
      ).unwrap();

      toast.success("Admin replaced successfully!");
      handleRefresh();
    } catch (error: any) {
      toast.error(error || "Failed to replace admin");
    }
  };

  const filteredMembers = selectedInstitution?.members?.filter((member) => {
    const searchTerm = memberSearch.toLowerCase();
    return (
      member.user.email.toLowerCase().includes(searchTerm) ||
      member.user.first_name.toLowerCase().includes(searchTerm) ||
      member.user.last_name.toLowerCase().includes(searchTerm) ||
      member.role.toLowerCase().includes(searchTerm)
    );
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-700";
      case "CONTENT_CREATOR":
        return "bg-blue-100 text-blue-700";
      case "INSTRUCTOR":
        return "bg-green-100 text-green-700";
      case "MEMBER":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Show spinner only while auth is genuinely loading AND we have no data yet
  const isPageLoading = authLoading && !authUser;

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error states only when we are certain the user is loaded
  if (!authLoading && (!hasAccess || !institution)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              {!hasAccess ? "Access Denied" : "Institution Not Found"}
            </h2>
            <p className="text-gray-500 mb-6">
              {!hasAccess
                ? "You don't have admin access to this institution."
                : "You don't have access to any institution or the institution doesn't exist."}
            </p>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard: institution must be truthy from here on
  if (!institution) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt={institution.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            {isEditing && (
              <div className="absolute -bottom-2 -right-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 rounded-full"
                  onClick={() =>
                    document.getElementById("logo-upload")?.click()
                  }
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {institution.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {institution.type.replace(/_/g, " ").toLowerCase()}
              </Badge>
              {institution.is_active ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Inactive
                </Badge>
              )}
              <Badge
                className={getRoleColor(
                  authUser?.institution_role || "ADMIN"
                )}
              >
                {authUser?.institution_role}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setLogoFile(null);
                  setLogoPreview(institution.logo_url || null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
      >
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="overview">
            <Building2 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
            <Badge variant="secondary" className="ml-2">
              {selectedInstitution?.memberCount || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Bell className="w-4 h-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Institution Information</CardTitle>
                  <CardDescription>
                    Basic details about your institution
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Institution Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter institution name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Describe your institution..."
                          rows={4}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm text-gray-500">
                          Description
                        </Label>
                        <p className="mt-1 text-gray-700">
                          {institution.description ||
                            "No description provided"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500">
                            Type
                          </Label>
                          <p className="mt-1 capitalize">
                            {institution.type.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                  <CardDescription>
                    Key metrics for your institution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-primary/5 rounded-lg p-4 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">
                        {selectedInstitution?.memberCount || 0}
                      </p>
                      <p className="text-sm text-gray-500">Members</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-4 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">
                        {selectedInstitution?.courseCount || 0}
                      </p>
                      <p className="text-sm text-gray-500">Courses</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-4 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <FolderTree className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">
                        {selectedInstitution?.categoryCount || 0}
                      </p>
                      <p className="text-sm text-gray-500">Categories</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-4 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Award className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">
                        {getStatValue(
                          selectedInstitution?.statistics?.active_learners
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        Active Learners
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-primary" />
                      Your Role
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <UserCog className="w-4 h-4 mr-2" />
                          Replace Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Replace Administrator</DialogTitle>
                          <DialogDescription>
                            Assign a new administrator for this institution.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>New Admin Email</Label>
                            <Input placeholder="admin@example.com" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>First Name</Label>
                              <Input placeholder="John" />
                            </div>
                            <div className="space-y-2">
                              <Label>Last Name</Label>
                              <Input placeholder="Doe" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Phone (Optional)</Label>
                            <Input placeholder="+1234567890" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() =>
                              handleReplaceAdmin({
                                new_admin_email: "new@example.com",
                                new_admin_first_name: "John",
                                new_admin_last_name: "Doe",
                              })
                            }
                          >
                            Replace Admin
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {authUser && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={
                              authUser.profile_picture_url || undefined
                            }
                            alt={authUser.first_name}
                          />
                          <AvatarFallback>
                            {authUser.first_name?.[0]}
                            {authUser.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {authUser.first_name} {authUser.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {authUser.email}
                          </p>
                          <Badge
                            className={getRoleColor(
                              authUser.institution_role || "ADMIN"
                            )}
                          >
                            {authUser.institution_role}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {authUser.phone_number || "No phone"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {authUser.country || "No country specified"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link
                      href={`/dashboard/institution-admin/${institutionId}/courses`}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Manage Courses
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link
                      href={`/dashboard/institution-admin/${institutionId}/categories`}
                    >
                      <FolderTree className="w-4 h-4 mr-2" />
                      Manage Categories
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link
                      href={`/dashboard/institution-admin/${institutionId}/dashboard`}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      View Analytics
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Institution Members</CardTitle>
                  <CardDescription>
                    Manage members and their roles in your institution
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-9 w-full md:w-64"
                    />
                  </div>
                  <Button onClick={() => setShowAddMemberDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMembers && filteredMembers.length > 0 ? (
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead className="text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.member_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage
                                  src={
                                    member.user.profile_picture_url
                                  }
                                  alt={member.user.first_name}
                                />
                                <AvatarFallback>
                                  {member.user.first_name?.[0]}
                                  {member.user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {member.user.first_name}{" "}
                                  {member.user.last_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {member.user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getRoleColor(member.role)}
                            >
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.is_active ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200"
                              >
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              member.joined_at
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                  Actions
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setSelectedMember(member)
                                  }
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateMemberRole(
                                      member.user.id,
                                      InstitutionMemberRole.INSTRUCTOR
                                    )
                                  }
                                >
                                  Make Instructor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateMemberRole(
                                      member.user.id,
                                      InstitutionMemberRole.CONTENT_CREATOR
                                    )
                                  }
                                >
                                  Make Content Creator
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateMemberRole(
                                      member.user.id,
                                      InstitutionMemberRole.ADMIN
                                    )
                                  }
                                >
                                  Make Admin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() =>
                                    handleRemoveMember(member.user.id)
                                  }
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No Members Found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {memberSearch
                      ? "Try a different search term"
                      : "Add your first member to get started"}
                  </p>
                  <Button onClick={() => setShowAddMemberDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Institution Settings</CardTitle>
              <CardDescription>
                Configure your institution's preferences and rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Course Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Public Courses</Label>
                      <p className="text-sm text-gray-500">
                        Allow instructors to create public courses
                      </p>
                    </div>
                    <Switch
                      checked={formData.settings.allow_public_courses}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            allow_public_courses: checked,
                          },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require SPOC Approval</Label>
                      <p className="text-sm text-gray-500">
                        Require approval for SPOC course enrollments
                      </p>
                    </div>
                    <Switch
                      checked={
                        formData.settings.require_approval_for_spoc
                      }
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            require_approval_for_spoc: checked,
                          },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_instructors">
                      Maximum Instructors
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="max_instructors"
                        type="number"
                        min="1"
                        value={formData.settings.max_instructors}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              max_instructors:
                                parseInt(e.target.value) || 10,
                            },
                          })
                        }
                        disabled={!isEditing}
                        className="w-32"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Maximum number of instructors allowed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Branding</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Institution Logo</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {logoPreview ? (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                          {isEditing && (
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                              onClick={removeLogo}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {isEditing && (
                        <div>
                          <Label
                            htmlFor="logo-upload-settings"
                            className="cursor-pointer"
                          >
                            <Button variant="outline" asChild>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Logo
                              </span>
                            </Button>
                          </Label>
                          <input
                            id="logo-upload-settings"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            PNG, JPG or WEBP. Max 5MB.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600">
                  Danger Zone
                </h3>
                <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-red-700">
                        {institution.is_active ? "Deactivate" : "Activate"}{" "}
                        Institution
                      </h4>
                      <p className="text-sm text-red-600">
                        {institution.is_active
                          ? "Temporarily disable the institution"
                          : "Reactivate the institution"}
                      </p>
                    </div>
                    <Button
                      variant={
                        institution.is_active ? "destructive" : "default"
                      }
                      onClick={() => {
                        // Implement toggle status
                      }}
                    >
                      {institution.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>

                  <Separator className="bg-red-200" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-red-700">
                        Transfer Ownership
                      </h4>
                      <p className="text-sm text-red-600">
                        Transfer institution ownership to another admin
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-700"
                        >
                          Transfer
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Transfer Institution Ownership
                          </DialogTitle>
                          <DialogDescription>
                            This will transfer all administrative privileges
                            to another user.
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Track recent changes and activities in your institution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No Recent Activity
                  </h3>
                  <p className="text-gray-500">
                    Activity tracking will appear here as members interact
                    with your institution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Details Dialog */}
      {selectedMember && (
        <Dialog
          open={!!selectedMember}
          onOpenChange={() => setSelectedMember(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Member Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={selectedMember.user.profile_picture_url}
                    alt={selectedMember.user.first_name}
                  />
                  <AvatarFallback>
                    {selectedMember.user.first_name?.[0]}
                    {selectedMember.user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedMember.user.first_name}{" "}
                    {selectedMember.user.last_name}
                  </h3>
                  <p className="text-gray-500">
                    {selectedMember.user.email}
                  </p>
                  <Badge className={getRoleColor(selectedMember.role)}>
                    {selectedMember.role}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Account Type</Label>
                  <p>{selectedMember.user.account_type}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Platform Role</Label>
                  <p>{selectedMember.user.bwenge_role}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Joined Date</Label>
                  <p>
                    {new Date(
                      selectedMember.joined_at
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Last Login</Label>
                  <p>
                    {selectedMember.user.last_login
                      ? new Date(
                          selectedMember.user.last_login
                        ).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-500">Bio</Label>
                  <p>
                    {selectedMember.user.bio || "No bio provided"}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedMember(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        institutionId={institutionId || ""}
      />
    </div>
  );
}