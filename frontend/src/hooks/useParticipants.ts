'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/src/lib/query-keys'
import { participantService } from '@/src/services/participant.service'
import type {
  EliminateParticipantPayload,
  JoinCompetitionPayload,
  WithdrawParticipantPayload,
} from '@/src/types/participant'

export function useJoinCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      competitionId,
      payload,
    }: {
      competitionId: string
      payload: JoinCompetitionPayload
    }) => participantService.joinCompetition(competitionId, payload),
    onSuccess: (_data, { competitionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(competitionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.standings(competitionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
    },
  })
}

export function useWithdraw() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      competitionId,
      userId,
      payload,
    }: {
      competitionId: string
      userId: string
      payload?: WithdrawParticipantPayload
    }) =>
      participantService.withdrawParticipant(competitionId, userId, payload),
    onSuccess: (_data, { competitionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(competitionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.standings(competitionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all })
    },
  })
}

export function useEliminate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      competitionId,
      userId,
      payload,
    }: {
      competitionId: string
      userId: string
      payload?: EliminateParticipantPayload
    }) =>
      participantService.eliminateParticipant(competitionId, userId, payload),
    onSuccess: (_data, { competitionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.detail(competitionId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.standings(competitionId),
      })
    },
  })
}
