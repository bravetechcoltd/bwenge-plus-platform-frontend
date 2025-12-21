"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ProgressRing } from "@/components/gamification/progress-ring"
import { Leaderboard } from "@/components/gamification/leaderboard"
import { BadgeDisplay } from "@/components/gamification/badge-display"
import {
  BookOpen,
  Trophy,
  Clock,
  Target,
  Star,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  PlayCircle,
  Users,
  Flame,
  BarChart3,
  TargetIcon,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import Cookies from "js-cookie"

interface StudentProgressDashboardProps {
  userId: string
}

export function StudentProgressDashboard({ userId }: StudentProgressDashboardProps) {
  const [progressData, setProgressData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const { token, user } = useAuth()

  useEffect(() => {
    if (user && token) {
      fetchProgressData()
    }
  }, [userId, user, token])

  const fetchProgressData = async () => {
    setLoading(true)
    try {
      const authToken = token || Cookies.get("bwenge_token")
      if (!authToken) throw new Error("No authentication token")
      if (!user) throw new Error("No user found")

      // Fetch user progress data
      const [enrollmentsRes, activityRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ user_id: user.id }),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/user/${user.id}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }),
      ])

      if (!enrollmentsRes.ok || !activityRes.ok) {
        throw new Error("Failed to fetch progress data")
      }

      const [enrollmentsData, activityData] = await Promise.all([
        enrollmentsRes.json(),
        activityRes.json(),
      ])

      const enrollments = enrollmentsData.data || []
      const activity = activityData.data || {}

      // Calculate statistics
      const totalCourses = enrollments.length
      const completedCourses = enrollments.filter((e: any) => e.status === "COMPLETED").length
      const activeCourses = enrollments.filter((e: any) => e.status === "ACTIVE").length
      const totalTimeSpent = enrollments.reduce((sum: number, e: any) => sum + (e.total_time_spent_minutes || 0), 0)
      const averageProgress = enrollments.length > 0 
        ? enrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / enrollments.length
        : 0

      const mockData = {
        overview: {
          totalPoints: Math.floor(totalTimeSpent * 0.5 + completedCourses * 100 + activeCourses * 50),
          level: Math.floor(totalTimeSpent / 600) + 1,
          streakDays: activity.current_streak || 0,
          coursesEnrolled: totalCourses,
          coursesCompleted: completedCourses,
          averageScore: Math.round(averageProgress),
          studyTime: Math.round(totalTimeSpent / 60), // Convert to hours
          weeklyGoal: 10,
          weeklyProgress: Math.min(7, Math.round(totalTimeSpent / 60)),
        },
        courses: enrollments.slice(0, 3).map((enrollment: any) => ({
          id: enrollment.course.id,
          title: enrollment.course.title,
          progress: enrollment.progress_percentage || 0,
          completedLessons: enrollment.completed_lessons || 0,
          totalLessons: enrollment.course.modules?.reduce((sum: number, m: any) => 
            sum + (m.lessons?.length || 0), 0) || 0,
          timeSpent: enrollment.total_time_spent_minutes || 0,
          estimatedTime: enrollment.course.duration_minutes || 0,
          lastAccessed: enrollment.last_accessed || enrollment.enrolled_at,
          nextLesson: "Continue Learning",
          instructor: `${enrollment.course.instructor?.first_name || ""} ${enrollment.course.instructor?.last_name || ""}`,
          rating: enrollment.course.average_rating || 4.5,
        })),
        achievements: [
          {
            id: "1",
            name: "First Course",
            description: "Completed your first course",
            icon: "🎓",
            rarity: "common",
            earnedAt: new Date().toISOString(),
            isNew: false,
          },
          {
            id: "2",
            name: "Speed Learner",
            description: "Completed 5 lessons in one day",
            icon: "⚡",
            rarity: "rare",
            earnedAt: new Date().toISOString(),
            isNew: true,
          },
          {
            id: "3",
            name: "Streak Master",
            description: "Maintained a 10-day learning streak",
            icon: "🔥",
            rarity: "epic",
            earnedAt: new Date().toISOString(),
            isNew: true,
          },
        ],
        weeklyActivity: [
          { day: "Mon", minutes: 45, lessons: 2 },
          { day: "Tue", minutes: 60, lessons: 3 },
          { day: "Wed", minutes: 30, lessons: 1 },
          { day: "Thu", minutes: 75, lessons: 4 },
          { day: "Fri", minutes: 90, lessons: 3 },
          { day: "Sat", minutes: 0, lessons: 0 },
          { day: "Sun", minutes: 120, lessons: 5 },
        ],
      }

      setProgressData(mockData)
    } catch (error) {
      console.error("Failed to fetch progress data:", error)
      // Fallback to mock data
      const mockData = {
        overview: {
          totalPoints: 2450,
          level: 8,
          streakDays: 12,
          coursesEnrolled: 5,
          coursesCompleted: 2,
          averageScore: 87,
          studyTime: 45,
          weeklyGoal: 10,
          weeklyProgress: 7,
        },
        courses: [
          {
            id: "1",
            title: "Complete React Development Bootcamp",
            progress: 75,
            completedLessons: 18,
            totalLessons: 24,
            timeSpent: 320,
            estimatedTime: 80,
            lastAccessed: "2024-01-15",
            nextLesson: "Advanced Hooks",
            instructor: "John Doe",
            rating: 4.8,
          },
        ],
        achievements: [
          {
            id: "1",
            name: "First Course",
            description: "Completed your first course",
            icon: "🎓",
            rarity: "common",
            earnedAt: "2024-01-10",
            isNew: false,
          },
        ],
        weeklyActivity: [
          { day: "Mon", minutes: 45, lessons: 2 },
          { day: "Tue", minutes: 60, lessons: 3 },
          { day: "Wed", minutes: 30, lessons: 1 },
          { day: "Thu", minutes: 75, lessons: 4 },
          { day: "Fri", minutes: 90, lessons: 3 },
          { day: "Sat", minutes: 0, lessons: 0 },
          { day: "Sun", minutes: 120, lessons: 5 },
        ],
      }
      setProgressData(mockData)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getStreakColor = (days: number) => {
    if (days >= 30) return "text-purple-600"
    if (days >= 14) return "text-orange-600"
    if (days >= 7) return "text-yellow-600"
    return "text-blue-600"
  }

  if (loading || !progressData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Learning Progress</h1>
          <p className="text-muted-foreground">Track your learning journey and achievements</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`flex items-center gap-1 ${getStreakColor(progressData.overview.streakDays)}`}
          >
            <Flame className="w-4 h-4" />
            {progressData.overview.streakDays} day streak
          </Badge>
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            Level {progressData.overview.level}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold">{progressData.overview.totalPoints.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Courses Completed</p>
              <p className="text-2xl font-bold">
                {progressData.overview.coursesCompleted}/{progressData.overview.coursesEnrolled}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Study Time</p>
              <p className="text-2xl font-bold">{progressData.overview.studyTime}h</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TargetIcon className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold">{progressData.overview.averageScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Goal Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Weekly Goal
                </CardTitle>
                <CardDescription>Complete {progressData.overview.weeklyGoal} hours this week</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ProgressRing
                  progress={(progressData.overview.weeklyProgress / progressData.overview.weeklyGoal) * 100}
                  size={120}
                  color="#3b82f6"
                  label={`${progressData.overview.weeklyProgress}/${progressData.overview.weeklyGoal} hours`}
                />
              </CardContent>
            </Card>

            {/* Level Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Level Progress
                </CardTitle>
                <CardDescription>Progress to Level {progressData.overview.level + 1}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ProgressRing progress={75} size={120} color="#eab308" label={`Level ${progressData.overview.level}`} />
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progressData.achievements.slice(0, 3).map((achievement: any) => (
                    <div key={achievement.id} className="flex items-center gap-3">
                      <BadgeDisplay badge={achievement} size="sm" isNew={achievement.isNew} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{achievement.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{achievement.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                Weekly Activity
              </CardTitle>
              <CardDescription>Your learning activity this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {progressData.weeklyActivity.map((day: any, index: number) => (
                  <div key={day.day} className="text-center">
                    <div className="text-xs text-muted-foreground mb-2">{day.day}</div>
                    <div
                      className={`h-20 rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium ${
                        day.minutes > 0 ? "bg-gradient-to-t from-blue-500 to-blue-400" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                      style={{
                        height: `${Math.max(20, (day.minutes / 120) * 80)}px`,
                      }}
                    >
                      {day.minutes > 0 && (
                        <>
                          <div>{day.minutes}m</div>
                          <div>{day.lessons}📚</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <div className="grid gap-6">
            {progressData.courses.map((course: any) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5" />
                          {course.title}
                        </CardTitle>
                        <CardDescription>
                          Instructor: {course.instructor} • Rating: {course.rating} ⭐
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {course.progress === 100 ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline">{Math.round(course.progress)}% Complete</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(course.progress)}%</span>
                      </div>
                      <Progress value={course.progress} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{course.completedLessons} of {course.totalLessons} lessons</span>
                        <span>{formatTime(course.timeSpent)} spent</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Last: {new Date(course.lastAccessed).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {course.progress === 100 ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/courses/${course.id}/certificate`}>
                              <Award className="w-4 h-4 mr-2" />
                              Certificate
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" asChild>
                            <Link href={`/courses/${course.id}/learn`}>
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Continue: {course.nextLesson}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progressData.achievements.map((achievement: any) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`relative ${achievement.isNew ? "ring-2 ring-yellow-400" : ""}`}>
                  {achievement.isNew && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      New!
                    </div>
                  )}
                  <CardContent className="p-6 text-center">
                    <BadgeDisplay
                      badge={achievement}
                      size="lg"
                      isNew={achievement.isNew}
                      showAnimation={achievement.isNew}
                    />
                    <h3 className="font-bold text-lg mt-4">{achievement.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{achievement.description}</p>
                    <div className="text-xs text-muted-foreground mt-3">
                      Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Leaderboard period="weekly" />
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Your Rank
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">#12</div>
                  <div className="text-sm text-muted-foreground">This week</div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium">Points to next rank</div>
                    <div className="text-lg font-bold text-primary">150 pts</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Weekly Points</span>
                    <span className="font-medium">450</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Rank Change</span>
                    <span className="font-medium text-green-600">+3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Best Streak</span>
                    <span className="font-medium">12 days</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}