import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateTempId = () => {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const formatMessageTime = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    
    if (isNaN(date.getTime())) {
      return "Invalid date"
    }

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return "just now"
    }

    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    }

    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    }

    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    }

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }

    return date.toLocaleDateString("en-US", options)
  } catch (error) {
    return "Unknown time"
  }
}

export const isTempId = (id: any): boolean => {
  if (typeof id !== 'string') return false
  return id.startsWith('temp-')
}
/**
 * A rating, as text (RAT-001).
 *
 * `average_rating` is a Postgres `numeric` column, and node-postgres returns
 * numerics as strings — the value arrives as "4.50", not 4.5. So
 * `rating?.toFixed(1)` passes the optional chain, because a non-empty string is
 * not null, and then throws: strings have no toFixed. Eight call sites across
 * the application had that exact line, each one a crash waiting for a screen
 * that happened to show a rated course.
 *
 * It is deliberately not `Number(value).toFixed(1)` alone: NaN formats quite
 * happily as "NaN", so a malformed value would render as text on the page
 * rather than being caught. Anything unparseable gives the fallback instead.
 *
 * A course nobody has rated has no rating, which is why the fallback defaults
 * to a dash rather than "0.0" — zero reads as the worst possible score.
 */
export function formatRating(value: unknown, fallback: string = "—"): string {
  if (value === null || value === undefined || value === "") return fallback
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed <= 0) return fallback
  return parsed.toFixed(1)
}

/**
 * The same coercion without the formatting, for comparisons and arithmetic.
 *
 * `rating >= 4.8` against the string "4.50" compares lexically and is wrong in
 * ways that look right for most values.
 */
export function toNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined || value === "") return fallback
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
