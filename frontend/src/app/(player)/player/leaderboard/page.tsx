"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
  PlayerPanelTitle,
} from "@/components/layout/player-page-shell"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/src/hooks/useAuth"
import { useCommunityLeaderboard } from "@/src/hooks/useCommunityLeaderboard"
import { downloadLeaderboardImage } from "@/src/lib/leaderboard-export"
import { ApiError } from "@/src/types/api"
import { cn } from "@/lib/utils"

export default function PlayerLeaderboardPage() {
  const { currentUser } = useAuth()
  const { entries, isLoading } = useCommunityLeaderboard()
  const [downloading, setDownloading] = useState(false)

  const isRanked =
    Boolean(currentUser) &&
    entries.some((e) => String(e.userId) === String(currentUser!.id))

  async function handleDownload() {
    if (entries.length === 0) {
      toast.error("No ranked players to download")
      return
    }
    setDownloading(true)
    try {
      await downloadLeaderboardImage({ entries })
      toast.success("Leaderboard downloaded")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to download leaderboard")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <PlayerPageShell>
      <div className="flex items-start justify-between gap-4">
        <PlayerPageHeader
          title="Leaderboard"
          description="Community rankings - Community ELO based on competition results"
        />
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={entries.length === 0 || downloading}
          className="gap-2 rounded-xl"
        >
          <Download className="size-4" />
          Download Leaderboard
        </Button>
      </div>

      <PlayerPanel className="px-0 py-0 sm:px-0">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4 sm:px-8">
          <PlayerPanelTitle
            title="Rankings"
            description="Seed 1000 + Chess.com rapid/2, then results only"
          />
        </div>

        <div className="scrollbar-none max-h-[60vh] overflow-y-auto px-6 sm:px-8">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-text-secondary">Loading rankings...</p>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">
              No tournament results yet.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-[3rem_1fr_4.5rem] gap-3 border-b border-border-subtle py-3 text-[12px] font-medium text-text-secondary">
                <span>Rank</span>
                <span>Player</span>
                <span className="text-right">Community ELO</span>
              </div>
              {entries.map((entry) => {
                const isYou =
                  currentUser && String(entry.userId) === String(currentUser.id)
                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      "grid grid-cols-[3rem_1fr_4.5rem] items-center gap-3 border-b border-border-subtle py-3.5 last:border-b-0",
                      isYou && "bg-accent-gold/15 -mx-2 rounded-xl px-2"
                    )}
                  >
                    <span className="text-sm font-semibold tabular-nums text-text-primary">#{entry.rank}</span>
                    <span className="truncate text-[15px] font-semibold text-text-primary">
                      {entry.displayName}
                      {isYou ? (<span className="ml-2 text-[11px] font-medium text-text-secondary">you</span>) : null}
                    </span>
                    <span className="text-right text-[15px] font-extrabold tabular-nums text-text-primary">
                      {entry.communityElo}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {!isLoading && currentUser && !isRanked && entries.length > 0 && (
            <p className="py-4 text-center text-xs text-text-secondary">
              You are not ranked yet. Play your first tournament and you will appear here.
            </p>
          )}
        </div>
      </PlayerPanel>
    </PlayerPageShell>
  )
}
