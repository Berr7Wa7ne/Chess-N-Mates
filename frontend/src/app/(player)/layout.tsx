import { PlayerLayout } from "@/components/layout"
import { RoleGuard } from "@/src/components/auth/role-guard"

export default function PlayerGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard requiredRole="player">
      <PlayerLayout>{children}</PlayerLayout>
    </RoleGuard>
  )
}
