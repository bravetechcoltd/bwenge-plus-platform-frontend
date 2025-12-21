"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Award, Download, Star, BookOpen, Loader2, Eye, CheckCircle, X, AlertCircle, Lock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"
import { Certificate } from "@/components/learning/certificate"

interface CourseCompletionProps {
  courseId: string
  courseTitle: string
  progressData: any
  allSteps: any[]
  getStepScore: (stepId: string) => number | undefined
  course: any
  // allStepsCompleted is the STRICT per-step validation from areAllStepsTrulyPassed()
  // in use-learning-progress. NEVER derived from enrollmentStatus or overallProgress.
  // This is the ONLY source of truth for course completion gating.
  allStepsCompleted: boolean
}

export default function CourseCompletion({
  courseId,
  courseTitle,
  progressData,
  allSteps,
  getStepScore,
  course,
  allStepsCompleted,
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

  // isCourseCompleted is STRICTLY derived from allStepsCompleted prop,
  // which comes from areAllStepsTrulyPassed() in use-learning-progress.
  //
  // We do NOT use:
  //   ❌ progressData.enrollmentStatus === "COMPLETED"
  //   ❌ progressData.overallProgress >= 100
  //
  // Both can be set by the backend even when assessments are still
  // pending/failed, as proven by the API data showing:
  //   enrollmentStatus="COMPLETED", overallProgress=75, finalAssessment.isCompleted=false
  const isCourseCompleted = allStepsCompleted

  useEffect(() => {
    calculateStats()
  }, [progressData, allSteps])

  // Only check/show certificate when the learner has truly completed everything
  useEffect(() => {
    if (isCourseCompleted && (token || Cookies.get("bwenge_token")) && user) {
      checkExistingCertificate()
    }
  }, [isCourseCompleted, token, user, courseId])

  // ── Map backend certificate record → Certificate component props ───────────
  const buildCertificateData = (certRecord: any, scoreOverride?: number) => {
    const instructorObj = certRecord.course?.instructor || course?.instructor
    const institutionObj = certRecord.course?.institution || course?.institution

    return {
      studentName: certRecord.user
        ? `${certRecord.user.first_name || certRecord.user.name || ""} ${certRecord.user.last_name || ""}`.trim()
        : user
        ? `${user.first_name} ${user.last_name}`
        : "Student",
      courseName: certRecord.course?.title || courseTitle,
      score: certRecord.final_score ?? scoreOverride ?? stats.percentage,
      instructorName: instructorObj
        ? `${instructorObj.first_name} ${instructorObj.last_name}`
        : "Course Instructor",
      institutionName: institutionObj?.name || "Bwenge Plus Platform",
      directorName: institutionObj?.director || "Platform Director",
      completionDate: certRecord.issue_date || new Date().toISOString(),
      verificationCode: certRecord.verification_code,
      certificateNumber: certRecord.certificate_number,
      certificateId: certRecord.id,
      instructorSignature: instructorObj?.signature_url ?? undefined,
      directorSignature: institutionObj?.director_signature_url ?? undefined,
      organizationStamp: institutionObj?.stamp_url ?? course?.organization_stamp ?? undefined,
    }
  }

  const checkExistingCertificate = async () => {
    setCheckingCertificate(true)
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken || !user) { setCheckingCertificate(false); return }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/check/user/${user.id}/course/${courseId}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` } },
      )
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.exists && result.data) {
          setExistingCertificate(result.data)
          setCertificateData(buildCertificateData(result.data))
        }
      } else if (response.status === 404) {
        setExistingCertificate(null)
      }
    } catch (error) {
      console.error("❌ [checkExistingCertificate] Error:", error)
    } finally {
      setCheckingCertificate(false)
    }
  }

  const calculateStats = () => {
    if (!progressData) return

    const backendFinalScore = progressData.finalScore || progressData.overallProgress || 0

    let actualTimeSpentMinutes = progressData.totalTimeSpentMinutes || 0
    if (actualTimeSpentMinutes === 0 && progressData.completedSteps) {
      const totalSeconds = progressData.completedSteps.reduce(
        (total: number, step: any) => total + (step.time_spent_seconds || 0), 0,
      )
      actualTimeSpentMinutes = Math.ceil(totalSeconds / 60)
    }

    // Count assessments passed using strict criteria
    const completedAssessments =
      progressData.completedSteps?.filter(
        (step: any) =>
          step.type === "assessment" &&
          step.isCompleted === true &&
          (step.status === "passed" || step.passed === true),
      ).length || 0

    const totalAssessments = allSteps.filter((step) => step.type === "assessment").length

    let totalScore = 0
    let scoredAssessments = 0
    if (progressData.completedSteps) {
      progressData.completedSteps.forEach((step: any) => {
        if (
          step.type === "assessment" &&
          step.isCompleted === true &&
          step.score != null
        ) {
          totalScore += step.score
          scoredAssessments++
        }
      })
    }
    const averageScore = scoredAssessments > 0 ? Math.round(totalScore / scoredAssessments) : 0

    const completedLessons =
      progressData.completedLessons ||
      progressData.completedSteps?.filter(
        (step: any) => step.type === "lesson" && step.isCompleted,
      ).length || 0

    const totalLessons =
      progressData.totalLessons ||
      allSteps.filter((step) => step.type !== "assessment").length

    setStats({
      totalScore: averageScore,
      totalMarks: 100,
      percentage: backendFinalScore,
      completedLessons,
      totalLessons,
      completedAssessments,
      totalAssessments,
      timeSpent: actualTimeSpentMinutes,
    })
  }

  const handleGenerateCertificate = async () => {
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken || !user) {
      toast({ title: "Authentication Required", description: "Please log in to generate your certificate.", variant: "destructive" })
      return
    }

    setLoadingCertificate(true)
    try {
      const finalScore = progressData?.finalScore || stats.percentage || 0

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/certificates/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ course_id: courseId, final_score: finalScore }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const certData = result.data
        setExistingCertificate(certData)
        setCertificateData(buildCertificateData(certData, finalScore))
        setShowCertificate(true)
        toast({ title: "Certificate Generated!", description: "Your certificate has been successfully generated." })
      } else {
        throw new Error(result.message || "Failed to generate certificate")
      }
    } catch (error: any) {
      console.error("❌ [handleGenerateCertificate] Error:", error)
      toast({ title: "Error", description: error.message || "Failed to generate certificate. Please try again.", variant: "destructive" })
    } finally {
      setLoadingCertificate(false)
    }
  }

  const handleViewCertificate = () => {
    if (existingCertificate && certificateData) setShowCertificate(true)
  }

  const handleDownloadCertificate = async () => {
    if (!existingCertificate?.id) return
    const cookieToken = Cookies.get("bwenge_token")
    const currentToken = token || cookieToken
    if (!currentToken) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/${existingCertificate.id}/pdf`,
        { headers: { Authorization: `Bearer ${currentToken}` } },
      )
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.pdf_url) window.open(result.data.pdf_url, "_blank")
      }
    } catch (error) {
      console.error("❌ [handleDownloadCertificate] Error:", error)
      toast({ title: "Error", description: "Failed to download certificate. Please try again.", variant: "destructive" })
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-4">
              {isCourseCompleted ? (
                <Trophy className="w-16 h-16 text-yellow-500" />
              ) : (
                <AlertCircle className="w-16 h-16 text-amber-500" />
              )}
            </div>
            <CardTitle className="text-3xl mb-2">
              {isCourseCompleted ? "Congratulations!" : "Course In Progress"}
            </CardTitle>
            <p className="text-xl text-muted-foreground">
              {isCourseCompleted
                ? "You have successfully completed"
                : "You have not yet completed all requirements for"}
            </p>
            <p className="text-2xl font-bold text-primary mt-2">{courseTitle}</p>
            {isCourseCompleted && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  All Assessments Passed
                </span>
              </div>
            )}
            {!isCourseCompleted && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Assessments Pending or Failed
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Overall score */}
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">
                {progressData?.finalScore || stats.percentage || 0}%
              </div>
              <p className="text-lg text-muted-foreground">Overall Score</p>
              <Progress
                value={progressData?.overallProgress || stats.percentage || 0}
                className="w-full max-w-md mx-auto mt-4"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Steps passed: {allSteps.filter((s: any) => {
                  if (!progressData?.completedSteps) return false
                  const id = s.id || ""
                  if (id.endsWith("-lesson")) {
                    const lessonId = id.slice(0, -"-lesson".length)
                    return progressData.completedSteps.some(
                      (cs: any) =>
                        cs.type === "lesson" &&
                        String(cs.lessonId) === String(lessonId) &&
                        cs.isCompleted === true,
                    )
                  }
                  // Assessment: must be passed
                  let assessmentId = ""
                  if (id.includes("-assessment-")) {
                    assessmentId = id.slice(id.indexOf("-assessment-") + "-assessment-".length)
                  } else if (id.includes("-quiz-")) {
                    assessmentId = id.slice(id.indexOf("-quiz-") + "-quiz-".length)
                  } else if (id.endsWith("-final-assessment")) {
                    return progressData.completedSteps.some(
                      (cs: any) =>
                        cs.type === "assessment" &&
                        (cs.lessonId === null || cs.lessonId === undefined || cs.lessonId === "") &&
                        cs.isCompleted === true &&
                        (cs.status === "passed" || cs.passed === true),
                    )
                  }
                  if (!assessmentId) return false
                  return progressData.completedSteps.some(
                    (cs: any) =>
                      cs.type === "assessment" &&
                      String(cs.assessmentId) === String(assessmentId) &&
                      cs.isCompleted === true &&
                      (cs.status === "passed" || cs.passed === true),
                  )
                }).length} of {allSteps.length}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
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
                <div className="text-2xl font-bold">{stats.completedAssessments}</div>
                <div className="text-sm text-muted-foreground">Assessments Passed</div>
                <div className="text-xs text-muted-foreground mt-1">of {stats.totalAssessments}</div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{stats.totalScore}</div>
                <div className="text-sm text-muted-foreground">Average Score</div>
                {progressData?.finalScore && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Final: {progressData.finalScore}%
                  </div>
                )}
              </div>
            </div>

            {/* Certificate section — STRICTLY gated on isCourseCompleted === allStepsCompleted */}
            <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
              <Award className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Certificate of Completion</h3>

              {isCourseCompleted ? (
                // All steps truly passed — show certificate actions
                <>
                  <p className="text-muted-foreground mb-6">
                    {existingCertificate
                      ? "Your certificate is ready — view it or download a PDF copy."
                      : "You've earned a certificate! Generate it below to view and share."}
                  </p>

                  <div className="flex gap-3 justify-center flex-wrap">
                    {checkingCertificate ? (
                      <Button disabled className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </Button>
                    ) : existingCertificate ? (
                      <>
                        <Button
                          onClick={handleViewCertificate}
                          className="flex items-center gap-2 bg-[#0158B7] hover:bg-[#014A9C]"
                        >
                          <Eye className="w-4 h-4" />
                          View Certificate
                        </Button>
                        <Button
                          onClick={handleDownloadCertificate}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleGenerateCertificate}
                        disabled={loadingCertificate}
                        className="flex items-center gap-2 bg-[#0158B7] hover:bg-[#014A9C] px-8"
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
                    <div className="mt-4 text-sm text-muted-foreground space-y-1">
                      <p>
                        Certificate Number:{" "}
                        <span className="font-mono">{existingCertificate.certificate_number}</span>
                      </p>
                      <p>Issued: {new Date(existingCertificate.issue_date).toLocaleDateString()}</p>
                      <p>Final Score: {existingCertificate.final_score || stats.percentage}%</p>
                    </div>
                  )}
                </>
              ) : (
                // NOT truly completed — certificate is locked
                // This is the correct state when enrollmentStatus="COMPLETED" but
                // individual assessments are still pending or failed.
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                    <Lock className="w-5 h-5" />
                    <p className="font-medium">Certificate Locked</p>
                  </div>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    You must pass all lessons and assessments to earn your certificate.
                    Please complete any pending or failed assessments and try again.
                  </p>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg inline-block max-w-sm mx-auto">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      Steps still pending or failed:
                    </p>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1 text-left">
                      {allSteps
                        .filter((s: any) => {
                          if (!progressData?.completedSteps) return true
                          const id = s.id || ""
                          if (id.endsWith("-lesson")) {
                            const lessonId = id.slice(0, -"-lesson".length)
                            return !progressData.completedSteps.some(
                              (cs: any) =>
                                cs.type === "lesson" &&
                                String(cs.lessonId) === String(lessonId) &&
                                cs.isCompleted === true,
                            )
                          }
                          if (id.endsWith("-final-assessment")) {
                            return !progressData.completedSteps.some(
                              (cs: any) =>
                                cs.type === "assessment" &&
                                (cs.lessonId === null || cs.lessonId === undefined || cs.lessonId === "") &&
                                cs.isCompleted === true &&
                                (cs.status === "passed" || cs.passed === true),
                            )
                          }
                          let assessmentId = ""
                          if (id.includes("-assessment-")) {
                            assessmentId = id.slice(id.indexOf("-assessment-") + "-assessment-".length)
                          } else if (id.includes("-quiz-")) {
                            assessmentId = id.slice(id.indexOf("-quiz-") + "-quiz-".length)
                          }
                          if (!assessmentId) return false
                          return !progressData.completedSteps.some(
                            (cs: any) =>
                              cs.type === "assessment" &&
                              String(cs.assessmentId) === String(assessmentId) &&
                              cs.isCompleted === true &&
                              (cs.status === "passed" || cs.passed === true),
                          )
                        })
                        .slice(0, 5)
                        .map((s: any, i: number) => (
                          <li key={i}>• {s.title}</li>
                        ))}
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => window.history.back()}
                  >
                    Go Back and Complete
                  </Button>
                </div>
              )}
            </div>

            {/* What's next */}
            <div className="text-center p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">What's Next?</h3>
              <p className="text-muted-foreground mb-4">
                {isCourseCompleted
                  ? "Continue your learning journey with more courses"
                  : "Complete all assessments to finish the course"}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
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

      {/* Full-screen certificate modal */}
      {showCertificate && certificateData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-auto">
          <div className="min-h-screen p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Certificate of Completion</h2>
                  <p className="text-gray-300 text-sm mt-1">{courseTitle}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowCertificate(false)}
                  className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                  Close
                </Button>
              </div>

              <Certificate
                studentName={certificateData.studentName}
                courseName={certificateData.courseName}
                score={certificateData.score}
                instructorName={certificateData.instructorName}
                institutionName={certificateData.institutionName}
                directorName={certificateData.directorName}
                completionDate={certificateData.completionDate}
                verificationCode={certificateData.verificationCode}
                instructorSignature={certificateData.instructorSignature}
                directorSignature={certificateData.directorSignature}
                organizationStamp={certificateData.organizationStamp}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}