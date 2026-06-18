"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCompetitionFixtures, getCompetitionResults } from "@/lib/admin-data"
import {
  CompetitionStatusBadge,
  TournamentTypeBadge,
} from "@/src/components/competitions/competition-badges"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitionStandings, useCompetitions } from "@/src/hooks/useCompetitions"
import { useJoinCompetition, useUserRegistrations, useWithdraw } from "@/src/hooks/useParticipants"
import { ApiError } from "@/src/types/api"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface FixtureGroup {
  round: number
  matches: ReturnType<typeof getCompetitionFixtures>
}

interface ResultGroup {
  round: number
  matches: ReturnType<typeof getCompetitionResults>
}

const truncateUsername = (username: string, maxLength: number = 15) => {
  return username.length > maxLength ? username.substring(0, maxLength - 2) + "..." : username
}

function MatchupDisplay({ playerA, playerB }: { playerA: any; playerB: any }) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-nowrap">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-block truncate text-sm font-medium">{truncateUsername(playerA.username)}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {playerA.username} <span className="ml-1 text-muted-foreground">({playerA.elo})</span>
          </TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground">vs</span>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-block truncate text-sm font-medium">{truncateUsername(playerB.username)}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {playerB.username} <span className="ml-1 text-muted-foreground">({playerB.elo})</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export default function PlayerTournamentPage() {
  const [currentFixtureRound, setCurrentFixtureRound] = useState(0)
  const [currentResultRound, setCurrentResultRound] = useState(0)
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

  const standingsQuery = useCompetitionStandings(currentCompetition?.id ?? '', !!currentCompetition)
  const standings = standingsQuery.data ?? []
  const isRegistered = Boolean(
    currentUser && standings.some((entry) => entry.user_id === currentUser.id)
  )
  const canWithdraw = Boolean(
    currentCompetition &&
      isRegistered &&
      !standingsQuery.isLoading &&
      !["active", "completed"].includes(currentCompetition.competition_status)
  )
  
  const allFixtures = currentCompetition ? getCompetitionFixtures(currentCompetition.id) : []
  const allResults = currentCompetition ? getCompetitionResults(currentCompetition.id) : []

  // Group fixtures by round
  const fixturesByRound: FixtureGroup[] = []
  allFixtures.forEach((fixture) => {
    const existingRound = fixturesByRound.find((g) => g.round === fixture.round)
    if (existingRound) {
      existingRound.matches.push(fixture)
    } else {
      fixturesByRound.push({ round: fixture.round, matches: [fixture] })
    }
  })
  fixturesByRound.sort((a, b) => a.round - b.round)

  // Group results by round
  const resultsByRound: ResultGroup[] = []
  allResults.forEach((result) => {
    const existingRound = resultsByRound.find((g) => g.round === result.round)
    if (existingRound) {
      existingRound.matches.push(result)
    } else {
      resultsByRound.push({ round: result.round, matches: [result] })
    }
  })
  resultsByRound.sort((a, b) => a.round - b.round)

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

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tournament</h1>
        <p className="text-muted-foreground">View the ongoing tournament, fixtures, results, standings, and past history.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Ongoing Tournament</CardTitle>
          <CardDescription>Current tournament details appear here first.</CardDescription>
        </CardHeader>
        <CardContent>
          {competitionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading tournament...</p>
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

      {currentCompetition ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Fixtures</CardTitle>
                    <CardDescription>Round {fixturesByRound[currentFixtureRound]?.round || "-"}</CardDescription>
                  </div>
                  {fixturesByRound.length > 1 && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentFixtureRound((r) => (r - 1 + fixturesByRound.length) % fixturesByRound.length)}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentFixtureRound((r) => (r + 1) % fixturesByRound.length)}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-6 overflow-hidden">
                {fixturesByRound.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Match</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixturesByRound[currentFixtureRound]?.matches.map((fixture) => (
                        <TableRow key={fixture.id}>
                          <TableCell className="font-medium">
                            <MatchupDisplay playerA={fixture.playerA} playerB={fixture.playerB} />
                          </TableCell>
                          <TableCell className="capitalize">{fixture.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No fixtures have been generated yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>Round {resultsByRound[currentResultRound]?.round || "-"}</CardDescription>
                  </div>
                  {resultsByRound.length > 1 && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentResultRound((r) => (r - 1 + resultsByRound.length) % resultsByRound.length)}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentResultRound((r) => (r + 1) % resultsByRound.length)}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-6 overflow-hidden">
                {resultsByRound.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Match</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByRound[currentResultRound]?.matches.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">
                            <MatchupDisplay playerA={result.playerA} playerB={result.playerB} />
                          </TableCell>
                          <TableCell className="text-right font-mono">{result.scoreA} - {result.scoreB}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No results recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Standings</CardTitle>
              <CardDescription>Tournament standings are shown here, separate from the main community leaderboard.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-hidden">
              {standingsQuery.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading standings...</p>
              ) : standings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">W / D / L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((entry) => (
                      <TableRow key={entry.user_id}>
                        <TableCell>#{entry.rank}</TableCell>
                        <TableCell>{entry.display_name}</TableCell>
                        <TableCell className="text-right">{entry.score}</TableCell>
                        <TableCell className="text-right">
                          {entry.wins} / {entry.draws} / {entry.losses}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No standings available yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Tournament History</CardTitle>
          <CardDescription>All competitions remain available for review here.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitionsLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading competitions...
                  </TableCell>
                </TableRow>
              )}
              {!competitionsLoading && competitions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No competitions found.
                  </TableCell>
                </TableRow>
              )}
              {competitions?.map((competition) => {
                const alreadyJoined = userRegisteredSet.has(competition.id)
                const canJoin = competition.competition_status === "open_registration" && !alreadyJoined
                return (
                  <TableRow key={competition.id}>
                    <TableCell className="font-medium">{competition.name}</TableCell>
                    <TableCell>
                      <TournamentTypeBadge type={competition.tournament_type} />
                    </TableCell>
                    <TableCell>
                      <CompetitionStatusBadge status={competition.competition_status} />
                    </TableCell>
                    <TableCell>
                      {competition.start_date
                        ? new Date(competition.start_date).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}