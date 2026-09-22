import type { StandingEntry } from "@/src/types/competition"

export type CommunityLeaderboardEntry = {

  userId: string

  displayName: string

  chessUsername?: string | null

  /** Community ELO: seeded 1000 + Chess.com rapid/2, then moved by results only. */

  communityElo: number

  /** Number of tournament 1st-place finishes (eligible competitions) */

  firstPlaces: number

  secondPlaces: number

  thirdPlaces: number

  /** Match wins across all eligible tournaments */

  matchWins: number

  matchDraws: number

  matchLosses: number

  tournamentsPlayed: number

  rank: number

}

function placementBucket(rank: number): "first" | "second" | "third" | null {

  if (rank === 1) return "first"

  if (rank === 2) return "second"

  if (rank === 3) return "third"

  return null

}

/**

 * Builds the community leaderboard from competition standings (identity,

 * W/D/L, placements, tournament counts) and attaches the community ELO

 * computed by the replay engine (community-elo.ts).

 *

 * Only players present in the ELO map are ranked, i.e. players who have

 * completed a real match in an eligible competition. Everyone else stays

 * off the board until their first tournament result (the room for newcomers).

 */

export function buildCommunityLeaderboard(

  standingsByCompetition: Record<string, StandingEntry[]>,

  communityEloByUserId?: Record<string, number>

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

          communityElo: 1000,

          firstPlaces: 0,

          secondPlaces: 0,

          thirdPlaces: 0,

          matchWins: 0,

          matchDraws: 0,

          matchLosses: 0,

          tournamentsPlayed: 0,

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

  let entries = [...map.values()]

  if (communityEloByUserId) {

    entries = entries

      .filter((entry) => communityEloByUserId[entry.userId] !== undefined)

      .map((entry) => ({ ...entry, communityElo: communityEloByUserId[entry.userId] }))

  }

  const sorted = entries.sort((a, b) => {

    if (b.communityElo !== a.communityElo) return b.communityElo - a.communityElo

    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins

    if (b.tournamentsPlayed !== a.tournamentsPlayed) return b.tournamentsPlayed - a.tournamentsPlayed

    return (a.displayName || "").localeCompare(b.displayName || "")

  })

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }))

}

