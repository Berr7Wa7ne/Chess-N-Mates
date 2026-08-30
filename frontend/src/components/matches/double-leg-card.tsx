'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Match, ResultWinner } from '@/src/types/match'
import { useAdminScore, useConfirmResult, useForceResult } from '@/src/hooks/useMatches'
import { ApiError } from '@/src/types/api'
import { ChangeResultModal } from '@/src/components/matches/change-result-modal'
import { FileDisputeModal } from '@/src/components/matches/file-dispute-modal'
import { MatchOddsBanter } from '@/src/components/matches/match-odds-banter'

interface DoubleLegCardProps {
  leg1: Match
  leg2: Match
  competitionId: string
  disabled?: boolean
}

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

/** Small status badge for a leg's result */
function LegResultBadge({ match }: { match: Match }) {
  if (match.match_status === 'pending' || match.match_status === 'ongoing') return null

  if (match.match_status === 'result_submitted') {
    return (
      <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-medium border border-purple-200">
        Submitted
      </span>
    )
  }

  if (match.match_status === 'completed' && match.result_winner) {
    const label = match.result_winner === 'draw' ? 'Draw'
      : match.result_winner === 'a'
        ? `${match.player_a?.display_name || 'A'} wins`
        : `${match.player_b?.display_name || 'B'} wins`
    return (
      <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium border border-emerald-200">
        {label}
      </span>
    )
  }

  return null
}

