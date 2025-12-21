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
  Filter,
  ExternalLink,
  MoreVertical
} from "lucide-react"
import Link from "next/link"

// Mock data for System Admin Dashboard
const mockData = {
  platformStats: {
    totalInstitutions: 48,
    activeInstitutions: 42,
    pendingInstitutions: 6,
    totalUsers: 52300,
    activeUsers: 48720,
    totalCourses: 1250,
    activeCourses: 1180,
    moocCourses: 125,
    spocCourses: 180,
    totalRevenue: 1250000,
    revenueGrowth: 15.5,
  },
  recentActivity: [
    {
      id: 1,
      action: "Created Institution",
      description: "University of Rwanda",
      user: "System Admin",
      timestamp: "10 minutes ago",
      status: "completed",
      icon: Building2
    },
    {
      id: 2,
      action: "Assigned Admin",
      description: "John Doe assigned as Institution Admin for UR",
      user: "System Admin",
      timestamp: "25 minutes ago",
      status: "completed",
      icon: UserPlus
    },
    {
      id: 3,
      action: "Course Override",
      description: "Updated course settings for 'Advanced ML'",
      user: "System Admin",
      timestamp: "1 hour ago",
      status: "completed",
      icon: Settings
    },
    {
      id: 4,
      action: "Payment Integration",
      description: "Updated Stripe API keys",
      user: "System Admin",
      timestamp: "2 hours ago",
      status: "completed",
      icon: CreditCard
    },
    {
      id: 5,
      action: "User Role Changed",
      description: "Promoted Sarah Chen to Institution Admin",
      user: "System Admin",
      timestamp: "3 hours ago",
      status: "completed",
      icon: Users
    },
  ],
  institutionRequests: [
    {
      id: 1,
      name: "Kigali Institute of Technology",
      type: "UNIVERSITY",
      submittedBy: "Dr. James Wilson",
      submittedAt: "2024-01-15",
      status: "pending"
    },
    {
      id: 2,
      name: "Rwanda Digital Agency",
      type: "GOVERNMENT",
      submittedBy: "Marie Uwase",
      submittedAt: "2024-01-14",
      status: "pending"
    },
    {
      id: 3,
      name: "Tech Solutions Ltd",
      type: "PRIVATE_COMPANY",
      submittedBy: "Alex Kamali",
      submittedAt: "2024-01-13",
      status: "pending"
    },
  ],
  systemHealth: {
    uptime: 99.98,
    responseTime: "125ms",
    activeSessions: 4250,
    errorRate: 0.12,
    lastBackup: "2024-01-15 02:00",
    backupStatus: "success"
  },
  topInstitutions: [
    {
      id: 1,
      name: "University of Rwanda",
      users: 12500,
      courses: 240,
      active: true,
      revenue: 125000
    },
    {
      id: 2,
      name: "Rwanda Polytechnic",
      users: 8900,
      courses: 180,
      active: true,
      revenue: 98000
    },
    {
      id: 3,
      name: "AIMS Rwanda",
      users: 6500,
      courses: 120,
      active: true,
      revenue: 75000
    },
    {
      id: 4,
      name: "Carnegie Mellon Africa",
      users: 3200,
      courses: 95,
      active: true,
      revenue: 45000
    },
  ],
  quickActions: [
    {
      title: "Create Institution",
      description: "Add new institution to platform",
      icon: Building2,
      href: "/dashboard/system-admin/institutions/create",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Manage Users",
      description: "View and manage all users",
      icon: Users,
      href: "/dashboard/system-admin/users",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "System Settings",
      description: "Configure platform settings",
      icon: Settings,
      href: "/dashboard/system-admin/settings/platform",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Generate Reports",
      description: "Create system-wide reports",
      icon: FileText,
      href: "/dashboard/system-admin/reports",
      color: "from-orange-500 to-amber-500"
    },
  ]
}

