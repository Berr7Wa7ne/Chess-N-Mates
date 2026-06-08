'use client'

import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/src/hooks/useAuth'

export function useLoginUser() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: async ({ phone }: { phone: string }) => login(phone),
  })
}
