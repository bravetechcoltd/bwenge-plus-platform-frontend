"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Medal, Award, Star, Calendar, TrendingUp, Users, Clock, Target } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import Cookies from "js-cookie"

interface LeaderboardUser {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePictureUrl?: string
  totalPoints: number
  level: number
  rank: number
  institution?: {
    id: string
    name: string
  }
  enrolledCoursesCount: number
  completedCoursesCount: number
  totalLearningHours: number
  certificatesEarned: number
  badges: Array<{
    id: string
    name: string
    icon: string
    rarity: "common" | "rare" | "epic" | "legendary"
    earnedAt: string
  }>
  lastActivity: string
  streakDays: number
}

interface LeaderboardProps {
  period?: "daily" | "weekly" | "monthly" | "all-time"
  institutionId?: string
  courseId?: string
  limit?: number
}

export function Leaderboard({ 
  period = "weekly", 
  institutionId, 
  courseId, 
  limit = 20 
}: LeaderboardProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, token } = useAuth()

  useEffect(() => {
    fetchLeaderboard()
  }, [selectedPeriod, institutionId, courseId])

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        limit: limit.toString(),
        ...(institutionId && { institutionId }),
        ...(courseId && { courseId }),
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gamification/leaderboard?${params}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setUsers(data.data.users || [])
        setCurrentUser(data.data.currentUser || null)
      } else {
        throw new Error(data.message || "Failed to fetch leaderboard")
      }
    } catch (err: any) {
      console.error("Failed to fetch leaderboard:", err)
      setError(err.message)
      
      // Fallback mock data for development
      if (process.env.NODE_ENV === "development") {
        const mockUsers = generateMockLeaderboardData()
        setUsers(mockUsers)
        setCurrentUser(mockUsers.find(u => u.id === user?.id) || mockUsers[0])
      }
    } finally {
      setLoading(false)
    }
  }

  const generateMockLeaderboardData = (): LeaderboardUser[] => {
    return Array.from({ length: 15 }, (_, index) => ({
      id: `user-${index + 1}`,
      firstName: ["Alex", "Jamie", "Taylor", "Morgan", "Casey", "Jordan", "Riley", "Dylan", "Avery", "Peyton", "Quinn", "Blake", "Rowan", "Sage", "Phoenix"][index],
      lastName: ["Johnson", "Smith", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Moore"][index],
      email: `user${index + 1}@example.com`,
      profilePictureUrl: index % 3 === 0 ? `https://api.dicebear.com/7.x/avataaars/svg?seed=user${index + 1}` : undefined,
      totalPoints: 2500 - (index * 150),
      level: Math.floor((2500 - (index * 150)) / 500) + 1,
      rank: index + 1,
      institution: index % 2 === 0 ? {
        id: "inst-1",
        name: ["Bwenge University", "Tech Institute", "Global Academy"][index % 3],
      } : undefined,
      enrolledCoursesCount: Math.floor(Math.random() * 10) + 1,
      completedCoursesCount: Math.floor(Math.random() * 5) + 1,
      totalLearningHours: Math.floor(Math.random() * 200) + 20,
      certificatesEarned: Math.floor(Math.random() * 3) + 1,
      badges: [
        {
          id: "badge-1",
          name: "First Course",
          icon: "🎓",
          rarity: "common" as const,
          earnedAt: new Date(Date.now() - Math.random() * 2592000000).toISOString(),
        },
        ...(index % 2 === 0 ? [{
          id: "badge-2",
          name: "Speed Learner",
          icon: "⚡",
          rarity: "rare" as const,
          earnedAt: new Date(Date.now() - Math.random() * 1728000000).toISOString(),
        }] : []),
        ...(index % 3 === 0 ? [{
          id: "badge-3",
          name: "Streak Master",
          icon: "🔥",
          rarity: "epic" as const,
          earnedAt: new Date(Date.now() - Math.random() * 864000000).toISOString(),
        }] : []),
      ],
      lastActivity: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      streakDays: Math.floor(Math.random() * 30) + 1,
    }))
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return <Star className="w-5 h-5 text-blue-500" />
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600"
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500"
    if (rank === 3) return "bg-gradient-to-r from-amber-400 to-amber-600"
    return "bg-gradient-to-r from-blue-400 to-blue-600"
  }

  const getLevelColor = (level: number) => {
    if (level >= 10) return "bg-gradient-to-r from-purple-500 to-pink-500"
    if (level >= 5) return "bg-gradient-to-r from-blue-500 to-cyan-500"
    if (level >= 3) return "bg-gradient-to-r from-green-500 to-emerald-500"
    return "bg-gradient-to-r from-yellow-500 to-orange-500"
  }

  const formatPoints = (points: number) => {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`
    return points.toString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>Loading leaderboard data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
              >
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>Unable to load leaderboard data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchLeaderboard}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Learning Leaderboard
              </CardTitle>
              <CardDescription>
                Top learners based on points earned in {selectedPeriod}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {["daily", "weekly", "monthly", "all-time"].map((p) => (
                <Button
                  key={p}
                  variant={selectedPeriod === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod(p as any)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1).replace("-", " ")}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((leaderboardUser) => (
              <div
                key={leaderboardUser.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-all
                  ${
                    leaderboardUser.id === currentUser?.id
                      ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                      : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                `}
              >
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                    ${getRankColor(leaderboardUser.rank)}
                  `}
                >
                  {leaderboardUser.rank <= 3 ? getRankIcon(leaderboardUser.rank) : leaderboardUser.rank}
                </div>

                <Avatar className="w-10 h-10 border-2 border-background">
                  <AvatarImage 
                    src={leaderboardUser.profilePictureUrl || "/placeholder.svg"} 
                    alt={`${leaderboardUser.firstName} ${leaderboardUser.lastName}`} 
                  />
                  <AvatarFallback>
                    {leaderboardUser.firstName[0]}
                    {leaderboardUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {leaderboardUser.firstName} {leaderboardUser.lastName}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getLevelColor(leaderboardUser.level)} text-white`}
                    >
                      Lvl {leaderboardUser.level}
                    </Badge>
                    {leaderboardUser.id === currentUser?.id && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      <span>{formatPoints(leaderboardUser.totalPoints)} pts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span>{leaderboardUser.completedCoursesCount} courses</span>
                    </div>
                    {leaderboardUser.streakDays > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{leaderboardUser.streakDays} day streak</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {leaderboardUser.badges.slice(0, 2).map((badge) => (
                    <div
                      key={badge.id}
                      className="text-lg hover:scale-110 transition-transform"
                      title={badge.name}
                    >
                      {badge.icon}
                    </div>
                  ))}
                  {leaderboardUser.badges.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{leaderboardUser.badges.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {currentUser && !users.some(u => u.id === currentUser.id) && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium mb-3">Your Position</h3>
              <div className={`
                flex items-center gap-3 p-3 rounded-lg
                bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800
              `}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-r from-blue-400 to-blue-600">
                  {currentUser.rank}
                </div>

                <Avatar className="w-10 h-10 border-2 border-background">
                  <AvatarImage 
                    src={currentUser.profilePictureUrl || "/placeholder.svg"} 
                    alt={`${currentUser.firstName} ${currentUser.lastName}`} 
                  />
                  <AvatarFallback>
                    {currentUser.firstName[0]}
                    {currentUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {currentUser.firstName} {currentUser.lastName}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getLevelColor(currentUser.level)} text-white`}
                    >
                      Lvl {currentUser.level}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPoints(currentUser.totalPoints)} points • {currentUser.completedCoursesCount} courses completed
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Points</span>
                  <span className="font-bold text-lg">{formatPoints(currentUser.totalPoints)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Level</span>
                  <Badge className={getLevelColor(currentUser.level)}>
                    Level {currentUser.level}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Learning Streak</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{currentUser.streakDays} days</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Courses Completed</span>
                  <span className="font-medium">{currentUser.completedCoursesCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Target className="w-4 h-4 mr-2" />
                  Set Daily Goal
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Progress
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Compare with Friends
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Next Milestone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-center mb-3">
                  <div className="text-2xl font-bold text-primary">
                    {((currentUser.totalPoints % 500) / 500 * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">to Level {currentUser.level + 1}</div>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${((currentUser.totalPoints % 500) / 500 * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-center text-gray-500 mt-2">
                  {500 - (currentUser.totalPoints % 500)} points needed
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}