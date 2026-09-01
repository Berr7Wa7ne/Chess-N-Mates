'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Medal,
  Pencil,
  Play,
  Swords,
} from 'lucide-react'
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
  AdminPanelTitle,
} from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CompetitionStatusBadge,
  TournamentTypeBadge,
} from '@/src/components/competitions/competition-badges'
import { StandingsModal } from '@/src/components/standings/standings-modal'
import {
  useCompetition,
  useCompetitionStandings,
  useStartCompetition,
} from '@/src/hooks/useCompetitions'
import { useCompetitionMatches } from '@/src/hooks/useMatches'
import { ApiError } from '@/src/types/api'

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
    'lichess': 'text-amber-700',
    'over_the_board': 'text-blue-600',
    'others': 'text-muted-foreground',
  }
  return (
    <span className={`flex items-center gap-1.5 text-sm ${colors[platform ?? ''] || 'text-muted-foreground'}`}>
      <MapPin className="size-3.5" />
      {platform ? platform.replace(/_/g, ' ') : 'Not set'}
    </span>
  )
}

// ─── Rules List ───────────────────────────────────────────────────

function RulesList({ rules }: { rules?: string[] | null }) {
  if (!rules || rules.length === 0) return <span className="text-muted-foreground">No rules defined</span>
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

// ─── Page Component ───────────────────────────────────────────────

export default function AdminCompetitionDetailPage() {
  const params = useParams()
  const id = params.id as string

  const competitionQuery = useCompetition(id, !!id)
  const standingsQuery = useCompetitionStandings(id, !!id)
  const matchesQuery = useCompetitionMatches(id)
  const startMutation = useStartCompetition()

  const [standingsOpen, setStandingsOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const competition = competitionQuery.data

  async function handleStart() {
    try {
      const result = await startMutation.mutateAsync(id)
      toast.success(`Tournament started — ${result.data.fixtures_generated} fixtures generated`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to start tournament')
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
    const isSwiss = competition?.tournament_type === 'swiss'
    const headers = isSwiss
      ? ['Rank', 'Player', 'P', 'W', 'D', 'L', 'Pts', 'BH', 'BH-C1', 'SB', 'Abs', 'BYE']
      : ['Rank', 'Player', 'P', 'W', 'D', 'L', 'Pts', 'Abs', 'BYE']
    const csv = [
      headers.join(','),
      ...standings.map((s) =>
        (isSwiss
          ? [
              s.rank,
              s.display_name,
              s.played,
              s.wins,
              s.draws,
              s.losses,
              s.points,
              s.buchholz ?? '',
              s.buchholz_cut1 ?? '',
              s.sonneborn_berger ?? '',
              s.absences,
              s.byes,
            ]
          : [s.rank, s.display_name, s.played, s.wins, s.draws, s.losses, s.points, s.absences, s.byes]
        ).join(',')
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
      <AdminPageShell>
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-[20px]" />
        <Skeleton className="h-24 w-full rounded-[20px]" />
      </AdminPageShell>
    )
  }

  if (competitionQuery.isError || !competition) {
    return (
      <AdminPageShell>
        <AdminPanel>
          <p className="text-red-600">
            {competitionQuery.error instanceof ApiError
              ? competitionQuery.error.message
              : 'Competition not found'}
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" asChild>
            <Link href="/admin/competitions">Back to list</Link>
          </Button>
        </AdminPanel>
      </AdminPageShell>
    )
  }

  const canStart = competition.competition_status === 'open_registration'
  const standings = standingsQuery.data || []

  return (
    <AdminPageShell>
      <Link
        href="/admin/competitions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        All competitions
      </Link>

      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title={competition.name}
          description={`${competition.time_control ? `${competition.time_control} · ` : ''}${competition.tournament_type.replace('_', ' ')}`}
        />
        <AdminIconRow>
          <AdminIconAction
            icon={FileText}
            label="Overview & rules"
            onClick={() => setDetailsOpen(true)}
          />
          <AdminIconAction
            icon={Medal}
            label="Standings"
            onClick={() => setStandingsOpen(true)}
          />
          <AdminIconAction
            icon={Download}
            label="Download fixtures"
            onClick={handleDownloadFixtures}
          />
          <AdminIconAction
            icon={Pencil}
            label="Edit"
            href={`/admin/competitions/edit/${competition.id}`}
          />
          <AdminIconAction
            icon={Swords}
            label="Open matches"
            href={`/admin/competitions/${competition.id}/matches`}
            accent
          />
        </AdminIconRow>
      </div>

      <AdminPanel dark>
        <AdminPanelTitle title="Snapshot" description="Key tournament numbers" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-bg-stat-tile px-3 py-4 text-center">
            <CompetitionStatusBadge status={competition.competition_status} />
            <p className="mt-2 text-[11px] text-white/40">Status</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-bg-stat-tile px-3 py-4 text-center">
            <p className="tabular-nums text-2xl font-extrabold text-accent-gold">
              {competition.participant_count ?? 0}
              <span className="text-base text-white/40">/{competition.max_participants}</span>
            </p>
            <p className="mt-1 text-[11px] text-white/40">Players</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-bg-stat-tile px-3 py-4 text-center">
            <p className="tabular-nums text-2xl font-extrabold text-white">
              {competition.current_round}/{competition.rounds}
            </p>
            <p className="mt-1 text-[11px] text-white/40">Round</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-bg-stat-tile px-3 py-4 text-center">
            <p className="text-sm font-semibold text-white">{formatDate(competition.start_date)}</p>
            <p className="mt-1 text-[11px] text-white/40">Starts</p>
          </div>
        </div>
      </AdminPanel>

      {canStart && (
        <button
          type="button"
          onClick={handleStart}
          disabled={startMutation.isPending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-gold text-sm font-bold text-text-primary disabled:opacity-60"
        >
          {startMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Start tournament
        </button>
      )}

      <AdminContentModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Overview"
        description="Tournament configuration and rules"
        wide
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-text-secondary">Format</span>
            <TournamentTypeBadge type={competition.tournament_type} />
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Clock className="size-3.5" /> Time control
            </span>
            <span className="font-medium">{competition.time_control || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Globe className="size-3.5" /> Timezone
            </span>
            <span className="font-medium">{competition.timezone || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-text-secondary">Entry fee</span>
            <span className="font-medium">{competition.entry_fee || 'Free'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-text-secondary">Prize</span>
            <span className="font-medium">{competition.prize || '—'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-text-secondary">Platform</span>
            <PlatformDisplay platform={competition.platform} />
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Swords className="size-3.5" /> Match length
            </span>
            <span className="font-medium capitalize">
              {competition.match_length?.replace(/_/g, ' ') || 'Single Match'}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-text-secondary">Format rules</span>
            <span className="font-medium">{getFormatRuleLabel(competition.format_match_rules)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-text-secondary">ELO range</span>
            <span className="font-medium">
              {competition.min_elo ?? 800} – {competition.max_elo ?? 3000}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-text-secondary">Registration</span>
            <span className="text-right text-xs font-medium leading-relaxed">
              {formatDate(competition.registration_open_at)}
              <span className="mx-1 text-text-secondary">→</span>
              {formatDate(competition.registration_close_at)}
            </span>
          </div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-text-secondary">Created</span>
            <span>{formatDate(competition.created_at)}</span>
          </div>
          <div className="border-t border-border-subtle pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <CheckCircle2 className="size-4 text-orange-500" />
              Competition rules
            </p>
            <RulesList rules={competition.rules} />
          </div>
          <button
            type="button"
            className="mt-2 h-10 w-full rounded-xl bg-bg-panel-light text-sm font-semibold"
            onClick={handleDownloadStandings}
          >
            Download standings CSV
          </button>
        </div>
      </AdminContentModal>

      <StandingsModal
        open={standingsOpen}
        onClose={() => setStandingsOpen(false)}
        standings={standings}
        competitionName={competition.name}
        tournamentType={competition.tournament_type}
      />
    </AdminPageShell>
  )
}