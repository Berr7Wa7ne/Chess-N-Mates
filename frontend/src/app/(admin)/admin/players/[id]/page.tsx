import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { leaderboard, players } from "@/lib/admin-data"

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

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const player = players.find((entry) => entry.id === Number(id))

  if (!player) notFound()

  const standing = leaderboard.find((entry) => entry.id === player.id)

  return (
    <div className="space-y-6">
      <PageHeader title={player.username} subtitle="Player profile, activity, and current community leaderboard standing." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Player Overview</CardTitle>
            <CardDescription>Shared player identity is reused here exactly as it appears in tables and lists.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <PlayerIdentity playerId={String(player.id)} username={player.username} elo={player.elo} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Platform</p>
                <p className="mt-1 font-medium">{player.platform}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-2">
                  <Badge className={player.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-amber-500/20 bg-amber-500/10 text-amber-600"}>
                    {player.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Tournament</p>
                <p className="mt-1 font-medium">{player.activeTournament ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Active</p>
                <p className="mt-1 font-medium">{formatRelativeTime(player.lastActiveAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Community Leaderboard Snapshot</CardTitle>
            <CardDescription>Quick community ELO standing context for this player.</CardDescription>
          </CardHeader>
          <CardContent>
            {standing ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <p className="mt-1 text-2xl font-semibold">#{standing.rank}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="mt-1 text-2xl font-semibold">{standing.points.toFixed(1)}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Record: {standing.wins} wins, {standing.draws} draws, {standing.losses} losses.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This player does not have a current leaderboard entry.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
