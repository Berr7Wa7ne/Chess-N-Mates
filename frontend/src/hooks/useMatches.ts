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

export function useForceResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ForceResultPayload }) =>
      matchService.forceResult(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
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
