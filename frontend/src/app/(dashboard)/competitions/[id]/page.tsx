'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Globe,
  Loader2,
  MapPin,
  Play,
  Swords,
  SkipForward,
  Trophy,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CompetitionStatusBadge,
  TournamentTypeBadge,
} from '@/src/components/competitions/competition-badges'
import { MatchesList } from '@/src/components/matches/matches-list'
import { StandingsModal } from '@/src/components/standings/standings-modal'
import {
  useAdvanceRound,
  useCompetition,
  useCompetitionStandings,
  useStartCompetition,
} from '@/src/hooks/useCompetitions'
import { useCompetitionMatches } from '@/src/hooks/useMatches'
import { ApiError } from '@/src/types/api'
import type { Match } from '@/src/types/match'

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFormatRuleLabel(rule?: string | null): string {
  const map: Record<string, string> = {
    single_elimination: 'Single Elimination',
    two_game_match: 'Two-Game Match',
    single_game_per_round: 'Single Game per Round',
    two_game_round: 'Two-Game Round',
    single_leg: 'Single Game (1 Leg)',
    double_leg: 'Double Game (2 Legs)',
  }
  return rule ? map[rule] || rule.replace(/_/g, ' ') : 'Default'
}

// ─── Platform Display ─────────────────────────────────────────────

function PlatformDisplay({ platform }: { platform?: string | null }) {
  const colors: Record<string, string> = {
    'chess.com': 'text-green-600',
    lichess: 'text-amber-700',
    over_the_board: 'text-blue-600',
    others: 'text-muted-foreground',
  }
  return (
    <span
      className={`flex items-center gap-1.5 text-sm ${colors[platform ?? ''] || 'text-muted-foreground'}`}
    >
      <MapPin className="size-3.5" />
      {platform ? platform.replace(/_/g, ' ') : 'Not set'}
    </span>
  )
}

// ─── Rules List ───────────────────────────────────────────────────

function RulesList({ rules }: { rules?: string[] | null }) {
  if (!rules || rules.length === 0)
    return <span className="text-muted-foreground">No rules defined</span>
  return (
    <ul className="space-y-1">
      {rules.map((rule, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {i + 1}
          </span>
          {rule}
        </li>
      ))}
    </ul>
  )
}

// ─── Overview Row ─────────────────────────────────────────────────

