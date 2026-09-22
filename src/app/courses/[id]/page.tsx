"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { learningHomeForRole } from "@/app/utils/roleNavigation"
import { LoginModal } from "@/components/auth/LoginModal"
import { CatalogueNav } from "@/components/courses/catalogue-nav"
import { formatCoursePrice } from "@/components/course/course-pricing-field"
import { canRoleEnrol, roleLabel } from "@/lib/enrollment/role-eligibility"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useRouter, useParams } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Play, Clock, Users, Star, Share2, Heart, CheckCircle, Lock, ArrowLeft,
  Trophy, Target, Crown, Zap, Award, BookOpen, Shield, Gift, Menu, X,
  ChevronDown, GraduationCap, User, Settings, LogOut, Globe, Loader2,
  Building2, ShieldAlert, Key, Mail, AlertCircle, Info, Bookmark, BookmarkCheck,
  Sun, Moon, ChevronRight, Layers, Search, ThumbsUp,
} from "lucide-react"
import Link from "next/link"
import { CourseSearch } from "@/components/courses/course-search"
import type { Course } from "@/types"
import Cookies from "js-cookie"
import { motion, AnimatePresence } from "framer-motion"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/lib/store"
import { logoutBwenge } from "@/lib/features/auth/auth-slice"
import { toast } from 'sonner'
import AccessCodeRequestModal from "@/components/enrollment/AccessCodeRequestModal"
import AccessCodeRedeemInput from "@/components/enrollment/AccessCodeRedeemInput"
import { ErrorState } from "@/components/system/error-state"
import { CourseDetailSkeleton } from "@/components/skeletons/course-detail-skeleton"

