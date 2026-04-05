"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Loader2,
    ArrowLeft,
    User,
    Mail,
    Calendar,
    Clock,
    BookOpen,
    CheckCircle,
    XCircle,
    Award,
    TrendingUp,
    Target,
    AlertCircle,
    PlayCircle,
    FileText,
    ChevronRight,
    MapPin,
    GraduationCap,
    BarChart3,
    Activity,
    Star,
    MessageSquare,
    Download,
    ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { format, formatDistance } from "date-fns"

interface StudentProgressData {
    student: {
        id: string
        name: string
        email: string
        profile_picture_url: string | null
        bio: string | null
        location: string | null
        joined_date: string
        last_login: string | null
    }
    course: {
        id: string
        title: string
        description: string
        thumbnail_url: string | null
        course_type: string
        level: string
        instructor: {
            id: string
            name: string
            email: string
        } | null
    }
    enrollment: {
        id: string
        enrolled_at: string
        status: string
        progress_percentage: number
        completed_lessons: number
        total_time_spent_minutes: number
        last_accessed: string | null
        completion_date: string | null
        final_score: number | null
        certificate_issued: boolean
        certificate: {
            id: string
            issued_at: string
            certificate_url: string
        } | null
    }
    progress: {
        overall_percentage: number
        completed_lessons: number
        total_lessons: number
        completed_modules: number
        total_modules: number
        total_duration_minutes: number
        total_time_spent_minutes: number
        estimated_remaining_minutes: number
        pace: string
    }
    modules: Array<{
        id: string
        title: string
        description: string
        order_index: number
        total_lessons: number
        completed_lessons: number
        progress_percentage: number
        total_duration_minutes: number
        time_spent_minutes: number
        lessons: Array<{
            id: string
            title: string
            type: string
            duration_minutes: number
            order_index: number
            is_completed: boolean
            completed_at: string | null
            last_accessed: string | null
            time_spent_minutes: number
            assessment: {
                id: string
                title: string
                type: string
                passing_score: number
                attempt: {
                    id: string
                    score: number
                    passed: boolean
                    completed_at: string
                    attempts_count: number
                } | null
            } | null
        }>
        final_assessment: {
            id: string
            title: string
            type: string
            passing_score: number
            attempt: {
                id: string
                score: number
                passed: boolean
                completed_at: string
                attempts_count: number
            } | null
        } | null
    }>
    activity_timeline: Array<{
        date: string
        full_date: string
        activities_count: number
        lessons_completed: number
    }>
    performance: {
        assessments_taken: number
        assessments_passed: number
        average_score: number
        best_score: number
        weekly_lesson_completions: Array<{
            week: string
            completions: number
        }>
        engagement_score: number
    }
    review: {
        id: string
        rating: number
        comment: string
        created_at: string
    } | null
    recommended_next_steps: Array<{
        type: string
        title: string
        module?: string
        priority: string
        action: string
    }>
}

