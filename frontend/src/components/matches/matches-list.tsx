'use client'

import { Download, Loader2, SkipForward, Trophy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { MatchCard } from '@/src/components/matches/match-card'
import { RoundNavigation, type MatchFilter } from '@/src/components/matches/round-navigation'
import { downloadFixturesPdf } from '@/src/lib/fixture-export'
import { ApiError } from '@/src/types/api'
import type { Competition } from '@/src/types/competition'
import type { Match, MatchStatus } from '@/src/types/match'

interface MatchesListProps {
  matches: Match[]
  competition: Competition
  currentRound: number
  onRoundChange: (round: number) => void
  onViewStandings: () => void
  totalRounds: number
  competitionName: string
  renderMatchActions?: (match: Match) => React.ReactNode
  /** Advance-round controls */
  canAdvance?: boolean
  currentRoundNumber?: number
  advancePending?: boolean
  advanceWithPending?: boolean
  onAdvanceWithPendingChange?: (v: boolean) => void
  onAdvanceRound?: () => void
}

export function MatchesList({
  matches,
  competition,
  currentRound,
  onRoundChange,
  onViewStandings,
  totalRounds,
  competitionName,
  renderMatchActions,
  canAdvance,
  currentRoundNumber,
  advancePending,
  advanceWithPending,
  onAdvanceWithPendingChange,
  onAdvanceRound,
}: MatchesListProps) {
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all')

  // Download the full fixture list as a PDF — one round per page (same as admin).
  async function handleDownloadFixtures() {
    if (matches.length === 0) {
      toast.error('No fixtures to download')
      return
    }
    try {
      await downloadFixturesPdf({ competition, matches })
      toast.success('Fixtures downloaded')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to download fixtures')
    }
  }

  // Unique sorted round numbers from data
  const roundNumbers = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b)

  // Matches for the selected round
  const roundMatches = matches.filter((m) => m.round_number === currentRound)

  // Apply status filter on top of round filter
  const visibleMatches =
    activeFilter === 'all'
      ? roundMatches
      : roundMatches.filter((m) => {
          if (activeFilter === 'pending') return m.match_status === 'pending'
          if (activeFilter === 'completed') return m.match_status === 'completed'
          if (activeFilter === 'disputed') return m.match_status === 'disputed'
          return true
        })

  // Progress: completed non-bye matches across ALL rounds
  const completedMatches = matches.filter(
    (m) => m.match_status === 'completed' && !m.is_bye
  ).length
  const totalPlayable = matches.filter((m) => !m.is_bye).length
  const progressPercent =
    totalPlayable > 0 ? Math.round((completedMatches / totalPlayable) * 100) : 0

  return (
    <Card className="rounded-2xl shadow-sm">
      {/* ── Header ── */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Matches</CardTitle>
            <CardDescription className="mt-0.5 text-sm">
              Round {currentRound} — {roundMatches.length} match(es)
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Round tabs + filter dropdown ── */}
        {roundNumbers.length > 0 && (
          <RoundNavigation
            rounds={roundNumbers}
            currentRound={currentRound}
            onRoundChange={(r) => {
              onRoundChange(r)
              setActiveFilter('all') // reset filter on round change
            }}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        )}

        {/* ── Progress bar ── */}
        {totalPlayable > 0 && (
          <div className="flex items-center gap-3">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {completedMatches}/{totalPlayable} matches completed
            </span>
          </div>
        )}

        {/* ── Match cards grid ── */}
        {visibleMatches.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">No matches found.</p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                actions={renderMatchActions?.(match)}
              />
            ))}
          </div>
        )}

        {/* ── Advance Round inline controls (if active) ── */}
        {canAdvance && onAdvanceRound && (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={advanceWithPending}
                onChange={(e) => onAdvanceWithPendingChange?.(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-muted-foreground">
                Include pending matches when advancing
              </span>
            </label>
            <Button
              onClick={onAdvanceRound}
              disabled={advancePending}
              variant="outline"
              size="sm"
              className="w-full gap-2 rounded-xl"
            >
              {advancePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SkipForward className="size-4" />
              )}
              {(currentRoundNumber ?? currentRound) >= totalRounds
                ? 'Complete Tournament'
                : `Advance to Round ${(currentRoundNumber ?? currentRound) + 1}`}
            </Button>
          </div>
        )}

        {/* ── Bottom action row ── */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button
            onClick={onViewStandings}
            size="sm"
            className="gap-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
          >
            <Trophy className="size-4" />
            View Standings
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadFixtures}
            size="sm"
            className="gap-2 rounded-xl"
          >
            <Download className="size-4" />
            Download All Fixtures
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}