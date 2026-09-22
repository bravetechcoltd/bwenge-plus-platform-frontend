// @ts-nocheck
"use client"

import { Badge } from "lucide-react"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface BadgeType {
  id: string
  name: string
  description: string
  icon: string
  rarity: "common" | "rare" | "epic" | "legendary"
  points: number
  category: "learning" | "achievement" | "social" | "milestone"
  earnedAt?: string
  progress?: {
    current: number
    target: number
  }
  isNew?: boolean
}

interface BadgeDisplayProps {
  badge: BadgeType
  size?: "sm" | "md" | "lg" | "xl"
  showAnimation?: boolean
  isNew?: boolean
  showTooltip?: boolean
  onClick?: () => void
  className?: string
}

const rarityColors = {
  common: {
    bg: "from-gray-400 to-gray-600",
    text: "text-muted-foreground dark:text-muted-foreground",
    border: "border-border dark:border-border",
    shadow: "shadow-gray-400/20",
  },
  rare: {
    bg: "from-blue-400 to-blue-600",
    text: "text-primary dark:text-primary",
    border: "border-primary/40 dark:border-primary",
    shadow: "shadow-blue-400/20",
  },
  epic: {
    bg: "from-purple-400 to-purple-600",
    text: "text-primary dark:text-primary",
    border: "border-primary/40 dark:border-primary/40",
    shadow: "shadow-purple-400/20",
  },
  legendary: {
    bg: "from-yellow-400 to-yellow-600",
    text: "text-warning dark:text-warning",
    border: "border-warning/40 dark:border-warning",
    shadow: "shadow-yellow-400/20",
  },
}

const sizeClasses = {
  sm: {
    container: "w-8 h-8",
    icon: "w-4 h-4",
    text: "text-xs",
    badge: "px-1 py-0.5 text-[10px]",
  },
  md: {
    container: "w-12 h-12",
    icon: "w-6 h-6",
    text: "text-sm",
    badge: "px-1.5 py-0.5 text-xs",
  },
  lg: {
    container: "w-16 h-16",
    icon: "w-8 h-8",
    text: "text-base",
    badge: "px-2 py-1 text-sm",
  },
  xl: {
    container: "w-24 h-24",
    icon: "w-12 h-12",
    text: "text-lg",
    badge: "px-3 py-1.5 text-base",
  },
}

const categoryIcons = {
  learning: "🎓",
  achievement: "🏆",
  social: "👥",
  milestone: "🚀",
}

