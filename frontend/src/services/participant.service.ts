import { API_ENDPOINTS } from '@/src/lib/api/endpoints'
import { httpClient } from '@/src/lib/api/http'
import type { BackendApiResponse } from '@/src/types/api'
import type {
  EliminateParticipantPayload,
  JoinCompetitionPayload,
  Participant,
  ParticipantActionResult,
  WithdrawParticipantPayload,
} from '@/src/types/participant'

export const participantService = {
  joinCompetition(competitionId: number, payload: JoinCompetitionPayload) {
    return httpClient.post<Participant>(
      API_ENDPOINTS.PARTICIPANTS.JOIN(competitionId),
      payload
    )
  },

  withdrawParticipant(
    competitionId: number,
    userId: number,
    payload?: WithdrawParticipantPayload
  ) {
    return httpClient.post<ParticipantActionResult>(
      API_ENDPOINTS.PARTICIPANTS.WITHDRAW(competitionId, userId),
      payload ?? {}
    )
  },

  eliminateParticipant(
    competitionId: number,
    userId: number,
    payload?: EliminateParticipantPayload
  ) {
    return httpClient.post<ParticipantActionResult>(
      API_ENDPOINTS.PARTICIPANTS.ELIMINATE(competitionId, userId),
      payload ?? {}
    )
  },
}

export type ParticipantServiceResponse<T> = BackendApiResponse<T>
