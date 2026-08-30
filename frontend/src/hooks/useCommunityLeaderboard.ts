"use client"

import { useEffect, useMemo, useState } from "react"
import type { CommunityLeaderboardEntry } from "@/src/lib/community-leaderboard"
import { buildCommunityLeaderboard } from "@/src/lib/community-leaderboard"
import type { StandingEntry } from "@/src/types/competition"

type RatingPair = { chessCom: number | null; lichess: number | null }

async function fetchChessComRating(username: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`
    )
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
    const res = await fetch(
      `https://lichess.org/api/user/${encodeURIComponent(username.toLowerCase())}`
    )
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

/**
 * Builds the community table from competition standings, then enriches
 * with live Chess.com / Lichess ratings for remaining tiebreaks.
 */
export function useCommunityLeaderboard(
  standingsByCompetition: Record<string, StandingEntry[]>,
  standingsLoading: boolean
) {
  const [ratings, setRatings] = useState<Record<string, RatingPair>>({})
  const [ratingsLoading, setRatingsLoading] = useState(false)

  const baseEntries = useMemo(
    () => buildCommunityLeaderboard(standingsByCompetition),
    [standingsByCompetition]
  )

  const playerSignature = useMemo(
    () =>
      baseEntries
        .map((e) => `${e.userId}:${e.chessUsername ?? ""}`)
        .sort()
        .join("|"),
    [baseEntries]
  )

  // Fetch platform ratings once we know the players
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

  const entries: CommunityLeaderboardEntry[] = useMemo(
    () => buildCommunityLeaderboard(standingsByCompetition, ratings),
    [standingsByCompetition, ratings]
  )

  return {
    entries,
    isLoading: standingsLoading,
    ratingsLoading,
  }
}
