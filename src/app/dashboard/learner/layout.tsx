import RoleBasedDashboardLayout from '@/components/layout/RoleBasedDashboardLayout'

export default function LearnerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleBasedDashboardLayout>{children}</RoleBasedDashboardLayout>
}