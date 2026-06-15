'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CompetitionStatusBadge,
  TournamentTypeBadge,
} from '@/src/components/competitions/competition-badges'
import {
  useAdvanceRound,
  useCompetition,
  useCompetitionStandings,
  useStartCompetition,
} from '@/src/hooks/useCompetitions'
import { useCompetitionMatches } from '@/src/hooks/useMatches'
import { ApiError } from '@/src/types/api'
import type { Match, MatchStatus } from '@/src/types/match'

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function getMatchStatusColor(status: MatchStatus): string {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'ongoing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'result_submitted': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'disputed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'cancelled': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    default: return 'bg-gray-100 text-gray-500'
  }
}

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: 'Pending',
  ongoing: 'Ongoing',
  result_submitted: 'Result Submitted',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
}

function getResultLabel(match: Match): string {
  if (match.is_bye) return 'Bye'
  if (match.result_winner === 'a') return match.player_a?.display_name || 'Player A'
  if (match.result_winner === 'b') return match.player_b?.display_name || 'Player B'
  if (match.result_winner === 'draw') return 'Draw'
  return '—'
}

// ─── Platform Icons ───────────────────────────────────────────────

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

// ─── Format Rule Label ────────────────────────────────────────────

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

// ─── Page Component ───────────────────────────────────────────────

export default function AdminCompetitionDetailPage() {
  const params = useParams()
  const id = params.id as string

  const competitionQuery = useCompetition(id, !!id)
  const standingsQuery = useCompetitionStandings(id, !!id)
  const matchesQuery = useCompetitionMatches(id)
  const startMutation = useStartCompetition()
  const advanceMutation = useAdvanceRound()

  const [showAllMatches, setShowAllMatches] = useState(false)
  const [advanceWithPending, setAdvanceWithPending] = useState(false)

  const competition = competitionQuery.data

  async function handleStart() {
    try {
      const result = await startMutation.mutateAsync(id)
      toast.success(`Tournament started — ${result.data.fixtures_generated} fixtures generated`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to start tournament')
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
      toast.error(error instanceof ApiError ? error.message : 'Failed to advance round')
    }
  }

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
  const currentRoundMatches = matches.filter((m) => m.round_number === competition.current_round)
  const displayedMatches = showAllMatches ? matches : currentRoundMatches.slice(0, 10)

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

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* ── Left: Overview + Structured Details ── */}
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Tournament configuration and details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground">Format</span>
                <TournamentTypeBadge type={competition.tournament_type} />
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Time Control
                </span>
                <span className="font-medium">{competition.time_control || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5" /> Timezone
                </span>
                <span className="font-medium">{competition.timezone || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground">Entry Fee / Prize</span>
                <span className="font-medium">{competition.entry_fee_prize || 'Free'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground">Platform</span>
                <PlatformDisplay platform={competition.platform} />
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Swords className="size-3.5" /> Match Length
                </span>
                <span className="font-medium capitalize">
                  {competition.match_length?.replace(/_/g, ' ') || 'Single Match'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground">Format Rules</span>
                <span className="font-medium">{getFormatRuleLabel(competition.format_match_rules)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground">ELO Range</span>
                <span className="font-medium">
                  {competition.min_elo ?? 800} – {competition.max_elo ?? 3000}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground">Registration</span>
                <span className="font-medium">{formatDate(competition.registration_open_at)} – {formatDate(competition.registration_close_at)}</span>
              </div>
              <div className="flex items-center justify-between pb-3">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(competition.created_at)}</span>
              </div>

              {/* Rules Section */}
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-orange-500" />
                  Competition Rules
                </p>
                <RulesList rules={competition.rules} />
              </div>
            </CardContent>
          </Card>

          {/* ── Standings ── */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Standings</CardTitle>
              <CardDescription>Live leaderboard ranked by score, head-to-head, and Buchholz.</CardDescription>
            </CardHeader>
            <CardContent>
              {standingsQuery.isLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {standingsQuery.isError && (
                <p className="text-sm text-muted-foreground">
                  {standingsQuery.error instanceof ApiError
                    ? standingsQuery.error.message
                    : 'No standings available yet.'}
                </p>
              )}

              {standingsQuery.data && standingsQuery.data.length > 0 && (
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>ELO</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="text-right">W-D-L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standingsQuery.data.map((row) => (
                        <TableRow key={row.user_id}>
                          <TableCell className="font-medium">{row.rank}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.display_name}</div>
                          </TableCell>
                          <TableCell>{row.chess_elo ?? '—'}</TableCell>
                          <TableCell>{row.score}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-emerald-600">{row.wins}</span>
                            -<span className="text-amber-600">{row.draws}</span>
                            -<span className="text-red-600">{row.losses}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {standingsQuery.data?.length === 0 && !standingsQuery.isLoading && (
                <p className="text-sm text-muted-foreground">
                  No participants yet. Open registration and wait for players to join.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Matches ── */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Matches</CardTitle>
                <CardDescription>
                  {currentRoundMatches.length > 0
                    ? `Round ${competition.current_round} — ${currentRoundMatches.length} match(es)`
                    : matches.length > 0
                    ? `${matches.length} total match(es)`
                    : 'No matches yet'}
                </CardDescription>
              </div>
              {matches.length > 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMatches(!showAllMatches)}
                  className="gap-1"
                >
                  {showAllMatches ? 'Current Round' : 'All Matches'}
                  {showAllMatches ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {matchesQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {displayedMatches.length === 0 && !matchesQuery.isLoading && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Swords className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {competition.competition_status === 'draft' || competition.competition_status === 'open_registration'
                    ? 'Start the tournament to generate matches.'
                    : competition.competition_status === 'active'
                    ? 'No matches found for this round.'
                    : 'No matches recorded.'}
                </p>
              </div>
            )}

            {displayedMatches.length > 0 && (
              <div className="space-y-3">
                {displayedMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        Round {match.round_number}
                      </Badge>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${getMatchStatusColor(match.match_status)}`}>
                        {MATCH_STATUS_LABELS[match.match_status]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {match.is_bye ? (
                            <span className="text-sm font-medium text-muted-foreground italic">Bye</span>
                          ) : (
                            <>
                              <span className="text-sm font-medium truncate">
                                {match.player_a?.display_name || `Player #${match.player_a_id}`}
                              </span>
                              <span className="text-xs text-muted-foreground">vs</span>
                              <span className="text-sm font-medium truncate">
                                {match.player_b?.display_name || `Player #${match.player_b_id}`}
                              </span>
                            </>
                          )}
                        </div>
                        {match.match_status === 'completed' && !match.is_bye && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            Winner: {getResultLabel(match)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {match.chess_game_link && (
                      <a
                        href={match.chess_game_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        View Game
                      </a>
                    )}
                  </div>
                ))}

                {/* Advance Round controls with pending toggle */}
                {canAdvance && (
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includePending"
                        checked={advanceWithPending}
                        onChange={(e) => setAdvanceWithPending(e.target.checked)}
                        className="rounded border-muted-foreground/30"
                      />
                      <label htmlFor="includePending" className="text-xs text-muted-foreground cursor-pointer">
                        Include pending matches when advancing
                      </label>
                    </div>
                    <Button
                      onClick={handleAdvanceRound}
                      disabled={advanceMutation.isPending}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {advanceMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <SkipForward className="size-4" />
                      )}
                      {competition.current_round >= competition.rounds
                        ? 'Complete Tournament'
                        : `Advance to Round ${competition.current_round + 1}`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}