export default function StudentProgressPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const studentId = params.studentId as string
    const courseId = searchParams.get("course")
    
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<StudentProgressData | null>(null)
    const [activeTab, setActiveTab] = useState("overview")

    useEffect(() => {
        if (studentId && courseId) {
            fetchProgress()
        } else {
            toast.error("Missing student or course information")
            router.back()
        }
    }, [studentId, courseId])

    const fetchProgress = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("bwengeplus_token")
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/instructor/student-progress/${studentId}?course=${courseId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            if (response.ok) {
                const result = await response.json()
                setData(result.data)
            } else {
                const error = await response.json()
                toast.error(error.message || "Failed to load student progress")
                router.back()
            }
        } catch (error) {
            toast.error("Failed to load student progress")
            router.back()
        } finally {
            setLoading(false)
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "text-destructive bg-destructive/10 border-destructive/30"
            case "medium": return "text-warning bg-warning/10 border-warning/30"
            default: return "text-primary bg-primary/10 border-primary/30"
        }
    }

    const getEngagementColor = (score: number) => {
        if (score >= 70) return "text-success"
        if (score >= 40) return "text-warning"
        return "text-destructive"
    }

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) return `${hours}h ${mins}m`
        return `${mins}m`
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A"
        try {
            return format(new Date(dateString), "MMM d, yyyy")
        } catch {
            return "Invalid date"
        }
    }

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return "N/A"
        try {
            return format(new Date(dateString), "MMM d, yyyy h:mm a")
        } catch {
            return "Invalid date"
        }
    }

    const getRelativeTime = (dateString: string | null) => {
        if (!dateString) return "Never"
        try {
            return formatDistance(new Date(dateString), new Date(), { addSuffix: true })
        } catch {
            return "Unknown"
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="container mx-auto p-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
                <p className="text-muted-foreground">Unable to load student progress information.</p>
                <Button className="mt-4" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-muted/50">
                {/* Header */}
                <div className="bg-card border-b sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.back()}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <div>
                                    <h1 className="text-xl font-bold">Student Progress</h1>
                                    <p className="text-sm text-muted-foreground">
                                        {data.course.title}
                                    </p>
                                </div>
                            </div>
                            {data.enrollment.certificate && (
                                <Button variant="outline" size="sm" asChild>
                                    <a href={data.enrollment.certificate.certificate_url} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4 mr-2" />
                                        Certificate
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-6">
                    {/* Student Info Card */}
                    <Card className="mb-6">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-20 h-20">
                                        <AvatarImage src={data.student.profile_picture_url || undefined} />
                                        <AvatarFallback className="text-2xl bg-primary/15 text-primary">
                                            {data.student.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-2xl font-bold">{data.student.name}</h2>
                                        <div className="flex flex-wrap gap-3 mt-1">
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Mail className="w-4 h-4" />
                                                {data.student.email}
                                            </div>
                                            {data.student.location && (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <MapPin className="w-4 h-4" />
                                                    {data.student.location}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="w-4 h-4" />
                                                Joined {formatDate(data.student.joined_date)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                        <p className="text-2xl font-bold text-primary">{data.progress.overall_percentage}%</p>
                                        <p className="text-xs text-muted-foreground">Overall Progress</p>
                                    </div>
                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                        <p className="text-2xl font-bold">{data.progress.completed_lessons}/{data.progress.total_lessons}</p>
                                        <p className="text-xs text-muted-foreground">Lessons Completed</p>
                                    </div>
                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                        <p className="text-2xl font-bold">{formatDuration(data.progress.total_time_spent_minutes)}</p>
                                        <p className="text-xs text-muted-foreground">Time Spent</p>
                                    </div>
                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                        <p className="text-2xl font-bold">{getEngagementColor(data.performance.engagement_score)}
                                            {data.performance.engagement_score}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Engagement Score</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Overview */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Progress Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Course Progress</span>
                                        <span className="font-medium">{data.progress.overall_percentage}%</span>
                                    </div>
                                    <Progress value={data.progress.overall_percentage} className="h-2" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                        <GraduationCap className="w-8 h-8 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Modules Completed</p>
                                            <p className="text-xl font-bold">{data.progress.completed_modules}/{data.progress.total_modules}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                        <Clock className="w-8 h-8 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Estimated Remaining</p>
                                            <p className="text-xl font-bold">{formatDuration(data.progress.estimated_remaining_minutes)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                        <Activity className="w-8 h-8 text-success" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Pace</p>
                                            <p className="text-sm font-medium">{data.progress.pace}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="overview">Modules & Lessons</TabsTrigger>
                            <TabsTrigger value="analytics">Analytics & Performance</TabsTrigger>
                            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab - Modules and Lessons */}
                        <TabsContent value="overview">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Course Modules</CardTitle>
                                    <CardDescription>
                                        Detailed breakdown of student's progress through each module
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="single" collapsible className="space-y-4">
                                        {data.modules.map((module) => (
                                            <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                                                <AccordionTrigger className="hover:no-underline py-4">
                                                    <div className="flex-1 flex items-center justify-between pr-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold">Module {module.order_index}</span>
                                                                <span className="text-muted-foreground">•</span>
                                                                <span>{module.title}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                                <span>{module.completed_lessons}/{module.total_lessons} lessons</span>
                                                                <span>{formatDuration(module.time_spent_minutes)} spent</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-24">
                                                                <Progress value={module.progress_percentage} className="h-2" />
                                                            </div>
                                                            <span className="text-sm font-medium w-12">{module.progress_percentage}%</span>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pt-2 pb-4">
                                                    <div className="space-y-2">
                                                        {module.lessons.map((lesson) => (
                                                            <div
                                                                key={lesson.id}
                                                                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                                                    lesson.is_completed ? "bg-success/10" : "bg-muted/50"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    {lesson.is_completed ? (
                                                                        <CheckCircle className="w-5 h-5 text-success" />
                                                                    ) : lesson.last_accessed ? (
                                                                        <PlayCircle className="w-5 h-5 text-primary" />
                                                                    ) : (
                                                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                                                    )}
                                                                    <div>
                                                                        <p className="font-medium">{lesson.title}</p>
                                                                        <div className="flex gap-3 text-xs text-muted-foreground">
                                                                            <span>{lesson.type}</span>
                                                                            <span>{formatDuration(lesson.duration_minutes)}</span>
                                                                            {lesson.time_spent_minutes > 0 && (
                                                                                <span>Spent: {formatDuration(lesson.time_spent_minutes)}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {lesson.assessment && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                {lesson.assessment.attempt?.passed ? (
                                                                                    <Badge className="bg-success/15 text-success">
                                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                                        Passed
                                                                                    </Badge>
                                                                                ) : lesson.assessment.attempt ? (
                                                                                    <Badge className="bg-destructive/15 text-destructive">
                                                                                        <XCircle className="w-3 h-3 mr-1" />
                                                                                        Failed
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline">Pending</Badge>
                                                                                )}
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Score: {lesson.assessment.attempt?.score || 0}%</p>
                                                                                <p>Passing: {lesson.assessment.passing_score}%</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                    {lesson.is_completed && lesson.completed_at && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {formatDate(lesson.completed_at)}
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                Completed {getRelativeTime(lesson.completed_at)}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        
                                                        {/* Module Final Assessment */}
                                                        {module.final_assessment && (
                                                            <div className={`flex items-center justify-between p-3 rounded-lg mt-3 ${
                                                                module.final_assessment.attempt?.passed ? "bg-primary/10" : "bg-muted/50"
                                                            }`}>
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <Award className="w-5 h-5 text-primary" />
                                                                    <div>
                                                                        <p className="font-medium">{module.final_assessment.title}</p>
                                                                        <p className="text-xs text-muted-foreground">Module Final Assessment</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {module.final_assessment.attempt ? (
                                                                        <Badge className={module.final_assessment.attempt.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
                                                                            Score: {module.final_assessment.attempt.score}%
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline">Not Started</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Analytics Tab */}
                        <TabsContent value="analytics">
                            <div className="space-y-6">
                                {/* Performance Metrics */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5" />
                                            Assessment Performance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                                <p className="text-2xl font-bold">{data.performance.assessments_taken}</p>
                                                <p className="text-sm text-muted-foreground">Assessments Taken</p>
                                            </div>
                                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                                <p className="text-2xl font-bold text-success">{data.performance.assessments_passed}</p>
                                                <p className="text-sm text-muted-foreground">Assessments Passed</p>
                                            </div>
                                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                                <p className="text-2xl font-bold">{data.performance.average_score}%</p>
                                                <p className="text-sm text-muted-foreground">Average Score</p>
                                            </div>
                                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                                <p className="text-2xl font-bold">{data.performance.best_score}%</p>
                                                <p className="text-sm text-muted-foreground">Best Score</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Activity Timeline */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="w-5 h-5" />
                                            Activity Timeline (Last 30 Days)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {data.activity_timeline.map((day) => (
                                                <div key={day.full_date} className="flex items-center gap-4">
                                                    <div className="w-20 text-sm text-muted-foreground">{day.date}</div>
                                                    <div className="flex-1">
                                                        <div className="flex gap-1 h-8">
                                                            {day.activities_count > 0 && (
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <div 
                                                                            className="bg-primary rounded-sm"
                                                                            style={{ 
                                                                                width: `${Math.min(100, (day.activities_count / 20) * 100)}%`,
                                                                                height: "100%"
                                                                            }}
                                                                        />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        {day.activities_count} activities
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {day.lessons_completed > 0 && (
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <div 
                                                                            className="bg-success/100 rounded-sm"
                                                                            style={{ 
                                                                                width: `${Math.min(100, (day.lessons_completed / 10) * 100)}%`,
                                                                                height: "100%"
                                                                            }}
                                                                        />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        {day.lessons_completed} lessons completed
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-16 text-right text-xs text-muted-foreground">
                                                        {day.lessons_completed > 0 && `${day.lessons_completed} done`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Weekly Completions */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Weekly Lesson Completions</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {data.performance.weekly_lesson_completions.map((week) => (
                                                <div key={week.week} className="flex items-center gap-4">
                                                    <div className="w-24 text-sm font-medium">{week.week}</div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={Math.min(100, week.completions * 10)} className="h-2 flex-1" />
                                                            <span className="text-sm w-12">{week.completions} lessons</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Student Review */}
                                {data.review && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Star className="w-5 h-5 text-warning" />
                                                Student Feedback
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-start gap-3">
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`w-4 h-4 ${
                                                                star <= (data.review?.rating || 0)
                                                                    ? "text-warning fill-yellow-400"
                                                                    : "text-muted-foreground"
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-muted-foreground">{data.review.comment}</p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Submitted {formatDate(data.review.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>

                        {/* Recommendations Tab */}
                        <TabsContent value="recommendations">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Recommended Next Steps
                                    </CardTitle>
                                    <CardDescription>
                                        Personalized recommendations to help the student succeed
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {data.recommended_next_steps.map((step, index) => (
                                            <div
                                                key={index}
                                                className={`flex items-center justify-between p-4 rounded-lg border ${getPriorityColor(step.priority)}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {step.type === "lesson" && <PlayCircle className="w-5 h-5" />}
                                                    {step.type === "assessment" && <FileText className="w-5 h-5" />}
                                                    {step.type === "final_assessment" && <Award className="w-5 h-5" />}
                                                    {step.type === "review" && <Star className="w-5 h-5" />}
                                                    <div>
                                                        <p className="font-medium">{step.title}</p>
                                                        {step.module && (
                                                            <p className="text-sm text-muted-foreground">Module: {step.module}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge className={getPriorityColor(step.priority)}>
                                                    {step.priority === "high" ? "High Priority" : step.priority === "medium" ? "Medium Priority" : "Low Priority"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Message Student */}
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5" />
                                        Message Student
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild className="w-full">
                                        <a href={`mailto:${data.student.email}?subject=Regarding your progress in ${data.course.title}`}>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send Email to Student
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </TooltipProvider>
    )
}