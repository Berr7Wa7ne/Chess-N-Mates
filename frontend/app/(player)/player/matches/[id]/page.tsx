"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { MatchDetails } from "@/components/match"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { currentPlayerId, getPlayerMatches, submitPlayerResult } from "@/lib/admin-data"

const matches = getPlayerMatches(currentPlayerId)

export default function PlayerMatchDetailPage() {
  const params = useParams()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const matchId = params.id as string
  const match = matches.find((entry) => entry.id === matchId)

  if (!match) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/player/matches">
            <ArrowLeft className="mr-2 size-4" />
            Back to matches
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Match not found.</p>
      </div>
    )
  }

  const handleSubmitResult = (submission: any) => {
    const result = submitPlayerResult({
      matchId: match.id,
      playerId: currentPlayerId,
      gameLink: submission.gameLink,
      hasDispute: submission.dispute.hasDispute,
      disputeReason: submission.dispute.reason,
    })

    setFeedback({
      type: result.success ? "success" : "error",
      message: result.message,
    })

    if (result.success) {
      // Clear feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/player/matches">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Match {match.id}</h1>
          <p className="text-muted-foreground">vs {match.opponent}</p>
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

      <MatchDetails role="player" match={match} onSubmitResult={handleSubmitResult} />
    </div>
  )
}
