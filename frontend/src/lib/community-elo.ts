/**
 * Community ELO - deterministic replay engine.
 *
 * Rules (per product spec):
 *  - A player joins the ranking the first time they complete a real match in an
 *    eligible competition. On that first appearance they are seeded with
 *    1000 + (Chess.com rapid / 2). After the seed, Chess.com is ignored: only
 *    competition results move community ELO.
 *  - For each decisive completed match the swing depends on the gap between
 *    the two ratings at that moment, and on whether the lower-rated player won
 *    (upsets are worth more so strong players cannot farm points):
 *
 *      rating gap   favourite wins   underdog wins
 *         0-100          16               16
 *       101-200          14               18
 *       201-300          12               20
 *       301-400          10               22
 *       401-500           8               32
 *       501-600           6               40
 *       601-700           4               48
 *        701+             2               56
 *
 *      winner += swing, loser -= swing
 *
 *  - Draws, mutual wins (`both`), and bye matches leave ratings unchanged; a
 *    both-absent match is not a result. A default win from an absence counts as
 *    a decisive result.
 *
 * The module is intentionally dependency-free so it can be compiled and tested
 * standalone with plain Node (see frontend/scripts/test-community-elo.cjs).
 */

export interface CommunityMatchInput {
  id?: string | null
  playerAId: string
  playerBId?: string | null
  matchStatus?: string | null
  resultWinner?: 'a' | 'b' | 'draw' | 'both' | null
  isBye?: boolean | null
  isAbsent?: boolean | null
  absenceSide?: 'a' | 'b' | 'both' | null
  orderedAt?: string | null
}

export interface CommunityCompetitionInput {
  id: string
  name?: string | null
  startDate?: string | null
}

export interface CommunityEloOptions {
  competitions: CommunityCompetitionInput[]
  matchesByCompetition: Record<string, CommunityMatchInput[]>
  rapidByUserId?: Record<string, number | null | undefined>
  storedEloByUserId?: Record<string, number | null | undefined>
}

export const SEED_BASE = 1000

export function seedCommunityElo(rating: number | null | undefined): number {
  if (!rating || rating <= 0) return SEED_BASE
  return Math.round(SEED_BASE + rating / 2)
}

export function eloSwing(ratingGap: number, underdogWon: boolean): number {
  const gap = Math.max(0, ratingGap)
  if (gap <= 100) return 16
  if (gap <= 200) return underdogWon ? 18 : 14
  if (gap <= 300) return underdogWon ? 20 : 12
  if (gap <= 400) return underdogWon ? 22 : 10
  if (gap <= 500) return underdogWon ? 32 : 8
  if (gap <= 600) return underdogWon ? 40 : 6
  if (gap <= 700) return underdogWon ? 48 : 4
  return underdogWon ? 56 : 2
}

function isCountableMatch(match: CommunityMatchInput): boolean {
  if (match.matchStatus !== 'completed') return false
  if (match.isBye) return false
  if (match.isAbsent && match.absenceSide === 'both') return false
  return Boolean(match.playerAId) && Boolean(match.playerBId)
}

function resolveResult(
  match: CommunityMatchInput
): { winnerId: string; loserId: string } | null {
  if (!isCountableMatch(match)) return null
  if (match.resultWinner === 'draw' || match.resultWinner === 'both') return null

  if (match.resultWinner === 'a') {
    return { winnerId: match.playerAId, loserId: match.playerBId as string }
  }
  if (match.resultWinner === 'b') {
    return { winnerId: match.playerBId as string, loserId: match.playerAId }
  }
  if (match.isAbsent && match.absenceSide === 'a') {
    return { winnerId: match.playerBId as string, loserId: match.playerAId }
  }
  if (match.isAbsent && match.absenceSide === 'b') {
    return { winnerId: match.playerAId, loserId: match.playerBId as string }
  }
  return null
}

export function computeCommunityElo(options: CommunityEloOptions): Record<string, number> {
  const { competitions, matchesByCompetition, rapidByUserId = {}, storedEloByUserId = {} } =
    options

  const elo = new Map<string, number>()

  const getElo = (userId: string): number => {
    const existing = elo.get(userId)
    if (existing !== undefined) return existing
    const seeded = seedCommunityElo(rapidByUserId[userId] ?? storedEloByUserId[userId])
    elo.set(userId, seeded)
    return seeded
  }

  const orderedCompetitions = [...competitions].sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : 0
    const bTime = b.startDate ? new Date(b.startDate).getTime() : 0
    return aTime - bTime
  })

  for (const competition of orderedCompetitions) {
    const matches = [...(matchesByCompetition[competition.id] || [])].sort((a, b) => {
      const aTime = a.orderedAt ? new Date(a.orderedAt).getTime() : 0
      const bTime = b.orderedAt ? new Date(b.orderedAt).getTime() : 0
      return aTime - bTime
    })

    for (const match of matches) {
      if (!isCountableMatch(match)) continue
      getElo(match.playerAId)
      getElo(match.playerBId as string)

      const result = resolveResult(match)
      if (!result) continue

      const winnerElo = getElo(result.winnerId)
      const loserElo = getElo(result.loserId)
      const underdogWon = winnerElo < loserElo
      const swing = eloSwing(Math.abs(winnerElo - loserElo), underdogWon)

      elo.set(result.winnerId, winnerElo + swing)
      elo.set(result.loserId, loserElo - swing)
    }
  }

  const result: Record<string, number> = {}
  for (const [userId, rating] of elo) result[userId] = rating
  return result
}
