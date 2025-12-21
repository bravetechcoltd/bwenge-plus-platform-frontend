import RoleBasedDashboardLayout from '@/components/layout/RoleBasedDashboardLayout'

export default function ContentCreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleBasedDashboardLayout>{children}</RoleBasedDashboardLayout>
}