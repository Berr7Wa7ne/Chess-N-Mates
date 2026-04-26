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
import {
  ActionMenu,
  PageHeader,
  PlayerIdentity,
  TextTruncate,
  createApproveMenuItem,
  createRejectMenuItem,
  createViewMenuItem,
} from "@/components/shared"
import { disputes } from "@/lib/admin-data"

function getStatusBadge(status: (typeof disputes)[number]["status"]) {
  switch (status) {
    case "open":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Open</Badge>
    case "under_review":
      return <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">Under Review</Badge>
    case "resolved":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Resolved</Badge>
    case "rejected":
      return <Badge variant="secondary">Rejected</Badge>
  }
}

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes"
        subtitle="Review complaints and resolve match issues."
        action={{ label: "Add Dispute", icon: <Plus className="size-4" /> }}
      />

      <Card className="overflow-hidden rounded-[2rem] border-0 shadow-sm">
        <CardHeader>
          <CardTitle>All Disputes</CardTitle>
          <CardDescription>Long-form reasons stay truncated here and expand on the detail page.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14%]">Match Reference</TableHead>
                <TableHead className="w-[18%]">Raised By</TableHead>
                <TableHead className="w-[18%]">Against</TableHead>
                <TableHead className="w-[26%]">Reason</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[10%] text-right">Actions</TableHead>
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
                      elo={dispute.raisedBy.elo}
                    />
                  </TableCell>
                  <TableCell>
                    <PlayerIdentity
                      playerId={dispute.opponent.id}
                      username={dispute.opponent.username}
                      elo={dispute.opponent.elo}
                    />
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    <TextTruncate
                      text={dispute.reason}
                      maxLength={44}
                      maxWidthClassName="max-w-[220px]"
                      className="text-left"
                    />
                  </TableCell>
                  <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                  <TableCell className="text-right">
                    <ActionMenu
                      items={[
                        createViewMenuItem(`/admin/disputes/${dispute.id}`),
                        ...(dispute.status === "open" || dispute.status === "under_review"
                          ? [createApproveMenuItem(() => {}), createRejectMenuItem(() => {})]
                          : []),
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
