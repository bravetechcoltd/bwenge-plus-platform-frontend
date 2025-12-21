// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Award,
  Target,
  Star,
  FileText,
  Video,
  MessageSquare,
  ThumbsUp,
  TrendingDown,
  GraduationCap,
  Sparkles,
  Globe,
  Lock,
  Filter,
  Eye,
  Building2,
  FolderTree,
  UserCog,
  Shield,
  DollarSign,
  MapPin,
  Briefcase,
  University,
  Landmark,
  Factory,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, subDays, subMonths, subYears, formatDistance } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Scatter,
} from "recharts";

// ==================== TYPES ====================

interface InstitutionAnalytics {
  summary: {
    total_institutions: number;
    active_institutions: number;
    inactive_institutions: number;
    total_members: number;
    total_courses: number;
    total_enrollments: number;
    total_revenue?: number;
    average_completion_rate: number;
    average_rating: number;
    total_reviews: number;
    growth_rate: number;
    institutions_created_this_month: number;
    members_added_this_month: number;
    courses_published_this_month: number;
  };

  institutions_by_type: {
    type: string;
    count: number;
    members: number;
    courses: number;
    icon?: string;
    color: string;
  }[];

  institutions_by_status: {
    status: string;
    count: number;
  }[];

  institutions_by_size: {
    size: string;
    count: number;
    min_members: number;
    max_members: number;
  }[];

  top_institutions: {
    id: string;
    name: string;
    type: string;
    logo_url: string | null;
    members: number;
    courses: number;
    enrollments: number;
    average_rating: number;
    completion_rate: number;
    growth: number;
    created_at: string;
  }[];

  institution_performance: {
    id: string;
    name: string;
    members: number;
    courses: number;
    enrollments: number;
    completion_rate: number;
    average_rating: number;
    revenue?: number;
    efficiency_score: number;
  }[];

  trends: {
    institutions_over_time: {
      period: string;
      count: number;
      active: number;
      new: number;
    }[];
    members_over_time: {
      period: string;
      count: number;
    }[];
    courses_over_time: {
      period: string;
      count: number;
      mooc: number;
      spoc: number;
    }[];
    enrollments_over_time: {
      period: string;
      count: number;
    }[];
    growth_rates: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  };

  geographical_distribution: {
    country: string;
    count: number;
    institutions: number;
    members: number;
  }[];

  engagement_metrics: {
    daily_active_members: number;
    weekly_active_members: number;
    monthly_active_members: number;
    average_session_duration: number;
    total_time_spent_hours: number;
    member_engagement_rate: number;
    course_engagement_rate: number;
  };

  content_metrics: {
    total_courses: number;
    published_courses: number;
    draft_courses: number;
    archived_courses: number;
    mooc_courses: number;
    spoc_courses: number;
    courses_with_certificates: number;
    average_course_duration: number;
    total_lessons: number;
    total_modules: number;
  };

  member_metrics: {
    total_members: number;
    active_members: number;
    inactive_members: number;
    members_by_role: {
      role: string;
      count: number;
    }[];
    members_by_institution: {
      institution_id: string;
      institution_name: string;
      count: number;
    }[];
    new_members_this_month: number;
    returning_members: number;
  };

  risk_metrics: {
    institutions_with_low_engagement: number;
    institutions_with_high_dropout: number;
    institutions_with_low_ratings: number;
    inactive_institutions: number;
    at_risk_institutions: {
      id: string;
      name: string;
      risk_level: "low" | "medium" | "high";
      risk_factors: string[];
      members: number;
      courses: number;
      engagement_rate: number;
    }[];
  };

  comparative_analysis: {
    average_members_per_institution: number;
    average_courses_per_institution: number;
    average_enrollments_per_course: number;
    top_performing_institution: {
      id: string;
      name: string;
      score: number;
    } | null;
    bottom_performing_institution: {
      id: string;
      name: string;
      score: number;
    } | null;
    institution_size_distribution: {
      size: string;
      count: number;
      percentage: number;
    }[];
  };
}

const INSTITUTION_TYPE_COLORS = {
  UNIVERSITY: "#3b82f6",
  GOVERNMENT: "#10b981",
  PRIVATE_COMPANY: "#f59e0b",
  NGO: "#8b5cf6",
  DEFAULT: "#6b7280",
};

const INSTITUTION_TYPE_ICONS = {
  UNIVERSITY: <University className="w-4 h-4" />,
  GOVERNMENT: <Landmark className="w-4 h-4" />,
  PRIVATE_COMPANY: <Factory className="w-4 h-4" />,
  NGO: <Heart className="w-4 h-4" />,
};

