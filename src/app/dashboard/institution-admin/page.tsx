"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  Activity,
  Shield,
  Download,
  Eye,
  BarChart3,
  UserPlus,
  FileText,
  CreditCard,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Search,
  ExternalLink,
  MoreVertical,
  Upload,
  Key,
  Mail,
  Layers,
  Filter,
  Target,
  Award,
  ClipboardList,
  MessageSquare,
  Folder,
  Video,
  FileQuestion,
  Calendar,
  QrCode,
  FileSpreadsheet,
  GraduationCap,
  Zap,
  Star,
  Loader2,
  Edit,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRealtimeEvents } from "@/hooks/use-realtime"

// Types for API responses
interface Institution {
  id: string;
  name: string;
  logo_url?: string;
  type: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalCourses: number;
  activeCourses: number;
  totalInstructors: number;
  activeInstructors: number;
  totalStudents: number;
  activeStudents: number;
  pendingEnrollments: number;
  revenueThisMonth: number;
  totalCategories: number;
}

interface TopCourse {
  id: string;
  name: string;
  instructor: {
    name: string;
    profile_picture_url?: string;
  };
  students: number;
  completion: number;
  rating: number;
  status: string;
}

interface RecentActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  status: 'completed' | 'pending';
}

interface PendingRequest {
  id: string;
  type: string;
  course: string;
  student?: string;
  instructor?: string;
  creator?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  action: string;
}

interface DashboardData {
  institution: Institution;
  stats: DashboardStats;
  topCourses: TopCourse[];
  recentActivity: RecentActivity[];
  pendingRequests: PendingRequest[];
  quickActions: QuickAction[];
}

// Icon mapping
const iconMap: { [key: string]: React.ComponentType<any> } = {
  PlusCircle,
  UserPlus,
  Key,
  Upload,
  BookOpen,
  Users,
  GraduationCap,
  DollarSign,
  Activity,
  AlertCircle,
  TrendingUp,
  Building2,
  Settings,
  Edit
};

