import { httpClient, type SearchParams } from '../lib/api/http'
import { API_ENDPOINTS } from '../lib/api/endpoints'
import type { Dispute, CreateDisputePayload, ResolveDisputePayload } from '../types/dispute'
import type { BackendApiResponse } from '../types/api'

export const disputeService = {
  getDisputes(params?: { competition_id?: string; status?: string }) {
    const searchParams = params as SearchParams | undefined
    return httpClient.get<BackendApiResponse<Dispute[]>>(API_ENDPOINTS.DISPUTES.LIST, searchParams)
  },
  getDispute(id: string) {
    return httpClient.get<BackendApiResponse<Dispute>>(API_ENDPOINTS.DISPUTES.GET(id))
  },
  createDispute(payload: CreateDisputePayload) {
    return httpClient.post<BackendApiResponse<Dispute>>(API_ENDPOINTS.DISPUTES.CREATE, payload)
  },
  updateStatus(id: string, dispute_status: string) {
    return httpClient.patch<BackendApiResponse<Dispute>>(API_ENDPOINTS.DISPUTES.UPDATE_STATUS(id), { dispute_status })
  },
  resolveDispute(id: string, payload: ResolveDisputePayload) {
    return httpClient.post<BackendApiResponse<Dispute>>(API_ENDPOINTS.DISPUTES.RESOLVE(id), payload)
  },
  rejectDispute(id: string, payload: { admin_notes?: string; resolved_by: string }) {
    return httpClient.post<BackendApiResponse<Dispute>>(API_ENDPOINTS.DISPUTES.REJECT(id), payload)
  },
}