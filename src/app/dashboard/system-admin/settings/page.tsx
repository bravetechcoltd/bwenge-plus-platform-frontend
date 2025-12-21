
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Cpu,
  CreditCard,
  FileText,
  Activity,
  Network,
  Database,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const settingsModules = [
  {
    title: "Platform Configuration",
    href: "/dashboard/system-admin/settings/platform",
    icon: Cpu,
    description: "Manage system-wide settings, feature flags, and environment variables",
    color: "bg-blue-500",
    stats: "24 settings",
  },
  {
    title: "Payment Integration",
    href: "/dashboard/system-admin/settings/payments",
    icon: CreditCard,
    description: "Configure payment gateways, transaction fees, and webhooks",
    color: "bg-green-500",
    stats: "3 active",
  },
  {
    title: "Global Policies",
    href: "/dashboard/system-admin/settings/policies",
    icon: FileText,
    description: "Manage terms of service, privacy policy, and legal documents",
    color: "bg-purple-500",
    stats: "8 policies",
  },
  {
    title: "System Analytics",
    href: "/dashboard/system-admin/settings/analytics",
    icon: Activity,
    description: "View platform metrics, user activity, and performance data",
    color: "bg-amber-500",
    stats: "Live data",
  },
  {
    title: "API Management",
    href: "/dashboard/system-admin/settings/api",
    icon: Network,
    description: "Create and manage API keys, rate limits, and access logs",
    color: "bg-red-500",
    stats: "12 keys",
  },
  {
    title: "Database",
    href: "/dashboard/system-admin/settings/database",
    icon: Database,
    description: "Backup management, health monitoring, and maintenance",
    color: "bg-indigo-500",
    stats: "Healthy",
  },
];

export default function SystemSettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary rounded-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure and manage all aspects of the platform
              </p>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className={`h-2 ${module.color}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${module.color} bg-opacity-10`}>
                      <Icon className={`w-6 h-6 ${module.color.replace('bg-', 'text-')}`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {module.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {module.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{module.stats}</span>
                    <span className="text-xs text-primary font-medium group-hover:underline">
                      Configure →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
              <p className="text-sm font-medium text-gray-900">Clear System Cache</p>
              <p className="text-xs text-gray-500 mt-1">Flush all cached data</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
              <p className="text-sm font-medium text-gray-900">Run Health Check</p>
              <p className="text-xs text-gray-500 mt-1">Verify all services</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
              <p className="text-sm font-medium text-gray-900">Generate Report</p>
              <p className="text-xs text-gray-500 mt-1">System summary report</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
              <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
              <p className="text-xs text-gray-500 mt-1">Toggle system access</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}