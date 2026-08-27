'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/src/lib/query-keys'
import { userService, type ListUsersParams } from '@/src/services/user.service'

export function useUsers(params?: ListUsersParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: async () => {
      const response = await userService.listUsers(params)
      return response.data ?? []
    },
  })
}

export function useUser(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      const response = await userService.getUser(id)
      return response.data ?? null
    },
    enabled: enabled && Boolean(id),
  })
}
