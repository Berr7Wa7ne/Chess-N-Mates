"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Swords, Filter, ChevronRight } from "lucide-react"

// Mock current matches
const allMatches = [
  {
    id: "M-001",
    opponent: "KnightRider",
    round: 4,
    status: "pending",
    deadline: "2024-03-20T18:00:00",
    isUrgent: true,
    color: "white",
  },
  {
    id: "M-002",
    opponent: "PawnStorm",
    round: 4,
    status: "pending",
    deadline: "2024-03-22T18:00:00",
    isUrgent: false,
    color: "black",
  },
  {
    id: "M-003",
    opponent: "BishopBlitz",
    round: 3,
    status: "submitted",
    deadline: "2024-03-15T18:00:00",
    isUrgent: false,
    color: "white",
  },
  {
    id: "M-004",
    opponent: "QueenGambit",
    round: 3,
    status: "completed",
    deadline: "2024-03-14T18:00:00",
    isUrgent: false,
    color: "black",
    result: "win",
  },
  {
    id: "M-005",
    opponent: "RookieKing",
    round: 2,
    status: "completed",
    deadline: "2024-03-10T18:00:00",
    isUrgent: false,
    color: "white",
    result: "loss",
  },
  {
    id: "M-006",
    opponent: "EndgameExpert",
    round: 2,
    status: "completed",
    deadline: "2024-03-08T18:00:00",
    isUrgent: false,
    color: "black",
    result: "draw",
  },
]

type FilterType = "all" | "pending" | "submitted" | "completed"

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

function getResultBadge(result: string | undefined) {
  if (!result) return null
  switch (result) {
    case "win":
      return <Badge className="bg-emerald-500 text-white">Win</Badge>
    case "loss":
      return <Badge className="bg-red-500 text-white">Loss</Badge>
    case "draw":
      return <Badge className="bg-slate-500 text-white">Draw</Badge>
    default:
      return null
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
  return `${days} days`
}

export default function PlayerMatchesPage() {
  const [filter, setFilter] = useState<FilterType>("all")
  
  const filteredMatches = filter === "all" 
    ? allMatches 
    : allMatches.filter(m => m.status === filter)
  
  const pendingCount = allMatches.filter(m => m.status === "pending").length
  const submittedCount = allMatches.filter(m => m.status === "submitted").length
  const completedCount = allMatches.filter(m => m.status === "completed").length

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Matches</h1>
        <p className="text-muted-foreground">
          {allMatches.length} total matches
        </p>
      </div>

      {/* Filter Tabs - Swipe-friendly */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={() => setFilter("all")}
        >
          <Filter className="mr-1.5 size-4" />
          All ({allMatches.length})
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={() => setFilter("pending")}
        >
          Pending ({pendingCount})
        </Button>
        <Button
          variant={filter === "submitted" ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={() => setFilter("submitted")}
        >
          Submitted ({submittedCount})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={() => setFilter("completed")}
        >
          Completed ({completedCount})
        </Button>
      </div>

      {/* Match Cards - Vertical Stack */}
      <div className="space-y-3">
        {filteredMatches.length > 0 ? (
          filteredMatches.map((match) => (
            <Card 
              key={match.id} 
              className={`overflow-hidden shadow-sm transition-all active:scale-[0.99] ${
                match.isUrgent ? "border-red-200 bg-red-50/30" : ""
              }`}
            >
              <CardContent className="p-0">
                <Link href={`/player/matches/${match.id}`} className="block">
                  <div className="flex items-center gap-4 p-4">
                    {/* Match Icon */}
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                      match.status === "pending" 
                        ? "bg-amber-100" 
                        : match.status === "submitted"
                        ? "bg-blue-100"
                        : "bg-emerald-100"
                    }`}>
                      <Swords className={`size-6 ${
                        match.status === "pending" 
                          ? "text-amber-600" 
                          : match.status === "submitted"
                          ? "text-blue-600"
                          : "text-emerald-600"
                      }`} />
                    </div>
                    
                    {/* Match Info */}
                    <div className="flex-1 min-w-0">
                      {/* Opponent - Large text */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold truncate">{match.opponent}</span>
                        {match.isUrgent && (
                          <Badge className="shrink-0 bg-red-500 text-white text-xs">Urgent</Badge>
                        )}
                      </div>
                      
                      {/* Match details */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span>Round {match.round}</span>
                        <span>•</span>
                        <span className="capitalize">{match.color}</span>
                        {match.status === "pending" && (
                          <>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${match.isUrgent ? "text-red-600 font-medium" : ""}`}>
                              <Clock className="size-3.5" />
                              {formatDeadline(match.deadline)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Status/Result + Arrow */}
                    <div className="flex shrink-0 items-center gap-2">
                      {match.status === "completed" ? (
                        getResultBadge(match.result)
                      ) : (
                        getStatusBadge(match.status)
                      )}
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
                
                {/* Action Button - Only for pending matches */}
                {match.status === "pending" && (
                  <div className="border-t bg-muted/30 p-3">
                    <Button 
                      className="h-11 w-full text-base font-semibold" 
                      asChild
                    >
                      <Link href={`/player/matches/${match.id}`}>
                        Submit Result
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-muted p-4">
                <Swords className="size-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No matches found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === "all" 
                  ? "You don't have any matches yet." 
                  : `No ${filter} matches at the moment.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
