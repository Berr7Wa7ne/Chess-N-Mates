"use client"

import { PlayerBottomNav } from "./player-bottom-nav"
import { PlayerIconRail } from "./player-icon-rail"

export function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="player-shell flex h-dvh max-h-dvh overflow-hidden bg-bg-page p-0 text-text-primary md:p-3 lg:p-5">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] overflow-hidden rounded-none bg-bg-shell md:rounded-[32px]">
        <PlayerIconRail />
        <main className="player-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-4 md:p-5 md:pb-5 lg:p-6">
          <div className="pb-2">{children}</div>
        </main>
      </div>
      <PlayerBottomNav />
    </div>
  )
}
