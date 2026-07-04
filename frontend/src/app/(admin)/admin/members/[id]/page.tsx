import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { members } from "@/lib/admin-data"

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

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const member = members.find((entry) => entry.id === Number(id))

  if (!member) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={member.name} subtitle="Member details and registration status." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Core identity and player linkage for this member.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="mt-1 font-medium">{member.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2">
                <Badge variant={member.status === "removed" ? "destructive" : "secondary"}>{member.status}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Registered</p>
              <p className="mt-1 font-medium">{member.registered ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Active</p>
              <p className="mt-1 font-medium">{formatRelativeTime(member.lastActiveAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Chess Identity</CardTitle>
            <CardDescription>Linked player information appears here when available.</CardDescription>
          </CardHeader>
          <CardContent>
            {member.chessUsername ? (
              <PlayerIdentity
                playerId={String(member.chessUsername.id)}
                username={member.chessUsername.username}
                elo={member.chessUsername.elo}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No chess profile linked yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
