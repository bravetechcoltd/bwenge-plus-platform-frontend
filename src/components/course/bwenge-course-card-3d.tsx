"use client"

import React from 'react'
import { Clock, Users, Star, Award, BookOpen, Play, ArrowRight, Lock, Globe, CheckCircle, BarChart3 } from 'lucide-react'

/* ── CPD Smart Compact 3D Course Card ─────────────────────────────── */

/** Enrollment-specific props — pass these to render learner dashboard mode */
export interface EnrollmentCardData {
  progress_percentage: number
  enrollment_status: string        // "COMPLETED" | "PENDING" | "ACTIVE" etc.
  approval_status: string          // "APPROVED" | "PENDING"
  time_spent_minutes: number
  completed_lessons: number
  total_lessons_count: number
  certificate_issued: boolean
  final_score: string | null
  /** Full href for action button */
  action_href: string
  /** Whether the progress bar should animate from 0 */
  animate: boolean
}

export interface BwengeCourseCard3DProps {
  id: string
  title: string
  description?: string
  short_description?: string
  thumbnail_url?: string
  instructor?: {
    id?: string
    first_name: string
    last_name: string
    profile_picture_url?: string
  }
  level?: string
  course_type?: string
  price?: number
  original_price?: number
  average_rating?: number
  total_reviews?: number
  enrollment_count?: number
  duration_minutes?: number
  total_lessons?: number
  tags?: string[]
  is_popular?: boolean
  is_certificate_available?: boolean
  institution?: {
    id?: string
    name: string
    logo_url?: string
  }
  category?: {
    id?: string
    name: string
  }
  status?: string
  variant?: 'browse' | 'dashboard' | 'admin' | 'instructor' | 'student' | 'default'
  showActions?: boolean
  showInstitution?: boolean
  index?: number
  onLearnMoreClick?: (id: string) => void
  linkPrefix?: string
  /** Pass enrollment data to render learner-dashboard card mode */
  enrollmentData?: EnrollmentCardData
}

function levelColor(level?: string): string {
  switch (level?.toUpperCase()) {
    case 'BEGINNER':     return '#22c55e'
    case 'INTERMEDIATE': return '#3b82f6'
    case 'ADVANCED':     return '#8b5cf6'
    case 'EXPERT':       return '#ec4899'
    default:             return '#64748b'
  }
}

function levelLabel(level?: string): string {
  if (!level) return 'Course'
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
}

