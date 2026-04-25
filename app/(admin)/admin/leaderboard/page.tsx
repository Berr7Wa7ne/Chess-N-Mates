"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlayerIdentity } from "@/components/shared"

interface LeaderboardEntry {
  id: number
  rank: number
  username: string
  elo: number
  points: number
  wins: number
  draws: number
  losses: number
  isActive: boolean
}

const leaderboard: LeaderboardEntry[] = [
  {
    id: 1,
    rank: 1,
    username: "GrandMaster_Alex",
    elo: 2150,
    points: 28.5,
    wins: 12,
    draws: 1,
    losses: 1,
    isActive: true,
  },
  {
    id: 4,
    rank: 2,
    username: "QueenSacrifice",
    elo: 2020,
    points: 26.0,
    wins: 11,
    draws: 0,
    losses: 3,
    isActive: true,
  },
  {
    id: 2,
    rank: 3,
    username: "KnightRider",
    elo: 1920,
    points: 24.5,
    wins: 10,
    draws: 3,
    losses: 1,
    isActive: true,
  },
  {
    id: 5,
    rank: 4,
    username: "RookEndgame",
    elo: 1780,
    points: 22.0,
    wins: 9,
    draws: 1,
    losses: 4,
    isActive: true,
  },
  {
    id: 7,
    rank: 5,
    username: "CastleKing",
    elo: 1880,
    points: 20.5,
    wins: 8,
    draws: 1,
    losses: 5,
    isActive: false,
  },
  {
    id: 6,
    rank: 6,
    username: "BishopPair",
    elo: 1950,
    points: 18.0,
    wins: 7,
    draws: 2,
    losses: 5,
    isActive: true,
  },
  {
    id: 3,
    rank: 7,
    username: "PawnStorm",
    elo: 1850,
    points: 16.5,
    wins: 6,
    draws: 3,
    losses: 5,
    isActive: false,
  },
  {
    id: 8,
    rank: 8,
    username: "EnPassant",
    elo: 1710,
    points: 14.0,
    wins: 5,
    draws: 4,
    losses: 5,
    isActive: true,
  },
]

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <Badge className="bg-amber-400/20 text-amber-700 border-amber-400/30 font-semibold">
          1st
        </Badge>
      )
    case 2:
      return (
        <Badge className="bg-gray-300/30 text-gray-600 border-gray-300/40 font-semibold">
          2nd
        </Badge>
      )
    case 3:
      return (
        <Badge className="bg-orange-400/20 text-orange-700 border-orange-400/30 font-semibold">
          3rd
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="font-medium">
          #{rank}
        </Badge>
      )
  }
}

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          Current standings and rankings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Rankings</CardTitle>
          <CardDescription>
            Overall standings based on tournament performance (active players highlighted)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">W-D-L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow
                  key={entry.rank}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    entry.isActive ? "bg-emerald-500/5" : "opacity-60"
                  }`}
                  onClick={() => {
                    window.location.href = `/admin/players/${entry.id}`
                  }}
                >
                  <TableCell>{getRankBadge(entry.rank)}</TableCell>
                  <TableCell>
                    <PlayerIdentity
                      playerId={entry.id}
                      username={entry.username}
                      elo={entry.elo}
                    />
                  </TableCell>
                  <TableCell>
                    {entry.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{entry.points.toFixed(1)}</TableCell>
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
