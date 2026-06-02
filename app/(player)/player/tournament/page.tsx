"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { competitions, getCompetitionFixtures, getCompetitionResults, getCompetitionStandings, getCurrentCompetition } from "@/lib/admin-data"
import { ChevronLeft, ChevronRight } from "lucide-react"

const currentCompetition = getCurrentCompetition()
const tournamentHistory = competitions.filter((competition) => competition.status !== "active")

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
  
  const allFixtures = currentCompetition ? getCompetitionFixtures(currentCompetition.id) : []
  const allResults = currentCompetition ? getCompetitionResults(currentCompetition.id) : []
  const standings = currentCompetition ? getCompetitionStandings(currentCompetition.id) : []

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
          {currentCompetition ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{currentCompetition.name}</h2>
                <Badge>{currentCompetition.type}</Badge>
                <Badge variant="outline">Round {currentCompetition.currentRound}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{currentCompetition.description}</p>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>#{entry.rank}</TableCell>
                      <TableCell>{entry.username}</TableCell>
                      <TableCell className="text-right">{entry.points.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Past Tournament History</CardTitle>
          <CardDescription>Past and upcoming competitions remain available for review here.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournamentHistory.map((competition) => (
                <TableRow key={competition.id}>
                  <TableCell className="font-medium">{competition.name}</TableCell>
                  <TableCell>{competition.type}</TableCell>
                  <TableCell className="capitalize">{competition.status}</TableCell>
                  <TableCell>{competition.startDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
