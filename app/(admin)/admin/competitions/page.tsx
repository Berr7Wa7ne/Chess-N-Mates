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
import { ActionMenu, PageHeader, TextTruncate, createViewMenuItem } from "@/components/shared"
import { competitions } from "@/lib/admin-data"

function getTypeBadge(type: string) {
  switch (type) {
    case "Swiss":
      return <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700">Swiss</Badge>
    case "Knockout":
      return <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700">Knockout</Badge>
    case "Round Robin":
      return <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700">Round Robin</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Active</Badge>
    case "pending":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Pending</Badge>
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function CompetitionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitions"
        subtitle="Manage tournaments and competition lifecycle."
        action={{ label: "Add Competition", icon: <Plus className="size-4" /> }}
      />

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>All Competitions</CardTitle>
          <CardDescription>View tournament formats, start dates, and current status.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32%]">Name</TableHead>
                <TableHead className="w-[16%]">Type</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[12%]">Players</TableHead>
                <TableHead className="w-[18%]">Start Date</TableHead>
                <TableHead className="w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitions.map((competition) => (
                <TableRow key={competition.id}>
                  <TableCell className="font-medium">
                    <TextTruncate text={competition.name} maxLength={34} maxWidthClassName="max-w-[240px]" />
                  </TableCell>
                  <TableCell>{getTypeBadge(competition.type)}</TableCell>
                  <TableCell>{getStatusBadge(competition.status)}</TableCell>
                  <TableCell>{competition.playerCount}</TableCell>
                  <TableCell className="text-muted-foreground">{competition.startDate}</TableCell>
                  <TableCell className="text-right">
                    <ActionMenu items={[createViewMenuItem(`/admin/competitions/${competition.id}`)]} />
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
