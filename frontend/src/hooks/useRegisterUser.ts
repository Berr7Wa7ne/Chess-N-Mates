'use client'

import { useMutation } from '@tanstack/react-query'
import { userService } from '@/src/services/user.service'
import type { RegisterUserPayload } from '@/src/types/user'

export function useRegisterUser() {
  return useMutation({
    mutationFn: (payload: RegisterUserPayload) => userService.registerUser(payload),
  })
}
