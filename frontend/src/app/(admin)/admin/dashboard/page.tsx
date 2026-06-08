import Link from "next/link"
import { AlertTriangle, Eye, Plus, Trophy, Users, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { competitions, disputes, getCurrentCompetition, leaderboard, members } from "@/lib/admin-data"

const currentCompetition = getCurrentCompetition()

const summaryCards = [
  {
    title: "Total Members",
    value: members.length.toString(),
    description: `${members.filter((member) => member.status === "active").length} active members`,
    icon: Users,
  },
  {
    title: "Community Leaderboard",
    value: leaderboard.length.toString(),
    description: "Ranked by group ELO",
    icon: Trophy,
  },
  {
    title: "Competitions",
    value: competitions.length.toString(),
    description: `${competitions.filter((competition) => competition.status === "completed").length} completed`,
    icon: Trophy,
  },
  {
    title: "Open Disputes",
    value: disputes.filter((dispute) => dispute.status === "open").length.toString(),
    description: "Awaiting admin review",
    icon: AlertTriangle,
  },
]

const recentActivity = [
  {
    id: 1,
    action: "Member joined",
    description: "Alex Johnson joined the community and completed onboarding.",
    time: "2 minutes ago",
    type: "member",
  },
  {
    id: 2,
    action: "Competition updated",
    description: "Round 4 fixtures were generated for Spring Swiss Championship 2026.",
    time: "15 minutes ago",
    type: "competition",
  },
  {
    id: 3,
    action: "Result recorded",
    description: "CastleKing vs EnPassant was submitted and is waiting for confirmation.",
    time: "40 minutes ago",
    type: "result",
  },
  {
    id: 4,
    action: "Dispute filed",
    description: "KnightRider flagged a disconnect issue during result submission.",
    time: "1 hour ago",
    type: "dispute",
  },
]

function getActivityBadge(type: string) {
  switch (type) {
    case "member":
      return <Badge variant="outline">Member</Badge>
    case "result":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Result</Badge>
    case "dispute":
      return <Badge className="border-red-500/20 bg-red-500/10 text-red-600">Dispute</Badge>
    case "competition":
      return <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">Competition</Badge>
    default:
      return <Badge variant="outline">Activity</Badge>
  }
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of the chess community and tournament activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your community.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.action}</span>
                      {getActivityBadge(activity.type)}
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Focus the admin team on the core community workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-2" asChild>
                <Link href="/admin/competitions">
                  <Plus className="size-4" />
                  Create Competition
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/admin/competitions">
                  <Zap className="size-4" />
                  Manage Competitions
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/admin/members">
                  <Eye className="size-4" />
                  View Members
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ongoing Tournament</CardTitle>
              <CardDescription>The competitions screen now owns fixtures and results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentCompetition ? (
                <>
                  <div>
                    <p className="font-medium">{currentCompetition.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentCompetition.type} • Round {currentCompetition.currentRound} of {currentCompetition.rounds}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/admin/competitions/${currentCompetition.id}`}>Open competition</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No ongoing tournament.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
