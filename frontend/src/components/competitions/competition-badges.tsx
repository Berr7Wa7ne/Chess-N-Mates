'use client'

import { Badge } from '@/components/ui/badge'
import type { CompetitionStatus, TournamentType } from '@/src/types/competition'

export function TournamentTypeBadge({ type }: { type: TournamentType }) {
  switch (type) {
    case 'swiss':
      return (
        <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700">
          Swiss
        </Badge>
      )
    case 'knockout':
      return (
        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700">
          Knockout
        </Badge>
      )
    case 'round_robin':
      return (
        <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700">
          Round Robin
        </Badge>
      )
  }
}

export function CompetitionStatusBadge({ status }: { status: CompetitionStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          Active
        </Badge>
      )
    case 'open_registration':
      return (
        <Badge className="border-sky-500/20 bg-sky-500/10 text-sky-600">
          Open Registration
        </Badge>
      )
    case 'draft':
      return (
        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">
          Draft
        </Badge>
      )
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>
    case 'cancelled':
      return (
        <Badge className="border-red-500/20 bg-red-500/10 text-red-600">
          Cancelled
        </Badge>
      )
  }
}

export function formatTournamentType(type: TournamentType) {
  return type.replace('_', ' ')
}

export function formatCompetitionStatus(status: CompetitionStatus) {
  return status.replace(/_/g, ' ')
}
