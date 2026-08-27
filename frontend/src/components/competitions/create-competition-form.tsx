'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Crown,
  Gamepad2,
  Globe,
  GripVertical,
  Loader2,
  MapPin,
  Plus,
  Settings2,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/src/hooks/useAuth'
import { useCreateCompetition, useOpenRegistration, useUpdateCompetition } from '@/src/hooks/useCompetitions'
import { ApiError } from '@/src/types/api'
import type {
  Competition,
  CreateCompetitionPayload,
  TournamentType,
  UpdateCompetitionPayload,
  MatchLength,
  Platform,
} from '@/src/types/competition'
import { recommendTournamentFormat } from '@/src/lib/tournament-advisor'

// ─── Constants ────────────────────────────────────────────────────

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

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'chess.com', label: 'Chess.com' },
  { value: 'lichess', label: 'Lichess' },
  { value: 'over_the_board', label: 'Over the Board' },
  { value: 'others', label: 'Others' },
]

// Match configuration options per tournament type
const MATCH_CONFIG_OPTIONS: Record<TournamentType, { value: MatchLength; label: string; description: string }[]> = {
  swiss: [
    {
      value: 'single_game',
      label: 'Single Game',
      description: 'One game per pairing.',
    },
    {
      value: 'double_game',
      label: 'Double Game',
      description: 'Each pairing plays twice (swap colors).',
    },
    {
      value: 'best_of_3',
      label: 'Best of 3 Games',
      description: 'First to 2 wins takes the match.',
    },
    {
      value: 'best_of_5',
      label: 'Best of 5 Games',
      description: 'First to 3 wins takes the match.',
    },
  ],
  knockout: [
    {
      value: 'single_game',
      label: 'Single Game',
      description: 'One game per pairing.',
    },
    {
      value: 'best_of_3',
      label: 'Best of 3 Games',
      description: 'First to 2 wins takes the match.',
    },
    {
      value: 'best_of_5',
      label: 'Best of 5 Games',
      description: 'First to 3 wins takes the match.',
    },
  ],
  round_robin: [
    {
      value: 'single_game',
      label: 'Single Game',
      description: 'Each pairing is played once.',
    },
    {
      value: 'double_game',
      label: 'Double Game',
      description: 'Each pairing is played twice (swap colors).',
    },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────

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

function computeRounds(tournamentType: TournamentType, maxPlayers: number, matchLength: MatchLength): number {
  if (tournamentType === 'knockout') {
    return Math.max(1, Math.ceil(Math.log2(maxPlayers)))
  }
  if (tournamentType === 'round_robin') {
    const n = maxPlayers
    // Both single and double leg use n-1 rounds (legs are in the same round)
    return n < 2 ? 0 : n - 1
  }
  // Swiss — user-provided, return 0 to indicate "editable"
  return 0
}

// ─── Auto-expanding Textarea ──────────────────────────────────────

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  onKeyDown,
  className,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  className?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      className={`min-h-[40px] resize-none overflow-hidden ${className ?? ''}`}
    />
  )
}

interface CreateCompetitionFormProps {
  competition?: Competition
  mode?: 'create' | 'edit'
}

// ─── Component ────────────────────────────────────────────────────

