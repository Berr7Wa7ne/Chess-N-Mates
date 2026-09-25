'use client'

import { Clock, ExternalLink } from 'lucide-react'
import type { Match, MatchStatus } from '@/src/types/match'
import { MatchOddsBanter } from '@/src/components/matches/match-odds-banter'

interface MatchCardProps {
  match: Match
  actions?: React.ReactNode
}

// ── Status badge config ───────────────────────────────────────────

const STATUS_CONFIG: Record<
  MatchStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  ongoing: {
    label: 'Ongoing',
    className: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
  result_submitted: {
    label: 'Result Submitted',
    className: 'bg-purple-100 text-purple-700 border border-purple-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  disputed: {
    label: 'Disputed',
    className: 'bg-red-100 text-red-700 border border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-500 border border-gray-200',
  },
}

// ── Chess piece SVG (matches the image's ♟ icon) ─────────────────

function ChessPiece({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`size-5 text-gray-700 ${className}`}
      aria-hidden="true"
    >
      {/* Pawn shape */}
      <circle cx="12" cy="6" r="3" />
      <path d="M9 10h6l1.5 7H7.5L9 10z" />
      <rect x="6" y="17" width="12" height="2" rx="1" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function formatDeadline(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getWinnerLabel(match: Match): string | null {
  if (match.result_winner === 'a') return match.player_a?.display_name || 'Player A'
  if (match.result_winner === 'b') return match.player_b?.display_name || 'Player B'
  if (match.result_winner === 'draw') return 'Draw'
  if (match.result_winner === 'both') return 'Both win'
  return null
}

// ── Component ─────────────────────────────────────────────────────

export function MatchCard({ match, actions }: MatchCardProps) {
  const isBye = match.is_bye
  const statusCfg = STATUS_CONFIG[match.match_status] ?? STATUS_CONFIG.pending
  const winner = getWinnerLabel(match)
  const deadline = formatDeadline(match.deadline)

  // ── BYE card ──────────────────────────────────────────────────
  if (isBye) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Round {match.round_number}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 border border-gray-200">
            Cancelled
          </span>
        </div>

        {/* Player + BYE */}
        <div className="flex items-center justify-center gap-4 py-1">
          <div className="flex flex-col items-center gap-1">
            <ChessPiece />
            <span className="text-sm font-semibold text-gray-800">
              {match.player_a?.display_name || '—'}
            </span>
          </div>

          <span className="text-xs font-medium text-muted-foreground">vs</span>

          <div className="flex flex-col items-center gap-1">
            <ChessPiece className="opacity-25" />
            <span className="text-sm font-semibold italic text-muted-foreground">Bye</span>
          </div>
        </div>

        {/* Winner row (if completed) */}
        {winner && (
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-center">
            <span className="text-xs font-semibold text-emerald-700">
              Winner: {winner}
            </span>
          </div>
        )}
      </div>
    )
  }

  // ── Normal match card ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-50/60">
      {/* Header: Round label + Status badge */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Round {match.round_number}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusCfg.className}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Players row: icon + name — vs — name + icon */}
      <div className="flex items-center justify-between gap-2">
        {/* Player A */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <ChessPiece />
          <span className="truncate text-sm font-semibold text-gray-800">
            {match.player_a?.display_name || `Player #${match.player_a_id?.slice(0, 6)}`}
          </span>
        </div>

        {/* VS divider */}
        <span className="shrink-0 text-xs font-medium text-muted-foreground">vs</span>

        {/* Player B */}
        <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
          <span className="truncate text-sm font-semibold text-gray-800 text-right">
            {match.player_b?.display_name || `Player #${match.player_b_id?.slice(0, 6)}`}
          </span>
          <ChessPiece />
        </div>
      </div>

      {/* Win likelihood (pending / ongoing) */}
      {(match.match_status === 'pending' || match.match_status === 'ongoing') && match.odds && (
        <MatchOddsBanter odds={match.odds} />
      )}

      {/* Bottom row: winner badge / deadline / view game link */}
      <div className="flex items-center justify-between gap-2 min-h-[22px]">
        {/* Left side: winner badge OR deadline */}
        <div className="flex-1 min-w-0">
          {match.match_status === 'completed' && winner && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              Winner: {winner}
            </span>
          )}
          {match.match_status === 'pending' && deadline && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3 shrink-0" />
              Deadline: {deadline}
            </span>
          )}
          {match.match_status === 'result_submitted' && (
            <span className="text-[11px] text-muted-foreground">Awaiting confirmation</span>
          )}
          {match.match_status === 'disputed' && (
            <span className="text-[11px] text-red-600 font-medium">Under review</span>
          )}
        </div>

        {/* Right side: View Game link */}
        {match.chess_game_link && (
          <a
            href={match.chess_game_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
          >
            View Game
            <ExternalLink className="size-3" />
          </a>
        )}

        {/* Extra admin actions (passed in) */}
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
    </div>
  )
}