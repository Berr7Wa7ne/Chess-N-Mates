"use client"

import Link from "next/link"
import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

export type TournamentChip = {
  id: number | string
  name: string
  status?: string
  accent?: string
  href?: string
}

const PASTELS = ["#F5D0C5", "#D4E5F7", "#E2F0D4", "#F3E0C8", "#E8D5F2", "#D5F0EA"]

function initials(name: string) {
  return name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

/** Top bar of tournaments the player has played / joined — not a social friends list. */
export function TournamentsBar({ tournaments }: { tournaments: TournamentChip[] }) {
  return (
    <section className="rounded-[20px] bg-bg-panel-light px-6 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Your Tournaments</h2>
        <Link
          href="/player/tournament"
          className="text-xs font-medium text-text-primary underline underline-offset-2"
        >
          See All
        </Link>
      </div>
      <div className="flex items-start gap-8 overflow-x-hidden">
        {tournaments.length === 0 ? (
          <Link
            href="/player/tournament"
            className="flex items-center gap-3 rounded-xl px-1 py-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-[#E8E8E4]">
              <Trophy className="size-5" strokeWidth={1.75} />
            </div>
            <span className="text-[12px] font-medium">Browse tournaments</span>
          </Link>
        ) : (
          tournaments.map((t, index) => {
            const active = t.status === "active" || t.status === "open_registration"
            const content = (
              <>
                <div className="relative">
                  <div
                    className="flex size-12 items-center justify-center rounded-full text-xs font-semibold text-text-primary"
                    style={{ backgroundColor: t.accent ?? PASTELS[index % PASTELS.length] }}
                  >
                    {initials(t.name)}
                  </div>
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-bg-panel-light",
                      active ? "bg-accent-lime" : "bg-text-secondary"
                    )}
                  />
                </div>
                <span className="w-full truncate text-center text-[12px] font-medium leading-tight text-text-primary">
                  {t.name}
                </span>
              </>
            )

            return t.href ? (
              <Link
                key={t.id}
                href={t.href}
                className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5"
              >
                {content}
              </Link>
            ) : (
              <div key={t.id} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5">
                {content}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

/** @deprecated use TournamentsBar */
export const FriendsBar = TournamentsBar
export type FriendItem = TournamentChip
