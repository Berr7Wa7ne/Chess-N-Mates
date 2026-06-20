'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Match, ResultWinner } from '@/src/types/match'
import { useConfirmResult, useSubmitResult } from '@/src/hooks/useMatches'
import { ApiError } from '@/src/types/api'

interface MatchResultDialogProps {
  open: boolean
  onClose: () => void
  match: Match
  userId: string
}

export function MatchResultDialog({ open, onClose, match, userId }: MatchResultDialogProps) {
  const [resultWinner, setResultWinner] = useState<ResultWinner | null>(null)
  const [gameLink, setGameLink] = useState('')
  const submitMutation = useSubmitResult()
  const confirmMutation = useConfirmResult()

  const isPlayerA = match.player_a_id === userId
  const isPlayerB = match.player_b_id === userId
  const isParticipant = isPlayerA || isPlayerB

  if (!isParticipant) return null

  async function handleSubmit() {
    if (!resultWinner) {
      toast.error('Please select a result')
      return
    }

    try {
      await submitMutation.mutateAsync({
        id: match.id,
        payload: {
          result_winner: resultWinner,
          chess_game_link: gameLink || undefined,
          user_id: userId,
        },
      })
      toast.success('Result submitted successfully!')
      onClose()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to submit result')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Match Result</DialogTitle>
          <DialogDescription>
            {match.player_a?.display_name || 'Player A'} vs{' '}
            {match.player_b?.display_name || 'Player B'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Result Selection */}
          <div className="space-y-2">
            <Label>Result</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={resultWinner === (isPlayerA ? 'a' : 'b') ? 'default' : 'outline'}
                onClick={() => setResultWinner(isPlayerA ? 'a' : 'b')}
                className="h-20 flex-col gap-1"
              >
                <span className="text-lg">🏆</span>
                <span className="text-xs">I Won</span>
              </Button>
              <Button
                type="button"
                variant={resultWinner === 'draw' ? 'default' : 'outline'}
                onClick={() => setResultWinner('draw')}
                className="h-20 flex-col gap-1"
              >
                <span className="text-lg">🤝</span>
                <span className="text-xs">Draw</span>
              </Button>
              <Button
                type="button"
                variant={resultWinner === (isPlayerA ? 'b' : 'a') ? 'default' : 'outline'}
                onClick={() => setResultWinner(isPlayerA ? 'b' : 'a')}
                className="h-20 flex-col gap-1"
              >
                <span className="text-lg">😔</span>
                <span className="text-xs">I Lost</span>
              </Button>
            </div>
          </div>

          {/* Game Link */}
          <div className="space-y-1.5">
            <Label htmlFor="gameLink">Game Link (optional)</Label>
            <Input
              id="gameLink"
              placeholder="https://chess.com/game/..."
              value={gameLink}
              onChange={(e) => setGameLink(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!resultWinner || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Submit Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}