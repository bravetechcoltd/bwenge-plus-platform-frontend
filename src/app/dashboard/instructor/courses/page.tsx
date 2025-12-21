// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchInstructorCourses,
  setCoursesFilters,
  resetCoursesFilters,
  selectInstructorCourses,
  selectIsLoadingCourses,
  selectCoursesError,
  selectCoursesPagination,
  selectCoursesFilters,
  selectActiveCourses,
  selectDraftCourses,
  selectArchivedCourses,
  selectPrimaryInstructorCourses,
  selectAdditionalInstructorCourses,
} from "@/lib/features/instructor/instructorSlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  Grid,
  List,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Users,
  Star,
  Target,
  FileText,
  Eye,
  BarChart3,
  Edit,
  Download,
  Archive,
  Trash2,
  Loader2,
  Building,
  X,
  AlertCircle,
  Clock,
  Award,
  Shield,
  Globe,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { InstructorCourseCard } from "@/components/instructors/InstructorCourseCard";
import { StatCard } from "@/components/instructors/StatCard";
import { useDebounce } from "@/hooks/use-debounce";

export default function InstructorCoursesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  const courses = useAppSelector(selectInstructorCourses);
  const isLoading = useAppSelector(selectIsLoadingCourses);
  const error = useAppSelector(selectCoursesError);
  const pagination = useAppSelector(selectCoursesPagination);
  const filters = useAppSelector(selectCoursesFilters);
  
  const activeCourses = useAppSelector(selectActiveCourses);
  const draftCourses = useAppSelector(selectDraftCourses);
  const archivedCourses = useAppSelector(selectArchivedCourses);
  const primaryInstructorCourses = useAppSelector(selectPrimaryInstructorCourses);
  const additionalInstructorCourses = useAppSelector(selectAdditionalInstructorCourses);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    dispatch(fetchInstructorCourses({ filters, page: 1, limit: 10 }));
  }, [dispatch, filters]);

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      dispatch(setCoursesFilters({ search: debouncedSearch, page: 1 }));
    }
  }, [debouncedSearch, dispatch]);

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    dispatch(setCoursesFilters({ [key]: value, page: 1 }));
  }, [dispatch]);

  const handleClearFilters = useCallback(() => {
    dispatch(resetCoursesFilters());
    setSearchInput("");
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(fetchInstructorCourses({ filters, page, limit: 10 }));
  }, [dispatch, filters]);

  const handleCourseClick = useCallback((courseId: string) => {
    router.push(`/dashboard/instructor/courses/${courseId}/students`);
  }, [router]);

  const handleCreateCourse = useCallback(() => {
    router.push("/dashboard/instructor/courses/create");
  }, [router]);

  const CLEAR_STATUS = "all_status";
  const CLEAR_TYPE = "all_types";
  const CLEAR_INSTITUTION = "all_institutions";
  
  // Update the filter values for display
  const getDisplayValue = (key: string, value: string | null) => {
    if (value === null) {
      switch (key) {
        case 'status': return CLEAR_STATUS;
        case 'course_type': return CLEAR_TYPE;
        case 'institution_id': return CLEAR_INSTITUTION;
        default: return value || "";
      }
    }
    return value;
  };

  // Calculate summary statistics
  const totalCourses = courses.length;
  const publishedCount = activeCourses.length;
  const draftCount = draftCourses.length;
  const archivedCount = archivedCourses.length;
  const moocCount = courses.filter(c => c.course_type === "MOOC").length;
  const spocCount = courses.filter(c => c.course_type === "SPOC").length;

  // Calculate average statistics
  const avgEnrollment = courses.length > 0 
    ? Math.round(courses.reduce((sum, c) => sum + (c.statistics?.enrollments.total || 0), 0) / courses.length)
    : 0;

  const avgRating = courses.length > 0 
    ? courses.reduce((sum, c) => sum + (c.statistics?.ratings.average || 0), 0) / courses.length
    : 0;

  const avgCompletion = courses.length > 0 
    ? courses.reduce((sum, c) => sum + (c.statistics?.progress.average_completion || 0), 0) / courses.length
    : 0;

  const totalStudents = courses.reduce((sum, c) => sum + (c.statistics?.enrollments.total || 0), 0);
  const totalReviews = courses.reduce((sum, c) => sum + (c.statistics?.ratings.total_reviews || 0), 0);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800";
      case "DRAFT":
        return "bg-amber-100 text-amber-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getCourseTypeColor = useCallback((type: string) => {
    switch (type) {
      case "MOOC":
        return "bg-blue-100 text-blue-800";
      case "SPOC":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getInstitutionFilterOptions = useCallback(() => {
    const institutions = Array.from(
      new Set(
        courses
          .filter(course => course.institution)
          .map(course => ({
            id: course.institution!.id,
            name: course.institution!.name,
            logo: course.institution!.logo_url,
          }))
      )
    );
    return institutions;
  }, [courses]);

  const handleExportCourses = useCallback((format: 'csv' | 'excel' | 'pdf') => {
    // Implement export functionality
    console.log(`Exporting courses in ${format} format`);
  }, []);

  const handleBulkAction = useCallback((action: 'archive' | 'publish' | 'delete') => {
    // Implement bulk actions
    console.log(`Bulk ${action} action`);
  }, []);

  if (isLoading && courses.length === 0) {
    return (
      <div className="container mx-auto p-6">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        {/* Skeleton Filter Bar */}
        <Skeleton className="h-20 w-full mb-6" />
        
        {/* Skeleton Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Section 1: Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-2">
            Manage all courses you're assigned to as instructor
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Create Course Button */}
          <Button onClick={handleCreateCourse}>
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
          
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => dispatch(fetchInstructorCourses({ filters }))}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Section 2: Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<BookOpen className="h-6 w-6" />}
          label="Total Courses"
          value={totalCourses}
          subtext={`${publishedCount} published, ${draftCount} draft`}
          color="blue"
          onClick={() => router.push("/dashboard/instructor/courses")}
        />
        
        <StatCard
          icon={<Users className="h-6 w-6" />}
          label="Total Students"
          value={totalStudents}
          subtext={`Across all courses`}
          color="green"
          onClick={() => totalStudents > 0 && router.push("/dashboard/instructor/students")}
        />
        
        <StatCard
          icon={<Star className="h-6 w-6" />}
          label="Average Rating"
          value={avgRating.toFixed(1)}
          subtext={`Based on ${totalReviews} reviews`}
          color="amber"
        />
        
        <StatCard
          icon={<Target className="h-6 w-6" />}
          label="Avg Completion"
          value={`${avgCompletion.toFixed(1)}%`}
          subtext="Across all courses"
          color="purple"
        />
      </div>

      {/* Section 3: Filters & Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search courses by title..."
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
              {/* Status Filter - FIXED */}
              <Select
                value={getDisplayValue('status', filters.status)}
                onValueChange={(value) => handleFilterChange("status", value === CLEAR_STATUS ? null : value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_STATUS}>All Status</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Course Type Filter - FIXED */}
              <Select
                value={getDisplayValue('course_type', filters.course_type)}
                onValueChange={(value) => handleFilterChange("course_type", value === CLEAR_TYPE ? null : value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_TYPE}>All Types</SelectItem>
                  <SelectItem value="MOOC">MOOC</SelectItem>
                  <SelectItem value="SPOC">SPOC</SelectItem>
                </SelectContent>
              </Select>

              {/* Institution Filter - FIXED */}
              {getInstitutionFilterOptions().length > 0 && (
                <Select
                  value={getDisplayValue('institution_id', filters.institution_id)}
                  onValueChange={(value) => handleFilterChange("institution_id", value === CLEAR_INSTITUTION ? null : value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Institutions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CLEAR_INSTITUTION}>All Institutions</SelectItem>
                    {getInstitutionFilterOptions().map((institution) => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Sort Filter */}
              <Select
                value={filters.sort_by}
                onValueChange={(value) => handleFilterChange("sort_by", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest First</SelectItem>
                  <SelectItem value="-created_at">Oldest First</SelectItem>
                  <SelectItem value="enrollment_count">Most Students</SelectItem>
                  <SelectItem value="average_rating">Highest Rated</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Clear Filters Button */}
              {(filters.status || filters.course_type || filters.search || filters.institution_id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {(filters.status || filters.course_type || filters.search || filters.institution_id) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {filters.search}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleFilterChange("search", "")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleFilterChange("status", null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.course_type && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {filters.course_type}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleFilterChange("course_type", null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.institution_id && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Institution: {getInstitutionFilterOptions().find(i => i.id === filters.institution_id)?.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleFilterChange("institution_id", null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Summary Statistics Bar */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Showing</span>
            <span className="font-semibold">{totalCourses} courses</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {publishedCount} published
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {draftCount} draft
            </Badge>
            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
              {archivedCount} archived
            </Badge>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {moocCount} MOOC
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {spocCount} SPOC
            </Badge>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {primaryInstructorCourses.length} primary
            </Badge>
            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
              {additionalInstructorCourses.length} additional
            </Badge>
          </div>
        </div>
      </div>

      {/* Section 5: Courses Display */}
      {error ? (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Failed to load courses
              </h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                onClick={() => dispatch(fetchInstructorCourses({ filters }))}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No courses found
              </h3>
              <p className="text-gray-500 mb-6">
                {filters.search || filters.status || filters.course_type
                  ? "Try adjusting your filters"
                  : "You haven't been assigned to any courses yet"}
              </p>
              <Button onClick={handleCreateCourse}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Course
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {courses.map((course) => (
            <InstructorCourseCard
              key={course.id}
              course={course}
              view="grid"
              onViewStudents={() => handleCourseClick(course.id)}
              onViewAnalytics={() =>
                router.push(`/dashboard/instructor/courses/${course.id}/analytics`)
              }
              onEditCourse={() =>
                router.push(`/courses/${course.id}/edit`)
              }
            />
          ))}
        </div>
      ) : (
        // List View
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Course</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-gray-200 flex-shrink-0 overflow-hidden">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                                <BookOpen className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {course.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-[200px]">
                              {course.short_description || course.description.substring(0, 60)}...
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${getCourseTypeColor(course.course_type)}`}>
                                {course.course_type}
                              </Badge>
                              {!course.instructor_role.is_primary && (
                                <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                                  Additional
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.institution ? (
                          <div className="flex items-center gap-2">
                            {course.institution.logo_url && (
                              <img
                                src={course.institution.logo_url}
                                alt={course.institution.name}
                                className="h-6 w-6 rounded object-cover"
                              />
                            )}
                            <span className="text-sm text-gray-700">
                              {course.institution.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {course.statistics?.enrollments.total || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-400" />
                          <span className="font-medium">
                            {course.statistics?.ratings.average.toFixed(1) || "0.0"}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({course.statistics?.ratings.total_reviews || 0})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">
                              {course.statistics?.progress.average_completion.toFixed(1) || 0}%
                            </span>
                          </div>
                          <Progress 
                            value={course.statistics?.progress.average_completion || 0} 
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(course.status)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCourseClick(course.id)}
                            title="View Students"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/instructor/courses/${course.id}/analytics`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Course
                              </DropdownMenuItem>
                              {course.instructor_role.permissions.can_edit_course_content && (
                                <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}/edit`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Content
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download Reports
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Archive className="h-4 w-4 mr-2" />
                                {course.status === "ARCHIVED" ? "Unarchive" : "Archive"}
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

      {/* Section 6: Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} courses
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

      {/* Section 7: Export Options */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Export Course Data</h3>
            <p className="text-sm text-gray-600">
              Download your course data for analysis or reporting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportCourses('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCourses('excel')}>
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCourses('pdf')}>
                  Export as PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction('publish')}>
                  Publish Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                  Archive Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600"
                >
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}