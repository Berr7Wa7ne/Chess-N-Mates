"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Image as ImageIcon,
  Info,
  ListChecks,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react"
import {
  AdminContentModal,
  AdminIconAction,
  AdminIconRow,
  AdminPanel,
} from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/src/hooks/useAuth"
import {
  useCreateCompetition,
  useOpenRegistration,
  useUpdateCompetition,
} from "@/src/hooks/useCompetitions"
import { recommendTournamentFormat } from "@/src/lib/tournament-advisor"
import { ApiError } from "@/src/types/api"
import type {
  Competition,
  CreateCompetitionPayload,
  MatchLength,
  Platform,
  TournamentType,
  UpdateCompetitionPayload,
} from "@/src/types/competition"
import { cn } from "@/lib/utils"

const TOURNAMENT_TYPES: { value: TournamentType; label: string }[] = [
  { value: "swiss", label: "Swiss" },
  { value: "knockout", label: "Knockout" },
  { value: "round_robin", label: "Round robin" },
]

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "chess.com", label: "Chess.com" },
  { value: "lichess", label: "Lichess" },
  { value: "over_the_board", label: "Over the board" },
  { value: "others", label: "Others" },
]

const MATCH_CONFIG_OPTIONS: Record<
  TournamentType,
  { value: MatchLength; label: string; description: string }[]
> = {
  swiss: [
    { value: "single_game", label: "Single game", description: "One game per pairing." },
    { value: "double_game", label: "Double game", description: "Play twice, swap colors." },
    { value: "best_of_3", label: "Best of 3", description: "First to 2 wins." },
    { value: "best_of_5", label: "Best of 5", description: "First to 3 wins." },
  ],
  knockout: [
    { value: "single_game", label: "Single game", description: "One game per pairing." },
    { value: "best_of_3", label: "Best of 3", description: "First to 2 wins." },
    { value: "best_of_5", label: "Best of 5", description: "First to 3 wins." },
  ],
  round_robin: [
    { value: "single_game", label: "Single game", description: "Each pairing once." },
    { value: "double_game", label: "Double game", description: "Each pairing twice." },
  ],
}

function toIsoOrUndefined(value: string) {
  if (!value) return undefined
  return new Date(value).toISOString()
}

function toDateTimeLocalValue(value?: string | null | Date) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function defaultScheduleFromStart(start: Date) {
  const now = new Date()
  const regClose = new Date(start.getTime() - 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
  return {
    registrationOpenAt: toDateTimeLocalValue(now),
    registrationCloseAt: toDateTimeLocalValue(
      regClose.getTime() > now.getTime() ? regClose : now
    ),
    startDate: toDateTimeLocalValue(start),
    endDate: toDateTimeLocalValue(end),
  }
}

function computeRounds(
  tournamentType: TournamentType,
  maxPlayers: number,
  matchLength: MatchLength
): number {
  if (tournamentType === "knockout") {
    return Math.max(1, Math.ceil(Math.log2(Math.max(maxPlayers, 2))))
  }
  if (tournamentType === "round_robin") {
    return maxPlayers < 2 ? 0 : maxPlayers - 1
  }
  return 0
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  onKeyDown,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
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
      className="min-h-[40px] resize-none overflow-hidden rounded-xl"
    />
  )
}

function CollapsibleBlock({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string
  summary?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-panel-light">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {summary ? (
            <p className="mt-0.5 truncate text-[12px] text-text-secondary">{summary}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-text-secondary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? <div className="space-y-4 border-t border-border-subtle px-4 py-4">{children}</div> : null}
    </div>
  )
}

interface CreateCompetitionFormProps {
  competition?: Competition
  mode?: "create" | "edit"
}

