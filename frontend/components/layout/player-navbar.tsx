"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LayoutDashboard, LogOut, Medal, Moon, Sun, Swords, Trophy, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
  { title: "Dashboard", href: "/player/dashboard", icon: LayoutDashboard },
  { title: "Matches", href: "/player/matches", icon: Swords },
  { title: "Tournament", href: "/player/tournament", icon: Trophy },
  { title: "Leaderboard", href: "/player/leaderboard", icon: Medal },
  { title: "Profile", href: "/player/profile", icon: User },
]

function getInitials(name?: string | null) {
  if (!name) return "P"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function PlayerNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const playerName = currentUser?.display_name || "Player"
  const playerUsername = currentUser?.chess_username || currentUser?.phone_number || "player"

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <header className="mt-10 bg-background text-foreground">
      <div className="flex h-14 items-center justify-between border-b px-4 pb-7">
        <Link href="/player/dashboard" className="flex items-center gap-2">
          <div>
            <Image
              src="/latest-app-logo.png"
              alt="Chess And Mates Logo"
              width={85}
              height={85}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden gap-2 sm:flex">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(playerName)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{playerName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="font-medium">{playerName}</p>
                <p className="text-sm text-muted-foreground">@{playerUsername}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/player/profile" className="cursor-pointer">
                  <User className="mr-2 size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
