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
  ClipboardList,
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
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
import NotificationDropdown from "@/components/notifications/NotificationDropdown"
import api from "@/lib/api"

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
  }
}

const safeSetLocalStorageJSON = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
  }
}

// ==================== USER VALIDATION ====================
const validateUserFromAllSources = () => {
  let reduxUser = null
  try {
  } catch (e) {
  }

  let cookieUser = null
  const userCookie = Cookies.get("bwenge_user")
  if (userCookie) {
    try {
      cookieUser = JSON.parse(userCookie)
    } catch (e) {
    }
  }

  let localStorageUser = null
  const localUserStr = safeGetLocalStorage("bwengeplus_user")
  if (localUserStr) {
    try {
      localStorageUser = JSON.parse(localUserStr)
    } catch (e) {
    }
  }

  const crossSystemContext = safeGetLocalStorageJSON("cross_system_context", null)

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
  if (reduxUser && typeof reduxUser === 'object' && 'bwenge_role' in reduxUser) {
    const role = (reduxUser as UserLike).bwenge_role
    if (role) return role
  }

  if (cookieUser && typeof cookieUser === 'object' && 'bwenge_role' in cookieUser) {
    const role = (cookieUser as UserLike).bwenge_role
    if (role) return role
  }

  if (localStorageUser && typeof localStorageUser === 'object' && 'bwenge_role' in localStorageUser) {
    const role = (localStorageUser as UserLike).bwenge_role
    if (role) return role
  }

  const crossSystemContext = safeGetLocalStorageJSON<CrossSystemContext | null>("cross_system_context", null)
  if (crossSystemContext?.bwenge_role) {
    return crossSystemContext.bwenge_role
  }

  return "LEARNER"
}

