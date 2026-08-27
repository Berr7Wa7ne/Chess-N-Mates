'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
} from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateCompetitionForm } from '@/src/components/competitions/create-competition-form'
import { useCompetition } from '@/src/hooks/useCompetitions'
import { ApiError } from '@/src/types/api'

export default function EditCompetitionPage() {
  const params = useParams()
  const id = params.id as string
  const competitionQuery = useCompetition(id, !!id)

  if (!id) {
    return (
      <AdminPageShell>
        <p className="text-red-600">Invalid competition ID</p>
      </AdminPageShell>
    )
  }

  if (competitionQuery.isLoading) {
    return (
      <AdminPageShell wide className="max-w-3xl">
        <Skeleton className="h-40 w-full rounded-[20px]" />
        <Skeleton className="h-96 w-full rounded-[20px]" />
      </AdminPageShell>
    )
  }

  if (competitionQuery.isError || !competitionQuery.data) {
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

  return (
    <AdminPageShell wide className="max-w-3xl">
      <AdminPageHeader
        title="Edit competition"
        description={competitionQuery.data.name}
      />
      <CreateCompetitionForm mode="edit" competition={competitionQuery.data} />
    </AdminPageShell>
  )
}
