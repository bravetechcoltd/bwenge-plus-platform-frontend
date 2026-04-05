"use client"

import React from 'react'
import { Clock, Users, Star, Award, BookOpen, Play, ArrowRight, Lock, Globe } from 'lucide-react'
import Link from 'next/link'

/* ── Base 3D wrapper (used by CuratedPathCarousel etc.) ───────────────── */
interface Card3DProps {
  children: React.ReactNode
  className?: string
  accentColor?: string
  onClick?: () => void
}

export function Card3D({ children, className = '', accentColor = '#2D6A4F', onClick }: Card3DProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      className={`relative bg-white transition-all duration-300 cursor-pointer ${className}`}
      style={{
        border: `1px solid ${isHovered ? 'rgba(45,106,79,0.2)' : 'rgba(30,47,94,0.08)'}`,
        boxShadow: isHovered
          ? '0 24px 48px -12px rgba(45,106,79,0.18), 0 0 0 1px rgba(45,106,79,0.06)'
          : '0 4px 20px -4px rgba(0,0,0,0.06)',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Animated accent top bar */}
      <div
        className="absolute top-0 left-0 h-[3px] transition-all duration-400 ease-out"
        style={{
          width: isHovered ? '100%' : '0%',
          background: `linear-gradient(90deg, ${accentColor}, #74C69D)`,
        }}
      />
      {children}
    </div>
  )
}

/* ── CPD Course Card — replaces all course-card variants ─────────────── */
export interface BwengeCourseCardProps {
  id: string
  title: string
  description?: string
  short_description?: string
  thumbnail_url?: string
  instructor?: {
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
    name: string
    logo_url?: string
  }
  category?: {
    id?: string
    name: string
  }
  status?: string
  /* display variants */
  variant?: 'browse' | 'dashboard' | 'admin' | 'instructor' | 'student' | 'default'
  showActions?: boolean
  showInstitution?: boolean
  index?: number
  onLearnMoreClick?: (id: string) => void
  onAnalytics?: (id: string) => void
  onShare?: (id: string) => void
  linkPrefix?: string
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

function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '—'
  if (price === 0) return 'Free'
  return `${price.toLocaleString()} RWF`
}

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=240&fit=crop'

