"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { notFound } from "next/navigation"
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  getCompetitionById,
  getCompetitionFixtures,
  getCompetitionParticipants,
  getCompetitionResults,
  getCompetitionStandings,
  type CompetitionStatus,
  type CompetitionType,
} from "@/lib/admin-data"

function getTypeBadge(type: CompetitionType) {
  switch (type) {
    case "Swiss":
      return <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700">Swiss</Badge>
    case "Knockout":
      return <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700">Knockout</Badge>
    case "Round Robin":
      return <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700">Round Robin</Badge>
  }
}

function getStatusBadge(status: CompetitionStatus | "eliminated" | "withdrawn") {
  switch (status) {
    case "active":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Active</Badge>
    case "pending":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Pending</Badge>
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
    case "eliminated":
      return <Badge className="border-red-500/20 bg-red-500/10 text-red-600">Eliminated</Badge>
    case "withdrawn":
      return <Badge variant="secondary">Withdrawn</Badge>
  }
}

function formatScore(scoreA: number, scoreB: number) {
  return `${scoreA} - ${scoreB}`
}

interface FixtureGroup {
  round: number
  matches: ReturnType<typeof getCompetitionFixtures>
}

interface ResultGroup {
  round: number
  matches: ReturnType<typeof getCompetitionResults>
}

const truncateUsername = (username: string, maxLength: number = 18) => {
  return username.length > maxLength ? username.substring(0, maxLength - 2) + "..." : username
}

export default function CompetitionDetailPage() {
  const params = useParams()
  const [currentFixtureRound, setCurrentFixtureRound] = useState(0)
  const [currentResultRound, setCurrentResultRound] = useState(0)

  const competition = getCompetitionById(Number(params.id))

  if (!competition) return notFound()

  const participants = getCompetitionParticipants(competition.id)
  const allFixtures = getCompetitionFixtures(competition.id)
  const allResults = getCompetitionResults(competition.id)
  const standings = getCompetitionStandings(competition.id)

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={competition.name}
        subtitle="Competition overview, fixtures, results, standings, and tournament history in one place."
      >
        {competition.status !== "completed" && (
          <Button variant="outline">Generate Fixtures</Button>
        )}
        {competition.status === "completed" && (
          <Button variant="outline" disabled>
            Competition Ended
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Type</CardTitle>
          </CardHeader>
          <CardContent>{getTypeBadge(competition.type)}</CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>{getStatusBadge(competition.status)}</CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Players</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{competition.playerCount}</CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Round Progress</CardTitle>
          </CardHeader>
          <CardContent className="font-medium">
            {competition.currentRound ? `${competition.currentRound} / ${competition.rounds}` : `Starts ${competition.startDate}`}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Competition Summary</CardTitle>
          <CardDescription>
            {competition.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">{competition.startDate}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium">{competition.endDate ?? "Still ongoing"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fixtures / Results</p>
            <p className="font-medium">
              {allFixtures.length} fixtures • {allResults.length} results
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg shadow-sm h-fit">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>Active and historical records stored for this competition.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-hidden max-h-96">
            <div className="overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="w-32 sm:w-auto">
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span className="inline-block truncate text-sm">
                                <PlayerIdentity playerId={participant.id} username={truncateUsername(participant.username)} elo={participant.elo ?? 0} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {participant.username} <span className="ml-1 text-muted-foreground">({participant.elo})</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{getStatusBadge(participant.status)}</TableCell>
                      <TableCell className="text-right font-medium">{participant.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm h-fit">
          <CardHeader>
            <CardTitle>Standings</CardTitle>
            <CardDescription>Tournament standings (separate from community ELO).</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-hidden max-h-96">
            <div className="overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">#{entry.rank}</TableCell>
                      <TableCell className="w-32 sm:w-auto">
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span className="inline-block truncate text-sm">
                                <PlayerIdentity playerId={entry.id} username={truncateUsername(entry.username)} elo={entry.elo} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {entry.username} <span className="ml-1 text-muted-foreground">({entry.elo})</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{entry.points.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
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
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-hidden">
            {fixturesByRound.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No fixtures have been generated yet.</p>
            ) : (
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
                        <TooltipProvider>
                          <div className="flex items-center gap-2 text-nowrap">
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <span className="inline-block truncate text-sm font-medium">{truncateUsername(fixture.playerA.username)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                {fixture.playerA.username} <span className="ml-1 text-muted-foreground">({fixture.playerA.elo})</span>
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <span className="inline-block truncate text-sm font-medium">{truncateUsername(fixture.playerB.username)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                {fixture.playerB.username} <span className="ml-1 text-muted-foreground">({fixture.playerB.elo})</span>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{getStatusBadge(fixture.status === "submitted" ? "active" : fixture.status === "pending" ? "pending" : fixture.status === "completed" ? "completed" : "active")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
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
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-hidden">
            {resultsByRound.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No results recorded yet.</p>
            ) : (
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
                        <TooltipProvider>
                          <div className="flex items-center gap-2 text-nowrap">
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <span className="inline-block truncate text-sm font-medium">{truncateUsername(result.playerA.username)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                {result.playerA.username} <span className="ml-1 text-muted-foreground">({result.playerA.elo})</span>
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <span className="inline-block truncate text-sm font-medium">{truncateUsername(result.playerB.username)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                {result.playerB.username} <span className="ml-1 text-muted-foreground">({result.playerB.elo})</span>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatScore(result.scoreA, result.scoreB)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