// ==================== SIDEBAR CONFIGURATION ====================
const getSidebarConfig = (role: string, institutionId?: string, user?: { primary_institution_id?: string }, pendingEnrollmentCount?: number) => {
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
            title: "Students",
            href: "/dashboard/institution-admin/users/students",
            icon: GraduationCap
          },
          {
            title: "Invite Users",
            href: "/dashboard/institution-admin/users/invite",
            icon: UserPlus,
            action: "invite_users"
          }
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
            badge: pendingEnrollmentCount && pendingEnrollmentCount > 0 ? pendingEnrollmentCount : undefined
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
        title: "Messages",
        icon: MessageSquare,
        href: "/dashboard/institution-admin/messages"
      },
      {
        title: "Student Management",
        icon: GraduationCap,
        subItems: [
          {
            title: "My Students",
            href: "/dashboard/institution-admin/students",
            icon: Users
          },
          {
            title: "Grading Assessment",
            href: "/dashboard/institution-admin/assessments",
            icon: CheckCircle,
            action: "grade_assignments"
          }
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
          },
          {
            title: "Enrollment Requests",
            href: "/dashboard/instructor/enrollment/requests",
            icon: Clock,
            badge: "pending"
          }
        ]
      },
      {
        title: "Messages",
        href: "/dashboard/instructor/messages",
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
            title: "Applications",
            href: "/dashboard/system-admin/applications",
            icon: ClipboardList
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
        title: "Assign Course",
        icon: BookOpen,
        href: "/dashboard/system-admin/courses/assign-public",
      },
      {
        title: "Student Management",
        icon: GraduationCap,
        subItems: [
          {
            title: "My Students",
            href: "/dashboard/system-admin/students",
            icon: Users
          },
          {
            title: "Grading Assessment",
            href: "/dashboard/system-admin/assessments",
            icon: CheckCircle,
            action: "grade_assignments"
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

  const isItemActive = () => {
    if (!item.href) return false
    if (!hasChildren) {
      if (item.exact) return pathname === item.href
      return pathname.startsWith(item.href)
    }
    return false
  }

  const hasActiveChild = () => {
    if (!hasChildren) return false
    return item.subItems?.some((subItem) => {
      if (!subItem.href) return false
      return pathname === subItem.href || pathname.startsWith(subItem.href)
    })
  }

  const getActiveSubItem = () => {
    if (!hasChildren) return null
    return item.subItems?.find((subItem) =>
      subItem.href && (pathname === subItem.href || pathname.startsWith(subItem.href))
    )
  }

  const activeSubItem = getActiveSubItem()
  const isActive = isItemActive()
  const childIsActive = hasActiveChild()

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
            !isActive && "border-transparent text-foreground hover:text-primary hover:bg-primary/5",
            isActive && "bg-primary text-primary-foreground border-l-primary-foreground shadow-md"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors duration-200",
              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
            )}
          />
          {!isCollapsed && (
            <>
              <span className="font-medium flex-1">{item.title}</span>
              {item.badge && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  isActive ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground"
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

  return (
    <li className="relative max-w-full">
      <div>
        <button
          onClick={() => toggleExpanded(item.title)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 w-full group relative",
            "border-l-4",
            isCollapsed && "justify-center px-3",
            !childIsActive && "border-transparent text-foreground hover:text-primary hover:bg-primary/5",
            childIsActive && "bg-primary/10 text-primary border-l-primary"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 flex-shrink-0 transition-colors duration-200",
              childIsActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
            )}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left font-medium">{item.title}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  isExpanded ? "rotate-180" : "",
                  childIsActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            </>
          )}
        </button>

        {isExpanded && !isCollapsed && item.subItems && (
          <div className="mt-1 space-y-0.5 ml-4 border-l-2 border-border pl-4">
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
                    !isSubItemActive && "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5",
                    isSubItemActive && "bg-primary text-primary-foreground border-l-primary-foreground shadow-md"
                  )}
                >
                  <subItem.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                      isSubItemActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <span className={cn(
                    "font-medium flex-1",
                    isSubItemActive && "text-primary-foreground"
                  )}>
                    {subItem.title}
                  </span>
                  {subItem.badge && (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      isSubItemActive ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground"
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

// ==================== COMPACT FIXED HEADER COMPONENT ====================
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
  sidebarWidth: number
}

const Header = ({ user, roleInfo, toggleSidebar, isMobile, handleLogout, actualRole, sidebarWidth }: HeaderProps) => {
  const displayName = user?.username || user?.email?.split('@')[0] || 'User'
  const institutionName = user?.institution?.name || user?.primary_institution_name || 'Your Institution'
  const RoleIcon = roleInfo.icon
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <header
      className="fixed top-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
      style={{ left: sidebarWidth }}
    >
      <div className="px-3 sm:px-4 py-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Mobile menu toggle + title */}
          <div className="flex items-center gap-2 min-w-0">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="h-7 w-7 rounded-md flex-shrink-0 p-0"
              >
                <Menu className="h-4 w-4 text-foreground" />
              </Button>
            )}

            <div className="hidden sm:flex flex-col leading-none">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {actualRole === 'INSTITUTION_ADMIN' ? `${institutionName} Admin` :
                  actualRole === 'CONTENT_CREATOR' ? 'Content Creator' :
                    actualRole === 'SYSTEM_ADMIN' ? 'System Admin' :
                      actualRole === 'INSTRUCTOR' ? 'Instructor' :
                        'Learning Dashboard'}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Welcome, {displayName}
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-7 w-7 rounded-md p-0"
              aria-label="Toggle theme"
            >
              {mounted && theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-foreground" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-foreground" />
              )}
            </Button>

            <NotificationDropdown actualRole={actualRole} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                  <div className="flex items-center gap-1.5">
                    {/* Desktop user pill */}
                    <div className="hidden md:flex items-center gap-2 bg-muted/50 hover:bg-muted transition-colors rounded-md px-2 py-1">
                      <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-foreground text-xs font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col text-left leading-none">
                        <span className="text-xs font-medium text-foreground">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {roleInfo.label}
                        </span>
                      </div>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </div>

                    {/* Mobile avatar only */}
                    <div className="md:hidden h-7 w-7 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-semibold">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
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
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-background border-border shadow-2xl">
                    <AlertDialogHeader>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                          <LogOut className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <AlertDialogTitle className="text-xl font-bold text-foreground">
                            Confirm Logout
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            You are about to sign out from BwengePlus
                          </AlertDialogDescription>
                        </div>
                      </div>
                    </AlertDialogHeader>
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <RoleIcon className="h-3 w-3 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-destructive mb-1">{roleInfo.label} Session</p>
                          <p className="text-sm text-muted-foreground">
                            You are currently logged in as a <span className="font-semibold text-foreground">{roleInfo.label}</span>.
                            Make sure to save any unsaved work before logging out.
                          </p>
                        </div>
                      </div>
                    </div>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto border-border hover:bg-muted">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleLogout(false)}
                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
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
    case 'INSTRUCTOR':
      return { label: 'Instructor', color: 'from-green-500 to-emerald-500', icon: GraduationCap }
    case 'LEARNER':
      return { label: 'Learner', color: 'from-indigo-500 to-violet-500', icon: User }
    default:
      return { label: 'User', color: 'from-gray-500 to-gray-700', icon: User }
  }
}

