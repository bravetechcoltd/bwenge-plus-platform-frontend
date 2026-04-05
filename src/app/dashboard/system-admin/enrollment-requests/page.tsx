// app/dashboard/system-admin/public-courses/page.tsx
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
    CheckCircle,
    XCircle,
    Clock,
    User,
    BookOpen,
    Send,
    Filter,
    Download,
    Eye,
    Globe,
    Users,
    GraduationCap,
    AlertCircle,
    Copy,
    Check,
    Key,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

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
        instructor: {
            id: string
            first_name: string
            last_name: string
            email: string
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
            email: string
        } | null
    }
    enrolled_at: string
    status: string
    approval_status: string
    request_type: string
    request_message: string | null
}

interface PublicCourse {
    id: string
    title: string
    course_type: string
    thumbnail_url: string | null
    enrollment_count: number
    status: string
    is_public: boolean
}

export default function SystemAdminPublicCoursesPage() {
    const { user } = useAppSelector((state) => state.bwengeAuth)
    const [activeTab, setActiveTab] = useState("access-code-requests")
    const [loading, setLoading] = useState(true)
    const [accessCodeRequests, setAccessCodeRequests] = useState<AccessCodeRequest[]>([])
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
    const [courses, setCourses] = useState<PublicCourse[]>([])
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRequest, setSelectedRequest] = useState<AccessCodeRequest | null>(null)
    const [selectedEnrollment, setSelectedEnrollment] = useState<PendingApproval | null>(null)
    const [showSendCodeDialog, setShowSendCodeDialog] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [rejectionReason, setRejectionReason] = useState("")
    const [sendingCode, setSendingCode] = useState(false)
    const [processingAction, setProcessingAction] = useState(false)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const [generatedCode, setGeneratedCode] = useState<string | null>(null)

    const stats = {
        pendingRequests: accessCodeRequests.filter(r => !r.access_code_sent).length,
        pendingApprovals: pendingApprovals.length,
        totalCourses: courses.length,
        publicSPOCCount: courses.filter(c => c.course_type === "SPOC" && c.is_public).length,
        publicMOOCCount: courses.filter(c => c.course_type === "MOOC" && c.is_public).length,
    }

    useEffect(() => {
        fetchAllData()
    }, [])

    // Real-time: refresh when enrollment events occur
    useRealtimeEvents({
        "enrollment-approved": () => fetchAllData(),
        "enrollment-rejected": () => fetchAllData(),
        "enrollment-count-updated": () => fetchAllData(),
        "course-published": () => fetchAllData(),
    })

    const fetchAllData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("bwengeplus_token")

            // Fetch public courses
            const coursesResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/courses/all`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
            if (coursesResponse.ok) {
                const coursesData = await coursesResponse.json()
                const publicCourses = coursesData.data?.courses?.filter((c: any) => c.is_public === true) || []
                setCourses(publicCourses)
            }

            // Fetch access code requests for public SPOC courses
            const requestsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/access-code-requests?status=PENDING`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json()
                // Filter only public SPOC course requests
                const publicRequests = (requestsData.data || []).filter(
                    (r: any) => r.course?.is_public === true && r.course?.course_type === "SPOC"
                )
                setAccessCodeRequests(publicRequests)
            }

            // Fetch pending approvals for public courses
            const approvalsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/pending`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
            if (approvalsResponse.ok) {
                const approvalsData = await approvalsResponse.json()
                // Filter only public course approvals
                const publicApprovals = (approvalsData.data || []).filter(
                    (a: any) => a.course?.is_public === true
                )
                setPendingApprovals(publicApprovals)
            }

        } catch (error) {
            toast.error("Failed to load enrollment data")
        } finally {
            setLoading(false)
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
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/admin/public-courses/send-access-code`,
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

    const openRejectDialog = (enrollment: PendingApproval) => {
        setSelectedEnrollment(enrollment)
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

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "MMM d, yyyy")
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
        const headers = ["Student Name", "Student Email", "Course", "Type", "Status", "Requested Date"]
        const rows = [...filteredRequests, ...filteredApprovals].map(item => {
            const user = item.user
            const course = item.course
            return [
                `${user.first_name || ""} ${user.last_name || ""}`,
                user.email,
                course.title,
                course.course_type,
                "access_code_sent" in item ? (item.access_code_sent ? "Code Sent" : "Pending") : item.status,
                formatDate("enrolled_at" in item ? item.enrolled_at : item.requested_at),
            ]
        })

        const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `public_courses_requests_${format(new Date(), "yyyy-MM-dd")}.csv`
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
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Public Courses Management</h1>
                        <p className="text-muted-foreground">
                            Manage access code requests and enrollment approvals for public courses (is_public = true)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Public SPOC Courses</p>
                                    <p className="text-2xl font-bold">{stats.publicSPOCCount}</p>
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
                                    <p className="text-sm text-muted-foreground">Public MOOC Courses</p>
                                    <p className="text-2xl font-bold">{stats.publicMOOCCount}</p>
                                </div>
                                <div className="w-10 h-10 bg-success/15 rounded-full flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-success" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Access Code Requests</p>
                                    <p className="text-2xl font-bold">{stats.pendingRequests}</p>
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
                                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                                    <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                                </div>
                                <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-2">
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
                    </TabsList>

                    {/* Access Code Requests Tab */}
                    <TabsContent value="access-code-requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>Access Code Requests</CardTitle>
                                <CardDescription>
                                    Learners requesting access codes for public SPOC courses
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
                                            When learners request access codes for public SPOC courses, they will appear here.
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
                                    Enrollment requests waiting for approval
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
                                        <span className="font-medium">Learner:</span> {selectedEnrollment.user.first_name} {selectedEnrollment.user.last_name}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">Course:</span> {selectedEnrollment.course.title}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">Email:</span> {selectedEnrollment.user.email}
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