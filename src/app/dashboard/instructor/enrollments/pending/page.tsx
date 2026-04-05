"use client"

import { useState, useEffect, useCallback } from "react"
import { useAppSelector } from "@/lib/hooks"
import { useRealtimeEvents } from "@/hooks/use-realtime"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Loader2,
    RefreshCw,
    Search,
    Key,
    CheckCircle,
    XCircle,
    Clock,
    User,
    BookOpen,
    MoreVertical,
    Send,
    Filter,
    Download,
    Eye,
    BarChart3,
    GraduationCap,
    Mail,
    Calendar,
    AlertCircle,
    Copy,
    Check,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

// Types
interface AccessCodeRequest {
    id: string
    user: {
        id: string
        email: string
        first_name: string
        last_name: string
        profile_picture_url: string | null
    }
    course: {
        id: string
        title: string
        course_type: string
        thumbnail_url: string | null
        institution: {
            id: string
            name: string
        } | null
    }
    request_message: string | null
    requested_at: string
    status: string
    approval_status: string
    access_code_sent: boolean
    access_code_sent_at: string | null
}

interface PendingApproval {
    id: string
    user: {
        id: string
        email: string
        first_name: string
        last_name: string
        profile_picture_url: string | null
    }
    course: {
        id: string
        title: string
        course_type: string
        thumbnail_url: string | null
        instructor: {
            id: string
            first_name: string
            last_name: string
        } | null
    }
    enrolled_at: string
    status: string
    approval_status: string
    requires_approval: boolean
    request_message: string | null
    request_type: string
}

interface Enrollment {
    id: string
    user_id: string
    user: {
        id: string
        email: string
        first_name: string
        last_name: string
        profile_picture_url: string | null
    }
    course_id: string
    course: {
        id: string
        title: string
        description: string
        thumbnail_url: string | null
        course_type: string
        level: string
    }
    progress_percentage: number
    status: string
    approval_status: string
    request_type: string
    access_code_used: string | null
    enrolled_at: string
    last_accessed: string | null
    completed_lessons: number
    total_time_spent_minutes: number
}

interface AnalyticsData {
    summary: {
        total_enrollments: number
        active_enrollments: number
        completed_enrollments: number
        dropped_enrollments: number
        pending_enrollments: number
        conversion_rate: number
        average_completion_time: number
        total_students: number
        students_with_multiple_enrollments: number
        active_last_30_days: number
        average_progress: number
    }
    by_course: Array<{
        course_id: string
        course_title: string
        course_type: string
        enrollment_count: number
        active_count: number
        completed_count: number
        pending_count: number
        dropped_count: number
        completion_rate: number
        average_progress: number
    }>
    top_courses: Array<{
        course_id: string
        course_title: string
        enrollment_count: number
        active_count: number
        completed_count: number
    }>
    by_month: Array<{
        month: string
        enrollments: number
        completions: number
        active: number
        pending: number
    }>
}

interface Course {
    id: string
    title: string
    course_type: string
    thumbnail_url: string | null
    enrollment_count: number
    status: string
}

export default function InstructorEnrollmentsPage() {
    const { user } = useAppSelector((state) => state.bwengeAuth)
    const [activeTab, setActiveTab] = useState("access-code-requests")
    const [loading, setLoading] = useState(true)
    const [accessCodeRequests, setAccessCodeRequests] = useState<AccessCodeRequest[]>([])
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [courses, setCourses] = useState<Course[]>([])
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRequest, setSelectedRequest] = useState<AccessCodeRequest | null>(null)
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
    const [showSendCodeDialog, setShowSendCodeDialog] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [rejectionReason, setRejectionReason] = useState("")
    const [sendingCode, setSendingCode] = useState(false)
    const [processingAction, setProcessingAction] = useState(false)
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [showAnalytics, setShowAnalytics] = useState(false)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const [generatedCode, setGeneratedCode] = useState<string | null>(null)

    const stats = {
        pendingRequests: accessCodeRequests.filter(r => !r.access_code_sent).length,
        pendingApprovals: pendingApprovals.length,
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter(e => e.status === "ACTIVE").length,
        completedEnrollments: enrollments.filter(e => e.status === "COMPLETED").length,
    }

    useEffect(() => {
        fetchAllData()
    }, [])

    // Real-time enrollment updates
    useRealtimeEvents({
        "enrollment-approved": () => fetchAllData(),
        "enrollment-rejected": () => fetchAllData(),
        "enrollment-count-updated": () => fetchAllData(),
        "new-notification": (data: any) => {
            if (data?.type === "NEW_ENROLLMENT_REQUEST" || data?.type === "ENROLLMENT_PENDING") {
                fetchAllData()
            }
        },
    })