export function DoubleLegCard({ leg1, leg2, competitionId, disabled }: DoubleLegCardProps) {
  const adminScoreMutation = useAdminScore(competitionId)
  const confirmResultMutation = useConfirmResult()
  const forceMutation = useForceResult(competitionId)

  const [changeModalOpen, setChangeModalOpen] = useState(false)
  const [pendingNewResult, setPendingNewResult] = useState<{ leg: 1 | 2; winner: ResultWinner } | null>(null)
  const [loadingButton, setLoadingButton] = useState<{ leg: 1 | 2; winner: ResultWinner } | null>(null)
  const [changeReason, setChangeReason] = useState('')
  const [disputeModalOpen, setDisputeModalOpen] = useState(false)

  const playerAName = leg1.player_a?.display_name || `Player #${leg1.player_a_id?.slice(0, 6)}`
  const playerBName = leg1.player_b?.display_name || `Player #${leg1.player_b_id?.slice(0, 6)}`
  const matchLabel = `${playerAName} vs ${playerBName}`.toUpperCase()

  const isReadOnly = disabled

  const handleScore = useCallback(
    async (leg: 1 | 2, winner: ResultWinner) => {
      if (isReadOnly) return
      const match = leg === 1 ? leg1 : leg2
      const isPending = match.match_status === 'pending' || match.match_status === 'ongoing'
      const isResultSubmitted = match.match_status === 'result_submitted'
      const currentResult = match.result_winner

      if (isPending) {
        setLoadingButton({ leg, winner })
        try {
          await adminScoreMutation.mutateAsync({
            id: match.id,
            payload: { result_winner: winner },
          })
          toast.success(`Game ${leg} saved`)
        } catch (error) {
          toast.error(error instanceof ApiError ? error.message : 'Failed to save result')
        } finally {
          setLoadingButton(null)
        }
        return
      }

      if (isResultSubmitted) {
        if (currentResult === winner) {
          setLoadingButton({ leg, winner })
          try {
            await confirmResultMutation.mutateAsync(match.id)
            toast.success('Result confirmed')
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : 'Failed to confirm')
          } finally {
            setLoadingButton(null)
          }
          return
        }
        setPendingNewResult({ leg, winner })
        setChangeModalOpen(true)
        return
      }

      if (match.match_status === 'completed') {
        if (currentResult === winner) return
        setPendingNewResult({ leg, winner })
        setChangeModalOpen(true)
      }
    },
    [leg1, leg2, isReadOnly, adminScoreMutation, confirmResultMutation]
  )

  const handleConfirmChange = useCallback(async () => {
    if (!pendingNewResult) return
    const match = pendingNewResult.leg === 1 ? leg1 : leg2
    setLoadingButton({ leg: pendingNewResult.leg, winner: pendingNewResult.winner })
    try {
      await forceMutation.mutateAsync({
        id: match.id,
        payload: { result_winner: pendingNewResult.winner, reason: changeReason },
      })
      toast.success('Result updated')
      setChangeModalOpen(false)
      setPendingNewResult(null)
      setChangeReason('')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to update')
    } finally {
      setLoadingButton(null)
    }
  }, [pendingNewResult, leg1, leg2, forceMutation, changeReason])

  function getWinnerLabel(winner: ResultWinner | null | undefined): string {
    if (!winner) return ''
    if (winner === 'a') return playerAName
    if (winner === 'b') return playerBName
    return 'Draw'
  }

  /** Render a single game row (scoring buttons for a leg) */
  function GameRow({ match, gameNumber }: { match: Match; gameNumber: 1 | 2 }) {
    const isPending = match.match_status === 'pending' || match.match_status === 'ongoing'
    const isScored = match.match_status === 'completed' || match.match_status === 'result_submitted'
    const currentResult = match.result_winner

    return (
      <div className="space-y-1.5">
        {/* Game header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Game {gameNumber}
          </span>
          {match.chess_game_link && (
            <a
              href={match.chess_game_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline"
            >
              View Game
              <ExternalLink className="size-2.5" />
            </a>
          )}
        </div>

        {/* Scoring buttons — full width, 3 columns */}
        {!isReadOnly && (
          <div className="flex gap-1.5">
            {(['a', 'draw', 'b'] as ResultWinner[]).map((winner) => {
              const isSelected = isScored && currentResult === winner
              const isLoading = loadingButton?.leg === gameNumber && loadingButton?.winner === winner
              const isChanging = forceMutation.isPending || confirmResultMutation.isPending || adminScoreMutation.isPending

              return (
                <button
                  key={winner}
                  onClick={() => handleScore(gameNumber, winner)}
                  disabled={isReadOnly || isChanging}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all border',
                    isSelected
                      ? winner === 'draw'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-muted-foreground border-border hover:bg-muted/50',
                    (isChanging || isLoading) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="mx-auto size-4 animate-spin" />
                  ) : isScored && isSelected ? (
                    getWinnerLabel(winner)
                  ) : winner === 'a' || winner === 'b' ? (
                    `Pick ${winner === 'a' ? playerAName : playerBName}`
                  ) : (
                    'Draw'
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Result badge for scored/submitted games */}
        {isScored && <LegResultBadge match={match} />}
      </div>
    )
  }

  // ── Render ──
  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Round {leg1.round_number}
            </span>
            <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700">
              Double Game
            </Badge>
          </div>
        </div>

        {/* Players row — shown once */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
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

        {(leg1.odds || leg2.odds) && (
          <MatchOddsBanter odds={leg1.odds || leg2.odds} />
        )}

        {/* Game rows — vertical stack */}
        <div className="space-y-4">
          <GameRow match={leg1} gameNumber={1} />
          <div className="border-t border-dashed border-gray-100" />
          <GameRow match={leg2} gameNumber={2} />
        </div>

        {/* Dispute button */}
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setDisputeModalOpen(true)}
            disabled={isReadOnly}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all animate-pulse disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="size-3" />
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
        matchLabel={matchLabel}
        roundNumber={leg1.round_number}
        currentResult={pendingNewResult ? getWinnerLabel(
          (pendingNewResult.leg === 1 ? leg1 : leg2).result_winner
        ) : '—'}
        newResult={pendingNewResult ? getWinnerLabel(pendingNewResult.winner) : '—'}
      />

      {/* File Dispute Modal */}
      <FileDisputeModal
        open={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        matchId={leg1.id}
        competitionId={competitionId}
        matchLabel={matchLabel}
        roundNumber={leg1.round_number}
      />
    </>
  )
}