"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BadgeDisplay } from "./badge-display"
import { Sparkles, Share2, Download, Target, TrendingUp, Award, Trophy, Clock } from "lucide-react"
import { BadgeType } from "./badge-display"
import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"

interface AchievementModalProps {
  achievement: BadgeType | null
  isOpen: boolean
  onClose: () => void
  showShareOptions?: boolean
  showNextAchievement?: boolean
}

export function AchievementModal({ 
  achievement, 
  isOpen, 
  onClose,
  showShareOptions = true,
  showNextAchievement = true 
}: AchievementModalProps) {
  const [isSharing, setIsSharing] = useState(false)
  const { user } = useAuth()

  if (!achievement) return null

  const handleShare = async (platform: 'twitter' | 'linkedin' | 'copy') => {
    setIsSharing(true)
    const shareText = `🎉 I just earned the "${achievement.name}" badge on Bwenge Plus! ${achievement.description}`
    const shareUrl = window.location.href
    
    try {
      switch (platform) {
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
          break
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
          break
        case 'copy':
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
          // Show toast notification (you'll need to implement toast)
          break
      }
    } catch (error) {
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownloadCertificate = () => {
    // Implement certificate download logic
  }

  // Mock next achievement data
  const nextAchievement: BadgeType = {
    id: "next-1",
    name: "Course Master",
    description: "Complete 5 courses in any category",
    icon: "👑",
    rarity: "epic",
    points: 500,
    category: "milestone",
    progress: {
      current: 3,
      target: 5
    }
  }

  // Mock recent achievements
  const recentAchievements: BadgeType[] = [
    {
      id: "recent-1",
      name: "Quick Learner",
      description: "Complete 3 lessons in one day",
      icon: "⚡",
      rarity: "rare",
      points: 150,
      category: "learning",
      earnedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "recent-2",
      name: "First Milestone",
      description: "Reach level 5",
      icon: "🎯",
      rarity: "common",
      points: 100,
      category: "milestone",
      earnedAt: new Date(Date.now() - 172800000).toISOString(),
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center text-2xl">
            <Sparkles className="w-6 h-6 text-warning animate-pulse" />
            Achievement Unlocked!
            <Sparkles className="w-6 h-6 text-warning animate-pulse" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Main Achievement Display */}
          <div className="flex flex-col items-center space-y-6">
            <div className="relative animate-bounce-once">
              <BadgeDisplay 
                badge={achievement} 
                size="xl" 
                showAnimation={true} 
                isNew={true}
              />
            </div>

            <div className="text-center space-y-3 max-w-md">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-primary">{achievement.name}</h3>
                <div className="flex items-center justify-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {achievement.rarity}
                  </Badge>
                  <div className="flex items-center gap-1 text-warning dark:text-warning">
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium">+{achievement.points} points</span>
                  </div>
                </div>
              </div>
              
              <p className="text-muted-foreground dark:text-muted-foreground text-lg">
                {achievement.description}
              </p>
              
              {achievement.earnedAt && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Earned on {new Date(achievement.earnedAt).toLocaleDateString()} at {new Date(achievement.earnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Share Options */}
          {showShareOptions && (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="font-medium mb-3 flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Your Achievement
                </h4>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('twitter')}
                    disabled={isSharing}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('linkedin')}
                    disabled={isSharing}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('copy')}
                    disabled={isSharing}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 dark:bg-card rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                +{achievement.points}
              </div>
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                Points Earned
              </div>
            </div>
            <div className="bg-muted/50 dark:bg-card rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1 capitalize">
                {achievement.rarity}
              </div>
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                Rarity Level
              </div>
            </div>
          </div>

          {/* Next Achievement Preview */}
          {showNextAchievement && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Next Achievement
                </h4>
                {nextAchievement.progress && (
                  <Badge variant="outline" className="text-xs">
                    {nextAchievement.progress.current}/{nextAchievement.progress.target}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-muted/50 dark:bg-card rounded-lg">
                <BadgeDisplay badge={nextAchievement} size="md" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium">{nextAchievement.name}</h5>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {nextAchievement.rarity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {nextAchievement.description}
                  </p>
                  {nextAchievement.progress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>
                          {nextAchievement.progress.current}/{nextAchievement.progress.target}
                        </span>
                      </div>
                      <Progress 
                        value={(nextAchievement.progress.current / nextAchievement.progress.target) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-warning dark:text-warning">
                    +{nextAchievement.points}
                  </div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Award className="w-4 h-4" />
                Recent Achievements
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {recentAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-card rounded-lg"
                  >
                    <BadgeDisplay badge={achievement} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm truncate">{achievement.name}</h5>
                      <div className="text-xs text-muted-foreground">
                        {new Date(achievement.earnedAt!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Your Progress
              </h4>
              {user && (
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profile_picture_url} />
                    <AvatarFallback>
                      {user.first_name?.[0]}
                      {user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Level {Math.floor((user.total_points || 0) / 500) + 1}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {recentAchievements.length + 1}
                </div>
                <div className="text-xs text-muted-foreground">Total Badges</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {recentAchievements.reduce((sum, a) => sum + a.points, achievement.points)}
                </div>
                <div className="text-xs text-muted-foreground">Points Earned</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {achievement.rarity === 'legendary' ? 1 : 0}
                </div>
                <div className="text-xs text-muted-foreground">Legendary Badges</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              onClick={handleDownloadCertificate}
              className="flex-1"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
            <Button 
              onClick={onClose} 
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Awesome! Continue Learning
            </Button>
          </div>
        </div>

        {/* Confetti Effect */}
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                background: [
                  '#FF6B6B',
                  '#4ECDC4',
                  '#FFD166',
                  '#06D6A0',
                  '#118AB2',
                  '#EF476F'
                ][Math.floor(Math.random() * 6)],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Add CSS animation for confetti
const ConfettiStyles = () => (
  <style jsx global>{`
    @keyframes confetti {
      0% {
        transform: translateY(-100vh) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }
    
    @keyframes bounce-once {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-20px);
      }
    }
    
    .animate-confetti {
      animation: confetti 3s linear forwards;
    }
    
    .animate-bounce-once {
      animation: bounce-once 1s ease-in-out;
    }
  `}</style>
)