export default function InstitutionAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user?.primary_institution_id) {
      fetchDashboardData();
    }
  }, [authLoading, user?.primary_institution_id]);

  const fetchDashboardData = async () => {
    if (!user?.primary_institution_id) {
      setError("No institution assigned to your account");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const endpoint = `${apiUrl}/institution-admin/${user.primary_institution_id}/dashboard`;

      if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not configured');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text().catch(() => '');
          if (errorText) errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        throw new Error(data.message || "Failed to load dashboard");
      }
    } catch (error: any) {
      console.error("Error fetching dashboard:", error);
      
      let errorMessage = error.message;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to the server. Please check your connection.';
      }
      
      setError(errorMessage);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Real-time: Socket-based dashboard updates ─────────────────────────────
  useRealtimeEvents({
    "enrollment-approved": () => fetchDashboardData(),
    "enrollment-rejected": () => fetchDashboardData(),
    "enrollment-count-updated": () => fetchDashboardData(),
    "new-notification": (data: any) => {
      // Refresh for enrollment requests and course events
      if (data?.notification_type?.includes("ENROLLMENT") ||
          data?.notification_type?.includes("COURSE") ||
          data?.notification_type?.includes("INSTRUCTOR") ||
          data?.notification_type?.includes("STUDENT")) {
        fetchDashboardData();
      }
    },
    "course-published": () => {
      toast.info("A course has been published");
      fetchDashboardData();
    },
    "new-review": () => fetchDashboardData(),
    "space-member-joined": () => fetchDashboardData(),
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
          {debugInfo && (
            <p className="text-xs text-gray-400 mt-2 max-w-md">{debugInfo}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Unable to Load Dashboard</h2>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                {error}
              </pre>
            </div>

            {debugInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Debug Information:</h3>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                  {debugInfo}
                </pre>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Check that your API server is running</li>
                <li>Verify <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_API_URL</code> in your .env file</li>
                <li>Check browser console (F12) for CORS errors</li>
                <li>Ensure you're logged in with a valid token</li>
                <li>Verify your institution assignment</li>
              </ol>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={fetchDashboardData} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log('Debug Info:', {
                    apiUrl: process.env.NEXT_PUBLIC_API_URL,
                    hasUser: !!user,
                    hasToken: !!token,
                    institutionId: user?.primary_institution_id,
                  });
                }}
              >
                Log Debug Info
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { institution, stats, topCourses, recentActivity, pendingRequests, quickActions } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header with Institution Info */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              {institution.logo_url ? (
                <img 
                  src={institution.logo_url} 
                  alt={institution.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{institution.name}</h1>
              <p className="text-gray-600">Institution Administration Dashboard</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant={institution.is_active ? "default" : "secondary"}>
                  {institution.is_active ? "Active Institution" : "Inactive Institution"}
                </Badge>
                <span className="text-sm text-gray-600">
                  {stats.totalCourses} Courses • {stats.totalInstructors} Instructors • {formatNumber(stats.totalStudents)} Students
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link 
              href={`/dashboard/institution-admin/institution/settings?institution=${institution.id}`}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link 
              href={`/dashboard/institution-admin/institution/profile?institution=${institution.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Courses</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalCourses}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium">{stats.activeCourses} active</span>
            <span className="text-gray-300">•</span>
            <span className="text-blue-600">{stats.totalCourses - stats.activeCourses} drafts</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Instructors</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalInstructors}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium">{stats.activeInstructors} active</span>
            <span className="text-gray-300">•</span>
            <span className="text-amber-600">{stats.totalInstructors - stats.activeInstructors} inactive</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Students</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalStudents)}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium">{formatNumber(stats.activeStudents)} active</span>
            <span className="text-gray-300">•</span>
            <span className="text-amber-600">{stats.pendingEnrollments} pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Revenue (Month)</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenueThisMonth)}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Quick Actions
            </h3>
            <p className="text-sm text-gray-600 mt-1">Frequently needed administration tasks</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {quickActions.map((action) => {
              const IconComponent = iconMap[action.icon] || PlusCircle;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-3 group-hover:scale-110 transition-transform duration-200`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600">{action.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{action.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Recent Activity
              </h3>
              <p className="text-sm text-gray-600 mt-1">Your latest administration actions</p>
            </div>
            <Link 
              href={`/dashboard/institution-admin/activity?institution=${institution.id}`} 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="p-5 space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const Icon = activity.status === 'completed' ? CheckCircle : Clock;
                const iconColor = activity.status === 'completed' ? 'text-green-600' : 'text-amber-600';
                const iconBg = activity.status === 'completed' ? 'bg-green-50' : 'bg-amber-50';
                
                return (
                  <div key={activity.id} className="flex items-start gap-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <div className={`p-2 rounded-lg ${iconBg}`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{activity.action}</div>
                      <div className="text-sm text-gray-600 truncate">{activity.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.user} • {formatDate(activity.timestamp)}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activity.status}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Requests & Top Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Pending Requests
              </h3>
              <p className="text-sm text-gray-600 mt-1">Requiring your attention</p>
            </div>
            <Badge variant="secondary">
              {pendingRequests.length} pending
            </Badge>
          </div>
          <div className="p-5 space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{request.type}</div>
                    <div className="text-sm text-gray-600">
                      {request.course} • {request.student || request.instructor || request.creator}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(request.submittedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-8">
                      Review
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No pending requests</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Courses */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Top Performing Courses
              </h3>
              <p className="text-sm text-gray-600 mt-1">Highest engagement and completion</p>
            </div>
            <Link 
              href={`/dashboard/institution-admin/courses?institution=${institution.id}`} 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {topCourses.length > 0 ? (
              topCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{course.name}</div>
                    <div className="text-sm text-gray-600">by {course.instructor.name}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>{formatNumber(course.students)} students</span>
                      <span>•</span>
                      <span>{course.completion}% completion</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Star className="w-3 h-3 text-amber-500 fill-current mr-1" />
                        {course.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/dashboard/institution-admin/courses/${course.id}`}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Link>
                    <Link
                      href={`/dashboard/institution-admin/courses/${course.id}/analytics`}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Analytics"
                    >
                      <BarChart3 className="w-4 h-4 text-gray-600" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No courses yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Enrollment Quick Access */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-green-900">Bulk Enrollment Made Easy</h4>
              <p className="text-sm text-green-700 mt-1">
                Upload CSV files or generate access codes for mass student enrollment
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link 
              href={`/dashboard/institution-admin/enrollment/bulk?institution=${institution.id}`}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </Link>
            <Link 
              href={`/dashboard/institution-admin/enrollment/access-codes?institution=${institution.id}`}
              className="px-4 py-2 bg-white border border-green-600 text-green-700 text-sm rounded-lg hover:bg-green-50 flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Generate Codes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}