export function CreateCompetitionForm({
  competition,
  mode = 'create',
}: CreateCompetitionFormProps) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const createMutation = useCreateCompetition()
  const updateMutation = useUpdateCompetition()
  const openRegistrationMutation = useOpenRegistration()
  const isEditMode = mode === 'edit'
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ── Open Registration Banner State ──
  const [createdCompetitionId, setCreatedCompetitionId] = useState<string | null>(null)
  const [showOpenRegBanner, setShowOpenRegBanner] = useState(false)

  async function handleOpenRegistration(competitionId: string) {
    try {
      await openRegistrationMutation.mutateAsync(competitionId)
      toast.success('Registration opened successfully')
      router.push(`/admin/competitions/${competitionId}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to open registration')
    }
  }

  async function handleDismissBanner(competitionId: string) {
    setShowOpenRegBanner(false)
    router.push(`/admin/competitions/${competitionId}`)
  }

  // ── Basic Info ──
  const [name, setName] = useState(competition?.name ?? '')
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    competition?.tournament_type ?? 'swiss'
  )

  // ── Structured Fields ──
  const [timeControl, setTimeControl] = useState(competition?.time_control ?? '')
  const [timezone, setTimezone] = useState(competition?.timezone ?? 'UTC+1:00')
  const [entryFee, setEntryFee] = useState(competition?.entry_fee ?? '')
  const [prize, setPrize] = useState(competition?.prize ?? '')
  const [platform, setPlatform] = useState(competition?.platform ?? 'chess.com')
  const [autoComputeEnabled, setAutoComputeEnabled] = useState(
    competition?.auto_compute_enabled !== false
  )
  const [imageUrl, setImageUrl] = useState(competition?.image_url ?? '')
  const [isFeatured, setIsFeatured] = useState(Boolean(competition?.is_featured))

  // ── Match Configuration (combined) ──
  const currentMatchOptions = MATCH_CONFIG_OPTIONS[tournamentType]
  const [matchLength, setMatchLength] = useState<MatchLength>(
    (() => {
      if (competition?.match_length) {
        return competition.match_length as MatchLength
      }
      return currentMatchOptions[0].value
    })()
  )

  // Reset match length when tournament type changes if current value not valid
  useEffect(() => {
    const valid = currentMatchOptions.some((opt) => opt.value === matchLength)
    if (!valid) {
      setMatchLength(currentMatchOptions[0].value)
    }
  }, [tournamentType])

  // ── Capacity & Rating ──
  const [maxParticipants, setMaxParticipants] = useState(String(competition?.max_participants ?? 32))
  const [rounds, setRounds] = useState(String(competition?.rounds ?? 5))
  const [minElo, setMinElo] = useState(String(competition?.min_elo ?? 800))
  const [maxElo, setMaxElo] = useState(String(competition?.max_elo ?? 3000))

  // ── Dates ──
  const [registrationOpenAt, setRegistrationOpenAt] = useState(
    toDateTimeLocalValue(competition?.registration_open_at)
  )
  const [registrationCloseAt, setRegistrationCloseAt] = useState(
    toDateTimeLocalValue(competition?.registration_close_at)
  )
  const [startDate, setStartDate] = useState(toDateTimeLocalValue(competition?.start_date))
  const [endDate, setEndDate] = useState(toDateTimeLocalValue(competition?.end_date))

  // ── Dynamic Rules ──
  const [rules, setRules] = useState<string[]>(competition?.rules ?? [])
  const [showRuleInput, setShowRuleInput] = useState(rules.length === 0)
  const [currentRule, setCurrentRule] = useState('')

  // ── Synced computed rounds ──
  const computedRounds = computeRounds(
    tournamentType,
    Number(maxParticipants) || 2,
    matchLength
  )
  const isRoundsEditable = tournamentType === 'swiss'
  const roundsDisplayValue = isRoundsEditable ? rounds : String(computedRounds)
  const formatAdvice = recommendTournamentFormat(Number(maxParticipants) || 0)

  function applyFormatRecommendation() {
    const advice = formatAdvice
    setTournamentType(advice.recommended)
    if (advice.recommended === 'round_robin') {
      setMatchLength(advice.recommended_legs === 2 ? 'double_game' : 'single_game')
    } else if (advice.recommended === 'swiss') {
      setMatchLength('single_game')
      setRounds(String(advice.recommended_rounds))
    } else {
      setMatchLength('single_game')
    }
    toast.success(`Applied ${advice.recommended.replace('_', ' ')} recommendation`)
  }

  // Sync edit mode competition data
  useEffect(() => {
    if (!competition) return
    setName(competition.name)
    setTournamentType(competition.tournament_type)
    setTimeControl(competition.time_control ?? '')
    setTimezone(competition.timezone ?? 'UTC+1:00')
    setEntryFee(competition.entry_fee ?? '')
    setPrize(competition.prize ?? '')
    setPlatform(competition.platform ?? 'chess.com')
    setAutoComputeEnabled(competition.auto_compute_enabled !== false)
    setImageUrl(competition.image_url ?? '')
    setIsFeatured(Boolean(competition.is_featured))
    const ml = (competition.match_length as MatchLength)
    const valid = MATCH_CONFIG_OPTIONS[competition.tournament_type].some((opt) => opt.value === ml)
    setMatchLength(valid ? ml : MATCH_CONFIG_OPTIONS[competition.tournament_type][0].value)
    setMaxParticipants(String(competition.max_participants ?? 32))
    setRounds(String(competition.rounds ?? 5))
    setMinElo(String(competition.min_elo ?? 800))
    setMaxElo(String(competition.max_elo ?? 3000))
    setRules(competition.rules ?? [])
    setRegistrationOpenAt(toDateTimeLocalValue(competition.registration_open_at))
    setRegistrationCloseAt(toDateTimeLocalValue(competition.registration_close_at))
    setStartDate(toDateTimeLocalValue(competition.start_date))
    setEndDate(toDateTimeLocalValue(competition.end_date))
  }, [competition])

  // ── Validation ──
  function validate(): string | null {
    if (!name.trim()) return 'Competition name is required'
    if (!registrationOpenAt || !registrationCloseAt || !startDate || !endDate) {
      return 'All date fields are required'
    }
    const min = Number(minElo)
    const max = Number(maxElo)
    if (min > max) return 'Minimum ELO cannot be greater than Maximum ELO'
    if (Number(maxParticipants) < 2) return 'Must have at least 2 players'
    if (isRoundsEditable && Number(rounds) < 1) return 'Rounds must be at least 1'
    return null
  }

  // ── Rules Management ──
  function addRule() {
    if (!currentRule.trim()) return
    setRules((prev) => [...prev, currentRule.trim()])
    setCurrentRule('')
    setShowRuleInput(false)
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index))
    if (rules.length <= 1) {
      setShowRuleInput(true)
    }
  }

  // Derive format_match_rules from matchLength and tournamentType
  function deriveFormatMatchRules(type: TournamentType, ml: MatchLength): string {
    if (type === 'swiss') {
      return ml === 'double_game' ? 'two_game_round' : 'single_game_per_round'
    }
    if (type === 'knockout') {
      return ml === 'single_game' ? 'single_elimination' : 'two_game_match'
    }
    if (type === 'round_robin') {
      return ml === 'double_game' ? 'double_leg' : 'single_leg'
    }
    return 'single_game_per_round'
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      toast.error(validationError)
      return
    }

    if (!currentUser) {
      toast.error('You must be logged in to create a competition')
      return
    }

    const schedulePayload = {
      registration_open_at: toIsoOrUndefined(registrationOpenAt) as string,
      registration_close_at: toIsoOrUndefined(registrationCloseAt) as string,
      start_date: toIsoOrUndefined(startDate) as string,
      end_date: toIsoOrUndefined(endDate) as string,
    }

    const basePayload = {
      name: name.trim(),
      tournament_type: tournamentType,
      max_participants: Number(maxParticipants) || 32,
      rounds: isRoundsEditable ? Number(rounds) || 5 : computedRounds,
      min_elo: Number(minElo) || 800,
      max_elo: Number(maxElo) || 3000,
      time_control: timeControl.trim() || undefined,
      timezone,
      entry_fee: entryFee.trim() || undefined,
      prize: prize.trim() || undefined,
      platform: platform as Platform,
      match_length: matchLength,
      format_match_rules: deriveFormatMatchRules(tournamentType, matchLength),
      // For round robin, set legs based on match length
      round_robin_legs: tournamentType === 'round_robin' && matchLength === 'double_game' ? 2 : 1,
      auto_compute_enabled: platform === 'chess.com' ? autoComputeEnabled : false,
      image_url: imageUrl.trim() || null,
      is_featured: isFeatured,
      rules: rules.length > 0 ? rules : undefined,
      ...schedulePayload,
    }

    try {
      if (isEditMode && competition) {
        const response = await updateMutation.mutateAsync({
          id: competition.id,
          payload: basePayload as UpdateCompetitionPayload,
        })
        toast.success(`"${response.data.name}" updated successfully`)
        router.push(`/admin/competitions/${competition.id}`)
        return
      }

      const response = await createMutation.mutateAsync({
        ...basePayload,
        created_by: currentUser.id,
      } as CreateCompetitionPayload)
      toast.success(`"${response.data.name}" created successfully`)
      // Show open registration banner instead of navigating away
      setCreatedCompetitionId(response.data.id)
      setShowOpenRegBanner(true)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : `Failed to ${isEditMode ? 'update' : 'create'} competition`
      )
    }
  }

  // ── Rounds helper text ──
  function getRoundsHelperText(): string | null {
    if (tournamentType === 'knockout') return 'Until a winner is determined'
    if (tournamentType === 'round_robin') return 'Full cycle'
    return null
  }

  // ── Render ──
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Header ── */}
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
                Configure your tournament format, rules, and structure.
              </p>
            </div>
          </div>
          {isEditMode && competition?.competition_status === 'draft' && (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20"
              onClick={() => handleOpenRegistration(competition.id)}
              disabled={openRegistrationMutation.isPending}
            >
              {openRegistrationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Open Registration
            </Button>
          )}
          <Button type="button" variant="outline" asChild className="shrink-0">
            <Link href="/admin/competitions">
              <ChevronLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Left Column ── */}
        <div className="space-y-6">
          {/* ── Basic Information ── */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="size-5 text-amber-500" />
                Basic Information
              </CardTitle>
              <CardDescription>Name and configure your tournament.</CardDescription>
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
                <Label htmlFor="imageUrl">Tournament image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://… or /hero/chess-1.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Shown on the player dashboard hero when this tournament is featured.
                </p>
                {imageUrl.trim() ? (
                  <div
                    className="mt-2 h-28 overflow-hidden rounded-xl bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${imageUrl.trim()})` }}
                  />
                ) : null}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
                <Checkbox
                  id="isFeatured"
                  checked={isFeatured}
                  onCheckedChange={(checked) => setIsFeatured(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="isFeatured" className="cursor-pointer text-sm font-medium">
                    Feature on player dashboard
                  </Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Multiple tournaments can be featured at once — they appear together in the
                    hero carousel while events run concurrently.
                  </p>
                </div>
              </div>

              {/* Tournament Format */}
              <div className="space-y-3">
                <Label>Tournament format</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {TOURNAMENT_TYPES.map((type) => {
                    const selected = tournamentType === type.value
                    const isRecommended = formatAdvice.recommended === type.value
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
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{type.label}</p>
                          {isRecommended && (
                            <Badge variant="secondary" className="text-[10px]">
                              Suggested
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
                      </button>
                    )
                  })}
                </div>

                {Number(maxParticipants) >= 2 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 space-y-2">
                    <p className="text-sm font-medium text-amber-950">
                      For {Number(maxParticipants)} players
                    </p>
                    <p className="text-xs text-amber-900 leading-relaxed">{formatAdvice.rationale}</p>
                    <ul className="space-y-1">
                      {formatAdvice.options.map((opt) => (
                        <li
                          key={`${opt.type}-${opt.legs}`}
                          className={`text-[11px] leading-snug ${
                            opt.suitable ? 'text-amber-900' : 'text-amber-700/80'
                          }`}
                        >
                          <span className="font-semibold">{opt.label}</span>
                          {opt.suitable ? '' : ' (heavy)'}
                          {' — '}
                          {opt.note}
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-8 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                      onClick={applyFormatRecommendation}
                    >
                      <Sparkles className="mr-1.5 size-3.5" />
                      Use suggested format
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Tournament Details ── */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-5 text-purple-500" />
                Tournament Details
              </CardTitle>
              <CardDescription>Time control, entry fee, prize, and platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeControl" className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    Time Control
                  </Label>
                  <Input
                    id="timeControl"
                    placeholder="e.g., 5+0 or 3+2"
                    value={timeControl}
                    onChange={(e) => setTimeControl(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="flex items-center gap-1.5">
                    <Globe className="size-3.5 text-muted-foreground" />
                    Timezone
                  </Label>
                  <Input
                    id="timezone"
                    placeholder="e.g., UTC+5:30"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Entry Fee (separate from Prize) */}
              <div className="space-y-2">
                <Label htmlFor="entryFee" className="flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-muted-foreground" />
                  Entry Fee <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="entryFee"
                  placeholder="e.g., $5, Free, or 10,000 NGN"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Prize (separate from Entry Fee) */}
              <div className="space-y-2">
                <Label htmlFor="prize" className="flex items-center gap-1.5">
                  <Gamepad2 className="size-3.5 text-muted-foreground" />
                  Prize <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="prize"
                  placeholder="e.g., Trophy, Cash prize, or bragging rights"
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform" className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  Platform
                </Label>
                <Select value={platform} onValueChange={(val) => setPlatform(val)}>
                  <SelectTrigger id="platform" className="h-11">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {platform === 'chess.com' && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                  <Checkbox
                    id="autoCompute"
                    checked={autoComputeEnabled}
                    onCheckedChange={(checked) => setAutoComputeEnabled(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="autoCompute" className="text-sm font-medium cursor-pointer">
                      Auto-compute from Chess.com
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Daily job (or admin Compute) fetches games between paired players and scores matches automatically. Admins can always override.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Match Configuration (single unified section) ── */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="size-5 text-red-500" />
                Match Configuration
              </CardTitle>
              <CardDescription>How each pairing is played.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label>Match Format</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {currentMatchOptions.map((opt) => {
                    const selected = matchLength === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMatchLength(opt.value)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          selected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-primary/40 hover:bg-muted/50'
                        }`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Competition Rules (Dynamic Input UI) ── */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="size-5 text-orange-500" />
                Competition Rules
              </CardTitle>
              <CardDescription>Add specific rules players must follow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.length > 0 && (
                <ul className="space-y-2">
                  {rules.map((rule, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        {rule}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showRuleInput ? (
                <div className="flex flex-col gap-2">
                  <AutoResizeTextarea
                    value={currentRule}
                    onChange={(e) => setCurrentRule(e.target.value)}
                    placeholder="Enter a rule..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        addRule()
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={addRule}
                      disabled={!currentRule.trim()}
                      className="h-10"
                    >
                      <Plus className="mr-1.5 size-4" />
                      Add Rule
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrentRule('')
                        setShowRuleInput(false)
                      }}
                      className="h-10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRuleInput(true)}
                  className="w-full gap-1.5"
                >
                  <Plus className="size-4" />
                  Add Rule
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          {/* ── Capacity & Rounds ── */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-blue-500" />
                Capacity & Rounds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maximum Players</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min={2}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Dynamic Rounds Field */}
              <div className="space-y-2">
                <Label htmlFor="rounds">
                  {tournamentType === 'swiss'
                    ? 'Number of Rounds'
                    : tournamentType === 'knockout'
                    ? 'Estimated Rounds'
                    : 'Total Rounds'}
                </Label>
                <div className="relative">
                  <Input
                    id="rounds"
                    type="number"
                    min={1}
                    value={roundsDisplayValue}
                    onChange={(e) => {
                      if (isRoundsEditable) setRounds(e.target.value)
                    }}
                    readOnly={!isRoundsEditable}
                    className={`h-11 ${!isRoundsEditable ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : ''}`}
                  />
                  {!isRoundsEditable && (
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        AUTO
                      </Badge>
                    </div>
                  )}
                </div>
                {getRoundsHelperText() && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {getRoundsHelperText()}
                  </p>
                )}
              </div>

              {/* Round Robin Legs toggle — REMOVED since match config handles it */}

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
              {Number(minElo) > Number(maxElo) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="size-3" />
                  Min ELO cannot exceed Max ELO
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Schedule ── */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-emerald-500" />
                Schedule
              </CardTitle>
              <CardDescription>Set registration window and play dates.</CardDescription>
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

      {/* ── Open Registration Banner ── */}
      {showOpenRegBanner && createdCompetitionId && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Check className="size-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Open registration
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 rounded-xl border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              onClick={() => createdCompetitionId && handleOpenRegistration(createdCompetitionId)}
              disabled={openRegistrationMutation.isPending}
            >
              {openRegistrationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4 text-emerald-600" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 rounded-xl"
              onClick={() => createdCompetitionId && handleDismissBanner(createdCompetitionId)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Footer Actions ── */}
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