function formatDuration(mins?: number): string {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`
  return `${m}m`
}

/** Strip HTML tags from rich-text editor content so the card shows clean plain text. */
function stripHtml(text?: string): string {
  if (!text) return ''
  if (!/<[a-z][\s\S]*>/i.test(text)) return text
  // Use a temporary element to decode entities and strip tags
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div')
    tmp.innerHTML = text
    return tmp.textContent || tmp.innerText || ''
  }
  // SSR fallback: regex strip
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
}

function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '—'
  if (price === 0) return 'Free'
  return `${price.toLocaleString()} RWF`
}

function formatTimeSpent(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function progressBarColor(pct: number): string {
  if (pct >= 100) return 'var(--success)'
  if (pct >= 50) return 'var(--primary)'
  return 'var(--warning)'
}

const DEFAULT_THUMBNAIL =
  '/default_course.jpg'

export function BwengeCourseCard3D({
  id, title, description, short_description, thumbnail_url,
  instructor, level, course_type, price, original_price,
  average_rating, total_reviews, enrollment_count, duration_minutes,
  total_lessons, tags = [], is_popular, is_certificate_available,
  institution, category, status,
  variant = 'default', showActions = true, showInstitution = true,
  index = 0, onLearnMoreClick, linkPrefix,
  enrollmentData,
}: BwengeCourseCard3DProps) {
  const isEnrollmentMode = !!enrollmentData
  const [hovered, setHovered] = React.useState(false)

  const numRating = typeof average_rating === 'string'
    ? parseFloat(average_rating)
    : (average_rating ?? 0)

  const handleClick = () => {
    if (onLearnMoreClick) onLearnMoreClick(id)
  }

  return (
    <div
      className={`
        relative bg-card flex flex-col h-full cursor-pointer overflow-hidden
        border border-border rounded-xl
        transition-all duration-300 ease-out
        ${hovered ? 'border-primary/30 shadow-2xl -translate-y-1.5 dark:shadow-primary/10' : 'shadow-sm hover:shadow-md'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 h-[3px] z-10 transition-all duration-500 rounded-t-xl"
        style={{
          width: hovered ? '100%' : '32px',
          background: 'linear-gradient(90deg, hsl(var(--primary)), #74C69D)',
        }}
      />

      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden bg-muted flex-shrink-0 rounded-t-xl">
        <img
          src={thumbnail_url || DEFAULT_THUMBNAIL}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500"
          style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_THUMBNAIL }}
        />

        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{
            backgroundColor: hovered ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full bg-card/95 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all duration-300"
            style={{
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'scale(1)' : 'scale(0.7)',
            }}
          >
            <Play className="w-4 h-4 ml-0.5 text-primary" fill="currentColor" />
          </div>
        </div>

        {/* Badges row */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {level && (
            <span
              className="px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider rounded-md"
              style={{ backgroundColor: levelColor(level) }}
            >
              {levelLabel(level)}
            </span>
          )}
          {course_type && (
            <span
              className="px-2 py-0.5 text-[10px] font-semibold text-white flex items-center gap-1 uppercase rounded-md"
              style={{ backgroundColor: course_type === 'SPOC' ? '#8b5cf6' : 'hsl(var(--primary))' }}
            >
              {course_type === 'SPOC' ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
              {course_type}
            </span>
          )}
        </div>

        {/* Popular badge */}
        {is_popular && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-bold text-white rounded-md bg-orange-500">
            HOT
          </span>
        )}

        {/* Certificate ribbon — enrollment mode only */}
        {isEnrollmentMode && enrollmentData.certificate_issued && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm"
            style={{ backgroundColor: 'var(--gamification-gold)', color: 'var(--foreground)' }}>
            <Award className="w-3 h-3" />
            Certified
          </div>
        )}

        {/* Institution logo */}
        {showInstitution && institution?.logo_url && (
          <div className="absolute bottom-2.5 left-2.5 w-7 h-7 bg-card/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md">
            <img
              src={institution.logo_url}
              alt={institution.name}
              className="w-5 h-5 rounded-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1">
        {/* Category + Rating row */}
        <div className="flex items-center justify-between mb-1.5">
          {category && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
              {category.name}
            </span>
          )}
          {numRating > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Star className="w-3.5 h-3.5 fill-current text-warning" />
              <span className="text-xs font-bold text-foreground">
                {numRating.toFixed(1)}
              </span>
              {total_reviews !== undefined && (
                <span className="text-[10px] text-muted-foreground">
                  ({total_reviews.toLocaleString()})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          className={`text-[13px] font-bold leading-snug line-clamp-2 mb-1 transition-colors duration-200
            ${hovered ? 'text-primary' : 'text-foreground'}`}
        >
          {title}
        </h3>

        {/* Instructor */}
        {instructor && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {instructor.profile_picture_url ? (
              <img
                src={instructor.profile_picture_url}
                alt={`${instructor.first_name} ${instructor.last_name}`}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-primary">
                {instructor.first_name?.[0]}{instructor.last_name?.[0]}
              </div>
            )}
            <span className="text-[11px] text-muted-foreground truncate">
              {instructor.first_name} {instructor.last_name}
            </span>
          </div>
        )}

        {/* ─── ENROLLMENT MODE: progress + enrollment footer ─── */}
        {isEnrollmentMode ? (
          <>
            {/* Progress bar */}
            <div className="mb-1.5">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: enrollmentData.animate ? `${enrollmentData.progress_percentage}%` : '0%',
                    backgroundColor: progressBarColor(enrollmentData.progress_percentage),
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {enrollmentData.progress_percentage}%
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {enrollmentData.completed_lessons}/{enrollmentData.total_lessons_count} lessons
                </span>
              </div>
            </div>

            {/* Enrollment stats row — clean 3-column layout */}
            <div className="grid grid-cols-3 gap-1 py-1.5 mb-2 border-t border-b border-border">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-center">
                <Clock className="w-3 h-3 shrink-0 text-primary/70" />
                <span className="truncate">{formatTimeSpent(enrollmentData.time_spent_minutes)}</span>
              </div>
              {enrollmentData.final_score ? (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-center">
                  <BarChart3 className="w-3 h-3 shrink-0 text-primary/70" />
                  <span className="truncate">{parseFloat(enrollmentData.final_score).toFixed(0)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-center">
                  <BookOpen className="w-3 h-3 shrink-0 text-primary/70" />
                  <span className="truncate">{enrollmentData.total_lessons_count} lessons</span>
                </div>
              )}
              {/* Status indicator */}
              {enrollmentData.certificate_issued ? (
                <div className="flex items-center gap-1 text-[10px] font-medium justify-center" style={{ color: 'var(--gamification-gold)' }}>
                  <Award className="w-3 h-3 shrink-0" />
                  <span className="truncate">Certified</span>
                </div>
              ) : enrollmentData.enrollment_status === 'COMPLETED' ? (
                <div className="flex items-center gap-1 text-[10px] font-medium justify-center" style={{ color: 'var(--success)' }}>
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">Completed</span>
                </div>
              ) : enrollmentData.approval_status === 'PENDING' ? (
                <div className="flex items-center gap-1 text-[10px] font-medium justify-center" style={{ color: 'var(--warning)' }}>
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate">Awaiting</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-medium justify-center" style={{ color: 'var(--primary)' }}>
                  <Play className="w-3 h-3 shrink-0" />
                  <span className="truncate">In Progress</span>
                </div>
              )}
            </div>

            {/* Action button — full width, clean */}
            <div className="mt-auto">
              {enrollmentData.approval_status === 'PENDING' ? (
                <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{ backgroundColor: 'color-mix(in oklch, var(--warning) 12%, transparent)', color: 'var(--warning)' }}>
                  <Clock className="w-3 h-3" />
                  Pending Approval
                </div>
              ) : (
                <a
                  href={enrollmentData.action_href}
                  onClick={(e) => e.stopPropagation()}
                  className={`
                    flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold
                    transition-all duration-200 w-full
                    ${enrollmentData.enrollment_status === 'COMPLETED' && enrollmentData.progress_percentage === 100
                      ? `border border-primary/30 ${hovered ? 'bg-primary text-primary-foreground' : 'bg-transparent text-primary'}`
                      : `${hovered ? 'bg-primary/90' : 'bg-primary'} text-primary-foreground`
                    }
                  `}
                >
                  {enrollmentData.enrollment_status === 'COMPLETED' && enrollmentData.progress_percentage === 100
                    ? 'Review Course'
                    : 'Continue Learning'}
                  <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            {/* ─── BROWSE MODE: description + stats + price (original) ─── */}
            {/* Description — strip HTML from rich-text editor content */}
            <p className="text-[11px] leading-relaxed line-clamp-2 mb-2.5 flex-1 text-muted-foreground">
              {stripHtml(short_description) || stripHtml(description)}
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-3 py-2 mb-2.5 border-t border-b border-border">
              {enrollment_count !== undefined && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Users className="w-3 h-3 text-primary/70" />
                  {enrollment_count.toLocaleString()}
                </div>
              )}
              {duration_minutes !== undefined && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3 text-primary/70" />
                  {formatDuration(duration_minutes)}
                </div>
              )}
              {total_lessons !== undefined && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <BookOpen className="w-3 h-3 text-primary/70" />
                  {total_lessons} lessons
                </div>
              )}
              {is_certificate_available && (
                <div className="flex items-center gap-1 text-[10px] ml-auto text-warning">
                  <Award className="w-3 h-3" />
                  <span className="font-medium text-muted-foreground">Cert.</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2.5">
                {tags.slice(0, 2).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 font-medium rounded-md bg-primary/5 text-primary dark:bg-primary/10"
                  >
                    {tag}
                  </span>
                ))}
                {tags.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
                )}
              </div>
            )}

            {/* Institution name (text fallback) */}
            {showInstitution && institution?.name && !institution.logo_url && (
              <p className="text-[10px] mb-2 text-muted-foreground">
                by <span className="font-medium text-primary">{institution.name}</span>
              </p>
            )}

            {/* Price + Action */}
            {showActions && (
              <div className="flex items-center justify-between pt-2 mt-auto border-t border-border">
                <div>
                  <span className="text-sm font-bold text-primary">
                    {formatPrice(price)}
                  </span>
                  {original_price && original_price > (price ?? 0) && (
                    <span className="text-[10px] line-through ml-1.5 text-muted-foreground">
                      {formatPrice(original_price)}
                    </span>
                  )}
                  {status === 'DRAFT' && (
                    <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning text-white">
                      DRAFT
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onLearnMoreClick) {
                      onLearnMoreClick(id)
                    }
                  }}
                  className={`
                    flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg
                    border-[1.5px] border-primary transition-all duration-200
                    ${hovered
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-primary'
                    }
                  `}
                >
                  {variant === 'student' ? 'Continue' : variant === 'dashboard' || variant === 'admin' || variant === 'instructor' ? 'Manage' : 'View'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
