'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle } from 'lucide-react'
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
import { normalizeNgPhone } from '@/src/lib/phone'
import { useLoginUser } from '@/src/hooks/useLoginUser'
import { useRegisterUser } from '@/src/hooks/useRegisterUser'
import { ApiError } from '@/src/types/api'
import type { ChessPlatform, UserRole } from '@/src/types/user'

type VerificationState = 'idle' | 'verifying' | 'verified' | 'invalid'
type SignInAs = 'player' | 'admin'

const CHESS_PLATFORMS: ChessPlatform[] = ['chess.com', 'lichess', 'over_the_board']

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loginMutation = useLoginUser()
  const registerMutation = useRegisterUser()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [signInAs, setSignInAs] = useState<SignInAs>('player')
  const [adminCode, setAdminCode] = useState('')
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
    if (!password) {
      toast.error('Please enter your password')
      return
    }
    if (signInAs === 'admin' && !adminCode.trim()) {
      toast.error('Admin code is required to sign in as admin')
      return
    }

    const normalized = normalizeNgPhone(phone)
    if (!normalized) {
      toast.error('Enter a valid Nigerian number (+234, 234, or 10 digits)')
      return
    }

    try {
      const user = await loginMutation.mutateAsync({
        phone: normalized,
        password,
        role: signInAs as UserRole,
        admin_code: signInAs === 'admin' ? adminCode.trim() : undefined,
      })
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
    const role: UserRole = signInAs

    if (!name || !phoneNumber) {
      toast.error('Display name and phone number are required')
      return
    }

    const normalized = normalizeNgPhone(phoneNumber)
    if (!normalized) {
      toast.error('Enter a valid Nigerian number (+234, 234, or 10 digits)')
      return
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (role === 'admin' && !adminCode.trim()) {
      toast.error('Admin code is required to register as admin')
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
        phone_number: normalized,
        whatsapp_id: null,
        role,
        password,
        admin_code: role === 'admin' ? adminCode.trim() : undefined,
        chess_platform: chessPlatform,
        chess_com_username: chessPlatform === 'chess.com' ? trimmedChessComUsername : null,
        lichess_username: chessPlatform === 'lichess' ? trimmedLichessUsername : null,
      })

      toast.success('Account created! Please sign in.')
      setMode('login')
      setDisplayName('')
      setPassword('')
      setConfirmPassword('')
      setAdminCode('')
      setSignInAs('player')
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
          ? 'Choose admin or member, then enter phone and password'
          : 'Register with a phone number and password'
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
            <Label>Signing in as</Label>
            <Select value={signInAs} onValueChange={(v) => setSignInAs(v as SignInAs)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+2348148429834 or 8148429834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
            <p className="text-xs text-muted-foreground">
              +234, 234, or your 10-digit number all work.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {signInAs === 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="adminCode">Admin code</Label>
              <Input
                id="adminCode"
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          )}

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
            <Label>Registering as</Label>
            <Select value={signInAs} onValueChange={(v) => setSignInAs(v as SignInAs)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              placeholder="+2348148429834 or 8148429834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registerPassword">Password</Label>
            <Input
              id="registerPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {signInAs === 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="registerAdminCode">Admin code</Label>
              <Input
                id="registerAdminCode"
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="chessPlatform">Chess Platform</Label>
            <Select
              value={chessPlatform}
              onValueChange={(value) => setChessPlatform(value as ChessPlatform)}
            >
              <SelectTrigger id="chessPlatform" className="w-full">
                <SelectValue placeholder="Select your chess platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chess.com">Chess.com</SelectItem>
                <SelectItem value="lichess">Lichess</SelectItem>
                <SelectItem value="over_the_board">Over the Board</SelectItem>
              </SelectContent>
            </Select>
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
