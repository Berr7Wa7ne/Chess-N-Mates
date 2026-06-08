'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MoreHorizontal, Plus, Search, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  CompetitionStatusBadge,
  TournamentTypeBadge,
} from '@/src/components/competitions/competition-badges'
import { useCompetitions } from '@/src/hooks/useCompetitions'
import { ApiError } from '@/src/types/api'
import type { CompetitionStatus, TournamentType } from '@/src/types/competition'

export default function AdminCompetitionsPage() {
  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TournamentType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CompetitionStatus>('all')

  const listParams = useMemo(() => {
    const params: { status?: CompetitionStatus; type?: TournamentType } = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (typeFilter !== 'all') params.type = typeFilter
    return params
  }, [statusFilter, typeFilter])

  const { data: competitions, isLoading, isError, error, refetch } = useCompetitions(listParams)

  const filteredCompetitions = useMemo(() => {
    if (!competitions) return []
    return competitions.filter((c) =>
      c.name.toLowerCase().includes(nameFilter.toLowerCase())
    )
  }, [competitions, nameFilter])

  const activeCompetition = filteredCompetitions.find((c) => c.competition_status === 'active')

  function handleDeleteUnavailable() {
    toast.info('Delete is not available yet for competitions')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitions"
        subtitle="Create competitions, open registration, start tournaments, and manage standings."
        action={{ label: 'Add Competition', icon: <Plus className="size-4" />, href: '/admin/competitions/new' }}
      />

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50 rounded-2xl">
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-destructive">
              {error instanceof ApiError ? error.message : 'Failed to load competitions'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && activeCompetition && (
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-emerald-600" />
              Ongoing Tournament
            </CardTitle>
            <CardDescription>Currently active competition on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-2xl border bg-background/80 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{activeCompetition.name}</h2>
                  <CompetitionStatusBadge status={activeCompetition.competition_status} />
                  <TournamentTypeBadge type={activeCompetition.tournament_type} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Round {activeCompetition.current_round} of {activeCompetition.rounds} ·{' '}
                  {activeCompetition.participant_count ?? 0} players
                </p>
              </div>
              <Button asChild className="rounded-2xl">
                <Link href={`/admin/competitions/${activeCompetition.id}`}>Manage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>All Competitions</CardTitle>
          <CardDescription>Browse, filter, and open any tournament workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name…"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-11 w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="swiss">Swiss</SelectItem>
                <SelectItem value="knockout">Knockout</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="h-11 w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open_registration">Open registration</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isLoading && !isError && filteredCompetitions.length === 0 && (
            <EmptyState
              icon={<Trophy className="size-8 text-muted-foreground" />}
              title="No competitions yet"
              description="Create your first tournament to get started."
              action={
                <Button asChild className="rounded-2xl">
                  <Link href="/admin/competitions/new">Create Competition</Link>
                </Button>
              }
            />
          )}

          {filteredCompetitions.length > 0 && (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompetitions.map((competition) => (
                    <TableRow key={competition.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{competition.name}</TableCell>
                      <TableCell>
                        <TournamentTypeBadge type={competition.tournament_type} />
                      </TableCell>
                      <TableCell>
                        <CompetitionStatusBadge status={competition.competition_status} />
                      </TableCell>
                      <TableCell>
                        {competition.participant_count ?? 0} / {competition.max_participants}
                      </TableCell>
                      <TableCell>
                        {competition.current_round} / {competition.rounds}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              aria-label={`Actions for ${competition.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/competitions/${competition.id}`}>View</Link>
                            </DropdownMenuItem>
                            {!['completed', 'active'].includes(competition.competition_status) && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/competitions/edit/${competition.id}`}>Edit</Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600" onClick={handleDeleteUnavailable}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