function OverviewRow({
  label,
  children,
  last,
}: {
  label: React.ReactNode
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${last ? 'pb-3' : 'border-b pb-3'}`}>
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium">{children}</span>
    </div>
  )
}

// ─── Page Component ───────────────────────────────────────────────

export default function AdminCompetitionDetailPage() {
  const params = useParams()
  const id = params.id as string

  const competitionQuery = useCompetition(id, !!id)
  const standingsQuery = useCompetitionStandings(id, !!id)
  const matchesQuery = useCompetitionMatches(id)
  const startMutation = useStartCompetition()
  const advanceMutation = useAdvanceRound()

  const [currentRound, setCurrentRound] = useState(1)
  const [standingsOpen, setStandingsOpen] = useState(false)
  const [advanceWithPending, setAdvanceWithPending] = useState(false)

  const competition = competitionQuery.data

  async function handleStart() {
    try {
      const result = await startMutation.mutateAsync(id)
      toast.success(
        `Tournament started — ${result.data.fixtures_generated} fixtures generated`
      )
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to start tournament'
      )
    }
  }

  async function handleAdvanceRound() {
    try {
      const result = await advanceMutation.mutateAsync({
        id,
        payload: advanceWithPending ? { include_pending_matches: true } : undefined,
      })
      const data = result.data
      if (data.action === 'completed') {
        toast.success('Tournament completed! 🎉')
      } else {
        toast.success(
          `Advanced to round ${data.current_round} — ${data.fixtures_generated} fixtures generated`
        )
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to advance round'
      )
    }
  }

  const handleDownloadFixtures = useCallback(() => {
    const matches = matchesQuery.data || []
    if (matches.length === 0) {
      toast.error('No fixtures to download')
      return
    }
    const csv = [
      ['Round', 'Player A', 'Player B', 'Status', 'Result'].join(','),
      ...matches.map((m) =>
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
    a.download = `${competition?.name || 'fixtures'}-fixtures.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Fixtures downloaded')
  }, [matchesQuery.data, competition])

  const handleDownloadStandings = useCallback(() => {
    const standings = standingsQuery.data || []
    if (standings.length === 0) {
      toast.error('No standings to download')
      return
    }
    const csv = [
      ['Rank', 'Player', 'P', 'W', 'D', 'L', 'Pts', 'Abs', 'BYE'].join(','),
      ...standings.map((s) =>
        [
          s.rank,
          s.display_name,
          s.played,
          s.wins,
          s.draws,
          s.losses,
          s.points,
          s.absences,
          s.byes,
        ].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${competition?.name || 'standings'}-standings.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Standings downloaded')
  }, [standingsQuery.data, competition])

  if (!id) {
    return <p className="text-destructive">Invalid competition ID</p>
  }

  if (competitionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (competitionQuery.isError || !competition) {
    return (
      <Card className="rounded-2xl border-destructive/50">
        <CardContent className="pt-6">
          <p className="text-destructive">
            {competitionQuery.error instanceof ApiError
              ? competitionQuery.error.message
              : 'Competition not found'}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/competitions">Back to list</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const canStart = competition.competition_status === 'open_registration'
  const canAdvance = competition.competition_status === 'active'

  const matches = matchesQuery.data || []
  const standings = standingsQuery.data || []

  return (
    <div className="space-y-6">
      {/* ── Navigation ── */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/competitions">
            <ArrowLeft className="mr-2 size-4" />
            All competitions
          </Link>
        </Button>
      </div>

      <PageHeader
        title={competition.name}
        subtitle={`${competition.time_control ? `${competition.time_control} · ` : ''}${competition.tournament_type.replace('_', ' ')} · ${competition.competition_status.replace(/_/g, ' ')}`}
      >
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href={`/admin/competitions/edit/${competition.id}`}>Edit</Link>
        </Button>
        {canStart && (
          <Button
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={handleStart}
            disabled={startMutation.isPending}
          >
            {startMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            Start Tournament
          </Button>
        )}
        {canAdvance && (
          <Button
            className="rounded-2xl bg-black hover:bg-slate-900"
            onClick={handleAdvanceRound}
            disabled={advanceMutation.isPending}
          >
            {advanceMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <SkipForward className="mr-2 size-4" />
            )}
            Advance Round
          </Button>
        )}
      </PageHeader>

      {/* ── Stats Cards ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Trophy className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <CompetitionStatusBadge status={competition.competition_status} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <Users className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Players</p>
              <p className="text-lg font-semibold">
                {competition.participant_count ?? 0} / {competition.max_participants}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <Badge variant="outline" className="border-0 bg-transparent p-0 text-base font-semibold">
                R{competition.current_round}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Round</p>
              <p className="text-lg font-semibold">
                {competition.current_round} / {competition.rounds}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-xl bg-emerald-500/10 p-2.5">
              <Calendar className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Starts</p>
              <p className="text-sm font-medium">{formatDate(competition.start_date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Tournament configuration and details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b pb-3 gap-3">
                <span className="shrink-0 text-muted-foreground">Format</span>
                <TournamentTypeBadge type={competition.tournament_type} />
              </div>
              <OverviewRow label={<><Clock className="size-3.5" /> Time Control</>}>
                {competition.time_control || 'Not set'}
              </OverviewRow>
              <OverviewRow label={<><Globe className="size-3.5" /> Timezone</>}>
                {competition.timezone || 'Not set'}
              </OverviewRow>
              <OverviewRow label="Entry Fee">
                {competition.entry_fee || 'Free'}
              </OverviewRow>
              <OverviewRow label="Prize">
                {competition.prize || '—'}
              </OverviewRow>
              <div className="flex items-center justify-between border-b pb-3 gap-3">
                <span className="shrink-0 text-muted-foreground">Platform</span>
                <PlatformDisplay platform={competition.platform} />
              </div>
              <OverviewRow label={<><Swords className="size-3.5" /> Match Length</>}>
                <span className="capitalize">
                  {competition.match_length?.replace(/_/g, ' ') || 'Single Match'}
                </span>
              </OverviewRow>
              <OverviewRow label="Format Rules">
                {getFormatRuleLabel(competition.format_match_rules)}
              </OverviewRow>
              <OverviewRow label="ELO Range">
                {competition.min_elo ?? 800} – {competition.max_elo ?? 3000}
              </OverviewRow>
              {/* Registration: stacked since dates are long */}
              <div className="flex flex-col gap-1 border-b pb-3">
                <span className="text-muted-foreground">Registration</span>
                <span className="font-medium text-xs leading-relaxed">
                  {formatDate(competition.registration_open_at)}
                  <span className="mx-1 text-muted-foreground">→</span>
                  {formatDate(competition.registration_close_at)}
                </span>
              </div>
              <OverviewRow label="Created" last>
                {formatDate(competition.created_at)}
              </OverviewRow>

              {/* Rules */}
              <div className="border-t pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <CheckCircle2 className="size-4 text-orange-500" />
                  Competition Rules
                </p>
                <RulesList rules={competition.rules} />
              </div>

              {/* Download buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl gap-2"
                  onClick={handleDownloadFixtures}
                  disabled={matches.length === 0}
                >
                  <Download className="size-4" />
                  Download Fixtures
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl gap-2"
                  onClick={handleDownloadStandings}
                  disabled={standings.length === 0}
                >
                  <Download className="size-4" />
                  Download Standings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div className="space-y-6">
          <MatchesList
            matches={matches}
            currentRound={currentRound}
            onRoundChange={setCurrentRound}
            onViewStandings={() => setStandingsOpen(true)}
            onDownloadAll={() => {
              handleDownloadFixtures()
              setTimeout(handleDownloadStandings, 500)
            }}
            totalRounds={competition.rounds}
            competitionName={competition.name}
            // Advance round wired into MatchesList
            canAdvance={canAdvance}
            currentRoundNumber={competition.current_round}
            advancePending={advanceMutation.isPending}
            advanceWithPending={advanceWithPending}
            onAdvanceWithPendingChange={setAdvanceWithPending}
            onAdvanceRound={handleAdvanceRound}
          />
        </div>
      </div>

      {/* ── Standings Modal ── */}
      <StandingsModal
        open={standingsOpen}
        onClose={() => setStandingsOpen(false)}
        standings={standings}
        competitionName={competition.name}
      />
    </div>
  )
}