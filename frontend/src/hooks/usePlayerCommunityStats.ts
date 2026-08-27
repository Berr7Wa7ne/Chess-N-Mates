"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useCompetitionsStandings } from "@/src/hooks/useCompetitionsStandings"
import { buildCommunityLeaderboard } from "@/src/lib/community-leaderboard"
import { queryKeys } from "@/src/lib/query-keys"
import { userService } from "@/src/services/user.service"
import type { Competition, StandingEntry } from "@/src/types/competition"

export type PlayerCommunityStats = {
  displayName: string
  handle: string
  games: number
  wins: number
  draws: number
  losses: number
  ratio: string
  communityElo: number | null
  lastTournamentName: string | null
  isLoading: boolean
  profileUser: {
    chess_com_username?: string | null
    chess_username?: string | null
    display_name?: string | null
    chess_platform?: string | null
    chess_elo?: number | null
  } | null
}

function normalizeHandle(value?: string | null) {
  return value?.trim().toLowerCase() ?? ""
}

function isSamePlayer(
  row: StandingEntry,
  userId: string,
  handles: string[]
) {
  if (String(row.user_id) === String(userId)) return true
  const rowHandle = normalizeHandle(row.chess_username)
  const rowName = normalizeHandle(row.display_name)
  return handles.some((h) => h && (h === rowHandle || h === rowName))
}

/**
 * Dashboard community stats — same tournament pool as the leaderboard
 * (active + completed standings), not only registration records.
 */
export function usePlayerCommunityStats(): PlayerCommunityStats {
  const { currentUser } = useAuth()
  const { data: competitions, isLoading: competitionsLoading } = useCompetitions()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.users.detail(currentUser?.id ?? ""),
    queryFn: async () => {
      const response = await userService.getUser(currentUser!.id)
      return response.data
    },
    enabled: Boolean(currentUser?.id),
    staleTime: 60_000,
  })

  const user = profile ?? currentUser

  const rankingCompetitionIds = useMemo(
    () =>
      (competitions ?? [])
        .filter((c) => ["active", "completed"].includes(c.competition_status))
        .map((c) => String(c.id)),
    [competitions]
  )

  const competitionsById = useMemo(() => {
    const map = new Map<string, Competition>()
    for (const c of competitions ?? []) map.set(String(c.id), c)
    return map
  }, [competitions])

  const { byCompetitionId, isLoading: standingsLoading } =
    useCompetitionsStandings(rankingCompetitionIds)

  return useMemo(() => {
    const handles = [
      normalizeHandle(user?.chess_com_username),
      normalizeHandle(user?.chess_username),
      normalizeHandle(user?.lichess_username),
      normalizeHandle(user?.display_name),
    ].filter(Boolean)

    const leaderboard = buildCommunityLeaderboard(byCompetitionId)
    const meFromBoard =
      (currentUser &&
        leaderboard.find((e) => String(e.userId) === String(currentUser.id))) ||
      leaderboard.find((e) => {
        const handle = normalizeHandle(e.chessUsername)
        const name = normalizeHandle(e.displayName)
        return handles.some((h) => h === handle || h === name)
      }) ||
      null

    let wins = meFromBoard?.matchWins ?? 0
    let draws = meFromBoard?.matchDraws ?? 0
    let losses = meFromBoard?.matchLosses ?? 0

    // Prefer direct standings rows when board match failed (edge cases)
    if (!meFromBoard && currentUser) {
      for (const rows of Object.values(byCompetitionId)) {
        const row = rows.find((r) => isSamePlayer(r, currentUser.id, handles))
        if (!row) continue
        wins += Number(row.wins) || 0
        draws += Number(row.draws) || 0
        losses += Number(row.losses) || 0
      }
    }

    // Last tournament with a standing row (prefer completed → active → newest)
    let lastStanding: StandingEntry | null = null
    let lastTournamentName: string | null = null
    let bestScore = -1

    if (currentUser) {
      for (const [competitionId, rows] of Object.entries(byCompetitionId)) {
        const row = rows.find((r) => isSamePlayer(r, currentUser.id, handles))
        if (!row) continue
        const competition = competitionsById.get(String(competitionId))
        const statusBoost =
          competition?.competition_status === "completed"
            ? 2_000_000_000_000
            : competition?.competition_status === "active"
              ? 1_000_000_000_000
              : 0
        const time = new Date(
          competition?.end_date ||
            competition?.start_date ||
            competition?.updated_at ||
            0
        ).getTime()
        const score = statusBoost + time
        if (score >= bestScore) {
          bestScore = score
          lastStanding = row
          lastTournamentName = competition?.name ?? null
        }
      }
    }

    const communityElo =
      lastStanding?.chess_elo ?? user?.chess_elo ?? null

    const games = wins + draws + losses
    const ratio =
      games === 0
        ? "—"
        : losses === 0
          ? wins.toFixed(2)
          : (wins / losses).toFixed(2)

    const displayName =
      meFromBoard?.displayName?.trim() ||
      user?.display_name?.trim() ||
      "Player"
    const handle =
      meFromBoard?.chessUsername?.trim() ||
      user?.chess_com_username?.trim() ||
      user?.chess_username?.trim() ||
      user?.lichess_username?.trim() ||
      user?.phone_number?.trim() ||
      "player"

    return {
      displayName,
      handle,
      games,
      wins,
      draws,
      losses,
      ratio,
      communityElo,
      lastTournamentName,
      isLoading:
        Boolean(currentUser?.id) &&
        (profileLoading || competitionsLoading || standingsLoading),
      profileUser: user
        ? {
            chess_com_username: user.chess_com_username,
            chess_username: user.chess_username,
            display_name: user.display_name,
            chess_platform: user.chess_platform,
            chess_elo: user.chess_elo,
          }
        : null,
    }
  }, [
    byCompetitionId,
    competitionsById,
    competitionsLoading,
    currentUser,
    profileLoading,
    standingsLoading,
    user,
  ])
}
