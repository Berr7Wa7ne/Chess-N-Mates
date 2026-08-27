'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/src/lib/query-keys'
import { competitionService } from '@/src/services/competition.service'
import type {
  AdvanceRoundPayload,
  CompetitionListParams,
  CreateCompetitionPayload,
  UpdateCompetitionPayload,
} from '@/src/types/competition'

export function useCompetitions(params?: CompetitionListParams) {
  return useQuery({
    queryKey: queryKeys.competitions.list(params),
    queryFn: async () => {
      const response = await competitionService.listCompetitions(params)
      return response.data
    },
  })
}

export function useCompetition(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.competitions.detail(id),
    queryFn: async () => {
      const response = await competitionService.getCompetition(id)
      return response.data
    },
    enabled: enabled && !!id,
  })
}

export function useCompetitionStandings(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.competitions.standings(id),
    queryFn: async () => {
      const response = await competitionService.getStandings(id)
      return response.data
    },
    enabled: enabled && !!id,
  })
}

export function useStartCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => competitionService.startCompetition(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(id) })
    },
  })
}

export function useAdvanceRound() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload?: AdvanceRoundPayload
    }) => competitionService.advanceRound(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.standings(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.matches(id) })
    },
  })
}

export function useComputeResults() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => competitionService.computeResults(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.standings(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.matches(id) })
    },
  })
}

export function useCreateCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCompetitionPayload) =>
      competitionService.createCompetition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
    },
  })
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateCompetitionPayload
    }) => competitionService.updateCompetition(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
    },
  })
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => competitionService.deleteCompetition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
    },
  })
}

export function useOpenRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      competitionService.updateCompetition(id, { competition_status: 'open_registration' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
    },
  })
}
