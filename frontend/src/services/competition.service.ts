import { API_ENDPOINTS } from '@/src/lib/api/endpoints'
import { httpClient, type SearchParams } from '@/src/lib/api/http'
import type { BackendApiResponse } from '@/src/types/api'
import type {
  AdvanceRoundPayload,
  AdvanceRoundResult,
  Competition,
  CompetitionListParams,
  CreateCompetitionPayload,
  StandingEntry,
  StartCompetitionResult,
  UpdateCompetitionPayload,
} from '@/src/types/competition'

export const competitionService = {
  createCompetition(payload: CreateCompetitionPayload) {
    return httpClient.post<Competition>(API_ENDPOINTS.COMPETITIONS.CREATE, payload)
  },

  listCompetitions(params?: CompetitionListParams) {
    const searchParams = params as SearchParams | undefined
    return httpClient.get<Competition[]>(API_ENDPOINTS.COMPETITIONS.LIST, searchParams)
  },

  getCompetition(id: number) {
    return httpClient.get<Competition>(API_ENDPOINTS.COMPETITIONS.GET(id))
  },

  updateCompetition(id: number, payload: UpdateCompetitionPayload) {
    return httpClient.patch<Competition>(API_ENDPOINTS.COMPETITIONS.UPDATE(id), payload)
  },

  startCompetition(id: number) {
    return httpClient.post<StartCompetitionResult>(API_ENDPOINTS.COMPETITIONS.START(id), {})
  },

  advanceRound(id: number, payload?: AdvanceRoundPayload) {
    return httpClient.post<AdvanceRoundResult>(
      API_ENDPOINTS.COMPETITIONS.ADVANCE_ROUND(id),
      payload ?? {}
    )
  },

  getStandings(id: number) {
    return httpClient.get<StandingEntry[]>(API_ENDPOINTS.COMPETITIONS.STANDINGS(id))
  },
}

export type CompetitionServiceResponse<T> = BackendApiResponse<T>