export default function SystemAdminDashboard() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]"></div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Administration Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage the entire BwengePlus platform</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Institutions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(mockData.platformStats.totalInstitutions)}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium">+{mockData.platformStats.activeInstitutions} active</span>
            <span className="text-gray-300">•</span>
            <span className="text-amber-600">{mockData.platformStats.pendingInstitutions} pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Users</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(mockData.platformStats.totalUsers)}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium">{formatNumber(mockData.platformStats.activeUsers)} active</span>
            <span className="text-gray-300">•</span>
            <span className="text-blue-600">{((mockData.platformStats.activeUsers / mockData.platformStats.totalUsers) * 100).toFixed(1)}% active rate</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Courses</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(mockData.platformStats.totalCourses)}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium">{mockData.platformStats.activeCourses} active</span>
            <span className="text-gray-300">•</span>
            <span className="text-blue-600">{mockData.platformStats.moocCourses} MOOC</span>
            <span className="text-gray-300">•</span>
            <span className="text-purple-600">{mockData.platformStats.spocCourses} SPOC</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Revenue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(mockData.platformStats.totalRevenue)}</div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <span className="text-green-600 font-medium flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              {mockData.platformStats.revenueGrowth}% growth
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-blue-600">MTD</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4F46E5]" />
              Quick Actions
            </h3>
            <p className="text-sm text-gray-600 mt-1">Frequently used administration tasks</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {mockData.quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-[#4F46E5]/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-[#4F46E5]">{action.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{action.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4F46E5]" />
                Recent Activity
              </h3>
              <p className="text-sm text-gray-600 mt-1">Latest system administration actions</p>
            </div>
            <Link href="/dashboard/system-admin/activity" className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium">
              View all
            </Link>
          </div>
          <div className="p-5 space-y-4">
            {mockData.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                <div className={`p-2 rounded-lg ${activity.status === 'completed' ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <activity.icon className={`w-4 h-4 ${activity.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{activity.action}</div>
                  <div className="text-sm text-gray-600 truncate">{activity.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {activity.user} • {activity.timestamp}
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
            ))}
          </div>
        </div>
      </div>

      {/* Pending Requests & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Institution Requests */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Pending Institution Requests
              </h3>
              <p className="text-sm text-gray-600 mt-1">New institution applications requiring review</p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
              {mockData.institutionRequests.length} pending
            </span>
          </div>
          <div className="p-5 space-y-3">
            {mockData.institutionRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{request.name}</div>
                  <div className="text-sm text-gray-600">
                    {request.type.replace('_', ' ')} • Submitted by {request.submittedBy}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{request.submittedAt}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-[#4F46E5] text-white text-xs rounded-lg hover:bg-[#4338CA] transition-colors">
                    Review
                  </button>
                  <button className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-100">
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Link 
                href="/dashboard/system-admin/institutions/pending" 
                className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center gap-1"
              >
                View all pending requests
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                System Health
              </h3>
              <p className="text-sm text-gray-600 mt-1">Platform performance and status</p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              mockData.systemHealth.uptime > 99.9 
                ? 'bg-green-100 text-green-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {mockData.systemHealth.uptime}% Uptime
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">Response Time</div>
                <div className="font-semibold text-gray-900">{mockData.systemHealth.responseTime}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">Active Sessions</div>
                <div className="font-semibold text-gray-900">{formatNumber(mockData.systemHealth.activeSessions)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">Error Rate</div>
                <div className="font-semibold text-gray-900">{mockData.systemHealth.errorRate}%</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">Last Backup</div>
                <div className="font-semibold text-gray-900 text-sm">{mockData.systemHealth.lastBackup}</div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Backup Status</div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  mockData.systemHealth.backupStatus === 'success' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {mockData.systemHealth.backupStatus === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {mockData.systemHealth.backupStatus.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Institutions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#4F46E5]" />
              Top Performing Institutions
            </h3>
            <p className="text-sm text-gray-600 mt-1">Leading institutions by engagement and revenue</p>
          </div>
          <Link href="/dashboard/system-admin/institutions" className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium">
            View all institutions
          </Link>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 font-medium text-gray-700">Institution</th>
                  <th className="text-left py-3 font-medium text-gray-700">Users</th>
                  <th className="text-left py-3 font-medium text-gray-700">Courses</th>
                  <th className="text-left py-3 font-medium text-gray-700">Revenue</th>
                  <th className="text-left py-3 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockData.topInstitutions.map((institution) => (
                  <tr key={institution.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{institution.name}</div>
                    </td>
                    <td className="py-3">{formatNumber(institution.users)}</td>
                    <td className="py-3">{institution.courses}</td>
                    <td className="py-3 font-medium text-gray-900">{formatCurrency(institution.revenue)}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        institution.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {institution.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Settings">
                          <Settings className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Analytics">
                          <BarChart3 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-red-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Emergency Actions
            </h4>
            <p className="text-sm text-red-700 mt-1">
              These actions affect the entire platform. Use with caution and only when necessary.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-red-300 text-red-700 text-sm rounded-lg hover:bg-red-50 transition-colors">
              System Maintenance Mode
            </button>
            <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
              Emergency Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}