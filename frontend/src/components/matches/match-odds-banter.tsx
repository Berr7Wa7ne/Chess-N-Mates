'use client'

import { cn } from '@/lib/utils'
import type { MatchOdds } from '@/src/types/match'

interface MatchOddsBanterProps {
  odds?: MatchOdds | null
  className?: string
  /** Compact bar only (no banter sentence). */
  compact?: boolean
}

/**
 * Match win likelihood bar + banter line for pending/ongoing fixtures.
 */
export function MatchOddsBanter({ odds, className, compact }: MatchOddsBanterProps) {
  if (!odds) return null

  const aStronger = odds.favorite === 'a'
  const bStronger = odds.favorite === 'b'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-2 text-[11px] tabular-nums">
        <span
          className={cn(
            'min-w-10 font-semibold',
            aStronger ? 'text-emerald-700' : 'text-muted-foreground'
          )}
        >
          {odds.win_pct_a}%
        </span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500/80"
            style={{ width: `${odds.win_pct_a}%` }}
          />
          <div
            className="absolute inset-y-0 bg-amber-400/70"
            style={{ left: `${odds.win_pct_a}%`, width: `${odds.draw_pct}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-sky-500/80"
            style={{ width: `${odds.win_pct_b}%` }}
          />
        </div>
        <span
          className={cn(
            'min-w-10 text-right font-semibold',
            bStronger ? 'text-sky-700' : 'text-muted-foreground'
          )}
        >
          {odds.win_pct_b}%
        </span>
      </div>
      {!compact && (
        <p className="text-[11px] leading-snug text-muted-foreground">{odds.banter}</p>
      )}
      {!compact && odds.h2h.played > 0 && (
        <p className="text-[10px] text-muted-foreground/80">
          Tournament H2H: {odds.h2h.wins_a}W–{odds.h2h.losses_a}L–{odds.h2h.draws}D
          <span className="mx-1">·</span>
          Draw {odds.draw_pct}%
        </p>
      )}
    </div>
  )
}
