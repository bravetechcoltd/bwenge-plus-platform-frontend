
import { useAppSelector } from "@/lib/hooks"
import { selectIsUserEnrolled, selectUserEnrollment } from "@/lib/features/enrollments/enrollmentSlice"

export const useEnrollmentStatus = (courseId: string) => {
  const isEnrolled = useAppSelector(selectIsUserEnrolled(courseId))
  const enrollment = useAppSelector(selectUserEnrollment(courseId))
  
  return {
    isEnrolled,
    enrollment,
    isPending: enrollment?.status === "PENDING",
    isActive: enrollment?.status === "ACTIVE",
    isCompleted: enrollment?.status === "COMPLETED",
    progress: enrollment?.progress_percentage || 0,
  }
}