// ==================== CONSTANTS ====================
// Header height in px (compact: ~44px)
const HEADER_HEIGHT = 44
// Sidebar widths
const SIDEBAR_EXPANDED_WIDTH = 288   // w-72 = 18rem = 288px
const SIDEBAR_COLLAPSED_WIDTH = 80   // w-20 = 5rem = 80px
// Viewport width threshold below which sidebar auto-collapses
const AUTO_COLLAPSE_BREAKPOINT = 1024

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
  const [pendingEnrollmentCount, setPendingEnrollmentCount] = useState<number>(0)

  useEffect(() => {
    if (!hydrated) return

    const { cookieUser, localStorageUser, crossSystemContext } = validateUserFromAllSources()
    const determinedRole = determineActualRole(reduxUser, cookieUser, localStorageUser)

    let determinedUser = reduxUser
    if (!determinedUser && cookieUser) determinedUser = cookieUser
    if (!determinedUser && localStorageUser) determinedUser = localStorageUser

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
    }

    setActualUser(determinedUser)
    setActualRole(determinedRole)

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
        .catch(() => {})
    }

    setValidationDone(true)
  }, [reduxUser, hydrated, isAuthenticated, dispatch])

  // ==================== FETCH PENDING ENROLLMENT COUNT ====================
  useEffect(() => {
    if (!validationDone || !isAuthenticated || actualRole !== 'INSTITUTION_ADMIN') return
    api.get('/enrollments/pending-count')
      .then(res => {
        const count = res.data?.data?.count ?? res.data?.count ?? 0
        setPendingEnrollmentCount(count)
      })
      .catch(() => {})
  }, [validationDone, isAuthenticated, actualRole])

  // ==================== HYDRATION ====================
  useEffect(() => {
    setHydrated(true)
  }, [])

  // ==================== RESPONSIVE: auto-collapse sidebar when viewport is narrow ====================
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      const mobile = width < AUTO_COLLAPSE_BREAKPOINT

      setIsMobile(mobile)

      // Auto-collapse when below breakpoint
      if (mobile) {
        setIsCollapsed(true)
        setIsSidebarOpen(false)
      } else {
        // On wide screens restore expanded state (don't force collapsed)
        setIsCollapsed(false)
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
        router.push("/login")
        return
      }
    }
  }, [isAuthenticated, hydrated, router, validationDone])

  // ==================== LOGOUT ====================
  const handleLogout = async (logoutAllSystems: boolean = false) => {
    try {
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
      }

      await dispatch(logoutBwenge(logoutAllSystems)).unwrap()

      toast.success(
        logoutAllSystems
          ? "Successfully logged out from all systems"
          : "Successfully logged out"
      )

      router.push("/login")
    } catch (error: any) {
      toast.error(error || "Failed to logout")
      router.push("/login")
    }
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
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

  const sidebarItems = getSidebarConfig(actualRole, actualUser?.primary_institution_id, actualUser ?? undefined, pendingEnrollmentCount)
  const roleInfo = getRoleDisplayInfo(actualRole)

  // Compute the effective sidebar width for layout offsets
  const effectiveSidebarWidth = isMobile
    ? 0  // on mobile the sidebar overlays; main content starts at 0
    : isCollapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_EXPANDED_WIDTH

  if (!hydrated || !validationDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Mobile Overlay ── */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* ── Fixed Sidebar ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full flex flex-col transition-all duration-300 bg-background border-r border-border z-40",
          isCollapsed ? "w-20" : "w-72",
          // On mobile: slide in/out
          isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0",
          isMobile && isSidebarOpen ? "shadow-2xl" : ""
        )}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            {!isCollapsed && (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <roleInfo.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground truncate">BwengePlus</h2>
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {roleInfo.label}
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isMobile ? setIsSidebarOpen(false) : setIsCollapsed(!isCollapsed)}
              className="h-9 w-9 p-0 hover:bg-muted rounded-xl transition-all duration-300 flex-shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-foreground" />
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

          {/* Sidebar Footer */}
          <div className={cn("border-t border-border flex-shrink-0", isCollapsed ? "p-3" : "p-4")}>
            {isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-muted">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                        {(actualUser?.username || actualUser?.email?.[0] || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
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
                        className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-background border-border shadow-2xl">
                      <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <LogOut className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <div>
                            <AlertDialogTitle className="text-xl font-bold text-foreground">
                              Confirm Logout
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              You are about to sign out from BwengePlus
                            </AlertDialogDescription>
                          </div>
                        </div>
                      </AlertDialogHeader>
                      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <roleInfo.icon className="h-3 w-3 text-destructive" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-destructive mb-1">{roleInfo.label} Session</p>
                            <p className="text-sm text-muted-foreground">
                              You are currently logged in as a <span className="font-semibold text-foreground">{roleInfo.label}</span>.
                              Make sure to save any unsaved work before logging out.
                            </p>
                          </div>
                        </div>
                      </div>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto border-border hover:bg-muted">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleLogout(false)}
                          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
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
                      className="w-full justify-start p-3 h-auto hover:bg-muted/50 rounded-xl shadow-sm border border-transparent hover:border-border transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20 flex-shrink-0">
                          <AvatarFallback className="text-sm font-semibold bg-primary text-primary-foreground">
                            {(actualUser?.username || actualUser?.email?.[0] || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {actualUser?.username || actualUser?.email?.split('@')[0] || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-medium">
                            {roleInfo.label}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-xl">
                    <DropdownMenuLabel className="flex flex-col p-3">
                      <span className="font-semibold text-foreground">
                        {actualUser?.username || actualUser?.email?.split('@')[0] || 'User'}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">{roleInfo.label}</span>
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
                          className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-background border-border shadow-2xl">
                        <AlertDialogHeader>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                              <LogOut className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                              <AlertDialogTitle className="text-xl font-bold text-foreground">
                                Confirm Logout
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                You are about to sign out from BwengePlus
                              </AlertDialogDescription>
                            </div>
                          </div>
                        </AlertDialogHeader>
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <roleInfo.icon className="h-3 w-3 text-destructive" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-destructive mb-1">{roleInfo.label} Session</p>
                              <p className="text-sm text-muted-foreground">
                                You are currently logged in as a <span className="font-semibold text-foreground">{roleInfo.label}</span>.
                                Make sure to save any unsaved work before logging out.
                              </p>
                            </div>
                          </div>
                        </div>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto border-border hover:bg-muted">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLogout(false)}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Logout
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex gap-2 pt-3 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 hover:bg-muted rounded-xl h-9 transition-all duration-300"
                    asChild
                  >
                    <Link href="/help">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 hover:bg-muted rounded-xl h-9 transition-all duration-300"
                    asChild
                  >
                    <Link href={`/dashboard/${actualRole.toLowerCase()}/settings`}>
                      <Cog className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-xl h-9 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-background border-border shadow-2xl">
                      <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <LogOut className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <div>
                            <AlertDialogTitle className="text-xl font-bold text-foreground">
                              Confirm Logout
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              You are about to sign out from BwengePlus
                            </AlertDialogDescription>
                          </div>
                        </div>
                      </AlertDialogHeader>
                      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <roleInfo.icon className="h-3 w-3 text-destructive" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-destructive mb-1">{roleInfo.label} Session</p>
                            <p className="text-sm text-muted-foreground">
                              You are currently logged in as a <span className="font-semibold text-foreground">{roleInfo.label}</span>.
                              Make sure to save any unsaved work before logging out.
                            </p>
                          </div>
                        </div>
                      </div>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto border-border hover:bg-muted">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleLogout(false)}
                          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
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
      </aside>

      {/* ── Fixed Compact Header ── */}
      <Header
        user={actualUser}
        roleInfo={roleInfo}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
        handleLogout={handleLogout}
        actualRole={actualRole}
        sidebarWidth={effectiveSidebarWidth}
      />

      {/* ── Main Content (offset for fixed sidebar + fixed header) ── */}
      <main
        className="transition-all duration-300 overflow-y-auto overflow-x-auto bg-muted/30"
        style={{
          marginLeft: effectiveSidebarWidth,
          paddingTop: HEADER_HEIGHT,
          minHeight: '100vh',
        }}
      >
        <div className="p-4 md:p-6 animate-fade-in-scale">
          {children}
        </div>
      </main>

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