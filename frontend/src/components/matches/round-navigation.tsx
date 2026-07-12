'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoundNavigationProps {
  rounds: number[]
  currentRound: number
  onRoundChange: (round: number) => void
  activeFilter?: MatchFilter
  onFilterChange?: (filter: MatchFilter) => void
}

const FILTER_OPTIONS = [
  { label: 'All Matches', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Disputed', value: 'disputed' },
] as const

export type MatchFilter = (typeof FILTER_OPTIONS)[number]['value']

export function RoundNavigation({
  rounds,
  currentRound,
  onRoundChange,
  activeFilter = 'all',
  onFilterChange,
}: RoundNavigationProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === activeFilter)?.label ?? 'All Matches'

  return (
    <div className="flex items-center justify-between gap-2">
      {/* ── Round pill tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => onRoundChange(round)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
              round === currentRound
                ? 'bg-foreground text-background shadow-sm'
                : 'border border-border bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            Round {round}
          </button>
        ))}
      </div>

      {/* ── Filter dropdown ── */}
      {onFilterChange && (
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
          >
            {activeFilterLabel}
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-border bg-background shadow-lg">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onFilterChange(opt.value)
                    setDropdownOpen(false)
                  }}
                  className={`block w-full px-4 py-2 text-left text-xs font-medium transition-colors hover:bg-muted ${
                    activeFilter === opt.value
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
