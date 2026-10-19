"use client"

import * as React from "react"
import { hardSignOut } from "@/lib/auth/hard-sign-out"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import Cookies from "js-cookie"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  BookOpen,
  Building2,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  Play,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react"
import type { AppDispatch, RootState } from "@/lib/store"
import { logoutBwenge } from "@/lib/features/auth/auth-slice"
import {
  getRoleDisplayName,
  getRoleDashboardPath,
  normaliseRole, profilePathForRole, settingsPathForRole } from "@/app/utils/roleNavigation"
import { CourseSearch } from "./course-search"

/**
 * ============================================================================
 * Catalogue navigation (CS-001)
 * ============================================================================
 *
 * One bar for every public course surface.
 *
 * There were three arrangements before this: the course detail page had its
 * own, the institution catalogue had a second, and `/courses` had no bar at
 * all — so moving between them changed, or lost, the navigation. This is the
 * one structure, in the order the reference uses it:
 *
 *   logo · Explore ▾ · search ·········· links · Continue Learning · account
 *
 * Every control is real. There is no language selector, because the platform
 * has no translations and a dropdown with one entry is decoration.
 */

export interface CatalogueNavProps {
  /** Extra controls for the left group — the institution switcher uses this. */
  children?: React.ReactNode
  /** Seeds the search field, e.g. from `?search=` on the catalogue. */
  searchValue?: string
  /**
   * Scopes the search to one institution's catalogue (CE-001 §6).
   *
   * Without it, the bar on an institution page suggests courses from the
   * whole platform, which reads as a bug: the page says one institution and
   * the search below it says otherwise.
   */
  institutionId?: string
}

const EXPLORE_LINKS = [
  { label: "Home", href: "/" },
  { label: "All Courses", href: "/courses" },
]

export function CatalogueNav({ children, searchValue, institutionId }: CatalogueNavProps) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { user: reduxUser, isAuthenticated } = useSelector(
    (state: RootState) => state.bwengeAuth
  )
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = React.useState(false)
  const [showExplore, setShowExplore] = React.useState(false)
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showMobile, setShowMobile] = React.useState(false)
  const [user, setUser] = React.useState<any>(reduxUser)

  React.useEffect(() => setMounted(true), [])

  // The same three places every other surface reads the user from, so the bar
  // does not go anonymous on a page Redux has not hydrated yet.
  React.useEffect(() => {
    if (reduxUser) {
      setUser(reduxUser)
      return
    }
    try {
      const raw = Cookies.get("bwenge_user")
      if (raw) {
        setUser(JSON.parse(decodeURIComponent(raw)))
        return
      }
    } catch {}
    try {
      const raw = localStorage.getItem("bwengeplus_user")
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [reduxUser])

  React.useEffect(() => {
    if (!showExplore && !showUserMenu) return
    const close = () => {
      setShowExplore(false)
      setShowUserMenu(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [showExplore, showUserMenu])

  const role = normaliseRole(user?.bwenge_role) ?? "LEARNER"
  const dashboardPath = getRoleDashboardPath(role)
  const roleLabel = getRoleDisplayName(role)
  const isLearner = role === "LEARNER"
  const signedIn = isAuthenticated || !!user

  const initials =
    `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "U"

  const handleLogout = async () => {
    try {
      await dispatch(logoutBwenge(false)).unwrap()
      toast.success("Logged out successfully")
      router.push("/")
    } catch {
      toast.error("Logout failed")
      /*
       * A failed logout still ends the session in this browser.
       *
       * This branch used to show a toast and stop, leaving every cookie and
       * key in place — so the user was told they were logged out and was not.
       * Whether the server accepted the request or not, this device is done.
       */
      hardSignOut()
      router.push("/")
    }
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4">
        {/* Wordmark */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-[17px] font-bold leading-tight text-foreground">BwengePlus</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Never Stop Learning
            </div>
          </div>
        </Link>

        {/* Explore, then search — the two ways into the catalogue, together */}
        <div className="hidden flex-1 items-center gap-3 md:flex">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowExplore((v) => !v)
                setShowUserMenu(false)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Explore
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showExplore ? "rotate-180" : ""}`}
              />
            </button>
            {showExplore && (
              <div className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {EXPLORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowExplore(false)}
                    className="block px-3 py-2 text-sm text-popover-foreground hover:bg-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <CourseSearch
            className="w-full max-w-md"
            initialValue={searchValue}
            institutionId={institutionId}
          />

          {children}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {!signedIn ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Join Free
              </Link>
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              {/* The reference's green pill */}
              <Link
                href={dashboardPath}
                className="flex items-center gap-2 rounded-full border-2 border-emerald-600 px-4 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
              >
                <Play className="h-4 w-4 fill-current" />
                {isLearner ? "Continue Learning" : "Dashboard"}
              </Link>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowUserMenu((v) => !v)
                    setShowExplore(false)
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent"
                >
                  {user?.profile_picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profile_picture_url}
                      alt=""
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                      {initials}
                    </div>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover py-2 shadow-xl">
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-semibold text-popover-foreground">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                        {roleLabel}
                      </span>
                    </div>
                    <Link
                      href={dashboardPath}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                    >
                      <BookOpen className="h-4 w-4" />
                      {isLearner ? "My Learning" : "Dashboard"}
                    </Link>
                    <Link
                      href={profilePathForRole(role) ?? "#"}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href={settingsPathForRole(role) ?? "#"}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    {role === "INSTITUTION_ADMIN" && user?.primary_institution_id && (
                      <Link
                        href={`/dashboard/institution-admin/institution/profile?institution=${user.primary_institution_id}`}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                      >
                        <Building2 className="h-4 w-4" />
                        Institution
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        void handleLogout()
                      }}
                      className="flex w-full items-center gap-3 border-t border-border px-4 py-2 text-sm text-destructive hover:bg-accent"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowMobile((v) => !v)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
            aria-label="Menu"
          >
            {showMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Below md the search leads, because it is what the bar is for. */}
      {showMobile && (
        <div className="space-y-2 border-t border-border bg-background px-4 py-3 md:hidden">
          <CourseSearch initialValue={searchValue} institutionId={institutionId} />
          {children}
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setShowMobile(false)}
              className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
          {signedIn ? (
            <>
              <Link
                href={dashboardPath}
                onClick={() => setShowMobile(false)}
                className="flex items-center gap-2 rounded-lg border-2 border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
              >
                <Play className="h-4 w-4 fill-current" />
                {isLearner ? "Continue Learning" : "Dashboard"}
              </Link>
              <button
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm text-primary-foreground"
              >
                Join Free
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
