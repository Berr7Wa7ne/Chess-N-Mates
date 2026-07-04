'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { ChessPlatform, UserRole } from '@/src/types/user'

type VerificationState = 'idle' | 'verifying' | 'verified' | 'invalid'

const CHESS_PLATFORMS: ChessPlatform[] = ['chess.com', 'lichess', 'over_the_board']

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loginMutation = useLoginUser()
  const registerMutation = useRegisterUser()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<UserRole>('player')
  const [chessPlatform, setChessPlatform] = useState<ChessPlatform>('chess.com')
  const [chessComUsername, setChessComUsername] = useState('')
  const [lichessUsername, setLichessUsername] = useState('')
  const [verificationState, setVerificationState] = useState<VerificationState>('idle')

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setMode('register')
    }
  }, [searchParams])

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    router.replace(next === 'register' ? '/login?mode=register' : '/login')
  }

  async function verifyChessComUsername() {
    const username = chessComUsername.trim().toLowerCase()
    if (!username) {
      setVerificationState('idle')
      return false
    }

    setVerificationState('verifying')
    try {
      const res = await fetch(`https://api.chess.com/pub/player/${username}`)
      const isVerified = res.ok
      setVerificationState(isVerified ? 'verified' : 'invalid')
      return isVerified
    } catch {
      setVerificationState('invalid')
      return false
    }
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
    const trimmedChessComUsername = chessComUsername.trim()
    const trimmedLichessUsername = lichessUsername.trim()

    if (!name || !phoneNumber) {
      toast.error('Display name and phone number are required')
      return
    }

    if (chessPlatform === 'chess.com') {
      if (!trimmedChessComUsername) {
        toast.error('Chess.com username is required')
        return
      }

      if (verificationState !== 'verified') {
        const verified = await verifyChessComUsername()
        if (!verified) {
          toast.error('Chess.com account not found. Check your username.')
          return
        }
      }
    }

    if (chessPlatform === 'lichess' && !trimmedLichessUsername) {
      toast.error('Lichess username is required')
      return
    }

    const finalDisplayName =
      chessPlatform === 'chess.com' && trimmedChessComUsername
        ? trimmedChessComUsername
        : chessPlatform === 'lichess' && trimmedLichessUsername
          ? trimmedLichessUsername
          : name

    try {
      await registerMutation.mutateAsync({
        display_name: finalDisplayName,
        phone_number: phoneNumber,
        whatsapp_id: null,
        role,
        chess_platform: chessPlatform,
        chess_com_username: chessPlatform === 'chess.com' ? trimmedChessComUsername : null,
        lichess_username: chessPlatform === 'lichess' ? trimmedLichessUsername : null,
      })

      toast.success('Account created! Please sign in.')
      setMode('login')
      setDisplayName('')
      setRole('player')
      setChessPlatform('chess.com')
      setChessComUsername('')
      setLichessUsername('')
      setVerificationState('idle')
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
            <Label htmlFor="chessPlatform">Chess Platform</Label>
            <Select value={chessPlatform} onValueChange={(value) => setChessPlatform(value as ChessPlatform)}>
              <SelectTrigger id="chessPlatform" className="w-full">
                <SelectValue placeholder="Select your chess platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chess.com">Chess.com</SelectItem>
                <SelectItem value="lichess">Lichess</SelectItem>
                <SelectItem value="over_the_board">Over the Board</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the platform where you play chess.
            </p>
          </div>

          {chessPlatform === 'chess.com' && (
            <div className="space-y-2">
              <Label htmlFor="chessComUsername">Chess.com Username</Label>
              <div className="relative">
                <Input
                  id="chessComUsername"
                  placeholder="Your Chess.com username"
                  value={chessComUsername}
                  onChange={(e) => {
                    setChessComUsername(e.target.value)
                    setVerificationState('idle')
                  }}
                  onBlur={verifyChessComUsername}
                  className={
                    verificationState === 'verified'
                      ? 'pr-10 border-green-500'
                      : verificationState === 'invalid'
                        ? 'pr-10 border-red-500'
                        : ''
                  }
                />
                {verificationState === 'verified' && (
                  <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                )}
                {verificationState === 'invalid' && (
                  <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                )}
                {verificationState === 'verifying' && (
                  <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                )}
              </div>
              {verificationState === 'verified' && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Chess.com account verified
                </p>
              )}
              {verificationState === 'invalid' && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Chess.com account not found
                </p>
              )}
            </div>
          )}

          {chessPlatform === 'lichess' && (
            <div className="space-y-2">
              <Label htmlFor="lichessUsername">Lichess Username</Label>
              <Input
                id="lichessUsername"
                placeholder="Your Lichess username"
                value={lichessUsername}
                onChange={(e) => setLichessUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter your Lichess username. No verification required.
              </p>
            </div>
          )}

          {chessPlatform === 'over_the_board' && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Over the board games are scored manually by the tournament admin
              </p>
            </div>
          )}

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
