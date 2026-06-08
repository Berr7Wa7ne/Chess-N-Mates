"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MatchDetails, type MatchData } from "@/components/match"
import { approveDispute, rejectDispute, forceMatchResult, disputes, getPlayerMatches } from "@/lib/admin-data"

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
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const matchId = params.id as string

  let match = mockMatches[matchId] || {
    id: matchId,
    opponent: "Unknown Player",
    playerColor: "white" as const,
    round: 1,
    status: "pending" as const,
    deadline: new Date(Date.now() + 86400000).toISOString(),
  }

  // Check if match has a dispute and update dispute info
  const dispute = disputes.find((d) => d.matchId === matchId)
  if (dispute) {
    match = {
      ...match,
      status: "disputed",
      dispute: {
        raisedBy: dispute.raisedBy.username,
        reason: dispute.reason,
        status: dispute.status as "open" | "resolved",
      },
    }
  }

  const handleForceResult = (result: "white_wins" | "black_wins" | "draw") => {
    const response = forceMatchResult(matchId, result)
    setFeedback({
      type: response.success ? "success" : "error",
      message: response.message,
    })

    if (response.success) {
      // Reload match data
      setTimeout(() => {
        router.refresh()
        setFeedback(null)
      }, 1500)
    }
  }

  const handleApproveDispute = () => {
    if (!dispute) {
      setFeedback({ type: "error", message: "No dispute found to approve" })
      return
    }

    const response = approveDispute(dispute.id)
    setFeedback({
      type: response.success ? "success" : "error",
      message: response.message,
    })

    if (response.success) {
      setTimeout(() => {
        router.refresh()
        setFeedback(null)
      }, 1500)
    }
  }

  const handleRejectDispute = () => {
    if (!dispute) {
      setFeedback({ type: "error", message: "No dispute found to reject" })
      return
    }

    const response = rejectDispute(dispute.id)
    setFeedback({
      type: response.success ? "success" : "error",
      message: response.message,
    })

    if (response.success) {
      setTimeout(() => {
        router.refresh()
        setFeedback(null)
      }, 1500)
    }
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
          <h1 className="text-2xl font-semibold tracking-tight">Match {matchId}</h1>
          <p className="text-muted-foreground">Admin view - Full control</p>
        </div>
      </div>

      {feedback && (
        <Card className={feedback.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2
              className={`size-5 ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}
            />
            <p className={feedback.type === "success" ? "text-emerald-800" : "text-red-800"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      )}

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
