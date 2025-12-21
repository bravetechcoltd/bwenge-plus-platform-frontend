'use client';

import { Button } from "@/components/ui/button"
import { CheckCircle, ChevronLeft, ChevronRight, Menu, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface LearningNavigationProps {
  courseTitle: string
  courseId: string
  currentStepTitle: string
  currentStepIndex: number
  totalSteps: number
  canGoNext: boolean
  canGoPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  currentStepCompleted?: boolean
  isLastStep?: boolean
  isCurrentStepCompleted?: boolean
  isNextStepLocked?: boolean
}

export default function LearningNavigation({
  courseTitle,
  courseId,
  currentStepTitle,
  currentStepIndex,
  totalSteps,
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  currentStepCompleted = false,
  isLastStep = false,
  isCurrentStepCompleted = false,
  isNextStepLocked = false,
}: LearningNavigationProps) {
  const router = useRouter()
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const progress = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0

  const getDisplayTitle = () => {
    if (currentStepTitle.includes(" - ")) {
      return currentStepTitle.split(" - ")[0]
    }
    if (currentStepTitle.includes("Assessment") || currentStepTitle.includes("Quiz")) {
      if (currentStepTitle.includes(" - ")) {
        return currentStepTitle.split(" - ")[0]
      }
    }
    return currentStepTitle
  }

  const isLessonStep = () => {
    const lowerTitle = currentStepTitle.toLowerCase()
    return !lowerTitle.includes("assessment") &&
      !lowerTitle.includes("quiz") &&
      !lowerTitle.includes("final")
  }

  const getCompletionText = () => {
    if (!isCurrentStepCompleted) return null
    return isLessonStep() ? "Lesson Completed" : "Assessment Completed"
  }

  const getNextButtonText = () => {
    if (isLastStep) return "Finish Course"
    if (isCurrentStepCompleted) return "Continue"
    if (isNextStepLocked && !isCurrentStepCompleted) return "Complete Current"
    return "Next"
  }

  // ── FIX: Previous is NEVER disabled while there are steps before the current one.
  // The original code already relied on `canGoPrevious` (which is `currentStepIndex > 0`)
  // for the disabled state, so this is preserved. The key change is in the page's
  // getNextStepLockStatus — we clarify here that Previous has no lock concept at all.
  const isPreviousDisabled = !canGoPrevious

  // ── Next button: disabled only when canGoNext is false, OR when the next step is
  // truly locked (not yet completed) AND the current step is also not yet done.
  // If isNextStepLocked is false (because the next step is already completed, or
  // the current step is done), the button is always enabled.
  const isNextButtonDisabled = () => {
    if (!canGoNext) return true
    if (isNextStepLocked && !isCurrentStepCompleted) return true
    return false
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/learner/learning/courses`)}
              className="flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="border-l pl-4 min-w-0 flex-1 hidden md:block">
              <h1 className="font-semibold text-lg truncate">{courseTitle}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground truncate">{getDisplayTitle()}</p>
                {isCurrentStepCompleted && getCompletionText() && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    {getCompletionText()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Desktop Navigation Buttons */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={isPreviousDisabled}
                className="flex items-center gap-1 bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                size="sm"
                onClick={onNext}
                disabled={isNextButtonDisabled()}
                className={`flex items-center gap-1 ${
                  isCurrentStepCompleted
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-[#0158B7] hover:bg-[#014A9C]"
                } ${isNextStepLocked && !isCurrentStepCompleted ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {getNextButtonText()}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Info */}
        {!showMobileMenu && (
          <div className="md:hidden mt-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{getDisplayTitle()}</p>
                {isCurrentStepCompleted && getCompletionText() && (
                  <span className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    {getCompletionText()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden mt-3 pt-3 border-t space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={isPreviousDisabled}
                className="flex-1 bg-transparent"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                size="sm"
                onClick={onNext}
                disabled={isNextButtonDisabled()}
                className={`flex-1 ${
                  isCurrentStepCompleted
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-[#0158B7] hover:bg-[#014A9C]"
                } ${isNextStepLocked && !isCurrentStepCompleted ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {getNextButtonText()}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {isNextStepLocked && !isCurrentStepCompleted && (
              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                <p className="font-medium">Complete this lesson to unlock the next one</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}