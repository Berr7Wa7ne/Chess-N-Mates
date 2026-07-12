'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Crown,
  Download,
  Loader2,
  SkipForward,
  Trophy,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RoundNavigation } from '@/src/components/matches/round-navigation'
import { ScoringCard } from '@/src/components/matches/scoring-card'
import { StandingsSidebar } from '@/src/components/standings/standings-sidebar'
import { ChampionModal } from '@/src/components/competitions/champion-modal'
import {
  useCompetition,
  useCompetitionStandings,
  useAdvanceRound,
} from '@/src/hooks/useCompetitions'
import { useCompetitionMatches } from '@/src/hooks/useMatches'
import { ApiError } from '@/src/types/api'
import type { Match } from '@/src/types/match'

export default function AdminCompetitionMatchesPage() {
  const params = useParams()
  const id = params.id as string

  const competitionQuery = useCompetition(id, !!id)
  const matchesQuery = useCompetitionMatches(id)
  const standingsQuery = useCompetitionStandings(id, !!id)
  const advanceMutation = useAdvanceRound()

  const [currentRound, setCurrentRound] = useState<number | null>(null)
  const [advancePendingModalOpen, setAdvancePendingModalOpen] = useState(false)
  const [championModalOpen, setChampionModalOpen] = useState(false)
  const [championDismissed, setChampionDismissed] = useState(false)

  const competition = competitionQuery.data
  const matches = matchesQuery.data || []
  const standings = standingsQuery.data || []

  // Set default round from competition data once loaded
  if (currentRound === null && competition?.current_round) {
    setCurrentRound(competition.current_round)
  }

  const effectiveRound = currentRound ?? competition?.current_round ?? 1

  const roundNumbers = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b)

  // Rounds are: past (< current_round), current (= current_round), future (> current_round)
  const competitionCurrentRound = competition?.current_round ?? 1

  // A round is "locked" if it is strictly greater than current_round
  const isViewingFutureRound = effectiveRound > competitionCurrentRound

  // Current round completion check
  // A round is complete when all non-bye matches are scored
  const currentRoundMatches = matches.filter(
    m => m.round_number === competitionCurrentRound
  )
  const pendingInCurrentRound = currentRoundMatches.filter(
    m => !m.is_bye &&
      (m.match_status === 'pending' || m.match_status === 'ongoing')
  ).length
  const allCurrentRoundComplete = pendingInCurrentRound === 0 &&
    currentRoundMatches.length > 0

  // Round matches
  const roundMatches = matches.filter((m) => m.round_number === effectiveRound)

  // Progress: completed non-bye matches across ALL rounds
  const completedMatches = matches.filter(
    (m) => m.match_status === 'completed' && !m.is_bye
  ).length
  const totalPlayable = matches.filter((m) => !m.is_bye).length
  const progressPercent =
    totalPlayable > 0 ? Math.round((completedMatches / totalPlayable) * 100) : 0

  const isLastRound = (competition?.current_round ?? 0) >= (competition?.rounds ?? 0)

  const canAdvance = competition?.competition_status === 'active'
  const isCompleted = competition?.competition_status === 'completed'
  const showGreenBar = effectiveRound === competitionCurrentRound && allCurrentRoundComplete
  const showAmberBar = effectiveRound === competitionCurrentRound && !allCurrentRoundComplete

  // Winner is rank #1 in standings
  const winner = standings.find(s => s.rank === 1) || null

  // Show champion modal when competition is completed and not dismissed
  const showChampion = isCompleted && !championDismissed && !!winner
  if (showChampion && !championModalOpen) {
    setChampionModalOpen(true)
  }

  async function handleAdvanceRoundWithPending() {
    try {
      const result = await advanceMutation.mutateAsync({
        id,
        payload: { include_pending_matches: true },
      })
      const data = result.data
      if (data.action === 'completed') {
        toast.success('Tournament completed! 🎉')
      } else {
        setCurrentRound(data.current_round)
        toast.success(
          `Advanced to round ${data.current_round} — ${data.fixtures_generated} fixtures generated`
        )
      }
      setAdvancePendingModalOpen(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to advance round')
    }
  }

  async function handleAdvanceRound() {
    try {
      const result = await advanceMutation.mutateAsync({ id })
      const data = result.data
      if (data.action === 'completed') {
        toast.success('Tournament completed! 🎉')
      } else {
        setCurrentRound(data.current_round)
        toast.success(
          `Advanced to round ${data.current_round} — ${data.fixtures_generated} fixtures generated`
        )
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to advance round')
    }
  }

  const handleDownloadFixtures = useCallback(() => {
    const tourneyType = competition?.tournament_type
    const isSwiss = tourneyType === 'swiss'
    const matchesToDownload = isSwiss
      ? matches.filter((m) => m.round_number === effectiveRound)
      : matches

    if (matchesToDownload.length === 0) {
      toast.error('No fixtures to download')
      return
    }
    const csv = [
      ['Round', 'Player A', 'Player B', 'Status', 'Result'].join(','),
      ...matchesToDownload.map((m: Match) =>
        [
          m.round_number,
          m.player_a?.display_name || m.player_a_id,
          m.is_bye ? 'BYE' : m.player_b?.display_name || m.player_b_id,
          m.match_status,
          m.result_winner || 'Pending',
        ].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = isSwiss ? `round-${effectiveRound}-fixtures` : 'all-fixtures'
    a.download = `${competition?.name || 'fixtures'}-${label}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Fixtures downloaded')
  }, [matches, competition, effectiveRound])

  if (!id) {
    return <p className="text-destructive">Invalid competition ID</p>
  }

  if (competitionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (competitionQuery.isError || !competition) {
    return (
      <div className="rounded-2xl border-destructive/50 border p-6">
        <p className="text-destructive">
          {competitionQuery.error instanceof ApiError
            ? competitionQuery.error.message
            : 'Competition not found'}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/competitions">Back to competitions</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-muted/30 min-h-screen -mx-6 px-6 py-6">
      <div className="space-y-6">
        {/* ── Navigation ── */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href={`/admin/competitions/${competition.id}`}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Overview
            </Link>
          </Button>
        </div>

        <PageHeader
          title={`${competition.name} — Matches`}
          subtitle={`${competition.tournament_type.replace(/_/g, ' ')} · Round ${competition.current_round} of ${competition.rounds}`}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* ════════════ LEFT COLUMN: Matches (no card wrapper) ════════════ */}
          <div className="space-y-4">
            {/* Matches heading with download button */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Matches</h2>
              {roundMatches.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadFixtures}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Download className="size-4" />
                  {competition.tournament_type === 'swiss'
                    ? `Round ${effectiveRound} Fixtures`
                    : 'All Fixtures'}
                </Button>
              )}
            </div>

            {/* Round navigation (directly on page) */}
            {roundNumbers.length > 0 && (
              <RoundNavigation
                rounds={roundNumbers}
                currentRound={effectiveRound}
                onRoundChange={setCurrentRound}
              />
            )}

            {/* Progress bar (directly on page) */}
            {totalPlayable > 0 && (
              <div className="flex items-center gap-3">
                <Progress value={progressPercent} className="h-2 flex-1" />
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {completedMatches}/{totalPlayable} matches completed
                </span>
              </div>
            )}

            {/* Future round banner */}
            {isViewingFutureRound && (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-3">
                <span className="text-muted-foreground text-lg">🔒</span>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Round {effectiveRound} hasn't started yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Complete Round {competitionCurrentRound} and advance to unlock this round
                  </p>
                </div>
              </div>
            )}

            {/* Match cards grid */}
            {roundMatches.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-10 text-center">
                <p className="text-sm font-medium text-muted-foreground">No matches found.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {roundMatches.map((match) => (
                  <ScoringCard
                    key={match.id}
                    match={match}
                    competitionId={competition.id}
                    disabled={
                      competition.competition_status === 'completed' ||
                      isViewingFutureRound
                    }
                  />
                ))}
              </div>
            )}

            {/* Spacer so content isn't hidden behind sticky bottom bar */}
            {canAdvance && <div className="h-24" />}
          </div>

          {/* ════════════ RIGHT COLUMN: Standings Sidebar ════════════ */}
          <StandingsSidebar
            standings={standings}
            competitionName={competition.name}
            tournamentType={competition.tournament_type}
            isLoading={standingsQuery.isLoading}
          />
        </div>
      </div>

      {/* ════════════ BOTTOM STICKY BAR ════════════ */}
      {canAdvance && !isCompleted && (effectiveRound === competitionCurrentRound) && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm shadow-[0_-2px_12px_rgba(0,0,0,0.08)] px-6 py-4">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4">
            {/* Left: status message */}
            {showAmberBar ? (
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  !
                </span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-amber-600">
                    {pendingInCurrentRound} matches
                  </span>
                  {' '}still pending in Round {effectiveRound}
                </span>
              </div>
            ) : showGreenBar ? (
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm">
                  ✔
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-emerald-600">
                    All results entered
                  </span>
                  {' · '}Round {effectiveRound} complete
                </span>
              </div>
            ) : null}

            {/* Right: action button */}
            {showAmberBar ? (
              <Button
                variant="outline"
                className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 gap-2"
                onClick={() => setAdvancePendingModalOpen(true)}
                disabled={advanceMutation.isPending}
              >
                <SkipForward className="size-4" />
                Advance with Pending
              </Button>
            ) : isLastRound ? (
              <Button
                className="rounded-xl bg-primary hover:bg-primary/90 gap-2"
                onClick={handleAdvanceRound}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trophy className="size-4" />
                )}
                Final Round — Complete Tournament
              </Button>
            ) : (
              <Button
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={handleAdvanceRound}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SkipForward className="size-4" />
                )}
                Advance to Round {(competition?.current_round ?? 0) + 1} →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Completed state in bottom bar */}
      {isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-6 py-4">
          <div className="mx-auto flex max-w-[1280px] items-center justify-center gap-2">
            <Crown className="size-5 text-amber-500" />
            <span className="text-sm font-medium text-foreground">Tournament complete</span>
          </div>
        </div>
      )}

      {/* ── Champion Modal (completed tournament) ── */}
      <ChampionModal
        open={championModalOpen}
        onClose={() => {
          setChampionModalOpen(false)
          setChampionDismissed(true)
        }}
        winner={winner}
        competitionName={competition?.name || ''}
      />

      {/* ── Advance with Pending Confirmation Dialog ── */}
      <Dialog open={advancePendingModalOpen} onOpenChange={setAdvancePendingModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Advance with pending matches?</DialogTitle>
            <DialogDescription>
              {pendingInCurrentRound} match{pendingInCurrentRound > 1 ? 'es' : ''} in Round {effectiveRound} {pendingInCurrentRound > 1 ? 'are' : 'is'} unscored.
              Unplayed matches will be marked as absent with a score of 0.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAdvancePendingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                setAdvancePendingModalOpen(false)
                handleAdvanceRoundWithPending()
              }}
              disabled={advanceMutation.isPending}
            >
              Advance Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
