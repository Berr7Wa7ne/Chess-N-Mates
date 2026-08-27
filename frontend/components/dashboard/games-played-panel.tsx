"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type GamesPlayedSegment = {
  id: string
  label: string
  value: number
  color: string
}

const FILTERS = ["Last Month", "This Season", "All Time"] as const

export function GamesPlayedPanel({ segments }: { segments: GamesPlayedSegment[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Last Month")
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const total = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0) || 1,
    [segments]
  )

  const arcs = useMemo(() => {
    const radius = 54
    const stroke = 16
    const circumference = 2 * Math.PI * radius
    let offset = 0

    return segments.map((segment) => {
      const length = (segment.value / total) * circumference * 0.92
      const gap = (circumference - segments.reduce((s, seg) => s + (seg.value / total) * circumference * 0.92, 0)) / Math.max(segments.length, 1)
      const dashOffset = -offset
      offset += length + gap
      return { ...segment, radius, stroke, circumference, length, dashOffset }
    })
  }, [segments, total])

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[20px] bg-bg-panel-light p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold text-text-primary sm:text-[22px]">Games Played</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-transparent px-3 py-1.5 text-xs font-medium text-text-primary"
          >
            {filter}
            <ChevronDown className="size-3.5 text-text-secondary" />
          </button>
          {open && (
            <div className="absolute right-0 z-20 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border-subtle bg-bg-panel-light py-1">
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "block w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/[0.04]",
                    option === filter ? "text-text-primary" : "text-text-secondary"
                  )}
                  onClick={() => {
                    setFilter(option)
                    setOpen(false)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative size-[140px] shrink-0 sm:size-[160px]">
          <svg viewBox="0 0 140 140" className="size-full -rotate-90">
            <circle
              cx="70"
              cy="70"
              r="62"
              fill="none"
              stroke="#E8E8E4"
              strokeWidth="4"
              strokeDasharray="120 270"
              strokeLinecap="round"
              className="opacity-80"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.id}
                cx="70"
                cy="70"
                r={arc.radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={hovered && hovered !== arc.id ? arc.stroke - 2 : arc.stroke}
                strokeDasharray={`${arc.length} ${arc.circumference}`}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="round"
                className="transition-all duration-200"
                opacity={hovered && hovered !== arc.id ? 0.35 : 1}
              />
            ))}
          </svg>
        </div>

        <ul className="flex flex-1 flex-col gap-3">
          {segments.map((segment) => (
            <li key={segment.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 text-left"
                onMouseEnter={() => setHovered(segment.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm font-medium text-text-primary">{segment.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
