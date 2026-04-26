import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { fixtures } from "@/lib/admin-data"

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const fixture = fixtures.find((entry) => entry.id === Number(id))

  if (!fixture) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${fixture.tournament} - Round ${fixture.round}`}
        subtitle="Fixture details stay focused on pairing and schedule state."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Players</CardTitle>
            <CardDescription>Paired players for this scheduled fixture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerIdentity playerId={fixture.playerA.id} username={fixture.playerA.username} elo={fixture.playerA.elo} />
            <div className="text-sm text-muted-foreground">vs</div>
            <PlayerIdentity playerId={fixture.playerB.id} username={fixture.playerB.username} elo={fixture.playerB.elo} />
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Scheduling metadata for this pairing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Tournament</p>
              <p className="mt-1 font-medium">{fixture.tournament}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="mt-1 font-medium">{formatDate(fixture.scheduledDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2">
                <Badge>{fixture.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
