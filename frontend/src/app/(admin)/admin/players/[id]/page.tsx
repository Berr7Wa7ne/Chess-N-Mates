"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanel,
  AdminPanelTitle,
} from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { PlayerIdentity } from "@/components/shared"
import { useCommunityLeaderboard } from "@/src/hooks/useCommunityLeaderboard"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useCompetitionsStandings } from "@/src/hooks/useCompetitionsStandings"
import { useUserRegistrations } from "@/src/hooks/useParticipants"
import { useUser } from "@/src/hooks/useUsers"
import { userService } from "@/src/services/user.service"
import { ApiError } from "@/src/types/api"

function formatRelativeTime(iso?: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

export default function PlayerDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: player, isLoading, isError } = useUser(id)
  const { data: registrationIds } = useUserRegistrations(id)
  const { data: competitions, isLoading: competitionsLoading } = useCompetitions()
  const [resetting, setResetting] = useState(false)
  const [adminCode, setAdminCode] = useState("")
  const [showReset, setShowReset] = useState(false)

  const rankingCompetitionIds = useMemo(
    () =>
      (competitions ?? [])
        .filter((c) => ["active", "completed"].includes(c.competition_status))
        .map((c) => c.id),
    [competitions]
  )

  const { byCompetitionId, isLoading: standingsLoading } =
    useCompetitionsStandings(rankingCompetitionIds)

  const { entries, isLoading: leaderboardLoading } = useCommunityLeaderboard(
    byCompetitionId,
    competitionsLoading || standingsLoading
  )

  const standing = entries.find((entry) => String(entry.userId) === String(id))

  const activeTournamentCount = useMemo(() => {
    const ids = new Set((registrationIds ?? []).map(String))
    return (competitions ?? []).filter(
      (c) => ids.has(String(c.id)) && c.competition_status === "active"
    ).length
  }, [competitions, registrationIds])

  if (isLoading) {
    return (
      <AdminPageShell>
        <p className="text-sm text-text-secondary">Loading player…</p>
      </AdminPageShell>
    )
  }

  if (isError || !player) {
    return (
      <AdminPageShell>
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          Members
        </Link>
        <p className="mt-4 text-sm text-text-secondary">Player not found.</p>
      </AdminPageShell>
    )
  }

  const username =
    player.chess_username ||
    player.chess_com_username ||
    player.lichess_username ||
    player.display_name
  const elo = player.chess_elo ?? 0
  const status = player.user_status || "active"

  async function handleResetPassword() {
    if (!adminCode.trim()) {
      toast.error("Enter the admin code to reset the password")
      return
    }
    setResetting(true)
    try {
      const response = await userService.resetPassword(id, {
        admin_code: adminCode.trim(),
      })
      toast.success(
        response.data?.message ||
          `Password reset. Default: ${response.data?.default_password || "the platform default"}`
      )
      setShowReset(false)
      setAdminCode("")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to reset password")
    } finally {
      setResetting(false)
    }
  }

  return (
    <AdminPageShell>
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Members
      </Link>

      <AdminPageHeader
        title={player.display_name}
        description="Player profile, activity, and community leaderboard standing."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel>
          <AdminPanelTitle title="Player overview" />
          <div className="mt-3 space-y-5">
            <PlayerIdentity playerId={String(player.id)} username={username} elo={elo} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-text-secondary">Platform</p>
                <p className="mt-1 font-medium capitalize">
                  {player.chess_platform?.replaceAll("_", " ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Status</p>
                <div className="mt-2">
                  <Badge
                    className={
                      status === "active"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-600"
                    }
                  >
                    {status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Active tournaments</p>
                <p className="mt-1 font-medium">{activeTournamentCount}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Last active</p>
                <p className="mt-1 font-medium">
                  {formatRelativeTime(player.last_activity_at || player.updated_at)}
                </p>
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <p className="text-sm font-semibold text-text-primary">Password</p>
              <p className="mt-1 text-xs text-text-secondary">
                Reset this member to the platform default password.
              </p>
              {!showReset ? (
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border-subtle px-4 text-sm font-semibold text-text-primary"
                >
                  Reset to default password
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <input
                    type="password"
                    placeholder="Admin code"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border-subtle bg-bg-shell px-3 text-sm outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={resetting}
                      onClick={handleResetPassword}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-bg-panel-dark text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {resetting ? "Resetting…" : "Confirm reset"}
                    </button>
                    <button
                      type="button"
                      disabled={resetting}
                      onClick={() => {
                        setShowReset(false)
                        setAdminCode("")
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-border-subtle px-4 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelTitle
            title="Community leaderboard"
            description="Standing from tournament results"
          />
          {leaderboardLoading ? (
            <p className="mt-3 text-sm text-text-secondary">Loading rankings…</p>
          ) : standing ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Rank</p>
                <p className="mt-1 text-2xl font-semibold">#{standing.rank}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Tournament wins</p>
                <p className="mt-1 text-2xl font-semibold">{standing.firstPlaces}</p>
              </div>
              <p className="text-sm text-text-secondary">
                Record: {standing.matchWins} wins, {standing.matchDraws} draws,{" "}
                {standing.matchLosses} losses · {standing.tournamentsPlayed} tournaments
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">
              This player does not have a current leaderboard entry.
            </p>
          )}
        </AdminPanel>
      </div>
    </AdminPageShell>
  )
}
