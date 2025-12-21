"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { logoutBwenge, validateProtectionStatus, manualSyncCrossSystemData } from "@/lib/features/auth/auth-slice"
import {
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  FileText,
  BarChart3,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  Shield,
  UserPlus,
  Download,
  Upload,
  Key,
  Layers,
  Target,
  Award,
  MessageSquare,
  Folder,
  FileQuestion,
  Calendar,
  TrendingUp,
  CreditCard,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Copy,
  Users2,
  Bookmark,
  Star,
  Clock,
  Zap,
  Globe,
  Lock,
  Unlock,
  Settings2,
  UserCog,
  UploadCloud,
  DownloadCloud,
  BookCheck,
  BookX,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  HelpCircle,
  Cog,
  Boxes,
  Wallet,
  Sparkles,
  Server,
  BanknoteIcon,
  Cpu,
  Network,
  Database,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Cookies from "js-cookie"

// ==================== ENUMS ====================
export enum BwengeRole {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  LEARNER = "LEARNER",
}

export enum SystemType {
  BWENGEPLUS = "BWENGEPLUS",
  ONGERA = "ONGERA",
}

// ==================== STORAGE HELPERS ====================
const safeGetLocalStorage = (key: string, defaultValue: string = ""): string => {
  if (typeof window === 'undefined') return defaultValue
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

const safeGetLocalStorageJSON = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : defaultValue
  } catch {
    return defaultValue
  }
}

const safeSetLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Failed to set localStorage for key: ${key}`, error)
  }
}



const safeSetLocalStorageJSON = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to set localStorage for key: ${key}`, error)
  }
}

// ==================== USER VALIDATION ====================
const validateUserFromAllSources = () => {
  console.log("🔍 [VALIDATION] Validating user from all sources...")
  
  // 1. Check Redux store first (most reliable)
  let reduxUser = null
  try {
    // We'll get this from the hook in the component
  } catch (e) {
    console.warn("⚠️ [VALIDATION] Cannot access Redux directly in helper")
  }
  
  // 2. Check cookies
  let cookieUser = null
  const userCookie = Cookies.get("bwenge_user")
  if (userCookie) {
    try {
      cookieUser = JSON.parse(userCookie)
      console.log("✅ [VALIDATION] Found user in cookies:", cookieUser?.bwenge_role)
    } catch (e) {
      console.error("❌ [VALIDATION] Failed to parse cookie user:", e)
    }
  }
  
  // 3. Check localStorage
  let localStorageUser = null
  const localUserStr = safeGetLocalStorage("bwengeplus_user")
  if (localUserStr) {
    try {
      localStorageUser = JSON.parse(localUserStr)
      console.log("✅ [VALIDATION] Found user in localStorage:", localStorageUser?.bwenge_role)
    } catch (e) {
      console.error("❌ [VALIDATION] Failed to parse localStorage user:", e)
    }
  }
  
  // 4. Check cross-system context
  const crossSystemContext = safeGetLocalStorageJSON("cross_system_context", null)
  if (crossSystemContext) {
    console.log("✅ [VALIDATION] Found cross-system context:", crossSystemContext)
  }
  
  return {
    cookieUser,
    localStorageUser,
    crossSystemContext
  }
}

interface UserLike {
  bwenge_role?: string
}

interface CrossSystemContext {
  bwenge_role?: string
  primary_institution_id?: string
  institution_ids?: string[]
  institution_role?: string
  system?: string
}

const determineActualRole = (reduxUser: unknown, cookieUser: unknown, localStorageUser: unknown): string => {
  // Priority: Redux > Cookies > localStorage > cross-system context
  
  if (reduxUser && typeof reduxUser === 'object' && 'bwenge_role' in reduxUser) {
    const role = (reduxUser as UserLike).bwenge_role
    if (role) {
      console.log("🎯 [ROLE] Using Redux role:", role)
      return role
    }
  }
  
  if (cookieUser && typeof cookieUser === 'object' && 'bwenge_role' in cookieUser) {
    const role = (cookieUser as UserLike).bwenge_role
    if (role) {
      console.log("🎯 [ROLE] Using cookie role:", role)
      return role
    }
  }
  
  if (localStorageUser && typeof localStorageUser === 'object' && 'bwenge_role' in localStorageUser) {
    const role = (localStorageUser as UserLike).bwenge_role
    if (role) {
      console.log("🎯 [ROLE] Using localStorage role:", role)
      return role
    }
  }
  
  // Check cross-system context
  const crossSystemContext = safeGetLocalStorageJSON<CrossSystemContext | null>("cross_system_context", null)
  if (crossSystemContext?.bwenge_role) {
    console.log("🎯 [ROLE] Using cross-system context role:", crossSystemContext.bwenge_role)
    return crossSystemContext.bwenge_role
  }
  
  console.log("⚠️ [ROLE] No role found, defaulting to LEARNER")
  return "LEARNER"
}

