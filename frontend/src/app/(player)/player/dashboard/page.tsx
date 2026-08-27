"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ChessRatingsPanel,
  GamesCollection,
  GamesPlayedPanel,
  HeroBanner,
  ProfileStatsPanel,
  TournamentsBar,
  type CollectionGame,
  type GamesPlayedSegment,
  type HeroSlide,
  type RatingStat,
  type TournamentChip,
} from "@/components/dashboard"
import { competitions, currentPlayerId, getPlayerMatches } from "@/lib/admin-data"
import { useAuth } from "@/src/hooks/useAuth"
import { useChessComRatings, resolveChessComUsername } from "@/src/hooks/useChessComRatings"
import { useCompetitions } from "@/src/hooks/useCompetitions"
import { useJoinCompetition, useUserRegistrations } from "@/src/hooks/useParticipants"
import { usePlayerCommunityStats } from "@/src/hooks/usePlayerCommunityStats"
import { ApiError } from "@/src/types/api"

const HERO_GRADIENTS = [
  "linear-gradient(135deg, #1a1a1a 0%, #2d3a1f 45%, #141414 100%)",
  "linear-gradient(135deg, #0f0f0f 0%, #1f2a1a 40%, #2a2a2a 100%)",
  "linear-gradient(135deg, #121212 0%, #243018 50%, #0d0d0d 100%)",
]

const HERO_IMAGES = [
  "/hero/chess-1.jpg",
  "/hero/chess-2.jpg",
  "/hero/chess-3.jpg",
]

function ratingFill(value: number | null) {
  if (!value) return 28
  return Math.max(30, Math.min(95, ((value - 800) / 1600) * 65 + 30))
}

const playerMatches = getPlayerMatches(currentPlayerId)

