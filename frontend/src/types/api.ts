export interface BackendApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp?: string
}

export interface BackendApiError {
  code?: string
  message: string
}

export interface BackendApiErrorResponse {
  success: false
  error: BackendApiError
  timestamp?: string
}

export interface PaginationMeta {
  total: number
  limit: number
  offset: number
}

export interface PaginatedApiResponse<T> extends BackendApiResponse<T> {
  pagination?: PaginationMeta
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
