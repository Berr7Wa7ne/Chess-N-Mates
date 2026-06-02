"use client"

import { useState } from "react"
import { notFound } from "next/navigation"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PlayerIdentity } from "@/components/shared"
import { CheckCircle2 } from "lucide-react"
import { disputes, approveDispute, rejectDispute } from "@/lib/admin-data"

function getStatusBadge(status: (typeof disputes)[number]["status"]) {
  switch (status) {
    case "open":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Open</Badge>
    case "under_review":
      return <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">Under Review</Badge>
    case "resolved":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Resolved</Badge>
    case "rejected":
      return <Badge variant="secondary">Rejected</Badge>
  }
}

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [dispute, setDispute] = useState<(typeof disputes)[number] | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Initialize dispute from params
  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    params.then(({ id }) => {
      const foundDispute = disputes.find((entry) => entry.id === Number(id))
      if (!foundDispute) {
        notFound()
      }
      setDispute(foundDispute)
      setInitialized(true)
    })
  }

  if (!dispute) return null

  const handleApprove = () => {
    setLoading(true)
    const response = approveDispute(dispute.id)
    setFeedback({
      type: response.success ? "success" : "error",
      message: response.message,
    })

    if (response.success) {
      setTimeout(() => {
        router.refresh()
        setLoading(false)
        setFeedback(null)
      }, 1500)
    } else {
      setLoading(false)
    }
  }

  const handleReject = () => {
    setLoading(true)
    const response = rejectDispute(dispute.id)
    setFeedback({
      type: response.success ? "success" : "error",
      message: response.message,
    })

    if (response.success) {
      setTimeout(() => {
        router.refresh()
        setLoading(false)
        setFeedback(null)
      }, 1500)
    } else {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Dispute ${dispute.matchId}`} subtitle="Full complaint text and involved players." />

      {feedback && (
        <Card className={feedback.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2
              className={`size-5 ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}
            />
            <p className={feedback.type === "success" ? "text-emerald-800" : "text-red-800"}>
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
              <PlayerIdentity playerId={dispute.raisedBy.id} username={dispute.raisedBy.username} elo={dispute.raisedBy.elo} />
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Against</p>
              <PlayerIdentity playerId={dispute.opponent.id} username={dispute.opponent.username} elo={dispute.opponent.elo} />
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Status</p>
              {getStatusBadge(dispute.status)}
            </div>

            {dispute.status === "open" && (
              <div className="mt-6 space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground">Admin Actions</p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Approve Dispute
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={loading}
                    variant="destructive"
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
