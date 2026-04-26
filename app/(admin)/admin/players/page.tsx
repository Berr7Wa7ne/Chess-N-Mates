"use client"

import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ActionMenu, PageHeader, PlayerIdentity, createViewMenuItem } from "@/components/shared"
import { players } from "@/lib/admin-data"

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Active</Badge>
    case "inactive":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Inactive</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getPlatformBadge(platform: string) {
  switch (platform) {
    case "Chess.com":
      return <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-700">Chess.com</Badge>
    case "Lichess":
      return <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700">Lichess</Badge>
    default:
      return <Badge variant="outline">{platform}</Badge>
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Players"
        subtitle="Manage registered players with linked chess profiles."
        action={{ label: "Add Player", icon: <Plus className="size-4" /> }}
      />

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Registered Players</CardTitle>
          <CardDescription>Only members with a chess profile are listed here.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Username</TableHead>
                <TableHead className="w-[16%]">Platform</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[16%]">Active Tournament</TableHead>
                <TableHead className="w-[18%]">Last Active</TableHead>
                <TableHead className="w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <PlayerIdentity playerId={player.id} username={player.username} elo={player.elo} />
                  </TableCell>
                  <TableCell>{getPlatformBadge(player.platform)}</TableCell>
                  <TableCell>{getStatusBadge(player.status)}</TableCell>
                  <TableCell>
                    {player.activeTournament ? (
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(player.lastActiveAt)}</TableCell>
                  <TableCell className="text-right">
                    <ActionMenu items={[createViewMenuItem(`/admin/players/${player.id}`)]} />
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
