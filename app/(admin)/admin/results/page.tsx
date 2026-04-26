"use client"

import { useMemo, useState } from "react"
import { Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { results } from "@/lib/admin-data"

function getResultBadge(winner: string, playerSide: "a" | "b") {
  if (winner === "draw") {
    return <Badge className="border-slate-500/20 bg-slate-500/10 text-slate-600">Draw</Badge>
  }

  return winner === playerSide ? (
    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Win</Badge>
  ) : (
    <Badge className="border-red-500/20 bg-red-500/10 text-red-600">Loss</Badge>
  )
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  })
}

export default function ResultsPage() {
  const [selectedTournament, setSelectedTournament] = useState("all")
  const [selectedRound, setSelectedRound] = useState("all")

  const tournaments = useMemo(() => Array.from(new Set(results.map((result) => result.tournament))), [])
  const rounds = useMemo(() => Array.from(new Set(results.map((result) => result.round))), [])

  const filteredResults = results.filter((result) => {
    const tournamentMatch = selectedTournament === "all" || result.tournament === selectedTournament
    const roundMatch = selectedRound === "all" || result.round.toString() === selectedRound
    return tournamentMatch && roundMatch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        subtitle="Review completed matches and final outcomes without mixing them into fixtures."
      />

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
          <CardDescription>Results are separated from scheduling so completed matches remain easier to scan.</CardDescription>
        </CardHeader>
        <CardContent>
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

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Completed Matches</CardTitle>
          <CardDescription>{filteredResults.length} results are visible with the selected filters.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Trophy className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No results found</p>
                <p className="text-sm text-muted-foreground">Try adjusting the tournament or round filters.</p>
              </div>
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[24%]">Tournament</TableHead>
                  <TableHead className="w-[8%]">Round</TableHead>
                  <TableHead className="w-[18%]">Player A</TableHead>
                  <TableHead className="w-[10%]">Result</TableHead>
                  <TableHead className="w-[18%]">Player B</TableHead>
                  <TableHead className="w-[10%]">Score</TableHead>
                  <TableHead className="w-[12%]">Played</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium text-muted-foreground">{result.tournament}</TableCell>
                    <TableCell>Round {result.round}</TableCell>
                    <TableCell>
                      <PlayerIdentity playerId={result.playerA.id} username={result.playerA.username} elo={result.playerA.elo} />
                    </TableCell>
                    <TableCell>{getResultBadge(result.winner, "a")}</TableCell>
                    <TableCell>
                      <PlayerIdentity playerId={result.playerB.id} username={result.playerB.username} elo={result.playerB.elo} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {result.scoreA} - {result.scoreB}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(result.datePlayed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
