'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/src/lib/query-keys'
import { matchService } from '@/src/services/match.service'
import type {
  CompetitionMatchListParams,
  SubmitResultPayload,
  ForceResultPayload,
  ExtendDeadlinePayload,
  MarkAbsentPayload,
  AdminScorePayload,
} from '@/src/types/match'

export function useCompetitionMatches(competitionId: string, params?: CompetitionMatchListParams) {
  return useQuery({
    queryKey: [...queryKeys.competitions.matches(competitionId), params],
    queryFn: async () => {
      const response = await matchService.getCompetitionMatches(competitionId, params)
      return response.data
    },
    enabled: !!competitionId,
  })
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: queryKeys.matches.detail(id),
    queryFn: async () => {
      const response = await matchService.getMatch(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useSubmitResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitResultPayload }) =>
      matchService.submitResult(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
      // Also invalidate competition-specific match queries so the player
      // page (which uses ['competitions', id, 'matches']) refreshes immediately
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}

export function useConfirmResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => matchService.confirmResult(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
    },
  })
}

export function useForceResult(competitionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ForceResultPayload }) =>
      matchService.forceResult(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.matches(competitionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.standings(competitionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(competitionId) })
      return data
    },
  })
}

export function useMarkAbsent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkAbsentPayload }) =>
      matchService.markAbsent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
    },
  })
}

export function useExtendDeadline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExtendDeadlinePayload }) =>
      matchService.extendDeadline(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
    },
  })
}

export function useAdminScore(competitionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminScorePayload }) =>
      matchService.adminScore(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.matches(competitionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.standings(competitionId) })
    },
  })
}
