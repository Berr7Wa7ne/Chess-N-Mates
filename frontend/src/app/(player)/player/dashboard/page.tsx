"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Award, ChevronRight, Medal, Swords, TrendingUp, Trophy } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { currentPlayerId, getCurrentCompetition, getLeaderboardEntry, getPlayerMatches, leaderboard } from "@/lib/admin-data"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useJoinCompetition } from "@/src/hooks/useParticipants"
import { ApiError } from "@/src/types/api"

const currentPlayerStanding = getLeaderboardEntry(currentPlayerId)
const currentCompetition = getCurrentCompetition()
const activeMatches = getPlayerMatches(currentPlayerId).filter((match) => match.status === "pending" || match.status === "submitted")
const pendingMatches = activeMatches.filter((match) => match.status === "pending")

const leaderboardPreview = leaderboard.slice(0, 3)

export default function PlayerDashboardPage() {
  const { currentUser } = useAuth()
  const { data: apiCompetitions } = useCompetitions()
  const joinMutation = useJoinCompetition()
  const [bannerDismissed, setBannerDismissed] = useState(true) // default to dismissed, will be updated below

  const bannerCompetition = useMemo(() => {
    if (!apiCompetitions?.length) return null
    // Only show banner for competitions open for registration
    return apiCompetitions.find((competition) => competition.competition_status === "open_registration") ?? null
  }, [apiCompetitions])

  useEffect(() => {
    if (bannerCompetition && !bannerDismissed) {
      sessionStorage.setItem(`player_tournament_banner_${bannerCompetition.id}`, "1")
    }
  }, [bannerCompetition, bannerDismissed])

  // Re-evaluate dialog based on current banner competition
  useEffect(() => {
    if (bannerCompetition) {
      const seen = sessionStorage.getItem(`player_tournament_banner_${bannerCompetition.id}`) === "1"
      setBannerDismissed(seen)
    }
  }, [bannerCompetition])

  function markBannerSeen() {
    if (bannerCompetition) {
      sessionStorage.setItem(`player_tournament_banner_${bannerCompetition.id}`, "1")
    }
    setBannerDismissed(true)
  }

  async function handleJoinNow() {
    if (!currentUser || !bannerCompetition) return

    try {
      await joinMutation.mutateAsync({
        competitionId: bannerCompetition.id,
        payload: { user_id: currentUser.id },
      })
      toast.success(`Joined "${bannerCompetition.name}"`)
      markBannerSeen()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to join competition")
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here is your current community and tournament overview.</p>
      </div>

      {bannerCompetition && !bannerDismissed && (
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">New Tournament Available</p>
              <p className="font-medium">{bannerCompetition.name}</p>
              <p className="text-sm text-muted-foreground">
                {bannerCompetition.description || "A tournament is available for players."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleJoinNow} disabled={joinMutation.isPending}>
                Join Now
              </Button>
              <Button variant="outline" asChild onClick={markBannerSeen}>
                <Link href="/player/tournament">View Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Matches</h2>
          <Link href="/player/matches" className="text-sm font-medium text-primary">
            View all
          </Link>
        </div>

        <div className="space-y-3">
          {activeMatches.length > 0 ? (
            activeMatches.map((match) => (
              <Card key={match.id} className={`overflow-hidden shadow-sm ${match.status === "pending" ? "border-amber-200 bg-amber-50/20" : ""}`}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold">{match.opponent}</span>
                      <Badge variant="outline">Round {match.round}</Badge>
                      <Badge className={match.status === "pending" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}>
                        {match.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{match.competition}</p>
                    <p className="text-sm text-muted-foreground">
                      You are playing {match.playerColor}. Deadline: {new Date(match.deadline).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/player/matches/${match.id}`} className="text-sm font-medium text-primary">
                    Open
                  </Link>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 rounded-full bg-muted p-3">
                  <Swords className="size-6 text-muted-foreground" />
                </div>
                <p className="font-medium">No active matches</p>
                <p className="text-sm text-muted-foreground">
                  You do not have any pending or submitted matches right now.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your Stats</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <TrendingUp className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentPlayerStanding?.elo ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">Community ELO</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2">
                  <Medal className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">#{currentPlayerStanding?.rank ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">Community Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <Award className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentPlayerStanding?.wins ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Swords className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingMatches.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top Community Players</h2>
          <Link href="/player/leaderboard" className="text-sm font-medium text-primary">
            Full leaderboard
          </Link>
        </div>

        <Card className="shadow-sm">
          <CardContent className="divide-y p-0">
            {leaderboardPreview.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted font-bold">{entry.rank}</span>
                  <span className="font-medium">{entry.username}</span>
                </div>
                <span className="font-semibold text-muted-foreground">{entry.elo} ELO</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your community rank:</span>
            <span className="font-bold">#{currentPlayerStanding?.rank ?? "-"}</span>
          </div>
          <Link href="/player/leaderboard" className="flex items-center text-sm font-medium text-primary">
            View
            <ChevronRight className="size-4" />
          </Link>
        </div> */}
      </section>

      <section>
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <h2 className="font-semibold">Tournament</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentCompetition
              ? `${currentCompetition.name} is ongoing. Use the Tournament tab to view fixtures, results, standings, and history.`
              : "There is currently no ongoing tournament. Use the Tournament tab to review history and upcoming competitions."}
          </p>
        </div>
      </section>
    </div>
  )
}
