'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Match } from '@/src/types/match'
import { MatchResultDialog } from '@/src/components/matches/match-result-dialog'

interface PlayerDoubleLegViewProps {
  matches: Match[]
  currentRound: number
  currentUser: { id: string } | null
  submittedMatchIds: Set<string>
  onSuccess: (updatedMatch: Match) => void
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

export function PlayerDoubleLegView({
  matches,
  currentRound,
  currentUser,
  submittedMatchIds,
  onSuccess,
}: PlayerDoubleLegViewProps) {
  const [dialogMatch, setDialogMatch] = useState<Match | null>(null)

  // Group matches by leg1+leg2 pairs
  function getPairedMatches(): { leg1: Match; leg2: Match }[] {
    const paired: { leg1: Match; leg2: Match }[] = []
    const used = new Set<string>()

    for (const match of matches) {
      if (used.has(match.id)) continue
      if (match.leg !== 1) continue

      const leg2 = matches.find(
        (m) =>
          m.id !== match.id &&
          !used.has(m.id) &&
          m.leg === 2 &&
          m.player_a_id === match.player_b_id &&
          m.player_b_id === match.player_a_id
      )

      if (leg2) {
        used.add(match.id)
        used.add(leg2.id)
        paired.push({ leg1: match, leg2 })
      }
    }

    return paired
  }

  const pairs = getPairedMatches()
  const unpaired = matches.filter((m) => !pairs.some((p) => p.leg1.id === m.id || p.leg2.id === m.id))

  function shouldShowSubmit(match: Match): boolean {
    if (submittedMatchIds.has(match.id)) return false
    if (match.is_bye || match.match_status !== 'pending') return false
    if (!currentUser) return false
    const isParticipant = match.player_a_id === currentUser.id || match.player_b_id === currentUser.id
    if (!isParticipant) return false
    return true
  }

  /** Returns which games the current player can submit */
  function getSubmitState(leg1: Match, leg2: Match) {
    return { leg1: shouldShowSubmit(leg1), leg2: shouldShowSubmit(leg2) }
  }

  /** Returns the result label for a leg */
  function getLegStatus(match: Match): { label: string; className: string } | null {
    if (match.match_status === 'pending') return null
    if (match.match_status === 'result_submitted') return { label: 'Submitted', className: 'bg-purple-100 text-purple-700 border-purple-200' }
    if (match.match_status === 'completed' && match.result_winner) {
      const label = match.result_winner === 'draw' ? 'Draw'
        : match.result_winner === 'a'
          ? `${match.player_a?.display_name || 'A'} wins`
          : `${match.player_b?.display_name || 'B'} wins`
      return { label, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    }
    return { label: match.match_status, className: 'bg-gray-100 text-gray-500 border-gray-200' }
  }

  return (
    <>
      {/* Double-leg pairs */}
      <div className="grid gap-4 sm:grid-cols-2">
        {pairs.map(({ leg1, leg2 }) => {
          const playerAName = leg1.player_a?.display_name || `Player #${leg1.player_a_id?.slice(0, 6)}`
          const playerBName = leg1.player_b?.display_name || `Player #${leg1.player_b_id?.slice(0, 6)}`
          const submit = getSubmitState(leg1, leg2)

          return (
            <div key={`dl-${leg1.id}`} className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Round {currentRound}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700">
                    Double Game
                  </Badge>
                </div>
              </div>

              {/* Players row */}
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

              {/* Game 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Game 1</span>
                  {leg1.chess_game_link && (
                    <a href={leg1.chess_game_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline">
                      View Game <ExternalLink className="size-2.5" />
                    </a>
                  )}
                </div>
                {submit.leg1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-xs"
                    onClick={() => setDialogMatch(leg1)}
                  >
                    Submit Result
                  </Button>
                ) : (() => {
                  const status = getLegStatus(leg1)
                  return status ? (
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium border', status.className)}>
                        {status.label}
                      </span>
                    </div>
                  ) : (
                    <div className="px-2 py-1.5 text-[10px] text-muted-foreground italic">
                      {currentUser && (leg1.player_a_id === currentUser.id || leg1.player_b_id === currentUser.id)
                        ? 'Waiting for opponent to play'
                        : 'Waiting for players'}
                    </div>
                  )
                })()}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-100" />

              {/* Game 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Game 2</span>
                  {leg2.chess_game_link && (
                    <a href={leg2.chess_game_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline">
                      View Game <ExternalLink className="size-2.5" />
                    </a>
                  )}
                </div>
                {submit.leg2 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-xs"
                    onClick={() => setDialogMatch(leg2)}
                  >
                    Submit Result
                  </Button>
                ) : (() => {
                  const status = getLegStatus(leg2)
                  return status ? (
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium border', status.className)}>
                        {status.label}
                      </span>
                    </div>
                  ) : (
                    <div className="px-2 py-1.5 text-[10px] text-muted-foreground italic">
                      {currentUser && (leg2.player_a_id === currentUser.id || leg2.player_b_id === currentUser.id)
                        ? 'Waiting for opponent to play'
                        : 'Waiting for players'}
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}

        {/* Unpaired single matches */}
        {unpaired.map((match) => {
          const playerAName = match.player_a?.display_name || `Player #${match.player_a_id?.slice(0, 6)}`
          const playerBName = match.player_b?.display_name || `Player #${match.player_b_id?.slice(0, 6)}`
          const showSubmit = shouldShowSubmit(match)

          return (
            <div key={match.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Round {currentRound}
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-gray-800">{playerAName}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="truncate text-sm font-semibold text-gray-800 text-right">{playerBName}</span>
              </div>
              {showSubmit ? (
                <Button variant="outline" size="sm" className="w-full h-9 text-xs" onClick={() => setDialogMatch(match)}>
                  Submit Result
                </Button>
              ) : (() => {
                const status = getLegStatus(match)
                return status ? (
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium border self-start', status.className)}>
                    {status.label}
                  </span>
                ) : <div className="text-[10px] text-muted-foreground italic">Pending</div>
              })()}
            </div>
          )
        })}
      </div>

      {/* Submit dialog */}
      {dialogMatch && currentUser && (
        <MatchResultDialog
          open={!!dialogMatch}
          onClose={() => setDialogMatch(null)}
          match={dialogMatch}
          userId={currentUser.id}
          onSuccess={onSuccess}
        />
      )}
    </>
  )
}