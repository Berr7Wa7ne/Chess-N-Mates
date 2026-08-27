"use client"

import { useMemo } from "react"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
  PlayerPanelTitle,
} from "@/components/layout/player-page-shell"
import { useAuth } from "@/src/hooks/useAuth"
import { useCommunityLeaderboard } from "@/src/hooks/useCommunityLeaderboard"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useCompetitionsStandings } from "@/src/hooks/useCompetitionsStandings"
import { cn } from "@/lib/utils"

export default function PlayerLeaderboardPage() {
  const { currentUser } = useAuth()
  const { data: competitions, isLoading: competitionsLoading } = useCompetitions()

  const rankingCompetitionIds = useMemo(
    () =>
      (competitions ?? [])
        .filter((c) => ["active", "completed"].includes(c.competition_status))
        .map((c) => c.id),
    [competitions]
  )

  const { byCompetitionId, isLoading: standingsLoading } =
    useCompetitionsStandings(rankingCompetitionIds)

  const { entries, isLoading, ratingsLoading } = useCommunityLeaderboard(
    byCompetitionId,
    competitionsLoading || standingsLoading
  )

  return (
    <PlayerPageShell>
      <PlayerPageHeader
        title="Leaderboard"
        description={
          ratingsLoading
            ? "Community rankings · loading Chess.com ratings…"
            : "Community rankings · Chess.com rating"
        }
      />

      <PlayerPanel className="px-0 py-0 sm:px-0">
        <div className="border-b border-border-subtle px-6 py-4 sm:px-8">
          <PlayerPanelTitle
            title="Rankings"
            description="Tournament results first, then Chess.com rating"
          />
        </div>

        <div className="scrollbar-none max-h-[60vh] overflow-y-auto px-6 sm:px-8">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-text-secondary">Loading rankings…</p>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">
              No tournament results yet.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-[3rem_1fr_4.5rem] gap-3 border-b border-border-subtle py-3 text-[12px] font-medium text-text-secondary">
                <span>Rank</span>
                <span>Player</span>
                <span className="text-right">Rating</span>
              </div>
              {entries.map((entry) => {
                const isYou =
                  currentUser && String(entry.userId) === String(currentUser.id)
                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      "grid grid-cols-[3rem_1fr_4.5rem] items-center gap-3 border-b border-border-subtle py-3.5 last:border-b-0",
                      isYou && "bg-accent-lime/15 -mx-2 rounded-xl px-2"
                    )}
                  >
                    <span className="text-sm font-semibold tabular-nums text-text-primary">
                      #{entry.rank}
                    </span>
                    <span className="truncate text-[15px] font-semibold text-text-primary">
                      {entry.displayName}
                      {isYou ? (
                        <span className="ml-2 text-[11px] font-medium text-text-secondary">
                          you
                        </span>
                      ) : null}
                    </span>
                    <span className="text-right text-[15px] font-extrabold tabular-nums text-text-primary">
                      {entry.chessComRating ?? "—"}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PlayerPanel>
    </PlayerPageShell>
  )
}
