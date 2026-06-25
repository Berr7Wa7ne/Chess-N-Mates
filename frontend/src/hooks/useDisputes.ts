'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/src/lib/query-keys'
import { disputeService } from '@/src/services/dispute.service'
import type { CreateDisputePayload, ResolveDisputePayload } from '@/src/types/dispute'

export function useDisputes(params?: { competition_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['disputes', 'list', params],
    queryFn: async () => {
      const response = await disputeService.getDisputes(params)
      return response.data
    },
  })
}

export function useDispute(id: string) {
  return useQuery({
    queryKey: ['disputes', id],
    queryFn: async () => {
      const response = await disputeService.getDispute(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateDispute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDisputePayload) => disputeService.createDispute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
    },
  })
}

export function useUpdateDisputeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      disputeService.updateStatus(id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['disputes', id] })
      queryClient.invalidateQueries({ queryKey: ['disputes', 'list'] })
    },
  })
}

export function useResolveDispute(competitionId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResolveDisputePayload }) =>
      disputeService.resolveDispute(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['disputes', id] })
      queryClient.invalidateQueries({ queryKey: ['disputes', 'list'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
      if (competitionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.competitions.standings(competitionId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.competitions.matches(competitionId) })
      }
    },
  })
}

export function useRejectDispute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { admin_notes?: string; resolved_by: string } }) =>
      disputeService.rejectDispute(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['disputes', id] })
      queryClient.invalidateQueries({ queryKey: ['disputes', 'list'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all })
    },
  })
}
