import RoleBasedDashboardLayout from '@/components/layout/RoleBasedDashboardLayout'

export default function InstitutionAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleBasedDashboardLayout>{children}</RoleBasedDashboardLayout>
}