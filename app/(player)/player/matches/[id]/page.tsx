"use client"

import { useParams } from "next/navigation"
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
    status: "pending",
    deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  },
  "M-002": {
    id: "M-002",
    opponent: "PawnStorm",
    playerColor: "black",
    round: 4,
    status: "pending",
    deadline: new Date(Date.now() + 172800000).toISOString(), // In 2 days
  },
  "M-003": {
    id: "M-003",
    opponent: "BishopBlitz",
    playerColor: "white",
    round: 3,
    status: "submitted",
    deadline: "2024-03-15T18:00:00",
    gameLink: "https://chess.com/game/12345678",
  },
  "M-004": {
    id: "M-004",
    opponent: "QueenGambit",
    playerColor: "black",
    round: 3,
    status: "completed",
    deadline: "2024-03-14T18:00:00",
    gameLink: "https://lichess.org/abcd1234",
    result: "win",
  },
}

export default function PlayerMatchDetailPage() {
  const params = useParams()
  const matchId = params.id as string

  const match = mockMatches[matchId] || {
    id: matchId,
    opponent: "Unknown Player",
    playerColor: "white" as const,
    round: 1,
    status: "pending" as const,
    deadline: new Date(Date.now() + 86400000).toISOString(),
  }

  const handleSubmitResult = (gameLink: string) => {
    alert(`Result submitted with game link: ${gameLink}`)
    // In production: API call to submit result
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
          <h1 className="text-2xl font-semibold tracking-tight">
            Match {matchId}
          </h1>
          <p className="text-muted-foreground">vs {match.opponent}</p>
        </div>
      </div>

      <MatchDetails
        role="player"
        match={match}
        onSubmitResult={handleSubmitResult}
      />
    </div>
  )
}
