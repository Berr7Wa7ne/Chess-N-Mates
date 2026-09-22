"use client"

import { useState } from "react"
import { Download, Info, Medal } from "lucide-react"
import { toast } from "sonner"
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from "@/components/layout"
import { useCommunityLeaderboard } from "@/src/hooks/useCommunityLeaderboard"
import { downloadLeaderboardImage } from "@/src/lib/leaderboard-export"
import { ApiError } from "@/src/types/api"
import { cn } from "@/lib/utils"

export default function LeaderboardPage() {
  const [infoOpen, setInfoOpen] = useState(false)
  const { entries, isLoading } = useCommunityLeaderboard()

  async function handleDownload() {
    if (entries.length === 0) {
      toast.error("No ranked players to download")
      return
    }
    try {
      await downloadLeaderboardImage({ entries })
      toast.success("Leaderboard downloaded")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to download leaderboard")
    }
  }

  return (
    <AdminPageShell>
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Leaderboard"
          description="Community ELO rankings from tournament results"
        />
        <AdminIconRow>
          <AdminIconAction icon={Download} label="Download image" onClick={handleDownload} />
          <AdminIconAction icon={Info} label="About rankings" onClick={() => setInfoOpen(true)} />
        </AdminIconRow>
      </div>

      <AdminPanel className="px-0 py-0 sm:px-0">
        <div className="grid grid-cols-[3rem_1fr_4.5rem] gap-3 border-b border-border-subtle px-6 py-3 text-[12px] font-medium text-text-secondary sm:px-8">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Community ELO</span>
        </div>

        {isLoading ? (
          <p className="px-6 py-10 text-center text-sm text-text-secondary sm:px-8">Loading rankings...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 sm:px-8">
            <Medal className="size-8 text-text-secondary/30" />
            <p className="text-sm text-text-secondary">No tournament results yet - players appear after their first completed match.</p>
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
                <p className="truncate text-[15px] font-semibold text-text-primary">{entry.displayName}</p>
                <p className="truncate text-[12px] text-text-secondary">
                  {entry.matchWins}W - {entry.firstPlaces}x1st - {entry.tournamentsPlayed} tournament(s)
                </p>
              </div>
              <span className="text-right text-sm font-semibold tabular-nums text-text-primary">
                {entry.communityElo}
              </span>
            </div>
          ))
        )}
      </AdminPanel>

      <AdminContentModal open={infoOpen} onOpenChange={setInfoOpen} title="How rankings work">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
          <li>Seed: 1000 plus half your Chess.com rapid rating on your first completed match.</li>
          <li>From then on only competition results move your ELO.</li>
          <li>Winning against a stronger player earns more than beating a weaker one.</li>
          <li>Play at least one competition to appear on this board.</li>
        </ol>
      </AdminContentModal>
    </AdminPageShell>
  )
}