const fetchAllData = async () => {
    setLoading(true)
    try {
        const token = localStorage.getItem("bwengeplus_token")

        // Fetch instructor's courses
        const coursesResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/courses/instructor/my-courses`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
        
        if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json()
            // Extract courses array from the nested data structure
            if (coursesData.data?.courses && Array.isArray(coursesData.data.courses)) {
                setCourses(coursesData.data.courses)
            } else if (coursesData.data && Array.isArray(coursesData.data)) {
                setCourses(coursesData.data)
            } else {
                setCourses([])
            }
        } else {
            setCourses([])
        }

        // Fetch access code requests
        const requestsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/access-code-requests`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
        if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json()
            setAccessCodeRequests(requestsData.data || [])
        }

        // Fetch pending approvals
        const approvalsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/pending`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
        if (approvalsResponse.ok) {
            const approvalsData = await approvalsResponse.json()
            setPendingApprovals(approvalsData.data || [])
        }

        // Fetch enrollments
        const enrollmentsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: "all", limit: 200 }),
            }
        )
        if (enrollmentsResponse.ok) {
            const enrollmentsData = await enrollmentsResponse.json()
            setEnrollments(enrollmentsData.data || [])
        }

        // Fetch analytics
        const analyticsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/analytics/instructor`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
        if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json()
            setAnalytics(analyticsData.data)
        }

    } catch (error) {
        console.error("Error loading data:", error)
        toast.error("Failed to load enrollment data")
    } finally {
        setLoading(false)
    }
}

    const fetchAccessCodeRequests = async (token: string | null) => {
        const requestsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/access-code-requests`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
        if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json()
            setAccessCodeRequests(requestsData.data || [])
        }
    }

    const fetchPendingApprovals = async (token: string | null) => {
        const approvalsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/pending`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
        if (approvalsResponse.ok) {
            const approvalsData = await approvalsResponse.json()
            setPendingApprovals(approvalsData.data || [])
        }
    }

    const fetchEnrollments = async (token: string | null) => {
        const enrollmentsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: "all", limit: 200 }),
            }
        )
        if (enrollmentsResponse.ok) {
            const enrollmentsData = await enrollmentsResponse.json()
            setEnrollments(enrollmentsData.data || [])
        }
    }

    const fetchAnalytics = async (token: string | null) => {
        const analyticsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/enrollments/analytics/instructor${selectedCourseId !== "all" ? `?course_id=${selectedCourseId}` : ""}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
        if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json()
            setAnalytics(analyticsData.data)
        }
    }

    const handleSendAccessCode = async (request: AccessCodeRequest) => {
        setSelectedRequest(request)
        setShowSendCodeDialog(true)
    }

    const confirmSendAccessCode = async () => {
        if (!selectedRequest) return

        setSendingCode(true)
        try {
            const token = localStorage.getItem("bwengeplus_token")

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/send-access-code`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        enrollment_request_id: selectedRequest.id,
                    }),
                }
            )

            const data = await response.json()

            if (data.success) {
                toast.success(`Access code sent to ${selectedRequest.user.email}`)
                if (data.data?.access_code) {
                    setGeneratedCode(data.data.access_code)
                    setTimeout(() => setGeneratedCode(null), 5000)
                }
                setShowSendCodeDialog(false)
                fetchAllData()
            } else {
                toast.error(data.message || "Failed to send access code")
            }
        } catch (error) {
            toast.error("Failed to send access code")
        } finally {
            setSendingCode(false)
        }
    }

    const handleApproveEnrollment = async (enrollmentId: string) => {
        setProcessingAction(true)
        try {
            const token = localStorage.getItem("bwengeplus_token")

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/${enrollmentId}/approve`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const data = await response.json()

            if (data.success) {
                toast.success("Enrollment approved successfully")
                fetchAllData()
            } else {
                toast.error(data.message || "Failed to approve enrollment")
            }
        } catch (error) {
            toast.error("Failed to approve enrollment")
        } finally {
            setProcessingAction(false)
        }
    }

    const handleRejectEnrollment = async () => {
        if (!selectedEnrollment) return

        setProcessingAction(true)
        try {
            const token = localStorage.getItem("bwengeplus_token")

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/${selectedEnrollment.id}/reject`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ rejection_reason: rejectionReason }),
                }
            )

            const data = await response.json()

            if (data.success) {
                toast.success("Enrollment rejected")
                setShowRejectDialog(false)
                setRejectionReason("")
                fetchAllData()
            } else {
                toast.error(data.message || "Failed to reject enrollment")
            }
        } catch (error) {
            toast.error("Failed to reject enrollment")
        } finally {
            setProcessingAction(false)
        }
    }

    const openRejectDialog = (enrollment: PendingApproval | Enrollment) => {
        setSelectedEnrollment(enrollment as Enrollment)
        setShowRejectDialog(true)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedCode(text)
        setTimeout(() => setCopiedCode(null), 2000)
        toast.success("Code copied to clipboard")
    }

    const filterByCourse = useCallback((items: any[]) => {
        if (selectedCourseId === "all") return items
        return items.filter(item => item.course?.id === selectedCourseId)
    }, [selectedCourseId])

    const filterBySearch = useCallback((items: any[], searchFields: string[]) => {
        if (!searchTerm) return items
        return items.filter(item => {
            return searchFields.some(field => {
                const value = field.split('.').reduce((obj, key) => obj?.[key], item)
                return value?.toLowerCase().includes(searchTerm.toLowerCase())
            })
        })
    }, [searchTerm])

    const filteredRequests = filterByCourse(
        filterBySearch(accessCodeRequests, ['user.email', 'user.first_name', 'user.last_name', 'course.title'])
    )

    const filteredApprovals = filterByCourse(
        filterBySearch(pendingApprovals, ['user.email', 'user.first_name', 'user.last_name', 'course.title'])
    )

    const filteredEnrollments = filterByCourse(
        filterBySearch(enrollments, ['user.email', 'user.first_name', 'user.last_name', 'course.title'])
    )

    const formatDate = (dateString: string) => {
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

    const getStatusBadge = (status: string, approvalStatus?: string) => {
        if (approvalStatus === "REJECTED") {
            return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Rejected</Badge>
        }
        switch (status) {
            case "ACTIVE":
                return <Badge className="bg-success/15 text-success border-success/30">Active</Badge>
            case "PENDING":
                return <Badge className="bg-warning/15 text-warning border-warning/30">Pending</Badge>
            case "COMPLETED":
                return <Badge className="bg-primary/15 text-primary border-primary/30">Completed</Badge>
            case "DROPPED":
                return <Badge className="bg-muted text-foreground border-border">Dropped</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getCourseTypeBadge = (courseType: string) => {
        return courseType === "SPOC" ? (
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                SPOC
            </Badge>
        ) : (
            <Badge variant="outline" className="border-success/30 text-success bg-success/10">
                MOOC
            </Badge>
        )
    }

    const exportToCSV = () => {
        const headers = ["Student Name", "Student Email", "Course", "Status", "Progress %", "Enrolled Date", "Last Accessed"]
        const rows = filteredEnrollments.map(e => [
            `${e.user?.first_name || ""} ${e.user?.last_name || ""}`,
            e.user?.email || "",
            e.course?.title || "",
            e.status,
            e.progress_percentage || 0,
            formatDate(e.enrolled_at),
            formatDateTime(e.last_accessed),
        ])

        const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `enrollments_${format(new Date(), "yyyy-MM-dd")}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("Export started")
    }

    // Course filter component
    const CourseFilter = () => (
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                        {course.title.length > 25 ? course.title.slice(0, 25) + "..." : course.title}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    return (
        <TooltipProvider>
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Course Enrollments</h1>
                        <p className="text-muted-foreground">
                            Manage access code requests, enrollment approvals, and track student progress
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowAnalytics(!showAnalytics)}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            {showAnalytics ? "Hide Analytics" : "Show Analytics"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Access Code Requests</p>
                                    <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                                </div>
                                <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
                                    <Key className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                                    <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                                </div>
                                <div className="w-10 h-10 bg-warning/15 rounded-full flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-warning" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Enrollments</p>
                                    <p className="text-2xl font-bold">{stats.activeEnrollments}</p>
                                </div>
                                <div className="w-10 h-10 bg-success/15 rounded-full flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-success" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold">{stats.completedEnrollments}</p>
                                </div>
                                <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Students</p>
                                    <p className="text-2xl font-bold">{new Set(enrollments.map(e => e.user_id)).size}</p>
                                </div>
                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Analytics Section */}
                {showAnalytics && analytics && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Enrollment Analytics
                            </CardTitle>
                            <CardDescription>
                                Key metrics and trends for your courses
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold">{analytics.summary.conversion_rate.toFixed(1)}%</p>
                                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold">{Math.round(analytics.summary.average_completion_time)}</p>
                                    <p className="text-xs text-muted-foreground">Avg Completion (days)</p>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold">{analytics.summary.active_last_30_days}</p>
                                    <p className="text-xs text-muted-foreground">Active (30 days)</p>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold">{Math.round(analytics.summary.average_progress)}%</p>
                                    <p className="text-xs text-muted-foreground">Avg Progress</p>
                                </div>
                            </div>

                            {/* Course Performance */}
                            {analytics.by_course.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">Course Performance</h4>
                                    <div className="space-y-3">
                                        {analytics.by_course.map(course => (
                                            <div key={course.course_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium">{course.course_title}</p>
                                                    <div className="flex gap-4 mt-1">
                                                        <span className="text-xs text-muted-foreground">{course.enrollment_count} enrolled</span>
                                                        <span className="text-xs text-muted-foreground">{course.active_count} active</span>
                                                        <span className="text-xs text-muted-foreground">{course.completed_count} completed</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold">{Math.round(course.completion_rate * 100)}%</p>
                                                    <p className="text-xs text-muted-foreground">completion</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search by name, email, or course..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <CourseFilter />
                    <Button variant="outline" size="icon" onClick={exportToCSV}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-3">
                        <TabsTrigger value="access-code-requests" className="relative">
                            Access Code Requests
                            {stats.pendingRequests > 0 && (
                                <Badge className="ml-2 bg-primary text-white">{stats.pendingRequests}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="pending-approvals" className="relative">
                            Pending Approvals
                            {stats.pendingApprovals > 0 && (
                                <Badge className="ml-2 bg-warning text-white">{stats.pendingApprovals}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="all-enrollments">
                            All Enrollments ({stats.totalEnrollments})
                        </TabsTrigger>
                    </TabsList>

                    {/* Access Code Requests Tab */}
                    <TabsContent value="access-code-requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>Access Code Requests</CardTitle>
                                <CardDescription>
                                    Learners requesting access codes for your SPOC courses
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                            No Access Code Requests
                                        </h3>
                                        <p className="text-muted-foreground">
                                            When learners request access codes for your SPOC courses, they will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Learner</TableHead>
                                                    <TableHead>Course</TableHead>
                                                    <TableHead>Requested</TableHead>
                                                    <TableHead>Message</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarImage src={request.user.profile_picture_url || undefined} />
                                                                    <AvatarFallback>
                                                                        {request.user.first_name?.[0]}{request.user.last_name?.[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {request.user.first_name} {request.user.last_name}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">{request.user.email}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {getCourseTypeBadge(request.course.course_type)}
                                                                <span className="font-medium">
                                                                    {request.course.title.length > 25
                                                                        ? request.course.title.slice(0, 25) + "..."
                                                                        : request.course.title}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            {formatDate(request.requested_at)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {request.request_message ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="text-sm text-muted-foreground cursor-help">
                                                                            {request.request_message.length > 30
                                                                                ? request.request_message.slice(0, 30) + "..."
                                                                                : request.request_message}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">{request.request_message}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">No message</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {request.access_code_sent ? (
                                                                <Badge className="bg-success/15 text-success border-success/30">
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Code Sent
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-warning/15 text-warning border-warning/30">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {!request.access_code_sent ? (
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-primary hover:bg-primary"
                                                                    onClick={() => handleSendAccessCode(request)}
                                                                >
                                                                    <Send className="w-4 h-4 mr-2" />
                                                                    Generate & Send
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleSendAccessCode(request)}
                                                                >
                                                                    <Send className="w-4 h-4 mr-2" />
                                                                    Resend
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Pending Approvals Tab */}
                    <TabsContent value="pending-approvals">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Approvals</CardTitle>
                                <CardDescription>
                                    Enrollment requests waiting for your approval
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-warning" />
                                    </div>
                                ) : filteredApprovals.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                            No Pending Approvals
                                        </h3>
                                        <p className="text-muted-foreground">
                                            All enrollment requests have been processed.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Learner</TableHead>
                                                    <TableHead>Course</TableHead>
                                                    <TableHead>Requested</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Message</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredApprovals.map((approval) => (
                                                    <TableRow key={approval.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarImage src={approval.user.profile_picture_url || undefined} />
                                                                    <AvatarFallback>
                                                                        {approval.user.first_name?.[0]}{approval.user.last_name?.[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {approval.user.first_name} {approval.user.last_name}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">{approval.user.email}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {getCourseTypeBadge(approval.course.course_type)}
                                                                <span className="font-medium">
                                                                    {approval.course.title.length > 25
                                                                        ? approval.course.title.slice(0, 25) + "..."
                                                                        : approval.course.title}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            {formatDate(approval.enrolled_at)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize">
                                                                {approval.request_type?.replace("_", " ").toLowerCase() || "Approval"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {approval.request_message ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="text-sm text-muted-foreground cursor-help">
                                                                            {approval.request_message.length > 30
                                                                                ? approval.request_message.slice(0, 30) + "..."
                                                                                : approval.request_message}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">{approval.request_message}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">No message</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-success border-success/30 hover:bg-success/10"
                                                                    onClick={() => handleApproveEnrollment(approval.id)}
                                                                    disabled={processingAction}
                                                                >
                                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                                                    onClick={() => openRejectDialog(approval)}
                                                                    disabled={processingAction}
                                                                >
                                                                    <XCircle className="w-4 h-4 mr-1" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* All Enrollments Tab */}
                    <TabsContent value="all-enrollments">
                        <Card>
                            <CardHeader>
                                <CardTitle>All Enrollments</CardTitle>
                                <CardDescription>
                                    Complete list of students enrolled in your courses
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredEnrollments.length === 0 ? (
                                    <div className="text-center py-8">
                                        <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                            No Enrollments Found
                                        </h3>
                                        <p className="text-muted-foreground">
                                            No students are enrolled in your courses yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Student</TableHead>
                                                    <TableHead>Course</TableHead>
                                                    <TableHead>Enrolled</TableHead>
                                                    <TableHead>Progress</TableHead>
                                                    <TableHead>Time Spent</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredEnrollments.map((enrollment) => (
                                                    <TableRow key={enrollment.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarImage src={enrollment.user?.profile_picture_url} />
                                                                    <AvatarFallback>
                                                                        {enrollment.user?.first_name?.[0]}{enrollment.user?.last_name?.[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {enrollment.user?.first_name} {enrollment.user?.last_name}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">{enrollment.user?.email}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {getCourseTypeBadge(enrollment.course?.course_type)}
                                                                <span className="font-medium">
                                                                    {enrollment.course?.title.length > 25
                                                                        ? enrollment.course?.title.slice(0, 25) + "..."
                                                                        : enrollment.course?.title}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            {formatDate(enrollment.enrolled_at)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-primary transition-all"
                                                                        style={{ width: `${enrollment.progress_percentage}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-sm">{enrollment.progress_percentage}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-sm">
                                                                    {Math.floor(enrollment.total_time_spent_minutes / 60)}h {enrollment.total_time_spent_minutes % 60}m
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(enrollment.status, enrollment.approval_status)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => window.open(`/dashboard/instructor/student-progress/${enrollment.user_id}?course=${enrollment.course_id}`, "_blank")}
                                                                        >
                                                                            <Eye className="w-4 h-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>View Progress</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => window.location.href = `mailto:${enrollment.user?.email}`}
                                                                        >
                                                                            <Mail className="w-4 h-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Send Email</TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Send Access Code Dialog */}
                <Dialog open={showSendCodeDialog} onOpenChange={setShowSendCodeDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generate & Send Access Code</DialogTitle>
                            <DialogDescription>
                                This will generate a unique access code and send it to the learner's email.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedRequest && (
                            <div className="space-y-4 py-4">
                                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback className="bg-primary/15 text-primary">
                                                {selectedRequest.user.first_name?.[0]}{selectedRequest.user.last_name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">
                                                {selectedRequest.user.first_name} {selectedRequest.user.last_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{selectedRequest.user.email}</p>
                                            <p className="text-sm mt-1">
                                                <span className="font-medium">Course:</span> {selectedRequest.course.title}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedRequest.request_message && (
                                        <div className="mt-3 pt-3 border-t border-primary/30">
                                            <p className="text-xs font-semibold text-primary">Message from learner:</p>
                                            <p className="text-sm text-primary italic mt-1">"{selectedRequest.request_message}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                                    <p className="text-xs text-primary flex items-start">
                                        <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                        <span>The access code will be valid for this specific course only. The learner will receive an email with the code and instructions to redeem it.</span>
                                    </p>
                                </div>

                                {generatedCode && (
                                    <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
                                        <p className="text-sm text-success mb-2">Access Code Generated:</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <code className="text-2xl font-mono font-bold text-success">{generatedCode}</code>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(generatedCode)}
                                            >
                                                {copiedCode === generatedCode ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-success mt-2">Code copied to clipboard! You can also share it manually.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowSendCodeDialog(false)
                                    setGeneratedCode(null)
                                }}
                                disabled={sendingCode}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={confirmSendAccessCode}
                                disabled={sendingCode}
                                className="bg-primary hover:bg-primary"
                            >
                                {sendingCode ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating & Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Generate & Send Code
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reject Enrollment Dialog */}
                <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Enrollment Request</DialogTitle>
                            <DialogDescription>
                                Please provide a reason for rejecting this enrollment request. The learner will be notified via email.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {selectedEnrollment && (
                                <div className="bg-muted/50 rounded-lg p-4">
                                    <p className="text-sm">
                                        <span className="font-medium">Learner:</span> {selectedEnrollment.user?.first_name} {selectedEnrollment.user?.last_name}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">Course:</span> {selectedEnrollment.course?.title}
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Rejection Reason</label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Explain why the enrollment request is being rejected..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowRejectDialog(false)
                                    setRejectionReason("")
                                }}
                                disabled={processingAction}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleRejectEnrollment}
                                disabled={processingAction || !rejectionReason.trim()}
                            >
                                {processingAction ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                )}
                                Reject Enrollment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}