"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  User,
  XCircle,
} from "lucide-react"

export interface MatchData {
  id: string
  opponent: string
  playerColor: "white" | "black"
  round: number
  status: "pending" | "ongoing" | "submitted" | "completed" | "disputed"
  deadline: string
  gameLink?: string
  result?: "win" | "loss" | "draw"
  competition?: string
  dispute?: {
    raisedBy: string
    reason: string
    status: "open" | "resolved"
  }
}

interface SubmissionPayload {
  gameLink: string
  dispute: {
    hasDispute: boolean
    reason?: string
  }
}

interface MatchDetailsProps {
  role: "player" | "admin"
  match: MatchData
  onSubmitResult?: (submission: SubmissionPayload) => void
  onForceResult?: (result: "white_wins" | "black_wins" | "draw") => void
  onApproveDispute?: () => void
  onRejectDispute?: () => void
}

export function MatchDetails({
  role,
  match,
  onSubmitResult,
  onForceResult,
  onApproveDispute,
  onRejectDispute,
}: MatchDetailsProps) {
  const [gameLink, setGameLink] = useState(match.gameLink ?? "")
  const [hasDispute, setHasDispute] = useState(Boolean(match.dispute))
  const [disputeReason, setDisputeReason] = useState(match.dispute?.reason ?? "")
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const isUrgent = () => {
    const deadline = new Date(match.deadline)
    const now = new Date()
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursRemaining <= 24 && hoursRemaining > 0
  }

  const isPastDeadline = () => {
    return new Date(match.deadline) < new Date()
  }

  const handleSubmitResult = () => {
    if (!gameLink.trim()) {
      setSubmitStatus("error")
      setErrorMessage("Please enter a valid game link")
      return
    }

    if (!gameLink.includes("chess.com") && !gameLink.includes("lichess.org")) {
      setSubmitStatus("error")
      setErrorMessage("Game link must be from Chess.com or Lichess")
      return
    }

    if (hasDispute && !disputeReason.trim()) {
      setSubmitStatus("error")
      setErrorMessage("Please describe the dispute before submitting.")
      return
    }

    setSubmitStatus("success")
    setErrorMessage("")
    onSubmitResult?.({
      gameLink,
      dispute: {
        hasDispute,
        reason: hasDispute ? disputeReason.trim() : undefined,
      },
    })
  }

  const getStatusBadge = (status: MatchData["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500 text-white">Pending</Badge>
      case "submitted":
        return <Badge className="bg-blue-500 text-white">Submitted</Badge>
      case "ongoing":
        return <Badge className="bg-violet-500 text-white">Ongoing</Badge>
      case "completed":
        return <Badge className="bg-emerald-500 text-white">Completed</Badge>
      case "disputed":
        return <Badge className="bg-red-500 text-white">Disputed</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Match Details</span>
            {getStatusBadge(match.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <User className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Opponent</p>
                <p className="font-medium">{match.opponent}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`size-5 rounded-full border-2 ${
                  match.playerColor === "white"
                    ? "border-foreground bg-white"
                    : "border-foreground bg-foreground"
                }`}
              />
              <div>
                <p className="text-sm text-muted-foreground">Your Color</p>
                <Badge variant={match.playerColor === "white" ? "outline" : "default"}>
                  {match.playerColor === "white" ? "White" : "Black"}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Match ID</p>
              <p className="font-mono text-sm">{match.id}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Round</p>
              <p className="font-medium">Round {match.round}</p>
            </div>

            {match.competition ? (
              <div>
                <p className="text-sm text-muted-foreground">Competition</p>
                <p className="font-medium">{match.competition}</p>
              </div>
            ) : null}

            <div className={match.competition ? "" : "sm:col-span-2"}>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Deadline</p>
              </div>
              <p className={`font-medium ${isPastDeadline() ? "text-red-600" : isUrgent() ? "text-amber-600" : ""}`}>
                {new Date(match.deadline).toLocaleString()}
                {isPastDeadline() ? <span className="ml-2 text-sm text-red-600">(Overdue)</span> : null}
                {isUrgent() && !isPastDeadline() ? <span className="ml-2 text-sm text-amber-600">(Urgent)</span> : null}
              </p>
            </div>
          </div>

          {match.gameLink ? (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">
                  {role === "admin" ? "Submitted Game Link" : "Game Link"}
                </p>
                <a
                  href={match.gameLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="size-4" />
                  {match.gameLink}
                </a>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {role === "player" && match.status === "pending" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="size-5" />
              Submit Your Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="gameLink">Game Link</Label>
              <Input
                id="gameLink"
                placeholder="https://chess.com/game/... or https://lichess.org/..."
                value={gameLink}
                onChange={(event) => {
                  setGameLink(event.target.value)
                  setSubmitStatus("idle")
                }}
              />
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="dispute-toggle" className="text-base">
                    Is there a dispute?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Turn this on if you need the admin team to review something about the match result.
                  </p>
                </div>
                <Switch
                  id="dispute-toggle"
                  checked={hasDispute}
                  onCheckedChange={(checked) => {
                    setHasDispute(checked)
                    setSubmitStatus("idle")
                    if (!checked) setDisputeReason("")
                  }}
                />
              </div>

              {hasDispute ? (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="disputeReason">Dispute reason/details</Label>
                  <Textarea
                    id="disputeReason"
                    placeholder="Describe what happened so admins can review it quickly."
                    value={disputeReason}
                    onChange={(event) => {
                      setDisputeReason(event.target.value)
                      setSubmitStatus("idle")
                    }}
                    rows={4}
                  />
                </div>
              ) : null}
            </div>

            {submitStatus === "error" ? (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <XCircle className="size-4" />
                {errorMessage}
              </p>
            ) : null}
            {submitStatus === "success" ? (
              <p className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="size-4" />
                {hasDispute ? "Result and dispute submitted successfully" : "Result submitted successfully"}
              </p>
            ) : null}

            <Button onClick={handleSubmitResult} className="w-full sm:w-auto">
              Submit Result
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {role === "player" && match.status === "submitted" ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <CheckCircle2 className="size-6 text-emerald-500" />
            <div>
              <p className="font-medium">Result Submitted</p>
              <p className="text-sm text-muted-foreground">Waiting for confirmation from the organizer</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {role === "admin" && match.status !== "completed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Force Result</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onForceResult?.("white_wins")}>
                  White Wins
                </Button>
                <Button variant="outline" onClick={() => onForceResult?.("black_wins")}>
                  Black Wins
                </Button>
                <Button variant="outline" onClick={() => onForceResult?.("draw")}>
                  Draw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {match.dispute ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="size-5" />
              Dispute Raised
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-red-700">Raised By</p>
                <p className="font-medium text-red-900">{match.dispute.raisedBy}</p>
              </div>
              <div>
                <p className="text-sm text-red-700">Status</p>
                <Badge variant={match.dispute.status === "open" ? "destructive" : "outline"}>
                  {match.dispute.status === "open" ? "Open" : "Resolved"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-red-700">Reason</p>
              <p className="rounded-md bg-white p-3 text-red-900">{match.dispute.reason}</p>
            </div>

            {role === "admin" && match.dispute.status === "open" ? (
              <div className="flex gap-2 pt-2">
                <Button onClick={onApproveDispute} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="mr-2 size-4" />
                  Approve Dispute
                </Button>
                <Button variant="destructive" onClick={onRejectDispute}>
                  <XCircle className="mr-2 size-4" />
                  Reject Dispute
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
