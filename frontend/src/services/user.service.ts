import { API_ENDPOINTS } from '@/src/lib/api/endpoints'
import { httpClient } from '@/src/lib/api/http'
import type { BackendApiResponse } from '@/src/types/api'
import type {
  ActivityLogEntry,
  AuthUser,
  LoginPayload,
  RegisterChessPayload,
  RegisterUserPayload,
  UpdateUserPayload,
  User,
} from '@/src/types/user'

export type ListUsersParams = {
  role?: User['role']
  status?: User['user_status']
}

export const userService = {
  login(payload: LoginPayload) {
    return httpClient.post<AuthUser>(API_ENDPOINTS.USERS.LOGIN, payload)
  },

  registerUser(payload: RegisterUserPayload) {
    return httpClient.post<User>(API_ENDPOINTS.USERS.REGISTER, payload)
  },

  listUsers(params?: ListUsersParams) {
    return httpClient.get<User[]>(
      API_ENDPOINTS.USERS.LIST,
      params as Record<string, string | number | undefined> | undefined
    )
  },

  registerChessAccount(id: string, payload: RegisterChessPayload) {
    return httpClient.post<User>(API_ENDPOINTS.USERS.REGISTER_CHESS(id), payload)
  },

  getUser(id: string) {
    return httpClient.get<User>(API_ENDPOINTS.USERS.GET(id))
  },

  updateUser(id: string, payload: UpdateUserPayload) {
    return httpClient.put<User>(API_ENDPOINTS.USERS.UPDATE(id), payload)
  },

  getActivityLog() {
    return httpClient.get<ActivityLogEntry[]>(API_ENDPOINTS.USERS.ACTIVITY_LOG)
  },
}

export type UserServiceResponse<T> = BackendApiResponse<T>
