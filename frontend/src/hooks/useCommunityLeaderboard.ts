"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useCompetitionsStandings } from "@/src/hooks/useCompetitionsStandings"
import { matchService } from "@/src/services/match.service"
import { queryKeys } from "@/src/lib/query-keys"
import { buildCommunityLeaderboard, type CommunityLeaderboardEntry } from "@/src/lib/community-leaderboard"
import { computeCommunityElo, type CommunityMatchInput } from "@/src/lib/community-elo"
import type { Competition } from "@/src/types/competition"

import type { Match } from "@/src/types/match"

function toCommunityMatch(m: Match): CommunityMatchInput {
  return {
    id: m.id,
    playerAId: m.player_a_id,
    playerBId: m.player_b_id,
    matchStatus: m.match_status,
    resultWinner: m.result_winner ?? null,
    isBye: m.is_bye ?? null,
    isAbsent: m.is_absent ?? null,
    absenceSide: m.absence_side ?? null,
    orderedAt: m.result_submitted_at ?? m.scheduled_date ?? m.created_at ?? null,
  }
}

export const COMMUNITY_ELO_EPOCH = "2026-08-01T00:00:00Z"

export function isEligibleCommunityCompetition(c: Competition): boolean {
  if (c.competition_status !== "active" && c.competition_status !== "completed") return false
  const start = c.start_date ? new Date(c.start_date).getTime() : 0
  const epoch = new Date(COMMUNITY_ELO_EPOCH).getTime()
  if (start >= epoch) return true
  return /august\s+2026/i.test(c.name || "")
}

type RatingPair = { chessCom: number | null; lichess: number | null }

async function fetchChessComRating(username: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`)
    if (!res.ok) return null
    const data = await res.json()
    return (
      data.chess_rapid?.last?.rating ??
      data.chess_blitz?.last?.rating ??
      data.chess_bullet?.last?.rating ??
      null
    )
  } catch {
    return null
  }
}

async function fetchLichessRating(username: string): Promise<number | null> {
  try {
    const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username.toLowerCase())}`)
    if (!res.ok) return null
    const data = await res.json()
    return (
      data.perfs?.rapid?.rating ??
      data.perfs?.blitz?.rating ??
      data.perfs?.classical?.rating ??
      data.perfs?.bullet?.rating ??
      null
    )
  } catch {
    return null
  }
}

export function useCommunityLeaderboard(): {
  entries: CommunityLeaderboardEntry[]
  eloByUserId: Record<string, number>
  isLoading: boolean
  ratingsLoading: boolean
} {
  const { data: competitions, isLoading: competitionsLoading } = useCompetitions()

  const eligible = useMemo(
    () => (competitions ?? []).filter(isEligibleCommunityCompetition),
    [competitions]
  )
  const eligibleIds = useMemo(() => eligible.map((c) => String(c.id)), [eligible])

  const { byCompetitionId, isLoading: standingsLoading } = useCompetitionsStandings(eligibleIds)

  const matchQueries = useQueries({
    queries: eligibleIds.map((id) => ({
      queryKey: queryKeys.competitions.matches(id),
      queryFn: async () => {
        const response = await matchService.getCompetitionMatches(id)
        return response.data ?? []
      },
      staleTime: 60_000,
    })),
  })
  const matchesByCompetition: Record<string, CommunityMatchInput[]> = {}
  eligibleIds.forEach((id, index) => {
    matchesByCompetition[id] = (matchQueries[index]?.data ?? []).map(toCommunityMatch)
  })
  const matchesLoading = matchQueries.some((q) => q.isLoading || q.isPending)

  const baseEntries = useMemo(() => buildCommunityLeaderboard(byCompetitionId), [byCompetitionId])

  const storedEloByUserId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const rows of Object.values(byCompetitionId)) {
      for (const row of rows) {
        const id = String(row.user_id)
        if (row.chess_elo != null && map[id] === undefined) map[id] = row.chess_elo
      }
    }
    return map
  }, [byCompetitionId])

  const [ratings, setRatings] = useState<Record<string, RatingPair>>({})
  const [ratingsLoading, setRatingsLoading] = useState(false)

  const playerSignature = useMemo(
    () => baseEntries.map((e) => `${e.userId}:${e.chessUsername ?? ""}`).sort().join("|"),
    [baseEntries]
  )

  useEffect(() => {
    if (standingsLoading || baseEntries.length === 0) return
    let cancelled = false
    setRatingsLoading(true)
    const snapshot = baseEntries
    ;(async () => {
      const next: Record<string, RatingPair> = {}
      await Promise.all(
        snapshot.map(async (entry) => {
          const handle = entry.chessUsername?.trim()
          if (!handle) {
            next[entry.userId] = { chessCom: null, lichess: null }
            return
          }
          const [chessCom, lichess] = await Promise.all([
            fetchChessComRating(handle),
            fetchLichessRating(handle),
          ])
          next[entry.userId] = { chessCom, lichess }
        })
      )
      if (!cancelled) {
        setRatings(next)
        setRatingsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by playerSignature
  }, [playerSignature, standingsLoading])

  const rapidByUserId = useMemo(() => {
    const map: Record<string, number | null> = {}
    for (const [userId, pair] of Object.entries(ratings)) map[userId] = pair.chessCom
    return map
  }, [ratings])

  const eloByUserId = useMemo(
    () =>
      computeCommunityElo({
        competitions: eligible,
        matchesByCompetition,
        rapidByUserId,
        storedEloByUserId,
      }),
    [eligible, matchesByCompetition, rapidByUserId, storedEloByUserId]
  )

  const entries = useMemo(
    () => buildCommunityLeaderboard(byCompetitionId, eloByUserId),
    [byCompetitionId, eloByUserId]
  )

  return {
    entries,
    eloByUserId,
    isLoading: competitionsLoading || standingsLoading || matchesLoading,
    ratingsLoading,
  }
}