// ==================== RICH TEXT CONTENT RENDERER ====================
// Renders HTML stored by the RichTextEditor exactly as it was formatted.
// Falls back to plain text when the value contains no HTML tags.
function RichContent({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null

  const isHtml = /<[a-z][\s\S]*>/i.test(html)

  if (isHtml) {
    return (
      <div
        className={`
          rich-text-content
          prose prose-sm max-w-none
          prose-p:my-2 prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:break-words prose-p:whitespace-normal
          prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-2 prose-headings:break-words
          prose-h1:text-xl prose-h1:font-bold prose-h1:mb-3 prose-h1:break-words
          prose-h2:text-lg prose-h2:font-bold prose-h2:mb-2.5 prose-h2:break-words
          prose-h3:text-base prose-h3:font-semibold prose-h3:mb-2 prose-h3:break-words
          prose-h4:text-sm prose-h4:font-semibold prose-h4:mb-1.5 prose-h4:break-words
          prose-h5:text-sm prose-h5:font-medium prose-h5:mb-1 prose-h5:break-words
          prose-ul:my-2 prose-ul:pl-5 prose-ul:list-disc prose-ul:break-words
          prose-ol:my-2 prose-ol:pl-5 prose-ol:list-decimal prose-ol:break-words
          prose-li:my-1 prose-li:leading-relaxed prose-li:break-words prose-li:whitespace-normal
          prose-li:marker:text-muted-foreground
          prose-strong:font-semibold prose-strong:text-foreground prose-strong:break-words
          prose-em:text-muted-foreground prose-em:italic prose-em:break-words
          prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:my-2 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:break-words
          prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:break-words
          prose-pre:bg-card prose-pre:text-muted-foreground prose-pre:p-3 prose-pre:rounded-lg prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-words
          prose-a:text-[#0158B7] prose-a:underline prose-a:decoration-[#0158B7]/30 prose-a:hover:decoration-[#0158B7] prose-a:break-words
          prose-img:rounded-lg prose-img:my-2 prose-img:max-w-full prose-img:h-auto
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:break-words [&_ul]:whitespace-normal
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:break-words [&_ol]:whitespace-normal
          [&_li]:my-1 [&_li]:break-words [&_li]:whitespace-normal
          [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:break-words
          [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:break-words
          [&_pre]:bg-card [&_pre]:text-muted-foreground [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre_code]:bg-transparent [&_pre_code]:p-0
          [&_a]:text-[#0158B7] [&_a]:underline [&_a]:decoration-[#0158B7]/30 [&_a:hover]:decoration-[#0158B7] [&_a]:break-words
          [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full [&_img]:h-auto
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-foreground [&_h1]:break-words
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2.5 [&_h2]:text-foreground [&_h2]:break-words
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-foreground [&_h3]:break-words
          [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mb-1.5 [&_h4]:text-foreground [&_h4]:break-words
          [&_h5]:text-sm [&_h5]:font-medium [&_h5]:mb-1 [&_h5]:text-foreground [&_h5]:break-words
          [&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_p]:break-words [&_p]:whitespace-normal
          [&_strong]:font-semibold [&_strong]:text-foreground [&_strong]:break-words
          [&_em]:italic [&_em]:text-muted-foreground [&_em]:break-words
          overflow-hidden
          break-words
          whitespace-normal
          select-none
          w-full
          max-w-full
          ${className}
        `}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          maxWidth: '100%',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  // Plain text — preserve line breaks with proper wrapping
  return (
    <p 
      className={`text-sm text-muted-foreground leading-relaxed select-none break-words whitespace-pre-wrap w-full max-w-full ${className}`}
      style={{
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
    >
      {html}
    </p>
  )
}
// ==================== ENROLLMENT SCENARIO TYPES ====================
type EnrollmentScenarioType = 
  | "DIRECT_ENROLL"
  | "REQUEST_ACCESS_CODE"
  | "PENDING_ACCESS_CODE_REQUEST"
  | "REQUIRES_MEMBERSHIP"
  | "BLOCKED"
  | "ALREADY_ENROLLED"
  | "LOADING"
  | "ERROR"

interface EnrollmentScenario {
  scenario_type: EnrollmentScenarioType
  course: {
    id: string
    title: string
    course_type: string
    has_institution: boolean
    institution_id: string | null
    institution_name: string | null
  }
  user: {
    id: string
    is_member: boolean
    has_pending_request: boolean
  }
  enrollment: any | null
  actions: {
    can_enroll_direct: boolean
    can_request_access_code: boolean
    can_redeem_code: boolean
    requires_membership: boolean
    blocked: boolean
  }
  messages: {
    main: string
    detail: string
  }
}

/** One fact in the hero strip: a figure, what it is, and a detail under it. */
function HeroFact({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 sm:px-4 sm:first:pl-0">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-tight text-foreground">{value}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        {hint && (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground/80">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
function resolveToken(reduxToken: string | null): string | null {
  if (reduxToken) return reduxToken
  return Cookies.get("bwenge_token") || null
}

function resolveUser(reduxUser: any): any | null {
  if (reduxUser) return reduxUser
  try {
    const raw = Cookies.get("bwenge_user")
    if (raw) return JSON.parse(decodeURIComponent(raw))
  } catch (_) {}
  try {
    const raw = localStorage.getItem("bwengeplus_user")
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return null
}

// ==================== NAVIGATION ====================
/**
 * The catalogue bar (CE-001 §3).
 *
 * This page carried its own 342-line copy of the navigation: a second user
 * menu, a second Explore dropdown, a second theme toggle, a second search.
 * They had already drifted — the copy here resolved the signed-in user
 * differently from the one on `/courses`, which is how a learner could see
 * one role in the bar and another on the page they navigated to.
 *
 * `CatalogueNav` is that bar, and is what `/courses` and the institution
 * catalogue already render. Keeping the local name means the seven places
 * below that say `<Navigation />` still read the same.
 */
function Navigation() {
  return <CatalogueNav />
}

/**
 * What the header's primary button should do, for the current scenario.
 *
 * Read from the same `scenario` the enrolment panel switches on, so the two
 * always offer the same next step. This decides *presentation* only — every
 * handler it returns is one the page already owns, and the panel below is
 * still where an access code is entered and where the full explanation of a
 * blocked or pending enrolment is shown.
 */
function primaryEnrollAction(
  scenario: EnrollmentScenario | null,
  course: Course,
  viewerRole?: string | null,
  viewerAuthenticated = true
): { label: string; onClick?: () => void; href?: string; disabled?: boolean } {
  // CE-001 §1: the header button is a second door into the same flow, so it
  // takes the same gate. Disabling it here is what stops an administrator
  // enrolling from the sticky bar while the sidebar below explains why not.
  if (!canRoleEnrol(viewerRole).allowed) {
    return { label: "Not available for admin accounts", disabled: true }
  }

  // §2: signed out, the button asks for a sign-in rather than disappearing or
  // waiting on a scenario that will never arrive.
  if (!viewerAuthenticated) {
    return { label: "Sign in to enroll", onClick: () => enrollActions.signIn?.() }
  }

  if (!scenario) return { label: "Checking availability…", disabled: true }

  switch (scenario.scenario_type) {
    case "ALREADY_ENROLLED":
      return { label: "Continue Course", href: `/learn/${course.id}` }
    case "DIRECT_ENROLL":
      return { label: "Start Course Now", onClick: () => enrollActions.direct?.() }
    case "REQUEST_ACCESS_CODE":
      return { label: "Request Access Code", onClick: () => enrollActions.requestCode?.() }
    case "PENDING_ACCESS_CODE_REQUEST":
      return { label: "Enter Access Code", onClick: () => enrollActions.requestCode?.() }
    case "REQUIRES_MEMBERSHIP":
      return { label: "Institution Members Only", disabled: true }
    case "BLOCKED":
      return { label: "Not Available", disabled: true }
    default:
      return { label: "Start Course Now", onClick: () => enrollActions.direct?.() }
  }
}

/**
 * The page's own handlers, so the header button can call them without the
 * whole enrolment flow being lifted out of the component that owns it.
 * Assigned once when the page renders; read only by `primaryEnrollAction`.
 */
const enrollActions: {
  direct?: () => void
  requestCode?: () => void
  signIn?: () => void
} = {}
// ==================== ENROLLMENT SIDEBAR COMPONENT ====================
interface EnrollmentSidebarProps {
  course: Course
  scenario: EnrollmentScenario | null
  isEnrolling: boolean
  onEnrollDirect: () => void
  onRequestAccessCode: () => void
  onRedeemSuccess: () => void
  onCancelRedeem?: () => void
  isSaved: boolean
  savingCourse: boolean
  onToggleSave: () => void
  /** The signed-in account's role, so the panel can refuse before asking. */
  viewerRole?: string | null
  /** False once we know nobody is signed in — not while that is still unknown. */
  viewerAuthenticated?: boolean
  /** Opens the shared login modal. */
  onSignIn?: () => void
}

function EnrollmentSidebar({
  course,
  scenario,
  isEnrolling,
  onEnrollDirect,
  onRequestAccessCode,
  onRedeemSuccess,
  onCancelRedeem,
  isSaved,
  savingCourse,
  onToggleSave,
  viewerRole,
  viewerAuthenticated = true,
  onSignIn,
}: EnrollmentSidebarProps) {
  const [showRedeemInput, setShowRedeemInput] = useState(false)

  const renderSidebarImage = () => (
    <div className="relative overflow-hidden rounded-t-lg h-44 md:h-48">
      <img
        src={course.thumbnail_url || "/placeholder.svg"}
        alt={course.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  )

  const cardClassName = "sticky top-20 border-2 shadow-xl select-none py-0"

  const renderPrice = () => (
    <div className="flex items-center justify-between mb-4">
      <span className="text-2xl font-bold text-primary">
        {formatCoursePrice(course)}
      </span>
    </div>
  )

  /*
   * Role gate (CE-001 §1).
   *
   * Before any scenario branch, and deliberately so: an administrator must see
   * the same answer whether the course is a free MOOC, a SPOC needing a code,
   * or one they are already blocked from. The obstacle is the account, not the
   * course, and checking it per scenario would have meant six chances to miss
   * one.
   *
   * The panel stays where it was — §1 asks for the enrol *area* to remain
   * visible — so the course still reads as a course. Only the action is gone,
   * replaced by the reason it is gone.
   */
  const roleCheck = canRoleEnrol(viewerRole)
  if (!roleCheck.allowed) {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <CardContent className="p-4">
          {renderPrice()}
          <div
            role="note"
            className="rounded-lg border border-warning/30 bg-warning/10 p-3"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Enrollment not available for {roleLabel(viewerRole)} accounts
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{roleCheck.message}</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            You can still review this course in full — its content, structure and
            learners are all visible from your dashboard.
          </p>
        </CardContent>
      </Card>
    )
  }

  /*
   * Signed out (CE-001 §2).
   *
   * This branch has to come before the `!scenario` spinner below, because a
   * signed-out visitor has no enrolment scenario and never will — without it
   * the panel would spin forever, which is precisely the "loads and never
   * resolves" failure this page is meant to stop having.
   */
  if (!viewerAuthenticated) {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <CardContent className="p-4">
          {renderPrice()}
          <Button className="w-full bg-primary hover:bg-primary" size="sm" onClick={onSignIn}>
            <Zap className="w-4 h-4 mr-2" />
            Sign in to enroll
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            You can read this whole page without an account. Signing in is only
            needed to enroll and track your progress.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!scenario) {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <CardContent className="p-4">
          {renderPrice()}
          <div className="space-y-3">
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ALREADY ENROLLED
  if (scenario.scenario_type === "ALREADY_ENROLLED") {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">
              {formatCoursePrice(course)}
            </span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-warning" />
                <span className="text-xs font-medium">Progress</span>
              </div>
              <span className="text-xs font-bold text-primary">{scenario.enrollment?.progress_percentage || 0}%</span>
            </div>
            <Progress value={scenario.enrollment?.progress_percentage || 0} className="h-2" />
            <Button className="w-full bg-primary hover:bg-primary" size="sm" asChild>
              <Link href={`/courses/${course.id}/learn`}>
                <Play className="w-4 h-4 mr-2" />
                {(scenario.enrollment?.progress_percentage || 0) === 100 ? "Review Course" : "Continue Learning"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // DIRECT ENROLL
  if (scenario.scenario_type === "DIRECT_ENROLL") {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">
              {formatCoursePrice(course)}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            <Button 
              className="w-full bg-primary hover:bg-primary" 
              size="sm" 
              onClick={onEnrollDirect}
              disabled={isEnrolling}
            >
              {isEnrolling ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Enroll Now</>
              )}
            </Button>
            <Button 
              variant={isSaved ? "default" : "outline"} 
              className="w-full" 
              size="sm"
              onClick={onToggleSave}
              disabled={savingCourse}
            >
              {savingCourse ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck className="w-4 h-4 mr-2" />
              ) : (
                <Bookmark className="w-4 h-4 mr-2" />
              )}
              {isSaved ? "Saved" : "Save for Later"}
            </Button>
          </div>
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-3">
            <p className="text-xs text-success flex items-start">
              <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>{scenario.messages.detail}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // REQUEST ACCESS CODE
  if (scenario.scenario_type === "REQUEST_ACCESS_CODE") {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">
              {formatCoursePrice(course)}
            </span>
            <Badge className="bg-primary/100 text-xs">SPOC</Badge>
          </div>
          
          {!showRedeemInput ? (
            <div className="space-y-3 mb-4">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-xs text-primary flex items-start">
                  <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span>{scenario.messages.detail}</span>
                </p>
              </div>
              
              <Button 
                className="w-full bg-primary hover:bg-primary" 
                size="sm" 
                onClick={onRequestAccessCode}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Requesting...</>
                ) : (
                  <><Key className="w-4 h-4 mr-2" />Request Access Code</>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => setShowRedeemInput(true)}
              >
                <Mail className="w-4 h-4 mr-2" />I Already Have a Code
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              <AccessCodeRedeemInput
                courseId={course.id}
                onSuccess={onRedeemSuccess}
                onCancel={() => setShowRedeemInput(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // PENDING ACCESS CODE REQUEST
  if (scenario.scenario_type === "PENDING_ACCESS_CODE_REQUEST") {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">
              {formatCoursePrice(course)}
            </span>
            <Badge className="bg-primary/100 text-xs">SPOC</Badge>
          </div>
          
          {!showRedeemInput ? (
            <div className="space-y-3 mb-4">
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                <p className="text-xs text-warning flex items-start">
                  <Clock className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span>{scenario.messages.detail}</span>
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => setShowRedeemInput(true)}
              >
                <Key className="w-4 h-4 mr-2" />Enter Access Code
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              <AccessCodeRedeemInput
                courseId={course.id}
                onSuccess={onRedeemSuccess}
                onCancel={() => setShowRedeemInput(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // REQUIRES MEMBERSHIP
  if (scenario.scenario_type === "REQUIRES_MEMBERSHIP") {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Lock className="w-12 h-12 text-white/80" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">
              {formatCoursePrice(course)}
            </span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm font-medium text-warning mb-1 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Institution Access Required
              </p>
              <p className="text-xs text-warning">
                {scenario.messages.detail}
              </p>
            </div>
            <Button variant="outline" className="w-full" size="sm" disabled>
              <Lock className="w-4 h-4 mr-2" />Enrollment Restricted
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // BLOCKED
  if (scenario.scenario_type === "BLOCKED") {
    return (
      <Card className={cardClassName}>
        {renderSidebarImage()}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Lock className="w-12 h-12 text-white/80" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">
              {formatCoursePrice(course)}
            </span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm font-medium text-destructive mb-1 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Access Restricted
              </p>
              <p className="text-xs text-destructive">
                {scenario.messages.detail}
              </p>
            </div>
            <Button variant="outline" className="w-full" size="sm" disabled>
              <Lock className="w-4 h-4 mr-2" />Not Available
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cardClassName}>
      {renderSidebarImage()}
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-primary">
            {formatCoursePrice(course)}
          </span>
        </div>
        <Button variant="outline" className="w-full" size="sm" disabled>
          Not Available
        </Button>
      </CardContent>
    </Card>
  )
}

// ==================== MAIN PAGE ====================
export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params?.id as string

  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [course, setCourse] = useState<Course>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /**
   * AXM-CONS-001 C-04.
   *
   * `error` is a string, so the status was gone by the time the render read it
   * and a 500, a timeout and an offline browser all landed in the same branch
   * as a genuinely missing course. The thrown value is kept alongside it —
   * `error` itself is untouched, so anything reading the message still works.
   */
  const [errorObject, setErrorObject] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("You don't have access to this course.")
  const [instructorData, setInstructorData] = useState<any>(null)
  
  const [enrollmentScenario, setEnrollmentScenario] = useState<EnrollmentScenario | null>(null)
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false)

  const [isSaved, setIsSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savingCourse, setSavingCourse] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])

  const [authStatus, setAuthStatus] = useState<"pending" | "authenticated" | "unauthenticated">("pending")

  /**
   * CE-001 §2: signing in happens here, not at `/login`.
   *
   * This page used to push unauthenticated visitors straight to `/login`, which
   * threw away the course they had come to see — a shared link opened by a
   * signed-out learner became a login form with no way back. The modal keeps
   * them on the course and returns them to it.
   */
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [loginPrompt, setLoginPrompt] = useState<string>(
    "Sign in to continue with this course."
  )

  const router = useRouter()
  const { user: reduxUser, isAuthenticated, token: reduxToken } = useSelector((state: RootState) => state.bwengeAuth)

  /**
   * The viewer's role, or null while it is genuinely unknown.
   *
   * Deliberately not `determineActualRole`, which falls back to "LEARNER":
   * that default is right for choosing a dashboard link and wrong here, where
   * it would mean "not loaded yet" renders as "may enrol". Null flows into
   * `canRoleEnrol` as UNKNOWN_ROLE, which shows the normal panel and lets the
   * server have the final word.
   */
  const viewerRole = useMemo<string | null>(() => {
    const resolved = resolveUser(reduxUser)
    return resolved?.bwenge_role ?? null
  }, [reduxUser])

  /**
   * Requires a signed-in visitor before running `action`.
   *
   * Every gated control on this page goes through here, so there is one place
   * that decides what "you must sign in first" looks like.
   */
  const requireAuth = useCallback(
    (action: () => void, prompt?: string): void => {
      if (authStatus === "authenticated") {
        action()
        return
      }
      if (prompt) setLoginPrompt(prompt)
      setIsLoginModalOpen(true)
    },
    [authStatus]
  )

  useEffect(() => {
    const token = resolveToken(reduxToken)
    if (token) {
      setAuthStatus("authenticated")
      return
    }

    const timer = setTimeout(() => {
      const finalToken = resolveToken(reduxToken)
      if (finalToken) {
        setAuthStatus("authenticated")
      } else {
        setAuthStatus("unauthenticated")
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [reduxToken])

  useEffect(() => {
    if (isAuthenticated && authStatus === "pending") {
      const token = resolveToken(reduxToken)
      if (token) setAuthStatus("authenticated")
    }
  }, [isAuthenticated, reduxToken, authStatus])

  /*
   * There is deliberately no redirect here any more (CE-001 §2).
   *
   * An unauthenticated visitor stays on the course and reads it. Signing in is
   * asked for at the moment it is actually needed — enrolling, saving, taking
   * notes — by `requireAuth` opening the modal, which is the one shared
   * implementation this page uses rather than a second login form of its own.
   */

  const fetchEnrollmentScenario = async (token: string) => {
    setScenarioLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/enrollments/check-scenario`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ course_id: courseId }),
        }
      )

      const data = await response.json()
      if (data.success) {
        setEnrollmentScenario(data.data)
        
        if (data.data.scenario_type === "ALREADY_ENROLLED") {
          setIsEnrolled(true)
          setCurrentProgress(data.data.enrollment?.progress_percentage || 0)
        }
      }
    } catch (error) {
    } finally {
      setScenarioLoading(false)
    }
  }

  useEffect(() => {
    /*
     * Runs for signed-out visitors too (CE-001 §2).
     *
     * It used to require a token before fetching anything, which is why the
     * page had no choice but to redirect: with no token there was never a
     * course to render. The course endpoint already decides for itself what a
     * given caller may see — a public MOOC to anyone, a 403 for a restricted
     * one — so the right thing is to ask it and show what comes back.
     *
     * "pending" is still excluded: that is the window before we know whether
     * there is a token, and fetching anonymously there would show a signed-in
     * learner the signed-out view for a moment.
     */
    if (authStatus === "pending") return
    if (!courseId) { setLoading(false); return }

    const currentToken = resolveToken(reduxToken)

    const fetchCourseData = async () => {
      try {
        setLoading(true)
        setError(null)
        setErrorObject(null)
        setAccessDenied(false)

        // Sent only when there is one: an `Authorization: Bearer null` header
        // is worse than no header, because it reads as a bad token rather than
        // as an anonymous caller.
        const authHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        }

        const courseResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
          { headers: authHeaders }
        )

        if (courseResponse.status === 403) {
          let msg = "You don't have access to this course."
          try { const d = await courseResponse.json(); if (d?.message) msg = d.message } catch (_) {}
          setAccessDenied(true)
          setAccessDeniedMessage(msg)
          setLoading(false)
          return
        }

        if (!courseResponse.ok) {
          const errorData = await courseResponse.json()
          throw new Error(errorData.message || "Failed to fetch course details")
        }

        const courseData = await courseResponse.json()
        if (!courseData.success || !courseData.data) throw new Error("Invalid course data received")

        setCourse(courseData.data)

        // An enrolment scenario is about a specific learner, so there is
        // nothing to ask for when nobody is signed in. The sidebar handles a
        // null scenario already — it is the same state as "still checking".
        if (currentToken) await fetchEnrollmentScenario(currentToken)

        if (courseData.data.instructor_id) {
          try {
            const instrRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/${courseData.data.instructor_id}`,
              { headers: authHeaders }
            )
            if (instrRes.ok) {
              const instrData = await instrRes.json()
              setInstructorData({
                instructor: instrData.data?.instructor || courseData.data.instructor,
                courses: instrData.data?.courses || [],
                statistics: instrData.data?.statistics || {},
              })
            }
          } catch (_) {
            setInstructorData({ instructor: courseData.data.instructor, courses: [], statistics: {} })
          }
        }

        setError(null)
        setErrorObject(null)
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching course details")
        setErrorObject(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [authStatus, courseId, reduxUser, reduxToken, reloadKey])

  const handleEnrollDirect = async () => {
    if (!course) return

    // §2: an unauthenticated click asks for a sign-in instead of sending a
    // request that can only fail.
    if (authStatus !== "authenticated") {
      requireAuth(() => {}, "Sign in to enroll in this course.")
      return
    }

    const currentToken = resolveToken(reduxToken)
    setIsEnrolling(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/enroll-direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ course_id: course.id }),
      })

      const data = await response.json()

      if (data.success) {
        setIsEnrolled(true)
        setCurrentProgress(0)
        toast.success("Successfully enrolled in the course!")
        
        if (currentToken) {
          await fetchEnrollmentScenario(currentToken)
        }
      } else {
        toast.error(data.message || "Enrollment failed")
      }
    } catch (error) {
      toast.error("Enrollment failed. Please try again.")
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleRequestAccessCode = () => {
    requireAuth(
      () => setShowAccessCodeModal(true),
      "Sign in to request an access code for this course."
    )
  }

  const handleRedeemSuccess = () => {
    setIsEnrolled(true)
    setCurrentProgress(0)
    
    const currentToken = resolveToken(reduxToken)
    if (currentToken) {
      fetchEnrollmentScenario(currentToken)
    }
  }

  const checkSavedStatus = async () => {
    const currentUser = resolveUser(reduxUser)
    if (!currentUser?.id || !course?.id) return
    
    try {
      const token = resolveToken(reduxToken)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/saved-courses/check/${course.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setIsSaved(data.data.is_saved)
        setSavedId(data.data.saved_id)
      }
    } catch (error) {
    }
  }

  const handleToggleSave = async () => {
    if (authStatus !== "authenticated") {
      requireAuth(() => {}, "Sign in to save this course for later.")
      return
    }

    const currentUser = resolveUser(reduxUser)
    if (!currentUser?.id || !course?.id) return

    if (isSaved && savedId) {
      setSavingCourse(true)
      const token = resolveToken(reduxToken)
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/saved-courses/${savedId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        )
        if (response.ok) {
          setIsSaved(false)
          setSavedId(null)
          toast.success("Course removed from saved")
        }
      } catch (error) {
        toast.error("Failed to remove course")
      } finally {
        setSavingCourse(false)
      }
    } else {
      setShowNotesDialog(true)
    }
  }

  const handleSaveWithNotes = async () => {
    const currentUser = resolveUser(reduxUser)
    if (!currentUser?.id || !course?.id) return
    
    setSavingCourse(true)
    const token = resolveToken(reduxToken)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/saved-courses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            course_id: course.id,
            notes: notes || undefined,
            tags: tags.length > 0 ? tags : undefined,
          }),
        }
      )
      if (response.ok) {
        const data = await response.json()
        setIsSaved(true)
        setSavedId(data.data.saved_id)
        toast.success("Course saved successfully")
        setShowNotesDialog(false)
        setNotes("")
        setTags([])
      }
    } catch (error) {
      toast.error("Failed to save course")
    } finally {
      setSavingCourse(false)
    }
  }

  useEffect(() => {
    if (course) {
      checkSavedStatus()
    }
  }, [course])

  const getBackNavigationPath = () => {
    if (!course) return '/courses'
    if (course.institution?.slug) return `/institutions/${course.institution.slug}/courses`
    return '/courses'
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "beginner": case "BEGINNER": return <Target className="w-4 h-4" />
      case "intermediate": case "INTERMEDIATE": return <Trophy className="w-4 h-4" />
      case "advanced": case "ADVANCED": case "expert": case "EXPERT": return <Crown className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner": case "BEGINNER": return "bg-success/100 hover:bg-success"
      case "intermediate": case "INTERMEDIATE": return "bg-primary hover:bg-primary"
      case "advanced": case "ADVANCED": case "expert": case "EXPERT": return "bg-primary/100 hover:bg-primary"
      default: return "bg-muted hover:bg-secondary"
    }
  }

  if (authStatus === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white select-none">
        <Navigation />
        <CourseDetailSkeleton />
      </div>
    )
  }

  if (!courseId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white select-none">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-destructive/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-lg font-medium text-foreground">Invalid course ID</p>
              <Button className="mt-4" onClick={() => router.push('/courses')}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Courses
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white select-none">
        <Navigation />
        <CourseDetailSkeleton />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white select-none">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-warning/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-warning" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">{accessDeniedMessage}</p>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">This may be a restricted course</p>
                    <p className="text-xs text-primary">Some courses are only available to members of specific institutions or require a special access code (SPOC). Contact your institution administrator if you believe you should have access.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/courses')} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />Browse Courses
                </Button>
                <Button className="bg-primary hover:bg-primary flex items-center gap-2" onClick={() => router.push('/dashboard/learner/learning/courses')}>
                  <BookOpen className="w-4 h-4" />My Learning
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // `error || "Course not found"` collapsed a 500, a timeout and an offline
  // browser into the same panel as a genuinely missing course, and the string
  // it printed came from whichever exception won (C-05). Each kind now has its
  // own state, its own words and — where the request may yet succeed — a retry.
  if (errorObject || error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white select-none">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <ErrorState
            variant="card"
            {...(errorObject
              ? { error: errorObject }
              : error
                ? { kind: "unknown" as const, description: error }
                : { kind: "not-found" as const })}
            onRetry={() => setReloadKey((k) => k + 1)}
            action={{ href: getBackNavigationPath(), label: "Back to courses" }}
          />
        </div>
      </div>
    )
  }

  // The header's button and the enrolment panel share these, so neither can
  // offer an action the other does not.
  enrollActions.direct = handleEnrollDirect
  enrollActions.requestCode = handleRequestAccessCode
  enrollActions.signIn = () => requireAuth(() => {}, "Sign in to enroll in this course.")

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white select-none">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-8 max-w-7xl">
        {/*
          Course header, in the shape the Alison reference uses: a trail
          showing where this course sits, then a two-column hero — what the
          course is on the left, what it looks like and who stands behind it
          on the right — and a strip of the four facts a learner decides on.

          Every action, badge and value below is the one this page already
          had. The enrolment controls stay in `EnrollmentSidebar`, which owns
          the whole enrolment decision; nothing here duplicates it.
        */}
        {/*
          The header, laid out as the reference does it: one full-width card
          carrying breadcrumb, identity and the call to action, then a
          separate card of divided facts beneath it. The two-column body puts
          what the course *is* on the left and what it *looks like* — plus who
          stands behind it — on the right.

          The tabs and the enrolment panel keep their existing two-thirds
          layout below, so nothing this page could already do has moved.
        */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground hover:underline">Home</Link>
              </li>
              <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                <button
                  type="button"
                  onClick={() => router.push(getBackNavigationPath())}
                  className="hover:text-foreground hover:underline"
                >
                  {course.institution?.name || "Courses"}
                </button>
              </li>
              {course.course_category?.name && (
                <>
                  <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
                  <li>{course.course_category.name}</li>
                </>
              )}
              <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
              <li className="font-semibold text-foreground">{course.title}</li>
            </ol>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
            {/* What the course is */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-100 px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                  {getLevelIcon(course.level)}
                  {course.level} Level
                </span>
                {course.is_certificate_available && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-100 px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-orange-900 dark:bg-orange-950 dark:text-orange-200">
                    <Award className="h-3.5 w-3.5" />
                    Certificate
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-100 px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                  <Globe className="h-3.5 w-3.5" />
                  {course.course_type}
                </span>
              </div>

              <h1 className="mt-5 text-[28px] font-bold leading-[1.15] text-foreground sm:text-[34px]">
                {course.title}
              </h1>

              <div className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                <RichContent html={course.short_description || course.description} />
              </div>

              {/*
                The action row. Every button here delegates to the handler the
                enrolment panel already owns — `primaryEnrollAction` reads the
                same scenario the panel does, so the two cannot offer different
                answers. Nothing about enrolment is decided twice.
              */}
              <div className="mt-7 flex flex-wrap items-stretch gap-3">
                <button
                  type="button"
                  onClick={handleToggleSave}
                  disabled={savingCourse}
                  aria-label={isSaved ? "Remove from saved courses" : "Save this course"}
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {savingCourse ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isSaved ? (
                    <BookmarkCheck className="h-5 w-5 text-primary" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </button>

                {(() => {
                  const action = primaryEnrollAction(
                    enrollmentScenario,
                    course,
                    viewerRole,
                    authStatus === "authenticated"
                  )
                  if (action.href) {
                    return (
                      <Link
                        href={action.href}
                        className="flex h-[52px] min-w-[240px] flex-1 items-center justify-center rounded-lg bg-emerald-700 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 sm:flex-none"
                      >
                        {action.label}
                      </Link>
                    )
                  }
                  return (
                    <button
                      type="button"
                      onClick={action.onClick}
                      disabled={action.disabled || isEnrolling}
                      className="flex h-[52px] min-w-[240px] flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                    >
                      {isEnrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                      {action.label}
                    </button>
                  )
                })()}

                {/*
                  The reference's secondary action. Ours is the certificate the
                  course actually offers, so it only appears when there is one.
                */}
                {course.is_certificate_available && (
                  <div className="flex h-[52px] items-center justify-center gap-2 rounded-lg border border-border px-6 text-[15px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Award className="h-5 w-5" />
                    Certificate on completion
                  </div>
                )}
              </div>
            </div>

            {/* What it looks like, and who publishes it */}
            <div className="space-y-5">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted">
                {course.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0 border border-border">
                  <AvatarImage
                    src={
                      course.institution?.logo_url ||
                      course.instructor?.profile_picture_url ||
                      "/placeholder.svg"
                    }
                  />
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {course.institution?.name?.[0] || course.instructor?.first_name?.[0] || "I"}
                  </AvatarFallback>
                </Avatar>
                <p className="text-[15px] leading-relaxed text-foreground">
                  Published by{" "}
                  {course.institution?.name ? (
                    <button
                      type="button"
                      onClick={() => router.push(getBackNavigationPath())}
                      className="font-semibold underline decoration-1 underline-offset-2 hover:text-primary"
                    >
                      {course.institution.name}
                    </button>
                  ) : (
                    <span className="font-semibold underline decoration-1 underline-offset-2">
                      {course.instructor?.first_name} {course.instructor?.last_name || "Expert"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/*
          The facts strip: its own card, four columns divided by rules, each a
          headline with its supporting detail underneath — the shape the
          reference uses to answer "is this course worth my time" at a glance.
        */}
        <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
            <div className="lg:pr-6">
              <p className="text-[15px] font-bold text-foreground">
                {(course.enrollment_count || 0).toLocaleString()} Enrolled
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span className="underline decoration-1 underline-offset-2">
                  {course.average_rating || 0} Average Rating
                </span>
              </p>
            </div>

            <div className="lg:px-6">
              <p className="text-[15px] font-bold text-foreground">Avg. Duration</p>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                {Math.round((course.duration_minutes || 0) / 60)} Hours
                {course.total_lessons ? ` (${course.total_lessons} Lessons)` : ""}
              </p>
            </div>

            <div className="lg:px-6">
              <p className="text-[15px] font-bold text-foreground">Course Content</p>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                {course.modules?.length || 0} Modules
                {course.language ? ` · ${course.language}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-3 lg:pl-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {course.is_certificate_available ? (
                  <Award className="h-5 w-5 text-primary" />
                ) : (
                  <BookOpen className="h-5 w-5 text-primary" />
                )}
              </div>
              <p className="text-[14px] leading-snug text-muted-foreground">
                This course is{" "}
                <span className="font-bold text-foreground underline decoration-1 underline-offset-2">
                  {course.is_certificate_available ? "Certified" : course.course_type}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Content - Fixed width consistency */}
          <div className="lg:col-span-2 space-y-6 max-w-full">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 bg-card p-1 rounded-lg border shadow-sm">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">Overview</TabsTrigger>
                <TabsTrigger value="curriculum" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">Instructor</TabsTrigger>
                <TabsTrigger value="reviews" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">Reviews</TabsTrigger>
              </TabsList>

<TabsContent value="overview" className="space-y-4">
  {course.what_you_will_learn && (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-warning flex-shrink-0" /> 
          What You'll Learn
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="w-full max-w-full">
          <RichContent html={course.what_you_will_learn} />
        </div>
      </CardContent>
    </Card>
  )}
  
  {course.requirements && (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-primary flex-shrink-0" /> 
          Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="w-full max-w-full">
          <RichContent html={course.requirements} />
        </div>
      </CardContent>
    </Card>
  )}
  
  <Card className="border shadow-sm overflow-hidden">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <BookOpen className="w-5 h-5 text-primary flex-shrink-0" /> 
        About This Course
      </CardTitle>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <div className="w-full max-w-full">
        <RichContent html={course.description} />
      </div>
    </CardContent>
  </Card>
</TabsContent>

              <TabsContent value="curriculum">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><Target className="w-5 h-5 text-primary" />Course Curriculum</CardTitle>
                    <CardDescription className="text-xs">
                      {course.modules?.length || 0} modules • {course.total_lessons || 0} lessons • {Math.round((course.duration_minutes || 0) / 60)}h total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {course.modules?.map((module, moduleIndex) => (
                        <AccordionItem key={module.id} value={module.id} className="border rounded-lg mb-2 last:mb-0">
                          <AccordionTrigger className="text-left px-3 py-2 hover:bg-accent rounded-t-lg">
                            <div className="flex items-center justify-between w-full mr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-primary/15 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary">{moduleIndex + 1}</span>
                                </div>
                                <span className="text-sm font-medium">{module.title}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{module.lessons?.length || 0} lessons</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-2">
                            <div className="space-y-1">
                              {module.lessons?.map((lesson) => (
                                <div key={lesson.id} className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                      {lesson.is_preview ? <Play className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-foreground">{lesson.title}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>{lesson.duration_minutes || 0}m</span>
                                        {lesson.is_preview && (
                                          <Badge variant="outline" className="text-xs py-0"><Gift className="w-2 h-2 mr-1" />Preview</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {lesson.is_preview && (
                                    <Button variant="ghost" size="sm" className="text-xs h-7">
                                      <Play className="w-3 h-3 mr-1" />Watch
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Course Instructor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {instructorData ? (
                      <div className="flex flex-col md:flex-row items-start gap-4">
                        <Avatar className="w-20 h-20 border-4 border-primary/20">
                          <AvatarImage src={instructorData.instructor?.profile_picture_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-primary/15 text-primary text-xl">
                            {instructorData.instructor?.first_name?.[0] || "I"}{instructorData.instructor?.last_name?.[0] || "N"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="w-4 h-4 text-warning" />
                            <span className="text-xs font-medium text-primary">Expert Instructor</span>
                          </div>
                          <h3 className="text-xl font-bold text-foreground mb-2">{instructorData.instructor?.first_name} {instructorData.instructor?.last_name || "Expert"}</h3>
                          {instructorData.instructor?.bio && <RichContent html={instructorData.instructor.bio} className="mb-3" />}
                          {instructorData.instructor?.email && <p className="text-xs text-muted-foreground mb-3">📧 {instructorData.instructor.email}</p>}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 bg-warning/10 rounded-lg">
                              <div className="text-lg font-bold text-warning">{instructorData.courses?.length || instructorData.statistics?.total_courses || 0}</div>
                              <div className="text-xs text-muted-foreground">Courses</div>
                            </div>
                            <div className="text-center p-2 bg-primary/10 rounded-lg">
                              <div className="text-lg font-bold text-primary">{instructorData.statistics?.total_enrollments || course.enrollment_count || 0}</div>
                              <div className="text-xs text-muted-foreground">Students</div>
                            </div>
                            <div className="text-center p-2 bg-success/10 rounded-lg">
                              <div className="text-lg font-bold text-success">{instructorData.statistics?.average_rating || course.average_rating || "4.8"}</div>
                              <div className="text-xs text-muted-foreground">Rating</div>
                            </div>
                          </div>
                          {instructorData.courses && instructorData.courses.length > 1 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="text-sm font-semibold text-foreground mb-2">Other Courses ({instructorData.courses.length - 1})</h4>
                              <div className="space-y-2">
                                {instructorData.courses.filter((c: any) => c.id !== courseId).slice(0, 3).map((ic: any) => (
                                  <div key={ic.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors" onClick={() => router.push(`/courses/${ic.id}`)}>
                                    <BookOpen className="w-3 h-3 text-primary flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground line-clamp-1">{ic.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading instructor information...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Student Reviews</CardTitle>
                    <CardDescription className="text-xs">{course.average_rating || 0} average • {course.total_reviews || 0} reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {course.reviews && course.reviews.length > 0 ? (
                      <div className="space-y-3">
                        {course.reviews.map((review) => (
                          <div key={review.id} className="border-b pb-3 last:border-b-0">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={review.user?.profile_picture_url || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">{review.user?.first_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-foreground">{review.user?.first_name} {review.user?.last_name}</span>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star key={star} className={`w-3 h-3 ${star <= review.rating ? "fill-yellow-400 text-warning" : "text-muted-foreground"}`} />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm">No reviews yet. Be the first!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Fixed width consistency */}
          <div className="lg:col-span-1 max-w-full">
            <EnrollmentSidebar
              course={course}
              scenario={enrollmentScenario}
              isEnrolling={isEnrolling}
              onEnrollDirect={handleEnrollDirect}
              onRequestAccessCode={handleRequestAccessCode}
              onRedeemSuccess={handleRedeemSuccess}
              isSaved={isSaved}
              savingCourse={savingCourse}
              onToggleSave={handleToggleSave}
              viewerRole={viewerRole}
              viewerAuthenticated={authStatus === "authenticated"}
              onSignIn={() => requireAuth(() => {}, "Sign in to enroll in this course.")}
            />
          </div>
        </div>
      </div>

      {/*
        CE-001 §2: the shared modal, not a second login form.
        `redirectTo` is this course, so a visitor who signs in from here lands
        back where they were rather than on a dashboard.
      */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        redirectTo={`/courses/${course.id}`}
        message={loginPrompt}
      />

      <AccessCodeRequestModal
        open={showAccessCodeModal}
        onOpenChange={setShowAccessCodeModal}
        courseId={course.id}
        courseTitle={course.title}
        institutionName={course.institution?.name}
        onSuccess={() => {
          const currentToken = resolveToken(reduxToken)
          if (currentToken) {
            fetchEnrollmentScenario(currentToken)
          }
        }}
      />

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Save Course</DialogTitle>
            <DialogDescription>
              Add notes or tags to remember why you saved this course
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Why do you want to take this course? Add your thoughts here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <Input
                placeholder="Add tags separated by commas (e.g., programming, data science)"
                value={tags.join(", ")}
                onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWithNotes} disabled={savingCourse}>
              {savingCourse ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
