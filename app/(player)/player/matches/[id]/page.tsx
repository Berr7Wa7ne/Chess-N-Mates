"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MatchDetails } from "@/components/match"
import { Button } from "@/components/ui/button"
import { currentPlayerId, getPlayerMatches } from "@/lib/admin-data"

const matches = getPlayerMatches(currentPlayerId)

export default function PlayerMatchDetailPage() {
  const params = useParams()
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

      <MatchDetails
        role="player"
        match={match}
        onSubmitResult={(submission) => {
          alert(
            submission.dispute.hasDispute
              ? `Result submitted with dispute: ${submission.dispute.reason}`
              : `Result submitted with game link: ${submission.gameLink}`
          )
        }}
      />
    </div>
  )
}
