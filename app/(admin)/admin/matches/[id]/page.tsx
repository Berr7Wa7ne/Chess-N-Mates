"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchDetails, type MatchData } from "@/components/match"

// Mock match data - in production, fetch based on ID
const mockMatches: Record<string, MatchData> = {
  "M-001": {
    id: "M-001",
    opponent: "KnightRider",
    playerColor: "white",
    round: 4,
    status: "submitted",
    deadline: "2024-03-20T18:00:00",
    gameLink: "https://chess.com/game/12345678",
  },
  "M-002": {
    id: "M-002",
    opponent: "PawnStorm",
    playerColor: "black",
    round: 4,
    status: "disputed",
    deadline: "2024-03-19T18:00:00",
    gameLink: "https://lichess.org/abcd1234",
    dispute: {
      raisedBy: "PawnStorm",
      reason: "Opponent disconnected during the game and refused to continue. The game should be awarded to me.",
      status: "open",
    },
  },
  "M-003": {
    id: "M-003",
    opponent: "BishopBlitz",
    playerColor: "white",
    round: 3,
    status: "completed",
    deadline: "2024-03-15T18:00:00",
    gameLink: "https://chess.com/game/87654321",
    result: "win",
  },
}

export default function AdminMatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const match = mockMatches[matchId] || {
    id: matchId,
    opponent: "Unknown Player",
    playerColor: "white" as const,
    round: 1,
    status: "pending" as const,
    deadline: new Date(Date.now() + 86400000).toISOString(),
  }

  const handleForceResult = (result: "white_wins" | "black_wins" | "draw") => {
    alert(`Force result: ${result}`)
    // In production: API call to force result
  }

  const handleApproveDispute = () => {
    alert("Dispute approved")
    // In production: API call to approve dispute
  }

  const handleRejectDispute = () => {
    alert("Dispute rejected")
    // In production: API call to reject dispute
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/matches">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Match {matchId}
          </h1>
          <p className="text-muted-foreground">Admin view - Full control</p>
        </div>
      </div>

      <MatchDetails
        role="admin"
        match={match}
        onForceResult={handleForceResult}
        onApproveDispute={handleApproveDispute}
        onRejectDispute={handleRejectDispute}
      />
    </div>
  )
}
