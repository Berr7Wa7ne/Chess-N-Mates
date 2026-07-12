"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Download, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MatchesList } from "@/src/components/matches/matches-list"
import { MatchResultDialog } from "@/src/components/matches/match-result-dialog"
import { StandingsModal } from "@/src/components/standings/standings-modal"
import {
  CompetitionStatusBadge,
  TournamentTypeBadge,
} from "@/src/components/competitions/competition-badges"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitionMatches } from "@/src/hooks/useMatches"
import { useCompetitionStandings, useCompetitions } from "@/src/hooks/useCompetitions"
import { useJoinCompetition, useUserRegistrations, useWithdraw } from "@/src/hooks/useParticipants"
import { ApiError } from "@/src/types/api"
import type { Match } from "@/src/types/match"

export default function PlayerTournamentPage() {
  const [currentRound, setCurrentRound] = useState(1)
  const [standingsOpen, setStandingsOpen] = useState(false)
  const [resultDialogMatch, setResultDialogMatch] = useState<Match | null>(null)
  const { currentUser } = useAuth()
  const { data: competitions, isLoading: competitionsLoading } = useCompetitions()
  const joinMutation = useJoinCompetition()
  const withdrawMutation = useWithdraw()
  const { data: userRegisteredIds = [] } = useUserRegistrations(currentUser?.id)
  const userRegisteredSet = useMemo(() => new Set(userRegisteredIds), [userRegisteredIds])

  const currentCompetition = useMemo(() => {
    if (!competitions?.length) return null
    return (
      competitions.find((competition) => competition.competition_status === "active") ??
      competitions.find((competition) => competition.competition_status === "open_registration") ??
      competitions[0]
    )
  }, [competitions])

  const matchesQuery = useCompetitionMatches(currentCompetition?.id ?? '')
  const standingsQuery = useCompetitionStandings(currentCompetition?.id ?? '', !!currentCompetition)
  
  const standings = standingsQuery.data ?? []
  const matches = matchesQuery.data ?? []

  const isRegistered = Boolean(
    currentUser && standings.some((entry) => entry.user_id === currentUser.id)
  )
  const canWithdraw = Boolean(
    currentCompetition &&
      isRegistered &&
      !standingsQuery.isLoading &&
      !["active", "completed"].includes(currentCompetition.competition_status)
  )

  async function handleJoin() {
    if (!currentUser || !currentCompetition) return
    try {
      await joinMutation.mutateAsync({
        competitionId: currentCompetition.id,
        payload: { user_id: currentUser.id },
      })
      toast.success(`Joined "${currentCompetition.name}"`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to join competition")
    }
  }

  async function handleWithdraw() {
    if (!currentUser || !currentCompetition) return
    try {
      await withdrawMutation.mutateAsync({
        competitionId: currentCompetition.id,
        userId: currentUser.id,
        payload: { reason: "User withdrew" },
      })
      toast.success("You have withdrawn from this competition")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to withdraw")
    }
  }

  async function handleJoinCompetition(competitionId: string, competitionName: string) {
    if (!currentUser) return
    try {
      await joinMutation.mutateAsync({
        competitionId,
        payload: { user_id: currentUser.id },
      })
      toast.success(`Joined "${competitionName}"`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to join competition")
    }
  }

  function handleDownloadFixtures() {
    if (matches.length === 0) return
    const csv = [
      ['Round', 'Player A', 'Player B', 'Status', 'Result'].join(','),
      ...matches.map((m) =>
        [
          m.round_number,
          m.player_a?.display_name || m.player_a_id,
          m.is_bye ? 'BYE' : m.player_b?.display_name || m.player_b_id,
          m.match_status,
          m.result_winner || 'Pending',
        ].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentCompetition?.name || 'fixtures'}-fixtures.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Fixtures downloaded')
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tournament</h1>
        <p className="text-muted-foreground">View the ongoing tournament, fixtures, results, standings, and past history.</p>
      </div>

      {/* ── Current Tournament Card ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Ongoing Tournament</CardTitle>
          <CardDescription>Current tournament details appear here first.</CardDescription>
        </CardHeader>
        <CardContent>
          {competitionsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : currentCompetition ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{currentCompetition.name}</h2>
                  <TournamentTypeBadge type={currentCompetition.tournament_type} />
                  <Badge variant="outline">
                    Round {currentCompetition.current_round || currentCompetition.rounds}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {!standingsQuery.isLoading && !isRegistered && (
                    <Button onClick={handleJoin} disabled={joinMutation.isPending}>
                      Join
                    </Button>
                  )}
                  {canWithdraw && (
                    <Button
                      variant="outline"
                      onClick={handleWithdraw}
                      disabled={withdrawMutation.isPending}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentCompetition.description || "No description provided."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ongoing tournament.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Matches & Standings ── */}
      {currentCompetition && matches.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Matches */}
          <MatchesList
            matches={matches}
            currentRound={currentRound}
            onRoundChange={setCurrentRound}
            onViewStandings={() => setStandingsOpen(true)}
            onDownloadAll={handleDownloadFixtures}
            totalRounds={currentCompetition.rounds}
            competitionName={currentCompetition.name}
            renderMatchActions={(match: Match) => {
              if (match.is_bye || match.match_status !== 'pending') return null
              if (!currentUser) return null
              const isParticipant = match.player_a_id === currentUser.id || match.player_b_id === currentUser.id
              if (!isParticipant) return null
              // Hide submit button for future rounds (read-only until admin advances)
              if (match.round_number > (currentCompetition?.current_round || 1)) return null
              return (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7"
                  onClick={() => setResultDialogMatch(match)}
                >
                  Submit Result
                </Button>
              )
            }}
          />

          {/* Standings quick preview */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Standings</CardTitle>
              <CardDescription>Tournament leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              {standingsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : standings.length > 0 ? (
                <div className="space-y-3">
                  {/* Top 3 players */}
                  {standings.slice(0, 3).map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <div>
                          <p className="font-medium">{entry.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.points} pts · {entry.wins}W {entry.draws}D {entry.losses}L
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-bold">{entry.points}</span>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setStandingsOpen(true)}
                  >
                    <Trophy className="size-4" />
                    View Full Standings
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No standings available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tournament History ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Tournament History</CardTitle>
          <CardDescription>All competitions remain available for review here.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Start Date</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitionsLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading competitions...
                  </td>
                </tr>
              )}
              {!competitionsLoading && competitions?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No competitions found.
                  </td>
                </tr>
              )}
              {competitions?.map((competition) => {
                const alreadyJoined = userRegisteredSet.has(competition.id)
                const canJoin = competition.competition_status === "open_registration" && !alreadyJoined
                return (
                  <tr key={competition.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{competition.name}</td>
                    <td className="px-4 py-3">
                      <TournamentTypeBadge type={competition.tournament_type} />
                    </td>
                    <td className="px-4 py-3">
                      <CompetitionStatusBadge status={competition.competition_status} />
                    </td>
                    <td className="px-4 py-3">
                      {competition.start_date
                        ? new Date(competition.start_date).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canJoin ? (
                        <Button
                          size="sm"
                          onClick={() => handleJoinCompetition(competition.id, competition.name)}
                          disabled={joinMutation.isPending}
                        >
                          Join
                        </Button>
                      ) : alreadyJoined ? (
                        <span className="text-xs text-muted-foreground">Joined</span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Standings Modal ── */}
      {currentCompetition && (
        <StandingsModal
          open={standingsOpen}
          onClose={() => setStandingsOpen(false)}
          standings={standings}
          competitionName={currentCompetition.name}
        />
      )}

      {/* ── Match Result Dialog ── */}
      {resultDialogMatch && currentUser && (
        <MatchResultDialog
          open={!!resultDialogMatch}
          onClose={() => setResultDialogMatch(null)}
          match={resultDialogMatch}
          userId={currentUser.id}
        />
      )}
    </div>
  )
}