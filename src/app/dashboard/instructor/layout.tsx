import RoleBasedDashboardLayout from '@/components/layout/RoleBasedDashboardLayout'

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleBasedDashboardLayout>{children}</RoleBasedDashboardLayout>
}

