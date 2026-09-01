"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export type CollectionGame = {
  id: number | string
  title: string
  subtitle?: string
  href: string
  tone?: string
}

const COVER_TONES = ["#2A2A2A", "#1A1A1A", "#333333", "#242424", "#1E1E1E"]

export function GamesCollection({ games }: { games: CollectionGame[] }) {
  const visible = games.slice(0, 5)

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[20px] bg-bg-panel-light p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold leading-tight text-text-primary sm:text-[22px]">
          My Games Collection
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        {visible.map((game, index) => (
          <Link
            key={game.id}
            href={game.href}
            className="group flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-black/[0.03]"
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold text-white"
              style={{ backgroundColor: game.tone ?? COVER_TONES[index % COVER_TONES.length] }}
            >
              {game.title.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{game.title}</p>
              {game.subtitle && (
                <p className="truncate text-xs text-text-secondary">{game.subtitle}</p>
              )}
            </div>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-gold text-text-primary transition-transform group-hover:scale-105">
              <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
            </span>
          </Link>
        ))}

        {!visible.length && (
          <p className="py-8 text-center text-sm text-text-secondary">No games yet</p>
        )}
      </div>

      <div className="mt-4 border-t border-border-subtle pt-3 text-right">
        <Link
          href="/player/matches"
          className="text-sm font-medium text-text-primary underline underline-offset-2"
        >
          See All
        </Link>
      </div>
    </section>
  )
}
