'use client'

import { Loader2, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ChangeResultModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  isPending: boolean
  matchLabel: string
  roundNumber: number
  currentResult: string
  newResult: string
}

export function ChangeResultModal({
  open,
  onClose,
  onConfirm,
  isPending,
  matchLabel,
  roundNumber,
  currentResult,
  newResult,
}: ChangeResultModalProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-100">
              <Pencil className="size-6 text-amber-600" />
            </div>
            <DialogTitle className="text-lg">Change Round {roundNumber} result?</DialogTitle>
            <DialogDescription className="uppercase text-xs tracking-wider text-muted-foreground">
              {matchLabel}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Current → New comparison */}
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="flex flex-col items-center gap-1 rounded-xl border bg-muted/30 px-5 py-3 min-w-[120px]">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Current
            </span>
            <span className="text-sm font-semibold text-foreground">{currentResult}</span>
          </div>

          <span className="text-xl text-muted-foreground font-medium">›</span>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 min-w-[120px]">
            <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
              New
            </span>
            <span className="text-sm font-semibold text-emerald-700">{newResult}</span>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Reason for change (optional)
          </label>
          <textarea
            id="change-reason"
            placeholder="Optional reason..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="w-full rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              const reason = (document.getElementById('change-reason') as HTMLTextAreaElement)?.value
              onConfirm(reason)
            }}
            disabled={isPending}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
