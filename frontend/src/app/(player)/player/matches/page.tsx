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
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useUserRegistrations } from "@/src/hooks/useParticipants"
import {
  mapMatchStatusForFilter,
  opponentLabel,
  playerResultLabel,
  usePlayerRecentMatches,
} from "@/src/hooks/usePlayerRecentMatches"
import type { Competition } from "@/src/types/competition"
import { cn } from "@/lib/utils"

type FilterType = "all" | "pending" | "awaiting_review" | "confirmed" | "disputed"

function normalizeGameUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function statusLabel(filterKey: string) {
  if (filterKey === "awaiting_review") return "Awaiting review"
  if (filterKey === "confirmed") return "Confirmed"
  return filterKey.replaceAll("_", " ")
}

function statusClass(filterKey: string) {
  switch (filterKey) {
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
  const { currentUser } = useAuth()
  const [filter, setFilter] = useState<FilterType>("all")
  const { data: registrationIds } = useUserRegistrations(currentUser?.id)
  const { data: competitions } = useCompetitions()

  const joinedCompetitionIds = useMemo(
    () => (registrationIds ?? []).map(String),
    [registrationIds]
  )

  const competitionsById = useMemo(() => {
    const map: Record<string, Competition | undefined> = {}
    for (const c of competitions ?? []) map[String(c.id)] = c
    return map
  }, [competitions])

  const { matches, isLoading } = usePlayerRecentMatches(
    currentUser?.id,
    joinedCompetitionIds,
    competitionsById,
    { limit: Number.POSITIVE_INFINITY }
  )

  const filteredMatches = useMemo(() => {
    if (filter === "all") return matches
    return matches.filter((match) => mapMatchStatusForFilter(match.match_status) === filter)
  }, [filter, matches])

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
        description={
          isLoading
            ? "Loading your matches…"
            : `${matches.length} matches across tournaments`
        }
      />

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
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
          {isLoading ? (
            <p className="py-10 text-center text-sm text-text-secondary">Loading matches…</p>
          ) : filteredMatches.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">
              {filter === "all"
                ? "No matches yet. Join a tournament to get fixtures."
                : `No ${filter.replaceAll("_", " ")} matches.`}
            </p>
          ) : (
            filteredMatches.map((match) => {
              const filterKey = mapMatchStatusForFilter(match.match_status)
              const competitionName =
                competitionsById[String(match.competition_id)]?.name || "Tournament"
              const result = currentUser
                ? playerResultLabel(match, currentUser.id)
                : null
              const opponent = currentUser
                ? opponentLabel(match, currentUser.id)
                : "Opponent"

              return (
                <div
                  key={match.id}
                  className="flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary">vs {opponent}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {competitionName} · Round {match.round_number}
                      {match.leg > 1 ? ` · Leg ${match.leg}` : ""}
                      {result ? ` · ${result}` : ""}
                    </p>
                    <p className={cn("mt-1 text-xs font-medium capitalize", statusClass(filterKey))}>
                      {statusLabel(filterKey)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {match.chess_game_link ? (
                      <a
                        href={normalizeGameUrl(match.chess_game_link)}
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
                      className="min-h-11 rounded-xl bg-accent-lime px-4 py-2.5 text-sm font-bold text-text-primary"
                    >
                      View
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </PlayerPanel>
    </PlayerPageShell>
  )
}
