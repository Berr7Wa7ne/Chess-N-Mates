'use client'

import { Medal, Trophy, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StandingEntry, TournamentType } from '@/src/types/competition'

interface StandingsModalProps {
  open: boolean
  onClose: () => void
  standings: StandingEntry[]
  competitionName: string
  tournamentType?: TournamentType
}

function getRankDisplay(row: StandingEntry, index: number): React.ReactNode {
  if (index === 0) return <Medal className="size-4 text-amber-500" />
  if (index === 1) return <Medal className="size-4 text-gray-400" />
  if (index === 2) return <Medal className="size-4 text-amber-700" />
  return <span className="text-sm tabular-nums">{row.rank}</span>
}

export function StandingsModal({
  open,
  onClose,
  standings,
  competitionName,
  tournamentType,
}: StandingsModalProps) {
  const isSwiss = tournamentType === 'swiss'

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            <DialogTitle>Standings</DialogTitle>
          </div>
          <DialogDescription>
            {competitionName}
            {isSwiss ? ' · Tiebreaks: Buchholz → Cut-1 → Sonneborn-Berger' : ''}
          </DialogDescription>
        </DialogHeader>

        {standings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No standings available yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center tabular-nums">P</TableHead>
                  <TableHead className="text-center tabular-nums">W</TableHead>
                  <TableHead className="text-center tabular-nums">D</TableHead>
                  <TableHead className="text-center tabular-nums">L</TableHead>
                  <TableHead className="text-center tabular-nums font-bold">Pts</TableHead>
                  {isSwiss && (
                    <>
                      <TableHead className="text-center tabular-nums" title="Buchholz">
                        BH
                      </TableHead>
                      <TableHead className="text-center tabular-nums" title="Buchholz Cut-1">
                        BH-C1
                      </TableHead>
                      <TableHead className="text-center tabular-nums" title="Sonneborn-Berger">
                        SB
                      </TableHead>
                    </>
                  )}
                  <TableHead className="text-center tabular-nums">Abs</TableHead>
                  <TableHead className="text-center tabular-nums">BYE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row, index) => (
                  <TableRow
                    key={row.user_id}
                    className={`${row.absences > 0 ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}
                  >
                    <TableCell className="font-medium">
                      {getRankDisplay(row, index)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.display_name}</div>
                      {row.chess_elo && (
                        <div className="text-xs text-muted-foreground">ELO {row.chess_elo}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{row.played}</TableCell>
                    <TableCell className="text-center tabular-nums text-emerald-600">{row.wins}</TableCell>
                    <TableCell className="text-center tabular-nums text-amber-600">{row.draws}</TableCell>
                    <TableCell className="text-center tabular-nums text-red-600">{row.losses}</TableCell>
                    <TableCell className="text-center tabular-nums font-bold">{row.points}</TableCell>
                    {isSwiss && (
                      <>
                        <TableCell className="text-center tabular-nums text-muted-foreground">
                          {row.buchholz ?? '—'}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">
                          {row.buchholz_cut1 ?? '—'}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">
                          {row.sonneborn_berger ?? '—'}
                        </TableCell>
                      </>
                    )}
                    <TableCell className={`text-center tabular-nums ${row.absences > 0 ? 'text-red-600 font-semibold' : ''}`}>
                      {row.absences}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {row.byes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="size-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
