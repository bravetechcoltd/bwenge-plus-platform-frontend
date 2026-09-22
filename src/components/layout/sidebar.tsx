"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BookOpen,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  GraduationCap,
  Building,
  UserPlus,
  DollarSign,
  PieChart,
  BookPlus,
  UserRoundCheck,
  Shield,
  Server,
  LogOut,
  User,
  HelpCircle,
  Bell,
  Search,
  BookMarked,
  Users2,
  BarChart2,
  Wallet,
  Cog,
  FileCog,
  Settings,
  Boxes,
  Video,
  Award,
  FileQuestion,
  Layers,
  Globe,
  Lock,
  Brain,
  Target,
} from "lucide-react"
import React from "react"
import { useAuth } from "@/hooks/use-auth"
import { BwengeRole } from "@/types"

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href?: string
  icon: any
  children?: NavigationItem[]
}

const navigationItems: Record<BwengeRole | "default", NavigationItem[]> = {
  [BwengeRole.SYSTEM_ADMIN]: [
    { name: "Dashboard", href: "/sys-admin/dashboard", icon: Home },
    {
      name: "Users",
      icon: Users2,
      children: [
        { name: "All Users", href: "/sys-admin/users", icon: Users },
        { name: "Add User", href: "/sys-admin/users/create", icon: UserPlus },
        { name: "User Roles", href: "/sys-admin/users/roles", icon: Shield },
      ],
    },
    {
      name: "Institutions",
      icon: Building,
      children: [
        { name: "All Institutions", href: "/sys-admin/institutions", icon: Building },
        { name: "Add Institution", href: "/sys-admin/institutions/create", icon: Building },
      ],
    },
    {
      name: "Courses",
      icon: BookMarked,
      children: [
        { name: "All Courses", href: "/sys-admin/courses", icon: BookOpen },
        { name: "Create Course", href: "/sys-admin/courses/create", icon: BookPlus },
        { name: "Draft Courses", href: "/sys-admin/courses/draft", icon: FileText },
        { name: "Published Courses", href: "/sys-admin/courses/published", icon: Globe },
        { name: "SPOC Courses", href: "/sys-admin/courses/spoc", icon: Lock },
        { name: "Course Categories", href: "/sys-admin/categories", icon: Boxes },
      ],
    },
    {
      name: "Learning",
      icon: Brain,
      children: [
        { name: "Enrollments", href: "/sys-admin/enrollments", icon: Users },
        { name: "Progress", href: "/sys-admin/progress", icon: Target },
        { name: "Certificates", href: "/sys-admin/certificates", icon: Award },
      ],
    },
    { name: "Analytics", href: "/sys-admin/analytics", icon: PieChart },
    { name: "Settings", href: "/sys-admin/settings", icon: Cog },
  ],
  [BwengeRole.INSTITUTION_ADMIN]: [
    { name: "Dashboard", href: "/institution-admin/dashboard", icon: Home },
    {
      name: "Courses",
      icon: BookMarked,
      children: [
        { name: "All Courses", href: "/institution-admin/courses", icon: BookOpen },
        { name: "Create Course", href: "/institution-admin/courses/create", icon: BookPlus },
        { name: "SPOC Courses", href: "/institution-admin/courses/spoc", icon: Lock },
        { name: "Course Categories", href: "/institution-admin/categories", icon: Boxes },
      ],
    },
    {
      name: "Users",
      icon: Users2,
      children: [
        { name: "Institution Members", href: "/institution-admin/users", icon: Users },
        { name: "Add Member", href: "/institution-admin/users/add", icon: UserPlus },
        { name: "Assign Roles", href: "/institution-admin/users/roles", icon: Shield },
      ],
    },
    {
      name: "Learning",
      icon: Brain,
      children: [
        { name: "Enrollments", href: "/institution-admin/enrollments", icon: Users },
        { name: "Access Codes", href: "/institution-admin/access-codes", icon: Lock },
        { name: "Progress Reports", href: "/institution-admin/progress", icon: Target },
      ],
    },
    { name: "Settings", href: "/institution-admin/settings", icon: Cog },
  ],
  [BwengeRole.CONTENT_CREATOR]: [
    { name: "Dashboard", href: "/content-creator/dashboard", icon: Home },
    {
      name: "Content",
      icon: BookOpen,
      children: [
        { name: "My Courses", href: "/content-creator/courses", icon: BookMarked },
        { name: "Create Course", href: "/content-creator/courses/create", icon: BookPlus },
        { name: "Drafts", href: "/content-creator/courses/draft", icon: FileText },
        { name: "Modules", href: "/content-creator/modules", icon: Layers },
        { name: "Lessons", href: "/content-creator/lessons", icon: Video },
        { name: "Assessments", href: "/content-creator/assessments", icon: FileQuestion },
      ],
    },
    {
      name: "Resources",
      icon: FileText,
      children: [
        { name: "Uploads", href: "/content-creator/resources", icon: FileText },
        { name: "Media Library", href: "/content-creator/media", icon: Video },
      ],
    },
    { name: "Analytics", href: "/content-creator/analytics", icon: PieChart },
    { name: "Settings", href: "/content-creator/settings", icon: Cog },
  ],
  [BwengeRole.INSTRUCTOR]: [
    { name: "Dashboard", href: "/instructor/dashboard", icon: Home },
    {
      name: "Courses",
      icon: BookMarked,
      children: [
        { name: "My Courses", href: "/instructor/courses", icon: BookOpen },
        { name: "Create Course", href: "/instructor/courses/create", icon: BookPlus },
        { name: "Assigned Courses", href: "/instructor/courses/assigned", icon: BookOpen },
      ],
    },
    {
      name: "Teaching",
      icon: Brain,
      children: [
        { name: "Students", href: "/instructor/students", icon: Users },
        { name: "Enrollments", href: "/instructor/enrollments", icon: Users },
        { name: "Assessments", href: "/instructor/assessments", icon: FileQuestion },
        { name: "Grading", href: "/instructor/grading", icon: FileCog },
        { name: "Progress", href: "/instructor/progress", icon: Target },
      ],
    },
    {
      name: "Resources",
      icon: FileText,
      children: [
        { name: "Lesson Plans", href: "/instructor/lesson-plans", icon: FileText },
        { name: "Assignments", href: "/instructor/assignments", icon: FileQuestion },
        { name: "Quizzes", href: "/instructor/quizzes", icon: FileQuestion },
      ],
    },
    { name: "Settings", href: "/instructor/settings", icon: Cog },
  ],
  [BwengeRole.LEARNER]: [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "My Courses", href: "/courses", icon: BookMarked },
    { name: "Learning Path", href: "/learning-path", icon: Target },
    { name: "Progress", href: "/progress", icon: PieChart },
    { name: "Certificates", href: "/certificates", icon: Award },
    { name: "Bookmarks", href: "/bookmarks", icon: BookMarked },
    { name: "Settings", href: "/settings", icon: Cog },
  ],
  default: [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Explore Courses", href: "/courses/browse", icon: Search },
    { name: "Learning Path", href: "/learning-path", icon: Target },
    { name: "Settings", href: "/settings", icon: Cog },
  ],
}

