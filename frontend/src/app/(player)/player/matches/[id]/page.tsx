"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import {
  PlayerPageHeader,
  PlayerPageShell,
  PlayerPanel,
  PlayerPanelTitle,
} from "@/components/layout/player-page-shell"
import { Button } from "@/components/ui/button"
import { FileDisputeModal } from "@/src/components/matches/file-dispute-modal"
import { MatchResultDialog } from "@/src/components/matches/match-result-dialog"
import { useAuth } from "@/src/hooks/useAuth"
import { useCompetition } from "@/src/hooks/useCompetitions"
import { useMatch } from "@/src/hooks/useMatches"
import {
  mapMatchStatusForFilter,
  opponentLabel,
  playerResultLabel,
} from "@/src/hooks/usePlayerRecentMatches"
import { cn } from "@/lib/utils"

function normalizeGameUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function statusLabel(status: string) {
  if (status === "awaiting_review") return "Awaiting review"
  if (status === "confirmed") return "Confirmed"
  return status.replaceAll("_", " ")
}

export default function PlayerMatchDetailPage() {
  const params = useParams()
  const matchId = params.id as string
  const { currentUser } = useAuth()
  const { data: match, isLoading, isError, refetch } = useMatch(matchId)
  const { data: competition } = useCompetition(match?.competition_id ?? "", Boolean(match?.competition_id))
  const [resultOpen, setResultOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)

  if (isLoading) {
    return (
      <PlayerPageShell>
        <p className="text-sm text-text-secondary">Loading match…</p>
      </PlayerPageShell>
    )
  }

  if (isError || !match) {
    return (
      <PlayerPageShell>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/player/matches">
            <ArrowLeft className="mr-2 size-4" />
            Back to matches
          </Link>
        </Button>
        <p className="mt-4 text-sm text-text-secondary">Match not found.</p>
      </PlayerPageShell>
    )
  }

  const userId = currentUser?.id
  const isParticipant =
    userId &&
    (String(match.player_a_id) === String(userId) ||
      String(match.player_b_id) === String(userId))
  const opponent = userId ? opponentLabel(match, userId) : "Opponent"
  const result = userId ? playerResultLabel(match, userId) : null
  const filterKey = mapMatchStatusForFilter(match.match_status)
  const canSubmit =
    isParticipant &&
    !match.is_bye &&
    (match.match_status === "pending" || match.match_status === "ongoing")
  const canDispute =
    isParticipant &&
    !match.is_bye &&
    ["result_submitted", "completed", "disputed"].includes(match.match_status)

  const playerA = match.player_a?.display_name || match.player_a?.chess_username || "Player A"
  const playerB = match.player_b?.display_name || match.player_b?.chess_username || "Player B"

  return (
    <PlayerPageShell>
      <Link
        href="/player/matches"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Matches
      </Link>

      <PlayerPageHeader
        title={`vs ${opponent}`}
        description={
          competition?.name
            ? `${competition.name} · Round ${match.round_number}`
            : `Round ${match.round_number}`
        }
      />

      <PlayerPanel>
        <PlayerPanelTitle title="Match details" />
        <dl className="mt-2 space-y-3">
          {[
            { label: "Players", value: match.is_bye ? `${playerA} (BYE)` : `${playerA} vs ${playerB}` },
            { label: "Status", value: statusLabel(filterKey) },
            { label: "Result", value: result || "—" },
            {
              label: "Deadline",
              value: match.deadline
                ? new Date(match.deadline).toLocaleString()
                : "—",
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-3 last:border-b-0"
            >
              <dt className="text-sm text-text-secondary">{row.label}</dt>
              <dd
                className={cn(
                  "text-sm font-semibold capitalize text-text-primary",
                  row.label === "Status" && filterKey === "disputed" && "text-red-600"
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {match.chess_game_link ? (
          <a
            href={normalizeGameUrl(match.chess_game_link)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary underline underline-offset-2"
          >
            Open game on Chess.com
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}

        {isParticipant ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {canSubmit ? (
              <button
                type="button"
                onClick={() => setResultOpen(true)}
                className="rounded-xl bg-accent-lime px-4 py-2.5 text-sm font-bold text-text-primary"
              >
                Submit result
              </button>
            ) : null}
            {canDispute ? (
              <button
                type="button"
                onClick={() => setDisputeOpen(true)}
                className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold text-text-primary"
              >
                File dispute
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">
            You are not a participant in this match.
          </p>
        )}
      </PlayerPanel>

      {userId && (
        <MatchResultDialog
          open={resultOpen}
          onClose={() => setResultOpen(false)}
          match={match}
          userId={userId}
          onSuccess={() => {
            void refetch()
          }}
        />
      )}

      <FileDisputeModal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        matchId={match.id}
        competitionId={match.competition_id}
        matchLabel={`${playerA} vs ${playerB}`}
        roundNumber={match.round_number}
      />
    </PlayerPageShell>
  )
}
