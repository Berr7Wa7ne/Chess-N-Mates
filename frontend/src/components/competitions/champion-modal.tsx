'use client'

import { Crown, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from '@/components/ui/dialog'
import type { StandingEntry } from '@/src/types/competition'

interface ChampionModalProps {
  open: boolean
  onClose: () => void
  winner: StandingEntry | null
  competitionName: string
}

export function ChampionModal({
  open,
  onClose,
  winner,
  competitionName,
}: ChampionModalProps) {
  if (!winner) return null

  return (
    <Dialog open={open} onOpenChange={(open) => {
      // Only allow closing via the X button, not by clicking outside or Escape
      if (!open) onClose()
    }}>
      {/* Prevent click-outside from closing */}
      <DialogOverlay
        className="bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.preventDefault()}
      />
      <DialogContent
        className="sm:max-w-md rounded-3xl border-0 shadow-2xl overflow-visible"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Custom close button - X icon top right */}
        {/* <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 flex size-8 items-center justify-center rounded-full bg-white shadow-md border border-border hover:bg-gray-50 transition-colors"
          aria-label="Close"
        >
          <X className="size-4 text-muted-foreground" />
        </button> */}

        <div className="flex flex-col items-center gap-6 py-6 px-2">
          {/* Large golden crown */}
          <div className="relative">
            <div className="absolute inset-0 bg-amber-300/30 rounded-full blur-2xl" />
            <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
              <Crown className="size-12 text-white drop-shadow-lg" />
            </div>
          </div>

          {/* Winner name */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
              Champion
            </p>
            <h2 className="text-2xl font-extrabold text-foreground">
              {winner.display_name}
            </h2>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold text-amber-600">
                {winner.points} pts
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>
                {winner.wins}W / {winner.draws}D / {winner.losses}L
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />

          {/* Competition name */}
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {competitionName}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}