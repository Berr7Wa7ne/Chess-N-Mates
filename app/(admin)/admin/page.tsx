import { Users, UserCheck, Trophy, Zap, Scroll, Plus, Eye, Shuffle } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const summaryCards = [
  {
    title: "Total Members",
    value: "2,156",
    description: "+24 this week",
    icon: Users,
  },
  {
    title: "Registered Players",
    value: "1,284",
    description: "59% of members",
    icon: UserCheck,
  },
  {
    title: "Active Competitions",
    value: "8",
    description: "3 starting soon",
    icon: Trophy,
  },
  {
    title: "Pending Fixtures",
    value: "42",
    description: "Round 4 in progress",
    icon: Zap,
  },
]

const recentActivity = [
  {
    id: 1,
    action: "Member joined",
    description: "Alex Johnson joined the WhatsApp group",
    time: "2 minutes ago",
    type: "member",
  },
  {
    id: 2,
    action: "Player registered",
    description: "GrandMaster_Alex registered via Chess.com",
    time: "5 minutes ago",
    type: "player",
  },
  {
    id: 3,
    action: "Result recorded",
    description: "KnightRider vs PawnStorm - Round 3 completed",
    time: "15 minutes ago",
    type: "result",
  },
  {
    id: 4,
    action: "Dispute filed",
    description: "Timeout issue reported in Fixture #2847",
    time: "1 hour ago",
    type: "dispute",
  },
  {
    id: 5,
    action: "Competition started",
    description: "Spring Swiss Championship 2024 began",
    time: "2 hours ago",
    type: "competition",
  },
]

function getActivityBadge(type: string) {
  switch (type) {
    case "member":
      return <Badge variant="outline">Member</Badge>
    case "player":
      return <Badge variant="secondary">Player</Badge>
    case "result":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Result</Badge>
    case "dispute":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Dispute</Badge>
    case "competition":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Competition</Badge>
    default:
      return <Badge variant="outline">Activity</Badge>
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your chess tournament management system
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
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
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your community</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.action}</span>
                      {getActivityBadge(activity.type)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" asChild>
              <Link href="/admin/competitions">
                <Plus className="size-4" />
                Create Competition
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/admin/members">
                <Eye className="size-4" />
                View Members
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/admin/matches">
                <Shuffle className="size-4" />
                Generate Pairings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
