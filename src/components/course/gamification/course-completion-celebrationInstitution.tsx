"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Trophy, CheckCircle, Award, Share2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

interface CourseCompletionCelebrationProps {
  courseTitle: string
  stats: {
    modules: number
    lessons: number
    assessments: number
    qualityScore: number
    enrolledStudents?: number
  }
  onClose: () => void
  courseId?: string
  courseType?: "MOOC" | "SPOC"
}

export function CourseCompletionCelebration({
  courseTitle,
  stats,
  onClose,
  courseId,
  courseType = "MOOC",
}: CourseCompletionCelebrationProps) {
  const router = useRouter()
  const { user } = useAuth()

  const handleShare = async () => {
    if (!courseId) return

    const shareUrl = `${window.location.origin}/courses/${courseId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${courseTitle} on Bwenge Plus`,
          text: `I just published "${courseTitle}" on Bwenge Plus!`,
          url: shareUrl,
        })
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copied to clipboard!")
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied to clipboard!")
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative max-w-lg w-full"
        >
          <Card className="relative overflow-hidden border border-gray-300 bg-white shadow-xl">
            {/* Gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0158B7] via-green-400 to-yellow-400" />

            <CardContent className="p-8 text-center space-y-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose} 
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Title */}
              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="flex justify-center mb-4"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-[#0158B7]/20 to-green-400/20 rounded-full flex items-center justify-center">
                    {courseType === "SPOC" ? (
                      <Award className="w-12 h-12 text-[#0158B7]" />
                    ) : (
                      <Trophy className="w-12 h-12 text-[#0158B7]" />
                    )}
                  </div>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl md:text-3xl font-bold text-gray-900"
                >
                  {user?.bwenge_role === "SYSTEM_ADMIN" ? "Course Published!" : "Course Submitted Successfully!"}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-gray-600"
                >
                  <span className="font-medium text-gray-900">"{courseTitle}"</span>{" "}
                  {user?.bwenge_role === "SYSTEM_ADMIN"
                    ? "is now live and ready for students!"
                    : "has been submitted for admin review!"}
                </motion.p>
              </div>

              {/* Course Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-4 gap-3 py-4 border-t border-gray-200"
              >
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl md:text-2xl font-bold text-[#0158B7]">{stats.modules}</div>
                  <div className="text-xs text-gray-600 font-medium">Modules</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl md:text-2xl font-bold text-green-600">{stats.lessons}</div>
                  <div className="text-xs text-gray-600 font-medium">Lessons</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl md:text-2xl font-bold text-orange-600">{stats.assessments}</div>
                  <div className="text-xs text-gray-600 font-medium">Assessments</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl md:text-2xl font-bold text-purple-600">{stats.qualityScore}%</div>
                  <div className="text-xs text-gray-600 font-medium">Quality</div>
                </div>
              </motion.div>

              {stats.enrolledStudents !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {stats.enrolledStudents} student{stats.enrolledStudents !== 1 ? "s" : ""} enrolled
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button 
                  onClick={() => router.push(`/dashboard/system-admin/courses`)} 
                  size="lg"
                  className="bg-[#0158B7] hover:bg-[#014A9C] text-white px-6"
                >
                  View All Courses
                </Button>
                {courseId && (
                  <Button 
                    onClick={() => router.push(`/dashboard/system-admin/courses/${courseId}`)} 
                    variant="outline" 
                    size="lg"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6"
                  >
                    View Course
                  </Button>
                )}
                {courseId && user?.bwenge_role === "SYSTEM_ADMIN" && (
                  <Button 
                    onClick={handleShare} 
                    variant="outline" 
                    size="lg"
                    className="border-green-300 text-green-700 hover:bg-green-50 px-6"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
              </motion.div>

              {user?.bwenge_role !== "SYSTEM_ADMIN" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-sm text-gray-500 pt-4 border-t border-gray-200"
                >
                  <span className="font-medium">Note:</span> Your course will be reviewed by system administrators within 24-48 hours.
                </motion.p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}