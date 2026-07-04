"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlayerIdentity } from "@/components/shared"
import { leaderboard } from "@/lib/admin-data"

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return <Badge className="border-amber-400/30 bg-amber-400/20 font-semibold text-amber-700">1st</Badge>
    case 2:
      return <Badge className="border-slate-300/40 bg-slate-300/30 font-semibold text-slate-700">2nd</Badge>
    case 3:
      return <Badge className="border-orange-400/30 bg-orange-400/20 font-semibold text-orange-700">3rd</Badge>
    default:
      return <Badge variant="outline">#{rank}</Badge>
  }
}

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">Community standings based on group ELO ratings only.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Community ELO Rankings</CardTitle>
          <CardDescription>
            This leaderboard is intentionally separate from tournament standings and always reflects overall group rankings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">ELO</TableHead>
                <TableHead className="text-right">W-D-L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${entry.isActive ? "" : "opacity-70"}`}
                  onClick={() => {
                    window.location.href = `/admin/players/${entry.id}`
                  }}
                >
                  <TableCell>{getRankBadge(entry.rank)}</TableCell>
                  <TableCell>
                    <PlayerIdentity playerId={String(entry.id)} username={entry.username} elo={entry.elo} />
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
