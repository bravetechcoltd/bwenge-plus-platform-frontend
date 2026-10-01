"use client"

import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  GraduationCap,
  Layers,
  Lightbulb,
  Network,
  Target,
  Users2,
} from "lucide-react"

/**
 * A product's icon, by name (PR-001).
 *
 * The icons are listed explicitly rather than looked up dynamically out of
 * lucide, because a dynamic import of the whole icon set would pull every icon
 * into the bundle to render one. It also means an unknown name — a typo, or a
 * row written before an icon was added — degrades to a sensible glyph instead
 * of throwing inside a render.
 */
const ICONS: Record<string, any> = {
  GraduationCap,
  BookOpen,
  Building2,
  Briefcase,
  Layers,
  Network,
  Target,
  Lightbulb,
  BarChart3,
  Users2,
}

export function ProductIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string
  className?: string
}) {
  const Icon = ICONS[name] || Layers
  return <Icon className={className} strokeWidth={1.9} />
}
