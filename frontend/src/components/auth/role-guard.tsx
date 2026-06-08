'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/hooks/useAuth'
import { getDashboardPath } from '@/src/lib/auth-storage'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRole } from '@/src/types/user'

export function RoleGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole: UserRole
}) {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (role && role !== requiredRole) {
      router.replace(getDashboardPath(role))
    }
  }, [isAuthenticated, isLoading, role, requiredRole, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!isAuthenticated || role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