export function BwengeCourseCard({
  id, title, description, short_description, thumbnail_url,
  instructor, level, course_type, price, original_price,
  average_rating, total_reviews, enrollment_count, duration_minutes,
  total_lessons, tags = [], is_popular, is_certificate_available,
  institution, category, status,
  variant = 'default', showActions = true, showInstitution = true,
  index = 0, onLearnMoreClick, linkPrefix,
}: BwengeCourseCardProps) {
  const [hovered, setHovered] = React.useState(false)

  const accentColor = levelColor(level)
  const href = linkPrefix ? `${linkPrefix}/${id}` : `/courses/${id}`

  const numRating = typeof average_rating === 'string'
    ? parseFloat(average_rating)
    : (average_rating ?? 0)

  const handleClick = () => {
    if (onLearnMoreClick) onLearnMoreClick(id)
  }

  return (
    <div
      className="relative bg-white flex flex-col h-full transition-all duration-300 cursor-pointer overflow-hidden"
      style={{
        border: `1px solid ${hovered ? 'rgba(45,106,79,0.22)' : 'rgba(30,47,94,0.08)'}`,
        boxShadow: hovered
          ? '0 20px 40px -8px rgba(45,106,79,0.18)'
          : '0 4px 16px -4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 h-[3px] z-10 transition-all duration-500"
        style={{
          width: hovered ? '100%' : '32px',
          background: `linear-gradient(90deg, #2D6A4F, #74C69D)`,
        }}
      />

      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden bg-[#F8F9FA] flex-shrink-0">
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
            backgroundColor: hovered ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0)',
          }}
        >
          <div
            className="w-11 h-11 flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'scale(1)' : 'scale(0.8)',
            }}
          >
            <Play className="w-4 h-4 ml-0.5" style={{ color: '#2D6A4F' }} fill="#2D6A4F" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {level && (
            <span
              className="px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider"
              style={{ backgroundColor: levelColor(level) }}
            >
              {levelLabel(level)}
            </span>
          )}
          {course_type && (
            <span
              className="px-2 py-0.5 text-[10px] font-semibold text-white flex items-center gap-1 uppercase"
              style={{ backgroundColor: course_type === 'PRIVATE' ? '#8b5cf6' : '#2D6A4F' }}
            >
              {course_type === 'PRIVATE' ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
              {course_type}
            </span>
          )}
        </div>

        {/* Popular badge */}
        {is_popular && (
          <span
            className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: '#E76F51' }}
          >
            HOT
          </span>
        )}

        {/* Institution logo */}
        {showInstitution && institution?.logo_url && (
          <div
            className="absolute bottom-3 left-3 w-8 h-8 bg-white flex items-center justify-center"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            <img
              src={institution.logo_url}
              alt={institution.name}
              className="w-6 h-6 object-contain"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category + Rating */}
        <div className="flex items-center justify-between mb-2">
          {category && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
              style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: '#2D6A4F' }}
            >
              {category.name}
            </span>
          )}
          {numRating > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Star className="w-3.5 h-3.5 fill-current" style={{ color: '#E9C46A' }} />
              <span className="text-xs font-bold" style={{ color: '#1E2F5E' }}>
                {numRating.toFixed(1)}
              </span>
              {total_reviews !== undefined && (
                <span className="text-[10px]" style={{ color: '#717182' }}>
                  ({total_reviews.toLocaleString()})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-[13px] font-bold leading-snug line-clamp-2 mb-1.5 transition-colors duration-200"
          style={{ color: hovered ? '#2D6A4F' : '#1E2F5E' }}
        >
          {title}
        </h3>

        {/* Instructor */}
        {instructor && (
          <div className="flex items-center gap-1.5 mb-2">
            {instructor.profile_picture_url ? (
              <img
                src={instructor.profile_picture_url}
                alt={`${instructor.first_name} ${instructor.last_name}`}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-5 h-5 flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: '#2D6A4F' }}
              >
                {instructor.first_name?.[0]}{instructor.last_name?.[0]}
              </div>
            )}
            <span className="text-[11px]" style={{ color: '#717182' }}>
              {instructor.first_name} {instructor.last_name}
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-[11px] leading-relaxed line-clamp-2 mb-3 flex-1" style={{ color: '#717182' }}>
          {short_description || description}
        </p>

        {/* Stats row */}
        <div
          className="flex items-center gap-3 py-2.5 mb-3"
          style={{ borderTop: '1px solid rgba(30,47,94,0.06)', borderBottom: '1px solid rgba(30,47,94,0.06)' }}
        >
          {enrollment_count !== undefined && (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#717182' }}>
              <Users className="w-3 h-3" style={{ color: '#74C69D' }} />
              {enrollment_count.toLocaleString()}
            </div>
          )}
          {duration_minutes !== undefined && (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#717182' }}>
              <Clock className="w-3 h-3" style={{ color: '#74C69D' }} />
              {formatDuration(duration_minutes)}
            </div>
          )}
          {total_lessons !== undefined && (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#717182' }}>
              <BookOpen className="w-3 h-3" style={{ color: '#74C69D' }} />
              {total_lessons} lessons
            </div>
          )}
          {is_certificate_available && (
            <div className="flex items-center gap-1 text-[10px] ml-auto" style={{ color: '#E9C46A' }}>
              <Award className="w-3 h-3" />
              <span className="font-medium" style={{ color: '#717182' }}>Cert.</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 font-medium"
                style={{
                  backgroundColor: 'rgba(45,106,79,0.06)',
                  color: '#2D6A4F',
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[10px]" style={{ color: '#717182' }}>+{tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Institution name (text) */}
        {showInstitution && institution?.name && !institution.logo_url && (
          <p className="text-[10px] mb-2" style={{ color: '#717182' }}>
            by <span className="font-medium" style={{ color: '#2D6A4F' }}>{institution.name}</span>
          </p>
        )}

        {/* Price + Action */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 mt-auto" style={{ borderTop: '1px solid rgba(30,47,94,0.06)' }}>
            <div>
              <span className="text-sm font-bold" style={{ color: '#2D6A4F' }}>
                {formatPrice(price)}
              </span>
              {original_price && original_price > (price ?? 0) && (
                <span className="text-[10px] line-through ml-1.5" style={{ color: '#717182' }}>
                  {formatPrice(original_price)}
                </span>
              )}
              {status === 'DRAFT' && (
                <span
                  className="ml-2 text-[9px] font-bold px-1.5 py-0.5"
                  style={{ backgroundColor: '#E9C46A', color: '#fff' }}
                >
                  DRAFT
                </span>
              )}
            </div>

            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 transition-all duration-200"
              style={{
                backgroundColor: hovered ? '#2D6A4F' : 'transparent',
                color: hovered ? '#fff' : '#2D6A4F',
                border: '1.5px solid #2D6A4F',
              }}
            >
              {variant === 'student' ? 'Continue' : variant === 'dashboard' || variant === 'admin' || variant === 'instructor' ? 'Manage' : 'View'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
