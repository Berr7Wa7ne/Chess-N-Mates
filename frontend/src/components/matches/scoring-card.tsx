'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Crown, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Match, ResultWinner, AutoCandidate } from '@/src/types/match'
import { useAdminScore, useConfirmResult, useForceResult, useMarkAbsent } from '@/src/hooks/useMatches'
import { useAuth } from '@/src/hooks/useAuth'
import { ApiError } from '@/src/types/api'
import { ChangeResultModal } from '@/src/components/matches/change-result-modal'
import { FileDisputeModal } from '@/src/components/matches/file-dispute-modal'
import { MatchOddsBanter } from '@/src/components/matches/match-odds-banter'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
  if (winner === 'both') return 'Both awarded a win (2 pts each)'
  return 'Draw'
}

function ResultSourceBadge({ match }: { match: Match }) {
  if (match.needs_review) {
    return (
      <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800">
        Needs review
      </Badge>
    )
  }
  if (match.result_source === 'chess_com_auto') {
    return (
      <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700">
        Auto
      </Badge>
    )
  }
  if (match.result_source === 'absent_auto') {
    return (
      <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700">
        Auto absent
      </Badge>
    )
  }
  if (match.result_source === 'player_submit') {
    return (
      <Badge variant="outline" className="text-[10px] border-purple-200 bg-purple-50 text-purple-700">
        Player
      </Badge>
    )
  }
  return null
}

function GameLinkPreview({ url }: { url?: string | null }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="size-3" />
      View game on Chess.com
    </a>
  )
}

