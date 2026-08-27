"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export type RatingStat = {
  id: string
  label: string
  value: number | string | null
  /** 0–100 visual fill for the wave (derived from rating band) */
  fill: number
  highlight?: boolean
  footnote?: string
}

function WaveFill({ fill, highlight }: { fill: number; highlight?: boolean }) {
  const height = Math.max(22, Math.min(100, fill))
  const color = highlight ? "var(--accent-lime)" : "#141414"

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ height: `${height}%` }}
    >
      <svg
        viewBox="0 0 200 120"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          d="M0 28 C 30 8, 50 48, 80 28 S 130 8, 160 32 S 190 20, 200 28 L200 120 L0 120 Z"
          fill={color}
          opacity={highlight ? 0.85 : 0.92}
        />
        <path
          d="M0 40 C 40 22, 70 55, 100 38 S 150 22, 180 42 S 195 35, 200 40 L200 120 L0 120 Z"
          fill={color}
          opacity={0.55}
        />
      </svg>
    </div>
  )
}

function ratingToFill(value: number | string | null) {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 28
  // Map ~800–2400 onto ~30–95%
  return Math.max(30, Math.min(95, ((n - 800) / 1600) * 65 + 30))
}

export function ChessRatingsPanel({
  stats,
  username,
  loading,
}: {
  stats: RatingStat[]
  username?: string | null
  loading?: boolean
}) {
  const tiles = stats.slice(0, 3)

  return (
    <section className="flex h-full flex-col rounded-[20px] bg-bg-panel-light p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold text-text-primary sm:text-[22px]">Chess.com Ratings</h2>
        {username ? (
          <a
            href={`https://www.chess.com/member/${encodeURIComponent(username)}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-text-primary underline underline-offset-2"
          >
            Profile
          </a>
        ) : (
          <Link
            href="/player/profile"
            className="text-sm font-medium text-text-primary underline underline-offset-2"
          >
            Link account
          </Link>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        {loading
          ? [0, 1, 2].map((i) => (
              <div
                key={i}
                className="relative flex aspect-[3/4] animate-pulse flex-col overflow-hidden rounded-2xl bg-[#E8E8E4] p-3"
              />
            ))
          : tiles.map((item) => {
              const highlight = Boolean(item.highlight)
              const display =
                item.value === null || item.value === undefined || item.value === ""
                  ? "—"
                  : item.value
              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative flex min-h-[140px] flex-col overflow-hidden rounded-2xl p-3 transition-colors",
                    highlight ? "bg-bg-panel-dark" : "bg-[#E8E8E4]"
                  )}
                >
                  <WaveFill fill={item.fill || ratingToFill(item.value)} highlight={highlight} />
                  <p
                    className={cn(
                      "relative z-10 text-[12px] font-bold leading-snug",
                      highlight ? "text-white" : "text-text-primary"
                    )}
                  >
                    {item.label}
                  </p>
                  <div className="relative z-10 mt-auto flex flex-1 flex-col items-center justify-center py-2">
                    <span
                      className={cn(
                        "tabular-nums text-3xl font-extrabold",
                        highlight ? "text-white" : "text-text-primary"
                      )}
                    >
                      {display}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "relative z-10 text-[11px] font-medium",
                      highlight ? "text-white/60" : "text-text-secondary"
                    )}
                  >
                    {item.footnote ?? "Chess.com"}
                  </p>
                </div>
              )
            })}

        {!loading && !tiles.length && (
          <p className="col-span-3 py-10 text-center text-sm text-text-secondary">
            Link a Chess.com username to see Rapid, Blitz, and Bullet ratings.
          </p>
        )}
      </div>
    </section>
  )
}

/** @deprecated use ChessRatingsPanel */
export { ChessRatingsPanel as DownloadsPanel }
export type DownloadItem = RatingStat
