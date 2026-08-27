"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
  PlayerPanelTitle,
} from "@/components/layout/player-page-shell"
import { currentPlayerId, getPlayerMatches } from "@/lib/admin-data"
import { cn } from "@/lib/utils"

type FilterType = "all" | "pending" | "awaiting_review" | "confirmed" | "disputed"

const allMatches = getPlayerMatches(currentPlayerId)

const mapStatusForFilter = (status: string): FilterType | string => {
  if (status === "submitted") return "awaiting_review"
  if (status === "completed") return "confirmed"
  return status as FilterType
}

function normalizeGameUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function statusLabel(status: string) {
  const mapped = mapStatusForFilter(status)
  if (mapped === "awaiting_review") return "Awaiting review"
  if (mapped === "confirmed") return "Confirmed"
  return String(mapped).replaceAll("_", " ")
}

function statusClass(status: string) {
  const mapped = mapStatusForFilter(status)
  switch (mapped) {
    case "pending":
      return "text-amber-700"
    case "awaiting_review":
      return "text-sky-700"
    case "confirmed":
      return "text-emerald-700"
    case "disputed":
      return "text-red-600"
    default:
      return "text-text-secondary"
  }
}

export default function PlayerMatchesPage() {
  const [filter, setFilter] = useState<FilterType>("all")

  const filteredMatches = useMemo(() => {
    return filter === "all"
      ? allMatches
      : allMatches.filter((match) => mapStatusForFilter(match.status) === filter)
  }, [filter])

  const filterOptions: Array<{ value: FilterType; label: string }> = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "awaiting_review", label: "Awaiting" },
    { value: "confirmed", label: "Confirmed" },
    { value: "disputed", label: "Disputed" },
  ]

  return (
    <PlayerPageShell wide>
      <PlayerPageHeader
        title="My Matches"
        description={`${allMatches.length} matches across tournaments`}
      />

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === option.value
                ? "bg-bg-panel-dark text-white"
                : "bg-bg-panel-light text-text-secondary hover:text-text-primary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <PlayerPanel className="px-0 py-0 sm:px-0">
        <div className="border-b border-border-subtle px-6 py-4 sm:px-8">
          <PlayerPanelTitle title="Match list" />
        </div>

        <div className="scrollbar-none max-h-[65vh] overflow-y-auto px-6 sm:px-8">
          {filteredMatches.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">
              {filter === "all" ? "No matches yet." : `No ${filter.replaceAll("_", " ")} matches.`}
            </p>
          ) : (
            filteredMatches.map((match) => (
              <div
                key={match.id}
                className="flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">
                    vs {match.opponent}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {match.competition} · Round {match.round} ·{" "}
                    <span className="capitalize">{match.playerColor}</span>
                    {match.result ? ` · ${match.result}` : ""}
                  </p>
                  <p className={cn("mt-1 text-xs font-medium capitalize", statusClass(match.status))}>
                    {statusLabel(match.status)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {match.gameLink ? (
                    <a
                      href={normalizeGameUrl(match.gameLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-text-primary underline underline-offset-2"
                    >
                      Game
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    <span className="text-sm text-text-secondary">No game</span>
                  )}
                  <Link
                    href={`/player/matches/${match.id}`}
                    className="rounded-xl bg-accent-lime px-3 py-1.5 text-xs font-bold text-text-primary"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </PlayerPanel>
    </PlayerPageShell>
  )
}