function NeedsReviewPanel({
  candidates,
  onApply,
  disabled,
}: {
  candidates: AutoCandidate[]
  onApply: (candidate: AutoCandidate) => void
  disabled?: boolean
}) {
  if (!candidates?.length) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 space-y-2">
      <p className="text-[11px] font-semibold text-amber-900">
        Multiple Chess.com games found — pick the correct result:
      </p>
      <ul className="space-y-1.5">
        {candidates.map((c) => (
          <li key={c.url} className="flex flex-wrap items-center gap-2 text-[11px]">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate max-w-[200px]"
            >
              {c.url.replace(/^https?:\/\//, '')}
            </a>
            <span className="text-muted-foreground">
              → {c.result_winner === 'draw' ? 'Draw' : `${c.result_winner.toUpperCase()} wins`}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9 px-3 text-xs"
              disabled={disabled}
              onClick={() => onApply(c)}
            >
              Use this
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
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
  const markAbsentMutation = useMarkAbsent()
  const { user } = useAuth()

  const [changeModalOpen, setChangeModalOpen] = useState(false)
  const [pendingNewResult, setPendingNewResult] = useState<ResultWinner | null>(null)
  const [loadingButton, setLoadingButton] = useState<ResultWinner | null>(null)
  const [changeReason, setChangeReason] = useState('')
  const [disputeModalOpen, setDisputeModalOpen] = useState(false)

  // Track absent sides as a Set to allow both to be selected independently
  const [absentSides, setAbsentSides] = useState<Set<'a' | 'b'>>(new Set())
  // Shows warning banner above the round label when hinting at both-absent
  const [showBothAbsentWarning, setShowBothAbsentWarning] = useState(false)
  // Confirmation dialog for both-absent
  const [bothAbsentConfirmOpen, setBothAbsentConfirmOpen] = useState(false)
  // Optimistic state: immediately show absent view after save without waiting for refetch
  const [optimisticAbsent, setOptimisticAbsent] = useState<{ is_both_absent: boolean; absence_side: 'both' } | null>(null)

  const isBye = match.is_bye
  const isAbsent = match.is_absent || optimisticAbsent !== null
  const isBothAbsent = match.is_both_absent || match.absence_side === 'both' || optimisticAbsent?.is_both_absent === true
  const isDisputed = match.match_status === 'disputed'
  const isPending = match.match_status === 'pending' || match.match_status === 'ongoing'
  const isResultSubmitted = match.match_status === 'result_submitted'
  const isCompleted = match.match_status === 'completed'
  const isScored = match.match_status === 'completed' || match.match_status === 'result_submitted'
  const isReadOnly = disabled

  const currentResult = match.result_winner

  const playerAName = match.player_a?.display_name || `Player #${match.player_a_id?.slice(0, 6)}`
  const playerBName = match.player_b?.display_name || `Player #${match.player_b_id?.slice(0, 6)}`

  const handleApplyCandidate = useCallback(
    async (candidate: AutoCandidate) => {
      if (isReadOnly) return
      setLoadingButton(candidate.result_winner)
      try {
        await forceMutation.mutateAsync({
          id: match.id,
          payload: {
            result_winner: candidate.result_winner,
            chess_game_link: candidate.url,
            reason: 'Applied from Chess.com auto-candidates',
          },
        })
        toast.success('Result applied from Chess.com candidate')
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : 'Failed to apply candidate')
      } finally {
        setLoadingButton(null)
      }
    },
    [forceMutation, isReadOnly, match.id]
  )

  const handleScore = useCallback(
    async (winner: ResultWinner) => {
      if (isReadOnly) return

      // Determine the final absence side from the set
      const finalAbsenceSide = absentSides.size === 2 ? 'both'
        : absentSides.size === 1 ? [...absentSides][0]
        : null

      // Pending/ongoing: admin-score immediately
      if (isPending) {
        setLoadingButton(winner)
        try {
          await adminScoreMutation.mutateAsync({
            id: match.id,
            payload: {
              result_winner: winner,
              is_absent: finalAbsenceSide !== null,
              absence_side: finalAbsenceSide || undefined,
            },
          })
          toast.success('Result saved')
          setAbsentSides(new Set())
          setShowBothAbsentWarning(false)
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
    [match.id, isReadOnly, isPending, isResultSubmitted, isCompleted, currentResult, adminScoreMutation, confirmResultMutation, absentSides]
  )

  const handleConfirmChange = useCallback(async () => {
    if (!pendingNewResult) return
    setLoadingButton(pendingNewResult)
    try {
      await forceMutation.mutateAsync({
        id: match.id,
        payload: {
          result_winner: pendingNewResult,
          reason: changeReason,
          is_absent: absentSides.size > 0,
          absence_side: absentSides.size === 2 ? 'both' : (absentSides.size === 1 ? [...absentSides][0] : undefined),
        },
      })
      toast.success('Result updated')

      setChangeModalOpen(false)
      setPendingNewResult(null)
      setChangeReason('')
      setAbsentSides(new Set())
      setShowBothAbsentWarning(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to update result')
    } finally {
      setLoadingButton(null)
    }
  }, [match.id, pendingNewResult, forceMutation, changeReason, absentSides])

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

  // ── Absent toggle logic ─────────────────────────────────
  const toggleAbsent = useCallback((side: 'a' | 'b') => {
    setAbsentSides(prev => {
      const next = new Set(prev)
      if (next.has(side)) {
        // Removing this side
        next.delete(side)
        setShowBothAbsentWarning(false)
      } else {
        next.add(side)
        if (next.size === 2) {
          // Both sides now selected → open confirmation dialog
          setBothAbsentConfirmOpen(true)
        } else {
          // First absent clicked → show toast message
          toast.info('Click the second absent radio button to mark both players as absent.')
        }
      }
      return next
    })
  }, [])

  const confirmBothAbsent = useCallback(async () => {
    setBothAbsentConfirmOpen(false)
    // Set optimistic state immediately so the card switches to absent view
    setOptimisticAbsent({ is_both_absent: true, absence_side: 'both' })
    setAbsentSides(new Set())
    setShowBothAbsentWarning(false)
    try {
      await markAbsentMutation.mutateAsync({
        id: match.id,
        payload: { absence_side: 'both' },
      })
      toast.success('Both players marked as absent — 0 points each.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to mark both absent')
      // Revert optimistic state on failure
      setOptimisticAbsent(null)
    }
  }, [match.id, markAbsentMutation])

  const cancelBothAbsent = useCallback(() => {
    setBothAbsentConfirmOpen(false)
    // Remove the second absent that was just added
    setAbsentSides(prev => {
      const next = new Set(prev)
      const arr = [...next]
      if (arr.length === 2) {
        next.delete(arr[1])
      }
      setShowBothAbsentWarning(false)
      return next
    })
  }, [])

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
    const absentLabel = isBothAbsent
      ? 'Both players were absent'
      : `${match.absence_side === 'a' ? playerAName : playerBName} was absent`
    return (
      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Round {match.round_number}
          </span>
          <Badge className={cn(
            'text-[11px] border',
            isBothAbsent
              ? 'bg-orange-100 text-orange-700 border-orange-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          )}>
            {isBothAbsent ? 'Both Absent' : 'Absent'}
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
          {absentLabel}
        </p>
      </div>
    )
  }

  // ── Dispute helpers ──────────────────────────────────────────
  const matchLabel = `${playerAName} vs ${playerBName}`.toUpperCase()

  // ── Absence radio button ─────────────────────────────────────
  function AbsenceRadio({ side, label }: { side: 'a' | 'b'; label: string }) {
    const isActive = absentSides.has(side)
    return (
      <button
        type="button"
        onClick={() => toggleAbsent(side)}
        disabled={isReadOnly || isScored}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-200 border',
          isActive
            ? 'bg-red-50 text-red-600 border-red-300'
            : 'bg-transparent text-muted-foreground/50 border-transparent hover:text-red-400 hover:border-red-200',
          (isReadOnly || isScored) && 'opacity-30 cursor-not-allowed'
        )}
      >
        <span className={cn(
          'flex size-3 items-center justify-center rounded-full border transition-colors',
          isActive ? 'border-red-500 bg-red-500' : 'border-muted-foreground/30'
        )}>
          {isActive && <span className="size-1.5 rounded-full bg-white" />}
        </span>
        <span>Absent</span>
      </button>
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
        <div className={cn('flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200', isCompleted ? 'opacity-70' : 'opacity-100')}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Round {match.round_number}
            </span>
            <div className="flex items-center gap-2">
              <ResultSourceBadge match={match} />
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  STATUS_STYLES[match.match_status] || STATUS_STYLES.pending
                )}
              >
                {isResultSubmitted ? 'Result Submitted' : 'Completed'}
              </span>
            </div>
          </div>

          <GameLinkPreview url={match.chess_game_link} />

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

          {/* Dispute button - centered below scoring buttons */}
          <div className="flex justify-center pt-1">
            <button
              onClick={() => setDisputeModalOpen(true)}
              disabled={isReadOnly}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200 animate-pulse disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="size-3.5" />
              File Dispute
            </button>
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

        {/* File Dispute Modal */}
        <FileDisputeModal
          open={disputeModalOpen}
          onClose={() => setDisputeModalOpen(false)}
          matchId={match.id}
          competitionId={competitionId}
          matchLabel={matchLabel}
          roundNumber={match.round_number}
        />
      </>
    )
  }

  // ── UNSCORED card (pending / ongoing) ─────────────────────────
  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:bg-gray-50/60">
        {/* ═══════ Both-absent warning banner ═══════ */}
        {showBothAbsentWarning && (
          <div className="-mx-5 -mt-5 rounded-t-2xl bg-orange-50 border-b border-orange-200 px-5 py-2.5">
            <p className="text-xs font-medium text-orange-700 text-center">
              Both players marked as absent. Both players will receive zero points.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Round {match.round_number}
          </span>
          <div className="flex items-center gap-2">
            <ResultSourceBadge match={match} />
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                STATUS_STYLES[match.match_status] || STATUS_STYLES.pending
              )}
            >
              {match.needs_review ? 'Needs review' : match.match_status === 'pending' ? 'Pending' : 'Ongoing'}
            </span>
          </div>
        </div>

        {match.needs_review && match.auto_candidates && (
          <NeedsReviewPanel
            candidates={match.auto_candidates}
            onApply={handleApplyCandidate}
            disabled={isReadOnly || forceMutation.isPending}
          />
        )}

        {/* Players row with absence radios above each name */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 flex-col items-center gap-1 min-w-0">
            <AbsenceRadio side="a" label={playerAName} />
            <div className="flex items-center gap-2">
              <ChessPiece />
              <span className="truncate text-sm font-semibold text-gray-800">{playerAName}</span>
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground self-center mt-5">vs</span>
          <div className="flex flex-1 flex-col items-center gap-1 min-w-0">
            <AbsenceRadio side="b" label={playerBName} />
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-800 text-right">{playerBName}</span>
              <ChessPiece />
            </div>
          </div>
        </div>

        {match.odds && <MatchOddsBanter odds={match.odds} />}

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

        {/* Dispute button - centered below scoring buttons */}
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setDisputeModalOpen(true)}
            disabled={isReadOnly}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200 animate-pulse disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="size-3.5" />
            File Dispute
          </button>
        </div>
      </div>

      {/* ═══════ Both-absent confirmation dialog ═══════ */}
      <Dialog open={bothAbsentConfirmOpen} onOpenChange={(open) => {
        if (!open) cancelBothAbsent()
      }}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark both players as absent?</DialogTitle>
            <DialogDescription>
              Both {playerAName} and {playerBName} will receive 0 points for this match.
              This action will immediately complete the match.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelBothAbsent} disabled={markAbsentMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={confirmBothAbsent}
              disabled={markAbsentMutation.isPending}
            >
              {markAbsentMutation.isPending ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
              ) : (
                'Confirm Both Absent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* File Dispute Modal */}
      <FileDisputeModal
        open={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        matchId={match.id}
        competitionId={competitionId}
        matchLabel={matchLabel}
        roundNumber={match.round_number}
      />
    </>
  )
}