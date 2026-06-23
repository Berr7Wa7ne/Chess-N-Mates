'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crown,
  Download,
  Loader2,
  SkipForward,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RoundNavigation } from '@/src/components/matches/round-navigation'
import { ScoringCard } from '@/src/components/matches/scoring-card'
import { StandingsSidebar } from '@/src/components/standings/standings-sidebar'
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
  const [advanceConfirmOpen, setAdvanceConfirmOpen] = useState(false)

  const competition = competitionQuery.data
  const matches = matchesQuery.data || []
  const standings = standingsQuery.data || []

  // Set default round from competition data once loaded
  if (currentRound === null && competition?.current_round) {
    setCurrentRound(competition.current_round)
  }

  const effectiveRound = currentRound ?? competition?.current_round ?? 1

  const roundNumbers = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b)

  // Round matches
  const roundMatches = matches.filter((m) => m.round_number === effectiveRound)

  // Progress: completed non-bye matches across ALL rounds
  const completedMatches = matches.filter(
    (m) => m.match_status === 'completed' && !m.is_bye
  ).length
  const totalPlayable = matches.filter((m) => !m.is_bye).length
  const progressPercent =
    totalPlayable > 0 ? Math.round((completedMatches / totalPlayable) * 100) : 0

  // Count pending non-bye matches in current round
  const pendingInRound = roundMatches.filter(
    (m) => !m.is_bye && m.match_status !== 'completed' && m.match_status !== 'result_submitted'
  ).length

  const isRoundComplete = pendingInRound === 0 && roundMatches.length > 0
  const canAdvance = competition?.competition_status === 'active'
  const isCompleted = competition?.competition_status === 'completed'

  async function handleAdvanceRound(includePending: boolean) {
    try {
      const result = await advanceMutation.mutateAsync({
        id,
        payload: includePending ? { include_pending_matches: true } : undefined,
      })
      const data = result.data
      if (data.action === 'completed') {
        toast.success('Tournament completed! 🎉')
      } else {
        toast.success(
          `Advanced to round ${data.current_round} — ${data.fixtures_generated} fixtures generated`
        )
        setCurrentRound(data.current_round)
      }
      setAdvanceConfirmOpen(false)
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
                    disabled={isCompleted}
                  />
                ))}
              </div>
            )}

            {/* Spacer so content isn't hidden behind sticky bottom bar */}
            {canAdvance && <div className="h-20" />}
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
      {canAdvance && !isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-6 py-4">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between">
            {isRoundComplete ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">
                    All results entered · Round {effectiveRound} complete
                  </span>
                </div>
                <Button
                  onClick={() => handleAdvanceRound(false)}
                  disabled={advanceMutation.isPending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {advanceMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SkipForward className="size-4" />
                  )}
                  {competition.current_round >= competition.rounds
                    ? 'Final Round — Complete Tournament'
                    : `Advance to Round ${competition.current_round + 1} →`}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">
                    {pendingInRound} match{pendingInRound !== 1 ? 'es' : ''} still pending in Round {effectiveRound}
                  </span>
                </div>
                <Button
                  onClick={() => setAdvanceConfirmOpen(true)}
                  disabled={advanceMutation.isPending}
                  variant="outline"
                  className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 gap-2"
                >
                  {advanceMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SkipForward className="size-4" />
                  )}
                  Advance with Pending →
                </Button>
              </>
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

      {/* ── Advance with Pending Confirmation Dialog ── */}
      <AlertDialog open={advanceConfirmOpen} onOpenChange={setAdvanceConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Advance with pending matches?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {pendingInRound} match{pendingInRound !== 1 ? 'es' : ''} in Round {effectiveRound} {pendingInRound !== 1 ? 'are' : 'is'} unscored.
              Unplayed matches will be marked as absent (score: 0).
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAdvanceRound(true)}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
            >
              Advance Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}