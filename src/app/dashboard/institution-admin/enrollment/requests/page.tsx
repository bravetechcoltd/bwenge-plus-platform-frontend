
"use client"

import { useState, useEffect } from "react"
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Loader2,
    RefreshCw,
    Search,
    Mail,
    Key,
    CheckCircle,
    XCircle,
    Clock,
    User,
    BookOpen,
    Building2,
    MoreVertical,
    Send,
    Filter,
    Download,
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
    }
    enrolled_at: string
    status: string
    approval_status: string
    requires_approval: boolean
}

export default function InstitutionAdminEnrollmentsPage() {
    const { user } = useAppSelector((state) => state.bwengeAuth)
    const [activeTab, setActiveTab] = useState("access-code-requests")
    const [loading, setLoading] = useState(true)
    const [accessCodeRequests, setAccessCodeRequests] = useState<AccessCodeRequest[]>([])
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
    const [allEnrollments, setAllEnrollments] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRequest, setSelectedRequest] = useState<AccessCodeRequest | null>(null)
    const [showSendCodeDialog, setShowSendCodeDialog] = useState(false)
    const [sendingCode, setSendingCode] = useState(false)
    const [stats, setStats] = useState({
        pendingRequests: 0,
        pendingApprovals: 0,
        totalEnrollments: 0,
    })

    useEffect(() => {
        fetchAllData()
    }, [])

    // Real-time enrollment updates
    useRealtimeEvents({
        "enrollment-approved": () => fetchAllData(),
        "enrollment-rejected": () => fetchAllData(),
        "enrollment-count-updated": () => fetchAllData(),
    })

    const fetchAllData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("bwengeplus_token")

            // Fetch access code requests
            const requestsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/access-code-requests?status=PENDING`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json()
                setAccessCodeRequests(requestsData.data || [])
                setStats(prev => ({ ...prev, pendingRequests: requestsData.data?.length || 0 }))
            }

            // Fetch pending approvals
            const approvalsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/pending`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (approvalsResponse.ok) {
                const approvalsData = await approvalsResponse.json()
                setPendingApprovals(approvalsData.data || [])
                setStats(prev => ({ ...prev, pendingApprovals: approvalsData.data?.length || 0 }))
            }

            // Fetch all enrollments
            const enrollmentsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/user-enrollments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ user_id: "all", limit: 100 }),
                }
            )

            if (enrollmentsResponse.ok) {
                const enrollmentsData = await enrollmentsResponse.json()
                setAllEnrollments(enrollmentsData.data || [])
                setStats(prev => ({ ...prev, totalEnrollments: enrollmentsData.data?.length || 0 }))
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
        try {
            const token = localStorage.getItem("bwengeplus_token")

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/${enrollmentId}/approve`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (response.ok) {
                toast.success("Enrollment approved successfully")
                fetchAllData()
            } else {
                const data = await response.json()
                toast.error(data.message || "Failed to approve enrollment")
            }
        } catch (error) {
            toast.error("Failed to approve enrollment")
        }
    }

    const handleRejectEnrollment = async (enrollmentId: string) => {
        try {
            const token = localStorage.getItem("bwengeplus_token")

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/enrollments/${enrollmentId}/reject`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (response.ok) {
                toast.success("Enrollment rejected")
                fetchAllData()
            } else {
                const data = await response.json()
                toast.error(data.message || "Failed to reject enrollment")
            }
        } catch (error) {
            toast.error("Failed to reject enrollment")
        }
    }

    const filteredRequests = accessCodeRequests.filter(request =>
        request.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.course.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredApprovals = pendingApprovals.filter(approval =>
        approval.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.course.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredEnrollments = allEnrollments.filter(enrollment =>
        enrollment.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.course?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "MMM d, yyyy")
        } catch {
            return "Invalid date"
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ACTIVE":
                return <Badge className="bg-success/15 text-success border-success/30">Active</Badge>
            case "PENDING":
                return <Badge className="bg-warning/15 text-warning border-warning/30">Pending</Badge>
            case "COMPLETED":
                return <Badge className="bg-primary/15 text-primary border-primary/30">Completed</Badge>
            case "REJECTED":
                return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Rejected</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Enrollment Management</h1>
                    <p className="text-muted-foreground">
                        Manage access code requests and enrollment approvals for your institution
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Access Code Requests</p>
                                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                            </div>
                            <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                                <Key className="w-6 h-6 text-primary" />
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
                            <div className="w-12 h-12 bg-warning/15 rounded-full flex items-center justify-center">
                                <Clock className="w-6 h-6 text-warning" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Enrollments</p>
                                <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
                            </div>
                            <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search by name, email, or course..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
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
                        All Enrollments
                    </TabsTrigger>
                </TabsList>

                {/* Access Code Requests Tab */}
                <TabsContent value="access-code-requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Code Requests</CardTitle>
                            <CardDescription>
                                Learners requesting access codes for SPOC courses
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
                                        When learners request access codes for SPOC courses, they will appear here.
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
                                                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                                                            <span className="font-medium">
                                                                {request.course.title.length > 20
                                                                    ? request.course.title.slice(0, 20) + "..."
                                                                    : request.course.title}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(request.requested_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {request.request_message ? (
                                                            <span className="text-sm text-muted-foreground line-clamp-1">

                                                                <span className="font-medium">
                                                                    {request.request_message.length > 20
                                                                        ? request.request_message.slice(0, 20) + "..."
                                                                        : request.request_message}
                                                                </span>
                                                            </span>
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
                                                        {!request.access_code_sent && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-primary hover:bg-primary"
                                                                onClick={() => handleSendAccessCode(request)}
                                                            >
                                                                <Send className="w-4 h-4 mr-2" />
                                                                Generate & Send Code
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
                                                <TableHead>Status</TableHead>
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
                                                            <BookOpen className="w-4 h-4 text-muted-foreground" />

                                                            <span className="font-medium">
                                                                {approval.course.title.length > 30
                                                                    ? approval.course.title.slice(0, 30) + "..."
                                                                    : approval.course.title}
                                                            </span>
                                                        </div>

                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(approval.enrolled_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(approval.approval_status || "PENDING")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-success border-success/30 hover:bg-success/10"
                                                                onClick={() => handleApproveEnrollment(approval.id)}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                                                onClick={() => handleRejectEnrollment(approval.id)}
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
                                Complete list of enrollments in your institution
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
                                        No enrollments match your search criteria.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Learner</TableHead>
                                                <TableHead>Course</TableHead>
                                                <TableHead>Enrolled</TableHead>
                                                <TableHead>Progress</TableHead>
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
                                                        <span className="font-medium">
                                                            {enrollment.course?.title.length > 30
                                                                ? enrollment.course?.title.slice(0, 30) + "..."
                                                                : enrollment.course?.title}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(enrollment.enrolled_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${enrollment.progress_percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm">{enrollment.progress_percentage}%</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(enrollment.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem>
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem>
                                                                    View Progress
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive">
                                                                    Cancel Enrollment
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
                                <p className="text-sm text-primary mb-2">
                                    <span className="font-semibold">Learner:</span> {selectedRequest.user.first_name} {selectedRequest.user.last_name}
                                </p>
                                <p className="text-sm text-primary">
                                    <span className="font-semibold">Email:</span> {selectedRequest.user.email}
                                </p>
                                <p className="text-sm text-primary mt-2">
                                    <span className="font-semibold">Course:</span> {selectedRequest.course.title}
                                </p>
                                {selectedRequest.request_message && (
                                    <div className="mt-2 pt-2 border-t border-primary/30">
                                        <p className="text-xs font-semibold text-primary">Message from learner:</p>
                                        <p className="text-sm text-primary italic">"{selectedRequest.request_message}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                                <p className="text-xs text-warning flex items-start">
                                    <Key className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                    <span>A unique access code will be generated and sent to the learner's email. The code will be valid for this specific course only.</span>
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSendCodeDialog(false)}
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
        </div>
    )
}