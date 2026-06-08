'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clearAuthCookies } from '@/src/lib/auth-storage'
import { useAuth } from '@/src/hooks/useAuth'

export function AppHeader() {
  const { currentUser, logout } = useAuth()
  const router = useRouter()

  function handleLogout() {
    clearAuthCookies()
    logout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/competitions" className="flex items-center gap-2 font-semibold">
          <Trophy className="size-5 text-primary" />
          <span>Chess Tournament</span>
        </Link>

        <div className="flex items-center gap-3">
          {currentUser && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {currentUser.display_name}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 size-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
