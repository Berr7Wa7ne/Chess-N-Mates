import { AdminLayout } from "@/components/layout"
import { RoleGuard } from "@/src/components/auth/role-guard"

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard requiredRole="admin">
      <AdminLayout>{children}</AdminLayout>
    </RoleGuard>
  )
}
