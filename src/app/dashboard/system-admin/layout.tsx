import RoleBasedDashboardLayout from '@/components/layout/RoleBasedDashboardLayout'

export default function SystemAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleBasedDashboardLayout>{children}</RoleBasedDashboardLayout>
}