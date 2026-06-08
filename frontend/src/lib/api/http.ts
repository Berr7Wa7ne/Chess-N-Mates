import type { BackendApiErrorResponse, BackendApiResponse } from '@/src/types/api'
import { ApiError } from '@/src/types/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''
const API_PREFIX = '/api/v1'

export type SearchParams = Record<string, string | number | undefined>

function buildUrl(path: string, searchParams?: SearchParams) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE}${API_PREFIX}${normalizedPath}`)

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    throw new ApiError('Empty response from server', response.status)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('Invalid JSON response from server', response.status)
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  searchParams?: SearchParams
  signal?: AbortSignal
  /** Extra timeout for cold starts (e.g. Render free tier) */
  timeoutMs?: number
}

export async function http<T>(
  path: string,
  options: RequestOptions = {}
): Promise<BackendApiResponse<T>> {
  const {
    method = 'GET',
    body,
    searchParams,
    signal,
    timeoutMs = 30_000,
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    const response = await fetch(buildUrl(path, searchParams), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })

    const payload = await parseJson<BackendApiResponse<T> | BackendApiErrorResponse>(response)

    if (!response.ok || !payload.success) {
      const message =
        'error' in payload && payload.error?.message
          ? payload.error.message
          : `Request failed (${response.status})`
      const code = 'error' in payload ? payload.error?.code : undefined
      throw new ApiError(message, response.status, code)
    }

    return payload as BackendApiResponse<T>
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The server may be waking up — please try again.',
        503,
        'TIMEOUT'
      )
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      'NETWORK_ERROR'
    )
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onAbort)
  }
}

export const httpClient = {
  get: <T>(path: string, searchParams?: RequestOptions['searchParams']) =>
    http<T>(path, { method: 'GET', searchParams }),
  post: <T>(path: string, body?: unknown) =>
    http<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    http<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) =>
    http<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => http<T>(path, { method: 'DELETE' }),
}