export default function PlayerDashboardPage() {
  const { currentUser } = useAuth()
  const { data: apiCompetitions } = useCompetitions()
  const { data: registrationIds } = useUserRegistrations(currentUser?.id)
  const joinMutation = useJoinCompetition()
  const [bannerDismissed, setBannerDismissed] = useState(true)
  const communityStats = usePlayerCommunityStats()

  const chessUsername = resolveChessComUsername(
    communityStats.profileUser ?? currentUser
  )

  const { data: chessRatings, isPending: ratingsPending, isError: ratingsError } =
    useChessComRatings(chessUsername)

  const bannerCompetition = useMemo(() => {
    if (!apiCompetitions?.length) return null
    return apiCompetitions.find((c) => c.competition_status === "open_registration") ?? null
  }, [apiCompetitions])

  useEffect(() => {
    if (bannerCompetition && !bannerDismissed) {
      sessionStorage.setItem(`player_tournament_banner_${bannerCompetition.id}`, "1")
    }
  }, [bannerCompetition, bannerDismissed])

  useEffect(() => {
    if (bannerCompetition) {
      const seen = sessionStorage.getItem(`player_tournament_banner_${bannerCompetition.id}`) === "1"
      setBannerDismissed(seen)
    }
  }, [bannerCompetition])

  async function handleJoinNow() {
    if (!currentUser || !bannerCompetition) return
    try {
      await joinMutation.mutateAsync({
        competitionId: bannerCompetition.id,
        payload: { user_id: currentUser.id },
      })
      toast.success(`Joined "${bannerCompetition.name}"`)
      sessionStorage.setItem(`player_tournament_banner_${bannerCompetition.id}`, "1")
      setBannerDismissed(true)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to join competition")
    }
  }

  const playedTournaments: TournamentChip[] = useMemo(() => {
    const idSet = new Set((registrationIds ?? []).map(String))

    if (apiCompetitions?.length && idSet.size) {
      return apiCompetitions
        .filter((c) => idSet.has(String(c.id)))
        .slice(0, 8)
        .map((c) => ({
          id: c.id,
          name: c.name,
          status: c.competition_status,
          href: "/player/tournament",
        }))
    }

    // Fallback while API registrations are empty / loading
    return competitions.slice(0, 6).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      href: "/player/tournament",
    }))
  }, [apiCompetitions, registrationIds])

  const heroSlides: HeroSlide[] = useMemo(() => {
    const fromApi =
      apiCompetitions
        ?.filter((c) => ["open_registration", "active"].includes(c.competition_status))
        .slice(0, 3)
        .map((c, i) => ({
          id: c.id,
          title: c.name,
          description:
            c.description ||
            `${c.tournament_type.replaceAll("_", " ")} · featured tournament — join the board and climb the standings.`,
          ctaLabel:
            c.competition_status === "open_registration" && !bannerDismissed
              ? "Join Now"
              : "View Tournament",
          ctaHref: "/player/tournament",
          gradient: HERO_GRADIENTS[i % HERO_GRADIENTS.length],
          imageUrl: HERO_IMAGES[i % HERO_IMAGES.length],
        })) ?? []

    if (fromApi.length) return fromApi

    return competitions.slice(0, 3).map((c, i) => ({
      id: c.id,
      title: c.name,
      description: c.description,
      ctaLabel: c.status === "active" ? "Enter Arena" : "View Details",
      ctaHref: "/player/tournament",
      gradient: HERO_GRADIENTS[i % HERO_GRADIENTS.length],
      imageUrl: HERO_IMAGES[i % HERO_IMAGES.length],
    }))
  }, [apiCompetitions, bannerDismissed])

  const collection: CollectionGame[] = useMemo(
    () =>
      playerMatches.slice(0, 5).map((match) => ({
        id: match.id,
        title: match.competition,
        subtitle: `vs ${match.opponent} · Round ${match.round}`,
        href: `/player/matches/${match.id}`,
      })),
    []
  )

  const ratingStats: RatingStat[] = useMemo(() => {
    const rapid = chessRatings?.rapid ?? communityStats.profileUser?.chess_elo ?? currentUser?.chess_elo ?? null
    const blitz = chessRatings?.blitz ?? null
    const bullet = chessRatings?.bullet ?? null
    const values = [rapid, blitz, bullet].filter((v): v is number => typeof v === "number")
    const best = values.length ? Math.max(...values) : null

    return [
      {
        id: "rapid",
        label: "Rapid",
        value: rapid,
        fill: ratingFill(rapid),
        highlight: best !== null && rapid === best,
        footnote: "Chess.com",
      },
      {
        id: "blitz",
        label: "Blitz",
        value: blitz,
        fill: ratingFill(blitz),
        highlight: best !== null && blitz === best,
        footnote: "Chess.com",
      },
      {
        id: "bullet",
        label: "Bullet",
        value: bullet,
        fill: ratingFill(bullet),
        highlight: best !== null && bullet === best,
        footnote: "Chess.com",
      },
    ]
  }, [chessRatings, communityStats.profileUser?.chess_elo, currentUser?.chess_elo])

  const { wins, draws, losses, games, ratio, communityElo, displayName, handle, isLoading } =
    communityStats

  const playedSegments: GamesPlayedSegment[] = [
    { id: "wins", label: "Wins", value: Math.max(wins, 0), color: "#141414" },
    { id: "draws", label: "Draws", value: Math.max(draws, 0), color: "#3A3A3A" },
    { id: "losses", label: "Losses", value: Math.max(losses, 0), color: "#9FE62E" },
    {
      id: "pending",
      label: "Tournaments",
      value: Math.max((registrationIds ?? []).length, 0),
      color: "#C6FF3D",
    },
  ]

  const pendingDisplay = isLoading ? "…" : undefined

  return (
    <div className="flex flex-col gap-4">
      <div
        className="
          grid grid-cols-1 gap-4
          lg:grid-cols-2
          xl:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.5fr)_minmax(240px,0.48fr)]
          xl:grid-rows-[auto_minmax(280px,1fr)_minmax(240px,0.85fr)]
          xl:items-stretch
          xl:min-h-[calc(100dvh-7rem)]
        "
      >
        <div className="shrink-0 lg:col-span-2 xl:col-span-2">
          <TournamentsBar tournaments={playedTournaments} />
        </div>

        <div className="order-3 lg:order-none xl:row-span-3 xl:min-h-0">
          <ProfileStatsPanel
            stats={{
              displayName,
              handle,
              online: true,
              games: pendingDisplay ?? games,
              elo: pendingDisplay ?? communityElo ?? "—",
              ratio: pendingDisplay ?? ratio,
              wins: pendingDisplay ?? wins,
            }}
          />
        </div>

        <div className="lg:col-span-2 xl:col-span-1 xl:col-start-1 xl:min-h-[280px]">
          <HeroBanner slides={heroSlides} />
        </div>

        <div className="xl:col-start-2 xl:row-start-2 xl:min-h-0">
          <GamesCollection games={collection} />
        </div>

        <div className="xl:min-h-0">
          <ChessRatingsPanel
            stats={ratingStats}
            username={chessUsername}
            loading={Boolean(chessUsername) && ratingsPending && !chessRatings && !ratingsError}
          />
        </div>
        <div className="xl:min-h-0">
          <GamesPlayedPanel segments={playedSegments} />
        </div>
      </div>

      {bannerCompetition && !bannerDismissed && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[20px] bg-bg-panel-dark px-5 py-3 text-white">
          <div>
            <p className="text-sm font-medium text-white/60">Open registration</p>
            <p className="font-semibold">{bannerCompetition.name}</p>
          </div>
          <button
            type="button"
            onClick={handleJoinNow}
            disabled={joinMutation.isPending}
            className="rounded-xl bg-accent-lime px-5 py-2.5 text-sm font-bold text-text-primary disabled:opacity-60"
          >
            {joinMutation.isPending ? "Joining…" : "Join Now"}
          </button>
        </div>
      )}
    </div>
  )
}
