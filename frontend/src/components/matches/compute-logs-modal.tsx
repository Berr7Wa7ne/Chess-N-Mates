'use client'

import { useMemo, useState } from 'react'
import { ScrollText, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useComputeLogs } from '@/src/hooks/useCompetitions'
import type { ComputeAuditLog } from '@/src/types/competition'

interface ComputeLogsModalProps {
  open: boolean
  onClose: () => void
  competitionId: string
  competitionName?: string
}

function resultStyle(result: string) {
  switch (result) {
    case 'success':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'error':
      return 'bg-red-50 text-red-800 border-red-200'
    case 'needs_review':
      return 'bg-amber-50 text-amber-900 border-amber-200'
    case 'absent':
      return 'bg-orange-50 text-orange-800 border-orange-200'
    case 'skipped':
      return 'bg-slate-50 text-slate-700 border-slate-200'
    default:
      return 'bg-blue-50 text-blue-800 border-blue-200'
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function DetailBits({ details }: { details?: Record<string, unknown> | null }) {
  if (!details || Object.keys(details).length === 0) return null

  const bits: string[] = []
  if (typeof details.pair === 'string') bits.push(details.pair)
  if (typeof details.chess_game_link === 'string') bits.push('game link saved')
  if (typeof details.result_winner === 'string') bits.push(`winner=${details.result_winner}`)
  if (typeof details.candidates_found === 'number') {
    bits.push(`${details.candidates_found} candidate game(s)`)
  }
  if (typeof details.search_since === 'string' && typeof details.search_until === 'string') {
    bits.push(`window ${formatTime(details.search_since)} → ${formatTime(details.search_until)}`)
  }
  if (typeof details.chess_com_a === 'string' && typeof details.chess_com_b === 'string') {
    bits.push(`@${details.chess_com_a} vs @${details.chess_com_b}`)
  }
  if (typeof details.pending_count === 'number') {
    bits.push(`${details.pending_count} pending`)
  }
  if (typeof details.scored === 'number') {
    bits.push(
      `totals S${details.scored}/R${details.needs_review ?? 0}/A${details.absent ?? 0}/K${details.skipped ?? 0}`
    )
  }

  if (bits.length === 0) {
    return (
      <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground">
        {JSON.stringify(details, null, 0)}
      </pre>
    )
  }

  return <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{bits.join(' · ')}</p>
}

function LogRow({ log }: { log: ComputeAuditLog }) {
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatTime(log.created_at)}
        </span>
        <span className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
          {log.action.replace(/_/g, ' ')}
        </span>
        <span
          className={cn(
            'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            resultStyle(log.action_result)
          )}
        >
          {log.action_result.replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] text-muted-foreground">via {log.triggered_by}</span>
      </div>
      {log.message && <p className="mt-1 text-sm text-foreground">{log.message}</p>}
      <DetailBits details={log.details} />
    </div>
  )
}

export function ComputeLogsModal({
  open,
  onClose,
  competitionId,
  competitionName,
}: ComputeLogsModalProps) {
  const logsQuery = useComputeLogs(competitionId, open)
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'skipped' | 'needs_review'>('all')

  const logs = useMemo(() => {
    const rows = logsQuery.data || []
    if (filter === 'all') return rows
    return rows.filter((r) => r.action_result === filter)
  }, [logsQuery.data, filter])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ScrollText className="size-5 text-muted-foreground" />
            <DialogTitle>Compute logs</DialogTitle>
          </div>
          <DialogDescription>
            {competitionName || 'Tournament'} — what Chess.com auto-compute tried, found, and
            scored.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'All'],
              ['success', 'Success'],
              ['skipped', 'Skipped'],
              ['needs_review', 'Review'],
              ['error', 'Errors'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                filter === value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {label}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => logsQuery.refetch()}
            disabled={logsQuery.isFetching}
          >
            <RefreshCw className={cn('size-3.5', logsQuery.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border px-3">
          {logsQuery.isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No compute runs logged yet. Click <strong>Compute Chess.com</strong> to generate
              entries.
            </p>
          ) : (
            logs.map((log) => <LogRow key={log.id} log={log} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
