"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlayerIdentity, ActionMenu } from "@/components/shared"

interface Player {
  id: number
  username: string
  elo: number
  platform: "Chess.com" | "Lichess"
  status: "active" | "inactive"
  activeTournament: boolean
  lastActiveAt: Date
}

const players: Player[] = [
  {
    id: 1,
    username: "GrandMaster_Alex",
    elo: 2150,
    platform: "Chess.com",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 2,
    username: "KnightRider",
    elo: 1920,
    platform: "Lichess",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 3,
    username: "PawnStorm",
    elo: 1850,
    platform: "Chess.com",
    status: "inactive",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 4,
    username: "QueenSacrifice",
    elo: 2020,
    platform: "Lichess",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 5,
    username: "RookEndgame",
    elo: 1780,
    platform: "Chess.com",
    status: "active",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 6,
    username: "BishopPair",
    elo: 1950,
    platform: "Lichess",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 7,
    username: "CastleKing",
    elo: 1880,
    platform: "Chess.com",
    status: "active",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 8,
    username: "EnPassant",
    elo: 1710,
    platform: "Lichess",
    status: "inactive",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
]

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
    case "inactive":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Inactive</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getPlatformBadge(platform: string) {
  switch (platform) {
    case "Chess.com":
      return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Chess.com</Badge>
    case "Lichess":
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20">Lichess</Badge>
    default:
      return <Badge variant="outline">{platform}</Badge>
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return "Just now"
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  } else {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  }
}

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
        <p className="text-muted-foreground">
          Manage registered players with chess profiles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Players</CardTitle>
          <CardDescription>
            Only users who have registered a chess profile are shown here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active Tournament</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <PlayerIdentity
                      playerId={player.id}
                      username={player.username}
                      elo={player.elo}
                    />
                  </TableCell>
                  <TableCell>{getPlatformBadge(player.platform)}</TableCell>
                  <TableCell>{getStatusBadge(player.status)}</TableCell>
                  <TableCell>
                    {player.activeTournament ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(player.lastActiveAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionMenu
                      items={[
                        {
                          label: "View Profile",
                          onClick: () => {},
                        },
                        {
                          label: "Edit",
                          onClick: () => {},
                        },
                        {
                          label: "Deactivate",
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
    </div>
  )
}
