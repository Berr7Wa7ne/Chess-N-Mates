import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PlayerIdentity } from "@/components/shared"
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

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dispute = disputes.find((entry) => entry.id === Number(id))

  if (!dispute) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={`Dispute ${dispute.matchId}`} subtitle="Full complaint text and involved players." />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Reason</CardTitle>
            <CardDescription>This page shows the full dispute text without truncation.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-foreground">{dispute.reason}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>Players involved in this dispute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Raised By</p>
              <PlayerIdentity playerId={dispute.raisedBy.id} username={dispute.raisedBy.username} elo={dispute.raisedBy.elo} />
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Against</p>
              <PlayerIdentity playerId={dispute.opponent.id} username={dispute.opponent.username} elo={dispute.opponent.elo} />
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Status</p>
              {getStatusBadge(dispute.status)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
