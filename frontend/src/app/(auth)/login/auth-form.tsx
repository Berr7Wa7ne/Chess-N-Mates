'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import {
  AuthField,
  AuthInput,
  AuthPrimaryButton,
  AuthSegmented,
  AuthShell,
} from '@/src/components/auth/auth-shell'
import { getDashboardPath } from '@/src/lib/auth-storage'
import { normalizeNgPhone } from '@/src/lib/phone'
import { useLoginUser } from '@/src/hooks/useLoginUser'
import { useRegisterUser } from '@/src/hooks/useRegisterUser'
import { ApiError } from '@/src/types/api'
import type { ChessPlatform, UserRole } from '@/src/types/user'
import { cn } from '@/lib/utils'

type VerificationState = 'idle' | 'verifying' | 'verified' | 'invalid'
type SignInAs = 'player' | 'admin'

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

  const portalControl = (
    <AuthField
      label={mode === 'login' ? 'Enter as' : 'Register as'}
      hint={
        mode === 'login'
          ? 'Admins can also enter as Member to use the player app.'
          : undefined
      }
    >
      <AuthSegmented
        value={signInAs}
        onChange={setSignInAs}
        options={[
          { value: 'player', label: 'Member' },
          { value: 'admin', label: 'Admin' },
        ]}
      />
    </AuthField>
  )

  return (
    <AuthShell
      title={mode === 'login' ? 'Sign in' : 'Create account'}
      description={
        mode === 'login'
          ? 'Pick Member or Admin, then use your phone and password.'
          : 'Join tournaments with your phone number and a password.'
      }
      footer={
        <p className="text-center text-sm text-text-secondary">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-semibold text-text-primary underline-offset-2 hover:underline"
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
                className="font-semibold text-text-primary underline-offset-2 hover:underline"
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
          {portalControl}

          <AuthField label="Phone number" hint="+234, 234, or your 10-digit number.">
            <AuthInput
              id="phone"
              type="tel"
              placeholder="8148429834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </AuthField>

          <AuthField label="Password">
            <AuthInput
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </AuthField>

          {signInAs === 'admin' && (
            <AuthField label="Admin code">
              <AuthInput
                id="adminCode"
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                autoComplete="off"
                required
              />
            </AuthField>
          )}

          <AuthPrimaryButton type="submit" pending={isPending}>
            {loginMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Continue'
            )}
          </AuthPrimaryButton>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          {portalControl}

          <AuthField label="Display name">
            <AuthInput
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </AuthField>

          <AuthField label="Phone number">
            <AuthInput
              id="registerPhone"
              type="tel"
              placeholder="8148429834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </AuthField>

          <AuthField label="Password">
            <AuthInput
              id="registerPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </AuthField>

          <AuthField label="Confirm password">
            <AuthInput
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </AuthField>

          {signInAs === 'admin' && (
            <AuthField label="Admin code">
              <AuthInput
                id="registerAdminCode"
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                autoComplete="off"
                required
              />
            </AuthField>
          )}

          <AuthField label="Chess platform">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'chess.com', label: 'Chess.com' },
                  { value: 'lichess', label: 'Lichess' },
                  { value: 'over_the_board', label: 'OTB' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChessPlatform(option.value)}
                  className={cn(
                    'rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors',
                    chessPlatform === option.value
                      ? 'bg-bg-panel-dark text-white'
                      : 'bg-bg-panel-light text-text-secondary hover:text-text-primary'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </AuthField>

          {chessPlatform === 'chess.com' && (
            <AuthField label="Chess.com username">
              <div className="relative">
                <AuthInput
                  id="chessComUsername"
                  placeholder="Username"
                  value={chessComUsername}
                  onChange={(e) => {
                    setChessComUsername(e.target.value)
                    setVerificationState('idle')
                  }}
                  onBlur={verifyChessComUsername}
                  className={cn(
                    'pr-10',
                    verificationState === 'verified' && 'border-emerald-500',
                    verificationState === 'invalid' && 'border-red-500'
                  )}
                />
                {verificationState === 'verified' && (
                  <CheckCircle2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-emerald-600" />
                )}
                {verificationState === 'invalid' && (
                  <XCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-red-600" />
                )}
                {verificationState === 'verifying' && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-secondary" />
                )}
              </div>
            </AuthField>
          )}

          {chessPlatform === 'lichess' && (
            <AuthField label="Lichess username">
              <AuthInput
                id="lichessUsername"
                placeholder="Username"
                value={lichessUsername}
                onChange={(e) => setLichessUsername(e.target.value)}
              />
            </AuthField>
          )}

          {chessPlatform === 'over_the_board' && (
            <div className="rounded-2xl bg-bg-panel-light px-4 py-3 text-sm text-text-secondary">
              Over-the-board games are scored manually by the tournament admin.
            </div>
          )}

          <AuthPrimaryButton type="submit" pending={isPending}>
            {registerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </AuthPrimaryButton>
        </form>
      )}
    </AuthShell>
  )
}
