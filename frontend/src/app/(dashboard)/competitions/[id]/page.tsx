'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  useCompetition,
  useCompetitionStandings,
} from '@/src/hooks/useCompetitions'
import { ApiError } from '@/src/types/api'

export default function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idParam } = use(params)
  const id = Number(idParam)

  const competitionQuery = useCompetition(id, !Number.isNaN(id))
  const standingsQuery = useCompetitionStandings(id, !Number.isNaN(id))

  if (Number.isNaN(id)) {
    return <p className="text-destructive">Invalid competition ID</p>
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/competitions">
          <ArrowLeft className="mr-2 size-4" />
          Back to competitions
        </Link>
      </Button>

      {competitionQuery.isLoading && <Skeleton className="h-24 w-full" />}

      {competitionQuery.data && (
        <div>
          <h1 className="text-2xl font-bold">{competitionQuery.data.name}</h1>
          <p className="text-muted-foreground">
            Round {competitionQuery.data.current_round} of{' '}
            {competitionQuery.data.rounds} ·{' '}
            {competitionQuery.data.competition_status.replace('_', ' ')}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
          <CardDescription>Leaderboard for this competition</CardDescription>
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
            <p className="text-sm text-destructive">
              {standingsQuery.error instanceof ApiError
                ? standingsQuery.error.message
                : 'Standings are not available yet for this competition.'}
            </p>
          )}

          {standingsQuery.data && standingsQuery.data.length > 0 && (
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
                        <div className="text-xs text-muted-foreground">
                          @{row.chess_username}
                        </div>
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
          )}

          {standingsQuery.data?.length === 0 && !standingsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">No standings data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
