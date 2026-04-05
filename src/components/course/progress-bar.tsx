"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Target, Award, TrendingUp } from "lucide-react"

interface ProgressBarProps {
  progress: number
  completedLessons: number
  totalLessons: number
  timeSpent?: number
  estimatedTime?: number
  showDetails?: boolean
  showTarget?: boolean
  targetScore?: number
  currentScore?: number
  showCertificate?: boolean
  certificateEarned?: boolean
}

export function ProgressBar({
  progress,
  completedLessons,
  totalLessons,
  timeSpent,
  estimatedTime,
  showDetails = true,
  showTarget = false,
  targetScore,
  currentScore,
  showCertificate = false,
  certificateEarned = false,
}: ProgressBarProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "bg-success"
    if (progress >= 70) return "bg-primary"
    if (progress >= 50) return "bg-warning"
    if (progress >= 30) return "bg-warning"
    return "bg-destructive"
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span className="text-sm font-medium">Course Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
          {showTarget && targetScore && currentScore && (
            <Badge
              variant={currentScore >= targetScore ? "default" : "secondary"}
              className="text-xs"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {currentScore}/{targetScore}
            </Badge>
          )}
        </div>
      </div>

      <Progress value={progress} className={`h-2 ${getProgressColor(progress)}`} />

      {showDetails && (
        <div className="flex flex-wrap items-center justify-between text-sm text-muted-foreground gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>
                {completedLessons}/{totalLessons} lessons
              </span>
            </div>
            {timeSpent && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeSpent)} spent</span>
              </div>
            )}
            {showCertificate && (
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4 text-warning" />
                <span>{certificateEarned ? "Certificate Earned" : "Certificate Available"}</span>
              </div>
            )}
          </div>
          {estimatedTime && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{formatTime(estimatedTime)} remaining
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}