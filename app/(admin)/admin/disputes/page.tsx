"use client"

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
import { PlayerIdentity, ActionMenu, TextTruncate } from "@/components/shared"

interface Dispute {
  id: number
  matchId: string
  raisedBy: {
    id: number
    username: string
  }
  opponent: {
    id: number
    username: string
  }
  reason: string
  status: "open" | "under_review" | "resolved" | "rejected"
}

const disputes: Dispute[] = [
  {
    id: 1,
    matchId: "M-2847",
    raisedBy: { id: 2, username: "KnightRider" },
    opponent: { id: 3, username: "PawnStorm" },
    reason: "Opponent disconnected during winning position",
    status: "open",
  },
  {
    id: 2,
    matchId: "M-2839",
    raisedBy: { id: 3, username: "PawnStorm" },
    opponent: { id: 1, username: "GrandMaster_Alex" },
    reason: "Server lag caused timeout loss",
    status: "open",
  },
  {
    id: 3,
    matchId: "M-2835",
    raisedBy: { id: 6, username: "BishopPair" },
    opponent: { id: 8, username: "EnPassant" },
    reason: "Suspected use of engine assistance during critical moments in the middlegame",
    status: "under_review",
  },
  {
    id: 4,
    matchId: "M-2830",
    raisedBy: { id: 8, username: "EnPassant" },
    opponent: { id: 7, username: "CastleKing" },
    reason: "Result incorrectly recorded",
    status: "resolved",
  },
  {
    id: 5,
    matchId: "M-2825",
    raisedBy: { id: 4, username: "QueenSacrifice" },
    opponent: { id: 5, username: "RookEndgame" },
    reason: "Opponent left match early without completing",
    status: "rejected",
  },
  {
    id: 6,
    matchId: "M-2820",
    raisedBy: { id: 5, username: "RookEndgame" },
    opponent: { id: 6, username: "BishopPair" },
    reason: "Technical issue during game preventing normal play",
    status: "open",
  },
]

function getStatusBadge(status: Dispute["status"]) {
  switch (status) {
    case "open":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Open</Badge>
    case "under_review":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Under Review</Badge>
    case "resolved":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Resolved</Badge>
    case "rejected":
      return <Badge variant="secondary">Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Disputes</h1>
        <p className="text-muted-foreground">
          Review and resolve player disputes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Disputes</CardTitle>
          <CardDescription>
            Handle player complaints and match issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match Reference</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead>Against</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell className="font-mono text-sm">{dispute.matchId}</TableCell>
                  <TableCell>
                    <PlayerIdentity
                      playerId={dispute.raisedBy.id}
                      username={dispute.raisedBy.username}
                      elo={1800}
                    />
                  </TableCell>
                  <TableCell>
                    <PlayerIdentity
                      playerId={dispute.opponent.id}
                      username={dispute.opponent.username}
                      elo={1850}
                    />
                  </TableCell>
                  <TableCell>
                    <TextTruncate text={dispute.reason} maxLength={50} />
                  </TableCell>
                  <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                  <TableCell className="text-right">
                    <ActionMenu
                      items={[
                        {
                          label: "View Details",
                          onClick: () => {},
                        },
                        (dispute.status === "open" || dispute.status === "under_review") && {
                          label: "Approve",
                          onClick: () => {},
                        },
                        (dispute.status === "open" || dispute.status === "under_review") && {
                          label: "Reject",
                          onClick: () => {},
                          variant: "destructive",
                          separator: true,
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
