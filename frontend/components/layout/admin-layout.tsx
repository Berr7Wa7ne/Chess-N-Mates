"use client"

import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { AdminSidebar } from "./admin-sidebar"
import { AdminTopbar } from "./admin-topbar"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

  function handleMenuClick() {
    if (isMobile) {
      setMobileSidebarOpen(true)
      return
    }

    setDesktopSidebarOpen((open) => !open)
  }

  return (
    <div className="flex h-screen flex-col bg-[#e9e9e9] text-foreground transition-colors dark:bg-[#111315]">
      {/* Topbar */}
      <AdminTopbar
        onMenuClick={handleMenuClick}
        showLogo={isMobile || desktopSidebarOpen}
      />

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <AdminSidebar
          desktopOpen={desktopSidebarOpen}
          onDesktopOpenChange={setDesktopSidebarOpen}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />

        {/* Main Content */}
        <main className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1280px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
