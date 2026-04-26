"use client"

import { useMemo, useState } from "react"
import { Calendar, Plus } from "lucide-react"
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
import { ActionMenu, PageHeader, PlayerIdentity, createViewMenuItem } from "@/components/shared"
import { fixtures } from "@/lib/admin-data"

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600">Pending</Badge>
    case "ongoing":
      return <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">Ongoing</Badge>
    case "completed":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Completed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function FixturesPage() {
  const [selectedTournament, setSelectedTournament] = useState("all")
  const [selectedRound, setSelectedRound] = useState("all")

  const tournaments = useMemo(() => Array.from(new Set(fixtures.map((fixture) => fixture.tournament))), [])
  const rounds = useMemo(() => Array.from(new Set(fixtures.map((fixture) => fixture.round))), [])

  const filteredFixtures = fixtures.filter((fixture) => {
    const tournamentMatch = selectedTournament === "all" || fixture.tournament === selectedTournament
    const roundMatch = selectedRound === "all" || fixture.round.toString() === selectedRound
    return tournamentMatch && roundMatch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixtures"
        subtitle="Manage scheduling and pairings for upcoming matches."
        action={{ label: "Add Fixture", icon: <Plus className="size-4" /> }}
      />

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Filter Fixtures</CardTitle>
          <CardDescription>Fixtures stay focused on scheduled and ongoing pairings only.</CardDescription>
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
          <CardTitle>Scheduled Fixtures</CardTitle>
          <CardDescription>{filteredFixtures.length} pairings match the current filter.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {filteredFixtures.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Calendar className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No fixtures found</p>
                <p className="text-sm text-muted-foreground">Try adjusting the tournament or round filters.</p>
              </div>
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[24%]">Tournament</TableHead>
                  <TableHead className="w-[8%]">Round</TableHead>
                  <TableHead className="w-[20%]">Player A</TableHead>
                  <TableHead className="w-[20%]">Player B</TableHead>
                  <TableHead className="w-[18%]">Scheduled</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[8%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFixtures.map((fixture) => (
                  <TableRow key={fixture.id}>
                    <TableCell className="font-medium text-muted-foreground">{fixture.tournament}</TableCell>
                    <TableCell>Round {fixture.round}</TableCell>
                    <TableCell>
                      <PlayerIdentity
                        playerId={fixture.playerA.id}
                        username={fixture.playerA.username}
                        elo={fixture.playerA.elo}
                      />
                    </TableCell>
                    <TableCell>
                      <PlayerIdentity
                        playerId={fixture.playerB.id}
                        username={fixture.playerB.username}
                        elo={fixture.playerB.elo}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(fixture.scheduledDate)}</TableCell>
                    <TableCell>{getStatusBadge(fixture.status)}</TableCell>
                    <TableCell className="text-right">
                      <ActionMenu items={[createViewMenuItem(`/admin/fixtures/${fixture.id}`)]} />
                    </TableCell>
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
