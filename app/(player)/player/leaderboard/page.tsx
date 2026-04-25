import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Medal, Trophy } from "lucide-react"

// Mock leaderboard data
const leaderboard = [
  { rank: 1, player: "GrandMaster_Alex", points: 12, wins: 6, losses: 0, draws: 0 },
  { rank: 2, player: "QueenGambit", points: 11, wins: 5, losses: 1, draws: 2 },
  { rank: 3, player: "BishopBlitz", points: 10, wins: 5, losses: 2, draws: 0 },
  { rank: 4, player: "RookieKing", points: 9, wins: 4, losses: 2, draws: 2 },
  { rank: 5, player: "KnightRider", points: 8, wins: 4, losses: 3, draws: 0 },
  { rank: 6, player: "PawnStorm", points: 8, wins: 3, losses: 2, draws: 4 },
  { rank: 7, player: "CheckmateChamp", points: 7, wins: 3, losses: 3, draws: 2 },
  { rank: 8, player: "EndgameExpert", points: 7, wins: 3, losses: 4, draws: 1 },
  { rank: 9, player: "OpeningMaster", points: 6, wins: 2, losses: 3, draws: 4 },
  { rank: 10, player: "CastleKing", points: 6, wins: 2, losses: 4, draws: 2 },
  { rank: 11, player: "KnightSlayer", points: 5, wins: 2, losses: 5, draws: 1 },
  { rank: 12, player: "PawnPusher", points: 5, wins: 1, losses: 3, draws: 6 },
  { rank: 13, player: "TacticalTitan", points: 4, wins: 1, losses: 4, draws: 4 },
  { rank: 14, player: "BlitzMaster", points: 4, wins: 1, losses: 5, draws: 2 },
  { rank: 15, player: "JohnDoe", points: 3, wins: 1, losses: 6, draws: 1 },
]

const currentPlayer = "JohnDoe"

function getRankIcon(rank: number) {
  if (rank === 1) {
    return (
      <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 shadow-sm">
        <Trophy className="size-5 text-amber-600" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 shadow-sm">
        <Medal className="size-5 text-slate-500" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex size-10 items-center justify-center rounded-full bg-orange-100 shadow-sm">
        <Medal className="size-5 text-orange-500" />
      </div>
    )
  }
  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
      {rank}
    </div>
  )
}

export default function PlayerLeaderboardPage() {
  const currentPlayerData = leaderboard.find((p) => p.player === currentPlayer)

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          {leaderboard.length} players in tournament
        </p>
      </div>

      {/* Current Player Highlight - Sticky */}
      {currentPlayerData && (
        <Card className="sticky top-[108px] z-10 border-primary bg-primary/5 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {currentPlayerData.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{currentPlayerData.player}</span>
                    <Badge className="bg-primary text-primary-foreground">You</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    W: {currentPlayerData.wins} | L: {currentPlayerData.losses} | D: {currentPlayerData.draws}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{currentPlayerData.points}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Cards - Compact mobile-friendly layout */}
      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const isCurrentPlayer = entry.player === currentPlayer
          return (
            <Card
              key={entry.rank}
              className={`overflow-hidden shadow-sm transition-colors ${
                isCurrentPlayer ? "border-primary bg-primary/5" : ""
              }`}
            >
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-3">
                  {/* Rank Icon */}
                  {getRankIcon(entry.rank)}
                  
                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${isCurrentPlayer ? "text-primary" : ""}`}>
                        {entry.player}
                      </span>
                      {isCurrentPlayer && (
                        <Badge variant="outline" className="shrink-0 text-xs">You</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-emerald-600">W: {entry.wins}</span>
                      <span className="text-red-600">L: {entry.losses}</span>
                      <span className="text-amber-600">D: {entry.draws}</span>
                    </div>
                  </div>
                  
                  {/* Points */}
                  <div className="shrink-0 text-right">
                    <span className={`text-xl font-bold ${
                      entry.rank <= 3 
                        ? entry.rank === 1 
                          ? "text-amber-600" 
                          : entry.rank === 2 
                          ? "text-slate-500" 
                          : "text-orange-500"
                        : isCurrentPlayer 
                        ? "text-primary" 
                        : ""
                    }`}>
                      {entry.points}
                    </span>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
