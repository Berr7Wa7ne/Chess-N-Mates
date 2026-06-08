'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { AuthShell } from '@/src/components/auth/auth-shell'
import { getDashboardPath } from '@/src/lib/auth-storage'
import { useLoginUser } from '@/src/hooks/useLoginUser'
import { useRegisterUser } from '@/src/hooks/useRegisterUser'
import { ApiError } from '@/src/types/api'
import type { UserRole } from '@/src/types/user'

function buildWhatsAppId(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `${digits}@s.whatsapp.net`
}

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loginMutation = useLoginUser()
  const registerMutation = useRegisterUser()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [whatsappId, setWhatsappId] = useState('')
  const [role, setRole] = useState<UserRole>('player')

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setMode('register')
    }
  }, [searchParams])

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    router.replace(next === 'register' ? '/login?mode=register' : '/login')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (!phone.trim()) {
      toast.error('Please enter your phone number')
      return
    }

    try {
      const user = await loginMutation.mutateAsync({ phone: phone.trim() })
      toast.success(`Welcome back, ${user.display_name}!`)
      router.push(getDashboardPath(user.role))
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Login failed'
      )
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    const phoneNumber = phone.trim()
    const name = displayName.trim()

    if (!name || !phoneNumber) {
      toast.error('Display name and phone number are required')
      return
    }

    try {
      await registerMutation.mutateAsync({
        display_name: name,
        phone_number: phoneNumber,
        whatsapp_id: whatsappId.trim() || buildWhatsAppId(phoneNumber),
        role,
      })

      toast.success('Account created! Please sign in.')
      setMode('login')
      setDisplayName('')
      setWhatsappId('')
      setRole('player')
      router.replace('/login')
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Registration failed'
      )
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending

  return (
    <AuthShell
      title={mode === 'login' ? 'Sign in' : 'Create account'}
      description={
        mode === 'login'
          ? 'Enter your phone number to access your dashboard'
          : 'Register to join chess tournaments'
      }
      footer={
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      }
    >
      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="2348051219099"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {loginMutation.isPending ? (
              <>
                <Spinner className="mr-2" />
                Signing in…
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              placeholder="Alex Johnson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registerPhone">Phone number</Label>
            <Input
              id="registerPhone"
              type="tel"
              placeholder="2348051219099"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose whether you are joining as a player or managing tournaments as an admin.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappId">WhatsApp ID (optional)</Label>
            <Input
              id="whatsappId"
              placeholder="2348051219099@s.whatsapp.net"
              value={whatsappId}
              onChange={(e) => setWhatsappId(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {registerMutation.isPending ? (
              <>
                <Spinner className="mr-2" />
                Creating account…
              </>
            ) : (
              'Sign up'
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
