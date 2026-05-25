import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { currentPlayerId, getLeaderboardEntry, leaderboard } from "@/lib/admin-data"

const currentPlayer = getLeaderboardEntry(currentPlayerId)

export default function PlayerLeaderboardPage() {
  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">Community rankings based on group ELO ratings.</p>
      </div>

      {currentPlayer ? (
        <Card className="border-primary bg-primary/5 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{currentPlayer.username}</span>
                <Badge>You</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Rank #{currentPlayer.rank} • {currentPlayer.elo} ELO
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentPlayer.wins}-{currentPlayer.draws}-{currentPlayer.losses}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Community ELO Table</CardTitle>
          <CardDescription>This table is separate from tournament standings.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">ELO</TableHead>
                <TableHead className="text-right">W-D-L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow key={entry.id} className={entry.id === currentPlayerId ? "bg-primary/5" : ""}>
                  <TableCell className="font-medium">#{entry.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.username}</span>
                      {entry.id === currentPlayerId ? <Badge variant="outline">You</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.isActive ? (
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{entry.elo}</TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.wins}-{entry.draws}-{entry.losses}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