// ==================== SIDEBAR CONFIGURATION ====================
const getSidebarConfig = (role: string, institutionId?: string, user?: { primary_institution_id?: string }) => {
  const baseItems = {
    INSTITUTION_ADMIN: [
      {
        title: "Dashboard",
        href: "/dashboard/institution-admin",
        icon: Home,
        exact: true
      },
      {
        title: "Institution Management",
        icon: Building2,
        subItems: [
          {
            title: "Institution Profile",
            href: `/dashboard/institution-admin/institution/profile?institution=${user?.primary_institution_id || institutionId}`,
            icon: Building2
          },
          {
            title: "Settings",
            href: `/dashboard/institution-admin/institution/settings?institution=${user?.primary_institution_id || institutionId}`,
            icon: Settings
          }
        ]
      },
      {
        title: "User Management",
        icon: Users,
        subItems: [
          {
            title: "All Members",
            href: "/dashboard/institution-admin/users/members",
            icon: Users
          },
          {
            title: "Instructors",
            href: "/dashboard/institution-admin/users/instructors",
            icon: UserCog,
            action: "invite_instructor"
          },
          {
            title: "Content Creators",
            href: "/dashboard/institution-admin/users/content-creators",
            icon: Users2,
            action: "promote_content_creator"
          },
          {
            title: "Students",
            href: "/dashboard/institution-admin/users/students",
            icon: GraduationCap
          },
          {
            title: "Invite Users",
            href: "/dashboard/institution-admin/users/invite",
            icon: UserPlus,
            action: "invite_users"
          },
          {
            title: "Bulk Import",
            href: "/dashboard/institution-admin/users/bulk-import",
            icon: UploadCloud,
            action: "bulk_enroll"
          },
        ]
      },
      {
        title: "Course Management",
        icon: BookOpen,
        subItems: [
          {
            title: "Create Course",
            href: `/dashboard/institution-admin/${user?.primary_institution_id || institutionId}/courses/create`,
            icon: PlusCircle,
            action: "create_spoc_course"
          },
          {
            title: "All Courses",
            href: `/dashboard/institution-admin/${user?.primary_institution_id || institutionId}/courses`,
            icon: BookOpen
          },
          {
            title: "Course Categories",
            href: `/dashboard/institution-admin/${user?.primary_institution_id || institutionId}/courses/categories`,
            icon: Layers
          },
          {
            title: "Assign Instructors",
            href: `/dashboard/institution-admin/${user?.primary_institution_id || institutionId}/courses/assign-instructors`,
            icon: UserCog,
            action: "assign_instructors"
          },
          {
            title: "Course Analytics",
            href: `/dashboard/institution-admin/${user?.primary_institution_id || institutionId}/courses/analytics`,
            icon: BarChart3
          },
        ]
      },
      {
        title: "Enrollment Management",
        icon: Users,
        subItems: [
          {
            title: "Enrollment Requests",
            href: "/dashboard/institution-admin/enrollment/requests",
            icon: Clock,
            badge: "pending"
          },
          {
            title: "Bulk Enrollment",
            href: "/dashboard/institution-admin/enrollment/bulk",
            icon: Upload,
            action: "bulk_enroll"
          },
          {
            title: "Enrollment Analytics",
            href: "/dashboard/institution-admin/enrollment/analytics",
            icon: TrendingUp
          },
          {
            title: "Export Enrollment",
            href: "/dashboard/institution-admin/enrollment/export",
            icon: Download
          },
        ]
      },
      {
        title: "Reports & Analytics",
        icon: BarChart3,
        subItems: [
          {
            title: "Platform Usage",
            href: "/dashboard/institution-admin/reports/usage",
            icon: Activity
          },
          {
            title: "Course Performance",
            href: "/dashboard/institution-admin/reports/course-performance",
            icon: TrendingUp
          }
        ]
      }
    ],
    CONTENT_CREATOR: [
      {
        title: "Dashboard",
        href: "/dashboard/content-creator",
        icon: Home,
        exact: true
      },
      {
        title: "My Courses",
        icon: BookOpen,
        subItems: [
          {
            title: "All Courses",
            href: "/dashboard/content-creator/courses",
            icon: BookOpen
          },
          {
            title: "Create Course",
            href: "/dashboard/content-creator/courses/create",
            icon: PlusCircle,
            action: "create_spoc_course"
          },
          {
            title: "Drafts",
            href: "/dashboard/content-creator/courses/drafts",
            icon: FileText
          },
          {
            title: "Published",
            href: "/dashboard/content-creator/courses/published",
            icon: BookCheck
          },
          {
            title: "Archived",
            href: "/dashboard/content-creator/courses/archived",
            icon: BookX
          },
        ]
      },
      {
        title: "Course Builder",
        icon: Edit,
        subItems: [
          {
            title: "Modules & Lessons",
            href: "/dashboard/content-creator/builder/modules",
            icon: Layers
          },
          {
            title: "Content Library",
            href: "/dashboard/content-creator/builder/content",
            icon: Folder
          },
          {
            title: "Assessments",
            href: "/dashboard/content-creator/builder/assessments",
            icon: FileQuestion
          },
          {
            title: "Certificates",
            href: "/dashboard/content-creator/builder/certificates",
            icon: Award
          },
          {
            title: "Course Settings",
            href: "/dashboard/content-creator/builder/settings",
            icon: Settings
          },
        ]
      },
      {
        title: "Instructor Management",
        icon: Users,
        subItems: [
          {
            title: "Co-Instructors",
            href: "/dashboard/content-creator/instructors",
            icon: UserCog,
            action: "invite_co_instructor"
          },
          {
            title: "Teaching Assistants",
            href: "/dashboard/content-creator/instructors/tas",
            icon: Users2
          },
          {
            title: "Permissions",
            href: "/dashboard/content-creator/instructors/permissions",
            icon: Shield
          },
        ]
      },
      {
        title: "Student Management",
        icon: GraduationCap,
        subItems: [
          {
            title: "Enrolled Students",
            href: "/dashboard/content-creator/students",
            icon: Users
          },
          {
            title: "Grading Assessments",
            href: "/dashboard/content-creator/students/grading",
            icon: CheckCircle
          },
          {
            title: "Feedback",
            href: "/dashboard/content-creator/students/feedback",
            icon: MessageSquare
          },
          {
            title: "Progress Tracking",
            href: "/dashboard/content-creator/students/progress",
            icon: TrendingUp
          },
          {
            title: "Certificate Issuance",
            href: "/dashboard/content-creator/students/certificates",
            icon: Award,
            action: "issue_certificates"
          },
        ]
      },
      {
        title: "Analytics",
        icon: BarChart3,
        subItems: [
          {
            title: "Course Analytics",
            href: "/dashboard/content-creator/analytics/course",
            icon: PieChart
          },
          {
            title: "Student Analytics",
            href: "/dashboard/content-creator/analytics/students",
            icon: LineChart
          },
          {
            title: "Engagement",
            href: "/dashboard/content-creator/analytics/engagement",
            icon: Activity
          },
          {
            title: "Completion Rates",
            href: "/dashboard/content-creator/analytics/completion",
            icon: BarChart
          },
        ]
      }
    ],
    INSTRUCTOR: [
      {
        title: "Dashboard",
        href: "/dashboard/instructor",
        icon: Home,
        exact: true
      },
      {
        title: "My Courses",
        icon: BookOpen,
        subItems: [
          {
            title: "Assigned Courses",
            href: "/dashboard/instructor/courses",
            icon: BookOpen
          },
          {
            title: "Create Course",
            href: "/dashboard/instructor/courses/create",
            icon: PlusCircle
          },
          {
            title: "Teaching Schedule",
            href: "/dashboard/instructor/courses/schedule",
            icon: Calendar
          },
          {
            title: "Course Materials",
            href: "/dashboard/instructor/courses/materials",
            icon: Folder
          },
        ]
      },
      {
        title: "Student Management",
        icon: GraduationCap,
        subItems: [
          {
            title: "My Students",
            href: "/dashboard/instructor/students",
            icon: Users
          },
          {
            title: "Grading Assessment",
            href: "/dashboard/instructor/assessments",
            icon: CheckCircle,
            action: "grade_assignments"
          }
        ]
      },
       {
            title: "Messages",
            href: "/dashboard/instructor/students/messages",
            icon: MessageSquare,
            action: "provide_feedback"
          },
      {
        title: "Analytics",
        icon: BarChart3,
        href: "/dashboard/instructor/analytics"
      },
    ],
    LEARNER: [
      {
        title: "Dashboard",
        href: "/dashboard/learner",
        icon: Home,
        exact: true
      },
      {
        title: "My Learning",
        icon: BookOpen,
        subItems: [
          {
            title: "My Courses",
            href: "/dashboard/learner/learning/courses",
            icon: BookOpen
          },
          {
            title: "All Courses",
            href: "/dashboard/learner/browse/all",
            icon: Globe
          },
          {
            title: "Progress",
            href: "/dashboard/learner/learning/progress",
            icon: TrendingUp
          },
          {
            title: "Completed",
            href: "/dashboard/learner/learning/completed",
            icon: CheckCircle
          },
          {
            title: "Saved Courses",
            href: "/dashboard/learner/learning/saved",
            icon: Bookmark
          }
        ]
      },
      {
        title: "Assignments",
        icon: FileText,
        subItems: [
          {
            title: "Pending",
            href: "/dashboard/learner/assignments/pending",
            icon: Clock,
            badge: "due"
          },
          {
            title: "Submitted",
            href: "/dashboard/learner/assignments/submitted",
            icon: UploadCloud
          },
          {
            title: "Graded",
            href: "/dashboard/learner/assignments/graded",
            icon: CheckCircle
          },
          {
            title: "Grades",
            href: "/dashboard/learner/assignments/grades",
            icon: Award
          },
        ]
      },
      {
        title: "Certificates",
        icon: Award,
        href: "/dashboard/learner/certificates"
      },
      {
        title: "Messages",
        icon: MessageSquare,
        href: "/dashboard/learner/messages"
      },
      {
        title: "Profile",
        icon: User,
        href: "/dashboard/learner/profile"
      }
    ]
  };

  // Handle SYSTEM_ADMIN (not defined above)
  if (role === "SYSTEM_ADMIN") {
  return [
    {
      title: "Dashboard",
      href: "/dashboard/system-admin",
      icon: Home,
      exact: true
    },

    {
      title: "Institution Management",
      icon: Building2,
      subItems: [
        {
          title: "All Institutions",
          href: "/dashboard/system-admin/institutions",
          icon: Building2
        },
        {
          title: "Create Institution",
          href: "/dashboard/system-admin/institutions/create",
          icon: UserPlus
        },
        {
          title: "Institution Analytics",
          href: "/dashboard/system-admin/institutions/analytics",
          icon: TrendingUp
        }
      ]
    },
    {
      title: "User Management",
      icon: Users,
      subItems: [
        {
          title: "All Users",
          href: "/dashboard/system-admin/users",
          icon: Users
        },
        {
          title: "Manage Roles",
          href: "/dashboard/system-admin/users/roles",
          icon: UserCog
        },
        {
          title: "Institution Admins",
          href: "/dashboard/system-admin/users/institution-admins",
          icon: Shield
        },
        {
          title: "User Analytics",
          href: "/dashboard/system-admin/users/analytics",
          icon: BarChart3
        },
      ]
    },
    {
      title: "Course Management",
      icon: BookOpen,
      subItems: [
        {
          title: "All Courses",
          href: "/dashboard/system-admin/courses",
          icon: BookOpen
        },
        {
          title: "Enrollment Requests",
          href: "/dashboard/system-admin/enrollment-requests",
          icon: Clock
          // badge: pendingEnrollments 
        },
        {
          title: "MOOC Overview",
          href: "/dashboard/system-admin/courses/mooc",
          icon: Globe
        },
        {
          title: "SPOC Overview",
          href: "/dashboard/system-admin/courses/spoc",
          icon: Lock
        },
        {
          title: "Course Reports",
          href: "/dashboard/system-admin/courses/reports",
          icon: FileText
        },
        {
          title: "Content Moderation",
          href: "/dashboard/system-admin/courses/moderation",
          icon: Shield,
          badge: 12
        },
      ]
    },
    // {
    //   title: "System Settings",
    //   icon: Settings,
    //   subItems: [
    //     {
    //       title: "Platform Configuration",
    //       href: "/dashboard/system-admin/settings/platform",
    //       icon: Cpu
    //     },
    //     {
    //       title: "Payment Integration",
    //       href: "/dashboard/system-admin/settings/payments",
    //       icon: CreditCard
    //     },
    //     {
    //       title: "Global Policies",
    //       href: "/dashboard/system-admin/settings/policies",
    //       icon: FileText
    //     },
    //     {
    //       title: "System Analytics",
    //       href: "/dashboard/system-admin/settings/analytics",
    //       icon: Activity
    //     },
    //     {
    //       title: "API Management",
    //       href: "/dashboard/system-admin/settings/api",
    //       icon: Network
    //     },
    //     {
    //       title: "Database",
    //       href: "/dashboard/system-admin/settings/database",
    //       icon: Database
    //     },
    //   ]
    // },
    {
      title: "Security & Monitoring",
      icon: Shield,
      subItems: [
        {
          title: "Audit Logs",
          href: "/dashboard/system-admin/security/audit",
          icon: FileText
        },
        {
          title: "Access Control",
          href: "/dashboard/system-admin/security/access",
          icon: Lock
        },
        {
          title: "System Health",
          href: "/dashboard/system-admin/security/health",
          icon: Activity
        }
      ]
    },
          {
        title: "Messages",
        icon: MessageSquare,
        href: "/dashboard/system-admin/messages"
      },
  ]
  }

  return baseItems[role as keyof typeof baseItems] || baseItems.LEARNER;
};

