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
import { Plus, Calendar } from "lucide-react"
import { PageHeader, PlayerIdentity, ActionMenu } from "@/components/shared"

interface Fixture {
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
  scheduledDate: Date
  status: "pending" | "ongoing" | "completed"
}

const fixtures: Fixture[] = [
  {
    id: 1,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 2, username: "KnightRider", elo: 1920 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 2,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 3, username: "PawnStorm", elo: 1850 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 3,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 5, username: "RookEndgame", elo: 1780 },
    playerB: { id: 6, username: "BishopPair", elo: 1950 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 4,
    tournament: "Spring Swiss Championship 2024",
    round: 2,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 5,
    tournament: "Winter Rapid Tournament",
    round: 3,
    playerA: { id: 2, username: "KnightRider", elo: 1920 },
    playerB: { id: 5, username: "RookEndgame", elo: 1780 },
    scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    status: "ongoing",
  },
]

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>
    case "ongoing":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Ongoing</Badge>
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>
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
  const [selectedTournament, setSelectedTournament] = useState<string>("all")
  const [selectedRound, setSelectedRound] = useState<string>("all")

  const tournaments = Array.from(new Set(fixtures.map((f) => f.tournament)))
  const rounds = Array.from(new Set(fixtures.map((f) => f.round)))

  const filteredFixtures = fixtures.filter((fixture) => {
    const tournamentMatch =
      selectedTournament === "all" || fixture.tournament === selectedTournament
    const roundMatch = selectedRound === "all" || fixture.round.toString() === selectedRound
    return tournamentMatch && roundMatch
  })

  // Group by tournament and round
  const groupedFixtures = filteredFixtures.reduce(
    (acc, fixture) => {
      const key = `${fixture.tournament} - Round ${fixture.round}`
      if (!acc[key]) acc[key] = []
      acc[key].push(fixture)
      return acc
    },
    {} as Record<string, Fixture[]>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fixtures</h1>
          <p className="text-muted-foreground mt-1">
            Manage tournament pairings and scheduling
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Fixture
        </Button>
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

      {Object.entries(groupedFixtures).length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold">No fixtures found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters or create new fixtures
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedFixtures).map(([groupName, groupFixtures]) => (
          <Card key={groupName}>
            <CardHeader>
              <CardTitle className="text-lg">{groupName}</CardTitle>
              <CardDescription>{groupFixtures.length} matches</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player A</TableHead>
                    <TableHead>Player B</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupFixtures.map((fixture) => (
                    <TableRow key={fixture.id}>
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
                      <TableCell className="text-muted-foreground">
                        {formatDate(fixture.scheduledDate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(fixture.status)}</TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          items={[
                            {
                              label: "View",
                              onClick: () => {},
                            },
                            {
                              label: "Edit",
                              onClick: () => {},
                            },
                            {
                              label: "Cancel",
                              onClick: () => {},
                              variant: "destructive",
                            },
                          ]}
                        />
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
