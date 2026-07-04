'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared'
import { Textarea } from '@/components/ui/textarea'
import { useDispute, useUpdateDisputeStatus, useResolveDispute, useRejectDispute } from '@/src/hooks/useDisputes'
import { useAuth } from '@/src/hooks/useAuth'
import type { Dispute, DisputeStatus } from '@/src/types/dispute'

function getStatusBadge(status: DisputeStatus) {
  switch (status) {
    case 'open':
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Open</Badge>
    case 'under_review':
      return <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">Under Review</Badge>
    case 'resolved':
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Resolved</Badge>
    case 'rejected':
      return <Badge variant="secondary">Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { user } = useAuth()
  const { id } = use(params)

  const disputeQuery = useDispute(id)
  const dispute = disputeQuery.data as Dispute | undefined

  const updateStatusMutation = useUpdateDisputeStatus()
  const resolveMutation = useResolveDispute(dispute?.competition_id)
  const rejectMutation = useRejectDispute()

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [newResult, setNewResult] = useState<'a' | 'b' | 'draw' | ''>('')

  if (disputeQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Dispute ${id}`} subtitle="Loading..." />
        <Card className="rounded-lg shadow-sm">
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (disputeQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Dispute ${id}`} subtitle="Error loading dispute" />
        <Card className="rounded-lg shadow-sm">
          <CardContent className="py-8">
            <p className="text-center text-destructive">Failed to load dispute</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Dispute ${id}`} subtitle="Not found" />
        <Card className="rounded-lg shadow-sm">
          <CardContent className="py-8">
            <p className="text-center text-destructive">Dispute not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleMarkUnderReview = async () => {
    try {
      await updateStatusMutation.mutateAsync({ id: dispute.id, status: 'under_review' })
      setFeedback({ type: 'success', message: 'Dispute marked as under review' })
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update status' })
    }
  }

  const handleResolve = async () => {
    if (!newResult) {
      setFeedback({ type: 'error', message: 'Please select a result' })
      return
    }
    if (!user?.id) {
      setFeedback({ type: 'error', message: 'You must be signed in to resolve a dispute' })
      return
    }

    try {
      await resolveMutation.mutateAsync({
        id: dispute.id,
        payload: {
          admin_decision: 'overturned',
          admin_notes: adminNotes.trim() || undefined,
          new_result_winner: newResult,
          resolved_by: user.id,
        }
      })
      setFeedback({ type: 'success', message: 'Dispute resolved successfully' })
      setTimeout(() => {
        router.push(`/admin/competitions/${dispute.competition_id}/matches`)
      }, 1500)
    } catch {
      setFeedback({ type: 'error', message: 'Failed to resolve dispute' })
    }
  }

  const handleReject = async () => {
    if (!user?.id) {
      setFeedback({ type: 'error', message: 'You must be signed in to reject a dispute' })
      return
    }

    try {
      await rejectMutation.mutateAsync({
        id: dispute.id,
        payload: {
          admin_notes: adminNotes.trim() || undefined,
          resolved_by: user.id,
        }
      })
      setFeedback({ type: 'success', message: 'Dispute rejected' })
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch {
      setFeedback({ type: 'error', message: 'Failed to reject dispute' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dispute #${dispute.id.slice(0, 8)}`}
        subtitle="Full complaint text and involved players."
      >
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/competitions/${dispute.competition_id}/matches`)}
        >
          <ExternalLink className="mr-2 size-4" />
          View in Matches Page
        </Button>
      </PageHeader>

      {feedback && (
        <Card className={feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2
              className={`size-5 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
            />
            <p className={feedback.type === 'success' ? 'text-emerald-800' : 'text-red-800'}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Reason</CardTitle>
            <CardDescription>This page shows the full dispute text without truncation.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-foreground">{dispute.reason}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>Players involved in this dispute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Raised By</p>
              <p className="text-sm font-medium text-foreground">
                {dispute.raised_by?.display_name || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Against</p>
              <p className="text-sm font-medium text-foreground">
                {dispute.opponent?.display_name || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Status</p>
              {getStatusBadge(dispute.dispute_status)}
            </div>

            {dispute.dispute_status === 'open' && (
              <div className="mt-6 space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground">Admin Actions</p>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Admin Notes</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this dispute..."
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">New Result (if resolving)</p>
                  <select
                    value={newResult}
                    onChange={(e) => setNewResult(e.target.value as 'a' | 'b' | 'draw' | '')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select result...</option>
                    <option value="a">Player A wins</option>
                    <option value="b">Player B wins</option>
                    <option value="draw">Draw</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleMarkUnderReview}
                    disabled={updateStatusMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    Mark as Under Review
                  </Button>
                  <Button
                    onClick={handleResolve}
                    disabled={resolveMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 w-full"
                  >
                    Resolve with New Result
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="w-full"
                  >
                    Reject Dispute
                  </Button>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
