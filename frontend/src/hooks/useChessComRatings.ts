"use client"

import { useQuery } from "@tanstack/react-query"

export type ChessComRatings = {
  rapid: number | null
  blitz: number | null
  bullet: number | null
}

type ChessComStatsPayload = {
  chess_rapid?: { last?: { rating?: number } }
  chess_blitz?: { last?: { rating?: number } }
  chess_bullet?: { last?: { rating?: number } }
}

async function fetchChessComRatings(username: string): Promise<ChessComRatings> {
  const res = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`,
    { cache: "no-store" }
  )
  if (!res.ok) {
    throw new Error(`Chess.com stats unavailable (${res.status})`)
  }
  const data = (await res.json()) as ChessComStatsPayload
  return {
    rapid: data.chess_rapid?.last?.rating ?? null,
    blitz: data.chess_blitz?.last?.rating ?? null,
    bullet: data.chess_bullet?.last?.rating ?? null,
  }
}

/** Prefer real Chess.com handles over phone numbers / numeric IDs. */
export function resolveChessComUsername(user?: {
  chess_com_username?: string | null
  chess_username?: string | null
  display_name?: string | null
  chess_platform?: string | null
} | null) {
  const candidates = [
    user?.chess_com_username,
    user?.chess_platform === "chess.com" ? user?.chess_username : null,
    user?.display_name,
    user?.chess_username,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))

  const named = candidates.find((c) => /[a-zA-Z]/.test(c) && !/^\+?\d+$/.test(c))
  return named ?? null
}

export function useChessComRatings(username: string | null | undefined) {
  return useQuery({
    queryKey: ["chess-com-ratings", username?.toLowerCase() ?? ""],
    queryFn: () => fetchChessComRatings(username!),
    enabled: Boolean(username?.trim()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
