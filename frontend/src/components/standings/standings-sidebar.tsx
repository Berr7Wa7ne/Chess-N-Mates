'use client'

import { Download, Info } from 'lucide-react'
import domtoimage from 'dom-to-image-more'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StandingEntry, TournamentType } from '@/src/types/competition'

interface StandingsSidebarProps {
  standings: StandingEntry[]
  competitionName: string
  tournamentType: TournamentType
  isLoading: boolean
}

export function StandingsSidebar({
  standings,
  competitionName,
  tournamentType,
  isLoading,
}: StandingsSidebarProps) {
  const hasByes = standings.some((s) => s.byes > 0)

  async function handleDownloadJpg() {
    const el = document.getElementById('standings-sidebar-content')
    if (!el) return
    try {
      const dataUrl = await domtoimage.toJpeg(el, { bgcolor: '#ffffff', quality: 0.95 })
      const link = document.createElement('a')
      link.download = `${competitionName}-standings.jpg`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to export standings image', err)
    }
  }

  return (
    <div className="sticky top-6 self-start">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🏆</span>
              <span className="font-semibold text-sm">LIVE STANDINGS</span>
            </div>
            <button onClick={handleDownloadJpg} title="Download standings" type="button">
              <Download className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Updates as results come in</p>
        </CardHeader>

        <CardContent className="pt-0">
          {tournamentType === 'swiss' && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Swiss standings update after each Advance Round
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="mt-0.5 size-6 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-48 rounded" />
                  </div>
                  <Skeleton className="h-4 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : standings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No standings yet
            </p>
          ) : (
            <div id="standings-sidebar-content" className="max-h-[70vh] overflow-y-auto">
              {standings.map((row, index) => (
                <div
                  key={row.user_id}
                  className={cn(
                    'flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0',
                    row.absences > 0 && 'bg-red-50/40 -mx-3 px-3 rounded-sm'
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Rank indicator */}
                    <div
                      className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        index === 0 && 'bg-amber-400 text-white',
                        index === 1 && 'bg-gray-300 text-gray-700',
                        index === 2 && 'bg-amber-700 text-white',
                        index > 2 && 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {row.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{row.display_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                        {row.played}P · {row.wins}W · {row.draws}D · {row.losses}L
                        {row.absences > 0 ? ` · ${row.absences}A` : ''}
                        {hasByes && row.byes > 0 ? ` · ${row.byes}B` : ''}
                      </p>
                    </div>
                  </div>
                  {/* Points */}
                  <span className="text-sm font-bold text-emerald-600 tabular-nums shrink-0 ml-2">
                    {row.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}