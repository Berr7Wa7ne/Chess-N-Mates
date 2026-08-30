"use client"

import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { queryKeys } from "@/src/lib/query-keys"
import { matchService } from "@/src/services/match.service"
import type { Competition } from "@/src/types/competition"
import type { Match, MatchStatus } from "@/src/types/match"

export type PlayerCollectionGame = {
  id: string
  title: string
  subtitle: string
  href: string
  updatedAt?: string
}

export function opponentLabel(match: Match, userId: string) {
  const isA = String(match.player_a_id) === String(userId)
  if (match.is_bye) return "BYE"
  const opponent = isA ? match.player_b : match.player_a
  return opponent?.display_name || opponent?.chess_username || "Opponent"
}

export function playerResultLabel(match: Match, userId: string): string | null {
  if (!match.result_winner || match.is_bye) return null
  if (match.result_winner === "draw") return "Draw"
  const isA = String(match.player_a_id) === String(userId)
  if (match.result_winner === "a") return isA ? "Win" : "Loss"
  if (match.result_winner === "b") return isA ? "Loss" : "Win"
  return null
}

/** Map API match status to player Matches page filter keys. */
export function mapMatchStatusForFilter(
  status: MatchStatus
): "pending" | "awaiting_review" | "confirmed" | "disputed" | "other" {
  if (status === "pending" || status === "ongoing") return "pending"
  if (status === "result_submitted") return "awaiting_review"
  if (status === "completed") return "confirmed"
  if (status === "disputed") return "disputed"
  return "other"
}

/**
 * Matches for a player across their registered competitions.
 * Pass `limit` to cap the dashboard collection (default 8). Omit / Infinity for full list.
 */
export function usePlayerRecentMatches(
  userId: string | undefined,
  competitionIds: string[],
  competitionsById: Record<string, Competition | undefined>,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 8
  const uniqueIds = [...new Set(competitionIds.filter(Boolean))]

  const queries = useQueries({
    queries: uniqueIds.map((competitionId) => ({
      queryKey: [
        ...queryKeys.competitions.matches(competitionId),
        { player_id: userId },
      ] as const,
      queryFn: async () => {
        const response = await matchService.getCompetitionMatches(competitionId, {
          player_id: userId,
        })
        return (response.data ?? []).map((match) => ({
          ...match,
          competition_id: match.competition_id || competitionId,
        }))
      },
      enabled: Boolean(userId && competitionId),
      staleTime: 60_000,
    })),
  })

  const matchesData = queries.map((q) => q.data)
  const isLoading = queries.some((q) => q.isLoading || q.isPending)

  const matches: Match[] = useMemo(() => {
    if (!userId) return []
    const all = matchesData.flatMap((data) => data ?? [])
    return all.slice().sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
      return bTime - aTime
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by serialized match payloads
  }, [userId, matchesData.map((d) => d?.length ?? 0).join("|"), uniqueIds.join("|")])

  const games: PlayerCollectionGame[] = useMemo(() => {
    if (!userId) return []
    const sliced = Number.isFinite(limit) ? matches.slice(0, limit) : matches
    return sliced.map((match) => {
      const competition = competitionsById[String(match.competition_id)]
      const title = competition?.name || "Tournament match"
      return {
        id: String(match.id),
        title,
        subtitle: `vs ${opponentLabel(match, userId)} · Round ${match.round_number}`,
        href: `/player/matches/${match.id}`,
        updatedAt: match.updated_at || match.created_at,
      }
    })
  }, [competitionsById, limit, matches, userId])

  return { games, matches, isLoading }
}
