'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Play,
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
import { ApiError } from '@/src/types/api'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function AdminCompetitionDetailPage() {
  const params = useParams()
  const id = Number(params.id)

  const competitionQuery = useCompetition(id, !Number.isNaN(id))
  const standingsQuery = useCompetitionStandings(id, !Number.isNaN(id))
  const startMutation = useStartCompetition()
  const advanceMutation = useAdvanceRound()

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
      const result = await advanceMutation.mutateAsync({ id })
      const data = result.data
      if (data.fixtures_generated === 0 && data.current_round === data.previous_round) {
        toast.success('Tournament completed')
      } else {
        toast.success(
          `Advanced to round ${data.current_round} — ${data.fixtures_generated} fixtures generated`
        )
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to advance round')
    }
  }

  if (Number.isNaN(id)) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/competitions">
            <ArrowLeft className="mr-2 size-4" />
            All competitions
          </Link>
        </Button>
      </div>

      <PageHeader title={competition.name} subtitle={competition.description || 'Tournament workspace'}>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href={`/admin/competitions/edit/${competition.id}`}>Edit Competition</Link>
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
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Tournament configuration and schedule.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">Format</span>
              <TournamentTypeBadge type={competition.tournament_type} />
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">ELO range</span>
              <span className="font-medium">
                {competition.min_elo ?? 800} – {competition.max_elo ?? 3000}
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">Registration opens</span>
              <span>{formatDate(competition.registration_open_at)}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">Registration closes</span>
              <span>{formatDate(competition.registration_close_at)}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">Start date</span>
              <span>{formatDate(competition.start_date)}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">End date</span>
              <span>{formatDate(competition.end_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(competition.created_at)}</span>
            </div>
          </CardContent>
        </Card>

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
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">W-D-L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standingsQuery.data.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell>{row.rank}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.display_name}</div>
                          {row.chess_username && (
                            <div className="text-xs text-muted-foreground">@{row.chess_username}</div>
                          )}
                        </TableCell>
                        <TableCell>{row.score}</TableCell>
                        <TableCell className="text-right">
                          {row.wins}-{row.draws}-{row.losses}
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
    </div>
  )
}
