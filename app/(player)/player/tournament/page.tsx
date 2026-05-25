import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { competitions, getCompetitionFixtures, getCompetitionResults, getCompetitionStandings, getCurrentCompetition } from "@/lib/admin-data"

const currentCompetition = getCurrentCompetition()
const tournamentHistory = competitions.filter((competition) => competition.status !== "active")

export default function PlayerTournamentPage() {
  const fixtures = currentCompetition ? getCompetitionFixtures(currentCompetition.id) : []
  const results = currentCompetition ? getCompetitionResults(currentCompetition.id) : []
  const standings = currentCompetition ? getCompetitionStandings(currentCompetition.id) : []

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
                <CardTitle>Fixtures</CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
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
                        <TableCell>{fixture.playerA.username} vs {fixture.playerB.username}</TableCell>
                        <TableCell className="capitalize">{fixture.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
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
                        <TableCell>{result.playerA.username} vs {result.playerB.username}</TableCell>
                        <TableCell className="text-right">{result.scoreA} - {result.scoreB}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Standings</CardTitle>
              <CardDescription>Tournament standings are shown here, separate from the main community leaderboard.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
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
        <CardContent className="px-0 sm:px-6">
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
