'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
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
import type { Match } from '@/src/types/match'
import { useSubmitResult } from '@/src/hooks/useMatches'
import { ApiError } from '@/src/types/api'

interface MatchResultDialogProps {
  open: boolean
  onClose: () => void
  match: Match
  userId: string
}

export function MatchResultDialog({ open, onClose, match, userId }: MatchResultDialogProps) {
  const [gameLink, setGameLink] = useState('')
  const submitMutation = useSubmitResult()

  const isPlayerA = match.player_a_id === userId
  const isPlayerB = match.player_b_id === userId
  const isParticipant = isPlayerA || isPlayerB

  if (!isParticipant) return null

  async function handleSubmit() {
    // Validate link format client-side before sending
    const trimmedLink = gameLink.trim()
    if (!trimmedLink) {
      toast.error('Please enter your chess.com game link')
      return
    }

    if (!trimmedLink.match(/chess\.com\/game\//)) {
      toast.error('Please enter a valid chess.com game URL')
      return
    }

    try {
      // Submit only the game link — the backend will auto-determine the result
      // via chess.com API verification (player check, time control, game date)
      await submitMutation.mutateAsync({
        id: match.id,
        payload: {
          user_id: userId,
          chess_game_link: trimmedLink,
        },
      })
      toast.success('Result submitted successfully! The system has verified and scored your match.')
      setGameLink('')
      onClose()
    } catch (error) {
      // Display the backend's validation error directly to the player
      const message = error instanceof ApiError ? error.message : 'Failed to submit result'
      toast.error(message)
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
          {/* Info text explaining the process */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">How it works</p>
            <p>Paste the chess.com game link below. The system will automatically verify the game and score the result.</p>
          </div>

          {/* Game Link — required for auto-scoring */}
          <div className="space-y-1.5">
            <Label htmlFor="gameLink" className="font-medium">
              Chess.com Game Link <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="gameLink"
                placeholder="https://www.chess.com/game/live/123456789"
                value={gameLink}
                onChange={(e) => setGameLink(e.target.value)}
                className="pr-10"
              />
              <ExternalLink className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              The link must be from chess.com and both players' chess.com usernames must be linked to their accounts.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!gameLink.trim() || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Submit Result'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}