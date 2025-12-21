"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Award, Download, Star, Clock, BookOpen, Loader2, Eye, CheckCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"

interface CourseCompletionProps {
  courseId: string
  courseTitle: string
  progressData: any
  allSteps: any[]
  getStepScore: (stepId: string) => number | undefined
  course: any
}

export default function CourseCompletion({
  courseId,
  courseTitle,
  progressData,
  allSteps,
  getStepScore,
  course,
}: CourseCompletionProps) {
  const [stats, setStats] = useState({
    totalScore: 0,
    totalMarks: 0,
    percentage: 0,
    completedLessons: 0,
    totalLessons: 0,
    completedAssessments: 0,
    totalAssessments: 0,
    timeSpent: 0,
  })
  const [showCertificate, setShowCertificate] = useState(false)
  const [certificateData, setCertificateData] = useState<any>(null)
  const [loadingCertificate, setLoadingCertificate] = useState(false)
  const [existingCertificate, setExistingCertificate] = useState<any>(null)
  const [checkingCertificate, setCheckingCertificate] = useState(false)

  const { token, user } = useAuth()

  const hasCertificate = course?.is_certificate_available || false

  useEffect(() => {
    calculateStats()
  }, [progressData, allSteps])

  useEffect(() => {
    if (hasCertificate && (token || Cookies.get("bwenge_token")) && user && stats.percentage > 0) {
      checkExistingCertificate()
    }
  }, [hasCertificate, token, user, courseId, stats.percentage])

  const checkExistingCertificate = async () => {
    setCheckingCertificate(true)
    
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) {
      console.log("⚠️ [checkExistingCertificate] No authentication found")
      setCheckingCertificate(false)
      return
    }

    try {
      console.log("🔍 [checkExistingCertificate] Checking for existing certificate...")
      
      // ✅ FIXED: Use correct backend endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/check/user/${user.id}/course/${courseId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log("✅ [checkExistingCertificate] Response:", result)

        if (result.success && result.exists && result.data) {
          setExistingCertificate(result.data)
          
          // ✅ FIXED: Map backend response correctly
          setCertificateData({
            studentName: result.data.user?.name || `${user.first_name} ${user.last_name}`,
            courseName: result.data.course?.title || courseTitle,
            score: result.data.final_score || stats.percentage,
            instructorName: course.instructor 
              ? `${course.instructor.first_name} ${course.instructor.last_name}` 
              : "Course Instructor",
            institutionName: course.institution?.name || "Bwenge Plus Platform",
            directorName: course.institution?.director || "Platform Director",
            completionDate: result.data.issue_date || new Date().toISOString(),
            verificationCode: result.data.verification_code,
            certificateNumber: result.data.certificate_number,
            certificateId: result.data.id,
          })
        }
      } else if (response.status === 404) {
        console.log("ℹ️ [checkExistingCertificate] No existing certificate found")
        setExistingCertificate(null)
      }
    } catch (error) {
      console.error("❌ [checkExistingCertificate] Error:", error)
    } finally {
      setCheckingCertificate(false)
    }
  }

  const calculateStats = () => {
    if (!progressData) {
      console.log("⚠️ [calculateStats] No progress data available")
      return
    }

    console.log("📊 [calculateStats] Using backend progress data:", {
      overallProgress: progressData.overallProgress,
      finalScore: progressData.finalScore,
      totalTimeSpentMinutes: progressData.totalTimeSpentMinutes,
      completedLessons: progressData.completedLessons,
      totalLessons: progressData.totalLessons,
      enrollmentStatus: progressData.enrollmentStatus,
      enrollmentProgressPercentage: progressData.enrollmentProgressPercentage,
    })

    // ✅ FIX 1: Use actual backend progress data instead of recalculating
    const backendProgress = progressData.overallProgress || progressData.enrollmentProgressPercentage || 0
    const backendFinalScore = progressData.finalScore || backendProgress
    
    // ✅ FIX 2: Calculate actual time spent from completedSteps
    let actualTimeSpentMinutes = progressData.totalTimeSpentMinutes || 0
    if (actualTimeSpentMinutes === 0 && progressData.completedSteps) {
      // Calculate from completed steps if total is 0
      const totalSeconds = progressData.completedSteps.reduce((total: number, step: any) => {
        return total + (step.time_spent_seconds || 0)
      }, 0)
      actualTimeSpentMinutes = Math.ceil(totalSeconds / 60)
    }

    // ✅ FIX 3: Get actual completed assessments from progress data
    const completedAssessments = progressData.completedSteps?.filter(
      (step: any) => step.type === "assessment" && step.isCompleted && step.passed
    ).length || 0

    // ✅ FIX 4: Get total assessments from course structure
    const totalAssessments = allSteps.filter(step => step.type === "assessment").length

    // ✅ FIX 5: Calculate actual average score from completed assessments
    let averageScore = 0
    let totalScore = 0
    let scoredAssessments = 0
    
    if (progressData.completedSteps) {
      progressData.completedSteps.forEach((step: any) => {
        if (step.type === "assessment" && step.isCompleted && step.score !== null && step.score !== undefined) {
          totalScore += step.score
          scoredAssessments++
        }
      })
      
      if (scoredAssessments > 0) {
        averageScore = Math.round(totalScore / scoredAssessments)
      }
    }

    // ✅ FIX 6: Use backend completed lessons count if available
    const completedLessons = progressData.completedLessons || 
      (progressData.completedSteps?.filter(
        (step: any) => step.type === "lesson" && step.isCompleted
      ).length || 0)

    // ✅ FIX 7: Calculate total lessons from allSteps if not provided
    const totalLessons = progressData.totalLessons || 
      allSteps.filter(step => step.type !== "assessment").length

    setStats({
      totalScore: averageScore, // Use actual average score
      totalMarks: 100, // Fixed for percentage calculation
      percentage: backendFinalScore, // Use backend final score or progress
      completedLessons,
      totalLessons,
      completedAssessments,
      totalAssessments,
      timeSpent: actualTimeSpentMinutes,
    })

    console.log("✅ [calculateStats] Final stats:", {
      percentage: backendFinalScore,
      completedLessons,
      totalLessons,
      completedAssessments,
      totalAssessments,
      timeSpent: actualTimeSpentMinutes,
      averageScore,
    })
  }

  const formatTime = (minutes: number) => {
    // Handle edge cases
    if (minutes === 0) return "0m"
    if (minutes < 0) return "0m"
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const handleGenerateCertificate = async () => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken || !user) {
      console.error("❌ [handleGenerateCertificate] No authentication found")
      toast({
        title: "Authentication Required",
        description: "Please log in to generate your certificate.",
        variant: "destructive",
      })
      return
    }

    console.log("🏅 [handleGenerateCertificate] Generating certificate...")
    setLoadingCertificate(true)

    try {
      // ✅ Use actual final score from backend progress
      const finalScore = progressData.finalScore || stats.percentage || 0
      
      // ✅ FIXED: Match backend expected request body
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/certificates/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          course_id: courseId, // ✅ Snake case to match backend
          final_score: finalScore,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log("✅ [handleGenerateCertificate] Certificate generated:", result)

        const certData = result.data

        // ✅ FIXED: Map backend response fields correctly
        setCertificateData({
          studentName: certData.user 
            ? `${certData.user.first_name} ${certData.user.last_name}` 
            : `${user.first_name} ${user.last_name}`,
          courseName: certData.course?.title || courseTitle,
          score: certData.final_score || finalScore,
          instructorName: certData.course?.instructor 
            ? `${certData.course.instructor.first_name} ${certData.course.instructor.last_name}` 
            : "Course Instructor",
          institutionName: certData.course?.institution?.name || "Bwenge Plus Platform",
          directorName: certData.course?.institution?.director || "Platform Director",
          completionDate: certData.issue_date || new Date().toISOString(),
          verificationCode: certData.verification_code,
          certificateNumber: certData.certificate_number,
          certificateId: certData.id,
        })

        setExistingCertificate(certData)
        setShowCertificate(true)

        toast({
          title: "Certificate Generated!",
          description: "Your certificate has been successfully generated.",
        })
      } else {
        throw new Error(result.message || "Failed to generate certificate")
      }
    } catch (error: any) {
      console.error("❌ [handleGenerateCertificate] Error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate certificate. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingCertificate(false)
    }
  }

  const handleViewCertificate = () => {
    if (existingCertificate && certificateData) {
      setShowCertificate(true)
    }
  }

  const handleDownloadCertificate = async () => {
    if (!existingCertificate?.id) return

    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken

    if (!currentToken) {
      console.error("❌ [handleDownloadCertificate] No authentication found")
      return
    }

    try {
      console.log("📥 [handleDownloadCertificate] Downloading certificate PDF...")

      // ✅ FIXED: Use correct backend endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/${existingCertificate.id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data?.pdf_url) {
          window.open(result.data.pdf_url, "_blank")
        }
      }
    } catch (error) {
      console.error("❌ [handleDownloadCertificate] Error:", error)
      toast({
        title: "Error",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      })
    }
  }

  // ✅ FIX: Add debug logging to verify data
  useEffect(() => {
    console.log("🔍 [CourseCompletion] Debug info:", {
      progressData,
      stats,
      courseId,
      courseTitle,
      allStepsCount: allSteps.length,
      hasProgressData: !!progressData,
    })
  }, [progressData, stats])

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-yellow-500" />
            </div>
            <CardTitle className="text-3xl mb-2">Congratulations!</CardTitle>
            <p className="text-xl text-muted-foreground">You have successfully completed</p>
            <p className="text-2xl font-bold text-primary mt-2">{courseTitle}</p>
            {/* ✅ FIX: Show backend status */}
            {progressData?.enrollmentStatus === "COMPLETED" && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Course Completed
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="text-center">
              {/* ✅ FIX: Use actual final score from backend */}
              <div className="text-6xl font-bold text-primary mb-2">
                {progressData?.finalScore || stats.percentage || 0}%
              </div>
              <p className="text-lg text-muted-foreground">Overall Score</p>
              <Progress 
                value={progressData?.overallProgress || stats.percentage || 0} 
                className="w-full max-w-md mx-auto mt-4" 
              />
              {/* ✅ FIX: Show progress from backend */}
              <p className="text-sm text-muted-foreground mt-2">
                Progress: {progressData?.overallProgress || 0}% • 
                Status: {progressData?.enrollmentStatus || "ACTIVE"}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                {/* ✅ FIX: Use actual completed lessons from backend */}
                <div className="text-2xl font-bold">
                  {progressData?.completedLessons || stats.completedLessons}
                </div>
                <div className="text-sm text-muted-foreground">Lessons Completed</div>
                <div className="text-xs text-muted-foreground mt-1">
                  of {progressData?.totalLessons || stats.totalLessons}
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                {/* ✅ FIX: Use actual completed assessments */}
                <div className="text-2xl font-bold">{stats.completedAssessments}</div>
                <div className="text-sm text-muted-foreground">Assessments Passed</div>
                <div className="text-xs text-muted-foreground mt-1">
                  of {stats.totalAssessments}
                </div>
              </div>
              

              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                {/* ✅ FIX: Use actual average score */}
                <div className="text-2xl font-bold">{stats.totalScore}</div>
                <div className="text-sm text-muted-foreground">Average Score</div>
                {progressData?.finalScore && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Final: {progressData.finalScore}%
                  </div>
                )}
              </div>
            </div>

            {hasCertificate && (
              <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                <Award className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Certificate of Completion</h3>
                <p className="text-muted-foreground mb-4">
                  {existingCertificate
                    ? "Your certificate is ready to view and download."
                    : "Congratulations! You've earned a certificate for completing this course."}
                </p>
                
                {/* ✅ FIX: Show certificate eligibility based on actual completion */}
                {progressData?.enrollmentStatus !== "COMPLETED" && !existingCertificate ? (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Complete all course requirements to generate your certificate
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Progress: {progressData?.overallProgress || 0}% • 
                      Final Score: {progressData?.finalScore || "N/A"}
                    </p>
                  </div>
                ) : null}
                
                <div className="flex gap-3 justify-center">
                  {checkingCertificate ? (
                    <Button disabled className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </Button>
                  ) : existingCertificate ? (
                    <>
                      <Button onClick={handleViewCertificate} className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Certificate
                      </Button>
                      <Button onClick={handleDownloadCertificate} variant="outline" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleGenerateCertificate}
                      className="flex items-center gap-2"
                      disabled={loadingCertificate || progressData?.enrollmentStatus !== "COMPLETED"}
                    >
                      {loadingCertificate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4" />
                          Generate Certificate
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {existingCertificate && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>Certificate Number: <span className="font-mono">{existingCertificate.certificate_number}</span></p>
                    <p>Issued: {new Date(existingCertificate.issue_date).toLocaleDateString()}</p>
                    <p>Final Score: {existingCertificate.final_score || stats.percentage}%</p>
                  </div>
                )}
              </div>
            )}

            <div className="text-center p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">What's Next?</h3>
              <p className="text-muted-foreground mb-4">Continue your learning journey with more courses</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
                  My Dashboard
                </Button>
                <Button onClick={() => (window.location.href = `/courses/${courseId}`)}>
                  View Course Details
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = "/courses")}>
                  Browse Courses
                </Button>
              </div>
            </div>


          </CardContent>
        </Card>
      </div>

      {showCertificate && certificateData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-auto">
          <div className="min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Certificate of Completion</h2>
                  <p className="text-gray-300">{courseTitle}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleDownloadCertificate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" onClick={() => setShowCertificate(false)}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-2xl p-8">
                <div className="border-8 border-double border-primary p-12">
                  <div className="text-center space-y-6">
                    <Trophy className="w-20 h-20 mx-auto text-yellow-500" />
                    
                    <h1 className="text-4xl font-serif font-bold text-primary">
                      Certificate of Completion
                    </h1>
                    
                    <div className="space-y-4">
                      <p className="text-lg text-muted-foreground">This certifies that</p>
                      <p className="text-3xl font-bold text-foreground">{certificateData.studentName}</p>
                      <p className="text-lg text-muted-foreground">has successfully completed</p>
                      <p className="text-2xl font-semibold text-primary">{certificateData.courseName}</p>
                    </div>
                    
                    <div className="flex justify-center items-center gap-8 pt-8">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="text-2xl font-bold text-primary">{certificateData.score}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="text-lg font-semibold">
                          {new Date(certificateData.completionDate).toLocaleDateString()}
                        </p>
                      </div>
 
                    </div>
                    
                    <div className="flex justify-between items-end pt-12 border-t">
                      <div className="text-left">
                        <div className="border-t-2 border-foreground pt-2">
                          <p className="text-sm font-semibold">{certificateData.instructorName}</p>
                          <p className="text-xs text-muted-foreground">Course Instructor</p>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Award className="w-12 h-12 mx-auto text-primary mb-2" />
                        <p className="text-xs text-muted-foreground">{certificateData.institutionName}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="border-t-2 border-foreground pt-2">
                          <p className="text-sm font-semibold">{certificateData.directorName}</p>
                          <p className="text-xs text-muted-foreground">Platform Director</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6 text-center">
                      <p className="text-xs text-muted-foreground">
                        Certificate Number: {certificateData.certificateNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Verification Code: {certificateData.verificationCode}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Verify at: {process.env.NEXT_PUBLIC_CLIENT_URL}/certificates/verify/{certificateData.verificationCode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}