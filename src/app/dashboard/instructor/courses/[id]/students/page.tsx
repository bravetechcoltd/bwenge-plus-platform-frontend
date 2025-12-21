"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchCourseStudents,
  searchStudents,
  setStudentsFilters,
  selectCourseStudents,
  selectIsLoadingStudents,
  selectStudentsError,
  selectStudentsPagination,
  selectStudentsStatistics,
  selectStudentsFilters,
  selectAtRiskStudents,
  selectTopStudents,
  selectInProgressStudents,
  selectNotStartedStudents,
} from "@/lib/features/instructor/instructorSlice";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Mail,
  MoreVertical,
  Users,
  TrendingUp,
  AlertCircle,
  Award,
  Eye,
  MessageSquare,
  FileText,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserX,
  CheckCircle,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import StudentDetailModal from "@/components/instructors/StudentDetailModal";

export default function CourseStudentsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  
  // Extract courseId from params - handle both string and array cases
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Redux state
  const students = useAppSelector(selectCourseStudents);
  const isLoading = useAppSelector(selectIsLoadingStudents);
  const error = useAppSelector(selectStudentsError);
  const pagination = useAppSelector(selectStudentsPagination);
  const statistics = useAppSelector(selectStudentsStatistics);
  const filters = useAppSelector(selectStudentsFilters);
  
  // Computed selectors
  const atRiskStudents = useAppSelector(selectAtRiskStudents);
  const topStudents = useAppSelector(selectTopStudents);
  const inProgressStudents = useAppSelector(selectInProgressStudents);
  const notStartedStudents = useAppSelector(selectNotStartedStudents);

  // Local state
  const [searchInput, setSearchInput] = useState(filters.search);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, 300);

  // Initial fetch - runs when component mounts or courseId changes
  useEffect(() => {
    console.log("🔍 CourseStudentsPage mounted or courseId changed");
    console.log("📋 Course ID:", courseId);
    
    if (courseId) {
      console.log("🚀 Dispatching fetchCourseStudents action...");
      dispatch(fetchCourseStudents({ 
        courseId, 
        filters, 
        page: 1, 
        limit: 20 
      })).then((result) => {
        if (fetchCourseStudents.fulfilled.match(result)) {
          console.log("✅ fetchCourseStudents successful:", result.payload);
        } else if (fetchCourseStudents.rejected.match(result)) {
          console.error("❌ fetchCourseStudents failed:", result.error);
        }
      });
    } else {
      console.error("❌ Course ID is undefined!");
    }
  }, [dispatch, courseId]); // Only depend on courseId, not filters

  // Separate effect for filter changes
  useEffect(() => {
    console.log("🔄 Filters changed, refetching students...");
    console.log("📌 Current filters:", filters);
    
    if (courseId) {
      dispatch(fetchCourseStudents({ 
        courseId, 
        filters, 
        page: pagination?.page || 1, 
        limit: 20 
      }));
    }
  }, [filters]); // Only filters

  // Log state changes for debugging
  useEffect(() => {
    console.log("📊 Redux State Update:");
    console.log("📌 students count:", students.length);
    console.log("📌 isLoading:", isLoading);
    console.log("📌 error:", error);
    console.log("📌 pagination:", pagination);
    console.log("📌 statistics:", statistics);
  }, [students, isLoading, error, pagination, statistics]);

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      dispatch(setStudentsFilters({ search: debouncedSearch }));
    }
  }, [debouncedSearch, dispatch, filters.search]);

  const handleFilterChange = (key: string, value: string | null) => {
    dispatch(setStudentsFilters({ [key]: value }));
  };

  const handlePageChange = (page: number) => {
    if (courseId) {
      dispatch(fetchCourseStudents({ courseId, filters, page, limit: 20 }));
    }
  };

  const handleRefresh = () => {
    if (courseId) {
      dispatch(fetchCourseStudents({ courseId, filters }));
    }
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    console.log(`Exporting students in ${format} format`);
  };

  const handleBulkAction = (action: "message" | "export" | "unenroll") => {
    console.log(`Bulk ${action} for ${selectedStudents.size} students`);
  };

  const CLEAR_STATUS = "all_status";
  const CLEAR_PROGRESS = "all_progress";

  const getDisplayValue = (key: string, value: string | null) => {
    if (value === null) {
      switch (key) {
        case 'status': return CLEAR_STATUS;
        case 'progress_filter': return CLEAR_PROGRESS;
        default: return value || "";
      }
    }
    return value;
  };

  const handleStudentSelect = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      const allIds = new Set(students.map(s => s.student.id));
      setSelectedStudents(allIds);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "DROPPED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading && students.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>

        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Section 1: Course Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/instructor/courses")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Courses
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Course Students
            </h1>
            <p className="text-gray-600 mt-2">
              Manage and monitor student progress
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  Export as PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedStudents.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Bulk Actions ({selectedStudents.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkAction("message")}>
                    Send Message
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("export")}>
                    Export Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkAction("unenroll")}
                    className="text-red-600"
                  >
                    Unenroll Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Filters & Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => {
                      setSearchInput("");
                      handleFilterChange("search", "");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={getDisplayValue('status', filters.status)}
                onValueChange={(value) => handleFilterChange("status", value === CLEAR_STATUS ? null : value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_STATUS}>All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DROPPED">Dropped</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={getDisplayValue('progress_filter', filters.progress_filter)}
                onValueChange={(value) => handleFilterChange("progress_filter", value === CLEAR_PROGRESS ? null : value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Progress" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_PROGRESS}>All Progress</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sort_by}
                onValueChange={(value) => handleFilterChange("sort_by", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrolled_at">Recent First</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="progress">Progress High-Low</SelectItem>
                  <SelectItem value="last_activity">Last Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Statistics Summary */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Students</p>
                  <h3 className="text-3xl font-bold text-gray-900">
                    {statistics.total_students}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {statistics.by_status.ACTIVE} active,{" "}
                    {statistics.by_status.COMPLETED} completed
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Average Completion</p>
                  <h3 className="text-3xl font-bold text-gray-900">
                    {statistics.average_completion.toFixed(1)}%
                  </h3>
                  <div className="mt-2">
                    <Progress value={statistics.average_completion} className="h-2" />
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer ${
              statistics.at_risk_students > 0 ? "border-red-200 hover:bg-red-50" : ""
            }`}
            onClick={() => statistics.at_risk_students > 0 && handleFilterChange("progress_filter", "not_started")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">At-Risk Students</p>
                  <h3 className={`text-3xl font-bold ${
                    statistics.at_risk_students > 0 ? "text-red-600" : "text-gray-900"
                  }`}>
                    {statistics.at_risk_students}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Need attention
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  statistics.at_risk_students > 0 ? "bg-red-100" : "bg-gray-100"
                }`}>
                  <AlertCircle className={`h-6 w-6 ${
                    statistics.at_risk_students > 0 ? "text-red-600" : "text-gray-400"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer"
            onClick={() => handleFilterChange("progress_filter", "completed")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Top Performers</p>
                  <h3 className="text-3xl font-bold text-gray-900">
                    {statistics.top_performers}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    &gt; 80% completion
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 4: Students Display */}
      {error ? (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Failed to load students
              </h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No students found
              </h3>
              <p className="text-gray-500">
                {filters.search || filters.status || filters.progress_filter
                  ? "Try adjusting your filters"
                  : "No students enrolled in this course yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === students.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Lessons Completed</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow 
                      key={student.student.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowStudentModal(true);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.student.id)}
                          onChange={() => handleStudentSelect(student.student.id)}
                          className="h-4 w-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={student.student.profile_picture_url}
                              alt={student.student.first_name}
                            />
                            <AvatarFallback>
                              {student.student.first_name?.[0]}
                              {student.student.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {student.student.first_name} {student.student.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.student.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {student.progress.completion_percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={student.progress.completion_percentage} 
                            className="h-2"
                          />
                          {student.details?.performance_indicators?.at_risk && (
                            <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                              At Risk
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {student.progress.lessons.completed} / {student.progress.lessons.total}
                        </div>
                        <div className="text-xs text-gray-500">
                          {student.progress.lessons.completion_rate.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {student.enrollment.last_accessed_at
                            ? formatDistanceToNow(new Date(student.enrollment.last_accessed_at), {
                                addSuffix: true,
                              })
                            : "Never"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {student.enrollment.days_since_last_activity !== null
                            ? `${student.enrollment.days_since_last_activity} days ago`
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(student.enrollment.status)}>
                          {student.enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowStudentModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Submissions
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <UserX className="h-4 w-4 mr-2" />
                                Unenroll
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} students
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        onSendMessage={(student) => {
          console.log("Send message to:", student.student.email);
        }}
        onUnenroll={(student) => {
          console.log("Unenroll student:", student.student.id);
        }}
      />
    </div>
  );
}