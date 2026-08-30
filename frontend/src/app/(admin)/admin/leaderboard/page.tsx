"use client"

import { useMemo, useState } from "react"
import { Info, Medal } from "lucide-react"
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from "@/components/layout"
import { useCommunityLeaderboard } from "@/src/hooks/useCommunityLeaderboard"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useCompetitionsStandings } from "@/src/hooks/useCompetitionsStandings"
import { cn } from "@/lib/utils"

export default function LeaderboardPage() {
  const [infoOpen, setInfoOpen] = useState(false)
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

  const { entries, isLoading } = useCommunityLeaderboard(
    byCompetitionId,
    competitionsLoading || standingsLoading
  )

  return (
    <AdminPageShell>
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Leaderboard"
          description="Community rankings from tournament results"
        />
        <AdminIconRow>
          <AdminIconAction icon={Info} label="About rankings" onClick={() => setInfoOpen(true)} />
        </AdminIconRow>
      </div>

      <AdminPanel className="px-0 py-0 sm:px-0">
        <div className="grid grid-cols-[3rem_1fr_4.5rem] gap-3 border-b border-border-subtle px-6 py-3 text-[12px] font-medium text-text-secondary sm:px-8">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Rating</span>
        </div>

        {isLoading ? (
          <p className="px-6 py-10 text-center text-sm text-text-secondary sm:px-8">
            Loading rankings…
          </p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 sm:px-8">
            <Medal className="size-8 text-text-secondary/30" />
            <p className="text-sm text-text-secondary">No tournament results yet</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.userId}
              className="grid grid-cols-[3rem_1fr_4.5rem] items-center gap-3 border-b border-border-subtle px-6 py-3.5 last:border-b-0 sm:px-8"
            >
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  entry.rank <= 3 ? "text-text-primary" : "text-text-secondary"
                )}
              >
                {entry.rank}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-text-primary">
                  {entry.displayName}
                </p>
                <p className="truncate text-[12px] text-text-secondary">
                  {entry.matchWins}W · {entry.firstPlaces}×1st
                </p>
              </div>
              <span className="text-right text-sm font-semibold tabular-nums text-text-primary">
                {entry.chessComRating ?? "—"}
              </span>
            </div>
          ))
        )}
      </AdminPanel>

      <AdminContentModal
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title="How rankings work"
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
          <li>Tournament 1st places</li>
          <li>Then 2nd places, then 3rd</li>
          <li>Then match wins across tournaments</li>
          <li>Then Chess.com rating</li>
        </ol>
      </AdminContentModal>
    </AdminPageShell>
  )
}
