"use client"

import Image from "next/image"
import { Bell, Menu, Moon, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

function TopbarIconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="size-11 rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
      aria-label={label}
    >
      {children}
    </Button>
  )
}

export function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <header className="top-0 z-40 flex h-[72px] items-center justify-between bg-white px-4 transition-colors dark:border-white/10 dark:bg-[#16181b] sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="size-11 rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>

        <div className="mt-14 overflow-hidden rounded-md">
          <Image
            src="/latest-app-logo.png"
            alt="Chess N Mates Logo"
            width={200}
            height={200}
            className="h-auto w-[100px] sm:w-[120px] lg:w-[140px] object-contain"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <TopbarIconButton
          label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </TopbarIconButton>

        <TopbarIconButton label="Notifications">
          <span className="relative">
            <Bell className="size-5" />
            <span className="absolute -bottom-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-red-500" />
          </span>
        </TopbarIconButton>

        <button
          type="button"
          className="flex size-12 items-center justify-center rounded-full bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/20"
          aria-label="Open user menu"
        >
          <Avatar className="size-12 border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
            <AvatarFallback className="bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-300">
              <User className="size-5" />
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  )
}
