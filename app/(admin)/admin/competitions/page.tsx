"use client"

import { useState } from "react"
import { ArrowLeft, Users } from "lucide-react"
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
import { PlayerIdentity, ActionMenu } from "@/components/shared"

interface Competition {
  id: number
  name: string
  type: "Swiss" | "Knockout" | "Round Robin"
  status: "active" | "pending" | "completed"
  playerCount: number
  startDate: string
}

interface Participant {
  id: number
  username: string
  elo?: number
  status: "active" | "eliminated" | "withdrawn"
  score: number
  joinedDate: string
}

const competitions: Competition[] = [
  {
    id: 1,
    name: "Spring Swiss Championship 2024",
    type: "Swiss",
    status: "active",
    playerCount: 64,
    startDate: "2024-02-15",
  },
  {
    id: 2,
    name: "Winter Knockout Tournament",
    type: "Knockout",
    status: "active",
    playerCount: 32,
    startDate: "2024-02-10",
  },
  {
    id: 3,
    name: "February Round Robin",
    type: "Round Robin",
    status: "pending",
    playerCount: 8,
    startDate: "2024-02-20",
  },
  {
    id: 4,
    name: "Blitz Championship",
    type: "Swiss",
    status: "completed",
    playerCount: 128,
    startDate: "2024-01-25",
  },
  {
    id: 5,
    name: "Rapid Masters Cup",
    type: "Knockout",
    status: "active",
    playerCount: 16,
    startDate: "2024-02-12",
  },
  {
    id: 6,
    name: "Club Championship 2024",
    type: "Round Robin",
    status: "pending",
    playerCount: 12,
    startDate: "2024-03-01",
  },
]

const participantsData: Record<number, Participant[]> = {
  1: [
    { id: 1, username: "GrandMaster_Alex", elo: 2150, status: "active", score: 4.5, joinedDate: "2024-02-14" },
    { id: 2, username: "KnightRider", elo: 1920, status: "active", score: 4.0, joinedDate: "2024-02-14" },
    { id: 4, username: "QueenSacrifice", elo: 2020, status: "active", score: 3.5, joinedDate: "2024-02-15" },
    { id: 6, username: "BishopPair", elo: 1950, status: "active", score: 3.0, joinedDate: "2024-02-15" },
    { id: 5, username: "RookEndgame", elo: 1780, status: "withdrawn", score: 2.0, joinedDate: "2024-02-14" },
  ],
  2: [
    { id: 1, username: "GrandMaster_Alex", elo: 2150, status: "active", score: 3, joinedDate: "2024-02-09" },
    { id: 7, username: "CastleKing", elo: 1880, status: "eliminated", score: 2, joinedDate: "2024-02-09" },
    { id: 3, username: "PawnStorm", elo: 1850, status: "eliminated", score: 1, joinedDate: "2024-02-10" },
  ],
}

function getTypeBadge(type: string) {
  switch (type) {
    case "Swiss":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">Swiss</Badge>
    case "Knockout":
      return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">Knockout</Badge>
    case "Round Robin":
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20">Round Robin</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
    case "pending":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
    case "eliminated":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Eliminated</Badge>
    case "withdrawn":
      return <Badge variant="secondary">Withdrawn</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function CompetitionsPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)

  if (selectedCompetition) {
    const participants = participantsData[selectedCompetition.id] || []

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCompetition(null)}
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{selectedCompetition.name}</h1>
            <p className="text-muted-foreground">
              Competition details and participants
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Type</CardTitle>
            </CardHeader>
            <CardContent>{getTypeBadge(selectedCompetition.type)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>{getStatusBadge(selectedCompetition.status)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-lg font-semibold">{selectedCompetition.playerCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Start Date</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-lg font-semibold">{selectedCompetition.startDate}</span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>
              Players registered in this tournament only
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Joined Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <PlayerIdentity
                          playerId={participant.id}
                          username={participant.username}
                          elo={participant.elo || 1800}
                        />
                      </TableCell>
                      <TableCell>{getStatusBadge(participant.status)}</TableCell>
                      <TableCell className="font-semibold">{participant.score}</TableCell>
                      <TableCell className="text-muted-foreground">{participant.joinedDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No participants registered yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Competitions</h1>
        <p className="text-muted-foreground">
          Manage your chess tournaments and competitions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Competitions</CardTitle>
          <CardDescription>
            View and manage all tournaments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitions.map((competition) => (
                <TableRow key={competition.id}>
                  <TableCell className="font-medium">{competition.name}</TableCell>
                  <TableCell>{getTypeBadge(competition.type)}</TableCell>
                  <TableCell>{getStatusBadge(competition.status)}</TableCell>
                  <TableCell>{competition.playerCount}</TableCell>
                  <TableCell>{competition.startDate}</TableCell>
                  <TableCell className="text-right">
                    <ActionMenu
                      items={[
                        {
                          label: "View Details",
                          onClick: () => setSelectedCompetition(competition),
                        },
                        competition.status === "pending" && {
                          label: "Start Tournament",
                          onClick: () => {},
                        },
                        competition.status === "active" && {
                          label: "End Tournament",
                          onClick: () => {},
                        },
                        {
                          label: "Edit",
                          onClick: () => {},
                        },
                      ].filter(Boolean) as any}
                    />
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
