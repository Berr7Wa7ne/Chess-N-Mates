"use client"

import { useQueries } from "@tanstack/react-query"
import { queryKeys } from "@/src/lib/query-keys"
import { competitionService } from "@/src/services/competition.service"
import type { StandingEntry } from "@/src/types/competition"

export function useCompetitionsStandings(competitionIds: string[]) {
  const uniqueIds = [...new Set(competitionIds.filter(Boolean))]

  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: queryKeys.competitions.standings(id),
      queryFn: async () => {
        const response = await competitionService.getStandings(id)
        return response.data ?? []
      },
      staleTime: 60_000,
    })),
  })

  const byCompetitionId: Record<string, StandingEntry[]> = {}
  uniqueIds.forEach((id, index) => {
    byCompetitionId[id] = queries[index]?.data ?? []
  })

  const isLoading = queries.some((q) => q.isLoading || q.isPending)
  const isFetching = queries.some((q) => q.isFetching)

  return { byCompetitionId, isLoading, isFetching, queries }
}
