"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
  status: "pending" | "submitted" | "completed" | "disputed"
  deadline: string
  gameLink?: string
  result?: "win" | "loss" | "draw"
  dispute?: {
    raisedBy: string
    reason: string
    status: "open" | "resolved"
  }
}

interface MatchDetailsProps {
  role: "player" | "admin"
  match: MatchData
  onSubmitResult?: (gameLink: string) => void
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
  const [gameLink, setGameLink] = useState("")
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

    setSubmitStatus("success")
    setErrorMessage("")
    onSubmitResult?.(gameLink)
  }

  const getStatusBadge = (status: MatchData["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500 text-white">Pending</Badge>
      case "submitted":
        return <Badge className="bg-blue-500 text-white">Submitted</Badge>
      case "completed":
        return <Badge className="bg-emerald-500 text-white">Completed</Badge>
      case "disputed":
        return <Badge className="bg-red-500 text-white">Disputed</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Core Match Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
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
                    ? "bg-white border-foreground"
                    : "bg-foreground border-foreground"
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

            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Deadline</p>
              </div>
              <p
                className={`font-medium ${
                  isPastDeadline()
                    ? "text-red-600"
                    : isUrgent()
                    ? "text-amber-600"
                    : ""
                }`}
              >
                {new Date(match.deadline).toLocaleString()}
                {isPastDeadline() && (
                  <span className="ml-2 text-sm text-red-600">(Overdue)</span>
                )}
                {isUrgent() && !isPastDeadline() && (
                  <span className="ml-2 text-sm text-amber-600">(Urgent)</span>
                )}
              </p>
            </div>
          </div>

          {/* Show game link for admin */}
          {role === "admin" && match.gameLink && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Submitted Game Link</p>
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
          )}
        </CardContent>
      </Card>

      {/* Player View - Submit Result */}
      {role === "player" && match.status === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="size-5" />
              Submit Your Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="gameLink" className="text-sm font-medium">
                Game Link
              </label>
              <Input
                id="gameLink"
                placeholder="https://chess.com/game/... or https://lichess.org/..."
                value={gameLink}
                onChange={(e) => {
                  setGameLink(e.target.value)
                  setSubmitStatus("idle")
                }}
              />
              {submitStatus === "error" && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <XCircle className="size-4" />
                  {errorMessage}
                </p>
              )}
              {submitStatus === "success" && (
                <p className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  Result submitted successfully
                </p>
              )}
            </div>
            <Button onClick={handleSubmitResult} className="w-full sm:w-auto">
              Submit Result
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Player View - Already Submitted */}
      {role === "player" && match.status === "submitted" && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <CheckCircle2 className="size-6 text-emerald-500" />
            <div>
              <p className="font-medium">Result Submitted</p>
              <p className="text-sm text-muted-foreground">
                Waiting for confirmation from the organizer
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin View - Force Result Controls */}
      {role === "admin" && match.status !== "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Force Result</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => onForceResult?.("white_wins")}
                >
                  White Wins
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onForceResult?.("black_wins")}
                >
                  Black Wins
                </Button>
                <Button variant="outline" onClick={() => onForceResult?.("draw")}>
                  Draw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute Section */}
      {match.dispute && (
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
                <Badge
                  variant={match.dispute.status === "open" ? "destructive" : "outline"}
                >
                  {match.dispute.status === "open" ? "Open" : "Resolved"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-red-700">Reason</p>
              <p className="rounded-md bg-white p-3 text-red-900">
                {match.dispute.reason}
              </p>
            </div>

            {role === "admin" && match.dispute.status === "open" && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={onApproveDispute}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  Approve Dispute
                </Button>
                <Button variant="destructive" onClick={onRejectDispute}>
                  <XCircle className="mr-2 size-4" />
                  Reject Dispute
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
