// @ts-nocheck
"use client"

import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { getUserEnrollments } from "@/lib/features/enrollments/enrollmentSlice"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  BookOpen,
  Calendar,
  Mail,
  Phone,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  Globe,
  Building2,
  Award,
} from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import api from "@/lib/api"

export default function EnrollmentRequestsPage() {
  const dispatch = useAppDispatch()
  const { enrollments, isLoading } = useAppSelector((state) => state.enrollments)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("PENDING")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    // Fetch all enrollments - in a real implementation, you'd have a specific endpoint for pending requests
    dispatch(getUserEnrollments("all"))
  }, [dispatch])

  // Filter enrollments to show only requests
  const enrollmentRequests = enrollments.filter((enrollment) => {
    const matchesStatus = statusFilter === "ALL" || enrollment.status === statusFilter
    const matchesSearch =
      enrollment.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.user_id.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  const handleActionClick = (request: any, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setActionType(action)
    setShowModal(true)
    setRejectionReason("")
  }

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return

    if (actionType === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    setIsProcessing(true)

    try {
      const endpoint = actionType === "approve" 
        ? `/enrollments/${selectedRequest.id}/approve`
        : `/enrollments/${selectedRequest.id}/reject`

      const response = await api.post(endpoint, {
        reason: actionType === "reject" ? rejectionReason : undefined
      })

      if (response.data.success) {
        toast.success(
          actionType === "approve"
            ? "Enrollment request approved successfully"
            : "Enrollment request rejected successfully"
        )
        
        // Refresh the list
        dispatch(getUserEnrollments("all"))
        
        setShowModal(false)
        setSelectedRequest(null)
        setActionType(null)
        setRejectionReason("")
      } else {
        toast.error(response.data.message || "Action failed")
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to process request")
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "ACTIVE":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case "REJECTED":
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const stats = {
    total: enrollmentRequests.length,
    pending: enrollmentRequests.filter(e => e.status === "PENDING").length,
    approved: enrollmentRequests.filter(e => e.status === "ACTIVE").length,
    rejected: enrollmentRequests.filter(e => e.status === "REJECTED").length,
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enrollment Requests</h1>
          <p className="text-gray-600 mt-1">Review and manage course enrollment requests</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => dispatch(getUserEnrollments("all"))}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by course name or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("ALL")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "PENDING" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("PENDING")}
              >
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Button>
              <Button
                variant={statusFilter === "ACTIVE" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("ACTIVE")}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approved
              </Button>
              <Button
                variant={statusFilter === "REJECTED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("REJECTED")}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Rejected
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {enrollmentRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Info className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600">
                {statusFilter === "PENDING"
                  ? "There are no pending enrollment requests at the moment"
                  : "No requests match your current filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          enrollmentRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Course Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {request.course.thumbnail_url ? (
                        <img
                          src={request.course.thumbnail_url}
                          alt={request.course.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {request.course.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {request.course.description}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {request.course.course_type === "MOOC" ? (
                              <Globe className="w-3 h-3 mr-1" />
                            ) : (
                              <Building2 className="w-3 h-3 mr-1" />
                            )}
                            {request.course.course_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {request.course.level}
                          </Badge>
                          {request.course.is_certificate_available && (
                            <Badge variant="outline" className="text-xs">
                              <Award className="w-3 h-3 mr-1" />
                              Certificate
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="lg:w-80 border-l pl-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Requestor Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">User ID:</span>
                        <span className="font-medium text-gray-900">{request.user_id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Requested:</span>
                        <span className="font-medium text-gray-900">
                          {format(new Date(request.enrolled_at), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {request.status === "PENDING" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleActionClick(request, "approve")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleActionClick(request, "reject")}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {request.status === "ACTIVE" && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Approved on {format(new Date(request.enrolled_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    )}

                    {request.status === "REJECTED" && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showModal} onOpenChange={setShowModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                actionType === "approve" 
                  ? "bg-green-100" 
                  : "bg-red-100"
              }`}>
                {actionType === "approve" ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <AlertDialogTitle className="text-xl">
                  {actionType === "approve" ? "Approve Enrollment Request" : "Reject Enrollment Request"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedRequest?.course.title}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="my-4">
            {actionType === "approve" ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Confirm approval:</strong> This will grant the user access to the course and all its materials.
                  The user will receive a notification about the approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Confirm rejection:</strong> This will deny the user access to this course.
                      Please provide a reason for rejection.
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter the reason for rejecting this enrollment request..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  />
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isProcessing || (actionType === "reject" && !rejectionReason.trim())}
              className={actionType === "approve" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Request
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Request
                    </>
                  )}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}