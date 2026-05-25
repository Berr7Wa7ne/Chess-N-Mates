import { notFound } from "next/navigation"
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const competition = getCompetitionById(Number(id))

  if (!competition) notFound()

  const participants = getCompetitionParticipants(competition.id)
  const fixtures = getCompetitionFixtures(competition.id)
  const results = getCompetitionResults(competition.id)
  const standings = getCompetitionStandings(competition.id)

  return (
    <div className="space-y-6">
      <PageHeader
        title={competition.name}
        subtitle="Competition overview, fixtures, results, standings, and tournament history in one place."
      >
        <Button variant="outline">Generate Fixtures</Button>
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
              {fixtures.length} fixtures • {results.length} results
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Standings</CardTitle>
            <CardDescription>Tournament standings live here, while the main leaderboard stays community-ELO based.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
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
                    <TableCell>
                      <PlayerIdentity playerId={entry.id} username={entry.username} elo={entry.elo} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">{entry.points.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>Active and historical participant records remain stored for this competition.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
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
                    <TableCell>
                      <PlayerIdentity playerId={participant.id} username={participant.username} elo={participant.elo ?? 0} />
                    </TableCell>
                    <TableCell>{getStatusBadge(participant.status)}</TableCell>
                    <TableCell className="text-right font-medium">{participant.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Fixtures</CardTitle>
            <CardDescription>Scheduled and in-progress matches now live inside the competition detail screen.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {fixtures.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No fixtures have been generated yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixtures.map((fixture) => (
                    <TableRow key={fixture.id}>
                      <TableCell>Round {fixture.round}</TableCell>
                      <TableCell className="font-medium">
                        {fixture.playerA.username} vs {fixture.playerB.username}
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
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Completed games are reviewed here instead of a separate results screen.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No results recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>Round {result.round}</TableCell>
                      <TableCell className="font-medium">
                        {result.playerA.username} vs {result.playerB.username}
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