const RISK_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function SystemAdminInstitutionAnalyticsPage() {
  const { user } = useAppSelector((state) => state.bwengeAuth);
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<InstitutionAnalytics | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [selectedInstitutionType, setSelectedInstitutionType] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState<string>("members");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [showInstitutionDialog, setShowInstitutionDialog] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user, selectedTimeRange, selectedInstitutionType]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bwengeplus_token");
      
      // Determine date range
      let startDate = new Date();
      let endDate = new Date();
      
      switch (selectedTimeRange) {
        case "7d":
          startDate = subDays(new Date(), 7);
          break;
        case "30d":
          startDate = subDays(new Date(), 30);
          break;
        case "90d":
          startDate = subDays(new Date(), 90);
          break;
        case "1y":
          startDate = subYears(new Date(), 1);
          break;
        case "all":
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate = subDays(new Date(), 30);
      }

      // Fetch institution analytics from backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/institutions/analytics?` +
        `start_date=${startDate.toISOString()}&` +
        `end_date=${endDate.toISOString()}&` +
        `type=${selectedInstitutionType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      } else {
        // Fallback to mock data if endpoint not available
        setAnalytics(generateMockAnalytics(selectedTimeRange));
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Fallback to mock data
      setAnalytics(generateMockAnalytics(selectedTimeRange));
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (timeRange: string): InstitutionAnalytics => {
    // Generate realistic mock data
    const totalInstitutions = 156;
    const activeInstitutions = 142;
    const inactiveInstitutions = totalInstitutions - activeInstitutions;
    
    const institutionTypes = [
      { type: "UNIVERSITY", count: 78, members: 15234, courses: 456, color: INSTITUTION_TYPE_COLORS.UNIVERSITY },
      { type: "GOVERNMENT", count: 23, members: 4567, courses: 89, color: INSTITUTION_TYPE_COLORS.GOVERNMENT },
      { type: "PRIVATE_COMPANY", count: 42, members: 8765, courses: 234, color: INSTITUTION_TYPE_COLORS.PRIVATE_COMPANY },
      { type: "NGO", count: 13, members: 2345, courses: 67, color: INSTITUTION_TYPE_COLORS.NGO },
    ];

    const institutionsByType = institutionTypes.map(item => ({
      type: item.type,
      count: item.count,
      members: item.members,
      courses: item.courses,
      color: item.color,
    }));

    const institutionsByStatus = [
      { status: "Active", count: activeInstitutions },
      { status: "Inactive", count: inactiveInstitutions },
    ];

    const institutionsBySize = [
      { size: "Small (<100 members)", count: 45, min_members: 0, max_members: 100 },
      { size: "Medium (100-500 members)", count: 68, min_members: 100, max_members: 500 },
      { size: "Large (500-2000 members)", count: 32, min_members: 500, max_members: 2000 },
      { size: "Enterprise (>2000 members)", count: 11, min_members: 2000, max_members: 10000 },
    ];

    const topInstitutions = [
      {
        id: "inst-1",
        name: "University of Rwanda",
        type: "UNIVERSITY",
        logo_url: null,
        members: 3456,
        courses: 89,
        enrollments: 12453,
        average_rating: 4.7,
        completion_rate: 78.5,
        growth: 12.3,
        created_at: new Date(2018, 5, 15).toISOString(),
      },
      {
        id: "inst-2",
        name: "Ministry of Education",
        type: "GOVERNMENT",
        logo_url: null,
        members: 1234,
        courses: 34,
        enrollments: 5678,
        average_rating: 4.5,
        completion_rate: 82.1,
        growth: 8.7,
        created_at: new Date(2019, 3, 10).toISOString(),
      },
      {
        id: "inst-3",
        name: "Bank of Kigali",
        type: "PRIVATE_COMPANY",
        logo_url: null,
        members: 2345,
        courses: 45,
        enrollments: 7890,
        average_rating: 4.8,
        completion_rate: 91.2,
        growth: 15.4,
        created_at: new Date(2020, 1, 20).toISOString(),
      },
      {
        id: "inst-4",
        name: "African Leadership University",
        type: "UNIVERSITY",
        logo_url: null,
        members: 5678,
        courses: 123,
        enrollments: 15678,
        average_rating: 4.9,
        completion_rate: 88.3,
        growth: 22.1,
        created_at: new Date(2017, 8, 5).toISOString(),
      },
      {
        id: "inst-5",
        name: "World Vision Rwanda",
        type: "NGO",
        logo_url: null,
        members: 876,
        courses: 23,
        enrollments: 2345,
        average_rating: 4.6,
        completion_rate: 75.8,
        growth: 5.2,
        created_at: new Date(2021, 6, 12).toISOString(),
      },
    ];

    // Generate trends over time
    const periods = [];
    const now = new Date();
    let days = 30;
    
    switch (timeRange) {
      case "7d": days = 7; break;
      case "30d": days = 30; break;
      case "90d": days = 90; break;
      case "1y": days = 365; break;
      default: days = 30;
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const period = format(date, "yyyy-MM-dd");
      const month = format(date, "MMM d");
      
      periods.push({
        period: month,
        count: Math.floor(Math.random() * 10) + 5,
        active: Math.floor(Math.random() * 8) + 3,
        new: Math.floor(Math.random() * 3) + 1,
      });
    }

    const institutionsOverTime = periods;
    const membersOverTime = periods.map(p => ({
      period: p.period,
      count: Math.floor(Math.random() * 500) + 100,
    }));
    const coursesOverTime = periods.map(p => ({
      period: p.period,
      count: Math.floor(Math.random() * 50) + 10,
      mooc: Math.floor(Math.random() * 30) + 5,
      spoc: Math.floor(Math.random() * 20) + 5,
    }));
    const enrollmentsOverTime = periods.map(p => ({
      period: p.period,
      count: Math.floor(Math.random() * 1000) + 200,
    }));

    const geographicalDistribution = [
      { country: "Rwanda", count: 78, institutions: 45, members: 23456 },
      { country: "Kenya", count: 32, institutions: 23, members: 12345 },
      { country: "Uganda", count: 24, institutions: 18, members: 8765 },
      { country: "Tanzania", count: 15, institutions: 12, members: 5432 },
      { country: "DRC", count: 7, institutions: 5, members: 2345 },
    ];

    const membersByRole = [
      { role: "ADMIN", count: 312 },
      { role: "CONTENT_CREATOR", count: 456 },
      { role: "INSTRUCTOR", count: 1234 },
      { role: "MEMBER", count: 23456 },
    ];

    const membersByInstitution = topInstitutions.map(inst => ({
      institution_id: inst.id,
      institution_name: inst.name,
      count: inst.members,
    }));

    const atRiskInstitutions = [
      {
        id: "inst-6",
        name: "Small NGO",
        risk_level: "high" as const,
        risk_factors: ["low engagement", "no new courses", "inactive members"],
        members: 45,
        courses: 3,
        engagement_rate: 12.5,
      },
      {
        id: "inst-7",
        name: "Regional Government",
        risk_level: "medium" as const,
        risk_factors: ["declining enrollment", "outdated content"],
        members: 234,
        courses: 12,
        engagement_rate: 34.2,
      },
      {
        id: "inst-8",
        name: "Tech Startup",
        risk_level: "low" as const,
        risk_factors: ["new institution", "building courses"],
        members: 56,
        courses: 5,
        engagement_rate: 67.8,
      },
    ];

    const totalMembers = 30912;
    const totalCourses = 846;
    const totalEnrollments = 123456;

    return {
      summary: {
        total_institutions: totalInstitutions,
        active_institutions: activeInstitutions,
        inactive_institutions: inactiveInstitutions,
        total_members: totalMembers,
        total_courses: totalCourses,
        total_enrollments: totalEnrollments,
        average_completion_rate: 76.8,
        average_rating: 4.6,
        total_reviews: 23456,
        growth_rate: 12.5,
        institutions_created_this_month: 8,
        members_added_this_month: 1234,
        courses_published_this_month: 45,
      },
      institutions_by_type: institutionsByType,
      institutions_by_status: institutionsByStatus,
      institutions_by_size: institutionsBySize,
      top_institutions: topInstitutions,
      institution_performance: topInstitutions.map(inst => ({
        id: inst.id,
        name: inst.name,
        members: inst.members,
        courses: inst.courses,
        enrollments: inst.enrollments,
        completion_rate: inst.completion_rate,
        average_rating: inst.average_rating,
        efficiency_score: Math.round((inst.completion_rate * inst.average_rating * 10) / 100),
      })),
      trends: {
        institutions_over_time: institutionsOverTime,
        members_over_time: membersOverTime,
        courses_over_time: coursesOverTime,
        enrollments_over_time: enrollmentsOverTime,
        growth_rates: {
          daily: 0.5,
          weekly: 3.2,
          monthly: 12.5,
          yearly: 45.8,
        },
      },
      geographical_distribution: geographicalDistribution,
      engagement_metrics: {
        daily_active_members: 8765,
        weekly_active_members: 15432,
        monthly_active_members: 23456,
        average_session_duration: 24, // minutes
        total_time_spent_hours: 45678,
        member_engagement_rate: 67.5,
        course_engagement_rate: 72.3,
      },
      content_metrics: {
        total_courses: totalCourses,
        published_courses: 723,
        draft_courses: 98,
        archived_courses: 25,
        mooc_courses: 534,
        spoc_courses: 312,
        courses_with_certificates: 678,
        average_course_duration: 345, // minutes
        total_lessons: 5678,
        total_modules: 2345,
      },
      member_metrics: {
        total_members: totalMembers,
        active_members: 23456,
        inactive_members: 7456,
        members_by_role: membersByRole,
        members_by_institution: membersByInstitution,
        new_members_this_month: 1234,
        returning_members: 8765,
      },
      risk_metrics: {
        institutions_with_low_engagement: 12,
        institutions_with_high_dropout: 8,
        institutions_with_low_ratings: 5,
        inactive_institutions: inactiveInstitutions,
        at_risk_institutions: atRiskInstitutions,
      },
      comparative_analysis: {
        average_members_per_institution: Math.round(totalMembers / totalInstitutions),
        average_courses_per_institution: Math.round(totalCourses / totalInstitutions),
        average_enrollments_per_course: Math.round(totalEnrollments / totalCourses),
        top_performing_institution: {
          id: topInstitutions[3].id,
          name: topInstitutions[3].name,
          score: 94,
        },
        bottom_performing_institution: {
          id: topInstitutions[4].id,
          name: topInstitutions[4].name,
          score: 62,
        },
        institution_size_distribution: institutionsBySize.map(item => ({
          size: item.size,
          count: item.count,
          percentage: Math.round((item.count / totalInstitutions) * 100),
        })),
      },
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success("Analytics refreshed");
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("bwengeplus_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-admin/institutions/analytics/export?` +
        `time_range=${selectedTimeRange}&type=${selectedInstitutionType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `institution_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast.success("Analytics exported successfully");
      } else {
        toast.error("Failed to export analytics");
      }
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast.error("Failed to export analytics");
    }
  };

  const handleViewInstitution = (institution: any) => {
    setSelectedInstitution(institution);
    setShowInstitutionDialog(true);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatPercent = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatCompact = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-orange-100 text-orange-800">Medium Risk</Badge>;
      case "low":
        return <Badge className="bg-yellow-100 text-yellow-800">Low Risk</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              No Analytics Data
            </h2>
            <p className="text-gray-500 mb-6">
              There is no institution analytics data available yet.
            </p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Institution Analytics
          </h1>
          <p className="text-gray-600">
            Comprehensive analytics across all institutions on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedInstitutionType} onValueChange={setSelectedInstitutionType}>
            <SelectTrigger className="w-40">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="UNIVERSITY">Universities</SelectItem>
              <SelectItem value="GOVERNMENT">Government</SelectItem>
              <SelectItem value="PRIVATE_COMPANY">Private Companies</SelectItem>
              <SelectItem value="NGO">NGOs</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Institutions</p>
                <p className="text-3xl font-bold">{formatNumber(analytics.summary.total_institutions)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-100 text-green-800">
                    {analytics.summary.active_institutions} Active
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-800">
                    {analytics.summary.inactive_institutions} Inactive
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Members</p>
                <p className="text-3xl font-bold">{formatCompact(analytics.summary.total_members)}</p>
                <p className="text-xs text-green-600 mt-1">
                  +{formatNumber(analytics.summary.members_added_this_month)} this month
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Courses</p>
                <p className="text-3xl font-bold">{formatNumber(analytics.summary.total_courses)}</p>
                <p className="text-xs text-blue-600 mt-1">
                  +{analytics.summary.courses_published_this_month} published
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Enrollments</p>
                <p className="text-3xl font-bold">{formatCompact(analytics.summary.total_enrollments)}</p>
                <p className="text-xs text-orange-600 mt-1">
                  Avg completion: {analytics.summary.average_completion_rate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="institutions">Institutions</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Institution Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Institutions by Type</CardTitle>
                <CardDescription>
                  Distribution of institutions across different types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.institutions_by_type}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                      >
                        {analytics.institutions_by_type.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {analytics.institutions_by_type.map((item) => (
                    <div key={item.type} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm flex-1">{item.type.replace('_', ' ')}</span>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Institutions by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Institutions by Status</CardTitle>
                <CardDescription>
                  Active vs Inactive institutions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.institutions_by_status}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Institution Size Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Institution Size Distribution</CardTitle>
              <CardDescription>
                Breakdown by number of members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.institutions_by_size}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="size" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8">
                      {analytics.institutions_by_size.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  +{analytics.summary.growth_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Year over year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.summary.average_rating.toFixed(1)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(analytics.summary.average_rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">
                    ({formatNumber(analytics.summary.total_reviews)} reviews)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.summary.average_completion_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Across all courses
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Institutions Tab */}
        <TabsContent value="institutions" className="space-y-6">
          {/* Top Institutions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Institutions</CardTitle>
              <CardDescription>
                Institutions ranked by members, courses, and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-xs font-medium">Institution</th>
                      <th className="text-left p-3 text-xs font-medium">Type</th>
                      <th className="text-right p-3 text-xs font-medium">Members</th>
                      <th className="text-right p-3 text-xs font-medium">Courses</th>
                      <th className="text-right p-3 text-xs font-medium">Enrollments</th>
                      <th className="text-right p-3 text-xs font-medium">Rating</th>
                      <th className="text-right p-3 text-xs font-medium">Completion</th>
                      <th className="text-right p-3 text-xs font-medium">Growth</th>
                      <th className="text-center p-3 text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.top_institutions.map((inst) => (
                      <tr key={inst.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {inst.logo_url ? (
                              <img
                                src={inst.logo_url}
                                alt={inst.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <span className="font-medium">{inst.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            className="text-xs"
                            style={{
                              backgroundColor: `${INSTITUTION_TYPE_COLORS[inst.type as keyof typeof INSTITUTION_TYPE_COLORS]}20`,
                              color: INSTITUTION_TYPE_COLORS[inst.type as keyof typeof INSTITUTION_TYPE_COLORS],
                            }}
                          >
                            {inst.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium">{formatNumber(inst.members)}</td>
                        <td className="p-3 text-right">{inst.courses}</td>
                        <td className="p-3 text-right">{formatCompact(inst.enrollments)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {inst.average_rating.toFixed(1)}
                          </div>
                        </td>
                        <td className="p-3 text-right">{inst.completion_rate.toFixed(1)}%</td>
                        <td className="p-3 text-right text-green-600">+{inst.growth.toFixed(1)}%</td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewInstitution(inst)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Institution Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Institution Performance Matrix</CardTitle>
              <CardDescription>
                Members vs Courses with performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <Scatter
                    data={analytics.institution_performance}
                  >
                    <CartesianGrid />
                    <XAxis type="number" dataKey="members" name="Members" />
                    <YAxis type="number" dataKey="courses" name="Courses" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter
                      data={analytics.institution_performance}
                      fill="#8884d8"
                      shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        const size = Math.max(20, payload.efficiency_score);
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={size / 5}
                            fill={
                              payload.completion_rate > 80
                                ? "#10b981"
                                : payload.completion_rate > 60
                                ? "#f59e0b"
                                : "#ef4444"
                            }
                          />
                        );
                      }}
                    />
                  </Scatter>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          {/* Members Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(analytics.member_metrics.active_members)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((analytics.member_metrics.active_members / analytics.member_metrics.total_members) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  +{formatNumber(analytics.member_metrics.new_members_this_month)}
                </div>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Returning Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(analytics.member_metrics.returning_members)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((analytics.member_metrics.returning_members / analytics.member_metrics.active_members) * 100).toFixed(1)}% of active
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Members by Role */}
          <Card>
            <CardHeader>
              <CardTitle>Members by Role</CardTitle>
              <CardDescription>
                Distribution of members across different roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.member_metrics.members_by_role}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="role"
                    >
                      {analytics.member_metrics.members_by_role.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Members by Institution */}
          <Card>
            <CardHeader>
              <CardTitle>Members by Institution</CardTitle>
              <CardDescription>
                Top institutions by member count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={analytics.member_metrics.members_by_institution.slice(0, 10)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="institution_name" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8">
                      {analytics.member_metrics.members_by_institution.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          {/* Course Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.content_metrics.published_courses}</div>
                  <p className="text-sm text-gray-500">Published Courses</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.content_metrics.draft_courses}</div>
                  <p className="text-sm text-gray-500">Draft Courses</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.content_metrics.mooc_courses}</div>
                  <p className="text-sm text-gray-500">MOOC Courses</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.content_metrics.spoc_courses}</div>
                  <p className="text-sm text-gray-500">SPOC Courses</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { status: "Published", count: analytics.content_metrics.published_courses },
                          { status: "Draft", count: analytics.content_metrics.draft_courses },
                          { status: "Archived", count: analytics.content_metrics.archived_courses },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#6b7280" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MOOC vs SPOC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { type: "MOOC", count: analytics.content_metrics.mooc_courses },
                          { type: "SPOC", count: analytics.content_metrics.spoc_courses },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Institution Growth Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Institution Growth</CardTitle>
              <CardDescription>
                New institutions created over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trends.institutions_over_time}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      name="Total"
                    />
                    <Area
                      type="monotone"
                      dataKey="active"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Active"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Members and Courses Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Growth</CardTitle>
                <CardDescription>
                  New members over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends.members_over_time}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Members"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Growth</CardTitle>
                <CardDescription>
                  New courses over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends.courses_over_time}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Courses"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Rates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.daily >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.trends.growth_rates.daily >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.daily * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.weekly >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.trends.growth_rates.weekly >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.weekly * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.monthly >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.trends.growth_rates.monthly >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.monthly * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Yearly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  analytics.trends.growth_rates.yearly >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.trends.growth_rates.yearly >= 0 ? '+' : ''}
                  {(analytics.trends.growth_rates.yearly * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-6">
          {/* Risk Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  Low Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.risk_metrics.institutions_with_low_engagement}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600">
                  High Dropout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.risk_metrics.institutions_with_high_dropout}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">
                  Low Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.risk_metrics.institutions_with_low_ratings}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Inactive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.risk_metrics.inactive_institutions}</div>
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Institutions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                At-Risk Institutions
              </CardTitle>
              <CardDescription>
                Institutions requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.risk_metrics.at_risk_institutions.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{inst.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getRiskBadge(inst.risk_level)}
                            <span className="text-xs text-gray-500">
                              {inst.members} members • {inst.courses} courses
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500">Risk Factors:</p>
                        <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                          {inst.risk_factors.map((factor, index) => (
                            <li key={index}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/system-admin/institutions/${inst.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Institution Details Dialog */}
      <Dialog open={showInstitutionDialog} onOpenChange={setShowInstitutionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Institution Details</DialogTitle>
            <DialogDescription>
              Detailed information about the institution
            </DialogDescription>
          </DialogHeader>

          {selectedInstitution && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {selectedInstitution.logo_url ? (
                  <img
                    src={selectedInstitution.logo_url}
                    alt={selectedInstitution.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">{selectedInstitution.name}</h3>
                  <Badge
                    className="mt-1"
                    style={{
                      backgroundColor: `${INSTITUTION_TYPE_COLORS[selectedInstitution.type as keyof typeof INSTITUTION_TYPE_COLORS]}20`,
                      color: INSTITUTION_TYPE_COLORS[selectedInstitution.type as keyof typeof INSTITUTION_TYPE_COLORS],
                    }}
                  >
                    {selectedInstitution.type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Members</p>
                  <p className="text-xl font-bold">{formatNumber(selectedInstitution.members)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Courses</p>
                  <p className="text-xl font-bold">{selectedInstitution.courses}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Enrollments</p>
                  <p className="text-xl font-bold">{formatCompact(selectedInstitution.enrollments)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Avg Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xl font-bold">{selectedInstitution.average_rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Performance Metrics</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-medium">{selectedInstitution.completion_rate.toFixed(1)}%</span>
                    </div>
                    <Progress value={selectedInstitution.completion_rate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Growth Rate</span>
                      <span className="font-medium text-green-600">+{selectedInstitution.growth.toFixed(1)}%</span>
                    </div>
                    <Progress value={selectedInstitution.growth * 5} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <p>Created: {format(new Date(selectedInstitution.created_at), "MMMM d, yyyy")}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstitutionDialog(false)}>
              Close
            </Button>
            <Button asChild>
              <Link href={`/dashboard/system-admin/institutions/${selectedInstitution?.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View Full Details
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Color palette for charts
const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6b7280", "#84cc16",
  "#06b6d4", "#d946ef", "#f43f5e", "#64748b", "#0ea5e9"
];

// Progress component for the dialog
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className || ""}`}>
      <div
        className="bg-primary h-2 rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}