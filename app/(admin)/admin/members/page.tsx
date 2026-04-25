"use client"

import { useState } from "react"
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
import { PlayerIdentity, ActionMenu, TextTruncate } from "@/components/shared"

type MemberStatus = "active" | "inactive" | "removed"

interface Member {
  id: number
  name: string
  phoneNumber: string
  chessUsername?: {
    id: number
    username: string
  }
  status: MemberStatus
  registered: boolean
  lastActiveAt: Date
}

const members: Member[] = [
  {
    id: 1,
    name: "Alex Johnson",
    phoneNumber: "+1 234 567 8901",
    chessUsername: { id: 1, username: "GrandMaster_Alex" },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 2,
    name: "Maria Garcia",
    phoneNumber: "+1 234 567 8902",
    chessUsername: { id: 2, username: "KnightRider" },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 3,
    name: "James Wilson",
    phoneNumber: "+1 234 567 8903",
    chessUsername: undefined,
    status: "inactive",
    registered: false,
    lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 4,
    name: "Sarah Chen",
    phoneNumber: "+1 234 567 8904",
    chessUsername: { id: 4, username: "QueenSacrifice" },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 5,
    name: "Michael Brown",
    phoneNumber: "+1 234 567 8905",
    chessUsername: undefined,
    status: "removed",
    registered: false,
    lastActiveAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 6,
    name: "Emily Davis",
    phoneNumber: "+1 234 567 8906",
    chessUsername: { id: 6, username: "BishopPair" },
    status: "active",
    registered: false,
    lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 7,
    name: "David Lee",
    phoneNumber: "+1 234 567 8907",
    chessUsername: { id: 7, username: "CastleKing" },
    status: "inactive",
    registered: true,
    lastActiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 8,
    name: "Lisa Martinez",
    phoneNumber: "+1 234 567 8908",
    chessUsername: { id: 8, username: "EnPassant" },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 30 * 60 * 1000),
  },
]

function getStatusBadge(status: MemberStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
    case "inactive":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Inactive</Badge>
    case "removed":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Removed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
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

type FilterType = "all" | "active" | "inactive" | "removed"

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Members" },
  { value: "active", label: "Active Members" },
  { value: "inactive", label: "Inactive Members" },
  { value: "removed", label: "Removed Members" },
]

export default function MembersPage() {
  const [filter, setFilter] = useState<FilterType>("all")

  const filteredMembers = members.filter((member) => {
    if (filter === "all") return true
    return member.status === filter
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          View and manage all group members
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Members</CardTitle>
              <CardDescription>
                A list of all group members (not just registered players)
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Chess Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <TextTruncate text={member.phoneNumber} maxLength={20} />
                  </TableCell>
                  <TableCell>
                    {member.chessUsername ? (
                      <PlayerIdentity
                        playerId={member.chessUsername.id}
                        username={member.chessUsername.username}
                        elo={1800}
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell>
                    {member.registered ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(member.lastActiveAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionMenu
                      items={[
                        {
                          label: "View",
                          onClick: () => {},
                        },
                        member.status === "active" && {
                          label: "Mark Inactive",
                          onClick: () => {},
                        },
                        {
                          label: "Remove",
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
