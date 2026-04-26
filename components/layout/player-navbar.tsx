"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Swords,
  Trophy,
  User,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Navigation tabs per requirements: Dashboard, Matches, Leaderboard, Profile
const navItems = [
  { title: "Dashboard", href: "/player/dashboard", icon: LayoutDashboard },
  { title: "Matches", href: "/player/matches", icon: Swords },
  { title: "Leaderboard", href: "/player/leaderboard", icon: Trophy },
  { title: "Profile", href: "/player/profile", icon: User },
]

// Mock player data
const player = {
  name: "John Doe",
  username: "johndoe",
  initials: "JD",
}

export function PlayerNavbar() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <header className="mt-5 bg-background text-foreground">
      {/* Top Bar - Logo and Profile */}
      <div className="flex h-14 items-center justify-between border-b px-4 pb-7">
        {/* Logo */}
        <Link href="/player/dashboard" className="flex items-center gap-2">
          <div>
            <Image
              src="/app-logo.png"
              alt="Chess And Mates Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-md"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {/* Profile Dropdown - Desktop only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden gap-2 sm:flex">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {player.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{player.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="font-medium">{player.name}</p>
                <p className="text-sm text-muted-foreground">@{player.username}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/player/profile" className="cursor-pointer">
                  <User className="mr-2 size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom Navigation Tabs - Mobile First */}
      <nav className="flex items-center justify-around border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                "active:bg-accent/50",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("size-5", isActive && "text-primary")} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
