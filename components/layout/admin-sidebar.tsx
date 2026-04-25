"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Trophy,
  Zap,
  Scroll,
  AlertTriangle,
  Medal,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/admin" className="flex items-center gap-3">
        <div className="overflow-hidden rounded-xl">
          <Image
            src="/app-logo-2.png"
            alt="Chess And Mates Logo"
            width={60}
            height={60}
            className="object-contain"
            priority
          />
        </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(item.href))
                    }
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