const roleIcons: Record<BwengeRole, any> = {
  [BwengeRole.SYSTEM_ADMIN]: Server,
  [BwengeRole.INSTITUTION_ADMIN]: Shield,
  [BwengeRole.CONTENT_CREATOR]: UserRoundCheck,
  [BwengeRole.INSTRUCTOR]: GraduationCap,
  [BwengeRole.LEARNER]: Users,
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  // Determine user role for navigation
  const userRole = user?.bwenge_role || BwengeRole.LEARNER
  const items = navigationItems[userRole] || navigationItems.default

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const handleResize = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsCollapsed(e.matches)
    }

    // Initial check
    setIsCollapsed(mq.matches)

    // Listen for changes
    mq.addEventListener ? mq.addEventListener("change", handleResize) : mq.addListener(handleResize)

    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handleResize) : mq.removeListener(handleResize)
    }
  }, [])

  // Function to get the most specific matching item for a given path
  const getMostSpecificMatch = (
    items: NavigationItem[],
    currentPath: string,
  ): { item: NavigationItem; parent?: NavigationItem } | null => {
    let bestMatch: { item: NavigationItem; parent?: NavigationItem } | null = null
    let bestMatchLength = 0

    const searchItems = (itemList: NavigationItem[], parent?: NavigationItem) => {
      itemList.forEach((item) => {
        if (item.href && currentPath === item.href && item.href.length > bestMatchLength) {
          bestMatch = { item, parent }
          bestMatchLength = item.href.length
        }

        if (item.children) {
          searchItems(item.children, item)
        }
      })
    }

    searchItems(items)
    return bestMatch
  }

  // Auto-expand parent when child is active and collapse others
  useEffect(() => {
    const match = getMostSpecificMatch(items, pathname)
    if (match?.parent) {
      setExpandedItems([match.parent.name])
    } else {
      // If no child is active, collapse all
      const directMatch = items.find((item) => item.href === pathname)
      if (!directMatch?.children) {
        setExpandedItems([])
      }
    }
  }, [pathname, items])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      if (prev.includes(itemName)) {
        return prev.filter((name) => name !== itemName)
      } else {
        // Collapse all others and expand this one
        return [itemName]
      }
    })
  }

  const handleLogout = () => {
    logout()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const isItemActive = (item: NavigationItem): boolean => {
    if (!item.href) return false

    const match = getMostSpecificMatch(items, pathname)
    return match?.item === item
  }

  const hasActiveChild = (item: NavigationItem): boolean => {
    if (!item.children) return false

    const match = getMostSpecificMatch(items, pathname)
    return match?.parent === item
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)
    const isActive = isItemActive(item)
    const childIsActive = hasActiveChild(item)

    return (
      <li key={item.name} className="relative max-w-full">
        {hasChildren ? (
          <div>
            {/* Parent Item */}
            <button
              onClick={() => toggleExpanded(item.name)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 dark:hover:bg-success/20/30 hover:bg-success/10 hover:text-success dark:hover:text-white w-full group relative",
                "border-l-4 border-transparent hover:border-success/60",
                isCollapsed && "justify-center px-3",
                childIsActive &&
                  "bg-gradient-to-r from-green-50 dark:from-green-900 to-green-25 text-success dark:text-white border-l-green-500",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-300",
                  childIsActive ? "text-success dark:text-white" : "text-muted-foreground group-hover:text-success",
                )}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left font-medium">{item.name}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-300 text-muted-foreground",
                      isExpanded && "rotate-180",
                      childIsActive && "text-success",
                    )}
                  />
                </>
              )}
            </button>

            {/* Children Items */}
            {isExpanded && !isCollapsed && item.children && (
              <div className="mt-2 space-y-1 ml-4 border-l border-border pl-4">
                {item.children.map((child) => (
                  <Link
                    key={child.name}
                    href={child.href || "#"}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-300 group relative",
                      "border-l-4 border-transparent hover:border-success/60",
                      "hover:bg-success/10 dark:hover:bg-success/20/30 hover:text-success dark:hover:text-white",
                      isItemActive(child) &&
                        "bg-gradient-to-r from-green-500 to-green-600 text-white border-l-green-600 shadow-lg transform scale-[1.02]",
                    )}
                  >
                    <child.icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors duration-300",
                        isItemActive(child) ? "text-white" : "text-muted-foreground group-hover:text-success",
                      )}
                    />
                    <span className="font-medium">{child.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Regular Item */
          <Link
            href={item.href || "#"}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 group relative",
              "border-l-4 border-transparent hover:border-success/60",
              "hover:bg-success/10 dark:hover:bg-success/20/30 hover:text-success dark:hover:text-white",
              isActive &&
                "bg-gradient-to-r from-green-50 dark:from-green-900 to-green-25 text-success dark:text-white border-l-green-600 shadow-lg transform scale-[1.02]",
              isCollapsed && "justify-center px-3",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors duration-300",
                isActive ? "text-success" : "text-muted-foreground group-hover:text-success",
              )}
            />
            {!isCollapsed && (
              <>
                <span className="font-medium">{item.name}</span>
              </>
            )}
          </Link>
        )}
      </li>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div
      className={cn("sticky top-0 h-screen flex flex-col transition-all duration-300", isCollapsed ? "w-20" : "w-80")}
    >
      {/* Sidebar */}
      <div
        className={cn(
          "bg-background border border-border h-full flex flex-col transition-all duration-300 shadow-xl rounded-lg m-4",
          isCollapsed ? "w-16" : "w-72",
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded flex items-center justify-center shadow-lg">
                {React.createElement(roleIcons[userRole] || BookOpen, { className: "w-5 h-5 text-white" })}
              </div>
              <div>
                <h2 className="font-bold text-text">Bwenge Plus</h2>
                <p className="text-xs text-muted-foreground capitalize font-medium">
                  {userRole === BwengeRole.SYSTEM_ADMIN 
                    ? "System Admin" 
                    : userRole === BwengeRole.INSTITUTION_ADMIN
                    ? "Institution Admin"
                    : userRole === BwengeRole.CONTENT_CREATOR
                    ? "Content Creator"
                    : userRole === BwengeRole.INSTRUCTOR
                    ? "Instructor"
                    : "Learner"}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-9 w-9 p-0 hover:bg-accent rounded-xl transition-all duration-300"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-foreground" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 pr-1 py-2 overflow-y-auto">
          <ul className="space-y-2 max-w-full">{items.map((item) => renderNavigationItem(item))}</ul>
        </nav>

        {/* Enhanced Footer */}
        <div className={cn("border-t border-border rounded-b-2xl", isCollapsed ? "p-3" : "p-4")}>
          {isCollapsed ? (
            // Collapsed footer - simple icon buttons
            <div className="flex flex-col gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-accent">
                    <Avatar className="h-8 w-8 ring-2 ring-green-200">
                      <AvatarImage
                        src={user?.profile_picture_url || "/placeholder.svg"}
                        alt={user.first_name + " " + user.last_name}
                      />
                      <AvatarFallback className="text-xs bg-success/100 text-white font-semibold">
                        {user.first_name + " " + user.last_name ? getInitials(user.first_name + " " + user.last_name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-border">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer rounded-lg">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/help" className="cursor-pointer rounded-lg">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Help & Support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Expanded footer - full user info
            <div className="space-y-3">
              {/* User Info */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto hover:bg-accent rounded-xl shadow-sm border border-transparent hover:border-border transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-10 w-10 ring-2 ring-green-200">
                        <AvatarImage
                          src={user?.profile_picture_url || ""}
                          alt={user.first_name + " " + user.last_name}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-sm font-semibold bg-success/100 text-white">
                          {user.first_name + " " + user.last_name
                            ? getInitials(user.first_name + " " + user.last_name)
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold truncate text-text">
                          {user.first_name + " " + user.last_name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate font-medium">
                          {user?.email || "user@example.com"}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl border-border">
                  <DropdownMenuLabel className="flex flex-col p-3">
                    <span className="font-semibold text-text">{user.first_name + " " + user.last_name || "User"}</span>
                    <span className="text-sm text-muted-foreground font-medium">{user?.email || "user@example.com"}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer rounded-lg">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer rounded-lg">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-3 border-t border-muted">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 hover:bg-accent rounded-xl h-9 transition-all duration-300"
                  asChild
                >
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 hover:bg-accent rounded-xl h-9 transition-all duration-300"
                  asChild
                >
                  <Link href="/settings">
                    <Cog className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 rounded-xl h-9 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}