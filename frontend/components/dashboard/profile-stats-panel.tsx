"use client"

import Link from "next/link"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProfileStats = {
  displayName: string
  handle: string
  online?: boolean
  games: number | string
  elo: number | string
  ratio: number | string
  wins: number | string
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "P"
}

export function ProfileStatsPanel({ stats }: { stats: ProfileStats }) {
  const tiles = [
    { label: "Games", value: stats.games, hero: false },
    { label: "Community ELO", value: stats.elo, hero: true },
    { label: "W/L Ratio", value: stats.ratio, hero: false },
    { label: "Wins", value: stats.wins, hero: false },
  ]

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] bg-bg-panel-dark p-5 text-text-primary-inverse">
      <button
        type="button"
        aria-label="More options"
        className="absolute right-4 top-4 text-white/50 transition-colors hover:text-white"
      >
        <MoreVertical className="size-5" />
      </button>

      <div className="flex flex-col items-center pt-4 text-center">
        <div className="relative mb-4">
          <div className="flex size-[96px] items-center justify-center rounded-full bg-[#2A2A2A] text-2xl font-bold text-white ring-2 ring-accent-lime">
            {initials(stats.displayName)}
          </div>
          <span className="absolute bottom-1 right-2 size-3.5 rounded-full bg-accent-lime ring-2 ring-bg-panel-dark" />
        </div>
        <h3 className="text-xl font-bold text-white">{stats.displayName}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-white/50">
          <span className="size-1.5 rounded-full bg-accent-lime" />
          @{stats.handle}
        </p>
      </div>

      <div className="mt-8 grid flex-1 grid-cols-2 gap-3 content-start">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.hero ? "/player/profile" : "/player/leaderboard"}
            className={cn(
              "rounded-2xl p-4 transition-transform hover:scale-[1.02]",
              tile.hero
                ? "bg-accent-lime text-text-primary"
                : "border border-white/5 bg-bg-stat-tile text-white"
            )}
          >
            <p
              className={cn(
                "tabular-nums text-[32px] font-extrabold leading-none tracking-tight",
                tile.hero && "text-[36px]"
              )}
            >
              {tile.value}
            </p>
            <p
              className={cn(
                "mt-2 text-[13px] font-medium",
                tile.hero ? "text-text-primary/70" : "text-white/45"
              )}
            >
              {tile.label}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
