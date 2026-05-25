"use client"

import { useMemo, useState } from "react"
import { Info, Plus } from "lucide-react"
import { ActionMenu, PageHeader, PlayerIdentity, TextTruncate, createViewMenuItem } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { members, type MemberStatus } from "@/lib/admin-data"

function getStatusBadge(status: MemberStatus) {
  switch (status) {
    case "active":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Active</Badge>
    case "inactive":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Inactive</Badge>
    case "removed":
      return <Badge className="border-red-500/20 bg-red-500/10 text-red-600">Removed</Badge>
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

type FilterType = "all" | MemberStatus

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Members" },
  { value: "active", label: "Active Members" },
  { value: "inactive", label: "Inactive Members" },
  { value: "removed", label: "Removed Members" },
]

export default function MembersPage() {
  const [filter, setFilter] = useState<FilterType>("all")

  const filteredMembers = useMemo(() => {
    return members.filter((member) => (filter === "all" ? true : member.status === filter))
  }, [filter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle="View and manage all community members."
        action={{ label: "Add Member", icon: <Plus className="size-4" /> }}
      />

      <Card className="rounded-lg border-blue-200 bg-blue-50/60 shadow-sm">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 size-5 text-blue-700" />
          <div className="space-y-1 text-sm text-blue-900">
            <p className="font-medium">Removed members keep their historical records.</p>
            <p>
              If a removed member returns later, they should complete the normal onboarding flow again as a new member,
              while their previous history remains preserved for admin reference.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Members</CardTitle>
              <CardDescription>A list of all community members, whether registered or not.</CardDescription>
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
        <CardContent className="px-0 sm:px-6">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%]">Name</TableHead>
                <TableHead className="w-[16%]">Phone Number</TableHead>
                <TableHead className="w-[22%]">Chess Username</TableHead>
                <TableHead className="w-[12%]">Status</TableHead>
                <TableHead className="w-[12%]">Registered</TableHead>
                <TableHead className="w-[14%]">Last Active</TableHead>
                <TableHead className="w-[6%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <TextTruncate text={member.phoneNumber} maxLength={20} maxWidthClassName="max-w-[160px]" />
                  </TableCell>
                  <TableCell>
                    {member.chessUsername ? (
                      <PlayerIdentity
                        playerId={member.chessUsername.id}
                        username={member.chessUsername.username}
                        elo={member.chessUsername.elo}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell>
                    {member.registered ? (
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(member.lastActiveAt)}</TableCell>
                  <TableCell className="text-right">
                    <ActionMenu items={[createViewMenuItem(`/admin/members/${member.id}`)]} />
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
