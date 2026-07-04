'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader, TextTruncate } from '@/components/shared'
import { Skeleton } from '@/components/ui/skeleton'
import { useDisputes } from '@/src/hooks/useDisputes'
import type { Dispute, DisputeStatus } from '@/src/types/dispute'

function StatusBadge({ status }: { status: DisputeStatus }) {
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

export default function DisputesPage() {
  const router = useRouter()
  const disputesQuery = useDisputes()
  const disputes: Dispute[] = Array.isArray(disputesQuery.data) ? disputesQuery.data : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes"
        subtitle="Review complaints and resolve match issues."
      />

      <Card className="overflow-hidden rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>All Disputes</CardTitle>
          <CardDescription>
            Click any row to review and resolve the dispute.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {disputesQuery.isLoading ? (
            <div className="space-y-3 px-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : disputesQuery.isError ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <AlertTriangle className="size-8 text-destructive/40" />
              <p className="text-sm text-destructive">
                Failed to load disputes
              </p>
            </div>
          ) : disputes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <AlertTriangle className="size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                No disputes yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Disputes appear here when flagged by players or created by admin
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competition</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Raised By</TableHead>
                  <TableHead>Against</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow
                    key={dispute.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/admin/disputes/${dispute.id}`)
                    }
                  >
                    <TableCell className="font-medium text-sm">
                      {dispute.competition?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dispute.match?.round_number
                        ? `R${dispute.match.round_number}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dispute.raised_by?.display_name || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dispute.opponent?.display_name || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize text-muted-foreground">
                        {dispute.category?.replace(/_/g, ' ') || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TextTruncate
                        text={dispute.reason}
                        maxLength={40}
                        maxWidthClassName="max-w-[180px]"
                        className="text-left text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={dispute.dispute_status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/disputes/${dispute.id}`)
                        }}
                      >
                        <ExternalLink className="size-3" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
