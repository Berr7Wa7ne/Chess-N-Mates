'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  ChevronLeft,
  Crown,
  Loader2,
  Settings2,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/src/hooks/useAuth'
import { useCreateCompetition, useUpdateCompetition } from '@/src/hooks/useCompetitions'
import { ApiError } from '@/src/types/api'
import type {
  Competition,
  CreateCompetitionPayload,
  TournamentType,
  UpdateCompetitionPayload,
} from '@/src/types/competition'

const TOURNAMENT_TYPES: { value: TournamentType; label: string; description: string }[] = [
  {
    value: 'swiss',
    label: 'Swiss System',
    description: 'Score-based pairing each round — great for large fields.',
  },
  {
    value: 'knockout',
    label: 'Knockout',
    description: 'Single elimination bracket — winner advances, loser out.',
  },
  {
    value: 'round_robin',
    label: 'Round Robin',
    description: 'Everyone plays everyone — fair and complete.',
  },
]

function toIsoOrUndefined(value: string) {
  if (!value) return undefined
  return new Date(value).toISOString()
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

interface CreateCompetitionFormProps {
  competition?: Competition
  mode?: 'create' | 'edit'
}

export function CreateCompetitionForm({
  competition,
  mode = 'create',
}: CreateCompetitionFormProps) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const createMutation = useCreateCompetition()
  const updateMutation = useUpdateCompetition()
  const isEditMode = mode === 'edit'
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const [name, setName] = useState(competition?.name ?? '')
  const [description, setDescription] = useState(competition?.description ?? '')
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    competition?.tournament_type ?? 'swiss'
  )
  const [maxParticipants, setMaxParticipants] = useState(String(competition?.max_participants ?? 32))
  const [rounds, setRounds] = useState(String(competition?.rounds ?? 5))
  const [minElo, setMinElo] = useState(String(competition?.min_elo ?? 800))
  const [maxElo, setMaxElo] = useState(String(competition?.max_elo ?? 3000))
  const [registrationOpenAt, setRegistrationOpenAt] = useState(
    toDateTimeLocalValue(competition?.registration_open_at)
  )
  const [registrationCloseAt, setRegistrationCloseAt] = useState(
    toDateTimeLocalValue(competition?.registration_close_at)
  )
  const [startDate, setStartDate] = useState(toDateTimeLocalValue(competition?.start_date))
  const [endDate, setEndDate] = useState(toDateTimeLocalValue(competition?.end_date))

  useEffect(() => {
    if (!competition) return
    setName(competition.name)
    setDescription(competition.description ?? '')
    setTournamentType(competition.tournament_type)
    setMaxParticipants(String(competition.max_participants ?? 32))
    setRounds(String(competition.rounds ?? 5))
    setMinElo(String(competition.min_elo ?? 800))
    setMaxElo(String(competition.max_elo ?? 3000))
    setRegistrationOpenAt(toDateTimeLocalValue(competition.registration_open_at))
    setRegistrationCloseAt(toDateTimeLocalValue(competition.registration_close_at))
    setStartDate(toDateTimeLocalValue(competition.start_date))
    setEndDate(toDateTimeLocalValue(competition.end_date))
  }, [competition])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentUser) {
      toast.error('You must be logged in to create a competition')
      return
    }

    if (!name.trim()) {
      toast.error('Competition name is required')
      return
    }

    if (!registrationOpenAt || !registrationCloseAt || !startDate || !endDate) {
      toast.error('Registration open, registration close, start, and end dates are required')
      return
    }

    const schedulePayload = {
      registration_open_at: toIsoOrUndefined(registrationOpenAt) as string,
      registration_close_at: toIsoOrUndefined(registrationCloseAt) as string,
      start_date: toIsoOrUndefined(startDate) as string,
      end_date: toIsoOrUndefined(endDate) as string,
    }

    const payload: CreateCompetitionPayload | UpdateCompetitionPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      tournament_type: tournamentType,
      max_participants: Number(maxParticipants) || 32,
      rounds: Number(rounds) || 5,
      min_elo: Number(minElo) || 800,
      max_elo: Number(maxElo) || 3000,
      ...schedulePayload,
    }

    try {
      if (isEditMode && competition) {
        const response = await updateMutation.mutateAsync({
          id: competition.id,
          payload,
        })
        toast.success(`"${response.data.name}" updated successfully`)
        router.push(`/admin/competitions/${competition.id}`)
        return
      }

      const response = await createMutation.mutateAsync({
        ...payload,
        tournament_type: tournamentType,
        created_by: currentUser.id,
      } as CreateCompetitionPayload)
      toast.success(`"${response.data.name}" created successfully`)
      router.push(`/admin/competitions/${response.data.id}`)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : `Failed to ${isEditMode ? 'update' : 'create'} competition`
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-6 shadow-sm">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Trophy className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {isEditMode ? 'Edit Competition' : 'Create Competition'}
                </h1>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="size-3" />
                  {isEditMode ? 'Edit' : 'New'}
                </Badge>
              </div>
              <p className="mt-1 max-w-xl text-muted-foreground">
                Set up your tournament format, registration window, and player limits.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" asChild className="shrink-0">
            <Link href="/admin/competitions">
              <ChevronLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="size-5 text-amber-500" />
              Basic Information
            </CardTitle>
            <CardDescription>Name and describe your tournament for players.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Competition name</Label>
              <Input
                id="name"
                placeholder="Rapid Masters Cup 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A fast-paced tournament for intermediate players…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label>Tournament format</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {TOURNAMENT_TYPES.map((type) => {
                  const selected = tournamentType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setTournamentType(type.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <p className="font-semibold">{type.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-blue-500" />
                Capacity & Rounds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max players</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min={2}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rounds">Rounds</Label>
                  <Input
                    id="rounds"
                    type="number"
                    min={1}
                    value={rounds}
                    onChange={(e) => setRounds(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minElo">Min ELO</Label>
                  <Input
                    id="minElo"
                    type="number"
                    value={minElo}
                    onChange={(e) => setMinElo(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxElo">Max ELO</Label>
                  <Input
                    id="maxElo"
                    type="number"
                    value={maxElo}
                    onChange={(e) => setMaxElo(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-emerald-500" />
                Schedule
              </CardTitle>
              <CardDescription>Optional — set when players can register and when play begins.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="registrationOpen">Registration opens</Label>
                <Input
                  id="registrationOpen"
                  type="datetime-local"
                  value={registrationOpenAt}
                  onChange={(e) => setRegistrationOpenAt(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationClose">Registration closes</Label>
                <Input
                  id="registrationClose"
                  type="datetime-local"
                  value={registrationCloseAt}
                  onChange={(e) => setRegistrationCloseAt(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild className="h-12 rounded-2xl px-8">
          <Link href="/admin/competitions">Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-2xl bg-black px-8 text-white hover:bg-slate-900"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {isEditMode ? 'Saving…' : 'Creating…'}
            </>
          ) : (
            <>
              <Settings2 className="mr-2 size-4" />
              {isEditMode ? 'Save Changes' : 'Create Competition'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

