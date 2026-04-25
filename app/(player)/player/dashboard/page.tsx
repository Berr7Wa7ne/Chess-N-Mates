import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Award,
  ChevronRight,
  Clock,
  Medal,
  Swords,
  TrendingUp,
  Trophy,
} from "lucide-react"

// Mock player stats
const playerStats = {
  rating: 1847,
  matchesPlayed: 42,
  wins: 24,
  losses: 12,
  draws: 6,
  rank: 15,
}

// Mock active matches
const activeMatches = [
  {
    id: "M-001",
    opponent: "KnightRider",
    color: "white",
    round: 4,
    deadline: "2024-03-20T18:00:00",
    status: "pending",
    isUrgent: true,
  },
  {
    id: "M-002",
    opponent: "PawnStorm",
    color: "black",
    round: 4,
    deadline: "2024-03-22T18:00:00",
    status: "pending",
    isUrgent: false,
  },
  {
    id: "M-003",
    opponent: "BishopBlitz",
    color: "white",
    round: 3,
    status: "submitted",
    deadline: "2024-03-15T18:00:00",
    isUrgent: false,
  },
]

// Mock leaderboard preview
const leaderboardPreview = [
  { rank: 1, player: "GrandMaster_Alex", points: 12 },
  { rank: 2, player: "QueenGambit", points: 11 },
  { rank: 3, player: "BishopBlitz", points: 10 },
]

// Mock notifications
const notifications = [
  {
    id: 1,
    message: "Match deadline approaching",
    type: "urgent",
    icon: Clock,
  },
  {
    id: 2,
    message: "1 pending match awaiting your result",
    type: "warning",
    icon: AlertCircle,
  },
]

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-500 text-white shadow-sm">Pending</Badge>
    case "submitted":
      return <Badge className="bg-blue-500 text-white shadow-sm">Submitted</Badge>
    case "completed":
      return <Badge className="bg-emerald-500 text-white shadow-sm">Completed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatDeadline(deadline: string) {
  const date = new Date(deadline)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days < 0) return "Overdue"
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  return `${days} days left`
}

export default function PlayerDashboardPage() {
  const currentPlayerRank = 15
  const pendingMatches = activeMatches.filter(m => m.status === "pending")

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Notifications - Compact alerts */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center gap-3 rounded-xl p-3 ${
                notification.type === "urgent"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <notification.icon className="size-5 shrink-0" />
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active Matches - TOP PRIORITY - Full width cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Matches</h2>
          <Link href="/player/matches" className="text-sm font-medium text-primary">
            View all
          </Link>
        </div>
        
        <div className="space-y-3">
          {pendingMatches.length > 0 ? (
            pendingMatches.map((match) => (
              <Card 
                key={match.id} 
                className={`overflow-hidden shadow-sm transition-shadow hover:shadow-md ${
                  match.isUrgent ? "border-red-200 bg-red-50/30" : ""
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 space-y-1">
                      {/* Opponent name - Large text for readability */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{match.opponent}</span>
                        {match.isUrgent && (
                          <Badge className="bg-red-500 text-white">Urgent</Badge>
                        )}
                      </div>
                      
                      {/* Match details */}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{match.id}</span>
                        <span>•</span>
                        <span>Round {match.round}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {match.color === "white" ? "White" : "Black"}
                        </Badge>
                      </div>
                      
                      {/* Deadline with urgency highlight */}
                      <div className={`flex items-center gap-1.5 text-sm ${
                        match.isUrgent ? "font-medium text-red-600" : "text-muted-foreground"
                      }`}>
                        <Clock className="size-4" />
                        <span>{formatDeadline(match.deadline)}</span>
                      </div>
                    </div>
                    
                    {/* Status badge */}
                    <div className="shrink-0">
                      {getStatusBadge(match.status)}
                    </div>
                  </div>
                  
                  {/* Primary Action - Large tap target */}
                  <div className="border-t bg-muted/30 p-3">
                    <Button 
                      className="h-12 w-full text-base font-semibold shadow-sm" 
                      asChild
                    >
                      <Link href={`/player/matches/${match.id}`}>
                        <Swords className="mr-2 size-5" />
                        Submit Result
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 rounded-full bg-muted p-3">
                  <Swords className="size-6 text-muted-foreground" />
                </div>
                <p className="font-medium">No pending matches</p>
                <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Player Stats - 2x2 Grid */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Your Stats</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <TrendingUp className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{playerStats.rating}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2">
                  <Medal className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">#{playerStats.rank}</p>
                  <p className="text-xs text-muted-foreground">Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <Award className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{playerStats.wins}</p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Swords className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{playerStats.matchesPlayed}</p>
                  <p className="text-xs text-muted-foreground">Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Leaderboard Preview - Compact cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top Players</h2>
          <Link href="/player/leaderboard" className="text-sm font-medium text-primary">
            Full leaderboard
          </Link>
        </div>
        
        <Card className="shadow-sm">
          <CardContent className="divide-y p-0">
            {leaderboardPreview.map((entry) => (
              <div
                key={entry.rank}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                      entry.rank === 1
                        ? "bg-amber-100 text-amber-700"
                        : entry.rank === 2
                        ? "bg-slate-100 text-slate-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <span className="font-medium">{entry.player}</span>
                </div>
                <span className="font-semibold text-muted-foreground">{entry.points} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Your position indicator */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your position:</span>
            <span className="font-bold">#{currentPlayerRank}</span>
          </div>
          <Link href="/player/leaderboard" className="flex items-center text-sm font-medium text-primary">
            View
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
