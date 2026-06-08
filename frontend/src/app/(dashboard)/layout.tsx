import { AuthGuard } from '@/src/components/auth/auth-guard'
import { AppHeader } from '@/src/components/layout/app-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </AuthGuard>
  )
}
