// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchInstructorDashboardSummary,
  selectDashboardSummary,
  selectIsLoadingSummary,
  selectSummaryError,
} from "@/lib/features/instructor/instructorSlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Users,
  AlertCircle,
  Star,
  Award,
  TrendingUp,
  Clock,
  BarChart3,
  FileText,
  CheckCircle,
  UserPlus,
  Upload,
  Plus,
  RefreshCw,
  ChevronRight,
  Loader2,
  Calendar,
  UserCheck,
  Activity,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstructorDashboardPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const dashboardSummary = useAppSelector(selectDashboardSummary);
  const isLoading = useAppSelector(selectIsLoadingSummary);
  const error = useAppSelector(selectSummaryError);
  
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    dispatch(fetchInstructorDashboardSummary());
    
    // Set up auto-refresh every 5 minutes if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        dispatch(fetchInstructorDashboardSummary());
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [dispatch, autoRefresh]);

  const handleRefresh = () => {
    dispatch(fetchInstructorDashboardSummary());
  };

  const handleInstructorStudentsCourseClick = () => {
    router.push(`/dashboard/instructor/students`);
  };

  const handleActionClick = (action: any) => {
    if (action.link) {
      router.push(action.link);
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Loading state
  if (isLoading && !dashboardSummary) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !dashboardSummary) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Failed to load dashboard
              </h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = {
    first_name: "Instructor", // This would come from auth context
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Section 1: Page Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.first_name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Today is {formatDate(new Date().toISOString())}
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
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-blue-50 border-blue-200" : ""}
            >
              <Clock className="h-4 w-4 mr-2" />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Total Courses */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/instructor/courses")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Courses</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {dashboardSummary?.overview.total_courses || 0}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {dashboardSummary?.overview.active_courses || 0} active,{" "}
                  {dashboardSummary?.overview.draft_courses || 0} draft
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Students */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => dashboardSummary?.top_courses.by_enrollment[0] && handleInstructorStudentsCourseClick(dashboardSummary.top_courses.by_enrollment[0].id)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Students</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {dashboardSummary?.students.total_students || 0}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {dashboardSummary?.students.active_students || 0} active this week
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pending Items */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => dashboardSummary?.attention_required.total_items > 0 && router.push("/dashboard/instructor/assignments/pending")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Attention Required</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {dashboardSummary?.attention_required.total_items || 0}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Items need your attention
                </p>
              </div>
              <div className="relative">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                {dashboardSummary?.attention_required.total_items > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500">
                    {dashboardSummary.attention_required.total_items}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Average Rating */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Average Rating</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {dashboardSummary?.engagement.average_course_rating.toFixed(1) || "0.0"}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  From {dashboardSummary?.engagement.total_reviews || 0} reviews
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.floor(dashboardSummary?.engagement.average_course_rating || 0)
                      ? "text-amber-500 fill-amber-500"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Quick Actions */}
      {dashboardSummary?.quick_actions && dashboardSummary.quick_actions.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Tasks that need your immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboardSummary.quick_actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-auto p-4 justify-start text-left hover:shadow-md transition-all ${
                    action.priority === "high"
                      ? "border-red-200 hover:bg-red-50"
                      : action.priority === "medium"
                      ? "border-amber-200 hover:bg-amber-50"
                      : "border-blue-200 hover:bg-blue-50"
                  }`}
                  onClick={() => handleActionClick(action)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      action.priority === "high"
                        ? "bg-red-100 text-red-600"
                        : action.priority === "medium"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-blue-100 text-blue-600"
                    }`}>
                      {action.type === "grade_assignments" && <FileText className="h-5 w-5" />}
                      {action.type === "approve_enrollments" && <UserCheck className="h-5 w-5" />}
                      {action.type === "publish_courses" && <Upload className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{action.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {action.priority === "high" ? "High priority" : 
                         action.priority === "medium" ? "Medium priority" : "Low priority"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 4: Recent Activity Feed */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest student activities across your courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardSummary?.recent_activity.latest_activities &&
              dashboardSummary.recent_activity.latest_activities.length > 0 ? (
                <div className="space-y-4">
                  {dashboardSummary.recent_activity.latest_activities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={activity.student.profile_picture_url} />
                        <AvatarFallback>
                          {activity.student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">{activity.student.name}</span>{" "}
                          {activity.type === "lesson_completion" ? "completed" : "submitted"}{" "}
                          <span className="font-medium">{activity.lesson_title}</span>{" "}
                          in{" "}
                          <span className="text-blue-600 cursor-pointer hover:underline">
                            {activity.course_title}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className={`p-1 rounded ${
                        activity.type === "lesson_completion"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        {activity.type === "lesson_completion" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity in your courses</p>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {dashboardSummary?.recent_activity.new_enrollments || 0} new enrollments
                    </p>
                    <p className="text-xs text-gray-500">In the last 7 days</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/dashboard/instructor/courses")}
                  >
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 5: Top Courses Showcase */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Top Courses
              </CardTitle>
              <CardDescription>
                Your best performing courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="enrollment">
                <TabsList className="grid grid-cols-3 mb-4 gap-1">
                  <TabsTrigger value="enrollment">
                    Popular
                  </TabsTrigger>
                  <TabsTrigger value="rating">
                    Top Rated
                  </TabsTrigger>
                  <TabsTrigger value="completion">
                    Completion
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="enrollment" className="space-y-3">
                  {dashboardSummary?.top_courses.by_enrollment &&
                  dashboardSummary.top_courses.by_enrollment.length > 0 ? (
                    dashboardSummary.top_courses.by_enrollment.map((course, index) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleInstructorStudentsCourseClick(course.id)}
                      >
                        <div className="relative">
                          <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="h-full w-full rounded object-cover"
                              />
                            ) : (
                              <BookOpen className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">1</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {course.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {course.enrollment_count} students
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No courses available</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="rating" className="space-y-3">
                  {dashboardSummary?.top_courses.by_rating &&
                  dashboardSummary.top_courses.by_rating.length > 0 ? (
                    dashboardSummary.top_courses.by_rating.map((course, index) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleInstructorStudentsCourseClick(course.id)}
                      >
                        <div className="relative">
                          <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="h-full w-full rounded object-cover"
                              />
                            ) : (
                              <BookOpen className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">1</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {course.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              <span className="text-xs font-medium ml-1">
                                {course.average_rating.toFixed(1)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              ({course.total_reviews} reviews)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No courses available</p>
                    </div>
                  )}
                </TabsContent>
                

<TabsContent value="completion" className="space-y-3">
  {dashboardSummary?.top_courses.by_completion &&
  dashboardSummary.top_courses.by_completion.length > 0 ? (
    dashboardSummary.top_courses.by_completion.map((course, index) => {
      // Parse completion_rate to number safely
      const completionRate = typeof course.completion_rate === 'string' 
        ? parseFloat(course.completion_rate) 
        : course.completion_rate || 0;
      
      return (
        <div
          key={course.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => handleInstructorStudentsCourseClick(course.id)}
        >
          <div className="relative">
            <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-full w-full rounded object-cover"
                />
              ) : (
                <BookOpen className="h-6 w-6 text-gray-400" />
              )}
            </div>
            {index === 0 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">1</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {course.title}
            </h4>
            <div className="mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Completion</span>
                <span className="text-xs font-medium">
                  {completionRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={completionRate} className="h-1" />
            </div>
          </div>
        </div>
      );
    })
  ) : (
    <div className="text-center py-4">
      <p className="text-gray-500">No courses available</p>
    </div>
  )}
</TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 6: Attention Required */}
      {dashboardSummary?.attention_required &&
        dashboardSummary.attention_required.total_items > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Attention Required
              <Badge variant="destructive" className="ml-2">
                {dashboardSummary.attention_required.total_items} items
              </Badge>
            </CardTitle>
            <CardDescription>
              Items that need your immediate action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pending Assignments */}
              {dashboardSummary.attention_required.pending_assignments > 0 && (
                <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {dashboardSummary.attention_required.pending_assignments} assignments waiting to be graded
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Oldest: 5 days ago
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => router.push("/dashboard/instructor/assignments/pending")}
                  >
                    Grade Now
                  </Button>
                </div>
              )}

              {/* Draft Courses */}
              {dashboardSummary.attention_required.draft_courses > 0 && (
                <div className="flex items-center justify-between p-3 border border-amber-200 rounded-lg bg-amber-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded">
                      <Upload className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {dashboardSummary.attention_required.draft_courses} courses ready to publish
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Review and publish to make them available to students
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => router.push("/dashboard/instructor/courses?status=DRAFT")}
                  >
                    Review & Publish
                  </Button>
                </div>
              )}

              {/* Pending Approvals */}
              {dashboardSummary.attention_required.pending_approvals > 0 && (
                <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {dashboardSummary.attention_required.pending_approvals} enrollment requests
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Students waiting for approval to join your courses
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => router.push("/dashboard/instructor/enrollments/pending")}
                  >
                    Review Requests
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 7: Institutions (if Multiple) */}
      {dashboardSummary?.institutions &&
        dashboardSummary.institutions.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Your Institutions
            </CardTitle>
            <CardDescription>
              Courses and students across your institutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardSummary.institutions.map((institution) => (
                <Card
                  key={institution.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/instructor/courses?institution_id=${institution.id}`
                    )
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {institution.logo_url ? (
                        <img
                          src={institution.logo_url}
                          alt={institution.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-blue-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {institution.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {institution.courses_count} courses
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Students</span>
                        <span className="text-sm font-medium">
                          {institution.students_count}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Courses</span>
                        <span className="text-sm font-medium">
                          {institution.courses_count}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}