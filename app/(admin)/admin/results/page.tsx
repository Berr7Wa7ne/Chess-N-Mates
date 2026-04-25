"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trophy, Trophy as TrophyIcon } from "lucide-react"
import { PageHeader, PlayerIdentity, TextTruncate } from "@/components/shared"

interface Result {
  id: number
  tournament: string
  round: number
  playerA: {
    id: number
    username: string
    elo: number
  }
  playerB: {
    id: number
    username: string
    elo: number
  }
  winner: "a" | "b" | "draw"
  scoreA: number
  scoreB: number
  datePlayed: Date
}

const results: Result[] = [
  {
    id: 1,
    tournament: "Winter Rapid Tournament",
    round: 1,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 2, username: "KnightRider", elo: 1920 },
    winner: "a",
    scoreA: 1,
    scoreB: 0,
    datePlayed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    tournament: "Winter Rapid Tournament",
    round: 1,
    playerA: { id: 3, username: "PawnStorm", elo: 1850 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    winner: "b",
    scoreA: 0,
    scoreB: 1,
    datePlayed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 3,
    tournament: "Winter Rapid Tournament",
    round: 2,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    winner: "draw",
    scoreA: 0.5,
    scoreB: 0.5,
    datePlayed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 4,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 5, username: "RookEndgame", elo: 1780 },
    playerB: { id: 6, username: "BishopPair", elo: 1950 },
    winner: "b",
    scoreA: 0,
    scoreB: 1,
    datePlayed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 5,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 7, username: "CastleKing", elo: 1880 },
    playerB: { id: 8, username: "EnPassant", elo: 1710 },
    winner: "a",
    scoreA: 1,
    scoreB: 0,
    datePlayed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
]

function getResultBadge(winner: string, playerSide: "a" | "b") {
  if (winner === "draw") {
    return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Draw</Badge>
  }
  const isWinner = winner === playerSide
  return isWinner ? (
    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Win</Badge>
  ) : (
    <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Loss</Badge>
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  })
}

export default function ResultsPage() {
  const [selectedTournament, setSelectedTournament] = useState<string>("all")
  const [selectedRound, setSelectedRound] = useState<string>("all")

  const tournaments = Array.from(new Set(results.map((r) => r.tournament)))
  const rounds = Array.from(new Set(results.map((r) => r.round)))

  const filteredResults = results.filter((result) => {
    const tournamentMatch =
      selectedTournament === "all" || result.tournament === selectedTournament
    const roundMatch = selectedRound === "all" || result.round.toString() === selectedRound
    return tournamentMatch && roundMatch
  })

  // Group by tournament and round
  const groupedResults = filteredResults.reduce(
    (acc, result) => {
      const key = `${result.tournament} - Round ${result.round}`
      if (!acc[key]) acc[key] = []
      acc[key].push(result)
      return acc
    },
    {} as Record<string, Result[]>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Results</h1>
        <p className="text-muted-foreground mt-1">
          View completed matches and tournament outcomes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tournament</label>
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tournaments</SelectItem>
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament} value={tournament}>
                      {tournament}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Round</label>
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rounds</SelectItem>
                  {rounds.map((round) => (
                    <SelectItem key={round} value={round.toString()}>
                      Round {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedResults).length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <TrophyIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold">No results found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedResults).map(([groupName, groupResults]) => (
          <Card key={groupName}>
            <CardHeader>
              <CardTitle className="text-lg">{groupName}</CardTitle>
              <CardDescription>{groupResults.length} matches</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player A</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Player B</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date Played</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <PlayerIdentity
                          playerId={result.playerA.id}
                          username={result.playerA.username}
                          elo={result.playerA.elo}
                        />
                      </TableCell>
                      <TableCell>
                        {getResultBadge(result.winner, "a")}
                      </TableCell>
                      <TableCell>
                        <PlayerIdentity
                          playerId={result.playerB.id}
                          username={result.playerB.username}
                          elo={result.playerB.elo}
                        />
                      </TableCell>
                      <TableCell>
                        {result.scoreA} - {result.scoreB}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(result.datePlayed)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
