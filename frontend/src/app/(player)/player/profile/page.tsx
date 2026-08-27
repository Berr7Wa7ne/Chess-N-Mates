"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
} from "@/components/layout/player-page-shell"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitions, useCompetitionStandings } from "@/src/hooks/useCompetitions"
import { useUserRegistrations } from "@/src/hooks/useParticipants"
import { cn } from "@/lib/utils"

function DetailRow({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  const display = value?.trim() ? value : "—"
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border-subtle py-4 last:border-b-0">
      <span className="shrink-0 text-[13px] font-medium text-text-secondary">{label}</span>
      <span
        className={cn(
          "min-w-0 text-right text-[15px] font-semibold text-text-primary",
          !value?.trim() && "font-medium text-text-secondary"
        )}
      >
        {display}
      </span>
    </div>
  )
}

export default function PlayerProfilePage() {
  const router = useRouter()
  const { currentUser, logout } = useAuth()
  const { data: competitions } = useCompetitions()
  const { data: registrationIds } = useUserRegistrations(currentUser?.id)

  const lastTournament = useMemo(() => {
    if (!competitions?.length || !registrationIds?.length) return null
    const idSet = new Set(registrationIds.map(String))
    const joined = competitions
      .filter((c) => idSet.has(String(c.id)))
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.end_date || a.start_date || a.updated_at || 0).getTime()
        const bTime = new Date(b.end_date || b.start_date || b.updated_at || 0).getTime()
        return bTime - aTime
      })

    return (
      joined.find((c) => c.competition_status === "completed") ||
      joined.find((c) => c.competition_status === "active") ||
      joined[0] ||
      null
    )
  }, [competitions, registrationIds])

  const standingsQuery = useCompetitionStandings(
    lastTournament?.id ?? "",
    Boolean(lastTournament?.id)
  )

  const lastStanding = useMemo(() => {
    if (!currentUser || !standingsQuery.data?.length) return null
    return (
      standingsQuery.data.find((row) => String(row.user_id) === String(currentUser.id)) ?? null
    )
  }, [currentUser, standingsQuery.data])

  const communityElo = lastStanding?.chess_elo ?? currentUser?.chess_elo ?? null

  const name = currentUser?.display_name || "—"
  const username =
    currentUser?.chess_username ||
    currentUser?.chess_com_username ||
    currentUser?.lichess_username ||
    "—"
  const phone = currentUser?.phone_number || currentUser?.whatsapp_phone || "—"
  const chessCom = currentUser?.chess_com_username || "—"
  const lichess = currentUser?.lichess_username || "—"

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <PlayerPageShell>
      <PlayerPageHeader title="Profile" description="Your account details" />

      <PlayerPanel className="py-2">
        <DetailRow label="Name" value={name === "—" ? null : name} />
        <DetailRow label="Username" value={username === "—" ? null : username} />
        <DetailRow label="Phone number" value={phone === "—" ? null : phone} />
        <DetailRow label="Chess.com username" value={chessCom === "—" ? null : chessCom} />
        <DetailRow label="Lichess username" value={lichess === "—" ? null : lichess} />
      </PlayerPanel>

      <PlayerPanel dark>
        <p className="text-[13px] font-medium text-white/50">Community ELO</p>
        <p className="mt-2 tabular-nums text-5xl font-extrabold tracking-tight text-accent-lime">
          {communityElo ?? "—"}
        </p>
        <p className="mt-2 text-sm text-white/55">
          {lastTournament
            ? `Last tournament performance · ${lastTournament.name}`
            : "Last tournament performance rating"}
        </p>

        <div className="scrollbar-none mt-6 max-h-48 overflow-y-auto border-t border-white/10 pt-4">
          {standingsQuery.isLoading ? (
            <p className="text-sm text-white/40">Loading tournament details…</p>
          ) : lastStanding ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Rank</span>
                <span className="font-semibold text-white">
                  #{lastStanding.rank_display || lastStanding.rank}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Points</span>
                <span className="font-semibold text-white">{lastStanding.points}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Record</span>
                <span className="font-semibold text-white">
                  {lastStanding.wins}W · {lastStanding.draws}D · {lastStanding.losses}L
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Played</span>
                <span className="font-semibold text-white">{lastStanding.played}</span>
              </div>
              {typeof lastStanding.buchholz === "number" && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Buchholz</span>
                  <span className="font-semibold text-white">{lastStanding.buchholz}</span>
                </div>
              )}
              {typeof lastStanding.sonneborn_berger === "number" && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Sonneborn–Berger</span>
                  <span className="font-semibold text-white">
                    {lastStanding.sonneborn_berger}
                  </span>
                </div>
              )}
              {lastStanding.participant_status && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Status</span>
                  <span className="font-semibold capitalize text-white">
                    {lastStanding.participant_status.replaceAll("_", " ")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40">No tournament performance on record yet.</p>
          )}
        </div>
      </PlayerPanel>

      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-panel-light text-sm font-semibold text-red-600 transition-colors hover:bg-black/[0.03]"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </PlayerPageShell>
  )
}
