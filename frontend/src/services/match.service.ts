import { API_ENDPOINTS } from '@/src/lib/api/endpoints'
import { httpClient, type SearchParams } from '@/src/lib/api/http'
import type { BackendApiResponse } from '@/src/types/api'
import type {
  Match,
  CompetitionMatchListParams,
  SubmitResultPayload,
  ForceResultPayload,
  ExtendDeadlinePayload,
  MarkAbsentPayload,
  AdminScorePayload,
} from '@/src/types/match'

export const matchService = {
  getCompetitionMatches(competitionId: string, params?: CompetitionMatchListParams) {
    const searchParams = params as SearchParams | undefined
    return httpClient.get<Match[]>(API_ENDPOINTS.COMPETITIONS.MATCHES(competitionId), searchParams)
  },

  getMatch(id: string) {
    return httpClient.get<Match>(API_ENDPOINTS.MATCHES.GET(id))
  },

  submitResult(id: string, payload: SubmitResultPayload) {
    return httpClient.post<Match>(API_ENDPOINTS.MATCHES.SUBMIT_RESULT(id), payload)
  },

  confirmResult(id: string) {
    return httpClient.post<Match & { confirmed_at: string }>(API_ENDPOINTS.MATCHES.CONFIRM_RESULT(id), {})
  },

  forceResult(id: string, payload: ForceResultPayload) {
    return httpClient.post<Match>(API_ENDPOINTS.MATCHES.FORCE_RESULT(id), payload)
  },

  markAbsent(id: string, payload: MarkAbsentPayload) {
    return httpClient.post<Match & { action: string; absence_side: string; winner_side: string }>(
      API_ENDPOINTS.MATCHES.MARK_ABSENT(id),
      payload
    )
  },

  extendDeadline(id: string, payload: ExtendDeadlinePayload) {
    return httpClient.post<{ id: string; previous_deadline: string; new_deadline: string }>(
      API_ENDPOINTS.MATCHES.EXTEND_DEADLINE(id),
      payload
    )
  },

  adminScore(id: string, payload: AdminScorePayload) {
    return httpClient.post(API_ENDPOINTS.MATCHES.ADMIN_SCORE(id), payload)
  },
}

export type MatchServiceResponse<T> = BackendApiResponse<T>
