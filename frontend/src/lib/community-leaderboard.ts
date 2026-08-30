import type { StandingEntry } from "@/src/types/competition"

export type CommunityLeaderboardEntry = {
  userId: string
  displayName: string
  chessUsername?: string | null
  /** Number of tournament 1st-place finishes */
  firstPlaces: number
  secondPlaces: number
  thirdPlaces: number
  /** Match wins across all tournaments */
  matchWins: number
  matchDraws: number
  matchLosses: number
  tournamentsPlayed: number
  chessComRating: number | null
  lichessRating: number | null
  rank: number
}

function placementBucket(rank: number): "first" | "second" | "third" | null {
  if (rank === 1) return "first"
  if (rank === 2) return "second"
  if (rank === 3) return "third"
  return null
}

/**
 * Rank players by:
 * 1. Tournament wins (1st places)
 * 2. Then 2nd places, then 3rd places (1 > 2 > 3…)
 * 3. Then most match wins across tournaments
 * 4. Then Chess.com rating
 * 5. Then Lichess rating
 */
export function buildCommunityLeaderboard(
  standingsByCompetition: Record<string, StandingEntry[]>,
  ratings?: Record<
    string,
    { chessCom?: number | null; lichess?: number | null }
  >
): CommunityLeaderboardEntry[] {
  const map = new Map<string, CommunityLeaderboardEntry>()

  for (const standings of Object.values(standingsByCompetition)) {
    for (const row of standings) {
      const id = String(row.user_id)
      let entry = map.get(id)
      if (!entry) {
        entry = {
          userId: id,
          displayName: row.display_name,
          chessUsername: row.chess_username,
          firstPlaces: 0,
          secondPlaces: 0,
          thirdPlaces: 0,
          matchWins: 0,
          matchDraws: 0,
          matchLosses: 0,
          tournamentsPlayed: 0,
          chessComRating: null,
          lichessRating: null,
          rank: 0,
        }
        map.set(id, entry)
      }

      entry.tournamentsPlayed += 1
      entry.matchWins += row.wins ?? 0
      entry.matchDraws += row.draws ?? 0
      entry.matchLosses += row.losses ?? 0
      if (row.display_name) entry.displayName = row.display_name
      if (row.chess_username) entry.chessUsername = row.chess_username

      const bucket = placementBucket(Number(row.rank))
      if (bucket === "first") entry.firstPlaces += 1
      if (bucket === "second") entry.secondPlaces += 1
      if (bucket === "third") entry.thirdPlaces += 1
    }
  }

  for (const entry of map.values()) {
    const r = ratings?.[entry.userId]
    if (r) {
      entry.chessComRating = r.chessCom ?? null
      entry.lichessRating = r.lichess ?? null
    }
  }

  const sorted = [...map.values()].sort((a, b) => {
    if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces
    if (b.secondPlaces !== a.secondPlaces) return b.secondPlaces - a.secondPlaces
    if (b.thirdPlaces !== a.thirdPlaces) return b.thirdPlaces - a.thirdPlaces
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins
    const aChess = a.chessComRating ?? -1
    const bChess = b.chessComRating ?? -1
    if (bChess !== aChess) return bChess - aChess
    const aLichess = a.lichessRating ?? -1
    const bLichess = b.lichessRating ?? -1
    if (bLichess !== aLichess) return bLichess - aLichess
    return a.displayName.localeCompare(b.displayName)
  })

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }))
}