export function CreateCompetitionForm({
  competition,
  mode = "create",
}: CreateCompetitionFormProps) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const createMutation = useCreateCompetition()
  const updateMutation = useUpdateCompetition()
  const openRegistrationMutation = useOpenRegistration()
  const isEditMode = mode === "edit"
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const initialSchedule = useMemo(() => {
    if (competition) {
      return {
        registrationOpenAt: toDateTimeLocalValue(competition.registration_open_at),
        registrationCloseAt: toDateTimeLocalValue(competition.registration_close_at),
        startDate: toDateTimeLocalValue(competition.start_date),
        endDate: toDateTimeLocalValue(competition.end_date),
      }
    }
    return defaultScheduleFromStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  }, [competition])

  const [createdCompetitionId, setCreatedCompetitionId] = useState<string | null>(null)
  const [showOpenRegBanner, setShowOpenRegBanner] = useState(false)

  const [name, setName] = useState(competition?.name ?? "")
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    competition?.tournament_type ?? "swiss"
  )
  const [timeControl, setTimeControl] = useState(competition?.time_control ?? "10+0")
  const [timezone, setTimezone] = useState(competition?.timezone ?? "UTC+1:00")
  const [entryFee, setEntryFee] = useState(competition?.entry_fee ?? "")
  const [prize, setPrize] = useState(competition?.prize ?? "")
  const [platform, setPlatform] = useState(competition?.platform ?? "chess.com")
  const [autoComputeEnabled, setAutoComputeEnabled] = useState(
    competition?.auto_compute_enabled !== false
  )
  const [imageUrl, setImageUrl] = useState(competition?.image_url ?? "")
  const [isFeatured, setIsFeatured] = useState(Boolean(competition?.is_featured))

  const currentMatchOptions = MATCH_CONFIG_OPTIONS[tournamentType]
  const [matchLength, setMatchLength] = useState<MatchLength>(() => {
    if (competition?.match_length) return competition.match_length as MatchLength
    return currentMatchOptions[0].value
  })

  const [maxParticipants, setMaxParticipants] = useState(
    String(competition?.max_participants ?? 32)
  )
  const [rounds, setRounds] = useState(String(competition?.rounds ?? 5))
  const [minElo, setMinElo] = useState(String(competition?.min_elo ?? 800))
  const [maxElo, setMaxElo] = useState(String(competition?.max_elo ?? 3000))

  const [registrationOpenAt, setRegistrationOpenAt] = useState(
    initialSchedule.registrationOpenAt
  )
  const [registrationCloseAt, setRegistrationCloseAt] = useState(
    initialSchedule.registrationCloseAt
  )
  const [startDate, setStartDate] = useState(initialSchedule.startDate)
  const [endDate, setEndDate] = useState(initialSchedule.endDate)
  const [scheduleLocked, setScheduleLocked] = useState(isEditMode)

  const [rules, setRules] = useState<string[]>(competition?.rules ?? [])
  const [showRuleInput, setShowRuleInput] = useState(false)
  const [currentRule, setCurrentRule] = useState("")

  const [openSchedule, setOpenSchedule] = useState(false)
  const [openCapacity, setOpenCapacity] = useState(false)
  const [openMatch, setOpenMatch] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  const [openRules, setOpenRules] = useState(false)

  const [modal, setModal] = useState<
    null | "image" | "advice" | "summary"
  >(null)

  useEffect(() => {
    const valid = currentMatchOptions.some((opt) => opt.value === matchLength)
    if (!valid) setMatchLength(currentMatchOptions[0].value)
  }, [tournamentType, currentMatchOptions, matchLength])

  useEffect(() => {
    if (!competition) return
    setName(competition.name)
    setTournamentType(competition.tournament_type)
    setTimeControl(competition.time_control ?? "10+0")
    setTimezone(competition.timezone ?? "UTC+1:00")
    setEntryFee(competition.entry_fee ?? "")
    setPrize(competition.prize ?? "")
    setPlatform(competition.platform ?? "chess.com")
    setAutoComputeEnabled(competition.auto_compute_enabled !== false)
    setImageUrl(competition.image_url ?? "")
    setIsFeatured(Boolean(competition.is_featured))
    const ml = competition.match_length as MatchLength
    const valid = MATCH_CONFIG_OPTIONS[competition.tournament_type].some(
      (opt) => opt.value === ml
    )
    setMatchLength(
      valid ? ml : MATCH_CONFIG_OPTIONS[competition.tournament_type][0].value
    )
    setMaxParticipants(String(competition.max_participants ?? 32))
    setRounds(String(competition.rounds ?? 5))
    setMinElo(String(competition.min_elo ?? 800))
    setMaxElo(String(competition.max_elo ?? 3000))
    setRules(competition.rules ?? [])
    setRegistrationOpenAt(toDateTimeLocalValue(competition.registration_open_at))
    setRegistrationCloseAt(toDateTimeLocalValue(competition.registration_close_at))
    setStartDate(toDateTimeLocalValue(competition.start_date))
    setEndDate(toDateTimeLocalValue(competition.end_date))
    setScheduleLocked(true)
  }, [competition])

  const computedRounds = computeRounds(
    tournamentType,
    Number(maxParticipants) || 2,
    matchLength
  )
  const isRoundsEditable = tournamentType === "swiss"
  const roundsDisplayValue = isRoundsEditable ? rounds : String(computedRounds)
  const formatAdvice = recommendTournamentFormat(Number(maxParticipants) || 0)

  function applyFormatRecommendation() {
    const advice = formatAdvice
    setTournamentType(advice.recommended)
    if (advice.recommended === "round_robin") {
      setMatchLength(advice.recommended_legs === 2 ? "double_game" : "single_game")
    } else if (advice.recommended === "swiss") {
      setMatchLength("single_game")
      setRounds(String(advice.recommended_rounds))
    } else {
      setMatchLength("single_game")
    }
    toast.success(`Applied ${advice.recommended.replace("_", " ")} recommendation`)
    setModal(null)
  }

  function handleStartDateChange(value: string) {
    setStartDate(value)
    if (scheduleLocked || !value) return
    const start = new Date(value)
    if (Number.isNaN(start.getTime())) return
    const next = defaultScheduleFromStart(start)
    setRegistrationOpenAt(next.registrationOpenAt)
    setRegistrationCloseAt(next.registrationCloseAt)
    setEndDate(next.endDate)
  }

  function validate(): string | null {
    if (!name.trim()) return "Competition name is required"
    if (!registrationOpenAt || !registrationCloseAt || !startDate || !endDate) {
      return "Schedule dates are required — open Schedule to review"
    }
    if (Number(minElo) > Number(maxElo)) return "Minimum ELO cannot be greater than Maximum ELO"
    if (Number(maxParticipants) < 2) return "Must have at least 2 players"
    if (isRoundsEditable && Number(rounds) < 1) return "Rounds must be at least 1"
    return null
  }

  function addRule() {
    if (!currentRule.trim()) return
    setRules((prev) => [...prev, currentRule.trim()])
    setCurrentRule("")
    setShowRuleInput(false)
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  function deriveFormatMatchRules(type: TournamentType, ml: MatchLength): string {
    if (type === "swiss") {
      return ml === "double_game" ? "two_game_round" : "single_game_per_round"
    }
    if (type === "knockout") {
      return ml === "single_game" ? "single_elimination" : "two_game_match"
    }
    if (type === "round_robin") {
      return ml === "double_game" ? "double_leg" : "single_leg"
    }
    return "single_game_per_round"
  }

  async function handleOpenRegistration(competitionId: string) {
    try {
      await openRegistrationMutation.mutateAsync(competitionId)
      toast.success("Registration opened successfully")
      router.push(`/admin/competitions/${competitionId}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to open registration")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (!currentUser) {
      toast.error("You must be logged in to create a competition")
      return
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
      round_robin_legs:
        tournamentType === "round_robin" && matchLength === "double_game" ? 2 : 1,
      auto_compute_enabled: platform === "chess.com" ? autoComputeEnabled : false,
      image_url: imageUrl.trim() || null,
      is_featured: isFeatured,
      rules: rules.length > 0 ? rules : undefined,
      registration_open_at: toIsoOrUndefined(registrationOpenAt) as string,
      registration_close_at: toIsoOrUndefined(registrationCloseAt) as string,
      start_date: toIsoOrUndefined(startDate) as string,
      end_date: toIsoOrUndefined(endDate) as string,
    }

    try {
      if (isEditMode && competition) {
        await updateMutation.mutateAsync({
          id: competition.id,
          payload: basePayload as UpdateCompetitionPayload,
        })
        toast.success(`"${name.trim()}" updated`)
        router.push(`/admin/competitions/${competition.id}`)
        return
      }

      const response = await createMutation.mutateAsync({
        ...basePayload,
        created_by: currentUser.id,
      } as CreateCompetitionPayload)
      toast.success(`"${response.data.name}" created`)
      setCreatedCompetitionId(response.data.id)
      setShowOpenRegBanner(true)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : `Failed to ${isEditMode ? "update" : "create"} competition`
      )
    }
  }

  const matchLabel =
    currentMatchOptions.find((o) => o.value === matchLength)?.label ?? "Single game"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" asChild className="-ml-2 rounded-xl">
          <Link href="/admin/competitions">
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <AdminIconRow>
          <AdminIconAction
            icon={Sparkles}
            label="Format advice"
            onClick={() => setModal("advice")}
          />
          <AdminIconAction
            icon={ImageIcon}
            label="Image & featured"
            onClick={() => setModal("image")}
            active={Boolean(imageUrl.trim()) || isFeatured}
          />
          <AdminIconAction
            icon={Info}
            label="Quick summary"
            onClick={() => setModal("summary")}
          />
        </AdminIconRow>
      </div>

      <AdminPanel className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Tournament name</Label>
          <Input
            id="name"
            placeholder="Rapid Masters Cup 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus={!isEditMode}
            className="h-12 rounded-xl text-base font-semibold"
          />
        </div>

        <div className="space-y-2">
          <Label>Format</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TOURNAMENT_TYPES.map((type) => {
              const selected = tournamentType === type.value
              const suggested = formatAdvice.recommended === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTournamentType(type.value)}
                  className={cn(
                    "min-h-11 rounded-xl px-3 py-3 text-center text-sm font-semibold transition-all",
                    selected
                      ? "bg-accent-gold text-text-primary"
                      : "bg-bg-shell text-text-secondary hover:text-text-primary"
                  )}
                >
                  {type.label}
                  {suggested && !selected ? (
                    <span className="mt-1 block text-[10px] font-medium opacity-70">
                      Suggested
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Players</Label>
            <Input
              id="maxParticipants"
              type="number"
              min={2}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Starts</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <p className="text-[12px] leading-relaxed text-text-secondary">
          Registration, end date, rounds, platform, and match format are auto-filled.
          Expand a section only if you need to change them.
        </p>

        <div className="flex items-center gap-3 rounded-xl bg-bg-shell px-3 py-3">
          <Checkbox
            id="isFeatured"
            checked={isFeatured}
            onCheckedChange={(checked) => setIsFeatured(checked === true)}
          />
          <Label htmlFor="isFeatured" className="cursor-pointer text-sm font-medium">
            Feature on player dashboard
          </Label>
        </div>
      </AdminPanel>

      <CollapsibleBlock
        title="Schedule"
        summary={
          startDate
            ? `Reg closes ${registrationCloseAt ? new Date(registrationCloseAt).toLocaleString() : "—"} · Ends ${endDate ? new Date(endDate).toLocaleString() : "—"}`
            : "Auto from start date"
        }
        open={openSchedule}
        onToggle={() => setOpenSchedule((v) => !v)}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="registrationOpen">Registration opens</Label>
            <Input
              id="registrationOpen"
              type="datetime-local"
              value={registrationOpenAt}
              onChange={(e) => {
                setScheduleLocked(true)
                setRegistrationOpenAt(e.target.value)
              }}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationClose">Registration closes</Label>
            <Input
              id="registrationClose"
              type="datetime-local"
              value={registrationCloseAt}
              onChange={(e) => {
                setScheduleLocked(true)
                setRegistrationCloseAt(e.target.value)
              }}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End date</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setScheduleLocked(true)
                setEndDate(e.target.value)
              }}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      </CollapsibleBlock>

      <CollapsibleBlock
        title="Capacity & rating"
        summary={`${maxParticipants} players · ${roundsDisplayValue} rounds · ELO ${minElo}–${maxElo}`}
        open={openCapacity}
        onToggle={() => setOpenCapacity((v) => !v)}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rounds">
              {isRoundsEditable ? "Number of rounds" : "Rounds (auto)"}
            </Label>
            <Input
              id="rounds"
              type="number"
              min={1}
              value={roundsDisplayValue}
              onChange={(e) => {
                if (isRoundsEditable) setRounds(e.target.value)
              }}
              readOnly={!isRoundsEditable}
              className={cn("h-11 rounded-xl", !isRoundsEditable && "bg-muted/50")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minElo">Min ELO</Label>
              <Input
                id="minElo"
                type="number"
                value={minElo}
                onChange={(e) => setMinElo(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxElo">Max ELO</Label>
              <Input
                id="maxElo"
                type="number"
                value={maxElo}
                onChange={(e) => setMaxElo(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </div>
      </CollapsibleBlock>

      <CollapsibleBlock
        title="Match format"
        summary={matchLabel}
        open={openMatch}
        onToggle={() => setOpenMatch((v) => !v)}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {currentMatchOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMatchLength(opt.value)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-all",
                matchLength === opt.value
                  ? "border-text-primary bg-accent-gold/40"
                  : "border-border-subtle hover:bg-black/[0.03]"
              )}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-[11px] text-text-secondary">{opt.description}</p>
            </button>
          ))}
        </div>
      </CollapsibleBlock>

      <CollapsibleBlock
        title="Details"
        summary={`${platform} · ${timeControl || "time control"} · ${entryFee || "free entry"}`}
        open={openDetails}
        onToggle={() => setOpenDetails((v) => !v)}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="timeControl">Time control</Label>
            <Input
              id="timeControl"
              placeholder="10+0"
              value={timeControl}
              onChange={(e) => setTimeControl(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform" className="h-11 rounded-xl">
                <SelectValue />
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
          {platform === "chess.com" && (
            <div className="flex items-start gap-3 rounded-xl bg-bg-shell px-3 py-3">
              <Checkbox
                id="autoCompute"
                checked={autoComputeEnabled}
                onCheckedChange={(checked) => setAutoComputeEnabled(checked === true)}
              />
              <Label htmlFor="autoCompute" className="cursor-pointer text-sm font-medium">
                Auto-compute results from Chess.com
              </Label>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="entryFee">Entry fee</Label>
            <Input
              id="entryFee"
              placeholder="Free"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prize">Prize</Label>
            <Input
              id="prize"
              placeholder="Optional"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      </CollapsibleBlock>

      <CollapsibleBlock
        title="Rules"
        summary={rules.length ? `${rules.length} rule${rules.length === 1 ? "" : "s"}` : "None yet"}
        open={openRules}
        onToggle={() => setOpenRules((v) => !v)}
      >
        {rules.length > 0 && (
          <ul className="space-y-2">
            {rules.map((rule, index) => (
              <li
                key={`${rule}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-bg-shell px-3 py-2.5 text-sm"
              >
                <span>
                  <span className="mr-2 font-bold text-text-secondary">{index + 1}.</span>
                  {rule}
                </span>
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="rounded-lg p-1 text-text-secondary hover:text-red-600"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {showRuleInput ? (
          <div className="space-y-2">
            <AutoResizeTextarea
              value={currentRule}
              onChange={(e) => setCurrentRule(e.target.value)}
              placeholder="Enter a rule…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  addRule()
                }
              }}
            />
            <div className="flex gap-2">
              <Button type="button" onClick={addRule} disabled={!currentRule.trim()} className="rounded-xl">
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setCurrentRule("")
                  setShowRuleInput(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => setShowRuleInput(true)}
          >
            <Plus className="mr-1.5 size-4" />
            Add rule
          </Button>
        )}
      </CollapsibleBlock>

      {showOpenRegBanner && createdCompetitionId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-bg-panel-dark px-5 py-4 text-white">
          <div>
            <p className="text-sm text-white/55">Tournament created</p>
            <p className="font-semibold">Open registration now?</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleOpenRegistration(createdCompetitionId)}
              disabled={openRegistrationMutation.isPending}
              className="rounded-xl bg-accent-gold px-4 py-2.5 text-sm font-bold text-text-primary disabled:opacity-60"
            >
              {openRegistrationMutation.isPending ? "Opening…" : "Open registration"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/admin/competitions/${createdCompetitionId}`)}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold"
            >
              Later
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild className="h-12 rounded-xl px-6">
          <Link href="/admin/competitions">Cancel</Link>
        </Button>
        {isEditMode && competition?.competition_status === "draft" && (
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-6"
            onClick={() => handleOpenRegistration(competition.id)}
            disabled={openRegistrationMutation.isPending}
          >
            {openRegistrationMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            Open registration
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-xl bg-bg-panel-dark px-8 text-white hover:bg-black"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {isEditMode ? "Saving…" : "Creating…"}
            </>
          ) : (
            <>
              <Settings2 className="mr-2 size-4" />
              {isEditMode ? "Save changes" : "Create tournament"}
            </>
          )}
        </Button>
      </div>

      <AdminContentModal
        open={modal === "image"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Image & featured"
        description="Optional — leave blank to use default hero art"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… or /hero/chess-1.jpg"
              className="h-11 rounded-xl"
            />
          </div>
          {imageUrl.trim() ? (
            <div
              className="h-32 rounded-xl bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl.trim()})` }}
            />
          ) : null}
          <div className="flex items-start gap-3 rounded-xl bg-bg-panel-light px-3 py-3">
            <Checkbox
              id="modalFeatured"
              checked={isFeatured}
              onCheckedChange={(checked) => setIsFeatured(checked === true)}
            />
            <Label htmlFor="modalFeatured" className="cursor-pointer text-sm font-medium">
              Feature on player dashboard (multiple featured events can run together)
            </Label>
          </div>
          <button
            type="button"
            className="h-11 w-full rounded-xl bg-bg-panel-dark text-sm font-semibold text-white"
            onClick={() => setModal(null)}
          >
            Done
          </button>
        </div>
      </AdminContentModal>

      <AdminContentModal
        open={modal === "advice"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Format advice"
        description={`For ${maxParticipants || "?"} players`}
      >
        <p className="text-sm leading-relaxed text-text-secondary">{formatAdvice.rationale}</p>
        <ul className="mt-4 space-y-2">
          {formatAdvice.options.map((opt) => (
            <li
              key={`${opt.type}-${opt.legs}`}
              className="rounded-xl bg-bg-panel-light px-3 py-2.5 text-[13px]"
            >
              <span className="font-semibold">{opt.label}</span>
              {!opt.suitable ? " (heavy)" : ""} — {opt.note}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={applyFormatRecommendation}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-gold text-sm font-bold text-text-primary"
        >
          <Sparkles className="size-4" />
          Use suggested format
        </button>
      </AdminContentModal>

      <AdminContentModal
        open={modal === "summary"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Quick summary"
        description="What will be saved"
      >
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <Users className="size-4 text-text-secondary" />
            {maxParticipants} players · {roundsDisplayValue} rounds · ELO {minElo}–{maxElo}
          </li>
          <li className="flex items-center gap-3">
            <Swords className="size-4 text-text-secondary" />
            {TOURNAMENT_TYPES.find((t) => t.value === tournamentType)?.label} · {matchLabel}
          </li>
          <li className="flex items-center gap-3">
            <Calendar className="size-4 text-text-secondary" />
            Starts {startDate ? new Date(startDate).toLocaleString() : "—"}
          </li>
          <li className="flex items-center gap-3">
            <ListChecks className="size-4 text-text-secondary" />
            {platform}
            {platform === "chess.com" && autoComputeEnabled ? " · auto-compute on" : ""}
            {isFeatured ? " · featured" : ""}
          </li>
          {rules.length ? (
            <li className="flex items-start gap-3">
              <Badge variant="secondary">{rules.length} rules</Badge>
            </li>
          ) : null}
        </ul>
      </AdminContentModal>
    </form>
  )
}
