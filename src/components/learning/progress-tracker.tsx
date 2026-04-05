import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, Clock, CheckCircle, BookOpen, Award } from "lucide-react"

interface ProgressStats {
  overallProgress: number
  completedLessons: number
  totalLessons: number
  completedAssessments: number
  totalAssessments: number
  timeSpent: number
  averageScore: number
  streak: number
}

interface ProgressTrackerProps {
  stats: ProgressStats
  courseTitle: string
}

export function ProgressTracker({ stats, courseTitle }: ProgressTrackerProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-success"
    if (progress >= 60) return "text-primary"
    if (progress >= 40) return "text-warning"
    return "text-warning"
  }

  return (
    <Card className="mb-6 border border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/50">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Trophy className="w-5 h-5 text-[#0158B7]" />
          Learning Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className={`text-sm font-bold ${getProgressColor(stats.overallProgress)}`}>
                {Math.round(stats.overallProgress)}%
              </span>
            </div>
            <Progress value={stats.overallProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Keep going! You're making great progress in {courseTitle}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {stats.completedLessons}/{stats.totalLessons}
              </div>
              <div className="text-xs text-muted-foreground">Lessons</div>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Award className="w-4 h-4 text-warning" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {stats.completedAssessments}/{stats.totalAssessments}
              </div>
              <div className="text-xs text-muted-foreground">Assessments</div>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-success" />
              </div>
              <div className="text-lg font-bold text-foreground">{formatTime(stats.timeSpent)}</div>
              <div className="text-xs text-muted-foreground">Time Spent</div>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats.averageScore}%</div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </div>
          </div>

          {/* Achievements */}
          <div className="flex items-center gap-2 flex-wrap">
            {stats.streak >= 7 && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-[#0158B7]/10 text-[#0158B7]">
                🔥 {stats.streak} day streak
              </Badge>
            )}
            {stats.overallProgress >= 50 && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-success/10 text-success">
                <Target className="w-3 h-3" />
                Halfway there!
              </Badge>
            )}
            {stats.averageScore >= 90 && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-warning/10 text-warning">
                <Trophy className="w-3 h-3" />
                High achiever
              </Badge>
            )}
            {stats.completedAssessments > 0 && stats.completedAssessments === stats.totalAssessments && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary">
                <CheckCircle className="w-3 h-3" />
                All assessments complete
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}