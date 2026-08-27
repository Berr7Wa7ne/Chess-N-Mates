"use client"

import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { queryKeys } from "@/src/lib/query-keys"
import { matchService } from "@/src/services/match.service"
import type { Competition } from "@/src/types/competition"
import type { Match } from "@/src/types/match"

export type PlayerCollectionGame = {
  id: string
  title: string
  subtitle: string
  href: string
  updatedAt?: string
}

function opponentLabel(match: Match, userId: string) {
  const isA = String(match.player_a_id) === String(userId)
  if (match.is_bye) return "BYE"
  const opponent = isA ? match.player_b : match.player_a
  return opponent?.display_name || opponent?.chess_username || "Opponent"
}

/**
 * Recent matches for the logged-in player across their registered competitions.
 */
export function usePlayerRecentMatches(
  userId: string | undefined,
  competitionIds: string[],
  competitionsById: Record<string, Competition | undefined>
) {
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

  const games: PlayerCollectionGame[] = useMemo(() => {
    if (!userId) return []
    const all = matchesData.flatMap((data) => data ?? [])
    return all
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
        return bTime - aTime
      })
      .slice(0, 8)
      .map((match) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by serialized match payloads
  }, [competitionsById, userId, matchesData.map((d) => d?.length ?? 0).join("|"), uniqueIds.join("|")])

  return { games, isLoading }
}
