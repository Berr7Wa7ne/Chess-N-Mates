"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Medal,
  RefreshCw,
  Settings,
  Trophy,
  Users,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/src/hooks/useAuth"

const navItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Members", href: "/admin/members", icon: Users },
  { title: "Competitions", href: "/admin/competitions", icon: Trophy },
  { title: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { title: "Leaderboard", href: "/admin/leaderboard", icon: Medal },
]

export function AdminIconRail({ onOpenRules }: { onOpenRules?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <aside className="hidden w-[72px] shrink-0 flex-col items-center self-stretch rounded-l-[32px] bg-bg-panel-dark py-8 md:flex">
      <nav className="flex flex-1 flex-col items-center justify-between gap-2 py-2">
        <div className="flex flex-col items-center gap-5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.title}
                title={item.title}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-all duration-150 ease-out",
                  isActive
                    ? "bg-accent-lime text-text-primary"
                    : "text-white/45 hover:text-white/80"
                )}
              >
                <item.icon className="size-5" strokeWidth={1.75} />
              </Link>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-5">
          {onOpenRules && (
            <button
              type="button"
              aria-label="App rules"
              title="App rules"
              onClick={onOpenRules}
              className="flex size-10 items-center justify-center rounded-xl text-white/45 transition-all duration-150 ease-out hover:text-white/80"
            >
              <BookOpen className="size-5" strokeWidth={1.75} />
            </button>
          )}

          <button
            type="button"
            aria-label="Refresh"
            onClick={() => router.refresh()}
            className="flex size-10 items-center justify-center rounded-xl text-white/45 transition-all duration-150 ease-out hover:text-white/80"
          >
            <RefreshCw className="size-5" strokeWidth={1.75} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Settings"
                className="flex size-10 items-center justify-center rounded-xl text-white/45 transition-all duration-150 ease-out hover:text-white/80 data-[state=open]:bg-accent-lime data-[state=open]:text-text-primary"
              >
                <Settings className="size-5" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="end"
              className="w-48 rounded-xl border-border-subtle bg-bg-panel-light"
            >
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="mr-2 size-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              {onOpenRules && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onOpenRules}
                >
                  <BookOpen className="mr-2 size-4" />
                  App rules
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </aside>
  )
}
