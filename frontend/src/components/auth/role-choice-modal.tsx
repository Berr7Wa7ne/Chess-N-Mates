'use client'

import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, Swords } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UserRole } from '@/src/types/user'
import { cn } from '@/lib/utils'

interface RoleChoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  displayName: string
  /** Portal this account used last time (pre-selected / auto-continued). */
  lastRole: UserRole | null
  step: 'choose' | 'admin-code'
  pending: boolean
  error: string | null
  adminCode: string
  onAdminCodeChange: (value: string) => void
  onPickPlayer: () => void
  onPickAdmin: () => void
  onSubmitAdminCode: (e: React.FormEvent) => void
  onBack: () => void
}

const AUTO_CONTINUE_SECONDS = 3

/**
 * Shown after login when an account has both Admin and Member access.
 * The remembered portal auto-continues after a short countdown (Member path
 * only — the Admin path always waits for the admin code).
 */
export function RoleChoiceModal({
  open,
  onOpenChange,
  displayName,
  lastRole,
  step,
  pending,
  error,
  adminCode,
  onAdminCodeChange,
  onPickPlayer,
  onPickAdmin,
  onSubmitAdminCode,
  onBack,
}: RoleChoiceModalProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const autoContinue =
    open && step === 'choose' && !pending && lastRole === 'player'

  useEffect(() => {
    if (!autoContinue) {
      setSecondsLeft(null)
      return
    }
    setSecondsLeft(AUTO_CONTINUE_SECONDS)
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev === null ? null : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [autoContinue])

  useEffect(() => {
    if (secondsLeft !== null && secondsLeft <= 0) {
      onPickPlayer()
    }
  }, [secondsLeft, onPickPlayer])

  const cancelAutoContinue = () => setSecondsLeft(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDown={cancelAutoContinue}
        className="gap-0 overflow-hidden rounded-none border-0 bg-bg-shell p-0 text-text-primary shadow-2xl sm:max-w-md sm:rounded-[24px]"
      >
        <DialogHeader className="flex flex-col items-start gap-1 border-b border-border-subtle px-5 py-5 text-left sm:px-7">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Welcome back, {displayName}!
          </DialogTitle>
          <DialogDescription className="text-sm text-text-secondary">
            This account has both Admin and Member access. Where do you want to go?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5 sm:px-7">
          {step === 'choose' ? (
            <div className="space-y-3">
              <RoleButton
                icon={Swords}
                title="Continue as Member"
                subtitle="Player dashboard, matches and tournaments"
                badge={lastRole === 'player' ? 'Last time' : undefined}
                preselected={lastRole === 'player'}
                onClick={onPickPlayer}
                disabled={pending}
              />
              <RoleButton
                icon={ShieldCheck}
                title="Continue as Admin"
                subtitle="Admin console — competitions, members, disputes"
                badge={lastRole === 'admin' ? 'Last time' : undefined}
                preselected={lastRole === 'admin'}
                onClick={onPickAdmin}
                disabled={pending}
              />
              {secondsLeft !== null && secondsLeft > 0 ? (
                <p className="text-center text-xs text-text-secondary">
                  Continuing as Member in {secondsLeft}s — tap anywhere to change
                </p>
              ) : null}
            </div>
          ) : (
            <form onSubmit={onSubmitAdminCode} className="space-y-3">
              <label
                htmlFor="roleAdminCode"
                className="block text-[13px] font-semibold text-text-primary"
              >
                Admin code
              </label>
              <input
                id="roleAdminCode"
                type="password"
                value={adminCode}
                onChange={(e) => onAdminCodeChange(e.target.value)}
                autoComplete="off"
                autoFocus
                required
                className="h-12 w-full rounded-xl border border-border-subtle bg-bg-panel-light px-4 text-[15px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:border-text-primary/25"
                placeholder="Enter the admin code"
              />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent-gold text-sm font-bold text-text-primary transition-opacity disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Enter admin portal'
                )}
              </button>
              <button
                type="button"
                onClick={onBack}
                disabled={pending}
                className="w-full text-center text-sm font-semibold text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
              >
                Back
              </button>
            </form>
          )}

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RoleButton({
  icon: Icon,
  title,
  subtitle,
  badge,
  preselected,
  onClick,
  disabled,
}: {
  icon: typeof Swords
  title: string
  subtitle: string
  badge?: string
  preselected?: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all disabled:opacity-60',
        preselected
          ? 'border-accent-gold bg-accent-gold/10'
          : 'border-border-subtle bg-bg-panel-light hover:border-text-primary/30'
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-panel-dark text-white">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold text-text-primary">
          {title}
          {badge ? (
            <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-gold-dim">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-text-secondary">{subtitle}</span>
      </span>
    </button>
  )
}