// ==================== FIXED MENU ITEM COMPONENT ====================
interface MenuItemProps {
  item: {
    title: string
    href?: string
    icon: React.ComponentType<{ className?: string }>
    exact?: boolean
    subItems?: Array<{
      title: string
      href?: string
      icon: React.ComponentType<{ className?: string }>
      badge?: string | number
    }>
    badge?: string | number
  }
  expandedItems: string[]
  toggleExpanded: (title: string) => void
  closeSidebar: () => void
  pathname: string
  isCollapsed: boolean
  level?: number
}

const MenuItem = ({ item, expandedItems, toggleExpanded, closeSidebar, pathname, isCollapsed, level = 0 }: MenuItemProps) => {
  const isExpanded = expandedItems.includes(item.title)
  const hasChildren = item.subItems && item.subItems.length > 0
  const Icon = item.icon
  
  // ==================== IMPROVED ACTIVE STATE DETECTION ====================
  const isItemActive = () => {
    if (!item.href) return false
    
    // For items without children (direct links)
    if (!hasChildren) {
      // Exact match for dashboard home
      if (item.exact) {
        return pathname === item.href
      }
      // For other links, check if path starts with href (for nested routes)
      return pathname.startsWith(item.href)
    }
    return false
  }
  
  const hasActiveChild = () => {
    if (!hasChildren) return false
    return item.subItems?.some((subItem) => {
      if (!subItem.href) return false
      // Check if current path matches subitem or starts with it
      return pathname === subItem.href || pathname.startsWith(subItem.href)
    })
  }

  // Check if any subitem is exactly active (for subitem styling)
  const getActiveSubItem = () => {
    if (!hasChildren) return null
    return item.subItems?.find((subItem) => 
      subItem.href && (pathname === subItem.href || pathname.startsWith(subItem.href))
    )
  }

  const activeSubItem = getActiveSubItem()
  const isActive = isItemActive()
  const childIsActive = hasActiveChild()

  // For direct links (no children)
  if (item.href && !hasChildren) {
    return (
      <li className="relative max-w-full">
        <Link 
          href={item.href} 
          onClick={closeSidebar}
          className={cn(
            "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 w-full group relative",
            "border-l-4",
            isCollapsed && "justify-center px-3",
            // Base styles
            !isActive && "border-transparent text-gray-700 hover:text-[#4F46E5] hover:bg-[#4F46E5]/5",
            // Active styles
            isActive && "bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white border-l-white shadow-md"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors duration-200",
              isActive ? "text-white" : "text-gray-500 group-hover:text-[#4F46E5]"
            )}
          />
          {!isCollapsed && (
            <>
              <span className="font-medium flex-1">{item.title}</span>
              {item.badge && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  isActive ? "bg-white text-[#4F46E5]" : "bg-red-500 text-white"
                )}>
                  {typeof item.badge === 'string' ? '!' : item.badge}
                </span>
              )}
            </>
          )}
        </Link>
      </li>
    )
  }

  // For parent items with children
  return (
    <li className="relative max-w-full">
      <div>
        <button
          onClick={() => toggleExpanded(item.title)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 w-full group relative",
            "border-l-4",
            isCollapsed && "justify-center px-3",
            // Base styles
            !childIsActive && "border-transparent text-gray-700 hover:text-[#4F46E5] hover:bg-[#4F46E5]/5",
            // Active when child is active
            childIsActive && "bg-gradient-to-r from-[#4F46E5]/10 to-[#4F46E5]/5 text-[#4F46E5] border-l-[#4F46E5]"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors duration-200",
              childIsActive ? "text-[#4F46E5]" : "text-gray-500 group-hover:text-[#4F46E5]"
            )}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left font-medium">{item.title}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  isExpanded ? "rotate-180" : "",
                  childIsActive ? "text-[#4F46E5]" : "text-gray-400"
                )}
              />
            </>
          )}
        </button>

        {/* Sub-items */}
        {isExpanded && !isCollapsed && item.subItems && (
          <div className="mt-1 space-y-0.5 ml-4 border-l-2 border-gray-200 pl-4">
            {item.subItems.map((subItem) => {
              const isSubItemActive = subItem.href && (
                pathname === subItem.href || 
                (pathname.startsWith(subItem.href) && subItem.href !== "/dashboard/learner")
              )

              return (
                <Link
                  key={subItem.href || subItem.title}
                  href={subItem.href || "#"}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 group relative",
                    "border-l-4",
                    // Base styles
                    !isSubItemActive && "border-transparent text-gray-600 hover:text-[#4F46E5] hover:bg-[#4F46E5]/5",
                    // Active styles
                    isSubItemActive && "bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white border-l-white shadow-md"
                  )}
                >
                  <subItem.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                      isSubItemActive ? "text-white" : "text-gray-500 group-hover:text-[#4F46E5]"
                    )}
                  />
                  <span className={cn(
                    "font-medium flex-1",
                    isSubItemActive && "text-white"
                  )}>
                    {subItem.title}
                  </span>
                  {subItem.badge && (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      isSubItemActive ? "bg-white text-[#4F46E5]" : "bg-red-500 text-white"
                    )}>
                      {typeof subItem.badge === 'string' ? '!' : subItem.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </li>
  )
}

// ==================== HEADER COMPONENT ====================
interface HeaderProps {
  user: {
    username?: string
    email?: string
    institution?: { name?: string }
    primary_institution_name?: string
    primary_institution_id?: string
  } | null
  roleInfo: {
    label: string
    color: string
    icon: React.ComponentType<{ className?: string }>
  }
  toggleSidebar: () => void
  isMobile: boolean
  handleLogout: (logoutAllSystems: boolean) => void
  actualRole: string
}

const Header = ({ user, roleInfo, toggleSidebar, isMobile, handleLogout, actualRole }: HeaderProps) => {
  const displayName = user?.username || user?.email?.split('@')[0] || 'User'
  const institutionName = user?.institution?.name || user?.primary_institution_name || 'Your Institution'
  const RoleIcon = roleInfo.icon

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="h-9 w-9 rounded-lg"
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">
                  {actualRole === 'INSTITUTION_ADMIN' ? `${institutionName} Admin` :
                   actualRole === 'CONTENT_CREATOR' ? 'Content Creator Dashboard' :
                   actualRole === 'SYSTEM_ADMIN' ? 'System Admin Dashboard' :
                   actualRole === 'INSTRUCTOR' ? 'Instructor Dashboard' :
                   'Learning Dashboard'}
                </h1>
                <p className="text-xs text-gray-600">
                  Welcome back, {displayName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-lg">
              <Bell className="w-4 h-4 text-gray-700" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-gray-900">
                            {displayName}
                          </span>
                          <span className="text-xs text-gray-600">
                            {roleInfo.label}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="md:hidden h-9 w-9 rounded flex items-center justify-center">
                      <div className="h-8 w-8 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl border-gray-200" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/${actualRole.toLowerCase()}/profile`}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/${actualRole.toLowerCase()}/settings`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {actualRole === 'INSTITUTION_ADMIN' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/institution-admin/institution/profile?institution=${user?.primary_institution_id}`}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Institution Profile
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white border border-gray-200 shadow-2xl">
                    <AlertDialogHeader>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full flex items-center justify-center`}>
                          <LogOut className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <AlertDialogTitle className="text-xl font-bold text-gray-900">
                            Confirm Logout
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-600">
                            You are about to sign out from BwengePlus
                          </AlertDialogDescription>
                        </div>
                      </div>
                    </AlertDialogHeader>
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <RoleIcon className="h-3 w-3 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-800 mb-1">{roleInfo.label} Session</p>
                          <p className="text-sm text-red-700">
                            You are currently logged in as a <span className="font-semibold">{roleInfo.label}</span>.
                            Make sure to save any unsaved work before logging out.
                          </p>
                        </div>
                      </div>
                    </div>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto border-gray-300 hover:bg-gray-50">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleLogout(false)}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5]"
                      >
                        Logout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

// ==================== ROLE DISPLAY INFO ====================
const getRoleDisplayInfo = (role: string) => {
  switch (role) {
    case 'SYSTEM_ADMIN':
      return { label: 'System Administrator', color: 'from-red-500 to-orange-500', icon: Shield }
    case 'INSTITUTION_ADMIN':
      return { label: 'Institution Administrator', color: 'from-blue-500 to-cyan-500', icon: Building2 }
    case 'CONTENT_CREATOR':
      return { label: 'Content Creator', color: 'from-purple-500 to-pink-500', icon: Edit }
    case 'INSTRUCTOR':
      return { label: 'Instructor', color: 'from-green-500 to-emerald-500', icon: GraduationCap }
    case 'LEARNER':
      return { label: 'Learner', color: 'from-indigo-500 to-violet-500', icon: User }
    default:
      return { label: 'User', color: 'from-gray-500 to-gray-700', icon: User }
  }
}

// ==================== MAIN LAYOUT COMPONENT ====================
export default function RoleBasedDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [hydrated, setHydrated] = useState(false)
  const { user: reduxUser, isAuthenticated } = useAppSelector((state) => state.bwengeAuth)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [actualUser, setActualUser] = useState<{
    bwenge_role?: string
    primary_institution_id?: string
    institution_ids?: string[]
    institution_role?: string
    IsForWhichSystem?: string
    email?: string
    first_name?: string
    last_name?: string
    id?: string
    username?: string
    institution?: { name?: string }
    primary_institution_name?: string
  } | null>(null)
  const [actualRole, setActualRole] = useState<string>("LEARNER")
  const [validationDone, setValidationDone] = useState(false)
  
  useEffect(() => {
    if (!hydrated) return

    console.log("🔍 [LAYOUT] Validating user from all sources...")
    
    // Get from all sources
    const { cookieUser, localStorageUser, crossSystemContext } = validateUserFromAllSources()
    
    // Determine the actual role
    const determinedRole = determineActualRole(reduxUser, cookieUser, localStorageUser)
    
    // Determine the actual user object (priority: redux > cookie > localStorage)
    let determinedUser = reduxUser
    if (!determinedUser && cookieUser) determinedUser = cookieUser
    if (!determinedUser && localStorageUser) determinedUser = localStorageUser
    
    // If still no user but cross-system context exists, create a minimal user
    if (!determinedUser && crossSystemContext) {
      const ctx = crossSystemContext as CrossSystemContext
      determinedUser = {
        bwenge_role: ctx.bwenge_role,
        primary_institution_id: ctx.primary_institution_id,
        institution_ids: ctx.institution_ids,
        institution_role: ctx.institution_role,
        IsForWhichSystem: ctx.system,
        email: "user@example.com",
        first_name: "User",
        last_name: "",
        id: "recovered",
        username: "user"
      } as any
      console.log("🔄 [LAYOUT] Recovered user from cross-system context")
    }
    
    console.log("✅ [LAYOUT] Determined role:", determinedRole)
    console.log("✅ [LAYOUT] Determined user:", determinedUser && typeof determinedUser === 'object' && 'bwenge_role' in determinedUser ? (determinedUser as any).bwenge_role : 'none')
    
    setActualUser(determinedUser)
    setActualRole(determinedRole)
    
    // Run protection validation
    if (isAuthenticated) {
      dispatch(validateProtectionStatus())
        .then((result: unknown) => {
          const payload = result as { payload?: { needsRecovery?: boolean } }
          if (payload.payload?.needsRecovery) {
            toast.info("Your session has been recovered successfully", {
              description: "Cross-system data has been preserved"
            })
          }
        })
        .catch(() => {
          console.warn("⚠️ [LAYOUT] Protection validation failed")
        })
    }
    
    setValidationDone(true)
  }, [reduxUser, hydrated, isAuthenticated, dispatch])

  // ==================== HYDRATION ====================
  useEffect(() => {
    setHydrated(true)
  }, [])

  // ==================== RESPONSIVE ====================
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setIsCollapsed(mobile)
      if (!mobile) {
        setIsSidebarOpen(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // ==================== AUTH REDIRECT ====================
  useEffect(() => {
    if (hydrated && validationDone) {
      if (!isAuthenticated) {
        console.log("🚫 [LAYOUT] Not authenticated, redirecting to login")
        router.push("/login")
        return
      }
    }
  }, [isAuthenticated, hydrated, router, validationDone])

  // ==================== FIXED: Centralized logout handler ====================
  const handleLogout = async (logoutAllSystems: boolean = false) => {
    try {
      console.log("🔓 [LOGOUT] Initiating logout...", { logoutAllSystems })
      
      // Save cross-system context before logout
      if (actualUser) {
        const crossSystemContext = {
          system: SystemType.BWENGEPLUS,
          bwenge_role: actualUser.bwenge_role,
          institution_ids: actualUser.institution_ids,
          primary_institution_id: actualUser.primary_institution_id,
          institution_role: actualUser.institution_role,
          last_sync: new Date().toISOString()
        }
        safeSetLocalStorageJSON("cross_system_context", crossSystemContext)
        console.log("💾 [LOGOUT] Saved cross-system context")
      }
      
      await dispatch(logoutBwenge(logoutAllSystems)).unwrap()
      
      toast.success(
        logoutAllSystems
          ? "Successfully logged out from all systems"
          : "Successfully logged out"
      )
      
      console.log("✅ [LOGOUT] Logout successful, redirecting to login...")
      router.push("/login")
    } catch (error: any) {
      console.error("❌ [LOGOUT] Logout failed:", error)
      toast.error(error || "Failed to logout")
      
      // Still redirect to login even if backend logout fails
      router.push("/login")
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }

  const sidebarItems = getSidebarConfig(actualRole, actualUser?.primary_institution_id, actualUser ?? undefined)
  const roleInfo = getRoleDisplayInfo(actualRole)

  if (!hydrated || !validationDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5]"></div>
          <p className="text-sm text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "sticky top-0 h-screen flex flex-col transition-all duration-300 bg-white border-r border-gray-200 z-40",
          isMobile && isSidebarOpen ? "absolute left-0 shadow-2xl" : "",
          isCollapsed ? "w-20" : "w-72",
          isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-xl flex items-center justify-center shadow-lg">
                  <roleInfo.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">BwengePlus</h2>
                  <p className="text-xs text-gray-600 font-medium">
                    {roleInfo.label}
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-9 w-9 p-0 hover:bg-gray-100 rounded-xl transition-all duration-300"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-800" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-800" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-2 overflow-y-auto">
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <MenuItem
                  key={item.title}
                  item={item}
                  expandedItems={expandedItems}
                  toggleExpanded={toggleExpanded}
                  closeSidebar={closeSidebar}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className={cn("border-t border-gray-200", isCollapsed ? "p-3" : "p-4")}>
            {isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-gray-100">
                    <Avatar className="h-8 w-8 ring-2 ring-[#4F46E5]/20">
                      <AvatarFallback className="text-xs bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-semibold">
                        {(actualUser?.username || actualUser?.email?.[0] || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-gray-200">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${actualRole.toLowerCase()}/profile`} className="cursor-pointer rounded-lg">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${actualRole.toLowerCase()}/settings`} className="cursor-pointer rounded-lg">
                      <Cog className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border border-gray-200 shadow-2xl">
                      <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-12 h-12 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full flex items-center justify-center`}>
                            <LogOut className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <AlertDialogTitle className="text-xl font-bold text-gray-900">
                              Confirm Logout
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600">
                              You are about to sign out from BwengePlus
                            </AlertDialogDescription>
                          </div>
                        </div>
                      </AlertDialogHeader>
                      <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <roleInfo.icon className="h-3 w-3 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-800 mb-1">{roleInfo.label} Session</p>
                            <p className="text-sm text-red-700">
                              You are currently logged in as a <span className="font-semibold">{roleInfo.label}</span>.
                              Make sure to save any unsaved work before logging out.
                            </p>
                          </div>
                        </div>
                      </div>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto border-gray-300 hover:bg-gray-50">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleLogout(false)}
                          className="w-full sm:w-auto bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5]"
                        >
                          Logout
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="space-y-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto hover:bg-gray-50 rounded-xl shadow-sm border border-transparent hover:border-gray-200 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Avatar className="h-10 w-10 ring-2 ring-[#4F46E5]/20">
                          <AvatarFallback className="text-sm font-semibold bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white">
                            {(actualUser?.username || actualUser?.email?.[0] || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold truncate text-gray-900">
                            {actualUser?.username || actualUser?.email?.split('@')[0] || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 truncate font-medium">
                            {roleInfo.label}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-xl border-gray-200">
                    <DropdownMenuLabel className="flex flex-col p-3">
                      <span className="font-semibold text-gray-900">
                        {actualUser?.username || actualUser?.email?.split('@')[0] || 'User'}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">{roleInfo.label}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/${actualRole.toLowerCase()}/profile`} className="cursor-pointer rounded-lg">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/${actualRole.toLowerCase()}/settings`} className="cursor-pointer rounded-lg">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white border border-gray-200 shadow-2xl">
                        <AlertDialogHeader>
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full flex items-center justify-center`}>
                              <LogOut className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                                Confirm Logout
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-600">
                                You are about to sign out from BwengePlus
                              </AlertDialogDescription>
                            </div>
                          </div>
                        </AlertDialogHeader>
                        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <roleInfo.icon className="h-3 w-3 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-800 mb-1">{roleInfo.label} Session</p>
                              <p className="text-sm text-red-700">
                                You are currently logged in as a <span className="font-semibold">{roleInfo.label}</span>.
                                Make sure to save any unsaved work before logging out.
                              </p>
                            </div>
                          </div>
                        </div>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto border-gray-300 hover:bg-gray-50">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLogout(false)}
                            className="w-full sm:w-auto bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5]"
                          >
                            Logout
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 hover:bg-gray-100 rounded-xl h-9 transition-all duration-300"
                    asChild
                  >
                    <Link href="/help">
                      <HelpCircle className="h-4 w-4 text-gray-600" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 hover:bg-gray-100 rounded-xl h-9 transition-all duration-300"
                    asChild
                  >
                    <Link href={`/dashboard/${actualRole.toLowerCase()}/settings`}>
                      <Cog className="h-4 w-4 text-gray-600" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-xl h-9 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-300"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border border-gray-200 shadow-2xl">
                      <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-12 h-12 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full flex items-center justify-center`}>
                            <LogOut className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <AlertDialogTitle className="text-xl font-bold text-gray-900">
                              Confirm Logout
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600">
                              You are about to sign out from BwengePlus
                            </AlertDialogDescription>
                          </div>
                        </div>
                      </AlertDialogHeader>
                      <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <roleInfo.icon className="h-3 w-3 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-800 mb-1">{roleInfo.label} Session</p>
                            <p className="text-sm text-red-700">
                              You are currently logged in as a <span className="font-semibold">{roleInfo.label}</span>.
                              Make sure to save any unsaved work before logging out.
                            </p>
                          </div>
                        </div>
                      </div>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto border-gray-300 hover:bg-gray-50">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleLogout(false)}
                          className="w-full sm:w-auto bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5]"
                        >
                          Logout
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          user={actualUser}
          roleInfo={roleInfo}
          toggleSidebar={toggleSidebar}
          isMobile={isMobile}
          handleLogout={handleLogout}
          actualRole={actualRole}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 md:p-6 animate-fade-in-scale">
            {children}
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in-scale {
          animation: fade-in-scale 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}