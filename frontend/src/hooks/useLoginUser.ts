'use client'

import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/src/hooks/useAuth'
import type { UserRole } from '@/src/types/user'

export function useLoginUser() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: async (payload: {
      phone: string
      password: string
      role: UserRole
      admin_code?: string
    }) => login(payload),
  })
}
