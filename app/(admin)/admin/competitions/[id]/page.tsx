import { notFound } from "next/navigation"
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
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { competitions, participantsByCompetition } from "@/lib/admin-data"

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
    case "eliminated":
      return <Badge className="border-red-500/20 bg-red-500/10 text-red-600">Eliminated</Badge>
    case "withdrawn":
      return <Badge variant="secondary">Withdrawn</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const competition = competitions.find((entry) => entry.id === Number(id))

  if (!competition) notFound()

  const participants = participantsByCompetition[competition.id] ?? []

  return (
    <div className="space-y-6">
      <PageHeader title={competition.name} subtitle="Competition overview and active participant list." />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Type</CardTitle>
          </CardHeader>
          <CardContent>{getTypeBadge(competition.type)}</CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>{getStatusBadge(competition.status)}</CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{competition.playerCount}</CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Start Date</CardTitle>
          </CardHeader>
          <CardContent className="font-medium">{competition.startDate}</CardContent>
        </Card>
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>Player identity stays consistent with the list views.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {participants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No participants registered yet.</p>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[42%]">Player</TableHead>
                  <TableHead className="w-[18%]">Status</TableHead>
                  <TableHead className="w-[16%]">Score</TableHead>
                  <TableHead className="w-[24%]">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <PlayerIdentity
                        playerId={participant.id}
                        username={participant.username}
                        elo={participant.elo ?? 1800}
                      />
                    </TableCell>
                    <TableCell>{getStatusBadge(participant.status)}</TableCell>
                    <TableCell className="font-medium">{participant.score}</TableCell>
                    <TableCell className="text-muted-foreground">{participant.joinedDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
