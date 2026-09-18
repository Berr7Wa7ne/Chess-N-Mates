"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  LayoutDashboard,
  Medal,
  Trophy,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Home", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Members", href: "/admin/members", icon: Users },
  { title: "Competitions", href: "/admin/competitions", icon: Trophy },
  { title: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { title: "Board", href: "/admin/leaderboard", icon: Medal },
]

export function AdminBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-bg-panel-dark pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Admin navigation"
    >
      <div className="mx-auto flex max-w-[1440px] items-stretch justify-around px-1 pt-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-accent-gold"
                  : "text-white/45 active:text-white/80"
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  isActive && "bg-accent-gold text-text-primary"
                )}
              >
                <item.icon
                  className={cn("size-5", isActive ? "text-text-primary" : undefined)}
                  strokeWidth={1.75}
                />
              </span>
              <span className="truncate">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
