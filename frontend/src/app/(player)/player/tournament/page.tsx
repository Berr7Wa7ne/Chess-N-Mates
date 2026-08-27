"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Trophy } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
  PlayerPanelTitle,
} from "@/components/layout/player-page-shell"
import { MatchesList } from "@/src/components/matches/matches-list"
import { PlayerDoubleLegView } from "@/src/components/matches/player-double-leg-view"
import { MatchResultDialog } from "@/src/components/matches/match-result-dialog"
import { StandingsModal } from "@/src/components/standings/standings-modal"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetitionMatches } from "@/src/hooks/useMatches"
import { useCompetitionStandings, useCompetitions } from "@/src/hooks/useCompetitions"
import { useCompetitionsStandings } from "@/src/hooks/useCompetitionsStandings"
import { useJoinCompetition, useUserRegistrations, useWithdraw } from "@/src/hooks/useParticipants"
import { ApiError } from "@/src/types/api"
import type { Match } from "@/src/types/match"
import { formatTournamentType } from "@/src/components/competitions/competition-badges"
import { cn } from "@/lib/utils"

export default function PlayerTournamentPage() {
  const [currentRound, setCurrentRound] = useState<number | null>(null)
  const [standingsOpen, setStandingsOpen] = useState(false)
  const [resultDialogMatch, setResultDialogMatch] = useState<Match | null>(null)
  const [submittedMatchIds, setSubmittedMatchIds] = useState<Set<string>>(new Set())
  const [optimisticMatches, setOptimisticMatches] = useState<Map<string, Partial<Match>>>(new Map())
  const { currentUser } = useAuth()
  const { data: competitions, isLoading: competitionsLoading } = useCompetitions()
  const joinMutation = useJoinCompetition()
  const withdrawMutation = useWithdraw()
  const { data: userRegisteredIds = [] } = useUserRegistrations(currentUser?.id)
  const userRegisteredSet = useMemo(() => new Set(userRegisteredIds), [userRegisteredIds])

  const historyIds = useMemo(
    () => (competitions ?? []).map((c) => c.id),
    [competitions]
  )
  const { byCompetitionId: historyStandings, isLoading: historyStandingsLoading } =
    useCompetitionsStandings(historyIds)

  function getUserPosition(competitionId: string): string {
    if (!currentUser) return "—"
    if (!userRegisteredSet.has(competitionId)) return "—"
    const rows = historyStandings[competitionId] ?? []
    const mine = rows.find((row) => String(row.user_id) === String(currentUser.id))
    if (!mine) {
      return historyStandingsLoading ? "…" : "—"
    }
    return `#${mine.rank_display || mine.rank}`
  }

  const liveCompetitions = useMemo(() => {
    if (!competitions?.length) return []
    return competitions.filter((c) =>
      ["active", "open_registration"].includes(c.competition_status)
    )
  }, [competitions])

  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null)

  // Prefer a live event the user is in; otherwise first live tournament
  useEffect(() => {
    if (!liveCompetitions.length) {
      setSelectedCompetitionId(null)
      return
    }
    const stillValid =
      selectedCompetitionId &&
      liveCompetitions.some((c) => String(c.id) === String(selectedCompetitionId))
    if (stillValid) return

    const registeredLive =
      liveCompetitions.find((c) => userRegisteredSet.has(c.id) && c.competition_status === "active") ||
      liveCompetitions.find((c) => userRegisteredSet.has(c.id)) ||
      liveCompetitions.find((c) => c.competition_status === "active") ||
      liveCompetitions[0]

    setSelectedCompetitionId(registeredLive ? String(registeredLive.id) : null)
  }, [liveCompetitions, selectedCompetitionId, userRegisteredSet])

  const currentCompetition = useMemo(
    () =>
      liveCompetitions.find((c) => String(c.id) === String(selectedCompetitionId)) ?? null,
    [liveCompetitions, selectedCompetitionId]
  )

  useEffect(() => {
    setCurrentRound(currentCompetition?.current_round ?? null)
  }, [currentCompetition?.id, currentCompetition?.current_round])

  const matchesQuery = useCompetitionMatches(currentCompetition?.id ?? "")
  const standingsQuery = useCompetitionStandings(
    currentCompetition?.id ?? "",
    !!currentCompetition
  )

  const standings = standingsQuery.data ?? []
  const matchesData = matchesQuery.data ?? []
  const matches = matchesData.map((m: Match) => {
    const opt = optimisticMatches.get(m.id)
    if (opt) return { ...m, ...opt }
    return m
  })
  const effectiveRound = currentRound ?? currentCompetition?.current_round ?? 1

  const isRegistered = Boolean(
    currentUser && standings.some((entry) => entry.user_id === currentUser.id)
  )
  const canWithdraw = Boolean(
    currentCompetition &&
      isRegistered &&
      !standingsQuery.isLoading &&
      !["active", "completed"].includes(currentCompetition.competition_status)
  )

  async function handleJoin() {
    if (!currentUser || !currentCompetition) return
    try {
      await joinMutation.mutateAsync({
        competitionId: currentCompetition.id,
        payload: { user_id: currentUser.id },
      })
      toast.success(`Joined "${currentCompetition.name}"`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to join competition")
    }
  }

  async function handleWithdraw() {
    if (!currentUser || !currentCompetition) return
    try {
      await withdrawMutation.mutateAsync({
        competitionId: currentCompetition.id,
        userId: currentUser.id,
        payload: { reason: "User withdrew" },
      })
      toast.success("You have withdrawn from this competition")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to withdraw")
    }
  }

  async function handleJoinCompetition(competitionId: string, competitionName: string) {
    if (!currentUser) return
    try {
      await joinMutation.mutateAsync({
        competitionId,
        payload: { user_id: currentUser.id },
      })
      toast.success(`Joined "${competitionName}"`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to join competition")
    }
  }

  const handleMatchSubmitSuccess = useCallback((updatedMatch: Match) => {
    setSubmittedMatchIds((prev) => new Set(prev).add(updatedMatch.id))
    setOptimisticMatches((prev) => {
      const next = new Map(prev)
      next.set(updatedMatch.id, {
        match_status: "completed",
        result_winner: updatedMatch.result_winner,
        chess_game_link: updatedMatch.chess_game_link,
        result_submitted_at: updatedMatch.result_submitted_at,
      })
      return next
    })
  }, [])

  function handleDownloadFixtures() {
    if (matches.length === 0) return
    const csv = [
      ["Round", "Player A", "Player B", "Status", "Result"].join(","),
      ...matches.map((m) =>
        [
          m.round_number,
          m.player_a?.display_name || m.player_a_id,
          m.is_bye ? "BYE" : m.player_b?.display_name || m.player_b_id,
          m.match_status,
          m.result_winner || "Pending",
        ].join(",")
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${currentCompetition?.name || "fixtures"}-fixtures.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Fixtures downloaded")
  }

  return (
    <PlayerPageShell wide>
      <PlayerPageHeader
        title="Tournament"
        description="Multiple events can run at once — pick one for fixtures and standings"
      />

      <PlayerPanel className="px-0 py-0 sm:px-0">
        <div className="border-b border-border-subtle px-6 py-4 sm:px-8">
          <PlayerPanelTitle
            title="Live tournaments"
            description={`${liveCompetitions.length} running or open now`}
          />
        </div>
        {competitionsLoading ? (
          <div className="px-6 py-4 sm:px-8">
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : liveCompetitions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-text-secondary sm:px-8">
            No live tournaments right now.
          </p>
        ) : (
          <ul>
            {liveCompetitions.map((competition) => {
              const selected = String(competition.id) === String(selectedCompetitionId)
              const alreadyJoined = userRegisteredSet.has(competition.id)
              const canJoin =
                competition.competition_status === "open_registration" && !alreadyJoined
              return (
                <li key={competition.id}>
                  <div
                    className={cn(
                      "flex flex-col gap-3 border-b border-border-subtle px-6 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-8",
                      selected && "bg-accent-lime/15"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompetitionId(String(competition.id))
                        setCurrentRound(competition.current_round || null)
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[15px] font-semibold text-text-primary">
                        {competition.name}
                        {competition.is_featured ? (
                          <span className="ml-2 text-[11px] font-bold text-amber-700">
                            Featured
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[13px] text-text-secondary">
                        {formatTournamentType(competition.tournament_type)} ·{" "}
                        {competition.competition_status.replaceAll("_", " ")}
                        {competition.competition_status === "active"
                          ? ` · Round ${competition.current_round}/${competition.rounds}`
                          : ""}
                        {alreadyJoined ? " · Entered" : ""}
                      </p>
                    </button>
                    <div className="flex shrink-0 gap-2">
                      {canJoin && (
                        <button
                          type="button"
                          onClick={() =>
                            handleJoinCompetition(competition.id, competition.name)
                          }
                          disabled={joinMutation.isPending}
                          className="rounded-xl bg-accent-lime px-3 py-1.5 text-xs font-bold text-text-primary disabled:opacity-60"
                        >
                          Join
                        </button>
                      )}
                      {selected && canWithdraw && (
                        <button
                          type="button"
                          onClick={handleWithdraw}
                          disabled={withdrawMutation.isPending}
                          className="rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-semibold"
                        >
                          Withdraw
                        </button>
                      )}
                      {!selected && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompetitionId(String(competition.id))
                            setCurrentRound(competition.current_round || null)
                          }}
                          className="rounded-xl border border-border-subtle px-3 py-1.5 text-xs font-semibold"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </PlayerPanel>

      {currentCompetition && !userRegisteredSet.has(currentCompetition.id) &&
        currentCompetition.competition_status === "open_registration" &&
        !standingsQuery.isLoading &&
        !isRegistered && (
          <button
            type="button"
            onClick={handleJoin}
            disabled={joinMutation.isPending}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent-lime text-sm font-bold text-text-primary disabled:opacity-60"
          >
            Join {currentCompetition.name}
          </button>
        )}

      {currentCompetition && matches.length > 0 && (
        <div className="flex flex-col gap-5">
          {currentCompetition.match_length === "double_game" &&
          currentCompetition.tournament_type === "round_robin" ? (
            <PlayerDoubleLegView
              matches={matches.filter((m) => m.round_number === effectiveRound)}
              currentRound={effectiveRound}
              currentUser={currentUser}
              submittedMatchIds={submittedMatchIds}
              onSuccess={handleMatchSubmitSuccess}
            />
          ) : (
            <MatchesList
              matches={matches}
              currentRound={effectiveRound}
              onRoundChange={setCurrentRound}
              onViewStandings={() => setStandingsOpen(true)}
              onDownloadAll={handleDownloadFixtures}
              totalRounds={currentCompetition.rounds}
              competitionName={currentCompetition.name}
              renderMatchActions={(match: Match) => {
                if (submittedMatchIds.has(match.id)) return null
                if (match.is_bye || match.match_status !== "pending") return null
                if (!currentUser) return null
                const isParticipant =
                  match.player_a_id === currentUser.id || match.player_b_id === currentUser.id
                if (!isParticipant) return null
                if (match.round_number > (currentCompetition?.current_round || 1)) return null
                return (
                  <button
                    type="button"
                    className="h-7 rounded-lg border border-border-subtle px-2 text-[10px] font-semibold"
                    onClick={() => setResultDialogMatch(match)}
                  >
                    Submit Result
                  </button>
                )
              }}
            />
          )}

          <PlayerPanel>
            <PlayerPanelTitle title="Standings" description="Top of the table" />
            {standingsQuery.isLoading ? (
              <p className="text-sm text-text-secondary">Loading…</p>
            ) : standings.length > 0 ? (
              <div className="space-y-1">
                {standings.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className="flex items-center justify-between border-b border-border-subtle py-3 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-sm font-bold text-text-secondary">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-text-primary">{entry.display_name}</p>
                        <p className="text-xs text-text-secondary">
                          {entry.wins}W · {entry.draws}D · {entry.losses}L
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-extrabold tabular-nums text-text-primary">
                      {entry.points}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setStandingsOpen(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle py-2.5 text-sm font-semibold text-text-primary"
                >
                  <Trophy className="size-4" />
                  View full standings
                </button>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No standings available yet.</p>
            )}
          </PlayerPanel>
        </div>
      )}

      <PlayerPanel className="px-0 py-0 sm:px-0">
        <div className="border-b border-border-subtle px-6 py-4 sm:px-8">
          <PlayerPanelTitle
            title="Tournament history"
            description="Your position in each competition"
          />
        </div>
        <div className="scrollbar-none max-h-[420px] overflow-y-auto px-6 sm:px-8">
          {competitionsLoading ? (
            <p className="py-8 text-center text-sm text-text-secondary">Loading…</p>
          ) : !competitions?.length ? (
            <p className="py-8 text-center text-sm text-text-secondary">No competitions found.</p>
          ) : (
            <div>
              {competitions.map((competition) => {
                const alreadyJoined = userRegisteredSet.has(competition.id)
                const canJoin =
                  competition.competition_status === "open_registration" && !alreadyJoined
                const position = getUserPosition(competition.id)
                return (
                  <div
                    key={competition.id}
                    className="flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text-primary">
                        {competition.name}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatTournamentType(competition.tournament_type)} ·{" "}
                        {competition.competition_status.replaceAll("_", " ")}
                        {competition.start_date
                          ? ` · ${new Date(competition.start_date).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          alreadyJoined ? "text-text-primary" : "text-text-secondary"
                        )}
                      >
                        {alreadyJoined ? position : "Not entered"}
                      </span>
                      {canJoin ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleJoinCompetition(competition.id, competition.name)
                          }
                          disabled={joinMutation.isPending}
                          className="rounded-xl bg-accent-lime px-3 py-1.5 text-xs font-bold text-text-primary disabled:opacity-60"
                        >
                          Join
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PlayerPanel>

      {currentCompetition && (
        <StandingsModal
          open={standingsOpen}
          onClose={() => setStandingsOpen(false)}
          standings={standings}
          competitionName={currentCompetition.name}
          tournamentType={currentCompetition.tournament_type}
        />
      )}

      {resultDialogMatch && currentUser && (
        <MatchResultDialog
          open={!!resultDialogMatch}
          onClose={() => setResultDialogMatch(null)}
          match={resultDialogMatch}
          userId={currentUser.id}
          onSuccess={handleMatchSubmitSuccess}
        />
      )}
    </PlayerPageShell>
  )
}
