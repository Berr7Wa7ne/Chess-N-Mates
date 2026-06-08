'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { Calendar, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/src/hooks/useAuth'
import { useCompetitions } from '@/src/hooks/useCompetitions'
import { useJoinCompetition } from '@/src/hooks/useParticipants'
import { ApiError } from '@/src/types/api'
import type { Competition } from '@/src/types/competition'

function statusVariant(status: Competition['competition_status']) {
  switch (status) {
    case 'active':
      return 'default' as const
    case 'open_registration':
      return 'secondary' as const
    case 'completed':
      return 'outline' as const
    default:
      return 'outline' as const
  }
}

function CompetitionCard({ competition }: { competition: Competition }) {
  const { currentUser } = useAuth()
  const joinMutation = useJoinCompetition()

  const canJoin = competition.competition_status === 'open_registration'

  async function handleJoin() {
    if (!currentUser) return

    try {
      await joinMutation.mutateAsync({
        competitionId: competition.id,
        payload: { user_id: currentUser.id },
      })
      toast.success(`Joined ${competition.name}`)
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Could not join competition'
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{competition.name}</CardTitle>
          <Badge variant={statusVariant(competition.competition_status)}>
            {competition.competition_status.replace('_', ' ')}
          </Badge>
        </div>
        {competition.description && (
          <CardDescription className="line-clamp-2">
            {competition.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="size-4" />
          <span>
            {competition.participant_count ?? 0} / {competition.max_participants}{' '}
            players · {competition.tournament_type}
          </span>
        </div>
        {competition.start_date && (
          <div className="flex items-center gap-2">
            <Calendar className="size-4" />
            <span>Starts {new Date(competition.start_date).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/competitions/${competition.id}`}>View standings</Link>
        </Button>
        {canJoin && (
          <Button
            size="sm"
            onClick={handleJoin}
            disabled={joinMutation.isPending}
          >
            Join
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function CompetitionsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  )
}

export default function CompetitionsPage() {
  const { data: competitions, isLoading, isError, error, refetch } = useCompetitions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitions</h1>
        <p className="text-muted-foreground">
          Browse tournaments, join events, and view standings.
        </p>
      </div>

      {isLoading && <CompetitionsSkeleton />}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-destructive">
              {error instanceof ApiError
                ? error.message
                : 'Failed to load competitions'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && competitions?.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No competitions yet. Check back soon or create one from the admin panel.
          </CardContent>
        </Card>
      )}

      {competitions && competitions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      )}
    </div>
  )
}
