"use client"

import { PlayerIconRail } from "./player-icon-rail"

export function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="player-shell flex h-dvh max-h-dvh overflow-hidden bg-bg-page p-3 text-text-primary sm:p-4 lg:p-5">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] overflow-hidden rounded-[32px] bg-bg-shell">
        <PlayerIconRail />
        <main className="player-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6">
          <div className="pb-2">{children}</div>
        </main>
      </div>
    </div>
  )
}
