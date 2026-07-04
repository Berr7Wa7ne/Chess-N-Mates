'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Crown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Match, ResultWinner } from '@/src/types/match'
import { useAdminScore, useConfirmResult, useForceResult } from '@/src/hooks/useMatches'
import { useCreateDispute } from '@/src/hooks/useDisputes'
import { useAuth } from '@/src/hooks/useAuth'
import { ApiError } from '@/src/types/api'
import { ChangeResultModal } from '@/src/components/matches/change-result-modal'
import { Badge } from '@/components/ui/badge'

interface ScoringCardProps {
  match: Match
  competitionId: string
  disabled?: boolean
}

// ── Chess piece SVG ───────────────────────────────────────────────

function ChessPiece({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('size-5 text-gray-700', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="6" r="3" />
      <path d="M9 10h6l1.5 7H7.5L9 10z" />
      <rect x="6" y="17" width="12" height="2" rx="1" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function getResultLabel(winner: ResultWinner, match: Match): string {
  if (winner === 'a') return `${match.player_a?.display_name || 'Player A'} wins`
  if (winner === 'b') return `${match.player_b?.display_name || 'Player B'} wins`
  return 'Draw'
}

// ── Status badge config ───────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  ongoing: 'bg-blue-100 text-blue-700 border border-blue-200',
  result_submitted: 'bg-purple-100 text-purple-700 border border-purple-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  disputed: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
}

// ── ScoringCard Component ─────────────────────────────────────────

export function ScoringCard({ match, competitionId, disabled }: ScoringCardProps) {
  const adminScoreMutation = useAdminScore(competitionId)
  const confirmResultMutation = useConfirmResult()
  const forceMutation = useForceResult(competitionId)
  const createDisputeMutation = useCreateDispute()
  const { user } = useAuth()

  const [changeModalOpen, setChangeModalOpen] = useState(false)
  const [pendingNewResult, setPendingNewResult] = useState<ResultWinner | null>(null)
  const [loadingButton, setLoadingButton] = useState<ResultWinner | null>(null)
  const [changeReason, setChangeReason] = useState('')

  const isBye = match.is_bye
  const isAbsent = match.is_absent
  const isDisputed = match.match_status === 'disputed'
  const isPending = match.match_status === 'pending' || match.match_status === 'ongoing'
  const isResultSubmitted = match.match_status === 'result_submitted'
  const isCompleted = match.match_status === 'completed'
  const isScored = match.match_status === 'completed' || match.match_status === 'result_submitted'
  const isReadOnly = disabled

  const currentResult = match.result_winner

  const playerAName = match.player_a?.display_name || `Player #${match.player_a_id?.slice(0, 6)}`
  const playerBName = match.player_b?.display_name || `Player #${match.player_b_id?.slice(0, 6)}`

  const handleScore = useCallback(
    async (winner: ResultWinner) => {
      if (isReadOnly) return

      // Pending/ongoing: admin-score immediately
      if (isPending) {
        setLoadingButton(winner)
        try {
          await adminScoreMutation.mutateAsync({
            id: match.id,
            payload: { result_winner: winner },
          })
          toast.success('Result saved')
        } catch (error) {
          toast.error(error instanceof ApiError ? error.message : 'Failed to save result')
        } finally {
          setLoadingButton(null)
        }
        return
      }

      // Result submitted: click same -> confirm, click different -> modal
      if (isResultSubmitted) {
        if (currentResult === winner) {
          setLoadingButton(winner)
          try {
            await confirmResultMutation.mutateAsync(match.id)
            toast.success('Result confirmed')
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : 'Failed to confirm result')
          } finally {
            setLoadingButton(null)
          }
          return
        }
        setPendingNewResult(winner)
        setChangeModalOpen(true)
        return
      }

      // Completed: click same -> nothing, click different -> modal
      if (isCompleted) {
        if (currentResult === winner) return
        setPendingNewResult(winner)
        setChangeModalOpen(true)
      }
    },
    [match.id, isReadOnly, isPending, isResultSubmitted, isCompleted, currentResult, adminScoreMutation, confirmResultMutation]
  )

  const handleConfirmChange = useCallback(async () => {
    if (!pendingNewResult) return
    setLoadingButton(pendingNewResult)
    try {
      await forceMutation.mutateAsync({
        id: match.id,
        payload: { result_winner: pendingNewResult, reason: changeReason },
      })
      toast.success('Result updated')

      // Auto-create dispute record
      if (user) {
        await createDisputeMutation.mutateAsync({
          match_id: match.id,
          competition_id: competitionId,
          raised_by_user_id: user.id,
          category: 'other',
          reason: changeReason || 'Admin result correction',
          description: `Result changed from ${currentResult} to ${pendingNewResult}`,
          filed_by_role: 'admin',
        })
      }

      setChangeModalOpen(false)
      setPendingNewResult(null)
      setChangeReason('')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to update result')
    } finally {
      setLoadingButton(null)
    }
  }, [match.id, pendingNewResult, forceMutation, createDisputeMutation, user, competitionId, currentResult, changeReason])

  function getButtonLabel(winner: ResultWinner): string {
    // Scored: show names on the appropriate buttons
    if (isScored) {
      if (winner === 'a') return playerAName
      if (winner === 'b') return playerBName
      return 'Draw'
    }
    // Unscored: Pick / Draw / Pick
    if (winner === 'a' || winner === 'b') return 'Pick'
    return 'Draw'
  }

  function getButtonStyles(winner: ResultWinner): string {
    const isSelected = isScored && currentResult === winner
    const isLoading = loadingButton === winner
    const isChanging = forceMutation.isPending || confirmResultMutation.isPending || adminScoreMutation.isPending

    if (isReadOnly) {
      return cn(
        'flex-1 rounded-lg px-3 py-2 text-xs font-semibold border cursor-not-allowed opacity-50',
        isSelected ? 'bg-muted text-muted-foreground border-border' : 'bg-muted/30 text-muted-foreground border-border'
      )
    }

    if (isScored) {
      if (isSelected) {
        const color =
          winner === 'draw'
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-emerald-600 text-white border-emerald-600'
        return cn('flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 border', color, 'shadow-sm')
      }
      return cn(
        'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 border',
        'bg-card text-muted-foreground border-border hover:bg-muted/50',
        (isChanging || isLoading) && 'opacity-50 cursor-not-allowed'
      )
    }

    // Unscored
    return cn(
      'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 border',
      'bg-card border-border hover:bg-muted',
      (disabled || isChanging || isLoading) && 'opacity-50 cursor-not-allowed'
    )
  }

  // ── BYE match ─────────────────────────────────────────────────
  if (isBye) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Round {match.round_number}
          </span>
          <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-200 bg-emerald-100">
            BYE
          </Badge>
        </div>
        <div className="flex flex-col items-center gap-2 py-2">
          <Crown className="size-8 text-emerald-500" />
          <span className="text-sm font-bold text-gray-800">{playerAName}</span>
        </div>
        <p className="text-center text-sm italic text-emerald-600 font-medium">
          ✓ BYE ROUND — AUTO WIN
        </p>
      </div>
    )
  }

  // ── ABSENT match ──────────────────────────────────────────────
  if (isAbsent) {
    const absentPlayer = match.absence_side === 'a' ? playerAName : playerBName
    return (
      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Round {match.round_number}
          </span>
          <Badge className="bg-red-100 text-red-700 border border-red-200 text-[11px]">
            Absent
          </Badge>
        </div>
        <div className="flex items-center justify-center gap-4 py-1">
          <div className="flex flex-col items-center gap-1">
            <ChessPiece />
            <span className="text-sm font-semibold text-gray-800">{playerAName}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">vs</span>
          <div className="flex flex-col items-center gap-1">
            <ChessPiece />
            <span className="text-sm font-semibold text-gray-800">{playerBName}</span>
          </div>
        </div>
        <p className="text-center text-xs text-red-600 font-medium">
          {absentPlayer} was absent
        </p>
      </div>
    )
  }



  // ── SCORED CARD (result_submitted / completed) ───────────────
  if (isScored) {
    return (
      <>
        {isDisputed && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2">
            <span className="text-amber-600 dark:text-amber-400 text-sm">⚠</span>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Dispute filed — admin can still update result
            </p>
            <a
              href="/admin/disputes"
              className="ml-auto text-xs text-amber-600 hover:underline shrink-0 dark:text-amber-400"
              onClick={(e) => e.stopPropagation()}
            >
              View dispute →
            </a>
          </div>
        )}
        <div className={cn('group flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200', isCompleted ? 'opacity-70' : 'opacity-100')}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Round {match.round_number}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                STATUS_STYLES[match.match_status] || STATUS_STYLES.pending
              )}
            >
              {isResultSubmitted ? 'Result Submitted' : 'Completed'}
            </span>
          </div>

          {isResultSubmitted && (
            <p className="text-xs text-muted-foreground">
              Player submitted this result — click same to confirm, different to override
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <ChessPiece />
              <span className="truncate text-sm font-semibold text-foreground">{playerAName}</span>
            </div>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">vs</span>
            <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
              <span className="truncate text-sm font-semibold text-foreground text-right">{playerBName}</span>
              <ChessPiece />
            </div>
          </div>

          {/* Scoring buttons */}
        <div className="flex gap-2">
          {(['a', 'draw', 'b'] as ResultWinner[]).map((winner) => {
            const isLoading = loadingButton === winner
            return (
                <button
                  key={winner}
                  onClick={() => handleScore(winner)}
                  disabled={isReadOnly || adminScoreMutation.isPending || forceMutation.isPending || confirmResultMutation.isPending}
                  className={getButtonStyles(winner)}
                >
                  {isLoading ? (
                    <Loader2 className="mx-auto size-4 animate-spin" />
                  ) : (
                    getButtonLabel(winner)
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Change Result Modal */}
        <ChangeResultModal
          open={changeModalOpen}
          onClose={() => {
            setChangeModalOpen(false)
            setPendingNewResult(null)
          }}
          onConfirm={handleConfirmChange}
          isPending={forceMutation.isPending}
          matchLabel={`${playerAName.toUpperCase()} VS ${playerBName.toUpperCase()}`}
          roundNumber={match.round_number}
          currentResult={currentResult ? getResultLabel(currentResult, match) : '—'}
          newResult={pendingNewResult ? getResultLabel(pendingNewResult, match) : '—'}
        />
      </>
    )
  }

  // ── UNSCORED card (pending / ongoing) ─────────────────────────
  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:bg-gray-50/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Round {match.round_number}
          </span>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
              STATUS_STYLES[match.match_status] || STATUS_STYLES.pending
            )}
          >
            {match.match_status === 'pending' ? 'Pending' : 'Ongoing'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <ChessPiece />
            <span className="truncate text-sm font-semibold text-gray-800">{playerAName}</span>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">vs</span>
          <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
            <span className="truncate text-sm font-semibold text-gray-800 text-right">{playerBName}</span>
            <ChessPiece />
          </div>
        </div>

        {/* Scoring buttons: Pick | Draw | Pick */}
        <div className="flex gap-2">
          {(['a', 'draw', 'b'] as ResultWinner[]).map((winner) => {
            const isLoading = loadingButton === winner
            return (
              <button
                key={winner}
                onClick={() => handleScore(winner)}
                disabled={disabled || forceMutation.isPending}
                className={getButtonStyles(winner)}
              >
                {isLoading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" />
                ) : (
                  getButtonLabel(winner)
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Change Result Modal */}
      <ChangeResultModal
        open={changeModalOpen}
        onClose={() => {
          setChangeModalOpen(false)
          setPendingNewResult(null)
        }}
        onConfirm={handleConfirmChange}
        isPending={forceMutation.isPending}
        matchLabel={`${playerAName.toUpperCase()} VS ${playerBName.toUpperCase()}`}
        roundNumber={match.round_number}
        currentResult={currentResult ? getResultLabel(currentResult, match) : '—'}
        newResult={pendingNewResult ? getResultLabel(pendingNewResult, match) : '—'}
      />
    </>
  )
}
