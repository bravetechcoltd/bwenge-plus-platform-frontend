import { motion, AnimatePresence } from "framer-motion"
import { Trophy, Star, Target, ArrowRight, X, Award, BookOpen, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface CompletionCelebrationProps {
  data: {
    stepTitle: string
    stepType: "content" | "video" | "assessment"
    score?: number
    isLessonComplete: boolean
    isModuleComplete: boolean
    isCourseComplete: boolean
    nextStepTitle?: string
    nextStepId?: string
  }
  onClose: () => void
  onNext: () => void
}

export function CompletionCelebration({ data, onClose, onNext }: CompletionCelebrationProps) {
  const getCelebrationMessage = () => {
    if (data.isCourseComplete) {
      return {
        title: "🎉 Course Complete!",
        subtitle: "Congratulations on finishing the entire course!",
        icon: <Trophy className="w-16 h-16 text-yellow-500" />,
      }
    }
    if (data.isModuleComplete) {
      return {
        title: "🎯 Module Complete!",
        subtitle: "Great job! You've completed this module",
        icon: <Target className="w-16 h-16 text-blue-500" />,
      }
    }
    if (data.isLessonComplete) {
      return {
        title: "✅ Lesson Complete!",
        subtitle: "Well done! Moving forward",
        icon: <CheckCircle className="w-16 h-16 text-green-500" />,
      }
    }
    if (data.stepType === "assessment") {
      const passed = data.score && data.score >= 70
      return {
        title: passed ? "🎓 Assessment Passed!" : "📝 Assessment Complete",
        subtitle: passed 
          ? `Great work! You scored ${data.score}%` 
          : `You scored ${data.score}%. Keep learning!`,
        icon: passed 
          ? <Award className="w-16 h-16 text-purple-500" /> 
          : <BookOpen className="w-16 h-16 text-orange-500" />,
      }
    }
    return {
      title: "✨ Step Complete!",
      subtitle: "Keep up the momentum!",
      icon: <Star className="w-16 h-16 text-indigo-500" />,
    }
  }

  const celebration = getCelebrationMessage()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="relative max-w-md w-full p-8 text-center shadow-2xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 15 }}
              className="mb-6 flex justify-center"
            >
              {celebration.icon}
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-3"
            >
              {celebration.title}
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground mb-6"
            >
              {celebration.subtitle}
            </motion.p>

            {/* Achievement Stats */}
            {(data.score !== undefined || data.isModuleComplete || data.isCourseComplete) && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-4 mb-6"
              >
                {data.score !== undefined && (
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary">{data.score}%</div>
                    <div className="text-sm text-muted-foreground">Score</div>
                  </div>
                )}
                {data.isModuleComplete && (
                  <div className="bg-green-500/10 rounded-lg p-4">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-1" />
                    <div className="text-sm text-muted-foreground">Module Done</div>
                  </div>
                )}
                {data.isCourseComplete && (
                  <div className="bg-yellow-500/10 rounded-lg p-4">
                    <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-1" />
                    <div className="text-sm text-muted-foreground">Course Done</div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Next Step Info */}
            {data.nextStepTitle && !data.isCourseComplete && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-muted/50 rounded-lg p-4 mb-6"
              >
                <div className="text-sm text-muted-foreground mb-1">Up next</div>
                <div className="font-medium">{data.nextStepTitle}</div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex gap-3"
            >
              <Button onClick={onClose} variant="outline" className="flex-1">
                Stay Here
              </Button>
              {!data.isCourseComplete && data.nextStepTitle && (
                <Button onClick={onNext} className="flex-1 flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {data.isCourseComplete && (
                <Button onClick={onNext} className="flex-1 flex items-center gap-2">
                  View Results
                  <Trophy className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}