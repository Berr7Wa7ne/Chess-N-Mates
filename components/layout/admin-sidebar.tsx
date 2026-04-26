"use client"

import Link from "next/link"
import {
  AlertTriangle,
  LayoutDashboard,
  Medal,
  PanelLeftClose,
  Scroll,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Members", href: "/admin/members", icon: Users },
  { title: "Players", href: "/admin/players", icon: UserCheck },
  { title: "Competitions", href: "/admin/competitions", icon: Trophy },
  { title: "Fixtures", href: "/admin/fixtures", icon: Zap },
  { title: "Results", href: "/admin/results", icon: Scroll },
  { title: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { title: "Leaderboard", href: "/admin/leaderboard", icon: Medal },
]

function SidebarContent({
  pathname,
  onNavigate,
  onDesktopToggle,
}: {
  pathname: string
  onNavigate?: () => void
  onDesktopToggle?: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white text-slate-700 transition-colors dark:bg-[#16181b] dark:text-slate-200">
      <div className="flex shrink-0 items-center justify-between px-6 py-4 dark:border-white/10">
        <h2></h2>
        <button
          type="button"
          onClick={onDesktopToggle}
          className="hidden rounded-md p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 md:inline-flex"
          aria-label="Toggle navigation panel"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <nav className="mt-2 flex min-h-0 flex-col gap-2 px-6 py-6">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.title}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-base leading-none tracking-[-0.02em] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
                isActive && "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function DesktopCollapsedRail({ onToggle }: { onToggle: () => void }) {
  return (
    <aside className="hidden w-16 shrink-0 overflow-y-auto border-r border-slate-200 bg-white transition-colors dark:border-white/10 dark:bg-[#16181b] md:flex">
      <div className="flex w-full items-start justify-center pt-4">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex rounded-md p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Open navigation panel"
        >
          <PanelLeftClose className="size-4 rotate-180" />
        </button>
      </div>
    </aside>
  )
}

export function AdminSidebar({
  desktopOpen,
  onDesktopOpenChange,
  mobileOpen,
  onMobileOpenChange,
}: {
  desktopOpen: boolean
  onDesktopOpenChange: (open: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()

  return (
    <>
      {desktopOpen ? (
        <aside className="hidden h-full w-[320px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white transition-colors dark:border-white/10 dark:bg-[#16181b] md:block">
          <SidebarContent
            pathname={pathname}
            onDesktopToggle={() => onDesktopOpenChange(false)}
          />
        </aside>
      ) : (
        <DesktopCollapsedRail onToggle={() => onDesktopOpenChange(true)} />
      )}

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[300px] overflow-y-auto border-r border-slate-200 p-0 dark:border-white/10 sm:w-[320px]">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <SidebarContent
            pathname={pathname}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