export function BadgeDisplay({
  badge,
  size = "md",
  showAnimation = false,
  isNew = false,
  showTooltip = true,
  onClick,
  className = "",
}: BadgeDisplayProps) {
  const [isHovered, setIsHovered] = useState(false)
  const colors = rarityColors[badge.rarity]
  const sizes = sizeClasses[size]
  const hasProgress = badge.progress && badge.progress.target > 0
  const progressPercentage = hasProgress 
    ? Math.min(100, (badge.progress.current / badge.progress.target) * 100)
    : 0

  const badgeContent = (
    <div
      className={`relative ${sizes.container} rounded-full flex items-center justify-center 
        bg-gradient-to-br ${colors.bg} ${colors.border} border-2
        ${colors.shadow} ${showAnimation ? "animate-pulse" : ""}
        ${onClick ? "cursor-pointer hover:scale-105 transition-transform duration-200" : ""}
        ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        boxShadow: isHovered ? `0 10px 25px -5px var(--tw-shadow-color)` : "",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease-in-out",
      }}
    >
      {/* Badge Icon */}
      <div className="text-white font-bold flex items-center justify-center">
        <span className={`${sizes.icon} flex items-center justify-center`}>
          {badge.icon}
        </span>
      </div>

      {/* Progress Ring for Unearned Badges */}
      {hasProgress && badge.progress.current < badge.progress.target && (
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progressPercentage * 2.83} 283`}
            className="transition-all duration-500"
          />
        </svg>
      )}

      {/* New Indicator */}
      {isNew && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive/100 rounded-full animate-ping" />
      )}

      {/* Category Icon */}
      <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-card dark:bg-card rounded-full flex items-center justify-center text-xs shadow-md">
        {categoryIcons[badge.category]}
      </div>

      {/* Earned Checkmark */}
      {badge.earnedAt && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-success/100 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Rarity Badge */}
      <div
        className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 
          px-2 py-0.5 rounded-full text-white font-bold ${sizes.badge}
          bg-gradient-to-r ${colors.bg} shadow-md`}
      >
        {badge.rarity.toUpperCase()}
      </div>

      {/* Points Indicator */}
      <div
        className={`absolute -top-2 left-1/2 transform -translate-x-1/2 
          px-1.5 py-0.5 rounded-full bg-card dark:bg-card text-xs font-bold
          ${colors.text} shadow-md flex items-center gap-1`}
      >
        <span className="text-xs">+{badge.points}</span>
      </div>
    </div>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs p-4 bg-card dark:bg-card border shadow-xl"
          side="top"
          align="center"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-br ${colors.bg}`}>
                <span className="text-white text-sm">{badge.icon}</span>
              </div>
              <div>
                <h4 className="font-bold text-foreground dark:text-white">{badge.name}</h4>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.text} bg-opacity-10 bg-current`}>
                    {badge.rarity.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">+{badge.points} points</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">{badge.description}</p>
            
            {hasProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {badge.progress.current}/{badge.progress.target}
                  </span>
                </div>
                <div className="h-2 bg-secondary dark:bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${colors.bg} transition-all duration-500`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
            
            {badge.earnedAt ? (
              <div className="text-xs text-muted-foreground">
                Earned on {new Date(badge.earnedAt).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Complete requirements to earn this badge
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface BadgeCollectionProps {
  badges: BadgeType[]
  title?: string
  description?: string
  columns?: 2 | 3 | 4 | 5
  showProgress?: boolean
  emptyMessage?: string
}

export function BadgeCollection({
  badges,
  title = "Badge Collection",
  description,
  columns = 4,
  showProgress = true,
  emptyMessage = "No badges earned yet",
}: BadgeCollectionProps) {
  const earnedBadges = badges.filter(b => b.earnedAt)
  const unearnedBadges = badges.filter(b => !b.earnedAt)
  
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5",
  }

  const StatCard = ({ title, value, icon }: { title: string; value: number; icon: string }) => (
    <div className="bg-muted/50 dark:bg-card rounded-lg p-4 text-center">
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground dark:text-muted-foreground">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
    </div>
  )

  if (badges.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted dark:bg-card flex items-center justify-center">
          <Badge className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Badges Yet</h3>
        <p className="text-muted-foreground dark:text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="text-muted-foreground dark:text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <StatCard
            title="Total"
            value={badges.length}
            icon="🏆"
          />
          <StatCard
            title="Earned"
            value={earnedBadges.length}
            icon="✅"
          />
        </div>
      </div>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="font-medium mb-4 text-success dark:text-success flex items-center gap-2">
            <span className="w-2 h-2 bg-success/100 rounded-full" />
            Earned Badges ({earnedBadges.length})
          </h3>
          <div className={`grid ${gridCols[columns]} gap-4`}>
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center">
                <BadgeDisplay
                  badge={badge}
                  size="lg"
                  showTooltip
                />
                <span className="mt-2 text-sm font-medium text-center line-clamp-1">
                  {badge.name}
                </span>
                {showProgress && badge.earnedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(badge.earnedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unearned Badges */}
      {unearnedBadges.length > 0 && (
        <div>
          <h3 className="font-medium mb-4 text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-muted rounded-full" />
            Available Badges ({unearnedBadges.length})
          </h3>
          <div className={`grid ${gridCols[columns]} gap-4`}>
            {unearnedBadges.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center opacity-75">
                <BadgeDisplay
                  badge={badge}
                  size="lg"
                  showTooltip
                />
                <span className="mt-2 text-sm font-medium text-center line-clamp-1">
                  {badge.name}
                </span>
                {showProgress && badge.progress && (
                  <div className="text-xs text-muted-foreground">
                    {badge.progress.current}/{badge.progress.target}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rarity Distribution */}
      <div className="pt-6 border-t">
        <h4 className="font-medium mb-3">Badge Distribution</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(rarityColors).map(([rarity, colors]) => {
            const count = badges.filter(b => b.rarity === rarity).length
            const earned = badges.filter(b => b.rarity === rarity && b.earnedAt).length
            
            return (
              <div
                key={rarity}
                className={`p-3 rounded-lg border ${colors.border} bg-gradient-to-br ${colors.bg} bg-opacity-10`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{rarity}</span>
                  <span className="text-sm">
                    {earned}/{count}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary dark:bg-secondary rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full bg-gradient-to-r ${colors.bg}`}
                    style={{ width: `${count > 0 ? (earned / count) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}