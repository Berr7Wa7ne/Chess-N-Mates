'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateCompetitionForm } from '@/src/components/competitions/create-competition-form'
import { useCompetition } from '@/src/hooks/useCompetitions'
import { ApiError } from '@/src/types/api'

export default function EditCompetitionPage() {
  const params = useParams()
  const id = Number(params.id)
  const competitionQuery = useCompetition(id, !Number.isNaN(id))

  if (Number.isNaN(id)) {
    return <p className="text-destructive">Invalid competition ID</p>
  }

  if (competitionQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (competitionQuery.isError || !competitionQuery.data) {
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <CreateCompetitionForm mode="edit" competition={competitionQuery.data} />
    </div>
  )
}
