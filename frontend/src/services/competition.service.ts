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
  ComputeResultsReport,
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

  getCompetition(id: string) {
    return httpClient.get<Competition>(API_ENDPOINTS.COMPETITIONS.GET(id))
  },

  updateCompetition(id: string, payload: UpdateCompetitionPayload) {
    return httpClient.patch<Competition>(API_ENDPOINTS.COMPETITIONS.UPDATE(id), payload)
  },

  startCompetition(id: string) {
    return httpClient.post<StartCompetitionResult>(API_ENDPOINTS.COMPETITIONS.START(id), {})
  },

  advanceRound(id: string, payload?: AdvanceRoundPayload) {
    return httpClient.post<AdvanceRoundResult>(
      API_ENDPOINTS.COMPETITIONS.ADVANCE_ROUND(id),
      payload ?? {}
    )
  },

  deleteCompetition(id: string) {
    return httpClient.delete<{ competition_id: string; competition_name: string; deleted_participants: number; deleted_matches: number }>(
      API_ENDPOINTS.COMPETITIONS.DELETE(id)
    )
  },

  getStandings(id: string) {
    return httpClient.get<StandingEntry[]>(API_ENDPOINTS.COMPETITIONS.STANDINGS(id))
  },

  computeResults(id: string) {
    return httpClient.post<ComputeResultsReport>(
      API_ENDPOINTS.COMPETITIONS.COMPUTE_RESULTS(id),
      {}
    )
  },
}

export type CompetitionServiceResponse<T> = BackendApiResponse<T>
