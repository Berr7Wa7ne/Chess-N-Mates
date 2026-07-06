'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { DisputeCategory } from '@/src/types/dispute'
import { useCreateDispute } from '@/src/hooks/useDisputes'
import { useAuth } from '@/src/hooks/useAuth'
import { ApiError } from '@/src/types/api'

interface FileDisputeModalProps {
  open: boolean
  onClose: () => void
  matchId: string
  competitionId: string
  matchLabel: string
  roundNumber: number
}

const CATEGORY_OPTIONS: { value: DisputeCategory; label: string }[] = [
  { value: 'wrong_game_link', label: 'Wrong Game Link' },
  { value: 'result_mismatch', label: 'Result Mismatch' },
  { value: 'disconnection', label: 'Disconnection' },
  { value: 'cheating', label: 'Cheating / Fair Play' },
  { value: 'other', label: 'Other' },
]

export function FileDisputeModal({
  open,
  onClose,
  matchId,
  competitionId,
  matchLabel,
  roundNumber,
}: FileDisputeModalProps) {
  const { user } = useAuth()
  const createDisputeMutation = useCreateDispute()

  const [category, setCategory] = useState<DisputeCategory>('other')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')

  const canSubmit = reason.trim().length > 0

  async function handleSubmit() {
    if (!user || !canSubmit) return

    try {
      await createDisputeMutation.mutateAsync({
        match_id: matchId,
        competition_id: competitionId,
        raised_by_user_id: user.id,
        category,
        reason: reason.trim(),
        description: description.trim() || undefined,
        filed_by_role: 'admin',
      })
      toast.success('Dispute filed successfully')
      setCategory('other')
      setReason('')
      setDescription('')
      onClose()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to file dispute')
    }
  }

  function handleClose() {
    if (createDisputeMutation.isPending) return
    setCategory('other')
    setReason('')
    setDescription('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !createDisputeMutation.isPending && handleClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader className="pb-2">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="size-6 text-red-600" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg">File a Dispute</DialogTitle>
              <DialogDescription className="text-xs uppercase tracking-wider text-muted-foreground">
                Round {roundNumber} — {matchLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DisputeCategory)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Brief reason for the dispute..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Description <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <textarea
              placeholder="Provide additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createDisputeMutation.isPending}
            className="w-full rounded-xl py-2.5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createDisputeMutation.isPending}
            className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5"
          >
            {createDisputeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Filing...
              </>
            ) : (
              'File Dispute'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}